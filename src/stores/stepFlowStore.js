// import { defineStore } from 'pinia'
// import { ref, reactive, computed, watch } from 'vue'
// import { MarkerType } from '@vue-flow/core'
// import serviceAggregatorClient from '@/utils/service-aggregator-client'
// import { notify } from '@kyvg/vue3-notification'

// const LOCAL_STORAGE_KEY = 'flowservice-step-flow'

// export const useStepFlowStore = defineStore('stepFlow', () => {
//   // State
//   const nodes = ref([])
//   const edges = ref([])
//   const selectedNode = ref(null)
//   const showStepModal = ref(false)
//   const modalMode = ref('add') // 'add' or 'edit'
//   const currentAggregateId = ref(null)
//   const isLoading = ref(false)
//   const autoSave = ref(false)

//   // Computed
//   const selectedStep = computed(() => {
//     if (!selectedNode.value) return null
//     const node = nodes.value.find(n => n.id === selectedNode.value)
//     return node ? node.data : null
//   })

//   // Watchers
//   watch(autoSave, (newVal) => {
//     localStorage.setItem('AutoSave', newVal)
//   })

//   // Load initial state
//   const savedAutoSave = localStorage.getItem('AutoSave')
//   if (savedAutoSave !== null) {
//     autoSave.value = savedAutoSave === 'true'
//   }

//   // Methods
//   async function loadAggregates() {
//     if (isLoading.value) return
//     isLoading.value = true
//     try {
//       const aggregates = await serviceAggregatorClient.getAggregates()
//       if (aggregates && aggregates.length > 0) {
//         const firstAggregate = aggregates[0]
//         currentAggregateId.value = firstAggregate.id
//         await loadAggregateFlow(firstAggregate.id)
//       }
//     } catch (error) {
//       console.error('Failed to load aggregates:', error)
//       notify({
//         title: 'Error',
//         text: 'Failed to load aggregates',
//         type: 'error',
//       })
//     } finally {
//       isLoading.value = false
//     }
//   }

//   async function loadAggregateFlow(aggregateId) {
//     try {
//       const aggregates = await serviceAggregatorClient.getAggregates()
//       const aggregate = Array.isArray(aggregates)
//         ? aggregates.find(a => a.id === aggregateId)
//         : aggregates

//       if (!aggregate) {
//         console.warn(`Aggregate ${aggregateId} not found`)
//         return
//       }

//       currentAggregateId.value = aggregateId
//       const flowNodes = []
//       const flowEdges = []
//       const stepIdToNodeIdMap = new Map()
//       const nodePositions = {}
//       let xPos = 100
//       let yPos = 100

//       // First pass: create all nodes
//       for (const step of aggregate.steps || []) {
//         const isConditional = !!step.condition
//         const nodeId = `step-${step.id}`
//         stepIdToNodeIdMap.set(step.id, nodeId)

//         // Position nodes in a grid
//         if (!nodePositions[step.id]) {
//           nodePositions[step.id] = { x: xPos, y: yPos }
//           xPos += 300
//           if (xPos > 1500) {
//             xPos = 100
//             yPos += 200
//           }
//         }

//         const nodeData = {
//           id: nodeId,
//           type: isConditional ? 'conditionalStepNode' : 'stepNode',
//           position: nodePositions[step.id],
//           data: {
//             ...step,
//             stepId: step.id,
//             aggregateId,
//             service: step.service || null,
//             condition: step.condition || '',
//             nextStepId: step.nextStepId || null,
//             trueStepId: step.trueStepId || null,
//             falseStepId: step.falseStepId || null,
//           },
//         }

//         flowNodes.push(nodeData)
//       }

//       // Second pass: create edges
//       for (const step of aggregate.steps || []) {
//         const sourceNodeId = stepIdToNodeIdMap.get(step.id)
//         if (!sourceNodeId) continue

