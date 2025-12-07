<!-- src/components/nodes/CombinedServiceNode.vue -->
<template>
  <div class="combined-node" @dblclick="openView">
    <div class="node-header">
      <strong>{{ data.label }}</strong>
    </div>

    <div class="node-body">
      <small>Combined</small>
      <div class="count">Fields: {{ data.combinedSchema.length }}</div>
    </div>
    <div v-if="node.type !== 'combinedServiceNode'">
      <Handle type="target" position="left" id="in" />
      <Handle type="source" position="right" id="out" />
    </div>
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
let node = {};
node['type'] = 'combinedServiceNode'
const { id, data } = toRefs(props)
const store = useFlowStore()
function openView() {
  // open modal view for combined node
  store.setSelectedNode(id.value, 'view')
}
</script>

<style scoped>
.combined-node {
  min-width: 200px;
  padding: 8px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
}

.node-header {
  margin-bottom: 6px;
}

.count {
  font-size: 12px;
  color: #475569;
  margin-top: 6px;
}
</style>
