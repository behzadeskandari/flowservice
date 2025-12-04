// src/store/flowStore.js
import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import { mergeFields } from '../utils/schemaUtils'

// Simple unique id generator (keeps things deterministic within a session)
let idCounter = 1
function uniqueId(prefix = 'node') {
  return `${prefix}_${Date.now().toString(36)}_${idCounter++}`
}

export const useFlowStore = defineStore('flow', () => {
  const nodes = ref([
    // optional starter node example
    // {
    //   id: 'node_example',
    //   type: 'serviceNode',
    //   position: { x: 0, y: 0 },
    //   data: { label: 'Example', serviceName: 'example', fields: [] }
    // }
  ])
  const edges = ref([])
  const selectedNode = ref(null) // store node id or null
  const showModal = ref(false)
  const modalMode = ref('add') // 'add'|'edit'|'view'
  const flowViewport = reactive({ x: 0, y: 0, zoom: 1 })

  function addNode({
    position = { x: 100, y: 100 },
    label = 'New Service',
    serviceName = '',
    fields = [],
  } = {}) {
    const id = uniqueId('svc')
    const node = {
      id,
      type: 'serviceNode',
      position,
      data: {
        id,
        label,
        serviceName: serviceName || label,
        fields: JSON.parse(JSON.stringify(fields || [])),
      },
    }
    nodes.value.push(node)
    return node
  }

  function updateNode(nodeId, patch) {
    const idx = nodes.value.findIndex((n) => n.id === nodeId)
    if (idx === -1) return null
    const node = nodes.value[idx]
    nodes.value[idx] = {
      ...node,
      data: {
        ...node.data,
        ...patch,
      },
    }
    return nodes.value[idx]
  }

  function deleteNode(nodeId) {
    nodes.value = nodes.value.filter((n) => n.id !== nodeId)
    // remove connected edges
    edges.value = edges.value.filter((e) => e.source !== nodeId && e.target !== nodeId)
    if (selectedNode.value === nodeId) {
      selectedNode.value = null
      showModal.value = false
    }
  }

  function addEdge(edge) {
    // edge: { id, source, sourceHandle, target, targetHandle, type? }
    edges.value.push(edge)
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

  //   function handleConnect(params, vueflowApi = null) {
  //     // params: { source, sourceHandle, target, targetHandle, sourceNode?, targetNode? } (from onConnect)
  //     const { source, target } = params
  //     if (!source || !target) return

  //     // create an edge
  //     const edgeId = `e_${source}-${target}_${Date.now().toString(36)}`
  //     addEdge({
  //       id: edgeId,
  //       source,
  //       target,
  //       animated: true,
  //       type: 'default',
  //     })

  //     // Generate a combined node from source & target nodes
  //     const nodeA = nodes.value.find((n) => n.id === source)
  //     const nodeB = nodes.value.find((n) => n.id === target)
  //     if (!nodeA || !nodeB) return

  //     const combined = generateCombinedService(nodeA, nodeB)

  //     // Place combined node centered between the two nodes positions (if available)
  //     const posA = nodeA.position || { x: 0, y: 0 }
  //     const posB = nodeB.position || { x: 200, y: 200 }
  //     const position = {
  //       x: Math.round((posA.x + posB.x) / 2) + 40,
  //       y: Math.round((posA.y + posB.y) / 2) + 40,
  //     }

  //     const combinedNode = {
  //       id: combined.id,
  //       type: 'combinedServiceNode',
  //       position,
  //       data: combined.data,
  //     }

  //     nodes.value.push(combinedNode)
  //     nodes.value = [...nodes.value]
  //     return combinedNode
  //   }
  function handleConnect(params) {
    debugger
    const { source, target } = params
    if (!source || !target) return

    const nodeA = nodes.value.find((n) => n.id === source)
    const nodeB = nodes.value.find((n) => n.id === target)
    if (!nodeA || !nodeB) return

    if (!nodeA.position) {
      console.warn(`Node A (${nodeA.id}) position missing. Defaulting.`)
      nodeA.position = { x: 0, y: 0 }
    }
    if (!nodeB.position) {
      console.warn(`Node B (${nodeB.id}) position missing. Defaulting.`)
      nodeB.position = { x: 200, y: 200 }
    }

    addEdge({
      id: `e_${source}-${target}_${Date.now()}`,
      source,
      target,
      animated: true,
      type: 'default',
    })
    const combined = generateCombinedService(nodeA, nodeB)

    const posA = nodeA.position
    const posB = nodeB.position
    const position = {
      x: Math.round((posA.x + posB.x) / 2) + 40,
      y: Math.round((posA.y + posB.y) / 2) + 40,
    }

    nodes.value.push({
      id: combined.id,
      type: 'combinedServiceNode',
      position,
      data: combined.data,
    })
    nodes.value = [...nodes.value]
    // const { id: newId, data } = generateCombinedService(nodeA, nodeB)
    // const posA = nodeA.position || { x: 0, y: 0 }
    // const posB = nodeB.position || { x: 0, y: 0 }
    // const position = {
    //   x: (posA.x + posB.x) / 2 + 40,
    //   y: (posA.y + posB.y) / 2 + 40,
    // }

    // nodes.value.push({ id: newId, type: 'combinedServiceNode', position, data })
    // nodes.value = [...nodes.value] // important to ensure reactivity update
  }

  function generateCombinedService(nodeA, nodeB) {
    const fieldsA = nodeA.data?.fields || []
    const fieldsB = nodeB.data?.fields || []
    const mergedFields = mergeFields(fieldsA, fieldsB) // assume this returns an array

    const id = uniqueId('combined')
    return {
      id,
      data: {
        id,
        label: `${nodeA.data.label} + ${nodeB.data.label}`,
        combinedSchema: mergedFields,
        editable: true,
      },
    }
  }
  //   function generateCombinedService(nodeA, nodeB) {
  //     // Accept node objects (with data.fields)
  //     const fieldsA = nodeA.data?.fields || []
  //     const fieldsB = nodeB.data?.fields || []
  //     const merged = mergeFields(fieldsA, fieldsB)

  //     const id = uniqueId('combined')
  //     return {
  //       id,
  //       data: {
  //         id,
  //         type: 'combinedService',
  //         label: `${nodeA.data.label} + ${nodeB.data.label}`,
  //         combinedSchema: merged,
  //         editable: true,
  //       },
  //     }
  //   }

  function exportFlow() {
    return {
      nodes: nodes.value,
      edges: edges.value,
    }
  }

  function importFlow(flow) {
    nodes.value = flow.nodes || []
    edges.value = flow.edges || []
  }

  return {
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
    handleConnect,
    setSelectedNode,
    clearSelected,
    generateCombinedService,
    exportFlow,
    importFlow,
  }
})
