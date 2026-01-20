<template>
  <div class="aggregate-flow-editor">
    <!-- Header Toolbar -->
    <div class="toolbar">
      <LogoutButton />
      <router-link to="/aggregates"
        class="px-3 py-2 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 text-white font-semibold rounded-xl shadow-lg hover:from-blue-500 hover:via-blue-600 hover:to-blue-700 transition duration-300 ease-in-out">
        <font-awesome-icon :icon="faArrowLeft" style="color: white" />

        <span class="toolbar-text">بازگشت به لیست</span>
      </router-link>
      <router-link to="/services"
        class="px-3 py-2 bg-gradient-to-r from-blue-400 via-blue-500
        to-blue-600 text-white font-semibold rounded-xl shadow-lg
        hover:from-blue-500 hover:via-blue-600 hover:to-blue-700
        transition duration-300 ease-in-out">
        <font-awesome-icon :icon="faArrowRight" style="color: white" />
        <span class="toolbar-text"> لیست سرویس ها</span>
      </router-link>
      <button
        class="px-3 py-2 bg-gradient-to-r from-green-400 via-green-500
        to-green-600 text-white font-semibold rounded-xl shadow-lg
        hover:from-green-500 hover:via-green-600 hover:to-green-700
        transition duration-300 ease-in-out"
        @click="onAddStep">
        <font-awesome-icon :icon="faPlus" style="color: white" />
        <span class="toolbar-text">Step ایجاد</span>
      </button>

      <button
        class="px-3 py-2 bg-gradient-to-r from-orange-400 via-orange-500
        to-orange-600 text-white font-semibold rounded-xl shadow-lg
        hover:from-orange-500 hover:via-orange-600 hover:to-orange-700
        transition duration-300 ease-in-out"
        @click="fitView">
        <font-awesome-icon :icon="faExpand" style="color: white" />
        <span class="toolbar-text"> تنظیم اندازه</span>
      </button>
    </div>

    <!-- Main Content Area -->
    <div class="editor-container">
      <!-- Mobile Sidebar Toggle Button -->
      <button v-if="showMobileSidebarToggle" class="sidebar-toggle-btn" @click="isSidebarOpen = !isSidebarOpen"
        :aria-label="isSidebarOpen ? 'بستن منو' : 'باز کردن منو'">
        <font-awesome-icon :icon="faBars" />
      </button>

      <!-- Sidebar Overlay (Mobile only) -->
      <div v-if="isSidebarOpen && showMobileSidebarToggle" class="sidebar-overlay" @click="isSidebarOpen = false"></div>

      <!-- Left Sidebar: Available Services -->
      <div class="sidebar"
        :class="{ 'sidebar-open': isSidebarOpen, 'sidebar-hidden': !isSidebarOpen && showMobileSidebarToggle }">
        <div class="sidebar-header">
          <h3>سرویس‌های موجود</h3>
          <p class="sidebar-subtitle">
            <span class="desktop-hint">برای اضافه کردن، سرویس را به Canvas بکشید</span>
            <span class="mobile-hint">برای اضافه کردن، روی سرویس دوبار کلیک کنید</span>
          </p>
        </div>
        <div v-if="isLoadingServices" class="loading-services">
          <div class="spinner-small"></div>
          <p>در حال بارگذاری...</p>
        </div>
        <div v-else-if="services.length === 0" class="empty-services">
          <p>هیچ سرویسی موجود نیست</p>
        </div>
        <div v-else class="services-list">
          <div v-for="service in services.items" :key="service.id" class="service-card" :draggable="true"
            @dragstart="onDragStart($event, service)" @dragend="onDragEnd" @dblclick="onServiceDoubleClick(service)">
            <div class="service-card-header">
              <strong>{{ service.name }}</strong>
            </div>
            <div class="service-card-body">
              <div class="service-meta">
                <span class="method-badge" :class="service.method?.toLowerCase()">
                  {{ service.method || 'GET' }}
                </span>
                <span class="type-badge">{{ service.type || 'REST' }}</span>
              </div>
              <div class="service-url" :title="service.url">
                {{ truncateUrl(service.url) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Canvas: Vue Flow -->
      <div class="canvas-container">
        <VueFlow ref="vueFlowRef" :default-viewport="{ x: 0, y: 0, zoom: 0.8 }" :max-zoom="2" :min-zoom="0.1"
          :nodes="store.nodes" :edges="store.edges" :zoom-on-scroll="true" :fit-view-on-init="true" :pan-on-drag="true"
          :pan-on-scroll="true" :pan-on-scroll-speed="0.8" :selection-on-click="false" class="vue-flow-container"
          @nodes-change="onNodesChange" @edges-change="onEdgesChange" @connect="onConnect"
          @node-dblclick="onNodeDblClick" @drop="onDrop" @dragover="onDragOver" :node-types="nodeTypes">
          <Background variant="dots" :gap="25" :size="3" color="orange"/>
          <Panel position="top-center"></Panel>
          <Controls>
            <ControlButton @click.prevent="toggleTheme">
              <font-awesome-icon :icon="isDark ? faSun : faMoon" />
            </ControlButton>
            <ControlButton @click.prevent="doScreenshot">
              <font-awesome-icon :icon="faCamera" />
            </ControlButton>
            <!-- <ControlButton @click.prevent="sortByConnectionOrder">
            <font-awesome-icon :icon="faSortAmountDown" />
            </ControlButton> -->
          </Controls>
          <MiniMap />
        </VueFlow>
      </div>
    </div>

    <!-- Modals -->
    <StepModal ref="stepModalRef" />
    <StepEditModal :show="store.showModal && store.modalMode === 'edit'" :step-id="store.selectedNode" mode="edit"
      @update:show="(val) => { if (!val) store.clearSelected() }" @saved="handleStepSaved" />
    <notifications />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, markRaw, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls, ControlButton } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import { notify } from '@kyvg/vue3-notification'
import { useFlowStore } from '@/stores/flowStore'
import serviceAggregatorClient from '@/utils/service-aggregator-client'
import LogoutButton from '@/components/LogoutButton.vue'
import StepModal from '@/components/modals/StepModal.vue'
import StepEditModal from '@/components/modals/StepEditModal.vue'
import ServiceNode from '@/components/nodes/ServiceNode.vue'
import DecisionNode from '@/components/nodes/DecisionNode.vue'
import EndNode from '@/components/nodes/EndNode.vue'
import StartNode from '@/components/nodes/StartNode.vue'
import { faCamera, faSun, faMoon, faPlus, faBars, faArrowLeft, faArrowRight, faExpand } from '@fortawesome/free-solid-svg-icons'
import { useScreenshot } from '@/hooks/useScreenshot'
const vueFlowInstance = useVueFlow()
const { fitView: fitViewFlow, onNodeDragStop } = vueFlowInstance
const screenToFlowCoordinate = (vueFlowInstance as any).screenToFlowCoordinate
const { capture } = useScreenshot()
const route = useRoute()
const router = useRouter()
const store = useFlowStore()
const vueFlowRef = ref<any>(null)
const stepModalRef = ref<InstanceType<typeof StepModal> | null>(null)
const isDark = ref(false);
const services = ref<any[]>([])
const isLoadingServices = ref(false)
const draggedService = ref<any>(null)
const isSidebarOpen = ref(true) // Default to open
const showMobileSidebarToggle = ref(false)

// Register node types
const nodeTypes = {
  serviceNode: markRaw(ServiceNode),
  decisionNode: markRaw(DecisionNode),
  startNode : markRaw(StartNode),
  endNode: markRaw(EndNode),
}
function sortByConnectionOrder() {
  // Use the same layout function from the store
  store.applyConnectionOrderLayout()
}
// Check screen size on mount and resize
const checkScreenSize = () => {
  const isMobile = window.innerWidth < 1024
  showMobileSidebarToggle.value = isMobile
  // On mobile, start with sidebar closed; on desktop, always open
  if (!isMobile) {
    isSidebarOpen.value = true // Always show on desktop
  }
}

function doScreenshot() {
  if (!vueFlowRef.value) {
    console.warn('VueFlow element not found')
    return
  }
  capture(vueFlowRef.value, { shouldDownload: true, type: 'png' })
}
function toggleTheme() {
  isDark.value = !isDark.value
  console.log(isDark.value, 'isDark')
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
  updateBodyClass()
}


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
const truncateUrl = (url: string | null | undefined): string => {
  if (!url) return 'بدون URL'
  return url.length > 40 ? url.slice(0, 37) + '...' : url
}

const loadServices = async () => {
  isLoadingServices.value = true
  try {
    const data = await serviceAggregatorClient.getServices()
    services.value = data ? data : []
  } catch (error) {
    console.error('Error loading services:', error)
    notify({
      title: 'خطا',
      text: 'خطا در بارگذاری سرویس‌ها',
      type: 'error',
    })
  } finally {
    isLoadingServices.value = false
  }
}

const loadAggregateFlow = async (aggregateId: string) => {
  debugger
  try {
    store.currentAggregateId = aggregateId

    // Load the aggregate flow (positions come from backend)
    await store.loadSingleAggregateFlow(aggregateId)

    // Rebuild edges from persistent storage to restore connections that may have been lost
    // This ensures edges survive backend resets and page reloads
    store.rebuildEdgesFromPersistent()

    // Fit view after loading
    await nextTick()
    setTimeout(() => {
      fitView()
    }, 300)
  } catch (error) {
    console.error('Error loading aggregate flow:', error)
    notify({
      title: 'خطا',
      text: 'خطا در بارگذاری Aggregate',
      type: 'error',
    })
  }
}

const onDragStart = (event: DragEvent, service: any) => {
  debugger
  console.log(service, 'service onDragStart')
  console.log(event.dataTransfer, 'event.dataTransfer onDragStart')
  console.log(draggedService.value, 'event onDragStart')
  draggedService.value = service
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData('application/json', JSON.stringify(service))
  }
}

