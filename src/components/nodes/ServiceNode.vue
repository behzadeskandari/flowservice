<template>
  <div>
    <div class="service-node" :class="{
      'node-executing': data.isExecuting,
      'node-completed': executionStatus === 'completed',
      'node-error': executionStatus === 'error',
      'node-idle': executionStatus === 'idle' || !executionStatus
    }" @contextmenu.prevent="onRightClick" @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd"
      @touchmove.passive="onTouchCancel">
      <div class="node-header" @dblclick="openEdit">
        <strong>{{ data.stepName || data.label }}</strong>
        <span v-if="data.isExecuting" class="execution-badge executing">
          <font-awesome-icon :icon="faSpinner" class="icon-spin" />
        </span>
        <span v-else-if="executionStatus === 'completed'" class="execution-badge completed">
          ✓
        </span>
        <span v-else-if="executionStatus === 'error'" class="execution-badge error">
          ✕
        </span>
      </div>

      <div class="node-body">
        <small class="meta">مرحله: {{ data.stepName || data.label }}</small>
        <small class="meta">سرویس: {{ data.serviceName || 'بدون سرویس' }}</small>
        <small class="meta" v-if="data.conditionParameters">پارامترها: {{ data.conditionParameters }}</small>
        <div v-if="data.executionError" class="execution-error">
          <small>خطا: {{ data.executionError }}</small>
        </div>
        <div v-if="data.executionResult" class="execution-result">
          <small>نتیجه: {{ data.executionResult }}</small>
        </div>
        <div v-if="data.mappings && data.mappings.length" class="mappings">
          <div v-for="m in data.mappings" :key="m.id || m.targetField" class="map-row">
            <span class="map-target">{{ m.targetField || '-' }}</span>
            <span class="map-dir">←</span>
            <span class="map-source">{{ m.sourceField || m.value || m.source || '-' }}</span>
            <span class="map-source">{{ m.source }}</span>
          </div>
        </div>
      </div>
      <!-- connectors -->
      <Handle type="target" position="top" id="in" class="vue-flow__handle-target" />
      <Handle type="source" position="bottom" id="out" class="vue-flow__handle-source" />

      <!-- Service field ports: inputs on the left, outputs on the right.
           Each port is its own row: Handle on the correct side + label next to it. -->
      <!-- <div v-if="nodeInputs.length || nodeOutputs.length" class="node-ports">
        <div v-if="nodeInputs.length" class="node-ports__column">
          <div
            v-for="f in nodeInputs"
            :key="'in-' + f.handleId"
            class="port-row"
          >
            <Handle
              :id="f.handleId"
              type="target"
              position="left"
              class="port-handle"
            />
            <span class="port-label">{{ f.original.type }}</span>
            <span class="port-label">{{ f.name }}</span>
          </div>
        </div>
        <div v-if="nodeOutputs.length" class="node-ports__column node-ports__column--outputs">
          <div
            v-for="f in nodeOutputs"
            :key="'out-' + f.handleId"
            class="port-row"
          >
            <span class="port-label">{{ f.name }}</span>
            <Handle
              :id="f.handleId"
              type="source"
              position="right"
              class="port-handle"
            />
          </div>
        </div>
      </div> -->

      <div v-if="nodeInputs.length" class="node-ports__column">
        <div v-for="f in nodeInputs" :key="'in-' + f.handleId" class="NodePort">
          <!-- سطح اول -->
          <div class="port-row">
            <Handle :id="f.handleId" type="target" position="left" class="port-handle" />
            <span class="port-label">{{ f.name }}</span>
            <span v-if="f.type" class="port-type">{{ f.type }}</span>
          </div>

          <!-- فقط فرزندان Array/Object -->
          <div v-for="child in uniqueChildren(f)" :key="'in-' + child.handleId" class="port-row port-row--child">
            <Handle :id="child.handleId" type="target" position="left" class="port-handle" />
            <span class="port-label">{{ child.name }}</span>
            <span v-if="child.type" class="port-type">{{ child.type }}</span>
          </div>
        </div>
      </div>
      <div v-if="nodeOutputs.length" class="node-ports__column node-ports__column--outputs">
        <div v-for="f in nodeOutputs" :key="'out-' + f.handleId" class="NodePort">
          <!-- سطح اول -->
          <div class="port-row">
            <span class="port-label">{{ f.name }}</span>
            <span v-if="f.type" class="port-type">{{ f.type }}</span>
            <Handle :id="f.handleId" type="source" position="right" class="port-handle" />
          </div>

          <!-- فقط فرزندان Array/Object -->
          <div v-for="child in uniqueChildren(f)" :key="'out-' + child.handleId" class="port-row port-row--child">
            <span class="port-label">{{ child.name }}</span>
            <span v-if="child.type" class="port-type">{{ child.type }}</span>
            <Handle :id="child.handleId" type="source" position="right" class="port-handle" />
          </div>
        </div>
      </div>
      <!-- <div v-if="nodeInputs.length" class="node-ports__column">
        <div v-for="f in nodeInputs" :key="'in-' + f.handleId" class="NodePort">
         <div class="port-row">
            <Handle :id="f.handleId" type="target" position="left" class="port-handle" />
            <span class="port-label">{{ f.name }}</span>
            <span v-if="f.type" class="port-type">{{ f.type }}</span>
          </div>

          <div v-for="child in (f.children || [])" :key="'in-' + child.handleId" class="port-row port-row--child">
            <Handle :id="child.handleId" type="target" position="left" class="port-handle" />
            <span class="port-label" v-if="child.name != f.name">{{ child.name }}</span>
            <span v-if="child.type" class="port-type">{{ child.type }}</span>
          </div>
        </div>
      </div> -->
      <!-- Context Menu -->
      <div v-if="isContextMenuOpen" ref="menuRef" class="context-menu" :style="contextMenuStyles">
        <ul>
          <li @click="onContextSelect('edit')">
            <font-awesome-icon :icon="faEdit" />
            ویرایش
          </li>
          <li @click="onContextSelect('delete')">
            <font-awesome-icon :icon="faTrash" />
            پاک کردن
          </li>
          <!-- <li @click="onContextSelect('json')">
            <font-awesome-icon :icon="faEye" />
            نمایش بصورت
            JSON
          </li> -->

        </ul>
      </div>
    </div>
    <ConfirmModal :visible="showConfirm" message="آیا از پاک کردن گره مطمئن هستید؟" @confirm="onConfirmDelete"
      @cancel="onCancelDelete" />
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, toRefs, ref, computed, inject } from 'vue'
import { Handle, useVueFlow } from '@vue-flow/core'
import { faEdit, faEye, faTrash, faSpinner } from '@fortawesome/free-solid-svg-icons'
import ConfirmModal from '../modals/ConfirmModal.vue'
import { useFlowStore } from '@/stores/flowStore'
const { removeNodes, removeEdges, edges } = useVueFlow()
import serviceAggregatorClient from '../../utils/service-aggregator-client'
const showConfirm = ref(false)
// import { useEventListener  } from '@vueuse/core'
const props = defineProps({
  id: { type: String, required: true },
  data: { type: Object, required: true },
})
console.log('ServiceNode props data:', props.data)
const { id, data } = toRefs(props)
const store = useFlowStore()