//         // Add next step edge
//         if (step.nextStepId) {
//           const targetNodeId = stepIdToNodeIdMap.get(step.nextStepId)
//           if (targetNodeId) {
//             flowEdges.push(createEdge(sourceNodeId, targetNodeId, 'next'))
//           }
//         }

//         // Add conditional edges if this is a conditional step
//         if (step.condition) {
//           if (step.trueStepId) {
//             const trueTargetId = stepIdToNodeIdMap.get(step.trueStepId)
//             if (trueTargetId) {
//               flowEdges.push(createEdge(sourceNodeId, trueTargetId, 'true', 'True'))
//             }
//           }
//           if (step.falseStepId) {
//             const falseTargetId = stepIdToNodeIdMap.get(step.falseStepId)
//             if (falseTargetId) {
//               flowEdges.push(createEdge(sourceNodeId, falseTargetId, 'false', 'False'))
//             }
//           }
//         }
//       }

//       nodes.value = flowNodes
//       edges.value = flowEdges

//     } catch (error) {
//       console.error('Error loading aggregate flow:', error)
//       notify({
//         title: 'Error',
//         text: 'Failed to load flow',
//         type: 'error',
//       })
//     }
//   }

//   function createEdge(source, target, type, label = '') {
//     const edgeId = `edge-${source}-${target}-${type}`
//     const baseEdge = {
//       id: edgeId,
//       source,
//       target,
//       type: 'smoothstep',
//       markerEnd: {
//         type: MarkerType.ArrowClosed,
//         width: 20,
//         height: 20,
//         color: type === 'false' ? '#ef4444' : '#3b82f6',
//       },
//       style: {
//         stroke: type === 'false' ? '#ef4444' : '#3b82f6',
//         strokeWidth: 2,
//         strokeDasharray: type === 'false' ? '5,5' : '0',
//       },
//     }

//     if (label) {
//       baseEdge.label = label
//       baseEdge.labelStyle = {
//         fill: type === 'false' ? '#ef4444' : '#3b82f6',
//         fontWeight: 'bold',
//       }
//       baseEdge.labelBgStyle = {
//         fill: '#ffffff',
//         fillOpacity: 0.7,
//       }
//     }

//     return baseEdge
//   }

//   async function saveStep(stepData) {
//     try {
//       const payload = {
//         aggregateId: currentAggregateId.value,
//         stepId: stepData.stepId,
//         stepName: stepData.stepName,
//         condition: stepData.condition || null,
//         nextStepId: stepData.nextStepId || null,
//         trueStepId: stepData.trueStepId || null,
//         falseStepId: stepData.falseStepId || null,
//         service: stepData.service ? {
//           id: stepData.service.id,
//           name: stepData.service.name,
//           url: stepData.service.url,
//           method: stepData.service.method,
//           type: stepData.service.type,
//           status: stepData.service.status,
//         } : null,
//       }

//       let result
//       if (stepData.stepId) {
//         result = await serviceAggregatorClient.updateAggregateStep(payload)
//       } else {
//         result = await serviceAggregatorClient.addAggregateStep(payload)
//       }

//       // Update the node in the store
//       const nodeIndex = nodes.value.findIndex(n => n.data.stepId === stepData.stepId)
//       if (nodeIndex !== -1) {
//         nodes.value[nodeIndex].data = { ...nodes.value[nodeIndex].data, ...stepData }
//       }

//       notify({
//         title: 'Success',
//         text: `Step ${stepData.stepId ? 'updated' : 'created'} successfully`,
//         type: 'success',
//       })

//       return result
//     } catch (error) {
//       console.error('Error saving step:', error)
//       notify({
//         title: 'Error',
//         text: `Failed to ${stepData.stepId ? 'update' : 'create'} step`,
//         type: 'error',
//       })
//       throw error
//     }
//   }