const onDragEnd = () => {
  draggedService.value = null
}

const onDragOver = (event: DragEvent) => {
  debugger
  event.preventDefault()
  if (event.dataTransfer) {

    console.log(event.dataTransfer, 'draggedService onDrop')
    event.dataTransfer.dropEffect = 'copy'
  }
}

const onDrop = async (event: DragEvent) => {
  debugger
  console.log(draggedService.value, 'draggedService')
  event.preventDefault()

  if (!draggedService.value) {
    // Try to get from dataTransfer
    try {
      const data = event.dataTransfer?.getData('application/json')
      if (data) {
        draggedService.value = JSON.parse(data)
        console.log(draggedService.value, 'draggedService onDrop')
      }
    } catch (e) {
      console.error('Failed to parse dropped data:', e)
      return
    }
  }

  if (!draggedService.value) return

  // Get drop position in flow coordinates
  let dropPosition = { x: 100, y: 100 } // Default position
  if (event && screenToFlowCoordinate) {
    try {
      const flowPosition = screenToFlowCoordinate({
        x: event.clientX,
        y: event.clientY,
      })
      dropPosition = { x: flowPosition.x, y: flowPosition.y }
    } catch (e) {
      console.warn('Failed to convert drop position to flow coordinates, using default:', e)
    }
  }

  // Open StepModal with pre-filled service and drop position
  const aggregateId = route.params.id as string
  if (stepModalRef.value) {
    stepModalRef.value.openModal('add', {
      aggregateId: aggregateId,
      serviceId: draggedService.value.id,
      stepName: draggedService.value.name || 'New Step',
      positionX: dropPosition.x,
      positionY: dropPosition.y,

    })
  }

  draggedService.value = null
}