console.log('data store:', data)
// Inject execution status from parent
const parentExecutionStatus = inject('executionStatus', ref({}))

const executionStatus = computed(() => {
  const status = parentExecutionStatus.value?.[id.value]

  // Only show the actual execution status.
  // StartNode and EndNode have their own node components.
  return status || data.value.executionStatus || 'idle'
})

const nodeRef = ref(null)
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
})

const menuRef = ref(null)
const openContextMenuId = ref(null)

// // Compute execution status based on injected executionStatus
// const executionStatus = computed(() => {
//   return parentExecutionStatus.value?.[id.value] || null
// })

const previewFields = computed(() => {
  return data.value.fields ? data.value.fields.slice(0, 3) : []
})
const nodeInputs = computed(() => (store.getNodeAvailableInputs ? store.getNodeAvailableInputs(id.value) : []))
const nodeOutputs = computed(() => (store.getNodeAvailableOutputs ? store.getNodeAvailableOutputs(id.value) : []))
const isContextMenuOpen = computed(() => openContextMenuId.value === id.value)
const contextMenuStyles = computed(() => {
  if (!nodeRef.value) return {}

  const rect = nodeRef.value.getBoundingClientRect()
  return {
    position: 'fixed',
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
    width: '150px',
    zIndex: 9999,
  }
})

console.log('nodeInputs store:', nodeInputs)

function handleClickOutside(event) {
  if (menuRef.value && !menuRef.value.contains(event.target)) {
    contextMenu.value.visible = false
  }
}

onMounted(() => {
  window.addEventListener('click', handleClickOutside)
})
onBeforeUnmount(() => {
  window.removeEventListener('click', handleClickOutside)
})

function openEdit() {
  store.setSelectedNode(id.value, 'edit')
}



