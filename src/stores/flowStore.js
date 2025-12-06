// src/store/flowStore.js
import { defineStore } from 'pinia'
import { reactive, ref, watch } from 'vue'
import { mergeNFields } from '../utils/schemaUtils'
import { uniqueId } from '@/utils/modalUtils'
import { MarkerType } from '@vue-flow/core'

const LOCAL_STORAGE_KEY = 'flowservice-flow'

// Simple unique id generator


export const useFlowStore = defineStore('flow', () => {
  const nodes = ref([])
  const edges = ref([])
  const autoSave = ref(false)
  const selectedNode = ref(null)
  const showModal = ref(false)
  const modalMode = ref('add') // 'add'|'edit'|'view'
  const flowViewport = reactive({ x: 0, y: 0, zoom: 1 })
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


  watch(
    [nodes, edges],
    ([newNodes, newEdges]) => {
      newNodes.forEach(node => {
        if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
          console.warn(`Fixing node ${node.id} missing or invalid position`)
          node.position = { x: 100, y: 100 }
        }

      })
      if (autoSave.value) {
        saveFlow(newNodes, newEdges)
      }
    },
    { deep: true }
  )
  loadFlow()

  function addNode(options = {}) {
    const {
      position = {},
      label = 'New Service',
      serviceName = '',
      fields = [],
    } = options

    const x = typeof position.x === 'number' ? position.x : 100
    const y = typeof position.y === 'number' ? position.y : 100
    const id = uniqueId('svc')
    const node = {
      id: uniqueId('svc'),
      type: 'serviceNode',
      position: { x, y },    // 100% guaranteed to exist
      data: {
        id,
        label,
        serviceName: serviceName || label,
        fields: structuredClone(fields),
      },
    }

    nodes.value.push(node)
    nodes.value = [...nodes.value] // force reactivity
    return node
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
  function updateNode(nodeId, patch) {
    const idx = nodes.value.findIndex((n) => n.id === nodeId)
    if (idx === -1) return null

    const node = nodes.value[idx]

    // Prevent accidental deletion or invalid overwrite
    if (patch.position && (
      patch.position.x == null ||
      patch.position.y == null
    )) {
      delete patch.position
    }

    nodes.value[idx] = {
      ...node,
      ...patch,
      data: { ...node.data, ...patch.data },
    }

    nodes.value = [...nodes.value]
    return nodes.value[idx]
  }

  function deleteNode(nodeId) {
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

  function handleConnect(params) {
    // const { source, target } = params
    // if (!source || !target) return

    // const nodeA = nodes.value.find((n) => n.id === source)
    // const nodeB = nodes.value.find((n) => n.id === target)
    // if (!nodeA || !nodeB) return

    // if (!nodeA.position) nodeA.position = { x: 0, y: 0 }
    // if (!nodeB.position) nodeB.position = { x: 200, y: 200 }

    // addEdge({
    //   id: `e_${source}-${target}_${Date.now()}`,
    //   source,
    //   target,
    //   animated: true,
    //   type: 'default',
    // })

    // let combinedNode = null

    // // Check if nodeA or nodeB is combined node
    // if (nodeA.type === 'combinedServiceNode') {
    //   // Add nodeB to combined nodeA
    //   combinedNode = addToCombinedNode(nodeA, nodeB)
    // } else if (nodeB.type === 'combinedServiceNode') {
    //   // Add nodeA to combined nodeB
    //   combinedNode = addToCombinedNode(nodeB, nodeA)
    // } else {
    //   // Neither is combined - create new combined node from both
    //   combinedNode = generateCombinedService(nodeA, nodeB)
    //   const posA = nodeA.position
    //   const posB = nodeB.position
    //   const position = {
    //     x: Math.round((posA.x + posB.x) / 2) + 40,
    //     y: Math.round((posA.y + posB.y) / 2) + 40,
    //   }
    //   nodes.value.push({
    //     id: combinedNode.id,
    //     type: 'combinedServiceNode',
    //     position,
    //     data: combinedNode.data,
    //   })
    // }

    // nodes.value = [...nodes.value] // trigger reactivity
    // return combinedNode
    const { source, target } = params
    if (!source || !target) return

    const nodeA = nodes.value.find((n) => n.id === source)
    const nodeB = nodes.value.find((n) => n.id === target)
    if (!nodeA || !nodeB) return

    if (!nodeA.position) nodeA.position = { x: 0, y: 0 }
    if (!nodeB.position) nodeB.position = { x: 200, y: 200 }

    addEdge({
      id: `e_${source}-${target}_${Date.now()}`,
      source,
      target,
      animated: true,
      type: 'default',
    })

    let combinedNode = null

    if (nodeA.type === 'combinedServiceNode' && nodeB.type !== 'combinedServiceNode') {
      // Add single nodeB to combined nodeA
      combinedNode = addToCombinedNode(nodeA, nodeB)
    } else if (nodeB.type === 'combinedServiceNode' && nodeA.type !== 'combinedServiceNode') {
      // Add single nodeA to combined nodeB
      combinedNode = addToCombinedNode(nodeB, nodeA)
    } else if (nodeA.type === 'combinedServiceNode' && nodeB.type === 'combinedServiceNode') {
      // Both combined nodes: optionally merge two combined nodes
      combinedNode = mergeCombinedNodes(nodeA, nodeB)
    } else {
      // Both are single nodes: create new combined node from both
      combinedNode = generateCombinedService(nodeA, nodeB)
      const posA = nodeA.position
      const posB = nodeB.position
      const position = {
        x: Math.round((posA.x + posB.x) / 2) + 40,
        y: Math.round((posA.y + posB.y) / 2) + 40,
      }
      nodes.value.push({
        id: combinedNode.id,
        type: 'combinedServiceNode',
        position,
        data: combinedNode.data,
      })
    }

    nodes.value = [...nodes.value] // trigger reactivity
    return combinedNode
  }
  function generateCombinedService(...nodes) {
    const fieldsList = nodes.map(node => node.data?.fields || []);
    const mergedResult = mergeNFields(...fieldsList);

    const id = uniqueId('combined');
    const labels = nodes.map(node => node.data.label).join(' + ');
    return {
      id,
      data: {
        id,
        label: labels,
        combinedSchema: mergedResult,
        editable: true,
      },
    };
  }

  function addToCombinedNode(combinedNode, newNode) {
    // Extract existing combined fields from combinedNode.data.combinedSchema
    // assuming combinedSchema.services is an array of fields arrays per original node
    const existingServicesFields = combinedNode.data.combinedSchema.services || []
    const newFields = newNode.data?.fields || []

    // Add new node's fields to existing services array
    const updatedServices = [...existingServicesFields, newFields]

    // Merge all fields again
    const mergedResult = mergeNFields(...updatedServices)

    // Update combined node data
    combinedNode.data.combinedSchema = mergedResult

    // Update combined label with new node label
    combinedNode.data.label += ` + ${newNode.data.label}`

    // Optional: update combined node's data.id or keep original?

    // Update node position if you want (optional)

    // Update the nodes array with updated combinedNode
    const idx = nodes.value.findIndex(n => n.id === combinedNode.id)
    if (idx !== -1) {
      nodes.value[idx] = { ...combinedNode }
    }

    // Optionally, remove newNode from nodes list if you want to "absorb" it
    nodes.value = nodes.value.filter(n => n.id !== newNode.id)

    return combinedNode
  }
  function mergeCombinedNodes(nodeA, nodeB) {
    const servicesA = nodeA.data.combinedSchema.services || []
    const servicesB = nodeB.data.combinedSchema.services || []

    const mergedServices = [...servicesA, ...servicesB]
    const mergedResult = mergeNFields(...mergedServices)

    nodeA.data.combinedSchema = mergedResult
    nodeA.data.label += ` + ${nodeB.data.label}`

    // Remove nodeB from nodes list
    nodes.value = nodes.value.filter(n => n.id !== nodeB.id)

    // Update nodeA in nodes array
    const idx = nodes.value.findIndex(n => n.id === nodeA.id)
    if (idx !== -1) {
      nodes.value[idx] = { ...nodeA }
    }

    return nodeA
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
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(flow))
      console.log('Flow auto-saved')
    } catch (e) {
      console.error('Auto-save failed', e)
    }
  }, 500)
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
    addNode,
    updateNode,
    deleteNode,
    addEdge,
    getNodes,
    handleConnect,
    setSelectedNode,
    clearSelected,
    generateCombinedService,
    exportFlow,
    importFlow,
  }
})
