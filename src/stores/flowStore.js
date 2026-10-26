// src/store/flowStore.js
import { defineStore } from 'pinia'
import { reactive, ref, watch, nextTick } from 'vue'
import { mergeNFields } from '../utils/schemaUtils'
import {
  createFieldSchema,
  AGGREGATE_INPUT_TYPE_VALUES,
} from '../utils/aggregate-input-schema'
import {
  serializeFieldSchema,
  deserializeFieldSchema,
  validateAggregateInputSchema,
  mergeFieldSchemas,
} from '../utils/aggregate-input-schema-utils'
import { uniqueId } from '@/utils/modalUtils'
import { MarkerType } from '@vue-flow/core'
import serviceAggregatorClient from '@/utils/service-aggregator-client'
import { notify } from '@kyvg/vue3-notification'

const LOCAL_STORAGE_KEY = 'flowservice-flow'

export const useFlowStore = defineStore('flow', () => {
  const nodes = ref([])
  const edges = ref([])
  const isSyncing = ref(false)
  // Local persistent edges independent of backend nextStepId.
  // Survives backend updates and reloads; supports multiple outgoing edges per node.
  const persistentEdges = ref([])
  const autoSave = ref(false)
  const selectedNode = ref(null)
  const showModal = ref(false)
  const modalMode = ref('add')
  const flowViewport = reactive({ x: 0, y: 0, zoom: 1 })
  const aggregates = ref([])
  const currentAggregateId = ref(null)
  const isLoading = ref(false)

  // Persistent Aggregate Input JSON for the currently selected aggregate.
  // Saved input *definition* (schema/sample), distinct from the runtime payload.
  const aggregateInputSchema = ref(null)
  const aggregateInputSchemaDirty = ref(false)
  const aggregateInputSchemaLoading = ref(false)
  const aggregateInputSchemaError = ref(null)
  const aggregateInputJson = ref(null)
  const aggregateInputDirty = ref(false)
  const aggregateInputLoading = ref(false)
  const aggregateInputError = ref(null)

  const showConnectionModal = ref(false)
  const pendingConnection = ref(null)
  const connectionStepData = ref(null)
  const stepModalOpen = ref(false)
  const stepModalInitialData = ref(null)
  const isProcessingConnection = ref(false)
  const executionStatus = reactive({})
  // Cache of service mappings keyed by aggregateStepId -> { inputs, outputs }
  const serviceMappingsCache = reactive({})

  // ---------------------------------------------------------------------------
  // Execution status
  // ---------------------------------------------------------------------------
  function setNodeStatus(nodeId, status) {
    executionStatus[nodeId] = status
  }

  function resetExecution() {
    Object.keys(executionStatus).forEach((k) => delete executionStatus[k])

    nodes.value = nodes.value.map((node) => ({
      ...node,
      data: {
        ...node.data,
        isExecuting: false,
        executionStatus: undefined,
        executionResult: undefined,
        executionError: undefined,
        _resetKey: Date.now() + Math.random(),
      },
    }))
  }

  // ---------------------------------------------------------------------------
  // Auto-save
  // ---------------------------------------------------------------------------
  watch(autoSave, (newVal) => {
    localStorage.setItem('AutoSave', String(newVal))
  })

  const savedAutoSave = localStorage.getItem('AutoSave')
  if (savedAutoSave !== null) {
    autoSave.value = savedAutoSave === 'true'
  }

  function enableAutoSave() {
    autoSave.value = true
  }

  function disableAutoSave() {
    autoSave.value = false
  }

  const autoSaveEnabled = autoSave

  function saveFlow(newNodes, newEdges) {
    try {
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({
          nodes: newNodes ?? nodes.value,
          edges: newEdges ?? edges.value,
          viewport: flowViewport,
        }),
      )
    } catch (e) {
      console.warn('Failed to save flow to localStorage', e)
    }
  }

  function loadFlow() {
    const flow = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!flow) return
    try {
      const parsed = JSON.parse(flow)
      importFlow(parsed)
    } catch (e) {
      console.warn('Failed to parse flow from localStorage', e)
    }
  }

  watch(
    [nodes, edges],
    ([newNodes, newEdges]) => {
      newNodes.forEach((node) => {
        if (
          !node.position ||
          typeof node.position.x !== 'number' ||
          typeof node.position.y !== 'number'
        ) {
          console.warn(`Fixing node ${node.id} missing or invalid position`)
          node.position = { x: 100, y: 100 }
        }
      })

      if (autoSave.value && !isSyncing.value) {
        saveFlow(newNodes, newEdges)
      }
    },
    { deep: true },
  )

  loadFlow()

  // ---------------------------------------------------------------------------
  // Persistent edges
  // ---------------------------------------------------------------------------
  function rebuildEdgesFromPersistent() {
    const validEdges = []

    persistentEdges.value.forEach((pEdge) => {
      const sourceExists = nodes.value.some((n) => n.id === pEdge.source)
      const targetExists = nodes.value.some((n) => n.id === pEdge.target)

      if (sourceExists && targetExists) {
        validEdges.push({
          ...pEdge,
          id: pEdge.id || `${pEdge.source}-${pEdge.target}`,
          type: pEdge.type || 'smoothstep',
          animated: pEdge.animated ?? false,
        })
      } else {
        console.warn(`Removing stale persistent edge: ${pEdge.source} → ${pEdge.target}`)
      }
    })

    edges.value = validEdges
  }

  function mergePersistedEdges() {
    rebuildEdgesFromPersistent()
  }

  // ---------------------------------------------------------------------------
  // Node styles
  // ---------------------------------------------------------------------------
  function getStepStyle(node, index) {
    if (index === 0) return { backgroundColor: '#10b981', color: 'white' }
    if (node.data?.type === 'decision') {
      return { backgroundColor: '#fef3c7', border: '2px solid #f59e0b' }
    }
    return { backgroundColor: '#ffffff', color: '#333' }
  }

  function applyNodeStyles() {
    nodes.value = nodes.value.map((node, index) => ({
      ...node,
      style: getStepStyle(node, index),
    }))
  }

  // ---------------------------------------------------------------------------
  // Aggregates load
  // ---------------------------------------------------------------------------
  async function loadAggregates() {
    isLoading.value = true
    try {
      const allAggregates = await serviceAggregatorClient.getAggregates()
      if (allAggregates && allAggregates.length > 0) {
        aggregates.value = allAggregates

        if (allAggregates.length === 1) {
          await loadSingleAggregateFlow(allAggregates[0].id)
        } else {
          const aggregateIds = allAggregates.map((a) => a.id)
          await loadAggregateFlow(aggregateIds)
        }

        if (!currentAggregateId.value) {
          currentAggregateId.value = allAggregates[0].id
        } else {
          const existing = allAggregates.find((a) => a.id === currentAggregateId.value)
          if (!existing) {
            currentAggregateId.value = allAggregates[0].id
          }
        }
      } else {
        aggregates.value = []
        currentAggregateId.value = null
      }
    } catch (error) {
      console.error('Failed to load aggregates:', error)
      notify({
        title: 'خطا',
        text: 'خطا در بارگذاری aggregates',
        type: 'error',
      })
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Load aggregate flow(s) from backend and convert to Vue Flow nodes/edges.
   * Accepts a single aggregate ID or an array of IDs.
   */
  async function loadAggregateFlow(aggregateIdOrIds) {
    try {
      const rawData = await serviceAggregatorClient.getAggregateByid(aggregateIdOrIds)
      const allAggregatesData = Array.isArray(rawData) ? rawData : [rawData]
      const idsToLoad = Array.isArray(aggregateIdOrIds) ? aggregateIdOrIds : [aggregateIdOrIds]
      const aggregatesToLoad = allAggregatesData.filter((a) => idsToLoad.includes(a.id))

      if (aggregatesToLoad.length === 0) {
        console.warn(`No aggregates found for IDs: ${idsToLoad}`)
        return
      }

      if (!currentAggregateId.value) {
        currentAggregateId.value = aggregatesToLoad[0].id
      }

      const flowNodes = []
      const flowEdges = []
      const isMultiple = aggregatesToLoad.length > 1

      for (const aggregate of aggregatesToLoad) {
        const stepIdToNodeIdMap = new Map()
        const steps = aggregate.steps || []

        let baseY = 100
        if (isMultiple) {
          const aggregateYPos = 100 + aggregatesToLoad.indexOf(aggregate) * 280
          flowNodes.push({
            id: `aggregate-${aggregate.id}`,
            type: 'aggregateNode',
            position: { x: 50, y: aggregateYPos },
            data: {
              aggregateId: aggregate.id,
              name: aggregate.name || aggregate.id || 'Aggregate',
              label: aggregate.name || 'Aggregate',
            },
          })
          baseY = aggregateYPos + 80
        }

        for (const step of steps) {
          const nodeId = `node-${step.id}`
          stepIdToNodeIdMap.set(step.id, nodeId)
          const firstStep = aggregate.firstStepId
          const service = step.service || {}
          const hasCondition = step.condition && `${step.condition}`.trim() !== ''

          let nodeType = 'serviceNode'
          if (hasCondition) {
            nodeType = 'decisionNode'
          } else if (firstStep == step.id) {
            nodeType = 'startNode'
          }

          const position =
            step.positionX != null && step.positionY != null
              ? { x: step.positionX, y: step.positionY }
              : { x: 100 + flowNodes.length * 300, y: baseY }

          flowNodes.push({
            id: nodeId,
            type: nodeType,
            position,
            data: {
              id: nodeId,
              aggregateStepId: step.id,
              aggregateId: aggregate.id,
              label: step.stepName || service?.name || 'Step',
              stepName: step.stepName || '',
              condition: step.condition || '',
              conditionParameters: step.conditionParameters || '',
              serviceId: service?.id || step.serviceId || null,
              serviceName: service?.name || '',
              url: service?.url || '',
              method: service?.method || 'GET',
              type: service?.type || 'REST',
              status:
                service?.status !== undefined
                  ? service.status
                  : step.status !== undefined
                    ? step.status
                    : true,
              mappings: step.mappings || [],
              fields: service?.fields ? [...service.fields] : [],
            },
          })
        }

        for (const step of steps) {
          const sourceNodeId = stepIdToNodeIdMap.get(step.id)
          if (!sourceNodeId) continue

          const stepMappings = step.mappings || []

          if (step.nextStepId) {
            const targetNodeId = stepIdToNodeIdMap.get(step.nextStepId)
            if (targetNodeId) {
              flowEdges.push({
                id: `edge-${step.id}-next-${step.nextStepId}`,
                source: sourceNodeId,
                target: targetNodeId,
                label: '',
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  width: 20,
                  height: 20,
                  color: '#FF0072',
                },
                animated: true,
                data: {
                  aggregateStepId: step.id,
                  aggregateId: aggregate.id,
                  condition: step.condition || '',
                  conditionParameters: step.conditionParameters || '',
                  mappings: stepMappings,
                },
              })
            }
          }

          if (step.trueStepId) {
            const targetNodeId = stepIdToNodeIdMap.get(step.trueStepId)
            if (targetNodeId) {
              flowEdges.push({
                id: `edge-${step.id}-true-${step.trueStepId}`,
                source: sourceNodeId,
                target: targetNodeId,
                animated: true,
                type: 'default',
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  width: 20,
                  height: 20,
                  color: '#10B981',
                },
                label: 'True',
                style: { stroke: '#10B981' },
                data: {
                  aggregateStepId: step.id,
                  aggregateId: aggregate.id,
                  condition: step.condition || '',
                  conditionParameters: step.conditionParameters || '',
                  mappings: [],
                },
              })
            }
          }

          if (step.falseStepId) {
            const targetNodeId = stepIdToNodeIdMap.get(step.falseStepId)
            if (targetNodeId) {
              flowEdges.push({
                id: `edge-${step.id}-false-${step.falseStepId}`,
                source: sourceNodeId,
                target: targetNodeId,
                animated: true,
                type: 'default',
                style: { stroke: '#EF4444', strokeDasharray: '6 4' },
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  width: 20,
                  height: 20,
                  color: '#EF4444',
                },
                label: 'False',
                data: {
                  aggregateStepId: step.id,
                  aggregateId: aggregate.id,
                  condition: step.condition || '',
                  conditionParameters: step.conditionParameters || '',
                  mappings: [],
                },
              })
            }
          }
        }

        if (isMultiple) {
          const allTargets = new Set()
          steps.forEach((s) => {
            if (s.nextStepId) allTargets.add(s.nextStepId)
            if (s.trueStepId) allTargets.add(s.trueStepId)
            if (s.falseStepId) allTargets.add(s.falseStepId)
          })
          const entrySteps = steps.filter((s) => !allTargets.has(s.id))

          for (const entryStep of entrySteps) {
            const targetNodeId = stepIdToNodeIdMap.get(entryStep.id)
            if (targetNodeId) {
              flowEdges.push({
                id: `edge-aggregate-${aggregate.id}-to-${entryStep.id}`,
                source: `aggregate-${aggregate.id}`,
                target: targetNodeId,
                animated: false,
                type: 'smoothstep',
                style: { stroke: '#f59e0b', strokeWidth: 2.5, strokeDasharray: '5 5' },
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  width: 20,
                  height: 20,
                  color: '#f59e0b',
                },
                data: { aggregateId: aggregate.id, isAggregateConnection: true },
              })
            }
          }
        }
      }

      const backendNodes = flowNodes
      const backendEdges = flowEdges

      backendNodes.forEach((bNode) => {
        const idx = nodes.value.findIndex((n) => n.id === bNode.id)
        if (idx !== -1) {
          nodes.value[idx] = {
            ...nodes.value[idx],
            ...bNode,
            position: nodes.value[idx].position || bNode.position,
          }
        } else {
          nodes.value.push(bNode)
        }
      })

      backendEdges.forEach((bEdge) => {
        if (!persistentEdges.value.some((e) => e.id === bEdge.id)) {
          persistentEdges.value.push({
            ...bEdge,
            animated: bEdge.animated ?? true,
            markerEnd:
              bEdge.markerEnd || {
                type: MarkerType.ArrowClosed,
                width: 20,
                height: 20,
              },
          })
        }
      })

      persistentEdges.value = persistentEdges.value.filter(
        (e) =>
          nodes.value.some((n) => n.id === e.source) &&
          nodes.value.some((n) => n.id === e.target),
      )

      rebuildEdgesFromPersistent()

      if (isMultiple) {
        applyConnectionOrderLayout()
      }

      Object.keys(serviceMappingsCache).forEach((k) => delete serviceMappingsCache[k])

      await loadServiceMappingsForNodes()
      await nextTick()
      rebuildFieldMappingEdges()
    } catch (error) {
      console.error('Failed to load aggregate flow:', error)
      notify({
        title: 'خطا',
        text: 'خطا در بارگذاری flow',
        type: 'error',
      })
    }
  }

  async function getAggregateByid(params) {
    try {
      const aggregate = await serviceAggregatorClient.getAggregateByid(params)
      if (!aggregate) {
        console.warn(`Aggregate ${params} not found`)
        notify({
          title: 'خطا',
          text: `Aggregate با ID ${params} یافت نشد`,
          type: 'error',
        })
        return
      }
      return aggregate
    } catch (error) {
      console.error('Failed to load single aggregate flow:', error)
      notify({
        title: 'خطا',
        text: 'خطا در بارگذاری flow',
        type: 'error',
      })
    }
  }

  /**
   * Load a single aggregate by ID.
   * Positions come from backend (step.positionX / positionY).
   */
  async function loadSingleAggregateFlow(aggregateId) {
    if (!aggregateId) return
    currentAggregateId.value = aggregateId
    // Clear canvas for a single-aggregate view
    nodes.value = []
    edges.value = []
    persistentEdges.value = []
    Object.keys(serviceMappingsCache).forEach((k) => delete serviceMappingsCache[k])
    await loadAggregateFlow(aggregateId)
  }

  // Alias kept for callers that still use the old name
  async function loadSingleAggregateFlow2(aggregateId) {
    return loadSingleAggregateFlow(aggregateId)
  }

  function applyConnectionOrderLayout() {
    // Optional layout helper for multi-aggregate view.
    // Keep as no-op if you rely on backend positions.
  }

  // ---------------------------------------------------------------------------
  // Node / edge CRUD (minimal implementations used by return surface)
  // ---------------------------------------------------------------------------
  function getNodes() {
    return nodes.value
  }

  function setSelectedNode(node) {
    selectedNode.value = node
  }

  function clearSelected() {
    selectedNode.value = null
  }

  function openStepModal(initialData = null) {
    stepModalInitialData.value = initialData
    stepModalOpen.value = true
  }

  function closeStepModal() {
    stepModalOpen.value = false
    stepModalInitialData.value = null
  }

  function closeConnectionModal() {
    showConnectionModal.value = false
    pendingConnection.value = null
    connectionStepData.value = null
  }

  async function saveConnectionStep() {
    // Implement with your existing connection-modal logic if needed.
    closeConnectionModal()
  }

  function addNode(node) {
    nodes.value.push(node)
    nodes.value = [...nodes.value]
  }

  function addNodeLocal(node) {
    addNode(node)
  }

  async function createServiceForNode(/* nodeOrPayload */) {
    // Hook for backend service creation — implement via serviceAggregatorClient.
  }

  async function ensureService(/* node */) {
    // Ensure a service exists for a node — implement via serviceAggregatorClient.
  }

  function updateNode(nodeId, patch) {
    const idx = nodes.value.findIndex((n) => n.id === nodeId)
    if (idx === -1) return
    nodes.value[idx] = {
      ...nodes.value[idx],
      ...patch,
      data: { ...nodes.value[idx].data, ...(patch.data || {}) },
    }
    nodes.value = [...nodes.value]
  }

  async function updateAggregateData(/* payload */) {
    // Implement via serviceAggregatorClient.updateAggregate if needed.
  }

  function deleteNode(nodeId) {
    nodes.value = nodes.value.filter((n) => n.id !== nodeId)
    edges.value = edges.value.filter((e) => e.source !== nodeId && e.target !== nodeId)
    persistentEdges.value = persistentEdges.value.filter(
      (e) => e.source !== nodeId && e.target !== nodeId,
    )
  }

  function deleteNode2(nodeId) {
    deleteNode(nodeId)
  }

  function addEdge(edge) {
    if (!edge?.id) {
      edge = { ...edge, id: `e-${edge.source}-${edge.target}-${Date.now()}` }
    }
    edges.value.push(edge)
    edges.value = [...edges.value]
    if (!persistentEdges.value.find((e) => e.id === edge.id)) {
      persistentEdges.value.push(structuredClone(edge))
    }
  }

  function updateEdge(edgeId, patch) {
    const idx = edges.value.findIndex((e) => e.id === edgeId)
    if (idx === -1) return
    edges.value[idx] = { ...edges.value[idx], ...patch }
    edges.value = [...edges.value]
    const pIdx = persistentEdges.value.findIndex((e) => e.id === edgeId)
    if (pIdx !== -1) {
      persistentEdges.value[pIdx] = { ...persistentEdges.value[pIdx], ...patch }
    }
  }

  function deleteEdge(edgeId) {
    edges.value = edges.value.filter((e) => e.id !== edgeId)
    persistentEdges.value = persistentEdges.value.filter((e) => e.id !== edgeId)
  }

  async function handleConnect(params) {
    if (isPortHandle(params?.sourceHandle) || isPortHandle(params?.targetHandle)) {
      return connectFieldPorts(params)
    }
    // Default step-to-step connection
    addEdge({
      id: `edge-${params.source}-${params.target}-${Date.now()}`,
      source: params.source,
      target: params.target,
      sourceHandle: params.sourceHandle,
      targetHandle: params.targetHandle,
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
      data: {},
    })
    return true
  }

  // Mapping helpers — thin wrappers; extend with your existing API calls
  async function addMapping(/* payload */) {}
  async function updateMapping(/* payload */) {}
  async function addStepMapping(/* payload */) {}
  async function updateStepMapping(/* payload */) {}

  async function deleteStepMapping(aggregateStepId, mappingId) {
    if (!aggregateStepId || !mappingId) {
      notify({
        title: 'خطا',
        text: 'aggregateStepId و mappingId مورد نیاز است',
        type: 'error',
      })
      return false
    }

    try {
      const node = nodes.value.find((n) => n.data?.aggregateStepId === aggregateStepId)
      await serviceAggregatorClient.deleteAggregateStepMapping(mappingId)

      if (node && node.data.mappings) {
        node.data.mappings = node.data.mappings.filter((m) => m.id !== mappingId)
        nodes.value = [...nodes.value]
      }

      notify({
        title: 'موفقیت',
        text: 'Mapping حذف شد',
        type: 'success',
      })
      return true
    } catch (error) {
      console.error('Failed to delete step mapping:', error)
      notify({
        title: 'خطا',
        text: 'خطا در حذف mapping',
        type: 'error',
      })
      return false
    }
  }

  function exportFlow() {
    return {
      nodes: nodes.value,
      edges: edges.value,
      viewport: { ...flowViewport },
    }
  }

  function importFlow(data) {
    if (!data) return
    isSyncing.value = true
    try {
      if (Array.isArray(data.nodes)) nodes.value = data.nodes
      if (Array.isArray(data.edges)) {
        edges.value = data.edges
        persistentEdges.value = structuredClone(data.edges)
      }
      if (data.viewport) {
        flowViewport.x = data.viewport.x ?? 0
        flowViewport.y = data.viewport.y ?? 0
        flowViewport.zoom = data.viewport.zoom ?? 1
      }
    } finally {
      isSyncing.value = false
    }
  }

  // ---------------------------------------------------------------------------
  // Input / Output field ports
  // ---------------------------------------------------------------------------
  function isPortHandle(handleId) {
    if (!handleId) return false
    const id = String(handleId)
    return id.startsWith('input-') || id.startsWith('output-')
  }

  /**
   * Build a tree of service mappings.
   * Only roots go into inputs/outputs; children live under parent.children.
   */
  function parseServiceMappings(raw) {
    const list = Array.isArray(raw)
      ? raw
      : raw?.data || raw?.mappings || raw?.items || []

    const byId = new Map()
    list.forEach((m) => {
      const name = m.name || m.targetField || m.sourceField
      if (!name) return
      const key = m.id ? String(m.id) : name
      byId.set(key, {
        id: key,
        name,
        type: m.type || '',
        direction: m.direction,
        parentId: m.parentId ? String(m.parentId) : null,
        handleId: '',
        children: [],
        original: m,
      })
    })

    const roots = []
    byId.forEach((field) => {
      const parent = field.parentId && byId.get(field.parentId)
      if (parent) {
        parent.children.push(field)
      } else {
        roots.push(field)
      }
    })

    const inputs = []
    const outputs = []

    function assignHandles(field, isInput) {
      field.handleId = (isInput ? 'input-' : 'output-') + field.id
      ;(field.children || []).forEach((c) => assignHandles(c, isInput))
    }

    roots.forEach((f) => {
      if (
        f.direction === 1 ||
        f.direction === 'input' ||
        f.direction === 'request'
      ) {
        assignHandles(f, true)
        inputs.push(f)
      } else if (
        f.direction === 2 ||
        f.direction === 'output' ||
        f.direction === 'response'
      ) {
        assignHandles(f, false)
        outputs.push(f)
      }
    })

    return { inputs, outputs }
  }

  async function loadServiceMappings(stepId, serviceId) {
    if (!stepId || !serviceId) return { inputs: [], outputs: [] }
    if (serviceMappingsCache[stepId]) return serviceMappingsCache[stepId]
    try {
      const raw = await serviceAggregatorClient.getServiceMappingsByServiceId(serviceId)
      const parsed = parseServiceMappings(raw)
      serviceMappingsCache[stepId] = parsed
      return parsed
    } catch (e) {
      console.error('Failed to load service mappings for step', stepId, e)
      const empty = { inputs: [], outputs: [] }
      serviceMappingsCache[stepId] = empty
      return empty
    }
  }

  async function loadServiceMappingsForNodes() {
    for (const node of nodes.value) {
      const stepId = node.data && node.data.aggregateStepId
      const serviceId = node.data && node.data.serviceId
      if (stepId && serviceId) {
        await loadServiceMappings(stepId, serviceId)
      }
    }
  }

  function getNodeAvailableInputs(nodeId) {
    const node = nodes.value.find((n) => n.id === nodeId)
    if (!node) return []
    const cached = serviceMappingsCache[node.data && node.data.aggregateStepId]
    return cached ? cached.inputs : []
  }

  function getNodeAvailableOutputs(nodeId) {
    const node = nodes.value.find((n) => n.id === nodeId)
    if (!node) return []
    const cached = serviceMappingsCache[node.data && node.data.aggregateStepId]
    return cached ? cached.outputs : []
  }

  /**
   * Create a Vue Flow edge + persist an AggregateStepMapping between two field ports.
   */
  async function connectFieldPorts(params) {
    const { source, target, sourceHandle, targetHandle } = params || {}
    if (!source || !target) return false

    const sourceNode = nodes.value.find((n) => n.id === source)
    const targetNode = nodes.value.find((n) => n.id === target)
    const sourceStepId = sourceNode?.data?.aggregateStepId || null
    const targetStepId = targetNode?.data?.aggregateStepId || null

    let sourceField = ''
    let targetField = ''

    if (sourceHandle && sourceNode) {
      const cached = serviceMappingsCache[sourceNode.data.aggregateStepId]
      const f =
        cached?.outputs?.find((o) => o.handleId === sourceHandle) || null
      sourceField = f
        ? f.name
        : sourceHandle.startsWith('output-')
          ? sourceHandle.slice(7)
          : ''
    }

    if (targetHandle && targetNode) {
      const cached = serviceMappingsCache[targetNode.data.aggregateStepId]
      const f =
        cached?.inputs?.find((i) => i.handleId === targetHandle) || null
      targetField = f
        ? f.name
        : targetHandle.startsWith('input-')
          ? targetHandle.slice(6)
          : ''
    }

    const edgeId =
      'e-field-' + source + '-' + sourceHandle + '-' + target + '-' + targetHandle
    const edgeData = {
      aggregateStepId: targetStepId,
      inputStepId: sourceStepId,
      source: 'StepOutput',
      sourceField,
      targetField,
      fieldMapping: true,
      mappings: [],
    }

    const edge = {
      id: edgeId,
      source,
      target,
      sourceHandle,
      targetHandle,
      type: 'default',
      animated: false,
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
      data: edgeData,
    }

    const existing = edges.value.find((e) => e.id === edgeId)
    if (existing) {
      existing.data = edgeData
      edges.value = [...edges.value]
    } else {
      edges.value.push(edge)
      edges.value = [...edges.value]
    }
    if (!persistentEdges.value.find((e) => e.id === edgeId)) {
      persistentEdges.value.push(structuredClone(edge))
    }

    try {
      await serviceAggregatorClient.addAggregateStepMapping({
        aggregateStepId: targetStepId,
        inputStepId: sourceStepId,
        source: 'StepOutput',
        sourceField,
        targetField,
        value: '',
        valueType: 'string',
        status: true,
      })
      if (currentAggregateId.value) {
        await loadSingleAggregateFlow(currentAggregateId.value)
      }
    } catch (error) {
      console.error('Failed to save field mapping:', error)
      edges.value = edges.value.filter((e) => e.id !== edgeId)
      persistentEdges.value = persistentEdges.value.filter((e) => e.id !== edgeId)
      notify({
        title: 'خطا',
        text: 'خطا در ذخیره ارتباط میان فیلدها',
        type: 'error',
      })
      return false
    }

    return true
  }

  /**
   * Rebuild field-port edges from AggregateStepMappings on each step.
   * Call AFTER nodes are loaded and serviceMappingsCache is filled.
   */
  function rebuildFieldMappingEdges() {
    const fieldEdges = []

    for (const node of nodes.value) {
      const mappings = node.data?.mappings || []
      const targetStepId = node.data?.aggregateStepId
      if (!targetStepId || !mappings.length) continue

      for (const m of mappings) {
        if (!m.sourceField || !m.targetField) continue
        if (
          m.source !== 'StepOutput' &&
          m.source !== 'response' &&
          m.source !== 'Step Output'
        ) {
          continue
        }

        const sourceNode = nodes.value.find(
          (n) => n.data?.aggregateStepId === m.inputStepId,
        )
        if (!sourceNode) continue

        const sourceHandle =
          'output-' +
          ((serviceMappingsCache[sourceNode.data.aggregateStepId]?.outputs || []).find(
            (o) => o.name === m.sourceField,
          )?.id || m.sourceField)

        const targetHandle =
          'input-' +
          ((serviceMappingsCache[targetStepId]?.inputs || []).find(
            (i) => i.name === m.targetField,
          )?.id || m.targetField)

        const edgeId = `e-field-${sourceNode.id}-${sourceHandle}-${node.id}-${targetHandle}`

        fieldEdges.push({
          id: edgeId,
          source: sourceNode.id,
          target: node.id,
          sourceHandle,
          targetHandle,
          type: 'default',
          animated: false,
          markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
          data: {
            aggregateStepId: targetStepId,
            inputStepId: m.inputStepId,
            source: m.source,
            sourceField: m.sourceField,
            targetField: m.targetField,
            fieldMapping: true,
            valueType: m.valueType || null,
            mappingId: m.id,
          },
        })
      }
    }

    const desiredIds = new Set(fieldEdges.map((fe) => fe.id))
    const isStaleFieldEdge = (e) =>
      e.data?.fieldMapping === true && !desiredIds.has(e.id)

    edges.value = edges.value.filter((e) => !isStaleFieldEdge(e))
    persistentEdges.value = persistentEdges.value.filter((e) => !isStaleFieldEdge(e))

    for (const fe of fieldEdges) {
      if (!edges.value.find((e) => e.id === fe.id)) {
        edges.value.push(fe)
      }
      if (!persistentEdges.value.find((e) => e.id === fe.id)) {
        persistentEdges.value.push(structuredClone(fe))
      }
    }
    edges.value = [...edges.value]
  }

  // ---------------------------------------------------------------------------
  // Persistent Aggregate Input JSON
  // ---------------------------------------------------------------------------
  async function loadAggregateInput(aggregateId) {
    if (!aggregateId) {
      aggregateInputJson.value = null
      aggregateInputDirty.value = false
      aggregateInputError.value = null
      return
    }

    aggregateInputLoading.value = true
    aggregateInputError.value = null
    try {
      const response = await serviceAggregatorClient.getAggregateInput(aggregateId)
      const data = response && response.data !== undefined ? response.data : response
      aggregateInputJson.value =
        data && data.inputJson !== undefined ? data.inputJson : null
      aggregateInputDirty.value = false
    } catch (error) {
      console.error('Failed to load aggregate input JSON:', error)
      aggregateInputError.value = error?.message || 'خطا در بارگذاری تعریف ورودی'
      aggregateInputJson.value = null
    } finally {
      aggregateInputLoading.value = false
    }
  }

  // ---------------------------------------------------------------------------
  // Persistent Aggregate Input Schema
  // ---------------------------------------------------------------------------
  async function loadAggregateInputSchema(aggregateId) {
    if (!aggregateId) {
      aggregateInputSchema.value = null
      aggregateInputSchemaDirty.value = false
      aggregateInputSchemaError.value = null
      return
    }

    aggregateInputSchemaLoading.value = true
    aggregateInputSchemaError.value = null

    try {
      const response = await serviceAggregatorClient.getAggregateInputSchema(aggregateId)
      const data = response && response.data !== undefined ? response.data : response

      const schema = data && data.inputSchema !== undefined ? data.inputSchema : null
      const inputJson = data && data.inputJson !== undefined ? data.inputJson : null

      if (schema) {
        const deserialized = deserializeFieldSchema(schema)
        aggregateInputSchema.value = deserialized.fields ?? deserialized
        aggregateInputSchemaDirty.value = false
      } else if (inputJson) {
        // No persisted schema: leave null (or infer if you add schemaFromInputJson)
        aggregateInputSchema.value = null
        aggregateInputSchemaDirty.value = false
      } else {
        aggregateInputSchema.value = null
        aggregateInputSchemaDirty.value = false
      }
    } catch (error) {
      console.error('Failed to load aggregate input schema:', error)
      aggregateInputSchemaError.value =
        error?.message || 'خطا در بارگذاری اسکیم ورودی'
      aggregateInputSchema.value = null
    } finally {
      aggregateInputSchemaLoading.value = false
    }
  }

  function setAggregateInputSchema(schema) {
    aggregateInputSchema.value = schema
    aggregateInputSchemaDirty.value = true
    aggregateInputSchemaError.value = null
  }

  async function saveAggregateInputSchema() {
    const aggregateId = currentAggregateId.value
    if (!aggregateId) {
      notify({ title: 'خطا', text: 'شناسه تجمع مشخص نشده است', type: 'error' })
      return false
    }

    if (aggregateInputSchema.value === null) {
      notify({
        title: 'هشدار',
        text: 'هیچ اسکیم ورودی برای ذخیره موجود نیست',
        type: 'warning',
      })
      return false
    }

    if (
      Array.isArray(aggregateInputSchema.value) &&
      aggregateInputSchema.value.length > 0 &&
      typeof validateAggregateInputSchema === 'function'
    ) {
      const validation = validateAggregateInputSchema(aggregateInputSchema.value)
      if (validation && validation.length > 0) {
        notify({
          title: 'خطا',
          text: validation.join('; '),
          type: 'error',
        })
        return false
      }
    }

    const schemaToSave = serializeFieldSchema({
      version: 1,
      fields: aggregateInputSchema.value,
    })

    aggregateInputSchemaLoading.value = true
    try {
      await serviceAggregatorClient.updateAggregateInputSchema(aggregateId, schemaToSave)
      aggregateInputSchemaDirty.value = false
      notify({
        title: 'موفقیت',
        text: 'اسکیم ورودی تجمیع ذخیره شد',
        type: 'success',
      })
      return true
    } catch (error) {
      console.error('Failed to save aggregate input schema:', error)
      notify({
        title: 'خطا',
        text: 'خطا در ذخیره اسکیم ورودی: ' + (error?.message || ''),
        type: 'error',
      })
      return false
    } finally {
      aggregateInputSchemaLoading.value = false
    }
  }

  function setAggregateInput(json) {
    aggregateInputJson.value = json
    aggregateInputDirty.value = true
    aggregateInputError.value = null
  }

  async function saveAggregateInput() {
    const aggregateId = currentAggregateId.value
    if (!aggregateId) {
      notify({ title: 'خطا', text: 'شناسه تجمع مشخص نشده است', type: 'error' })
      return false
    }
    if (aggregateInputJson.value === null) {
      notify({
        title: 'هشدار',
        text: 'هیچ تعریف ورودی برای ذخیره موجود نیست',
        type: 'warning',
      })
      return false
    }

    if (
      aggregateInputJson.value !== null &&
      String(aggregateInputJson.value).trim() !== ''
    ) {
      try {
        JSON.parse(aggregateInputJson.value)
      } catch (error) {
        notify({
          title: 'خطا',
          text: 'متن JSON معتبر نمی‌باشد: ' + error.message,
          type: 'error',
        })
        return false
      }
    }

    aggregateInputLoading.value = true
    try {
      await serviceAggregatorClient.updateAggregateInput(
        aggregateId,
        aggregateInputJson.value,
      )
      aggregateInputDirty.value = false
      notify({
        title: 'موفقیت',
        text: 'تعریف ورودی تجمیع ذخیره شد',
        type: 'success',
      })
      return true
    } catch (error) {
      console.error('Failed to save aggregate input JSON:', error)
      notify({
        title: 'خطا',
        text: 'خطا در ذخیره تعریف ورودی: ' + (error?.message || ''),
        type: 'error',
      })
      return false
    } finally {
      aggregateInputLoading.value = false
    }
  }

  function resetAggregateInput() {
    aggregateInputJson.value = null
    aggregateInputDirty.value = false
    aggregateInputError.value = null
    aggregateInputLoading.value = false
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  return {
    enableAutoSave,
    disableAutoSave,
    autoSaveEnabled,
    autoSave,
    nodes,
    edges,
    persistentEdges,
    rebuildEdgesFromPersistent,
    mergePersistedEdges,
    selectedNode,
    showModal,
    modalMode,
    flowViewport,
    aggregates,
    currentAggregateId,
    isLoading,
    showConnectionModal,
    pendingConnection,
    connectionStepData,
    stepModalOpen,
    stepModalInitialData,
    deleteNode2,
    loadAggregates,
    loadAggregateFlow,
    loadSingleAggregateFlow,
    applyConnectionOrderLayout,
    addNode,
    addNodeLocal,
    createServiceForNode,
    ensureService,
    updateNode,
    updateAggregateData,
    deleteNode,
    addEdge,
    updateEdge,
    deleteEdge,
    addMapping,
    updateMapping,
    addStepMapping,
    updateStepMapping,
    deleteStepMapping,
    getNodes,
    handleConnect,
    rebuildFieldMappingEdges,
    isPortHandle,
    connectFieldPorts,
    loadServiceMappings,
    loadServiceMappingsForNodes,
    getNodeAvailableInputs,
    getNodeAvailableOutputs,
    serviceMappingsCache,
    saveConnectionStep,
    closeConnectionModal,
    openStepModal,
    closeStepModal,
    setSelectedNode,
    clearSelected,
    exportFlow,
    importFlow,
    getAggregateByid,
    executionStatus,
    setNodeStatus,
    resetExecution,
    loadSingleAggregateFlow2,
    aggregateInputJson,
    aggregateInputDirty,
    aggregateInputLoading,
    aggregateInputError,
    aggregateInputSchema,
    aggregateInputSchemaDirty,
    aggregateInputSchemaLoading,
    aggregateInputSchemaError,
    loadAggregateInput,
    loadAggregateInputSchema,
    setAggregateInput,
    setAggregateInputSchema,
    saveAggregateInput,
    saveAggregateInputSchema,
    resetAggregateInput,
  }
})
