<template>
  <div class="aggregate-node" @dblclick.stop="openEdit">
    <div class="aggregate-header">
      <strong class="aggregate-title">{{ data.name || data.label || 'Aggregate' }}</strong>
      <div class="actions">
        <button class="btn-add-step" @click.stop="addStep" title="Add step">+</button>
      </div>
    </div>
    <div class="aggregate-subtitle">ID: {{ data.aggregateId }}</div>
  </div>
</template>

<script setup>
import { useFlowStore } from '@/stores/flowStore'
import { ref } from 'vue'
const props = defineProps({ id: String, data: Object })
const store = useFlowStore()

function openEdit() {
  // Set current aggregate and let AppFlow handle showing modal on dblclick at node level
  store.currentAggregateId = props.data.aggregateId
}

function addStep() {
  store.stepModalInitialData = { aggregateId: props.data.aggregateId }
  store.stepModalOpen = true
}
</script>

<style scoped>
.aggregate-node {
  padding: 8px 12px;
  border-radius: 8px;
  background: linear-gradient(90deg, #fff7ed, #fff3e0);
  border: 1px solid #f6ad55;
  min-width: 220px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.06);
  text-align: right;
}
.aggregate-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.aggregate-title {
  font-size: 14px;
  color: #7c2d12;
}
.actions { display: flex; gap: 6px }
.btn-add-step {
  background: #ed8936;
  color: white;
  border-radius: 6px;
  border: none;
  width: 26px;
  height: 26px;
  cursor: pointer;
  font-weight: 700;
}
.aggregate-subtitle { font-size: 11px; color: #6b7280; margin-top: 6px }
</style>