const onServiceDoubleClick = (service: any) => {
  // Open StepModal with pre-filled service (useful for mobile where drag-drop is difficult)
  // Use default position since no drop occurred
  const aggregateId = route.params.id as string
  if (stepModalRef.value) {
    stepModalRef.value.openModal('add', {
      aggregateId: aggregateId,
      serviceId: service.id,
      stepName: service.name || 'New Step',
      positionX: 100,
      positionY: 100,
    })
  }
}

const onAddStep = () => {
  const aggregateId = route.params.id as string
  // Use default position (100, 100) when adding step via button click
  if (stepModalRef.value) {
    stepModalRef.value.openModal('add', {
      aggregateId: aggregateId,
      positionX: 100,
      positionY: 100,
    })
  }
}

// Listen to node drag stop event to save positions to backend
onNodeDragStop((event) => {
  const aggregateId = route.params.id as string
  if (!aggregateId) return

  const node = event.node
  if (!node || !node.data?.aggregateStepId) {
    // No step ID, skip backend save (might be a placeholder node)
    return
  }

  // Get existing connection data to preserve connections during position update
  // Use node's current data if available, otherwise get from persistent edges
  let nextStepId = node.data.nextStepId || null
  let trueStepId = node.data.trueStepId || null
  let falseStepId = node.data.falseStepId || null

  // If not in node data, try to get from persistent edges
  if (!nextStepId) {
    const existingOutgoingEdge = store.persistentEdges.find(edge => edge.source === node.id)
    if (existingOutgoingEdge) {
      const targetNode = store.nodes.find(n => n.id === existingOutgoingEdge.target)
      nextStepId = targetNode?.data?.aggregateStepId || null
    }
  }

  // Save to backend with full payload as required by API
  const updatePosition = async () => {
    try {
      const payload = {
        id: node.data.aggregateStepId,
        stepName: node.data.stepName || '',
        aggregateId: aggregateId,
        serviceId: node.data.serviceId || null,
        nextStepId: nextStepId,
        trueStepId: trueStepId,
        falseStepId: falseStepId,
        condition: node.data.condition || '',
        conditionParameters: node.data.conditionParameters || '',
        status: node.data.status !== undefined ? node.data.status : true,
        positionX: Math.round(node.position.x),
        positionY: Math.round(node.position.y),
      }

      await serviceAggregatorClient.updateAggregateStep(payload)
    } catch (error) {
      console.error('Failed to save node position to backend:', error)
      notify({
        title: 'خطا',
        text: 'خطا در ذخیره موقعیت Node',
        type: 'error',
      })
    }
  }

  updatePosition()
})
// const aggregateId = route.params.id as string
// if (!aggregateId) return

