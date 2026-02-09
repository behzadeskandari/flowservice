<template>
  <!-- @dblclick="openEdit" -->
  <div class="decision-node" :class="{
    'status-success': nodeStatus === 'success',
    'status-executing': nodeStatus === 'executing',
    'status-error': nodeStatus === 'error',
    'status-idle': nodeStatus === 'idle' || !nodeStatus
  }" @contextmenu.prevent="onRightClick" @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd"
    @touchmove.passive="onTouchCancel">
    <div class="diamond">
      <div class="diamond-content">
        <strong class="title">{{ data.stepName || 'شرط' }}</strong>
        <small class="condition" v-if="data.condition">if {{ data.condition }}</small>
        <small class="condition" v-else>مشروط</small>
        <small class="params" v-if="data.conditionParameters">پارامترها: {{ data.conditionParameters }}</small>
        <div v-if="nodeStatus === 'success'" class="status-tick">✓</div>
        <div v-if="nodeStatus === 'error'" class="status-error">✗</div>
      </div>
    </div>
    <Handle type="target" position="left" id="in" />
    <Handle type="source" position="right" id="out" />
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
import { Handle } from '@vue-flow/core'
import { useFlowStore } from '@/stores/flowStore'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import ConfirmModal from '../modals/ConfirmModal.vue'
import serviceAggregatorClient from '@/utils/service-aggregator-client'
const props = defineProps({
  id: { type: String, required: true },
  data: { type: Object, required: true },
})
const store = useFlowStore()
const showConfirm = ref(false)
// function openEdit() {
//   store.setSelectedNode(props.id, 'edit')
// }
const nodeStatus = computed(() => store.executionStatus[props.id] ?? 'idle')

const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
})
const menuRef = ref(null)
const openContextMenuId = ref(null)
const isContextMenuOpen = computed(() => openContextMenuId.value === props.id)
const contextMenuStyles = computed(() => {
  if (!menuRef.value) return {}

  const rect = menuRef.value.getBoundingClientRect()
  return {
    position: 'fixed',
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
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

onMounted(() => {
  window.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', handleClickOutside)
})

function onRightClick(e) {
  e.preventDefault()
  contextMenu.value.visible = true
  openContextMenuId.value = props.id
  const clickX = e.clientX
  const clickY = e.clientY
  const screenW = window.innerWidth
  const screenH = window.innerHeight
  const menuWidth = 150
  const menuHeight = 60

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
      const menuHeight = 60
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

async function onConfirmDelete() {
  const stepId = props.id.replace('node-', '')
  await serviceAggregatorClient.deleteAggregateStep(stepId)
  store.deleteNode(props.id)
  showConfirm.value = false
}

function onCancelDelete() {
  showConfirm.value = false
}
</script>

<style scoped>
.decision-node {
  position: relative;
  width: 160px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.diamond {
  width: 120px;
  height: 120px;
  background: #fef3c7;
  border: 2px solid #f59e0b;
  transform: rotate(45deg);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.diamond-content {
  transform: rotate(-45deg);
  text-align: center;
  padding: 6px;
  color: #92400e;
  font-size: 12px;
}

.title {
  display: block;
  margin-bottom: 4px;
}

.condition {
  display: block;
  color: #b45309;
}

.status-success .diamond {
  background: #dcfce7;
  border-color: #16a34a;
}

.status-executing .diamond {
  animation: pulse-execute 1.5s infinite;
}

.status-error .diamond {
  background: #fee2e2;
  border-color: #dc2626;
}

.status-tick,
.status-error {
  position: absolute;
  top: -10px;
  right: -10px;
  font-size: 20px;
  font-weight: bold;
}

.status-tick {
  color: #16a34a;
}

.status-error {
  color: #dc2626;
}

.status-idle .diamond {
  background: #fef3c7 !important;
  border-color: #f59e0b !important;
  animation: none !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
}

.status-idle .status-tick,
.status-idle .status-error {
  display: none;
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
</style>
