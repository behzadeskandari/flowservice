<template>
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
    <div
      v-if="contextMenu.visible"
      ref="menuRef"
      class="context-menu"
      :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
    >
      <ul>
        <li @click="onContextSelect('edit')">Edit</li>
        <li @click="onContextSelect('delete')">Delete</li>
        <li @click="onContextSelect('json')">View JSON</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, toRefs, ref, computed } from 'vue'
import { Handle } from '@vue-flow/core'

import { useFlowStore } from '@/stores/flowStore'
// import { useEventListener  } from '@vueuse/core'
const props = defineProps({
  id: { type: String, required: true },
  data: { type: Object, required: true },
})

const { id, data } = toRefs(props)
const store = useFlowStore()

const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
})

const menuRef = ref(null)

var storeNodes = store.getNodes();
const previewFields = computed(() => {
  return data.value.fields ? data.value.fields.slice(0, 3) : []
})
console.log(storeNodes,'storeNodesstoreNodes')
console.log(previewFields,'previewFieldspreviewFields')
console.log(data.value,'data.value.')
//  function useClickAway(target, handler) {
//   const onClick = (event) => {
//     const el = target.value
//     if (!el) return
//     if (el !== event.target && !el.contains(event.target)) {
//       handler(event)
//     }
//   }

//   useEventListener(document, 'click', onClick)
// }

// Close context menu on outside click
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
  contextMenu.value.visible = false
  if (action === 'edit') {
    store.setSelectedNode(id.value, 'edit')
  } else if (action === 'delete') {
    if (confirm('Delete this node?')) store.deleteNode(id.value)
  } else if (action === 'json') {
    store.setSelectedNode(id.value, 'view')
  }
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
  background: #5b21b6; /* purple-700 */
  color: white;
}
</style>