// const node = event.node
// if (!node || !node.data?.aggregateStepId) {
//   // No step ID, skip backend save (might be a placeholder node)
//   return
// }
// // Save to backend
// const updatePosition = async () => {
//   try {
//     const payload = {
//       id: node.data.aggregateStepId,
//       stepName: node.data.stepName || '',
//       aggregateId: aggregateId,
//       serviceId: node.data.serviceId || null,
//       nextStepId: node.data.nextStepId || null,
//       trueStepId: node.data.trueStepId || null,
//       falseStepId: node.data.falseStepId || null,
//       condition: node.data.condition || '',
//       conditionParameters: node.data.conditionParameters || '',
//       status: node.data.status !== undefined ? node.data.status : true,
//       positionX: Math.round(node.position.x),
//       positionY: Math.round(node.position.y),
//     }
//     await serviceAggregatorClient.updateAggregateStep(payload)
//   } catch (error) {
//     console.error('Failed to save node position to backend:', error)
//     notify({
//       title: 'خطا',
//       text: 'خطا در ذخیره موقعیت Node',
//       type: 'error',
//     })
//   }
// }
// updatePosition()

const onNodesChange = (changes: any[]) => {
  // Handle node changes if needed (for other operations)
}

const onEdgesChange = (changes: any[]) => {
  // Handle edge changes if needed
}

const onConnect = (params: any) => {
  store.handleConnect(params)
}

const onNodeDblClick = (event: any) => {
  const nodeId = event.node?.id
  if (nodeId) {
    store.setSelectedNode(nodeId, 'edit')
  }
}

const fitView = () => {
  if (fitViewFlow) {
    fitViewFlow()
  }
}

const applyLayout = () => {
  store.applyConnectionOrderLayout()
  setTimeout(() => {
    fitView()
  }, 300)
}

const handleStepSaved = async () => {
  const aggregateId = route.params.id as string
  // Reload the flow to show the new step
  await loadAggregateFlow(aggregateId)
}

// Watch for step modal open signal from store
watch(() => store.stepModalOpen, (newVal) => {
  if (newVal && stepModalRef.value) {
    // Clone initial data - use JSON method because structuredClone fails with some objects
    // eslint-disable-next-line prefer-structured-clone
    const initialData = store.stepModalInitialData
      ? JSON.parse(JSON.stringify(store.stepModalInitialData))
      : {}
    store.stepModalOpen = false
    stepModalRef.value.openModal('add', initialData)
  }
})

onMounted(async () => {
  checkScreenSize()
  window.addEventListener('resize', checkScreenSize)

  const aggregateId = route.params.id as string
  if (!aggregateId) {
    notify({
      title: 'خطا',
      text: 'Aggregate ID یافت نشد',
      type: 'error',
    })
    router.push('/aggregates')
    return
  }

  await Promise.all([
    loadServices(),
    loadAggregateFlow(aggregateId),
  ])
})

// Cleanup resize listener
onBeforeUnmount(() => {
  window.removeEventListener('resize', checkScreenSize)
})
</script>

<style scoped>
.aggregate-flow-editor {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.toolbar-text {
  margin-right: 8px;
}

.editor-container {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 300px;
  background: white;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #e2e8f0;
}

.sidebar-header h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
}

