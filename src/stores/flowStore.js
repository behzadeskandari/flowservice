// src/store/flowStore.js
import { defineStore } from 'pinia'
import { reactive, ref, watch } from 'vue'
import { mergeFields } from '../utils/schemaUtils'
import { uniqueId } from '@/utils/modalUtils'

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

  // Save flow to localStorage on nodes or edges change
  // watch(
  //   nodes,
  //   (newNodes) => {
  //     newNodes.forEach((node) => {
  //       if (!node.position) {
  //         console.warn(`Node ${node.id} missing position, fixing.`)
  //         node.position = { x: 100, y: 100 }
  //       }
  //     })
  //   },
  //   { deep: true, immediate: true },
  // )
//   watch(
//   [nodes, edges],
//   ([newNodes, newEdges]) => {
//     if (autoSave.value) {
//      saveFlow(newNodes, newEdges)
//     }
//   },
//   { deep: true }
// )

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

  // function addNode({
  //   position = { x: 100, y: 100 },
  //   label = 'New Service',
  //   serviceName = '',
  //   fields = [],
  // } = {}) {
  //   const id = uniqueId('svc')
  //   const node = {
  //     id,
  //     type: 'serviceNode',
  //     position,
  //     data: {
  //       id,
  //       label,
  //       serviceName: serviceName || label,
  //       fields: JSON.parse(JSON.stringify(fields || [])),
  //     },
  //   }
  //   nodes.value.push(node)
  //   nodes.value = [...nodes.value] // trigger reactivity
  //   return node
  // }
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
    nodes.value = [...nodes.value] // trigger reactivity

    return combined
  }

  function generateCombinedService(nodeA, nodeB) {
    const fieldsA = nodeA.data?.fields || []
    const fieldsB = nodeB.data?.fields || []
    const mergedFields = mergeFields(fieldsA, fieldsB)

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

  function getNodes(){
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
