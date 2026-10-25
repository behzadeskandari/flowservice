<template>
  <div class="start-node" :class="statusClass" @contextmenu.prevent="onRightClick" @touchstart.passive="onTouchStart"
    @touchend.passive="onTouchEnd" @touchmove.passive="onTouchCancel">
    <div class="start-box">
      <div class="start-content">
        <strong>{{ data.stepName || 'Start' }}</strong>
        <small v-if="data.stepName">شروع جریان</small>
        <div v-if="nodeStatus === 'success'" class="status-icon success">✓</div>
        <div v-if="nodeStatus === 'error'" class="status-icon error">✗</div>
        <div v-if="nodeStatus === 'executing'" class="status-icon executing">
          <span class="spinner"></span> در حال اجرا...
        </div>
      </div>
      <!-- داخل start-box، بعد از start-content -->

      <!-- ورودی‌ها و فرزندان تو‌در‌توی آن‌ها -->
      <div v-if="nodeInputs.length" class="node-ports node-ports--inputs">
        <div v-for="field in nodeInputs" :key="'in-' + field.handleId" class="NodePort">
          <!-- فیلد اصلی -->
          <div class="port-row">
            <Handle :id="field.handleId" type="target" position="left" class="port-handle" />
            <span class="port-label">{{ field.name }}</span>
            <span v-if="field.type" class="port-type">{{ field.type }}</span>
          </div>

          <!-- فرزندان فیلد -->
          <div v-for="child in uniqueChildren(field)" :key="'in-' + child.handleId" class="port-row port-row--child">
            <Handle :id="child.handleId" type="target" position="left" class="port-handle" />
            <span class="port-label">{{ child.name }}</span>
            <span v-if="child.type" class="port-type">{{ child.type }}</span>
          </div>
        </div>
      </div>

      <!-- خروجی‌ها و فرزندان تو‌در‌توی آن‌ها -->
      <div v-if="nodeOutputs.length" class="node-ports node-ports--outputs">
        <div v-for="field in nodeOutputs" :key="'out-' + field.handleId" class="NodePort">
          <!-- فیلد اصلی -->
          <div class="port-row">
            <span class="port-label">{{ field.name }}</span>
            <span v-if="field.type" class="port-type">{{ field.type }}</span>
            <Handle :id="field.handleId" type="source" position="right" class="port-handle" />
          </div>

          <!-- فرزندان فیلد -->
          <div v-for="child in uniqueChildren(field)" :key="'out-' + child.handleId" class="port-row port-row--child">
            <span class="port-label">{{ child.name }}</span>
            <span v-if="child.type" class="port-type">{{ child.type }}</span>
            <Handle :id="child.handleId" type="source" position="right" class="port-handle" />
          </div>
        </div>
      </div>

      <Handle type="target" position="top" id="in" />
      <Handle type="source" position="bottom" id="out" />

    </div>
    <div v-if="isContextMenuOpen" ref="menuRef" class="context-menu" :style="contextMenuStyles">
      <ul>
        <li @click="onContextSelect('edit')">ويرايش</li>
        <li @click="onContextSelect('delete')">پاک کردن</li>
      </ul>
    </div>
  </div>
  <ConfirmModal :visible="showConfirm" message="آیا از پاک کردن گره مطمئن هستید؟" @confirm="onConfirmDelete"
    @cancel="onCancelDelete" />
</template>
<script setup>
import { Handle, useVueFlow } from '@vue-flow/core'
import { computed, inject, onMounted, onBeforeUnmount, ref, toRefs } from 'vue'
import { useFlowStore } from '@/stores/flowStore'
import ConfirmModal from '../modals/ConfirmModal.vue'
import serviceAggregatorClient from '@/utils/service-aggregator-client'


const { removeEdges, removeNodes, edges } = useVueFlow()


const nodeInputs = computed(() =>
  store.getNodeAvailableInputs
    ? store.getNodeAvailableInputs(id.value) || []
    : []
)

const nodeOutputs = computed(() =>
  store.getNodeAvailableOutputs
    ? store.getNodeAvailableOutputs(id.value) || []
    : []
)

