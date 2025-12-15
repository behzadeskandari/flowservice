<template>
  <div>
    <div class="conditional-node" :class="{ 'has-condition': hasCondition }" @contextmenu.prevent="onRightClick" @touchstart="onTouchStart" @touchend="onTouchEnd" @touchmove="onTouchCancel">
      <div class="node-header" @dblclick="openEdit">
        <strong>{{ data.stepName || 'Conditional Step' }}</strong>
      </div>

      <div class="node-body">
        <div v-if="data.condition" class="condition-preview">
          <span class="condition-label">Condition:</span>
          <span class="condition-value">{{ data.condition }}</span>
        </div>
        <div v-if="data.service" class="service-preview">
          <small>{{ data.service.name || 'No service' }}</small>
        </div>
      </div>

      <!-- Connectors -->
      <Handle type="target" position="top" id="in" />
      <Handle type="source" position="bottom" id="out" :style="{ left: '50%' }" />
      <Handle v-if="hasCondition" type="source" position="right" id="true" style="top: 60%" />
      <Handle v-if="hasCondition" type="source" position="left" id="false" style="top: 60%" />

      <!-- Context Menu -->
      <div v-if="isContextMenuOpen" ref="menuRef" class="context-menu" :style="contextMenuStyles">
        <ul>
          <li @click="onContextSelect('edit')">
            <font-awesome-icon :icon="faEdit" />
            Edit
          </li>
          <li @click="onContextSelect('delete')">
            <font-awesome-icon :icon="faTrash" />
            Delete
          </li>
        </ul>
      </div>
    </div>

    <ConfirmModal
      :visible="showConfirm"
      message="Are you sure you want to delete this step?"
      @confirm="onConfirmDelete"
      @cancel="onCancelDelete"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, toRefs } from 'vue'
import { Handle } from '@vue-flow/core'
import { faEdit, faTrash } from '@fortawesome/free-solid-svg-icons'
import ConfirmModal from '../modals/ConfirmModal.vue'
import { useFlowStore } from '@/stores/flowStore'

const props = defineProps({
  id: { type: String, required: true },
  data: { type: Object, required: true },
})

const { id, data } = toRefs(props)
const store = useFlowStore()
const showConfirm = ref(false)
const menuRef = ref(null)
const openContextMenuId = ref(null)

const hasCondition = computed(() => !!data.value.condition)
const isContextMenuOpen = computed(() => openContextMenuId.value === id.value)

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
    openContextMenuId.value = null
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
  openContextMenuId.value = id.value

  const clickX = e.clientX
  const clickY = e.clientY
  const screenW = window.innerWidth
  const screenH = window.innerHeight
  const menuWidth = 150
  const menuHeight = 100

  // Calculate position so menu doesn't overflow screen
  contextMenuStyles.value = {
    position: 'fixed',
    top: (clickY + menuHeight > screenH) ? `${screenH - menuHeight}px` : `${clickY}px`,
    left: (clickX + menuWidth > screenW) ? `${screenW - menuWidth}px` : `${clickX}px`,
    width: `${menuWidth}px`,
    zIndex: 9999,
  }
}

let touchTimeout = null
function onTouchStart(e) {
  if (e.touches?.length === 1) {
    touchTimeout = setTimeout(() => {
      e.preventDefault()
      openContextMenuId.value = id.value

      const touch = e.touches[0]
      const clickX = touch.clientX
      const clickY = touch.clientY
      const screenW = window.innerWidth
      const screenH = window.innerHeight
      const menuWidth = 150
      const menuHeight = 100

      contextMenuStyles.value = {
        position: 'fixed',
        top: (clickY + menuHeight > screenH) ? `${screenH - menuHeight}px` : `${clickY}px`,
        left: (clickX + menuWidth > screenW) ? `${screenW - menuWidth}px` : `${clickX}px`,
        width: `${menuWidth}px`,
        zIndex: 9999,
      }
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

  if (action === 'edit') {
    store.setSelectedNode(id.value, 'edit')
  } else if (action === 'delete') {
    showConfirm.value = true
  }
}

function onConfirmDelete() {
  store.deleteNode(id.value)
  showConfirm.value = false
}

function onCancelDelete() {
  showConfirm.value = false
}
</script>

<style scoped>
.conditional-node {
  min-width: 180px;
  max-width: 260px;
  padding: 12px;
  border-radius: 8px;
  background: white;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.12);
  border: 2px solid #e2e8f0;
  transform: rotate(45deg);
  width: 80px;
  height: 80px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
}

.conditional-node.has-condition {
  border-color: #4f46e5;
}

.node-header {
  font-size: 12px;
  font-weight: bold;
  margin-bottom: 4px;
  text-align: center;
  transform: rotate(-45deg);
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.node-body {
  font-size: 10px;
  color: #666;
  text-align: center;
  transform: rotate(-45deg);
  width: 100%;
}

.condition-preview {
  margin-top: 4px;
  padding: 2px 4px;
  background: #f0f9ff;
  border-radius: 4px;
  font-size: 9px;
}

.condition-label {
  font-weight: bold;
  margin-right: 4px;
}

.service-preview {
  margin-top: 4px;
  padding: 2px 4px;
  background: #f0fdf4;
  border-radius: 4px;
  font-size: 9px;
}

.context-menu {
  position: absolute;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 120px;
}

.context-menu ul {
  list-style: none;
  margin: 0;
  padding: 4px 0;
}

.context-menu li {
  padding: 6px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.context-menu li:hover {
  background: #f8fafc;
}
</style>
