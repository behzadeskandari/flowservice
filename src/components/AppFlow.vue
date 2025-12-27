<template>
  <div class="flow-wrapper">
    <div class="toolbar">
      <LogoutButton />
      <select
        style="direction: rtl"
        v-model="store.currentAggregateId"
        class="px-3 py-2 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-black font-semibold rounded-xl shadow-lg hover:from-orange-500 hover:via-orange-600 hover:to-orange-700 transition duration-300 ease-in-out"
        @change="onAggregateChange"
      >
        <option value="" disabled  class="bg-white text-gray-800">انتخاب Aggregate</option>
        <option
          v-for="aggregate in store.aggregates"
          :key="aggregate.id"
          :value="aggregate.id"
           class="bg-white text-gray-800  from-orange-400"
        >
          {{ aggregate.name || `Aggregate ${aggregate.id}` }}
        </option>
      </select>
      <router-link to="/services" class="px-3 py-2 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 text-white font-semibold rounded-xl shadow-lg hover:from-blue-500 hover:via-blue-600 hover:to-blue-700 transition duration-300 ease-in-out" title="مدیریت سرویس‌ها">
        <font-awesome-icon :icon="faTools" style="color: white" />
        <span class="toolbar-text">مدیریت سرویس‌ها</span>
      </router-link>
      <button
        class="px-3 py-2 bg-gradient-to-r from-green-400 via-green-500 to-green-600 text-white font-semibold rounded-xl shadow-lg hover:from-green-500 hover:via-green-600 hover:to-green-700 transition duration-300 ease-in-out"
        @click="onAddStep">
        <font-awesome-icon :icon="faPlus" style="color: white" />
        <span class="toolbar-text">Step ایجاد </span>
      </button>
      <button
        class="px-3 py-2 bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:from-indigo-600 hover:via-indigo-700 hover:to-indigo-800 transition duration-300 ease-in-out"
        @click="onCreateAggregate"
        title="ایجاد Aggregate جدید">
        <font-awesome-icon :icon="faPlus" style="color: white" />
        <span class="toolbar-text">Aggregate ایجاد </span>
      </button>
      <!-- <button
        class="px-3 py-2 bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:from-purple-500 hover:via-purple-600 hover:to-purple-700 transition duration-300 ease-in-out"
        @click="onAddServiceStep"
        title="اضافه کردن سرویس موجود به عنوان یک Step">
        <font-awesome-icon :icon="faPlus" style="color: white" />
        <span class="toolbar-text">اضافه کردن سرویس</span>
      </button> -->
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
        class="px-3 py-2 bg-gradient-to-r from-grey-400 via-gray-400 to-gray-400 text-white font-semibold rounded-xl shadow-lg hover:from-grey-400 hover:via-gray-400 hover:to-gray-400 transition duration-300 ease-in-out">
        <font-awesome-icon v-if="store.autoSaveEnabled()" :icon="faSave" style="color: black;" />
        <font-awesome-icon v-else :icon="faSave" style="color: red;" />
        <span class="toolbar-text text-black">ذخیره خودکار: {{ store.autoSaveEnabled() ? 'فعال' : 'غیرفعال' }}</span>
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

    <ServiceModal />
    <StepModal ref="stepModalRef" />
    <StepEditModal
      :show="store.showModal && store.modalMode === 'edit'"
      :step-id="store.selectedNode"
      mode="edit"
      @update:show="(val) => { if (!val) store.clearSelected() }"
      @saved="handleStepSaved"
    />
    <ConnectionStepModal />
    <AggregateModal
      :show="showAggregateModal"
      :mode="aggregateModalMode"
      @update:show="showAggregateModal = $event"
      @saved="handleAggregateSaved"
    />
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
import EndNode from './nodes/EndNode.vue'
import AggregateNode from './nodes/AggregateNode.vue'
import LogoutButton from '@/components/LogoutButton.vue'
// Modal
import ServiceModal from './modals/ServiceModal.vue'
import ConnectionStepModal from './modals/ConnectionStepModal.vue'
import StepModal from './modals/StepModal.vue'
import StepEditModal from './modals/StepEditModal.vue'
import AggregateModal from './modals/AggregateModal.vue'

