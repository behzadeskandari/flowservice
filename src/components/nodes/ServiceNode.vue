<template>
  <div>
    <div class="service-node" @contextmenu.prevent="onRightClick">
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
          <li @click="openMergeModal">
            <font-awesome-icon :icon="faCompressArrowsAlt" />
            ادغام سرویس‌ها
          </li>
        </ul>
      </div>
    </div>
    <div v-if="isMergeModalOpen">
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="cancelMerge">
        <div class="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full" @click.stop>
          <h3 class="text-lg font-bold mb-4">ادغام سرویس‌ها</h3>

          <label class="block mb-2 font-medium">سرویس برای ادغام را انتخاب کنید:</label>
          <select v-model="selectedMergeNodeId" class="w-full p-2 mb-4 border rounded">
            <option disabled value="">یک سرویس را انتخاب کنید</option>
            <option v-for="node in mergeCandidates" :key="node.id" :value="node.id">
              {{ node.data.label }}
            </option>
          </select>

          <div v-if="selectedMergeNodeId" class="mb-4 max-h-40 overflow-y-auto border p-2 rounded">
            <label class="block mb-1 font-semibold">فیلدهایی برای ادغام انتخاب کنید:</label>

            <div class="mb-2">
              <label>
                <input type="checkbox" v-model="selectAllFields" @change="toggleSelectAll" />
                انتخاب همه
              </label>
            </div>

            <div v-for="field in fieldsToMerge" :key="field.key" class="ml-4 mb-1">
              <label>
                <input type="checkbox" :value="field.key" :checked="selectedFieldsToMerge.has(field.key)"
                  @change="toggleFieldSelection(field.key, $event.target.checked)" />
                {{ field.label }} ({{ field.type }})
              </label>
            </div>
          </div>

          <div class="flex justify-end gap-4 mt-6">
            <button @click="cancelMerge" class="btn-cancel">لغو</button>
            <button :disabled="!canMerge" @click="performMerge" class="btn-confirm">
              ادغام
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, toRefs, ref, computed } from 'vue'
import { Handle } from '@vue-flow/core'
import { faEdit, faEye, faTrash, faCompressArrowsAlt } from '@fortawesome/free-solid-svg-icons'

import { useFlowStore } from '@/stores/flowStore'
// import { useEventListener  } from '@vueuse/core'
const props = defineProps({
  id: { type: String, required: true },
  data: { type: Object, required: true },
})
const isMergeModalOpen = ref(false)
const mergeCandidates = ref([])  // Combined services you can merge with
const selectedMergeNodeId = ref(null)  // Which node to merge with
const selectedFieldsToMerge = ref(new Set()) // Selected fields
const selectAllFields = ref(false)

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
function openMergeModal() {
  debugger
  // Close context menu
  openContextMenuId.value = null
  contextMenu.value.visible = false

  // Load candidate combined service nodes (for example, connected nodes of type combinedServiceNode)
  mergeCandidates.value = store.nodes.filter(n =>
    n.type === 'combinedServiceNode' && n.id !== id.value
  )

  selectedMergeNodeId.value = null
  selectedFieldsToMerge.value = new Set()
  selectAllFields.value = false

  isMergeModalOpen.value = true
}
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

function onContextSelect(action) {
  openContextMenuId.value = null
  contextMenu.value.visible = false
  if (action === 'edit') {
    store.setSelectedNode(id.value, 'edit')
  } else if (action === 'delete') {
    if (confirm('Delete this node?')) store.deleteNode(id.value)
  } else if (action === 'json') {
    store.setSelectedNode(id.value, 'view')
  }
}



const fieldsToMerge = computed(() => {
  if (!selectedMergeNodeId.value) return []
  const node = store.nodes.find(n => n.id === selectedMergeNodeId.value)
  if (!node) return []
  // Use combinedSchema or fields as fallback
  return Array.isArray(node.data.combinedSchema)
    ? node.data.combinedSchema
    : Array.isArray(node.data.fields)
      ? node.data.fields
      : []
})

function toggleFieldSelection(key, checked) {
  if (checked) {
    selectedFieldsToMerge.value.add(key)
  } else {
    selectedFieldsToMerge.value.delete(key)
  }
}

function toggleSelectAll() {
  if (selectAllFields.value) {
    fieldsToMerge.value.forEach((f) => selectedFieldsToMerge.value.add(f.key))
  } else {
    selectedFieldsToMerge.value.clear()
  }
}

const canMerge = computed(() => {
  return selectedMergeNodeId.value && selectedFieldsToMerge.value.size > 0
})

function cancelMerge() {
  isMergeModalOpen.value = false
  selectedMergeNodeId.value = null
  selectedFieldsToMerge.value.clear()
  selectAllFields.value = false
}

function performMerge() {
  console.log("Performing merge...");
  if (!selectedMergeNodeId.value || !store.nodes.find(n => n.id === id.value)) {
    console.log("Missing selected nodes");
    return
  }
  if (!selectedMergeNodeId.value || !store.nodes.find(n => n.id === id.value)) return

  const currentNode = store.nodes.find(n => n.id === id.value)
  const mergeNode = store.nodes.find(n => n.id === selectedMergeNodeId.value)

  if (!currentNode || !mergeNode) {
    console.log("One of the nodes not found");
    return
  }

  // Ensure combinedSchema is an array or fallback to []
  const currentSchema = Array.isArray(currentNode.data.combinedSchema) ? currentNode.data.combinedSchema : []
  const mergeSchema = Array.isArray(mergeNode.data.combinedSchema) ? mergeNode.data.combinedSchema : []

  // Fields to merge from selected node
  const fieldsFromOther = mergeSchema.filter(f =>
    selectedFieldsToMerge.value.has(f.key)
  )

  console.log("Fields to add:", fieldsFromOther)
  // Merge schemas, avoid duplicate keys
  const newCombinedSchema = [...currentSchema]
  fieldsFromOther.forEach(f => {
    if (!newCombinedSchema.find(x => x.key === f.key)) {
      newCombinedSchema.push(f)
    }
  })
 console.log("New combined schema:", newCombinedSchema)

  // Update the node with new combined schema and label showing merge
  store.updateNode(currentNode.id, {
    data: {
      ...currentNode.data,
      combinedSchema: newCombinedSchema,
      label: `${currentNode.data.label} + ${mergeNode.data.label}`,
    }
  })

  cancelMerge()
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
