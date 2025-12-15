<template>
  <div class="flow-wrapper">
    <div class="toolbar">
      <router-link to="/services" class="px-3 py-2 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 text-white font-semibold rounded-xl shadow-lg hover:from-blue-500 hover:via-blue-600 hover:to-blue-700 transition duration-300 ease-in-out" title="مدیریت سرویس‌ها">
        <font-awesome-icon :icon="faTools" style="color: white" />
        <span class="toolbar-text">مدیریت سرویس‌ها</span>
      </router-link>
      <button
        class="px-3 py-2 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:from-orange-500 hover:via-orange-600 hover:to-orange-700 transition duration-300 ease-in-out"
        @click="onAddService">
        <font-awesome-icon :icon="faPlus" style="color: white" />
        <span class="toolbar-text">اضافه کردن سرویس</span>
      </button>
      <button
        class="px-3 py-2 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:from-orange-500 hover:via-orange-600 hover:to-orange-700 transition duration-300 ease-in-out"
        @click="viewAllJson">
        <font-awesome-icon :icon="faFileCode" style="color: white;" />
        <span class="toolbar-text"> JSON
         فرمت
        </span>
      </button>
      <button
        class="px-3 py-2 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:from-orange-500 hover:via-orange-600 hover:to-orange-700 transition duration-300 ease-in-out"
        @click="exportFlowJson">
        <font-awesome-icon :icon="faFileExport" style="color: white;" />
        <span class="toolbar-text">Export</span>
      </button>
      <span
        class="px-3 py-2 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:from-orange-500 hover:via-orange-600 hover:to-orange-700 transition duration-300 ease-in-out">
        <font-awesome-icon v-if="store.autoSaveEnabled()" :icon="faSave" style="color: white;" />
        <font-awesome-icon v-else :icon="faSave" style="color: red;" />
        <span class="toolbar-text">ذخیره خودکار: {{ store.autoSaveEnabled() ? 'فعال' : 'غیرفعال' }}</span>
      </span>
      <button
        class="px-3 py-2 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:from-orange-500 hover:via-orange-600 hover:to-orange-700 transition duration-300 ease-in-out"
        @click="toggleAutoSave">
        <font-awesome-icon v-if="store.autoSaveEnabled()" :icon="faLightbulb" style="color: red;" />
        <font-awesome-icon v-else :icon="faLightbulb" style="color: white;" />
        <span class="toolbar-text">{{ store.autoSaveEnabled() ? 'غیرفعال کردن' : 'فعال کردن' }} ذخیره خودکار</span>
      </button>
    </div>

    <div class="canvas">
      <VueFlow
        :default-viewport="{ x: 0, y: 0, zoom: 0.25 }"
        :max-zoom="2"
        :min-zoom="0.05"
        :nodes="store.nodes"
        :edges="store.edges"
        :zoom-on-scroll="true"
        :fit-view-on-init="true"
        :zoom-on-double-click="false"
        :pan-on-drag="true"
        :pan-on-scroll="true"
        :pan-on-scroll-speed="0.8"
        :pan-on-scroll-mode="true"
        :selection-on-click="false"
        style="width: 100%; height: 100vh"
        @nodes-change="onNodesChange"
        @edges-change="onEdgesChange"
        @connect="onConnect"
        @node-dblclick="onNodeDblClick"
        :node-types="nodeTypes"
        v-bind="vfOptions"
        class="vue-flow__container"
      >
        <Background variant="dots" gap="25" size="3" color="#bbb" />
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
    <ConnectionStepModal />
     <notifications />

  </div>
</template>

<script setup>
import { markRaw, reactive, ref, watch, onMounted } from 'vue'
import { Panel, useVueFlow, VueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls, ControlButton } from '@vue-flow/controls'
import { faCamera, faSun, faMoon, faSortAmountDown, faFileExport, faSave, faLightbulb,faPlus, faFileCode, faTools } from '@fortawesome/free-solid-svg-icons'
import { MiniMap } from '@vue-flow/minimap'
import ServiceNode from './nodes/ServiceNode.vue'
import CombinedServiceNode from './nodes/CombinedServiceNode.vue'
import DecisionNode from './nodes/DecisionNode.vue'
// Modal
import ServiceModal from './modals/ServiceModal.vue'
import ConnectionStepModal from './modals/ConnectionStepModal.vue'

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
  decisionNode: markRaw(DecisionNode),
}
import { notify } from "@kyvg/vue3-notification";


const store = useFlowStore()

const vfOptions = reactive({
  fitView: true,
})

onMounted(async () => {
  const saved = localStorage.getItem('theme')
  if (saved === 'dark') {
    isDark.value = false
  } else if (saved === 'light') {
    isDark.value = false
  } else {
    isDark.value = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  updateBodyClass()
  await store.loadAggregates()
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
/**
 * Handle adding a new service node
 * Creates a local node only (no API call yet)
 * API call will happen when user clicks "Add Field" in the modal
 */
function onAddService() {
  const position = { x: 200 + Math.random() * 60, y: 150 + Math.random() * 60 }
  const newNode = store.addNodeLocal({
    position,
    label: 'سرویس ' + (store.nodes.length + 1),
    serviceName: 'سرویس ' + (store.nodes.length + 1),
    url: '',
    method: 'GET',
    type: 'REST',
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

async function onEdgesChange(changes) {
  for (const change of changes) {
    if (change.type === 'remove') {
      await store.deleteEdge(change.id)
    } else if (change.type === 'update') {
      await store.updateEdge(change.id, change.data || {})
    }
  }
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
  gap: 10px;
  z-index: 1000;
  bottom: 20px;
  right: 20px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(5px);
  border: 1px solid #e2e8f0;
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
.toolbar-text {
  display: inline;
  white-space: nowrap;
}

.toolbar button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  min-width: 40px;
  height: 40px;
}

.toolbar button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  filter: brightness(1.05);
}

@media (max-width: 768px) {
  .toolbar {
    bottom: 10px;
    right: 10px;
    padding: 6px 8px;
  }

  .toolbar button {
    padding: 6px 10px;
    height: 36px;
    font-size: 13px;
  }

  .toolbar-text {
    display: none;
  }
}
</style>