function onRightClick(e) {
  e.preventDefault()
  contextMenu.value.visible = true
  openContextMenuId.value = id.value
  // Position context menu at cursor but keep it inside viewport
  const clickX = e.clientX
  const clickY = e.clientY
  const screenW = window.innerWidth
  const screenH = window.innerHeight
  const menuWidth = 150
  const menuHeight = 100

  // Calculate position so menu doesn't overflow screen
  contextMenu.value.x = (clickX + menuWidth > screenW) ? (screenW - menuWidth) : clickX
  contextMenu.value.y = (clickY + menuHeight > screenH) ? (screenH - menuHeight) : clickY
}

let touchTimeout = null
function onTouchStart(e) {
  if (e.touches && e.touches.length === 1) {
    // Only start for a single touch
    touchTimeout = setTimeout(() => {
      e.preventDefault();
      contextMenu.value.visible = true;
      openContextMenuId.value = id.value;
      // Place it near the touch
      const touch = e.touches[0];
      const clickX = touch.clientX
      const clickY = touch.clientY
      const screenW = window.innerWidth
      const screenH = window.innerHeight
      const menuWidth = 150
      const menuHeight = 100
      contextMenu.value.x = (clickX + menuWidth > screenW) ? (screenW - menuWidth) : clickX
      contextMenu.value.y = (clickY + menuHeight > screenH) ? (screenH - menuHeight) : clickY
    }, 500)
  }
}
function onTouchEnd(e) {
  if (touchTimeout) {
    clearTimeout(touchTimeout)
    touchTimeout = null
  }
}
function onTouchCancel(e) {
  if (touchTimeout) {
    clearTimeout(touchTimeout)
    touchTimeout = null
  }
}

async function onContextSelect(action) {
  openContextMenuId.value = null
  contextMenu.value.visible = false
  if (action === 'edit') {
    store.setSelectedNode(id.value, 'edit')
  } else if (action === 'delete') {
    showConfirm.value = true
  } else if (action === 'json') {
    store.setSelectedNode(id.value, 'view')
  }
}

async function onConfirmDelete() {
  try {
    const stepId =
      typeof id.value === 'string' && id.value.startsWith('node-')
    ? id.value.slice('node-'.length)
    : id.value
    // ۱. فراخوانی API حذف
    await serviceAggregatorClient.deleteAggregateStep(stepId)

    // ۲. حذف یال‌های متصل به این گره از Vue Flow
    const connectedEdges = edges.value.filter(
      (edge) => edge.source === id.value || edge.target === id.value
    )
    if (connectedEdges.length > 0) {
      removeEdges(connectedEdges.map((e) => e.id))
    }

    // ۳. حذف گره از Vue Flow
    removeNodes([id.value])

    // ۴. آپدیت استور (در صورت وجود متد removeNode)
    if (typeof store.removeNode === 'function') {
      store.removeNode(id.value)
    }

    showConfirm.value = false
  } catch (error) {
    console.error('خطا در حذف گام:', error)
  }
}

// async function onContextSelect(action) {
//   openContextMenuId.value = null
//   contextMenu.value.visible = false
//   if (action === 'edit') {
//     store.setSelectedNode(id.value, 'edit')
//   } else if (action === 'delete') {
//     showConfirm.value = true
//     await serviceAggregatorClient.deleteAggregateStep(id.value);

//   } else if (action === 'json') {
//     store.setSelectedNode(id.value, 'view')
//   }
// }

// async function onConfirmDelete() {
//    await serviceAggregatorClient.deleteAggregateStep(id.value);
//    showConfirm.value = false
// }

function onCancelDelete() {
  showConfirm.value = false
}

function uniqueChildren(parent) {
  const children = parent.children || []
  return children.filter((child) => {
    // اگر handleId یکی باشد → تکراری، نشان نده
    if (child.handleId && child.handleId === parent.handleId) return false
    // اگر name یکی باشد → تکراری
    if (child.name && child.name === parent.name) return false
    // اگر id یکی باشد
    if (child.id && child.id === parent.id) return false
    return true
  })
}
</script>

<style scoped>
.service-node {
  min-width: 180px;
  max-width: 260px;
  padding: 8px;
  border-radius: 8px;
  background: white;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.12);
  border: 1px solid #e2e8f0;
  font-family: Inter, system-ui, sans-serif;
}

.node-header {
  cursor: pointer;
  margin-bottom: 6px;
}

.preview-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}


/* Context menu styles */
.context-menu {
  position: fixed;
  z-index: 9999;
  width: 150px;
  background: white;
  box-shadow: 0 4px 12px rgb(0 0 0 / 0.15);
  border-radius: 6px;
  overflow: hidden;
  font-size: 14px;
}

.context-menu ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.context-menu li {
  padding: 10px 16px;
  cursor: pointer;
  border-bottom: 1px solid #eee;
  transition: background-color 0.2s ease;
}