// Store
import { useFlowStore } from '../stores/flowStore'
import { useScreenshot } from '@/hooks/useScreenshot'

const { vueFlowRef } = useVueFlow()
const { capture } = useScreenshot()
const isDark = ref(false)
const stepModalRef = ref(null)

// Register node components
const nodeTypes = {
  serviceNode: markRaw(ServiceNode),
  combinedServiceNode: markRaw(CombinedServiceNode),
  decisionNode: markRaw(DecisionNode),
  endNode: markRaw(EndNode),
  // Aggregate node to show aggregate header and allow editing
  aggregateNode: markRaw(AggregateNode),
}
import { notify } from "@kyvg/vue3-notification";


const store = useFlowStore()

const vfOptions = reactive({
  fitView: true,
})

const showAggregateModal = ref(false)
const aggregateModalMode = ref('add')

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

// Watch for step modal open signal from store
watch(() => store.stepModalOpen, (newVal) => {
  if (newVal && stepModalRef.value) {
    // Capture the initial data before resetting the flag
    const initialData = JSON.parse(JSON.stringify(store.stepModalInitialData || {}))
    // Reset the flag first
    store.stepModalOpen = false
    // Then open the modal with the captured data
    stepModalRef.value.openModal('add', initialData)
  }
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
  // Use the same layout function from the store
  store.applyConnectionOrderLayout()
}
function toggleTheme() {
  isDark.value = !isDark.value
  console.log(isDark.value, 'isDark')
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
  updateBodyClass()
}
/**
 * Handle adding a new step to the aggregate
 * First checks if an aggregate exists, if not opens AggregateModal
 * After aggregate is created/exists, opens StepModal for new step
 */
function onAddStep() {
  if (!store.aggregates || store.aggregates.length === 0) {
    // No aggregates exist, open modal to create one
    aggregateModalMode.value = 'add'
    showAggregateModal.value = true
    return
  }

  if (!store.currentAggregateId) {
    // If no aggregate is selected, select the first one
    store.currentAggregateId = store.aggregates[0].id
  }

  // Open StepModal for step creation with the selected aggregate
  stepModalRef.value?.openModal('add', {
    aggregateId: store.currentAggregateId
  })
}

/**
 * Handle adding an existing service as a new step to the aggregate
 * Opens StepModal where user can select from available services
 */
function onAddServiceStep() {
  if (!store.currentAggregateId) {
    // No aggregate exists, open modal to create one
    aggregateModalMode.value = 'add'
    showAggregateModal.value = true
    // After aggregate is created, the handleAggregateSaved will be called
    // We'll let the user manually click the button again to add service
  } else {
    // Aggregate exists, open StepModal for service selection
    stepModalRef.value?.openModal('add', {
      aggregateId: store.currentAggregateId,
      isServiceSelection: true // Flag to indicate service selection mode
    })
  }
}

function onCreateAggregate() {
  aggregateModalMode.value = 'add'
  showAggregateModal.value = true
}

function handleStepSaved() {
  // Reload the flow to reflect any changes
  if (store.currentAggregateId) {
    store.loadAggregateFlow(store.currentAggregateId)
  }
}

function handleAggregateSaved() {
  showAggregateModal.value = false
  // Load the newly created aggregate
  store.loadAggregateFlow(store.currentAggregateId)
  // Now open StepModal for creating the first step
  setTimeout(() => {
    stepModalRef.value?.openModal('add', {
      aggregateId: store.currentAggregateId
    })
  }, 300)
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
  // Find clicked node
  const node = store.nodes.find(n => n.id === id)
  if (!node) return

  // If it's an aggregate node, open AggregateModal in edit mode
  if (node.type === 'aggregateNode') {
    store.currentAggregateId = node.data.aggregateId
    aggregateModalMode.value = 'edit'
    showAggregateModal.value = true
    return
  }

  // Check if it's a combined node (don't edit combined nodes)
  if (node && node.type === 'combinedServiceNode') {
    notify({
      title: 'اطلاع',
      text: 'نمی‌توانید گره‌های ترکیب شده را ویرایش کنید',
      type: 'info',
    })
    return
  }

  // Open ServiceModal for regular and decision nodes
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
    display: flex;
    flex-flow: column;
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
