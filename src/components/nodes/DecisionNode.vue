<template>
  <!-- @dblclick="openEdit" -->
  <div class="decision-node" :class="{
    'status-success': nodeStatus === 'success',
    'status-executing': nodeStatus === 'executing',
    'status-error': nodeStatus === 'error',
    'status-idle': nodeStatus === 'idle' || !nodeStatus
  }">
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
  </div>
</template>

<script setup>
import { Handle } from '@vue-flow/core'
import { useFlowStore } from '@/stores/flowStore'
import { computed } from 'vue'
const props = defineProps({
  id: { type: String, required: true },
  data: { type: Object, required: true },
})
const store = useFlowStore()
// function openEdit() {
//   store.setSelectedNode(props.id, 'edit')
// }
const nodeStatus = computed(() => store.executionStatus[props.id] ?? 'idle')
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
</style>
