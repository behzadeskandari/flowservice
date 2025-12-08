<template>
  <div class="flow-wrapper">
    <div class="toolbar">
      <button
        class="px-3 py-2 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:from-orange-500 hover:via-orange-600 hover:to-orange-700 transition duration-300 ease-in-out"
        @click="onAddService">
        <font-awesome-icon :icon="faPlus" style="color: white" />
        اضافه کردن سرویس
      </button>
      <button
        class="px-3 py-2 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:from-orange-500 hover:via-orange-600 hover:to-orange-700 transition duration-300 ease-in-out"
        @click="viewAllJson">
        <font-awesome-icon :icon="faFileCode" style="color: white;" />
         JSON
         فرمت
      </button>
      <button
        class="px-3 py-2 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:from-orange-500 hover:via-orange-600 hover:to-orange-700 transition duration-300 ease-in-out"
        @click="exportFlowJson">
        <font-awesome-icon :icon="faFileExport" style="color: white;" />
        Export
      </button>
      <span
        class="px-3 py-2 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:from-orange-500 hover:via-orange-600 hover:to-orange-700 transition duration-300 ease-in-out">
        <font-awesome-icon v-if="store.autoSaveEnabled()" :icon="faSave" style="color: white;" />
        <font-awesome-icon v-else :icon="faSave" style="color: red;" />

        ذخیره خودکار: {{ store.autoSaveEnabled() ? 'فعال' : 'غیرفعال' }}
      </span>
      <button
        class="px-3 py-2 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:from-orange-500 hover:via-orange-600 hover:to-orange-700 transition duration-300 ease-in-out"
        @click="toggleAutoSave">
        <font-awesome-icon v-if="store.autoSaveEnabled()" :icon="faLightbulb" style="color: red;" />

        <font-awesome-icon v-else :icon="faLightbulb" style="color: white;" />
        {{ store.autoSaveEnabled() ? 'غیرفعال کردن' : 'فعال کردن' }} ذخیره خودکار
      </button>
    </div>

    <div class="canvas">
      <VueFlow :default-viewport="{ zoom: 0.5 }" :max-zoom="1" :min-zoom="0.8" :nodes="store.nodes" :edges="store.edges"
        style="width: 100%; height: 95vh" @nodes-change="onNodesChange" @edges-change="onEdgesChange"
        @connect="onConnect" @node-dblclick="onNodeDblClick" :node-types="nodeTypes" v-bind="vfOptions"
        class="vue-flow__container">
        <Background variant="dots" gap="15" size="1" color="#bbb" />
        <Panel position="top-center"> </Panel>
        <Controls>
          <ControlButton @click.prevent="toggleTheme">
            <font-awesome-icon :icon="isDark ? faSun : faMoon" />
          </ControlButton>
          <ControlButton @click.prevent="doScreenshot">
            <font-awesome-icon :icon="faCamera" />
          </ControlButton>
          <ControlButton @click.prevent="sortByConnectionOrder">
            <font-awesome-icon :icon="faSortAmountDown" />
          </ControlButton>
        </Controls>
        <MiniMap />
      </VueFlow>
    </div>

    <ServiceModal />.
     <notifications />

  </div>
</template>

<script setup>
import { markRaw, reactive, ref, watch, onMounted } from 'vue'
import { Panel, useVueFlow, VueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls, ControlButton } from '@vue-flow/controls'
import { faCamera, faSun, faMoon, faSortAmountDown, faFileExport, faSave, faLightbulb,faPlus, faFileCode } from '@fortawesome/free-solid-svg-icons'
import { MiniMap } from '@vue-flow/minimap'
import ServiceNode from './nodes/ServiceNode.vue'
import CombinedServiceNode from './nodes/CombinedServiceNode.vue'
// Modal
import ServiceModal from './modals/ServiceModal.vue'

// Store
import { useFlowStore } from '../stores/flowStore'
import { useScreenshot } from '@/hooks/useScreenshot'

const { vueFlowRef } = useVueFlow()
const { capture } = useScreenshot()
const isDark = ref(false)
// Register node components
const nodeTypes = {
  serviceNode: markRaw(ServiceNode),
  combinedServiceNode: markRaw(CombinedServiceNode),
}
import { notify } from "@kyvg/vue3-notification";


const store = useFlowStore()

const vfOptions = reactive({
  fitView: true,
})

onMounted(() => {
  const saved = localStorage.getItem('theme')
  if (saved === 'dark') {
    isDark.value = false
  } else if (saved === 'light') {
    isDark.value = false
  } else {
    isDark.value = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  updateBodyClass()
})
watch(isDark, () => {
  updateBodyClass()
})

function updateBodyClass() {
  const container = document.querySelector('.vue-flow__container')
  if (!container) return
  if (isDark.value) {
    container.classList.add('dark-mode')
    container.classList.remove('light-mode')
  } else {
    container.classList.add('light-mode')
    container.classList.remove('dark-mode')
  }
}
function toggleAutoSave() {
  if (store.autoSaveEnabled()) {
    store.disableAutoSave()
  } else {
    store.enableAutoSave()
  }
}

function sortByConnectionOrder() {
  function getLastNumber(id) {
    const parts = id.split('-')
    return Number(parts[parts.length - 1]) || 0
  }

  // Sort nodes by last number of their ID
  const sortedNodes = [...store.nodes].sort((a, b) => {
    return getLastNumber(a.id) - getLastNumber(b.id)
  })

  // Layout parameters for horizontal layout
  const startX = 100
  const startY = 200
  const gapX = 250

  sortedNodes.forEach((node, index) => {
    node.position = { x: startX + index * gapX, y: startY }
  })

  // Update the store nodes reactively with new order & positions
  store.nodes = [...sortedNodes]
}
function toggleTheme() {
  isDark.value = !isDark.value
  console.log(isDark.value, 'isDark')
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
  updateBodyClass()
}
function onAddService() {
  const position = { x: 200 + Math.random() * 60, y: 150 + Math.random() * 60 }
  const newNode = store.addNode({
    position,
    label: 'سرویس ' + (store.nodes.length + 1),
    fields: [],
  })
  store.setSelectedNode(newNode.id, 'edit')
}

function viewAllJson() {
  const payload = store.exportFlow()
  window.navigator.clipboard?.writeText(JSON.stringify(payload, null, 2))
  notify({
  title: "کپی شد",
  text: "Flow JSON کپی شد.",
  type: "success"
  });
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
  console.log('onConnect', evt)
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

function doScreenshot() {
  if (!vueFlowRef.value) {
    console.warn('VueFlow element not found')
    return
  }
  capture(vueFlowRef.value, { shouldDownload: true, type: 'png' })
}
</script>

<style scoped>
.flow-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
}

/* .toolbar {
  position: fixed;
  display: flex;
  top: 10px;
  gap: 8px;
  z-index: 999;
} */
.toolbar {
  position: fixed;
  display: flex;
  gap: 8px;
  z-index: 999;
  bottom: 19px;
  right: 20px;
}

.canvas {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

/* styles.css or in your component style */

/* Optional: style your button */
.control-button {
  cursor: pointer;
  background: transparent;
  border: none;
  font-size: 1.5rem;
  color: inherit;
  padding: 0.5rem;
}
</style>