function uniqueChildren(parent) {
  const children = parent.children || []

  return children.filter(child => {
    if (child.handleId && child.handleId === parent.handleId) return false
    if (child.name && child.name === parent.name) return false
    if (child.id && child.id === parent.id) return false
    return true
  })
}
const store = useFlowStore()
const showConfirm = ref(false)

const props = defineProps({
  id: { type: String, required: true },
  data: { type: Object, required: true },
})
const { id, data } = toRefs(props)

onMounted(() => {
  console.log(props.data, 'datadatadatadata')
  window.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', handleClickOutside)
})

const nodeStatus = computed(() => {
  return store.executionStatus?.[props.id] ?? 'idle'
})

const statusClass = computed(() => ({
  'status-executing': nodeStatus.value === 'executing',
  'status-success': nodeStatus.value === 'success',
  'status-error': nodeStatus.value === 'error',
  'status-idle': nodeStatus.value === 'idle',
}))

const nodeResult = computed(() => store.nodeResults?.[props.id] || null)

const contextMenu = ref({
  visible: false,
  x: "200",
  y: "100",
})
const menuRef = ref(null)
const openContextMenuId = ref(null)
const isContextMenuOpen = computed(() => openContextMenuId.value === props.id)
const contextMenuStyles = computed(() => {
  if (!menuRef.value) return {}
  const rect = menuRef.value.getBoundingClientRect()
  return {
    position: 'fixed',
    top: `${rect.y}px`,
    left: `${rect.x}px`,
    width: '150px',
    zIndex: 9999,
  }
})

function handleClickOutside(event) {
  if (menuRef.value && !menuRef.value.contains(event.target)) {
    contextMenu.value.visible = false
    openContextMenuId.value = null
  }
}

function onRightClick(e) {
  e.preventDefault()
  contextMenu.value.visible = true
  openContextMenuId.value = props.id
  const clickX = e.clientX
  const clickY = e.clientY
  const screenW = window.innerWidth
  const screenH = window.innerHeight
  const menuWidth = 150
  const menuHeight = 80

  contextMenu.value.x = (clickX + menuWidth > screenW) ? (screenW - menuWidth) : clickX
  contextMenu.value.y = (clickY + menuHeight > screenH) ? (screenH - menuHeight) : clickY
}

let touchTimeout = null
function onTouchStart(e) {
  if (e.touches && e.touches.length === 1) {
    touchTimeout = setTimeout(() => {
      e.preventDefault()
      contextMenu.value.visible = true
      openContextMenuId.value = props.id
      const touch = e.touches[0]
      const clickX = touch.clientX
      const clickY = touch.clientY
      const screenW = window.innerWidth
      const screenH = window.innerHeight
      const menuWidth = 150
      const menuHeight = 80
      contextMenu.value.x = (clickX + menuWidth > screenW) ? (screenW - menuWidth) : clickX
      contextMenu.value.y = (clickY + menuHeight > screenH) ? (screenH - menuHeight) : clickY
    }, 500)
  }
}

function onTouchEnd() {
  if (touchTimeout) {
    clearTimeout(touchTimeout)
    touchTimeout = null
  }
}

function onTouchCancel() {
  if (touchTimeout) {
    clearTimeout(touchTimeout)
    touchTimeout = null
  }
}

function onContextSelect(action) {
  openContextMenuId.value = null
  contextMenu.value.visible = false
  if (action === 'edit') {
    store.setSelectedNode(props.id, 'edit')
  } else if (action === 'delete') {
    showConfirm.value = true
  }
}


// async function onConfirmDelete() {
//   debugger
//   const stepId = props.id.replace('node-', '')
//   await serviceAggregatorClient.deleteAggregateStep(stepId)
//   store.deleteNode(props.id)
//   showConfirm.value = false
// }

async function onConfirmDelete() {
  try {
    // Use the persisted AggregateStep ID, not the Vue Flow node ID
    // or the underlying Service ID.
    const stepId =
      props.data.aggregateStepId ??
      props.data.stepId ??
      props.id.replace(/^node-/, '')

    if (!stepId || stepId === props.id) {
      throw new Error('A valid AggregateStep ID is required.')
    }

    // Call only the aggregate-step deletion endpoint.
    await serviceAggregatorClient.deleteAggregateStep(stepId)

    // Update the local graph only after backend deletion succeeds.
    store.deleteNode2(props.id)

    showConfirm.value = false
  } catch (error) {
    console.error('Failed to delete aggregate step:', error)
    // Keep the confirmation open so the user can retry.
  }
}