.sidebar-subtitle {
  margin: 0;
  font-size: 12px;
  color: #7f8c8d;
}

.desktop-hint {
  display: inline;
}

.mobile-hint {
  display: none;
}

@media (max-width: 1024px) {
  .desktop-hint {
    display: none;
  }

  .mobile-hint {
    display: inline;
  }
}

.loading-services,
.empty-services {
  padding: 40px 20px;
  text-align: center;
  color: #7f8c8d;
}

.spinner-small {
  width: 30px;
  height: 30px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 10px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.services-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.service-card {
  background: #f8f9fa;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 10px;
  cursor: grab;
  transition: all 0.2s ease;
  user-select: none;
  -webkit-user-select: none;
}

.service-card:active {
  cursor: grabbing;
}

/* Show visual feedback on mobile for double-click */
@media (max-width: 1024px) {
  .service-card {
    cursor: pointer;
  }

  .service-card:active {
    background: #e0e7ff;
    transform: scale(0.98);
  }
}

.service-card:hover {
  background: #e8f0f8;
  border-color: #007bff;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.2);
}

.service-card-header {
  margin-bottom: 8px;
}

.service-card-header strong {
  font-size: 14px;
  color: #2c3e50;
}

.service-card-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.service-meta {
  display: flex;
  gap: 6px;
  align-items: center;
}

.method-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: white;
}

.method-badge.get {
  background: #007bff;
}

.method-badge.post {
  background: #28a745;
}

.method-badge.put {
  background: #ffc107;
  color: #333;
}

.method-badge.delete {
  background: #dc3545;
}

.method-badge.patch {
  background: #17a2b8;
}

.type-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  background: #6c757d;
  color: white;
}

.service-url {
  font-size: 11px;
  color: #6c757d;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.canvas-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.vue-flow-container {
  width: 100%;
  height: 100%;
}

/* Sidebar Toggle Button (Mobile) */
.sidebar-toggle-btn {
  position: fixed;
  top: 70px;
  left: 10px;
  z-index: 1001;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: white;
  color: #2c3e50;
  cursor: pointer;
  display: none;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.sidebar-toggle-btn:hover {
  background: #f8f9fa;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Sidebar Overlay (Mobile) */
.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: none;
}

/* Responsive Styles */
/* Tablet */
@media (max-width: 1024px) {
  .sidebar {
    width: 280px;
  }

  .sidebar-header {
    padding: 16px;
  }

  .sidebar-header h3 {
    font-size: 16px;
  }

  .service-card {
    padding: 10px;
  }

  .service-card-header strong {
    font-size: 13px;
  }
}

/* Mobile */
@media (max-width: 768px) {
  .sidebar-toggle-btn {
    display: flex;
  }

  .sidebar-overlay {
    display: block;
  }

  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    width: 280px;
    max-width: 85vw;
    z-index: 1000;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  }

  .sidebar.sidebar-open {
    transform: translateX(0);
  }

  .sidebar.sidebar-hidden {
    transform: translateX(-100%);
  }

  .toolbar {
    flex-wrap: wrap;
    padding: 8px 10px;
    gap: 8px;
  }

  .toolbar-text {
    display: none;
  }

  .toolbar button,
  .toolbar a {
    padding: 6px 10px;
    font-size: 12px;
  }

  .sidebar-header {
    padding: 16px;
  }

  .sidebar-header h3 {
    font-size: 16px;
    margin-bottom: 6px;
  }

  .sidebar-subtitle {
    font-size: 11px;
  }

  .service-card {
    padding: 10px;
    margin-bottom: 8px;
  }

  .service-card-header strong {
    font-size: 13px;
  }

  .method-badge,
  .type-badge {
    font-size: 10px;
    padding: 3px 6px;
  }

  .service-url {
    font-size: 10px;
  }

  .canvas-container {
    width: 100%;
  }
}

/* Small Mobile */
@media (max-width: 480px) {
  .sidebar {
    width: 100%;
    max-width: 100vw;
  }

  .sidebar-toggle-btn {
    width: 36px;
    height: 36px;
    top: 60px;
    left: 8px;
  }

  .toolbar {
    padding: 6px 8px;
  }

  .toolbar button,
  .toolbar a {
    padding: 5px 8px;
    font-size: 11px;
    min-width: 32px;
    height: 32px;
  }
}
</style>