//   async function deleteStep(stepId) {
//     try {
//       // In a real implementation, you would call an API to delete the step
//       // await serviceAggregatorClient.deleteStep({ aggregateId: currentAggregateId.value, stepId })

//       // For now, just remove it from the nodes array
//       nodes.value = nodes.value.filter(n => n.data.stepId !== stepId)

//       // Also remove any edges connected to this step
//       edges.value = edges.value.filter(
//         e => !e.source.includes(stepId) && !e.target.includes(stepId)
//       )

//       notify({
//         title: 'Success',
//         text: 'Step deleted successfully',
//         type: 'success',
//       })
//     } catch (error) {
//       console.error('Error deleting step:', error)
//       notify({
//         title: 'Error',
//         text: 'Failed to delete step',
//         type: 'error',
//       })
//       throw error
//     }
//   }

//   function setSelectedNode(nodeId, mode = 'view') {
//     selectedNode.value = nodeId
//     modalMode.value = mode
//     if (nodeId) {
//       showStepModal.value = true
//     } else {
//       showStepModal.value = false
//     }
//   }

//   function clearSelected() {
//     selectedNode.value = null
//     showStepModal.value = false
//   }

//   function enableAutoSave() {
//     autoSave.value = true
//   }

//   function disableAutoSave() {
//     autoSave.value = false
//   }

//   function autoSaveEnabled() {
//     return autoSave.value
//   }

//   // Initialize
//   loadAggregates()

//   return {
//     // State
//     nodes,
//     edges,
//     selectedNode,
//     showStepModal,
//     modalMode,
//     isLoading,
//     autoSave,

//     // Computed
//     selectedStep,

//     // Actions
//     loadAggregates,
//     loadAggregateFlow,
//     saveStep,
//     deleteStep,
//     setSelectedNode,
//     clearSelected,
//     enableAutoSave,
//     disableAutoSave,
//     autoSaveEnabled,
//   }
// })
import { defineStore } from 'pinia'
import { ref, reactive, computed, watch } from 'vue'
import { MarkerType } from '@vue-flow/core'
import serviceAggregatorClient from '@/utils/service-aggregator-client'
import { notify } from '@kyvg/vue3-notification'
import { v4 as uuidv4 } from 'uuid'

const LOCAL_STORAGE_KEY = 'flowservice-step-flow'

