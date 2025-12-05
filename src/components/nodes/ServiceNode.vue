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
          <span class="p-val">{{ f.defaultValue ?? '-' }}</span>
        </div>
      </div>
    </div>

    <!-- connectors -->
    <Handle type="target" position="left" id="in" />
    <Handle type="source" position="right" id="out" />
  </div>
</template>

<script setup>
import { toRefs } from 'vue'
import { Handle } from '@vue-flow/core'
import { useFlowStore } from '@/stores/flowStore'

const props = defineProps({
  id: { type: String, required: true },
  data: { type: Object, required: true },
})

const { id, data } = toRefs(props)
const store = useFlowStore()

const previewFields = data.value.fields ? data.value.fields.slice(0, 3) : []

function openEdit() {
  store.setSelectedNode(id.value, 'edit')
}

function onRightClick(e) {
  // simple context menu: show options via prompt (you can replace with a real UI)
  const action = window.prompt('Right-click options: [edit, delete, json]\nType action:')
  if (!action) return
  if (action === 'edit') store.setSelectedNode(id.value, 'edit')
  else if (action === 'delete') {
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
</style>
