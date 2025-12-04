<!-- src/components/Flow.vue -->
<template>
  <div class="flow-wrapper">
    <div class="toolbar">
      <button @click="onAddService">Add Service</button>
      <button @click="viewAllJson">View All JSON</button>
      <button @click="exportFlowJson">Export Flow</button>
    </div>

    <div class="canvas">
      <VueFlow
        :nodes="store.nodes"
        :edges="store.edges"
        style="width: 100%; height: 74vh"
        @nodes-change="onNodesChange"
        @edges-change="onEdgesChange"
        @connect="onConnect"
        @node-dblclick="onNodeDblClick"
        :node-types="nodeTypes"
        v-bind="vfOptions"
      >
        <Background />
        <Controls />
      </VueFlow>
    </div>

    <ServiceModal />
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { VueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'

// Node components
import ServiceNode from './nodes/ServiceNode.vue'
import CombinedServiceNode from './nodes/CombinedServiceNode.vue'

// Modal
import ServiceModal from './modals/ServiceModal.vue'

// Store
import { useFlowStore } from '../stores/flowStore'

// Register node components
const nodeTypes = {
  serviceNode: ServiceNode,
  combinedServiceNode: CombinedServiceNode,
}

const store = useFlowStore()

const vfOptions = reactive({
  fitView: true,
})

function onAddService() {
  const position = { x: 200 + Math.random() * 60, y: 150 + Math.random() * 60 }
  const newNode = store.addNode({
    position,
    label: 'Service ' + (store.nodes.length + 1),
    fields: [],
  })
  store.setSelectedNode(newNode.id, 'edit')
}

function viewAllJson() {
  const payload = store.exportFlow()
  window.navigator.clipboard?.writeText(JSON.stringify(payload, null, 2))
  alert('Flow JSON copied to clipboard.')
}

function exportFlowJson() {
  const payload = store.exportFlow()
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `flow_export_${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function onConnect(evt) {
  store.handleConnect(evt)
}

function onNodesChange(changes) {
  changes.forEach((change) => {
    if (change.type === 'position') {
      const node = store.nodes.find((n) => n.id === change.id)
      if (node) node.position = change.position
    }
    if (change.type === 'remove') {
      store.deleteNode(change.id)
    }
  })
}

function onEdgesChange(changes) {
  changes.forEach((change) => {
    if (change.type === 'remove') {
      store.edges = store.edges.filter((e) => e.id !== change.id)
    }
  })
}

function onNodeDblClick({ id }) {
  store.setSelectedNode(id, 'edit')
}
</script>

<style scoped>
.flow-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
}
.toolbar {
  display: flex;
  gap: 8px;
}
.canvas {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}
</style>