function onCancelDelete() {
  showConfirm.value = false
}

</script>

<style scoped lang="scss">
.start-node {
  position: relative;
  width: max-content;
  min-width: 180px;
  max-width: 320px;
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.start-box {
  box-sizing: border-box;
  width: max-content;
  min-width: 160px;
  max-width: 320px;
  min-height: 70px;
  height: auto;
  padding: 12px 16px;
  background: #289604;
  border: 3px solid #289604;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: 0 2px 8px rgba(8, 166, 22, 0.5);
  cursor: pointer;
  transition: width 0.2s ease, min-height 0.2s ease;
  display: flex;
  flex-flow: column;
}

.start-content {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  text-align: center;
  color: #eee;
  font-size: 14px;
  overflow-wrap: anywhere;
  word-break: normal;
  z-index: 10;
  position: relative;
}

.start-content strong {
  display: block;
  margin-bottom: 4px;
  font-weight: 600;
  font-size: 14px;
  white-space: normal;
  overflow-wrap: anywhere;
}

.start-content small {
  display: block;
  font-size: 12px;
  white-space: normal;
  overflow-wrap: anywhere;
}

// .start-node {
//   position: relative;
//   width: 180px;
//   height: 80px;
//   display: flex;
//   align-items: center;
//   justify-content: center;
// }

// .start-box {
//   width: 160px;
//   height: 70px;
//   background: #289604;
//   border: 3px solid #289604;
//   border-radius: 4px;
//   display: flex;
//   align-items: center;
//   justify-content: center;
//   position: relative;
//   box-shadow: 0 2px 8px rgba(8, 166, 22, 0.925);
//   cursor: pointer;
//   transition: all 0.2s ease;
// }

.start-box:hover {
  box-shadow: 0 4px 12px rgba(8, 166, 22, 0.925);
  transform: scale(1.05);
}

/* Notch on the right side */
.start-box::after {
  content: '';
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-top: 12px solid transparent;
  border-bottom: 12px solid transparent;
}

.start-box::before {
  content: '';
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-top: 10px solid transparent;
  border-bottom: 10px solid transparent;
}

// .start-content {
//   text-align: center;
//   color: #eee;
//   font-size: 14px;
//   z-index: 10;
//   position: relative;
// }

// .start-content strong {
//   display: block;
//   margin-bottom: 2px;
//   font-weight: 600;
//   font-size: 14px;
// }

// .start-content small {
//   display: block;
//   font-size: 14px;
// }

/* Status icons */
.status-icon {
  position: absolute;
  top: 6px;
  right: 10px;
  font-size: 1.5rem;
  font-weight: bold;
  line-height: 1;
}

.success {
  left: 90px;
  top: 0px;
  color: white;
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.4);
}

.error {
  color: white;
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.4);
}

.executing {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: white;
}

/* Spinner inside executing state */
.spinner {
  width: 14px;
  height: 14px;
  border: 2.5px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.status-idle .start-box {
  background: #289604 !important;
  border-color: #289604 !important;
  box-shadow: 0 2px 8px rgba(8, 166, 22, 0.925) !important;
  animation: none !important;
}

.NodePort {
  color: white;
}

.port-row {
  color: white;

}

.NodePort .port-row .port-row--child {
  color: white;
}

.status-idle .status-icon {
  display: none;
}

/* Animations */
@keyframes gradient-flow {
  0% {
    background-position: 0% 50%;
  }

  100% {
    background-position: 200% 50%;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes error-shake {

  0%,
  100% {
    transform: translateX(0);
  }

  20%,
  60% {
    transform: translateX(-4px);
  }

  40%,
  80% {
    transform: translateX(4px);
  }
}

/* Hover effect (optional) */
.start-box:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
}

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
  color: white;
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
  color: #c1c4c7;
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
  color: #d1d3d6;
}

.port-type {
  font-size: 8px;
  color: #cccfd4;
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