.context-menu li:last-child {
  border-bottom: none;
}

.context-menu li:hover {
  background: #5b21b6;
  /* purple-700 */
  color: white;
}

/* Handle styling */
.vue-flow__handle {
  width: 12px !important;
  height: 12px !important;
  border: 2px solid white !important;
  border-radius: 50% !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
}


/* Handle styling */
.vue-flow__handle {
  width: 12px !important;
  height: 12px !important;
  border: 2px solid white !important;
  border-radius: 50% !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
}

.vue-flow__handle-target {
  background: #10b981 !important;
  /* green for input */
}

.vue-flow__handle-source {
  background: #f59e0b !important;
  /* amber for output */
}

.vue-flow__handle:hover {
  transform: scale(1.2);
  transition: transform 0.2s ease;
}

/* Execution Status Styles */
.node-executing {
  animation: executing-glow 1s ease-in-out infinite;
  box-shadow: 0 0 20px rgba(16, 185, 129, 0.6) !important;
}

.node-completed {
  animation: completed-pulse 0.6s ease-out;
  box-shadow: 0 0 15px rgba(34, 197, 94, 0.4) !important;
}

.node-error {
  animation: error-shake 0.5s ease-in-out;
  box-shadow: 0 0 15px rgba(239, 68, 68, 0.4) !important;
}

.execution-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-weight: bold;
  margin-right: 8px;
  font-size: 14px;
}

.execution-badge.executing {
  background: #10b981;
  color: white;
  animation: pulse-execute 1.5s infinite;
}

.execution-badge.completed {
  background: #22c55e;
  color: white;
}

.execution-badge.error {
  background: #ef4444;
  color: white;
}

.NodePort {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.execution-error {
  padding: 4px 8px;
  background: #fee2e2;
  border-left: 3px solid #ef4444;
  border-radius: 4px;
  margin-top: 4px;
  color: #991b1b;
  font-size: 11px;
}

.execution-result {
  padding: 4px 8px;
  background: #dcfce7;
  border-left: 3px solid #22c55e;
  border-radius: 4px;
  margin-top: 4px;
  color: #166534;
  font-size: 11px;
  word-break: break-word;
}

.icon-spin {
  animation: spin 1s linear infinite;
}

.node-idle {
  /* Reset to default appearance */
  background: default !important;
  border-color: default !important;
  animation: none !important;
  box-shadow: default !important;
}

.node-idle .execution-badge {
  display: none;
}

@keyframes executing-glow {

  0%,
  100% {
    filter: drop-shadow(0 0 0px rgba(16, 185, 129, 0));
  }

  50% {
    filter: drop-shadow(0 0 8px rgba(16, 185, 129, 0.8));
  }
}

@keyframes completed-pulse {
  0% {
    filter: drop-shadow(0 0 0px rgba(34, 197, 94, 0));
  }

  100% {
    filter: drop-shadow(0 0 4px rgba(34, 197, 94, 0.6));
  }
}

@keyframes error-shake {

  0%,
  100% {
    transform: translateX(0);
  }

  25% {
    transform: translateX(-5px);
  }

  75% {
    transform: translateX(5px);
  }
}

@keyframes pulse-execute {

  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
  }

  50% {
    box-shadow: 0 0 0 10px rgba(16, 185, 129, 0);
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

/* ---- Field port handles (additive; does not alter existing node styles) ---- */
.node-ports {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-top: 6px;
}

.node-ports__column {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.node-ports__column--outputs {
  align-items: flex-end;
}

.port-row {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.port-label {
  font-size: 9px;
  color: #475569;
  white-space: nowrap;
}

.port-handle {
  width: 10px;
  height: 10px;
  min-width: 10px;
  padding: 0;
  border: 1px solid #94a3b8;
  border-radius: 50%;
  background: #ffffff;
  pointer-events: auto;
  z-index: 1;
}

.port-row--child {
  padding-left: 12px;
  opacity: 0.9;
}

.port-row--child .port-label {
  font-size: 8px;
  color: #64748b;
}

.port-type {
  font-size: 8px;
  color: #94a3b8;
  margin-left: 2px;
}

/* Vue Flow pins same-side handles to the node center via the global
   .vue-flow__handle-left/.vue-flow__handle-right rules, which made every
   input/output port overlap. Release that pinning so each handle flows inside
   its own row. The `position` prop is retained for connection-direction metadata. */
.port-handle.vue-flow__handle-left,
.port-handle.vue-flow__handle-right {
  position: relative;
  top: auto;
  left: auto;
  right: auto;
  transform: none;
}
</style>