export const useStepFlowStore = defineStore('stepFlow', () => {
  // State
  const nodes = ref([])
  const edges = ref([])
  const selectedNode = ref(null)
  const showStepModal = ref(false)
  const modalMode = ref('add') // 'add' or 'edit'
  const currentAggregateId = ref(null)
  const isLoading = ref(false)
  const autoSave = ref(false)
  const selectedService = ref(null)

  // Computed
  const selectedStep = computed(() => {
    if (!selectedNode.value) return null
    const node = nodes.value.find(n => n.id === selectedNode.value)
    return node ? node.data : null
  })

  // Watchers
  watch(autoSave, (newVal) => {
    localStorage.setItem('AutoSave', newVal)
  })

  // Load initial state
  const savedAutoSave = localStorage.getItem('AutoSave')
  if (savedAutoSave !== null) {
    autoSave.value = savedAutoSave === 'true'
  }

  // Helper function to find step by ID
  function findStepById(stepId) {
    const node = nodes.value.find(n => n.data.stepId === stepId)
    return node ? node.data : null
  }

  // Methods
  async function loadAggregates() {
    if (isLoading.value) return
    isLoading.value = true
    try {
      const aggregates = await serviceAggregatorClient.getAggregates()
      if (aggregates && aggregates.length > 0) {
        const firstAggregate = aggregates[0]
        currentAggregateId.value = firstAggregate.id
        await loadAggregateFlow(firstAggregate.id)
      }
    } catch (error) {
      console.error('Failed to load aggregates:', error)
      notify({
        title: 'Error',
        text: 'Failed to load aggregates',
        type: 'error',
      })
    } finally {
      isLoading.value = false
    }
  }

  // async function loadAggregateFlow(aggregateId) {
  //   try {
  //     const aggregates = await serviceAggregatorClient.getAggregates()
  //     const aggregate = Array.isArray(aggregates)
  //       ? aggregates.find(a => a.id === aggregateId)
  //       : aggregates

  //     if (!aggregate) {
  //       console.warn(`Aggregate ${aggregateId} not found`)
  //       return
  //     }

  //     currentAggregateId.value = aggregateId
  //     const { nodes: flowNodes, edges: flowEdges } = mapAggregateToFlow(aggregate)

  //     nodes.value = flowNodes
  //     edges.value = flowEdges

  //   } catch (error) {
  //     console.error('Error loading aggregate flow:', error)
  //     notify({
  //       title: 'Error',
  //       text: 'Failed to load flow',
  //       type: 'error',
  //     })
  //   }
  // }

  async function loadAggregateFlow(aggregateId) {
    // fetch aggregates, pick the one by id
    const aggregates = await serviceAggregatorClient.getAggregates()
    const aggregate = Array.isArray(aggregates) ? aggregates.find(a => a.id === aggregateId) : aggregates
    if (!aggregate) return

    currentAggregateId.value = aggregateId
    const steps = aggregate.steps || []
    const nodesOut = []
    const edgesOut = []
    const stepIdToNodeId = new Map()

    // positions (simple grid)
    let x = 100, y = 100
    const nextPos = () => {
      const pos = { x, y }
      x += 260
      if (x > 1500) { x = 100; y += 220 }
      return pos
    }

    // nodes
    steps.forEach(step => {
      const nodeId = `step-${step.id}`
      stepIdToNodeId.set(step.id, nodeId)

      const hasCondition = step.condition !== null && step.condition !== undefined && step.condition !== ''
      const isDecision = hasCondition
      const service = step.service

      nodesOut.push({
        id: nodeId,
        type: isDecision ? 'decisionNode' : 'serviceNode', // add a diamond node type in VueFlow
        position: nextPos(),
        data: {
          aggregateStepId: step.id,
          stepName: step.stepName,
          condition: step.condition,
          serviceId: service?.id || null,
          serviceName: service?.name || '',
          url: service?.url || '',
          method: service?.method || 'GET',
          type: service?.type || 'REST',
          status: service?.status ?? true,
        },
      })
    })

    // edges
    steps.forEach(step => {
      const sourceId = stepIdToNodeId.get(step.id)
      if (!sourceId) return

      const pushEdge = (targetStepId, label, color) => {
        const targetId = stepIdToNodeId.get(targetStepId)
        if (!targetId) return
        edgesOut.push({
          id: `edge-${step.id}-${targetStepId}`,
          source: sourceId,
          target: targetId,
          animated: true,
          type: 'default',
          style: color ? { stroke: color, strokeDasharray: color === '#EF4444' ? '6 4' : undefined } : {},
          label,
          markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: color || '#FF0072' },
          data: {
            aggregateStepId: step.id,
            aggregateId: aggregateId,
            condition: step.condition || '',
            mappings: step.mappings || [],
          },
        })
      }

      if (step.nextStepId) pushEdge(step.nextStepId, '', '#FF0072')
      if (step.trueStepId) pushEdge(step.trueStepId, 'True', '#10B981')
      if (step.falseStepId) pushEdge(step.falseStepId, 'False', '#EF4444')
    })

    nodes.value = [...nodesOut]
    edges.value = [...edgesOut]
  }
  function mapAggregateToFlow(aggregate) {
    const flowNodes = []
    const flowEdges = []
    const stepIdToNodeIdMap = new Map()
    const nodePositions = {}
    let xPos = 100
    let yPos = 100

    // First pass: create all nodes
    for (const step of aggregate.steps || []) {
      const nodeId = `step-${step.id}`
      stepIdToNodeIdMap.set(step.id, nodeId)

      // Position nodes in a grid
      if (!nodePositions[step.id]) {
        nodePositions[step.id] = { x: xPos, y: yPos }
        xPos += 300
        if (xPos > 1500) {
          xPos = 100
          yPos += 200
        }
      }

      const nodeData = {
        id: nodeId,
        type: step.condition ? 'conditionalStepNode' : 'stepNode',
        position: nodePositions[step.id],
        data: {
          ...step,
          stepId: step.id,
          aggregateId: aggregate.id,
          service: step.service || null,
          condition: step.condition || '',
          nextStepId: step.nextStepId || null,
          trueStepId: step.trueStepId || null,
          falseStepId: step.falseStepId || null,
        },
      }

      flowNodes.push(nodeData)
    }

    // Second pass: create edges
    for (const step of aggregate.steps || []) {
      const sourceNodeId = stepIdToNodeIdMap.get(step.id)
      if (!sourceNodeId) continue

      // Add next step edge
      if (step.nextStepId) {
        const targetNodeId = stepIdToNodeIdMap.get(step.nextStepId)
        if (targetNodeId) {
          flowEdges.push(createEdge(sourceNodeId, targetNodeId, 'next'))
        }
      }

      // Add conditional edges if this is a conditional step
      if (step.condition) {
        if (step.trueStepId) {
          const trueTargetId = stepIdToNodeIdMap.get(step.trueStepId)
          if (trueTargetId) {
            flowEdges.push(createEdge(sourceNodeId, trueTargetId, 'true', 'True'))
          }
        }
        if (step.falseStepId) {
          const falseTargetId = stepIdToNodeIdMap.get(step.falseStepId)
          if (falseTargetId) {
            flowEdges.push(createEdge(sourceNodeId, falseTargetId, 'false', 'False'))
          }
        }
      }
    }

    return { nodes: flowNodes, edges: flowEdges }
  }

  function createEdge(source, target, type, label = '') {
    const edgeId = `edge-${source}-${target}-${type}-${uuidv4()}`
    const isConditionalEdge = type === 'true' || type === 'false'

    return {
      id: edgeId,
      source,
      target,
      type: 'smoothstep',
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: isConditionalEdge ? (type === 'false' ? '#ef4444' : '#10b981') : '#3b82f6',
      },
      style: {
        stroke: isConditionalEdge ? (type === 'false' ? '#ef4444' : '#10b981') : '#3b82f6',
        strokeWidth: 2,
        strokeDasharray: type === 'false' ? '5,5' : '0',
      },
      ...(label && {
        label,
        labelStyle: {
          fill: isConditionalEdge ? (type === 'false' ? '#ef4444' : '#10b981') : '#3b82f6',
          fontWeight: 'bold',
        },
        labelBgStyle: {
          fill: '#ffffff',
          fillOpacity: 0.7,
        }
      }),
      data: { type }
    }
  }

  async function saveStep(stepData) {
    try {
      const isNew = !stepData.stepId
      const payload = {
        aggregateId: currentAggregateId.value,
        stepId: stepData.stepId,
        stepName: stepData.stepName,
        description: stepData.description || '',
        condition: stepData.condition || null,
        nextStepId: stepData.nextStepId || null,
        trueStepId: stepData.trueStepId || null,
        falseStepId: stepData.falseStepId || null,
      }

      let result
      if (isNew) {
        result = await serviceAggregatorClient.addAggregateStep(payload)
        // Add the new step to the flow
        const newNode = {
          id: `step-${result.data.id}`,
          type: stepData.condition ? 'conditionalStepNode' : 'stepNode',
          position: { x: 0, y: 0 }, // Will be positioned by layout
          data: {
            ...payload,
            stepId: result.data.id,
            service: stepData.service || null
          }
        }
        nodes.value.push(newNode)
      } else {
        result = await serviceAggregatorClient.updateAggregateStep(payload)
        // Update existing node
        const nodeIndex = nodes.value.findIndex(n => n.data.stepId === stepData.stepId)
        if (nodeIndex !== -1) {
          nodes.value[nodeIndex].data = {
            ...nodes.value[nodeIndex].data,
            ...payload
          }
          // Update node type if condition changed
          if (nodes.value[nodeIndex].type === 'conditionalStepNode' && !stepData.condition) {
            nodes.value[nodeIndex].type = 'stepNode'
          } else if (nodes.value[nodeIndex].type === 'stepNode' && stepData.condition) {
            nodes.value[nodeIndex].type = 'conditionalStepNode'
          }
        }
      }

      // Update edges
      updateEdgesForStep(result.data)

      notify({
        title: 'Success',
        text: `Step ${isNew ? 'created' : 'updated'} successfully`,
        type: 'success',
      })

      return result.data

    } catch (error) {
      console.error('Error saving step:', error)
      notify({
        title: 'Error',
        text: `Failed to ${stepData.stepId ? 'update' : 'create'} step`,
        type: 'error',
      })
      throw error
    }
  }

  function updateEdgesForStep(step) {
    // Remove existing edges for this step
    edges.value = edges.value.filter(
      e => !e.source.endsWith(step.id) ||
        (e.data?.type !== 'next' && e.data?.type !== 'true' && e.data?.type !== 'false')
    )

    const sourceNodeId = `step-${step.id}`

    // Add next step edge
    if (step.nextStepId) {
      const targetNodeId = `step-${step.nextStepId}`
      edges.value.push(createEdge(sourceNodeId, targetNodeId, 'next'))
    }

    // Add conditional edges
    if (step.condition) {
      if (step.trueStepId) {
        const trueTargetId = `step-${step.trueStepId}`
        edges.value.push(createEdge(sourceNodeId, trueTargetId, 'true', 'True'))
      }
      if (step.falseStepId) {
        const falseTargetId = `step-${step.falseStepId}`
        edges.value.push(createEdge(sourceNodeId, falseTargetId, 'false', 'False'))
      }
    }
  }

  async function saveService(serviceData) {
    try {
      const isNew = !serviceData.id
      let result

      if (isNew) {
        result = await serviceAggregatorClient.createService(serviceData)
      } else {
        result = await serviceAggregatorClient.updateService(serviceData)
      }

      // Update the service in the selected step if it exists
      if (selectedNode.value) {
        const nodeIndex = nodes.value.findIndex(n => n.id === selectedNode.value)
        if (nodeIndex !== -1) {
          nodes.value[nodeIndex].data.service = result.data
          // Trigger reactivity
          nodes.value = [...nodes.value]
        }
      }

      notify({
        title: 'Success',
        text: `Service ${isNew ? 'created' : 'updated'} successfully`,
        type: 'success',
      })

      return result.data
    } catch (error) {
      console.error('Error saving service:', error)
      notify({
        title: 'Error',
        text: `Failed to ${serviceData.id ? 'update' : 'create'} service`,
        type: 'error',
      })
      throw error
    }
  }

  function setSelectedNode(nodeId, mode = 'view') {
    selectedNode.value = nodeId
    modalMode.value = mode
    showStepModal.value = !!nodeId
  }

  function clearSelected() {
    selectedNode.value = null
    showStepModal.value = false
    selectedService.value = null
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

  // Initialize
  loadAggregates()

  return {
    // State
    nodes,
    edges,
    selectedNode,
    showStepModal,
    modalMode,
    isLoading,
    autoSave,
    selectedService,

    // Computed
    selectedStep,

    // Actions
    loadAggregates,
    loadAggregateFlow,
    saveStep,
    saveService,
    deleteStep,
    setSelectedNode,
    clearSelected,
    enableAutoSave,
    disableAutoSave,
    autoSaveEnabled,
    findStepById,
  }
})
