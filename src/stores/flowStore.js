// src/store/flowStore.js
import { defineStore } from 'pinia'
import { reactive, ref, watch } from 'vue'
import { mergeNFields } from '../utils/schemaUtils'
import { uniqueId } from '@/utils/modalUtils'
import { MarkerType } from '@vue-flow/core'
import serviceAggregatorClient from '@/utils/service-aggregator-client'
import { notify } from '@kyvg/vue3-notification'

const LOCAL_STORAGE_KEY = 'flowservice-flow'

export const useFlowStore = defineStore('flow', () => {
  const nodes = ref([])
  const edges = ref([])
  // Local persistent edges independent of backend nextStepId
  // Survives backend updates and reloads; supports multiple outgoing edges per node
  const persistentEdges = ref([])
  const autoSave = ref(false)
  const selectedNode = ref(null)
  const showModal = ref(false)
  const modalMode = ref('add')
  const flowViewport = reactive({ x: 0, y: 0, zoom: 1 })
  const aggregates = ref([])
  const currentAggregateId = ref(null)
  const isLoading = ref(false)
  const showConnectionModal = ref(false)
  const pendingConnection = ref(null)
  const connectionStepData = ref(null)
  const stepModalOpen = ref(false)
  const stepModalInitialData = ref(null)
  const isProcessingConnection = ref(false)

  watch(autoSave, (newVal) => {
    localStorage.setItem('AutoSave', newVal)
  })

  function loadFlow() {
    const flow = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (flow) {
      try {
        const parsed = JSON.parse(flow)
        importFlow(parsed)
      } catch (e) {
        console.warn('Failed to parse flow from localStorage', e)
      }
    }
  }
  const savedAutoSave = localStorage.getItem('AutoSave')
  if (savedAutoSave !== null) {
    // Convert string back to boolean
    autoSave.value = savedAutoSave === 'true'
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

      if (autoSave.value) {
        saveFlow(newNodes, newEdges)
      }
    },
    { deep: true },
  )
  loadFlow()

  /**
   * Rebuild edges from persistentEdges + valid backend connections
   * Called after loading nodes to restore edge state from local cache
   * This allows edges to survive node position updates and backend nextStepId resets
   * @param {Array} stepIdToNodeIdMap - Map from step ID to node ID for lookups
   */
  function rebuildEdgesFromPersistent() {
    // Create a map from stepId to nodeId for lookups
    const stepIdToNodeIdMap = new Map()
    nodes.value.forEach(node => {
      if (node.data?.aggregateStepId) {
        stepIdToNodeIdMap.set(node.data.aggregateStepId, node.id)
      }
    })

    const rebuiltEdges = []

    // Restore edges from persistentEdges (primary source of truth for connections)
    persistentEdges.value.forEach((persistedEdge) => {
      const sourceNodeId = persistedEdge.source
      const targetNodeId = persistedEdge.target

      // Verify both nodes still exist
      if (nodes.value.find(n => n.id === sourceNodeId) && nodes.value.find(n => n.id === targetNodeId)) {
        rebuiltEdges.push({
          ...persistedEdge,
          // Keep original styling and data
        })
      }
    })

    edges.value = rebuiltEdges
    edges.value = [...edges.value]
  }

  /**
   * Merge edges from backend load into persistentEdges
   * Preserves user-created edges while adding any new backend edges
   * Called after load operations to rebuild edges from both sources
   */
  function mergePersistedEdges() {
    // Rebuild edges and add any missing ones from persistentEdges
    rebuildEdgesFromPersistent()
  }

  async function loadAggregates() {
    debugger
    isLoading.value = true
    try {
      const allAggregates = await serviceAggregatorClient.getAggregates()
      if (allAggregates && allAggregates.length > 0) {
        aggregates.value = allAggregates

        if (allAggregates.length === 1) {
          await loadSingleAggregateFlow(allAggregates[0].id)
        } else {
          const aggregateIds = allAggregates.map(a => a.id)
          await loadAggregateFlow(aggregateIds)
        }

        // Only set currentAggregateId if it's not already set
        if (!currentAggregateId.value) {
          currentAggregateId.value = allAggregates[0].id
        } else {
          // If currentAggregateId is set, verify it still exists
          const existingAggregate = allAggregates.find(a => a.id === currentAggregateId.value)
          if (!existingAggregate) {
            // If the current aggregate no longer exists, set to the first one
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
  }  /**
   * Load aggregate flow(s) from backend and convert to VueFlow nodes and edges
   * Can accept a single aggregate ID or an array of aggregate IDs
   * When array is provided, loads all flows
   * When single ID is provided, loads that specific aggregate
   * API Response structure: { id, name, description, status, steps: [{ id, stepName, serviceId, service, nextStepId, trueStepId, falseStepId, condition, mappings }] }
   */
  async function loadAggregateFlow(aggregateIdOrIds) {
    try {
      const rawData = await serviceAggregatorClient.getAggregateByid(aggregateIdOrIds)

      // همیشه به صورت آرایه دربیاوریم
      const allAggregatesData = Array.isArray(rawData) ? rawData : [rawData]

      const idsToLoad = Array.isArray(aggregateIdOrIds) ? aggregateIdOrIds : [aggregateIdOrIds]

      // فیلتر aggregateهایی که واقعاً می‌خواهیم
      const aggregatesToLoad = allAggregatesData.filter(a => idsToLoad.includes(a.id))

      if (aggregatesToLoad.length === 0) {
        console.warn(`No aggregates found for IDs: ${idsToLoad}`)
        return
      }

      // تنظیم currentAggregateId
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
          // فقط وقتی چند aggregate داریم header اضافه کنیم
          const aggregateYPos = 100 + (aggregatesToLoad.indexOf(aggregate) * 280)
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

        // ساختن نودها — اولویت با position backend
        for (const step of steps) {
          const nodeId = `node-${step.id}`
          stepIdToNodeIdMap.set(step.id, nodeId)
          const firstStep = aggregate.firstStepId;
          const service = step.service || {}
          const hasCondition = step.condition && `${step.condition}`.trim() !== ''
          let nodeType = '';//hasCondition ? 'decisionNode' : 'serviceNode'
          if(hasCondition){
            nodeType = 'decisionNode';
          }else if(firstStep == step.serviceId){
            nodeType = 'startNode';
          }else{
            nodeType = "serviceNode";
          }
          // استفاده از position backend اگر موجود باشد، در غیر اینصورت fallback ساده
          const position = (step.positionX != null && step.positionY != null)
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
              status: (service?.status !== undefined ? service.status : step.status !== undefined ? step.status : true),
              mappings: step.mappings || [],
              fields: service?.fields ? [...service.fields] : [],
            },
          })
        }

        // ساختن edgeها
        for (const step of steps) {
          const sourceNodeId = stepIdToNodeIdMap.get(step.id)
          if (!sourceNodeId) continue

          const stepMappings = step.mappings || []

          if (step.nextStepId) {
            const targetNodeId = stepIdToNodeIdMap.get(step.nextStepId)
            if (targetNodeId) {
              // edge معمولی با رنگ صورتی/قرمز
              flowEdges.push({
                id: `edge-${step.id}-next-${step.nextStepId}`,
                source: sourceNodeId,
                target: targetNodeId,
                label: '', // یا 'Next'
                markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: '#FF0072' },
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
                markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: '#10B981' },
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
                markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: '#EF4444' },
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

        // فقط وقتی چند aggregate داریم، edge از header به entry steps اضافه کنیم
        if (isMultiple) {
          const allTargets = new Set()
          steps.forEach(s => {
            if (s.nextStepId) allTargets.add(s.nextStepId)
            if (s.trueStepId) allTargets.add(s.trueStepId)
            if (s.falseStepId) allTargets.add(s.falseStepId)
          })
          const entrySteps = steps.filter(s => !allTargets.has(s.id))

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
                markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: '#f59e0b' },
                data: { aggregateId: aggregate.id, isAggregateConnection: true },
              })
            }
          }
        }
      }

      // به‌روزرسانی store
      nodes.value = flowNodes
      edges.value = flowEdges
      nodes.value = [...nodes.value]
      edges.value = [...edges.value]

      // فقط وقتی چند aggregate داریم layout دستی اعمال کنیم
      if (isMultiple) {
        applyConnectionOrderLayout()
      }
      // در حالت تک aggregate، موقعیت‌ها از backend آمده و نیازی به layout مجدد نیست

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
      }else{
        return aggregate
      }

    }  catch (error) {
      console.error('Failed to load single aggregate flow:', error)
      notify({
        title: 'خطا',
        text: 'خطا در بارگذاری flow',
        type: 'error',
      })
    }
  }
  /**
   * Load a single aggregate by ID and build flow graph starting from firstStepId
   * Uses GET /api/aggregate/get-aggregate/{id} endpoint
   * Traverses steps using nextStepId, trueStepId, falseStepId
   * Positions are loaded from backend (step.positionX, step.positionY)
   * @param {string} aggregateId - The aggregate ID to load
   */
  async function loadSingleAggregateFlow(aggregateId) {
    debugger
    try {
      console.log('loading single aggregates');
      // Fetch single aggregate with full details
      const aggregate = await serviceAggregatorClient.getAggregateByid(aggregateId)

      if (!aggregate) {
        console.warn(`Aggregate ${aggregateId} not found`)
        notify({
          title: 'خطا',
          text: `Aggregate با ID ${aggregateId} یافت نشد`,
          type: 'error',
        })
        return
      }

      currentAggregateId.value = aggregateId
      const flowNodes = []
      const flowEdges = []
      const stepIdToNodeIdMap = new Map()
      const steps = aggregate.steps || []
      const firstStep = aggregate.firstStepId;

      // Create a map of step IDs to step objects for quick lookup
      const stepMap = new Map()
      steps.forEach(step => {
        stepMap.set(step.id, step)
      })

      // Build nodes by traversing from firstStepId
      const visitedSteps = new Set()
      let xPos = 100
      let yPos = 100
      const nodePositions = new Map()

      // Helper function to get position for a node (simple horizontal layout)
      function getPositionForStep(stepId) {
        if (nodePositions.has(stepId)) {
          return nodePositions.get(stepId)
        }
        const pos = { x: xPos, y: yPos }
        nodePositions.set(stepId, pos)
        xPos += 300
        if (xPos > 1500) {
          xPos = 100
          yPos += 220
        }
        return pos
      }

      // Traverse from firstStepId
      function traverseStep(stepId, depth = 0) {
        if (!stepId || visitedSteps.has(stepId)) {
          return
        }

        const step = stepMap.get(stepId)
        if (!step) {
          return
        }

        visitedSteps.add(stepId)
        const nodeId = `node-${step.id}`
        stepIdToNodeIdMap.set(step.id, nodeId)

        // Determine node type: diamond for conditional, rectangular for normal
        const hasCondition = step.condition !== null && step.condition !== undefined && `${step.condition}`.trim() !== ''
        let nodeType = ''; //hasCondition ? 'decisionNode' : 'serviceNode'
          if(hasCondition){
            nodeType = 'decisionNode';
          }else if(firstStep == step.serviceId){
            nodeType = 'startNode';
          }else{
            nodeType = "serviceNode";
          }
        // Get service info if available
        const service = step.service || {}
        // Use step.serviceId if available, otherwise fall back to service.id
        const serviceId = step.serviceId || service.id

        // Build node label: stepName + service.name + (method)
        let nodeLabel = step.stepName || 'Step'
        if (service.name) {
          nodeLabel += ` - ${service.name}`
          if (service.method) {
            nodeLabel += ` (${service.method})`
          }
        }

        // Use position from backend (step.positionX, step.positionY), otherwise use default position
        const position = step.positionX !== null && step.positionX !== undefined && step.positionY !== null && step.positionY !== undefined
          ? { x: step.positionX, y: step.positionY }
          : getPositionForStep(stepId)

        // Create node
        const node = {
          id: nodeId,
          type:  nodeType,
          position: position,
          data: {
            id: nodeId,
            aggregateStepId: step.id,
            aggregateId: aggregateId,
            label: nodeLabel,
            stepName: step.stepName || '',
            condition: step.condition || '',
            conditionParameters: step.conditionParameters || '',
            serviceId: serviceId,
            serviceName: service.name || '',
            url: service.url || '',
            method: service.method || 'GET',
            type: service.type || 'REST',
            status: service.status !== undefined ? service.status : step.status !== undefined ? step.status : true,
            mappings: step.mappings || [],
            fields: service.fields ? [...service.fields] : [],
            nextStepId: step.nextStepId || null,
            trueStepId: step.trueStepId || null,
            falseStepId: step.falseStepId || null,
          },
        }

        flowNodes.push(node)

        // Traverse connections: nextStepId, trueStepId, falseStepId
        if (step.nextStepId) {
          traverseStep(step.nextStepId, depth + 1)
        }
        if (step.trueStepId) {
          traverseStep(step.trueStepId, depth + 1)
        }
        if (step.falseStepId) {
          traverseStep(step.falseStepId, depth + 1)
        }
      }

      // Start traversal from firstStepId if available, otherwise from all entry steps
      if (aggregate.firstStepId) {
        console.log('Starting traversal from firstStepId:', aggregate.firstStepId)
        traverseStep(aggregate.firstStepId)
      } else {
        console.log('No firstStepId, finding entry steps')
        // Fallback: find entry steps (steps that are not targets of any other step)
        const allTargets = new Set()
        steps.forEach(step => {
          if (step.nextStepId) allTargets.add(step.nextStepId)
          if (step.trueStepId) allTargets.add(step.trueStepId)
          if (step.falseStepId) allTargets.add(step.falseStepId)
        })

        const entrySteps = steps.filter(s => !allTargets.has(s.id))
        console.log('Entry steps found:', entrySteps.length)
        entrySteps.forEach(entryStep => {
          if (!visitedSteps.has(entryStep.id)) {
            traverseStep(entryStep.id)
          }
        })
      }

      // Create nodes for any steps that weren't visited during traversal
      // This ensures all steps are shown, even if they're not connected to the main flow
      steps.forEach(step => {
        if (!visitedSteps.has(step.id)) {
          console.log('Adding orphaned step:', step.id, step.stepName)
          visitedSteps.add(step.id)
          const orphanNodeId = `node-${step.id}`
          stepIdToNodeIdMap.set(step.id, orphanNodeId)

          // Determine node type: diamond for conditional, rectangular for normal
          const hasCondition = step.condition !== null && step.condition !== undefined && `${step.condition}`.trim() !== ''
          let nodeType = ""; //hasCondition ? 'decisionNode' : 'serviceNode'
          if(hasCondition){
            nodeType = 'decisionNode';
          }else if(firstStep == step.serviceId){
            nodeType = 'startNode';
          }else{
            nodeType = "serviceNode";
          }

          // Get service info if available
          const service = step.service || {}
          // Use step.serviceId if available, otherwise fall back to service.id
          const serviceId = step.serviceId || service.id || null

          // Build node label: stepName + service.name + (method)
          let nodeLabel = step.stepName || 'Step'
          if (service.name) {
            nodeLabel += ` - ${service.name}`
            if (service.method) {
              nodeLabel += ` (${service.method})`
            }
          }

          // Use position from backend (step.positionX, step.positionY), otherwise use default position
          const position = step.positionX !== null && step.positionX !== undefined && step.positionY !== null && step.positionY !== undefined
            ? { x: step.positionX, y: step.positionY }
            : getPositionForStep(step.id)
          // Create node
          const node = {
            id: orphanNodeId,
            type: nodeType,
            position: position,
            data: {
              id: orphanNodeId,
              aggregateStepId: step.id,
              aggregateId: aggregateId,
              label: nodeLabel,
              stepName: step.stepName || '',
              condition: step.condition || '',
              conditionParameters: step.conditionParameters || '',
              serviceId: serviceId,
              serviceName: service.name || '',
              url: service.url || '',
              method: service.method || 'GET',
              type: service.type || 'REST',
              status: service.status !== undefined ? service.status : step.status !== undefined ? step.status : true,
              mappings: step.mappings || [],
              fields: service.fields ? [...service.fields] : [],
              nextStepId: step.nextStepId || null,
              trueStepId: step.trueStepId || null,
              falseStepId: step.falseStepId || null,
            },
          }

          flowNodes.push(node)
        }
      })

      console.log('Nodes created:', flowNodes.length, 'Total steps:', steps.length)
      console.log('Visited steps:', Array.from(visitedSteps))
      console.log('Aggregate data:', { id: aggregate.id, name: aggregate.name, firstStepId: aggregate.firstStepId, stepsCount: steps.length })

      // Create edges only for steps that were visited (have nodes)
      steps.forEach(step => {
        debugger
        const sourceNodeId = stepIdToNodeIdMap.get(step.id)
        if (!sourceNodeId) return // Skip if this step wasn't traversed

        const stepMappings = step.mappings || []

        // Next edge (default flow)
        if (step.nextStepId) {
          const targetNodeId = stepIdToNodeIdMap.get(step.nextStepId)
          if (targetNodeId) {
            flowEdges.push({
              id: `edge-${step.id}-next-${step.nextStepId}`,
              source: sourceNodeId,
              target: targetNodeId,
              animated: true,
              type: 'default',
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 20,
                height: 20,
                color: '#FF0072',
              },
              label: 'Next',
              style: {},
              data: {
                aggregateStepId: step.id,
                aggregateId: aggregateId,
                condition: step.condition || '',
                conditionParameters: step.conditionParameters || '',
                mappings: stepMappings,
              },
            })
          }
        }

        // True edge (green)
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
                aggregateId: aggregateId,
                condition: step.condition || '',
                conditionParameters: step.conditionParameters || '',
                mappings: [],
              },
            })
          }
        }

        // False edge (red)
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
                aggregateId: aggregateId,
                condition: step.condition || '',
                conditionParameters: step.conditionParameters || '',
                mappings: [],
              },
            })
          }
        }
      })

      console.log('Edges created:', flowEdges.length)
      console.log('Final nodes:', flowNodes.length, 'Final edges:', flowEdges.length)

      // Update store with nodes and edges
      nodes.value = flowNodes
      edges.value = flowEdges
      // Merge backend edges into persistentEdges (don't replace)
      // This ensures user-created edges survive the reload
      flowEdges.forEach(backendEdge => {
        if (!persistentEdges.value.find(e => e.id === backendEdge.id)) {
          persistentEdges.value.push(structuredClone(backendEdge))
        }
      })
      nodes.value = [...nodes.value]
      edges.value = [...edges.value]

      // Rebuild edges from persistentEdges to restore user connections
      mergePersistedEdges()

      console.log('Store updated - nodes:', nodes.value.length, 'edges:', edges.value.length)

      // Skip layout for single aggregate flow - nodes are already positioned
      // applyConnectionOrderLayout() expects aggregate nodes which we don't create here
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
   * Apply hierarchical level-based layout: position nodes by depth in the graph
   * Nodes flow from top to bottom, with nodes at the same level arranged horizontally
   */
  function applyConnectionOrderLayout() {
    try {
      // Group nodes by aggregate
      const nodesByAggregate = new Map()
      const aggregateNodes = []
      const orphanNodes = []

      for (const node of nodes.value) {
        if (node.type === 'aggregateNode') {
          aggregateNodes.push(node)
        } else if (node.data?.aggregateId) {
          if (!nodesByAggregate.has(node.data.aggregateId)) {
            nodesByAggregate.set(node.data.aggregateId, [])
          }
          nodesByAggregate.get(node.data.aggregateId).push(node)
        } else {
          orphanNodes.push(node)
        }
      }

      const updatedNodes = []
      let currentYPos = 50

      // Process each aggregate in order
      for (const aggregateNode of aggregateNodes) {
        const aggregateId = aggregateNode.data.aggregateId
        const stepsInAggregate = nodesByAggregate.get(aggregateId) || []

        // Position aggregate header
        aggregateNode.position = { x: 50, y: currentYPos }
        updatedNodes.push(aggregateNode)
        currentYPos += 100

        if (stepsInAggregate.length === 0) {
          currentYPos += 100
          continue
        }

        // Build connection maps
        const stepConnections = new Map()
        const reverseConnections = new Map() // For finding parents

        for (const step of stepsInAggregate) {
          stepConnections.set(step.id, [])
          reverseConnections.set(step.id, [])
        }

        // Map edges to connections
        for (const edge of edges.value) {
          if (edge.data?.aggregateId === aggregateId && !edge.data?.isAggregateConnection) {
            const sourceNode = nodes.value.find(n => n.id === edge.source)
            const targetNode = nodes.value.find(n => n.id === edge.target)

            if (sourceNode && targetNode && sourceNode.data?.aggregateId === aggregateId) {
              if (!stepConnections.has(sourceNode.id)) {
                stepConnections.set(sourceNode.id, [])
              }
              if (!reverseConnections.has(targetNode.id)) {
                reverseConnections.set(targetNode.id, [])
              }
              stepConnections.get(sourceNode.id).push(targetNode.id)
              reverseConnections.get(targetNode.id).push(sourceNode.id)
            }
          }
        }

        // Find entry nodes (nodes with no incoming edges)
        const entryNodes = stepsInAggregate.filter(n => reverseConnections.get(n.id)?.length === 0)

        // Calculate levels using BFS
        const nodeLevels = new Map()
        const queue = []
        const visited = new Set()

        // Initialize entry nodes at level 0
        for (const entryNode of entryNodes) {
          nodeLevels.set(entryNode.id, 0)
          queue.push(entryNode.id)
          visited.add(entryNode.id)
        }

        // BFS to assign levels
        while (queue.length > 0) {
          const currentNodeId = queue.shift()
          const currentLevel = nodeLevels.get(currentNodeId) || 0
          const nextNodes = stepConnections.get(currentNodeId) || []

          for (const nextNodeId of nextNodes) {
            if (!visited.has(nextNodeId)) {
              nodeLevels.set(nextNodeId, currentLevel + 1)
              visited.add(nextNodeId)
              queue.push(nextNodeId)
            } else {
              // If already visited, update level if this path is longer
              const existingLevel = nodeLevels.get(nextNodeId) || 0
              if (currentLevel + 1 > existingLevel) {
                nodeLevels.set(nextNodeId, currentLevel + 1)
              }
            }
          }
        }

        // Group nodes by level
        const nodesByLevel = new Map()
        let maxLevel = 0
        for (const [nodeId, level] of nodeLevels.entries()) {
          if (!nodesByLevel.has(level)) {
            nodesByLevel.set(level, [])
          }
          nodesByLevel.get(level).push(nodeId)
          maxLevel = Math.max(maxLevel, level)
        }

        // Add nodes without levels (orphans in this aggregate)
        for (const step of stepsInAggregate) {
          if (!nodeLevels.has(step.id)) {
            if (!nodesByLevel.has(maxLevel + 1)) {
              nodesByLevel.set(maxLevel + 1, [])
            }
            nodesByLevel.get(maxLevel + 1).push(step.id)
            maxLevel = maxLevel + 1
          }
        }

        // Position nodes by level (top to bottom)
        const VERTICAL_SPACING = 200
        const HORIZONTAL_SPACING = 300
        const START_X = 100

        for (let level = 0; level <= maxLevel; level++) {
          const nodesAtLevel = nodesByLevel.get(level) || []
          if (nodesAtLevel.length === 0) continue

          // Calculate total width needed
          const totalWidth = nodesAtLevel.length * HORIZONTAL_SPACING
          const startX = START_X

          // Position nodes horizontally at this level
          nodesAtLevel.forEach((nodeId, index) => {
            const node = stepsInAggregate.find(n => n.id === nodeId)
            if (node) {
              node.position = {
                x: startX + (index * HORIZONTAL_SPACING),
                y: currentYPos
              }
              updatedNodes.push(node)
            }
          })

          currentYPos += VERTICAL_SPACING
        }

        currentYPos += 100 // Extra space after aggregate
      }

      // Position orphan nodes at the bottom
      let orphanXPos = 50
      let orphanYPos = currentYPos
      for (const orphan of orphanNodes) {
        orphan.position = { x: orphanXPos, y: orphanYPos }
        updatedNodes.push(orphan)
        orphanXPos += 300
      }

      nodes.value = [...updatedNodes]
    } catch (error) {
      console.error('Failed to apply connection order layout:', error)
    }
  }

  /**
   * Update aggregate in backend
   * @param {Object} aggregateData - { name: string, description: string, status?: boolean }
   * @param {string} aggregateId - ID of aggregate to update
   * @returns {Promise<Object>} Updated aggregate
   */
  async function updateAggregateData(aggregateData, aggregateId) {
    if (!aggregateId || !aggregateData) return null

    try {
      const aggregates = await serviceAggregatorClient.getAggregates()
      const existingAggregate = Array.isArray(aggregates)
        ? aggregates.find((a) => a.id === aggregateId)
        : null

      if (existingAggregate) {
        const updated = await serviceAggregatorClient.updateAggregate({
          id: aggregateId,
          name: aggregateData.name || existingAggregate.name,
          description: aggregateData.description || existingAggregate.description,
          status:
            aggregateData.status !== undefined
              ? aggregateData.status
              : existingAggregate.status !== undefined
                ? existingAggregate.status
                : true,
        })
        return updated
      }
      return null
    } catch (error) {
      console.error('Failed to update aggregate:', error)
      notify({
        title: 'خطا',
        text: 'خطا در بروزرسانی aggregate',
        type: 'error',
      })
      return null
    }
  }

  /**
   * Ensure aggregate exists in backend
   * @param {Object} aggregateData - { name: string, description: string }
   * @param {string} aggregateId - Optional ID to check/update
   * @returns {Promise<string>} The aggregate ID
   */
  async function ensureAggregate(aggregateData = null, aggregateId = null) {
    debugger
    try {
      const aggregates = await serviceAggregatorClient.getAggregates()
      const targetId = aggregateId || currentAggregateId.value

      if (targetId) {
        const existingAggregate = Array.isArray(aggregates)
          ? aggregates.find((a) => a.id === targetId)
          : null

        if (existingAggregate) {
          if (aggregateData) {
            await serviceAggregatorClient.updateAggregate({
              id: targetId,
              name: aggregateData.name || existingAggregate.name,
              description: aggregateData.description || existingAggregate.description,
              status:
                aggregateData.status !== undefined
                  ? aggregateData.status
                  : existingAggregate.status !== undefined
                    ? existingAggregate.status
                    : true,
            })
          } else {
            await serviceAggregatorClient.updateAggregate({
              id: targetId,
              name: existingAggregate.name,
              description: existingAggregate.description,
              status: existingAggregate.status !== undefined ? existingAggregate.status : true,
            })
          }
          currentAggregateId.value = targetId
          return targetId
        } else {
          if (aggregateData) {
            const newAggregate = await serviceAggregatorClient.createAggregate({
              name: aggregateData.name || 'Flow Aggregate',
              description: aggregateData.description || 'Auto-generated aggregate',
            })
            currentAggregateId.value = newAggregate.id
            return newAggregate.id
          }
        }
      }

      if (aggregates && aggregates.length > 0) {
        currentAggregateId.value = aggregates[0].id
        return aggregates[0].id
      }

      if (aggregateData) {
        const newAggregate = await serviceAggregatorClient.createAggregate({
          name: aggregateData.name || 'Flow Aggregate',
          description: aggregateData.description || 'Auto-generated aggregate',
        })
        currentAggregateId.value = newAggregate.id
        return newAggregate.id
      }

      return currentAggregateId.value
    } catch (error) {
      console.error('Failed to ensure aggregate:', error)
      notify({
        title: 'خطا',
        text: 'خطا در ایجاد یا بروزرسانی aggregate',
        type: 'error',
      })
      return currentAggregateId.value
    }
  }

  /**
   * Add a node locally without API call (for initial creation)
   * The API call will happen later when user adds a field
   */
  function addNodeLocal(options = {}) {
    const {
      position = {},
      label = 'New Service',
      serviceName = '',
      fields = [],
      url = '',
      method = 'GET',
      type = 'REST',
    } = options

    const x = typeof position.x === 'number' ? position.x : 100
    const y = typeof position.y === 'number' ? position.y : 100
    const id = uniqueId('svc')

    const node = {
      id: id,
      type: 'serviceNode',
      position: { x, y },
      data: {
        id,
        serviceId: null,
        aggregateId: currentAggregateId.value,
        label: label,
        serviceName: serviceName || label,
        url: url,
        method: method,
        type: type,
        status: true,
        fields: structuredClone(fields),
      },
    }

    nodes.value.push(node)
    nodes.value = [...nodes.value]
    return node
  }

  /**
   * Create a service in backend and attach to a node (used in add mode)
   */
  async function createServiceForNode(nodeId, serviceData) {
    const node = nodes.value.find((n) => n.id === nodeId)
    if (!node) return null
    await ensureAggregate()
    try {
      const createdService = await serviceAggregatorClient.createService({
        name: serviceData.serviceName || serviceData.name,
        url: serviceData.url || '',
        method: serviceData.method || 'GET',
        type: serviceData.type || 'REST',
      })
      const idx = nodes.value.findIndex((n) => n.id === nodeId)
      if (idx !== -1) {
        nodes.value[idx].data = {
          ...nodes.value[idx].data,
          serviceId: createdService.id,
          serviceName: serviceData.serviceName || serviceData.name,
          url: serviceData.url || '',
          method: serviceData.method || 'GET',
          type: serviceData.type || 'REST',
        }
        nodes.value = [...nodes.value]
      }
      return createdService
    } catch (error) {
      console.error('Failed to create service:', error)
      notify({
        title: 'خطا',
        text: 'خطا در ایجاد سرویس',
        type: 'error',
      })
      return null
    }
  }
  /**
   * Add a node with API call (creates service in backend)
   */
  async function addNode(options = {}) {
    const {
      position = {},
      label = 'New Service',
      serviceName = '',
      fields = [],
      url = '',
      method = 'GET',
      type = 'REST',
    } = options

    const x = typeof position.x === 'number' ? position.x : 100
    const y = typeof position.y === 'number' ? position.y : 100
    const id = uniqueId('svc')

    await ensureAggregate()

    try {
      const serviceData = {
        name: serviceName || label,
        url: url || '',
        method: method,
        type: type,
      }

      const createdService = await serviceAggregatorClient.createService(serviceData)

      const node = {
        id: id,
        type: 'serviceNode',
        position: { x, y },
        data: {
          id,
          serviceId: createdService.id,
          aggregateId: currentAggregateId.value,
          label: label,
          serviceName: serviceName || label,
          url: url,
          method: method,
          type: type,
          status: true,
          fields: structuredClone(fields),
        },
      }

      nodes.value.push(node)
      nodes.value = [...nodes.value]
      return node
    } catch (error) {
      console.error('Failed to create service:', error)
      notify({
        title: 'خطا',
        text: 'خطا در ایجاد سرویس',
        type: 'error',
      })
      const node = {
        id: id,
        type: 'serviceNode',
        position: { x, y },
        data: {
          id,
          serviceId: null,
          aggregateId: currentAggregateId.value,
          label: label,
          serviceName: serviceName || label,
          url: url,
          method: method,
          type: type,
          status: true,
          fields: structuredClone(fields),
        },
      }
      nodes.value.push(node)
      nodes.value = [...nodes.value]
      return node
    }
  }

  /**
   * Ensure service exists in backend (create if it doesn't)
   * Called when user adds first field to a new service
   */
  async function ensureService(nodeId) {
    const node = nodes.value.find((n) => n.id === nodeId)
    if (!node) return false

    if (node.data.serviceId) {
      return true
    }

    await ensureAggregate()

    try {
      const serviceData = {
        name: node.data.serviceName || node.data.label,
        url: node.data.url || '',
        method: node.data.method || 'GET',
        type: node.data.type || 'REST',
      }

      const createdService = await serviceAggregatorClient.createService(serviceData)

      const nodeIndex = nodes.value.findIndex((n) => n.id === nodeId)
      if (nodeIndex !== -1) {
        nodes.value[nodeIndex].data.serviceId = createdService.id
        nodes.value[nodeIndex].data.aggregateId = currentAggregateId.value
        nodes.value = [...nodes.value]
      }

      notify({
        title: 'موفق',
        text: 'سرویس در سرور ایجاد شد',
        type: 'success',
      })

      return true
    } catch (error) {
      console.error('Failed to create service:', error)
      notify({
        title: 'خطا',
        text: 'خطا در ایجاد سرویس در سرور',
        type: 'error',
      })
      return false
    }
  }

  // function updateNode(nodeId, patch) {
  //   const idx = nodes.value.findIndex((n) => n.id === nodeId)
  //   if (idx === -1) return null
  //   const node = nodes.value[idx]
  //   nodes.value[idx] = {
  //     ...node,
  //     data: {
  //       ...node.data,
  //       ...patch,
  //     },
  //   }
  //   nodes.value = [...nodes.value]
  //   return nodes.value[idx]
  // }
  async function updateNode(nodeId, patch, options = {}) {
    const idx = nodes.value.findIndex((n) => n.id === nodeId)
    if (idx === -1) return null

    const node = nodes.value[idx]

    if (patch.position && (patch.position.x == null || patch.position.y == null)) {
      delete patch.position
    }

    const updatedData = { ...node.data, ...patch.data }

    if (!options.skipServiceSync && nodes.value[idx].data.serviceId && updatedData.serviceName) {
      try {
        await serviceAggregatorClient.updateService({
          id: nodes.value[idx].data.serviceId,
          name: updatedData.serviceName,
          url: updatedData.url || '',
          method: updatedData.method || 'GET',
          type: updatedData.type || 'REST',
          status: updatedData.status !== undefined ? updatedData.status : true,
        })
      } catch (error) {
        console.error('Failed to update service:', error)
        notify({
          title: 'خطا',
          text: 'خطا در بروزرسانی سرویس',
          type: 'error',
        })
      }
    }

    nodes.value[idx] = {
      ...node,
      ...patch,
      data: updatedData,
    }

    nodes.value = [...nodes.value]
    return nodes.value[idx]
  }

  /**
   * Delete a node (service) from both UI and backend
   * Calls the backend API to soft-delete the service
   */
  async function deleteNode(nodeId) {
    const node = nodes.value.find((n) => n.id === nodeId)

    if (node && node.data.serviceId) {
      try {
        await serviceAggregatorClient.deleteService(node.data.serviceId)
        notify({
          title: 'موفق',
          text: 'سرویس با موفقیت حذف شد',
          type: 'success',
        })
      } catch (error) {
        console.error('Failed to delete service:', error)
        notify({
          title: 'خطا',
          text: 'خطا در حذف سرویس',
          type: 'error',
        })
      }
    }

    nodes.value = nodes.value.filter((n) => n.id !== nodeId)
    edges.value = edges.value.filter((e) => e.source !== nodeId && e.target !== nodeId)
    persistentEdges.value = persistentEdges.value.filter((e) => e.source !== nodeId && e.target !== nodeId)
    nodes.value = [...nodes.value]
    edges.value = [...edges.value]

    if (selectedNode.value === nodeId) {
      selectedNode.value = null
      showModal.value = false
    }
  }

  function addEdge(edge) {
    // const targetNode = nodes.value.find(n => n.id === edge.target)
    // if (targetNode && targetNode.type === 'combinedNode') {
    //   // Don't add edge to combined node
    //   return
    // }
    edge.markerEnd = {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: '#FF0072',
    }
    edges.value.push(edge)
    edges.value = [...edges.value]
    // Also add to persistent edges if not already present
    if (!persistentEdges.value.find(e => e.id === edge.id)) {
      persistentEdges.value.push(structuredClone(edge))
    }
  }

  function setSelectedNode(nodeId, mode = 'view') {
    const node = nodes.value.find((n) => n.id === nodeId)
    if (!node) return

    // Ensure all required fields are populated before opening modal
    if (node.data) {
      // For nodes loaded from aggregate flow, fetch service data if missing
      if (node.data.serviceId && !node.data.fields) {
        // Try to load service details
        serviceAggregatorClient.getServices()
          .then((services) => {
            const service = Array.isArray(services)
              ? services.find((s) => s.id === node.data.serviceId)
              : null
            if (service) {
              node.data.fields = service.fields || []
              node.data.url = node.data.url || service.url || ''
              node.data.method = node.data.method || service.method || 'GET'
              node.data.type = node.data.type || service.type || 'REST'
              node.data.serviceName = node.data.serviceName || service.name || ''
              // Trigger reactivity
              nodes.value = [...nodes.value]
            }
          })
          .catch((error) => {
            console.error('Failed to load service details:', error)
          })
      }

      // Ensure all fields have default values
      if (!node.data.label) node.data.label = node.data.stepName || 'Unnamed'
      if (!node.data.serviceName) node.data.serviceName = ''
      if (!node.data.url) node.data.url = ''
      if (!node.data.method) node.data.method = 'GET'
      if (!node.data.type) node.data.type = 'REST'
      if (!node.data.fields) node.data.fields = []
      if (!node.data.status && node.data.status !== false) node.data.status = true
    }

    selectedNode.value = nodeId
    modalMode.value = mode
    showModal.value = !!nodeId
  }

  function clearSelected() {
    selectedNode.value = null
    showModal.value = false
  }

  async function handleConnect(params) {
    debugger
    if (params.sourceHandle !== 'out' || params.targetHandle !== 'in') {
      return
    }
    const { source, target } = params
    if (!source || !target) return

    const nodeA = nodes.value.find((n) => n.id === source)
    const nodeB = nodes.value.find((n) => n.id === target)
    if (!nodeA || !nodeB) return

    if (!nodeA.position) nodeA.position = { x: 0, y: 0 }
    if (!nodeB.position) nodeB.position = { x: 200, y: 200 }

    await ensureAggregate()

    // Initialize step data with fields from nodeB
    const stepData = {
      stepName: nodeB.data.stepName || nodeB.data.serviceName || 'Step',
      aggregateId: currentAggregateId.value,
      serviceId: nodeB.data.serviceId || null,
      nextStepId: null,
      trueStepId: null,
      falseStepId: null,
      condition: '',
      conditionParameters: '',
    }

    // Store the pending connection and step data
    pendingConnection.value = { source, target, nodeA, nodeB }
    connectionStepData.value = stepData

    // Open StepModal with the initial data
    openStepModal(stepData)
  }

  /**
   * Save the connection step after user input from modal
   * This is called after the user confirms the step details in the connection modal
   * Handles two scenarios:
   * 1. Drag-connect: pendingConnection exists, create edge between nodes
   * 2. Button-click: no pendingConnection, just create step
   */
  async function saveConnectionStep(updatedStepData) {
    // Prevent double execution of connection processing
    if (isProcessingConnection.value) return

    try {
      isProcessingConnection.value = true
      let stepResult

      // If there's a pending connection (drag-connect scenario), handle node/edge creation
      if (pendingConnection.value) {
        const { source, target, nodeA, nodeB } = pendingConnection.value

        // Find source and target nodes
        const sourceNodeIdx = nodes.value.findIndex((n) => n.id === source)
        const targetNodeIdx = nodes.value.findIndex((n) => n.id === target)

        const sourceStepId = sourceNodeIdx !== -1 ? nodes.value[sourceNodeIdx].data?.aggregateStepId : null
        const targetStepId = targetNodeIdx !== -1 ? nodes.value[targetNodeIdx].data?.aggregateStepId : null

        // If target node already has a step, update the target step with the new data
        if (targetStepId) {
          stepResult = await serviceAggregatorClient.updateAggregateStep({
            id: targetStepId,
            stepName: updatedStepData.stepName || nodeB.data.stepName || nodeB.data.serviceName || 'Step',
            aggregateId: updatedStepData.aggregateId || currentAggregateId.value,
            serviceId: updatedStepData.serviceId || nodeB.data.serviceId || null,
            nextStepId: updatedStepData.nextStepId || null,
            trueStepId: updatedStepData.trueStepId || null,
            falseStepId: updatedStepData.falseStepId || null,
            condition: updatedStepData.condition || '',
            conditionParameters: updatedStepData.conditionParameters || '',
            status: updatedStepData.status !== undefined ? updatedStepData.status : true,
          })

          // Update the target node with the updated step data
          if (targetNodeIdx !== -1) {
            const targetNodeId = nodes.value[targetNodeIdx].id
            updateNode(targetNodeId, {
              data: {
                stepName: stepResult.stepName,
                serviceId: stepResult.serviceId,
                condition: stepResult.condition || '',
                conditionParameters: stepResult.conditionParameters || '',
              }
            })
          }

          // Create the edge with the existing target step data
          const edgeId = `e_${source}-${target}_${Date.now()}`
          const newEdge = {
            id: edgeId,
            source,
            target,
            animated: true,
            type: 'default',
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: '#FF0072',
            },
            data: {
              aggregateStepId: targetStepId,
              aggregateId: currentAggregateId.value,
              condition: stepResult.condition || '',
              conditionParameters: stepResult.conditionParameters || '',
              mappings: stepResult.mappings || [],
            },
          }

          // Add to both local persistent edges and Vue Flow edges
          addEdge(newEdge)
          persistentEdges.value.push(newEdge)
          const currentSourceStepData = nodeA.data || {}
          // Update source node's step to point to target step (if source has a step and nextStepId actually changed)
          if (sourceStepId) {
            const currentNextStepId = nodeA.data?.nextStepId || null
            if (currentNextStepId !== targetStepId) {
              await serviceAggregatorClient.updateAggregateStep({
                id: sourceStepId,
                stepName: nodeA.data.stepName || nodeA.data.serviceName || 'Step',
                aggregateId: currentAggregateId.value,
                serviceId: nodeA.data.serviceId,
                nextStepId: targetStepId, // Source points to target
                trueStepId: currentSourceStepData.trueStepId,
                falseStepId: currentSourceStepData.falseStepId,
                condition: currentSourceStepData.condition,
                conditionParameters: currentSourceStepData.conditionParameters,
                status: true,
              })
              // Update local node data
              updateNode(source, { data: { nextStepId: targetStepId } })
            }
          }

          // Reload flow to ensure positions and data are up to date
          if (aggregates.value.length === 1) {
            await loadSingleAggregateFlow(currentAggregateId.value)
          } else {
            await loadAggregateFlow(currentAggregateId.value)
          }
        } else {
          // Create new step for new service/node
          stepResult = await serviceAggregatorClient.addAggregateStep(updatedStepData)

          // Update the target node with the created step data
          if (targetNodeIdx !== -1) {
            const targetNodeId = nodes.value[targetNodeIdx].id
            updateNode(targetNodeId, {
              data: {
                aggregateStepId: stepResult.id,
                stepName: stepResult.stepName,
                serviceId: stepResult.serviceId,
                condition: stepResult.condition || '',
                conditionParameters: stepResult.conditionParameters || '',
              }
            })
          }

          // Create the edge with the returned step data
          const edgeId = `e_${source}-${target}_${Date.now()}`
          const newEdge = {
            id: edgeId,
            source,
            target,
            animated: true,
            type: 'default',
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: '#FF0072',
            },
            data: {
              aggregateStepId: stepResult.id,
              aggregateId: currentAggregateId.value,
              condition: stepResult.condition || '',
              conditionParameters: stepResult.conditionParameters || '',
              mappings: stepResult.mappings || [],
            },
          }

          // Add to both local persistent edges and Vue Flow edges
          addEdge(newEdge)
          persistentEdges.value.push(newEdge)
          const currentSourceStepData = nodeA.data || {}
          // Update source node's step to point to the new target step (if source has a step and nextStepId actually changed)
          if (sourceStepId) {
            const currentNextStepId = nodeA.data?.nextStepId || null
            if (currentNextStepId !== stepResult.id) {
              await serviceAggregatorClient.updateAggregateStep({
                id: sourceStepId,
                stepName: nodeA.data.stepName || nodeA.data.serviceName || 'Step',
                aggregateId: currentAggregateId.value,
                serviceId: nodeA.data.serviceId,
                nextStepId: targetStepId, // Source points to new target
                trueStepId: currentSourceStepData.trueStepId,
                falseStepId: currentSourceStepData.falseStepId,
                condition: currentSourceStepData.condition,
                conditionParameters: currentSourceStepData.conditionParameters,
                status: true,
              })
              // Update local node data
              updateNode(source, { data: { nextStepId: stepResult.id } })
            }
          }

          // Backup edges before reload
          const edgesBeforeReload = edges.value.map(e => structuredClone(e))

          // Reload flow to ensure positions and data are up to date
          if (aggregates.value.length === 1) {
            await loadSingleAggregateFlow(currentAggregateId.value)
          } else {
            await loadAggregateFlow(currentAggregateId.value)
          }

          // Restore any edges that were lost during reload
          edgesBeforeReload.forEach(oldEdge => {
            if (!edges.value.find(e => e.id === oldEdge.id)) {
              edges.value.push(structuredClone(oldEdge))
              // Also add to persistentEdges if not already there
              if (!persistentEdges.value.find(e => e.id === oldEdge.id)) {
                persistentEdges.value.push(structuredClone(oldEdge))
              }
            }
          })
        }
      } else {
        // Button-click scenario: no pending connection, create new step
        stepResult = await serviceAggregatorClient.addAggregateStep(updatedStepData)

        // Reload flow to get latest positions and complete data from backend
        if (aggregates.value.length === 1) {
          await loadSingleAggregateFlow(currentAggregateId.value)
        } else {
          await loadAggregateFlow(currentAggregateId.value)
        }
      }

      // Close the modal and reset connection state
      showConnectionModal.value = false
      pendingConnection.value = null
      connectionStepData.value = null
      // Force reactivity
      nodes.value = [...nodes.value]
      edges.value = [...edges.value]

      notify({
        title: 'موفقیت',
        text: 'Step و ترکیب سرویس ایجاد شد',
        type: 'success',
      })
    } catch (error) {
      console.error('Failed to save connection step:', error)
      showConnectionModal.value = false
      pendingConnection.value = null
      connectionStepData.value = null
      notify({
        title: 'خطا',
        text: 'خطا در ایجاد step',
        type: 'error',
      })
    } finally {
      isProcessingConnection.value = false
    }
  }

  function closeConnectionModal() {
    showConnectionModal.value = false
    pendingConnection.value = null
    connectionStepData.value = null
  }

  /**
   * Open step modal from connection or button click
   * Called when user connects two nodes or clicks Add Step button
   */
  function openStepModal(initialData = null) {
    stepModalInitialData.value = initialData
    stepModalOpen.value = true
  }

  function closeStepModal() {
    stepModalOpen.value = false
    stepModalInitialData.value = null
    closeConnectionModal()
  }
  /**
   * Finds all nodes in the connected component that includes both startNodeId and endNodeId
   * Uses BFS to traverse the graph and find all connected nodes
   */
  const visited = ref(new Set())
  const adjacency = ref(new Map())
  function findConnectedComponent(startNodeId, endNodeId) {
    const queue = [startNodeId, endNodeId]
    const componentNodeIds = new Set([startNodeId, endNodeId])

    // Build adjacency list from edges
    edges.value.forEach((edge) => {
      if (!adjacency.value.has(edge.source)) {
        adjacency.value.set(edge.source, [])
      }
      if (!adjacency.value.has(edge.target)) {
        adjacency.value.set(edge.target, [])
      }
      adjacency.value.get(edge.source).push(edge.target)
      adjacency.value.get(edge.target).push(edge.source)
    })

    // BFS to find all connected nodes
    while (queue.length > 0) {
      const currentNodeId = queue.shift()
      if (visited.value.has(currentNodeId)) continue
      visited.value.add(currentNodeId)

      const neighbors = adjacency.value.get(currentNodeId) || []
      neighbors.forEach((neighborId) => {
        if (!visited.value.has(neighborId) && !componentNodeIds.has(neighborId)) {
          componentNodeIds.add(neighborId)
          queue.push(neighborId)
        }
      })
    }

    // Get all node objects from the component
    return nodes.value.filter((n) => componentNodeIds.has(n.id))
  }

  /**
   * Extracts all individual nodes from a group, handling both regular nodes and combined nodes
   * Combined nodes contain multiple services, so we need to reconstruct the original nodes
   */
  function extractAllIndividualNodes(nodeGroup) {
    const individualNodes = []

    nodeGroup.forEach((node) => {
      if (node.type === 'combinedServiceNode') {
        // For combined nodes, we need to reconstruct individual nodes from the combinedSchema
        // The combinedSchema.services contains arrays of fields, one per original node
        const servicesFields = node.data.combinedSchema?.services || []
        const combinedLabel = node.data.label || ''

        // Split label by ' + ' to get individual service labels
        // Handle edge cases where label might not be in expected format
        let labelParts = combinedLabel
          .split(' + ')
          .map((l) => l.trim())
          .filter((l) => l)

        // If label splitting doesn't match services count, generate labels
        if (labelParts.length !== servicesFields.length) {
          labelParts = servicesFields.map((_, idx) => labelParts[idx] || `Service ${idx + 1}`)
        }

        servicesFields.forEach((fields, index) => {
          // Create a virtual node representation for merging
          const label = labelParts[index] || `Service ${index + 1}`
          individualNodes.push({
            id: `${node.id}_service_${index}`,
            label: label,
            fields: Array.isArray(fields) ? fields : [],
            serviceName: label,
          })
        })
      } else {
        // Regular node - add as is
        individualNodes.push({
          id: node.id,
          label: node.data.label || 'Unnamed',
          fields: Array.isArray(node.data.fields) ? node.data.fields : [],
          serviceName: node.data.serviceName || node.data.label || 'Unnamed',
        })
      }
    })

    return individualNodes
  }

  /**
   * Merges all nodes in a group into one combined node
   * Follows the exact pattern: merge data, merge fields, merge labels
   */
  function mergeNodeGroup(nodeGroup) {
    if (nodeGroup.length === 0) {
      throw new Error('Cannot merge empty node group')
    }

    // Extract all individual nodes (handles both regular and combined nodes)
    const individualNodes = extractAllIndividualNodes(nodeGroup)

    // Collect all fields from all individual nodes
    const allFieldsArrays = individualNodes.map((node) => node.fields || [])

    // Merge all fields using mergeNFields
    const mergedResult = mergeNFields(...allFieldsArrays)

    // Build combined label: node1 + node2 + node3 + ...
    const combinedLabel = individualNodes.map((node) => node.label).join(' + ')
    mergedResult['label'] = combinedLabel
    // Create the combined node
    const id = uniqueId('combined')
    return {
      id,
      data: {
        id,
        label: combinedLabel,
        combinedSchema: mergedResult,
        editable: true,
      },
    }
  }

  /**
   * Calculates the average position of all nodes in a group
   */
  function calculateAveragePosition(nodeGroup) {
    if (nodeGroup.length === 0) {
      return { x: 100, y: 100 }
    }

    const sumX = nodeGroup.reduce((sum, node) => sum + (node.position?.x || 0), 0)
    const sumY = nodeGroup.reduce((sum, node) => sum + (node.position?.y || 0), 0)
    const count = nodeGroup.length

    return {
      x: Math.round(sumX / count),
      y: Math.round(sumY / count),
    }
  }

  function exportFlow() {
    return {
      nodes: nodes.value,
      edges: edges.value,
      persistentEdges: persistentEdges.value,
    }
  }

  function importFlow(flow) {
    nodes.value = (flow.nodes || []).map((node) => {
      return {
        ...node,
        position: node.position || { x: 100, y: 100 }, // default position if missing
      }
    })
    edges.value = flow.edges || []
    persistentEdges.value = flow.persistentEdges || flow.edges || []
    nodes.value = [...nodes.value]
    edges.value = [...edges.value]
  }

  function getNodes() {
    return nodes.value.map((node) => {
      return {
        ...node,
        data: {
          ...node.data,
          fields: node.data.fields || [],
        },
      }
    })
  }

  function enableAutoSave() {
    autoSave.value = true
  }

  function disableAutoSave() {
    autoSave.value = false
  }

  function autoSaveEnabled() {
    return autoSave.value
  }
  function debounce(fn, delay = 300) {
    let timer = null
    return (...args) => {
      clearTimeout(timer)
      timer = setTimeout(() => fn(...args), delay)
    }
  }

  const saveFlow = debounce((nodes, edges) => {
    try {
      const flow = {
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges)),
      }
      localStorage.setItem('AutoSave', autoSave.value)
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(flow))
      console.log('Flow auto-saved')
    } catch (e) {
      console.error('Auto-save failed', e)
    }
  }, 1000)

  async function updateEdge(edgeId, updates) {
    const edge = edges.value.find((e) => e.id === edgeId)
    if (!edge || !edge.data?.aggregateStepId) return

    try {
      const sourceNode = nodes.value.find((n) => n.id === edge.source)
      const targetNode = nodes.value.find((n) => n.id === edge.target)

      if (!sourceNode || !targetNode) return

      const sourceStepId = edges.value
        .filter((e) => e.target === edge.source)
        .map((e) => e.data?.aggregateStepId)
        .find((id) => id)

      const nextStepId = edges.value
        .filter((e) => e.source === edge.target)
        .map((e) => e.data?.aggregateStepId)
        .find((id) => id)

      await serviceAggregatorClient.updateAggregateStep({
        id: edge.data.aggregateStepId,
        stepName: targetNode.data.stepName || targetNode.data.serviceName || 'Step',
        aggregateId: edge.data.aggregateId || currentAggregateId.value,
        serviceId: targetNode.data.serviceId,
        nextStepId: nextStepId || null,
        trueStepId: updates.trueStepId !== undefined ? updates.trueStepId : null,
        falseStepId: updates.falseStepId !== undefined ? updates.falseStepId : null,
        condition: updates.condition !== undefined ? updates.condition : edge.data.condition || '',
        conditionParameters:
          updates.conditionParameters !== undefined
            ? updates.conditionParameters
            : edge.data.conditionParameters || '',
        status: updates.status !== undefined ? updates.status : true,
      })

      edge.data = {
        ...edge.data,
        ...updates,
      }
      edges.value = [...edges.value]
    } catch (error) {
      console.error('Failed to update aggregate step:', error)
      notify({
        title: 'خطا',
        text: 'خطا در بروزرسانی step',
        type: 'error',
      })
    }
  }

  async function deleteEdge(edgeId) {
    const edge = edges.value.find((e) => e.id === edgeId)
    if (!edge || !edge.data?.aggregateStepId) {
      edges.value = edges.value.filter((e) => e.id !== edgeId)
      persistentEdges.value = persistentEdges.value.filter((e) => e.id !== edgeId)
      edges.value = [...edges.value]
      return
    }

    try {
      await serviceAggregatorClient.updateAggregateStep({
        id: edge.data.aggregateStepId,
        aggregateId: edge.data.aggregateId || currentAggregateId.value,
        serviceId: nodes.value.find((n) => n.id === edge.target)?.data?.serviceId,
        nextStepId: null,
        trueStepId: null,
        falseStepId: null,
        condition: edge.data.condition || '',
        conditionParameters: edge.data.conditionParameters || '',
        status: false,
      })

      edges.value = edges.value.filter((e) => e.id !== edgeId)
      persistentEdges.value = persistentEdges.value.filter((e) => e.id !== edgeId)
      edges.value = [...edges.value]
    } catch (error) {
      console.error('Failed to delete aggregate step:', error)
      edges.value = edges.value.filter((e) => e.id !== edgeId)
      persistentEdges.value = persistentEdges.value.filter((e) => e.id !== edgeId)
      edges.value = [...edges.value]
    }
  }

  async function addMapping(edgeId, mappingData) {
    const edge = edges.value.find((e) => e.id === edgeId)
    if (!edge || !edge.data?.aggregateStepId) return

    try {
      const sourceNode = nodes.value.find((n) => n.id === edge.source)
      const targetNode = nodes.value.find((n) => n.id === edge.target)

      if (!sourceNode || !targetNode) return

      const sourceStepId = edges.value
        .filter((e) => e.target === edge.source)
        .map((e) => e.data?.aggregateStepId)
        .find((id) => id)

      const mapping = await serviceAggregatorClient.addAggregateStepMapping({
        aggregateStepId: edge.data.aggregateStepId,
        inputStepId: sourceStepId || null,
        source: mappingData.source || 'response',
        targetField: mappingData.targetField || '',
        sourceField: mappingData.sourceField || null,
        value: mappingData.value || null,
        valueType: mappingData.valueType || 'string',
        status: mappingData.status !== undefined ? mappingData.status : true,
      })

      if (!edge.data.mappings) {
        edge.data.mappings = []
      }
      edge.data.mappings.push(mapping)
      edges.value = [...edges.value]
      return mapping
    } catch (error) {
      console.error('Failed to add mapping:', error)
      notify({
        title: 'خطا',
        text: 'خطا در ایجاد mapping',
        type: 'error',
      })
    }
  }

  async function updateMapping(edgeId, mappingId, mappingData) {
    const edge = edges.value.find((e) => e.id === edgeId)
    if (!edge || !edge.data?.aggregateStepId) return

    try {
      const sourceNode = nodes.value.find((n) => n.id === edge.source)
      const targetNode = nodes.value.find((n) => n.id === edge.target)

      if (!sourceNode || !targetNode) return

      const sourceStepId = edges.value
        .filter((e) => e.target === edge.source)
        .map((e) => e.data?.aggregateStepId)
        .find((id) => id)

      await serviceAggregatorClient.updateAggregateStepMapping({
        id: mappingId,
        aggregateStepId: edge.data.aggregateStepId,
        inputStepId: sourceStepId || null,
        source: mappingData.source || 'response',
        targetField: mappingData.targetField || '',
        sourceField: mappingData.sourceField || null,
        value: mappingData.value || null,
        valueType: mappingData.valueType || 'string',
        status: mappingData.status !== undefined ? mappingData.status : true,
      })

      if (edge.data.mappings) {
        const mappingIndex = edge.data.mappings.findIndex((m) => m.id === mappingId)
        if (mappingIndex !== -1) {
          edge.data.mappings[mappingIndex] = { ...edge.data.mappings[mappingIndex], ...mappingData }
        }
      }
      edges.value = [...edges.value]
    } catch (error) {
      console.error('Failed to update mapping:', error)
      notify({
        title: 'خطا',
        text: 'خطا در بروزرسانی mapping',
        type: 'error',
      })
    }
  }

  /**
   * Add a mapping to an aggregate step (not edge-based)
   * @param {string} aggregateStepId - The aggregate step ID
   * @param {Object} mappingData - Mapping data
   * @returns {Promise<Object>} Created mapping
   */
  async function addStepMapping(aggregateStepId, mappingData) {
    if (!aggregateStepId) {
      notify({
        title: 'خطا',
        text: 'aggregateStepId مورد نیاز است',
        type: 'error',
      })
      return null
    }

    try {
      // Find the node with this aggregateStepId
      const node = nodes.value.find((n) => n.data?.aggregateStepId === aggregateStepId)

      // Find input step ID from incoming edges
      let inputStepId = null
      if (node) {
        inputStepId = edges.value
          .filter((e) => e.target === node.id)
          .map((e) => e.data?.aggregateStepId)
          .find((id) => id) || null
      }

      const mapping = await serviceAggregatorClient.addAggregateStepMapping({
        aggregateStepId: aggregateStepId,
        inputStepId: inputStepId,
        source: mappingData.source || 'response',
        targetField: mappingData.targetField || '',
        sourceField: mappingData.sourceField || null,
        value: mappingData.value || null,
        valueType: mappingData.valueType || 'string',
        status: mappingData.status !== undefined ? mappingData.status : true,
      })

      // Update node data with the new mapping
      if (node) {
        if (!node.data.mappings) {
          node.data.mappings = []
        }
        node.data.mappings.push(mapping)
        nodes.value = [...nodes.value]
      }

      notify({
        title: 'موفقیت',
        text: 'Mapping ایجاد شد',
        type: 'success',
      })

      return mapping
    } catch (error) {
      console.error('Failed to add step mapping:', error)
      notify({
        title: 'خطا',
        text: 'خطا در ایجاد mapping',
        type: 'error',
      })
      return null
    }
  }

  /**
   * Update a mapping for an aggregate step
   * @param {string} aggregateStepId - The aggregate step ID
   * @param {string} mappingId - The mapping ID
   * @param {Object} mappingData - Updated mapping data
   * @returns {Promise<Object>} Updated mapping
   */
  async function updateStepMapping(aggregateStepId, mappingId, mappingData) {
    if (!aggregateStepId || !mappingId) {
      notify({
        title: 'خطا',
        text: 'aggregateStepId و mappingId مورد نیاز است',
        type: 'error',
      })
      return null
    }

    try {
      const node = nodes.value.find((n) => n.data?.aggregateStepId === aggregateStepId)

      let inputStepId = null
      if (node) {
        inputStepId = edges.value
          .filter((e) => e.target === node.id)
          .map((e) => e.data?.aggregateStepId)
          .find((id) => id) || null
      }

      const updatedMapping = await serviceAggregatorClient.updateAggregateStepMapping({
        id: mappingId,
        aggregateStepId: aggregateStepId,
        inputStepId: inputStepId,
        source: mappingData.source || 'response',
        targetField: mappingData.targetField || '',
        sourceField: mappingData.sourceField || null,
        value: mappingData.value || null,
        valueType: mappingData.valueType || 'string',
        status: mappingData.status !== undefined ? mappingData.status : true,
      })

      // Update node data
      if (node && node.data.mappings) {
        const mappingIndex = node.data.mappings.findIndex((m) => m.id === mappingId)
        if (mappingIndex !== -1) {
          node.data.mappings[mappingIndex] = updatedMapping
          nodes.value = [...nodes.value]
        }
      }

      notify({
        title: 'موفقیت',
        text: 'Mapping بروزرسانی شد',
        type: 'success',
      })

      return updatedMapping
    } catch (error) {
      console.error('Failed to update step mapping:', error)
      notify({
        title: 'خطا',
        text: 'خطا در بروزرسانی mapping',
        type: 'error',
      })
      return null
    }
  }

  /**
   * Delete a mapping from an aggregate step
   * @param {string} aggregateStepId - The aggregate step ID
   * @param {string} mappingId - The mapping ID
   * @returns {Promise<boolean>} Success status
   */
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
      // Update mapping status to false (soft delete)
      const node = nodes.value.find((n) => n.data?.aggregateStepId === aggregateStepId)

      let inputStepId = null
      if (node) {
        inputStepId = edges.value
          .filter((e) => e.target === node.id)
          .map((e) => e.data?.aggregateStepId)
          .find((id) => id) || null
      }

      await serviceAggregatorClient.deleteAggregateStepMapping(mappingId)

      // Remove from node data
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

  return {
    enableAutoSave,
    disableAutoSave,
    autoSaveEnabled,
    nodes,
    edges,
    persistentEdges,
    rebuildEdgesFromPersistent,
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
    saveConnectionStep,
    closeConnectionModal,
    openStepModal,
    closeStepModal,
    setSelectedNode,
    clearSelected,
    exportFlow,
    importFlow,
    getAggregateByid
  }

})
