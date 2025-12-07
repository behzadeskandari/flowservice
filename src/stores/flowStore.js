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
    if (!params.sourceHandle === 'out' || !params.targetHandle === 'in') {
      return;
    }
    console.log('Connecting nodes:', params);
    console.log('handleConnect', params)
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

    const connectedNodes = getConnectedNodes(nodes.value, edges.value)
    const notConnectedNodes = getNotConnectedNodes(nodes.value, edges.value)
    console.log('Connected nodes:', connectedNodes)
    console.log('Not connected nodes:', notConnectedNodes)
    let combinedNode = null
    if (nodeA.type === 'combinedServiceNode' && nodeB.type === 'combinedServiceNode') {
      combinedNode = addToCombinedNode(nodeA, nodeB)
    }

    else if (areNodesConnected(nodeA.id, nodeB.id, edges , nodes)) {
      combinedNode = connnctToTheExistingNodeAndUpdateTheSameCombinedService(nodeA, nodeB, edges, nodes)
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
    else {

      // هر دو سرویس عادی هستن، کارت جدید بساز
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

    nodes.value = [...nodes.value]
    return combinedNode
  }
  function connnctToTheExistingNodeAndUpdateTheSameCombinedService(nodeA, nodeB) {
    console.log('Connecting to existing combined node', nodeA, nodeB)

    // find combined node connected to A or B
    const existingCombined = findExistingCombinedNode()

    if (!existingCombined) {
      console.warn('No existing combined node found — generating new one')
      return generateCombinedService(nodeA, nodeB)
    }

    console.log("Found existing combined:", existingCombined)

    // decide which node to add
    const flat = existingCombined.data.combinedSchema.services.flat()
    const nodeToAdd = flat.includes(nodeA.id) ? nodeB : nodeA

    return addToCombinedNodes(existingCombined, nodeToAdd)
  }
  function addToCombinedNodes(combined, newNode) {
    const servicesList = combined.data.combinedSchema.services
    // insert this service's fields
    servicesList.push(newNode.data.fields)
    // regenerate merge
    const merged = mergeNFields(...servicesList)

    combined.data.label += ` + ${newNode.data.label}`
    combined.data.combinedSchema = merged
    return combined
  }
  function findExistingCombinedNode() {
    return nodes.value.find(n => n.type === 'combinedServiceNode')
  }
  function generateCombinedService(nodeA, nodeB) {
    // const fieldsList = nodes.map(node => node.data?.fields || []);
    // const mergedResult = mergeNFields(...fieldsList);
    const fieldsList = [
      nodeA.data.fields || [],
      nodeB.data.fields || []
    ];

    const mergedResult = mergeNFields(...fieldsList);

    const id = uniqueId('combined');
    return {
      id,
      data: {
        id,
        label: `${nodeA.data.label} + ${nodeB.data.label}`,
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
  function areNodesConnected(nodeIdA, nodeIdB, edges, nodes) {
    console.log('nodes nodes nodes',nodes.value)
    if (!edges || !Array.isArray(edges.value)) return false;

    // Build adjacency list
    const adjacency = new Map();

    edges.value.forEach(edge => {
      if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
      if (!adjacency.has(edge.target)) adjacency.set(edge.target, []);
      adjacency.get(edge.source).push(edge.target);
      adjacency.get(edge.target).push(edge.source);
    });

    // BFS or DFS from nodeIdA to see if nodeIdB is reachable
    const visited = new Set();
    const queue = [nodeIdA];

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === nodeIdB) return true;
      if (visited.has(current)) continue;
      visited.add(current);

      const neighbors = adjacency.get(current) || [];
      neighbors.forEach(neighbor => {
        if (!visited.has(neighbor)) queue.push(neighbor);
      });
    }

    return false;
  }

  function getConnectedNodes(nodes, edges) {
    const connectedNodeIds = new Set()

    edges.forEach(edge => {
      connectedNodeIds.add(edge.source)
      connectedNodeIds.add(edge.target)
    })

    return nodes.filter(node => connectedNodeIds.has(node.id))
  }
  function getNotConnectedNodes(nodes, edges) {
    const connectedNodeIds = new Set()

    edges.forEach(edge => {
      connectedNodeIds.add(edge.source)
      connectedNodeIds.add(edge.target)
    })

    return nodes.filter(node => !connectedNodeIds.has(node.id))
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
