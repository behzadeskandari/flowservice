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

  function addNode(options = {}) {
    const { position = {}, label = 'New Service', serviceName = '', fields = [] } = options

    const x = typeof position.x === 'number' ? position.x : 100
    const y = typeof position.y === 'number' ? position.y : 100
    const id = uniqueId('svc')
    const node = {
      id: uniqueId('svc'),
      type: 'serviceNode',
      position: { x, y }, // 100% guaranteed to exist
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
    if (patch.position && (patch.position.x == null || patch.position.y == null)) {
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
    if (params.sourceHandle !== 'out' || params.targetHandle !== 'in') {
      return
    }
    console.log('Connecting nodes:', params)
    const { source, target } = params
    if (!source || !target) return

    const nodeA = nodes.value.find((n) => n.id === source)
    const nodeB = nodes.value.find((n) => n.id === target)
    if (!nodeA || !nodeB) return

    if (!nodeA.position) nodeA.position = { x: 0, y: 0 }
    if (!nodeB.position) nodeB.position = { x: 200, y: 200 }

    // Add the new edge first
    addEdge({
      id: `e_${source}-${target}_${Date.now()}`,
      source,
      target,
      animated: true,
      type: 'default',
    })

    // Find all nodes in the connected component that includes both source and target
    const connectedGroup = findConnectedComponent(source, target)
    console.log(
      'Connected group:',
      connectedGroup.map((n) => n.id),
    )

    if (connectedGroup.length < 2) {
      console.warn('Connected group has less than 2 nodes, skipping merge')
      return
    }

    // Identify all combined nodes already present for this group
    const groupIds = connectedGroup.map(n => n.id)
    const groupSet = new Set(groupIds)
    // Find combined nodes whose underlying set overlaps this group
    const redundantCombinedNodes = nodes.value.filter(node => {
      if (node.type !== 'combinedServiceNode') return false;
      // Try to recover the combined set from label
      const parts = node.data?.label?.split(' + ')
      if (!parts || parts.length < 2) return false;
      return parts.every(name => groupIds.some(cid => {
        const cn = nodes.value.find(n => n.id === cid)
        return cn && cn.label === name
      }))
    })

    // Remove previous combined nodes for this group
    redundantCombinedNodes.forEach(rcn => {
      // Remove node
      const idx = nodes.value.findIndex(n => n.id === rcn.id)
      if (idx !== -1) nodes.value.splice(idx, 1)
      // Remove any edges whose source or target is this combined node
      edges.value = edges.value.filter(e => e.source !== rcn.id && e.target !== rcn.id)
    })

    // Merge all nodes in the connected group into one combined node
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
    // (Optional) force reactivity
    nodes.value = [...nodes.value]
    edges.value = [...edges.value]
    return combinedNode
  }
  /**
   * Finds all nodes in the connected component that includes both startNodeId and endNodeId
   * Uses BFS to traverse the graph and find all connected nodes
   */
  function findConnectedComponent(startNodeId, endNodeId) {
    const visited = new Set()
    const queue = [startNodeId, endNodeId]
    const componentNodeIds = new Set([startNodeId, endNodeId])

    // Build adjacency list from edges
    const adjacency = new Map()
    edges.value.forEach((edge) => {
      if (!adjacency.has(edge.source)) {
        adjacency.set(edge.source, [])
      }
      if (!adjacency.has(edge.target)) {
        adjacency.set(edge.target, [])
      }
      adjacency.get(edge.source).push(edge.target)
      adjacency.get(edge.target).push(edge.source)
    })

    // BFS to find all connected nodes
    while (queue.length > 0) {
      const currentNodeId = queue.shift()
      if (visited.has(currentNodeId)) continue
      visited.add(currentNodeId)

      const neighbors = adjacency.get(currentNodeId) || []
      neighbors.forEach((neighborId) => {
        if (!visited.has(neighborId) && !componentNodeIds.has(neighborId)) {
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
    exportFlow,
    importFlow,
  }
})
