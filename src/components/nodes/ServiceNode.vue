<template>
  <div>
    <div class="service-node" @contextmenu.prevent="onRightClick" @touchstart="onTouchStart" @touchend="onTouchEnd" @touchmove="onTouchCancel">
      <div class="node-header" @dblclick="openEdit">
        <strong>{{ data.label }}</strong>
      </div>

      <div class="node-body">
        <small>{{ data.serviceName }}</small>
        <div v-if="previewFields && previewFields.length" class="preview">
          <div v-for="f in previewFields" :key="f.key" class="preview-row">
            <span class="p-key">{{ f.label }}:</span>
            <span class="p-val">{{ f.defaultValue || '-' }}</span>
          </div>
        </div>
      </div>

      <!-- connectors -->
      <Handle type="target" position="left" id="in" />
      <Handle type="source" position="right" id="out" />

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
          <li @click="onContextSelect('json')">
            <font-awesome-icon :icon="faEye" />
            نمایش بصورت
            JSON
          </li>

        </ul>
      </div>
    </div>
    <ConfirmModal
  :visible="showConfirm"
  message="آیا از پاک کردن گره مطمئن هستید؟"
  @confirm="onConfirmDelete"
  @cancel="onCancelDelete"
/>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, toRefs, ref, computed } from 'vue'
import { Handle } from '@vue-flow/core'
import { faEdit, faEye, faTrash } from '@fortawesome/free-solid-svg-icons'
import ConfirmModal from '../modals/ConfirmModal.vue'
import { useFlowStore } from '@/stores/flowStore'
const showConfirm = ref(false)
// import { useEventListener  } from '@vueuse/core'
const props = defineProps({
  id: { type: String, required: true },
  data: { type: Object, required: true },
})
console.log('ServiceNode props data:', props.data)
const { id, data } = toRefs(props)
const store = useFlowStore()
const nodeRef = ref(null)
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
})

const menuRef = ref(null)
const openContextMenuId = ref(null)

const previewFields = computed(() => {
  return data.value.fields ? data.value.fields.slice(0, 3) : []
})
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

function onContextSelect(action) {
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




function onConfirmDelete() {
  store.deleteNode(id.value)
  showConfirm.value = false
}

function onCancelDelete() {
  showConfirm.value = false
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
</style>
