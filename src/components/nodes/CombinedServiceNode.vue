<!-- src/components/nodes/CombinedServiceNode.vue -->
<template>
  <div class="combined-node" @dblclick="openView">
    <div class="node-header">
      <strong>{{ data.label }}</strong>
    </div>

    <div class="node-body">
      <small class="combined-label">Merged Services</small>
      <div v-if="data.combinedSchema" class="service-info">
        <div class="schema-preview">
          {{ Object.keys(data.combinedSchema).length }} combined fields
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { toRefs } from 'vue'
import { useFlowStore } from '@/stores/flowStore'

const props = defineProps({
  id: { type: String, required: true },
  data: { type: Object, required: true },
})

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
  padding: 12px;
  border-radius: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: 2px solid #764ba2;
  box-shadow: 0 4px 12px rgba(118, 75, 162, 0.3);
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.combined-node:hover {
  box-shadow: 0 6px 16px rgba(118, 75, 162, 0.4);
  transform: translateY(-2px);
}

.node-header {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: bold;
  text-align: center;
}

.node-header strong {
  display: block;
  word-wrap: break-word;
  word-break: break-word;
}

.node-body {
  font-size: 12px;
}

.combined-label {
  display: block;
  opacity: 0.9;
  margin-bottom: 6px;
  font-style: italic;
}

.service-info {
  background: rgba(255, 255, 255, 0.15);
  padding: 8px;
  border-radius: 6px;
  margin-top: 6px;
}

.schema-preview {
  font-size: 12px;
  text-align: center;
  font-weight: 500;
}
</style>
