// src/store/flowStore.js
import { defineStore } from 'pinia'
import { reactive, ref, watch } from 'vue'
import { mergeNFields } from '../utils/schemaUtils'
import { uniqueId } from '@/utils/modalUtils'
import { MarkerType } from '@vue-flow/core'
import serviceAggregatorClient from '@/utils/service-aggregator-client'
import { notify } from '@kyvg/vue3-notification'
import { createHttpClient } from '@/utils/httpClient'

const httpClient = createHttpClient()

const LOCAL_STORAGE_KEY = 'flowservice-flow'

export const useFlowStore = defineStore('flow', () => {
  const nodes = ref([])
  const edges = ref([])
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

  async function loadAggregates() {
    if (isLoading.value) return
    isLoading.value = true
    try {
      const allAggregates = await serviceAggregatorClient.getAggregates()
      if (allAggregates && allAggregates.length > 0) {
        aggregates.value = allAggregates

        // Get all aggregate IDs
        const aggregateIds = allAggregates.map(a => a.id)

        // Load all flows at once
        await loadAggregateFlow(aggregateIds)

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
      const allAggregatesData = await serviceAggregatorClient.getAggregates()

      // Handle both single ID and array of IDs
      const idsToLoad = Array.isArray(aggregateIdOrIds) ? aggregateIdOrIds : [aggregateIdOrIds]

      // Filter aggregates to load
      const aggregatesToLoad = Array.isArray(allAggregatesData)
        ? allAggregatesData.filter(a => idsToLoad.includes(a.id))
        : idsToLoad.includes(allAggregatesData.id) ? [allAggregatesData] : []

      if (aggregatesToLoad.length === 0) {
        console.warn(`No aggregates found for IDs: ${idsToLoad}`)
        return
      }

      // If loading multiple aggregates, set currentAggregateId to first one if not set
      if (aggregatesToLoad.length > 1 && !currentAggregateId.value) {
        currentAggregateId.value = aggregatesToLoad[0].id
      } else if (aggregatesToLoad.length === 1) {
        currentAggregateId.value = aggregatesToLoad[0].id
      }

      const flowNodes = []
      const flowEdges = []

      // Process each aggregate
      for (const aggregate of aggregatesToLoad) {
        const stepIdToNodeIdMap = new Map()
        const steps = aggregate.steps || []

        let xPos = 100
        let yPos = 100 + (aggregatesToLoad.indexOf(aggregate) * 300) // Offset each aggregate vertically
        const stepPositions = new Map()

        for (const step of steps) {
          if (!stepPositions.has(step.id)) {
            stepPositions.set(step.id, { x: xPos, y: yPos })
            xPos += 300
            if (xPos > 1500) {
              xPos = 100
              yPos += 200
            }
          }

          const nodeId = `node-${step.id}`
          stepIdToNodeIdMap.set(step.id, nodeId)

          const hasCondition =
            step.condition !== null &&
            step.condition !== undefined &&
            `${step.condition}`.trim() !== ''

          const service = step.service
          const isDecision = hasCondition

          // Check if this is an end node (no next steps, no condition, no service)
          const isEndNode =
            !step.nextStepId &&
            !step.trueStepId &&
            !step.falseStepId &&
            !hasCondition &&
            !step.serviceId

          let nodeType = 'serviceNode'
          if (isEndNode) {
            nodeType = 'endNode'
          } else if (isDecision) {
            nodeType = 'decisionNode'
          }

          flowNodes.push({
            id: nodeId,
            type: nodeType,
            position: stepPositions.get(step.id),
            data: {
              id: nodeId,
              aggregateStepId: step.id,
              aggregateId: aggregate.id,
              stepName: step.stepName || '',
              condition: step.condition || '',
              conditionParameters: step.conditionParameters || '',
              serviceId: service?.id || null,
              serviceName: service?.name || '',
              url: service?.url || '',
              method: service?.method || 'GET',
              type: service?.type || (isDecision ? 'DECISION' : 'REST'),
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
                animated: true,
                type: 'default',
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  width: 20,
                  height: 20,
                  color: '#FF0072',
                },
                label: '',
                style: {},
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
      }

      nodes.value = flowNodes
      edges.value = flowEdges
      nodes.value = [...nodes.value]
      edges.value = [...edges.value]
    } catch (error) {
      console.error('Failed to load aggregate flow:', error)
      notify({
        title: 'خطا',
        text: 'خطا در بارگذاری flow',
        type: 'error',
      })
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
        ? aggregates.find(a => a.id === aggregateId)
        : null

      if (existingAggregate) {
        const updated = await serviceAggregatorClient.updateAggregate({
          id: aggregateId,
          name: aggregateData.name || existingAggregate.name,
          description: aggregateData.description || existingAggregate.description,
          status: aggregateData.status !== undefined ? aggregateData.status : (existingAggregate.status !== undefined ? existingAggregate.status : true),
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
    try {
      const aggregates = await serviceAggregatorClient.getAggregates()
      const targetId = aggregateId || currentAggregateId.value

      if (targetId) {
        const existingAggregate = Array.isArray(aggregates)
          ? aggregates.find(a => a.id === targetId)
          : null

        if (existingAggregate) {
          if (aggregateData) {
            await serviceAggregatorClient.updateAggregate({
              id: targetId,
              name: aggregateData.name || existingAggregate.name,
              description: aggregateData.description || existingAggregate.description,
              status: aggregateData.status !== undefined ? aggregateData.status : (existingAggregate.status !== undefined ? existingAggregate.status : true),
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
    const { position = {}, label = 'New Service', serviceName = '', fields = [], url = '', method = 'GET', type = 'REST' } = options

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
    const node = nodes.value.find(n => n.id === nodeId)
    if (!node) return null
    await ensureAggregate()
    try {
      const createdService = await serviceAggregatorClient.createService({
        name: serviceData.serviceName || serviceData.name,
        url: serviceData.url || '',
        method: serviceData.method || 'GET',
        type: serviceData.type || 'REST',
      })
      const idx = nodes.value.findIndex(n => n.id === nodeId)
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
    const { position = {}, label = 'New Service', serviceName = '', fields = [], url = '', method = 'GET', type = 'REST' } = options

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
    const node = nodes.value.find(n => n.id === nodeId)
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

      const nodeIndex = nodes.value.findIndex(n => n.id === nodeId)
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
  }

  function setSelectedNode(nodeId, mode = 'view') {
    selectedNode.value = nodeId
    modalMode.value = mode
    showModal.value = !!nodeId
  }

  function clearSelected() {
    selectedNode.value = null
    showModal.value = false
  }

  // function handleConnect(params) {
  //   if (params.sourceHandle !== 'out' || params.targetHandle !== 'in') {
  //     return
  //   }
  //   console.log('Connecting nodes:', params)
  //   const { source, target } = params
  //   if (!source || !target) return

  //   const nodeA = nodes.value.find((n) => n.id === source)
  //   const nodeB = nodes.value.find((n) => n.id === target)
  //   if (!nodeA || !nodeB) return

  //   if (!nodeA.position) nodeA.position = { x: 0, y: 0 }
  //   if (!nodeB.position) nodeB.position = { x: 200, y: 200 }

  //   // Add the new edge first
  //   addEdge({
  //     id: `e_${source}-${target}_${Date.now()}`,
  //     source,
  //     target,
  //     animated: true,
  //     type: 'default',
  //   })

  //   // Find all nodes in the connected component that includes both source and target
  //   const connectedGroup = findConnectedComponent(source, target)
  //   console.log(
  //     'Connected group:',
  //     connectedGroup.map((n) => n.id),
  //   )

  //   if (connectedGroup.length < 2) {
  //     console.warn('Connected group has less than 2 nodes, skipping merge')
  //     return
  //   }

  //   // Identify all combined nodes already present for this group
  //   const groupIds = connectedGroup.map(n => n.id)
  //   // Find combined nodes whose underlying set overlaps this group
  //   const redundantCombinedNodes = nodes.value.filter(node => {
  //     if (node.type !== 'combinedServiceNode') return false;
  //     // Try to recover the combined set from label
  //     const parts = node.data?.label?.split(' + ')
  //     if (!parts || parts.length < 2) return false;
  //     return parts.every(name => groupIds.some(cid => {
  //       const cn = nodes.value.find(n => n.id === cid)
  //       return cn && cn.label === name
  //     }))
  //   })

  //   // Remove previous combined nodes for this group
  //   redundantCombinedNodes.forEach(rcn => {
  //     // Remove node
  //     const idx = nodes.value.findIndex(n => n.id === rcn.id)
  //     if (idx !== -1) nodes.value.splice(idx, 1)
  //     // Remove any edges whose source or target is this combined node
  //     edges.value = edges.value.filter(e => e.source !== rcn.id && e.target !== rcn.id)
  //   })

  //   // Merge all nodes in the connected group into one combined node
  //   const combinedNode = mergeNodeGroup(connectedGroup)

  //   // Get all node IDs in the group
  //   const nodeIdsToMerge = new Set(connectedGroup.map((n) => n.id))
  //   // Find outgoing edges (from merged nodes to outside)
  //   const outgoingEdges = edges.value.filter(
  //     (e) => nodeIdsToMerge.has(e.source) && !nodeIdsToMerge.has(e.target),
  //   )
  //   // Find incoming edges (from outside to merged nodes)
  //   const incomingEdges = edges.value.filter(
  //     (e) => !nodeIdsToMerge.has(e.source) && nodeIdsToMerge.has(e.target),
  //   )

  //   // Calculate a position for the new combined node that doesn't overlap
  //   let avgPosition = calculateAveragePosition(connectedGroup)
  //   // Check for position overlap with existing nodes
  //   const GRID_OFFSET = 60
  //   let pos = { ...avgPosition }
  //   let isOverlapping;
  //   do {
  //     isOverlapping = nodes.value.some(
  //       n => Math.abs(n.position.x - pos.x) < GRID_OFFSET && Math.abs(n.position.y - pos.y) < GRID_OFFSET
  //     );
  //     if (isOverlapping) {
  //       pos.x += GRID_OFFSET
  //       pos.y += GRID_OFFSET
  //     }
  //   } while(isOverlapping)

  //   // Add the new combined node
  //   nodes.value.push({
  //     id: combinedNode.id,
  //     type: 'combinedServiceNode',
  //     position: pos,
  //     data: combinedNode.data,
  //   })

  //   // Replicate outgoing edges for combined node
  //   outgoingEdges.forEach((edge) => {
  //     addEdge({
  //       id: `e_${combinedNode.id}-${edge.target}_${Date.now()}`,
  //       source: combinedNode.id,
  //       target: edge.target,
  //       animated: edge.animated || true,
  //       type: edge.type || 'default',
  //     })
  //   })
  //   // Replicate incoming edges for combined node
  //   incomingEdges.forEach((edge) => {
  //     addEdge({
  //       id: `e_${edge.source}-${combinedNode.id}_${Date.now()}`,
  //       source: edge.source,
  //       target: combinedNode.id,
  //       animated: edge.animated || true,
  //       type: edge.type || 'default',
  //     })
  //   })
  //   // (Optional) force reactivity
  //   nodes.value = [...nodes.value]
  //   edges.value = [...edges.value]
  //   return combinedNode
  // }
  async function handleConnect(params) {
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
    showConnectionModal.value = true
  }

  /**
   * Save the connection step after user input from modal
   * This is called after the user confirms the step details in the connection modal
   */
  async function saveConnectionStep(updatedStepData) {
    if (!pendingConnection.value || !connectionStepData.value) {
      console.error('No pending connection')
      return
    }

    try {
      const { source, target, nodeA, nodeB } = pendingConnection.value

      // Call backend API to create the aggregate step
      const createdStep = await serviceAggregatorClient.addAggregateStep(updatedStepData)

      // Update the target node with the created step data
      const targetNodeIdx = nodes.value.findIndex(n => n.id === target)
      if (targetNodeIdx !== -1) {
        nodes.value[targetNodeIdx] = {
          ...nodes.value[targetNodeIdx],
          data: {
            ...nodes.value[targetNodeIdx].data,
            stepId: createdStep.id,
            stepName: createdStep.stepName,
            serviceId: createdStep.serviceId,
            condition: createdStep.condition || '',
            conditionParameters: createdStep.conditionParameters || '',
          },
        }
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
          aggregateStepId: createdStep.id,
          aggregateId: currentAggregateId.value,
          condition: createdStep.condition || '',
          conditionParameters: createdStep.conditionParameters || '',
          mappings: createdStep.mappings || [],
        },
      }

      addEdge(newEdge)

      // Close the modal and reset connection state
      showConnectionModal.value = false
      pendingConnection.value = null
      connectionStepData.value = null

      // Create combined node for the two services
      const connectedGroup = [nodeA, nodeB]
      const combinedNode = mergeNodeGroup(connectedGroup)

      // Get all node IDs in the group
      const nodeIdsToMerge = new Set(connectedGroup.map((n) => n.id))
      // Find outgoing edges (from merged nodes to outside)
      const outgoingEdges = edges.value.filter(
        (e) => nodeIdsToMerge.has(e.source) && !nodeIdsToMerge.has(e.target),
      )
      // Find incoming edges (from outside to merged nodes)
      const incomingEdges = edges.value.filter(
        (e) => !nodeIdsToMerge.has(e.source) && nodeIdsToMerge.has(e.target),
      )

      // Calculate a position for the new combined node that doesn't overlap
      let avgPosition = calculateAveragePosition(connectedGroup)
      // Check for position overlap with existing nodes
      const GRID_OFFSET = 60
      let pos = { ...avgPosition }
      let isOverlapping;
      do {
        isOverlapping = nodes.value.some(
          n => Math.abs(n.position.x - pos.x) < GRID_OFFSET && Math.abs(n.position.y - pos.y) < GRID_OFFSET
        );
        if (isOverlapping) {
          pos.x += GRID_OFFSET
          pos.y += GRID_OFFSET
        }
      } while(isOverlapping)

      // Add the new combined node
      nodes.value.push({
        id: combinedNode.id,
        type: 'combinedServiceNode',
        position: pos,
        data: combinedNode.data,
      })

      // Replicate outgoing edges for combined node
      outgoingEdges.forEach((edge) => {
        addEdge({
          id: `e_${combinedNode.id}-${edge.target}_${Date.now()}`,
          source: combinedNode.id,
          target: edge.target,
          animated: edge.animated || true,
          type: edge.type || 'default',
        })
      })
      // Replicate incoming edges for combined node
      incomingEdges.forEach((edge) => {
        addEdge({
          id: `e_${edge.source}-${combinedNode.id}_${Date.now()}`,
          source: edge.source,
          target: combinedNode.id,
          animated: edge.animated || true,
          type: edge.type || 'default',
        })
      })
      // Force reactivity
      nodes.value = [...nodes.value]
      edges.value = [...edges.value]

      notify({
        title: 'موفقیت',
        text: 'Step و ترکیب سرویس ایجاد شد',
        type: 'success',
      })

      return combinedNode
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
    }
  }

  function closeConnectionModal() {
    showConnectionModal.value = false
    pendingConnection.value = null
    connectionStepData.value = null
  }
  /**
   * Finds all nodes in the connected component that includes both startNodeId and endNodeId
   * Uses BFS to traverse the graph and find all connected nodes
  */
  const visited =  ref(new Set())
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
    const edge = edges.value.find(e => e.id === edgeId)
    if (!edge || !edge.data?.aggregateStepId) return

    try {
      const sourceNode = nodes.value.find(n => n.id === edge.source)
      const targetNode = nodes.value.find(n => n.id === edge.target)

      if (!sourceNode || !targetNode) return

      const sourceStepId = edges.value
        .filter(e => e.target === edge.source)
        .map(e => e.data?.aggregateStepId)
        .find(id => id)

      const nextStepId = edges.value
        .filter(e => e.source === edge.target)
        .map(e => e.data?.aggregateStepId)
        .find(id => id)

      await serviceAggregatorClient.updateAggregateStep({
        id: edge.data.aggregateStepId,
        stepName: targetNode.data.stepName || targetNode.data.serviceName || 'Step',
        aggregateId: edge.data.aggregateId || currentAggregateId.value,
        serviceId: targetNode.data.serviceId,
        nextStepId: nextStepId || null,
        trueStepId: updates.trueStepId !== undefined ? updates.trueStepId : null,
        falseStepId: updates.falseStepId !== undefined ? updates.falseStepId : null,
        condition: updates.condition !== undefined ? updates.condition : (edge.data.condition || ''),
        conditionParameters: updates.conditionParameters !== undefined ? updates.conditionParameters : (edge.data.conditionParameters || ''),
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
    const edge = edges.value.find(e => e.id === edgeId)
    if (!edge || !edge.data?.aggregateStepId) {
      edges.value = edges.value.filter(e => e.id !== edgeId)
      edges.value = [...edges.value]
      return
    }

    try {
      await serviceAggregatorClient.updateAggregateStep({
        id: edge.data.aggregateStepId,
        aggregateId: edge.data.aggregateId || currentAggregateId.value,
        serviceId: nodes.value.find(n => n.id === edge.target)?.data?.serviceId,
        nextStepId: null,
        trueStepId: null,
        falseStepId: null,
        condition: edge.data.condition || '',
        conditionParameters: edge.data.conditionParameters || '',
        status: false,
      })

      edges.value = edges.value.filter(e => e.id !== edgeId)
      edges.value = [...edges.value]
    } catch (error) {
      console.error('Failed to delete aggregate step:', error)
      edges.value = edges.value.filter(e => e.id !== edgeId)
      edges.value = [...edges.value]
    }
  }

  async function addMapping(edgeId, mappingData) {
    const edge = edges.value.find(e => e.id === edgeId)
    if (!edge || !edge.data?.aggregateStepId) return

    try {
      const sourceNode = nodes.value.find(n => n.id === edge.source)
      const targetNode = nodes.value.find(n => n.id === edge.target)

      if (!sourceNode || !targetNode) return

      const sourceStepId = edges.value
        .filter(e => e.target === edge.source)
        .map(e => e.data?.aggregateStepId)
        .find(id => id)

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
    const edge = edges.value.find(e => e.id === edgeId)
    if (!edge || !edge.data?.aggregateStepId) return

    try {
      const sourceNode = nodes.value.find(n => n.id === edge.source)
      const targetNode = nodes.value.find(n => n.id === edge.target)

      if (!sourceNode || !targetNode) return

      const sourceStepId = edges.value
        .filter(e => e.target === edge.source)
        .map(e => e.data?.aggregateStepId)
        .find(id => id)

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
        const mappingIndex = edge.data.mappings.findIndex(m => m.id === mappingId)
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

  return {
    enableAutoSave,
    disableAutoSave,
    autoSaveEnabled,
    nodes,
    edges,
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
    loadAggregates,
    loadAggregateFlow,
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
    getNodes,
    handleConnect,
    saveConnectionStep,
    closeConnectionModal,
    setSelectedNode,
    clearSelected,
    exportFlow,
    importFlow,
  }

})
