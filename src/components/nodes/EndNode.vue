<template>
  <div class="end-node" @dblclick="openEdit">
    <div class="end-box">
      <div class="end-content">
        <strong>{{ data.stepName || 'End' }}</strong>
        <small v-if="data.stepName">پایان جریان</small>
      </div>
    </div>
    <Handle type="target" position="top" id="in" class="vue-flow__handle-target" />
  </div>
</template>

<script setup>
import { Handle } from '@vue-flow/core'
import { useFlowStore } from '@/stores/flowStore'

const props = defineProps({
  id: { type: String, required: true },
  data: { type: Object, required: true },
})

const store = useFlowStore()

function openEdit() {
  console.log('openEdit props.data', props.data)
  store.setSelectedNode(props.id, 'edit')
}
</script>

<style scoped>
.end-node {
  position: relative;
  width: 180px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.end-box {
  width: 160px;
  height: 70px;
  background: #ff7300;
  border: 3px solid #fc8f00;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: 0 2px 8px rgba(243, 149, 8, 0.925);
  cursor: pointer;
  transition: all 0.2s ease;
}

.end-box:hover {
  box-shadow: 0 4px 12px rgba(255, 174, 0, 0.932);
  transform: scale(1.05);
}

/* Notch on the right side */
.end-box::after {
  content: '';
  position: absolute;
  /* right: -10px; */
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-left: 8px solid #ff8800;
  border-top: 12px solid transparent;
  border-bottom: 12px solid transparent;
}

.end-box::before {
  content: '';
  position: absolute;
  /* right: -10px; */
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid #ff9900;
  border-top: 10px solid transparent;
  border-bottom: 10px solid transparent;
}

.end-content {
  text-align: center;
  color: #333;
  font-size: 14px;
  z-index: 10;
}

.end-content strong {
  display: block;
  margin-bottom: 2px;
  font-weight: 600;
}

.end-content small {
  display: block;
  color: #666;
  font-size: 11px;
}

/* Handle styling */
.vue-flow__handle {
  width: 12px !important;
  height: 12px !important;
  border: 2px solid white !important;
  border-radius: 50% !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
}

.vue-flow__handle-target {
  background: #10b981 !important; /* green for input */
}

.vue-flow__handle:hover {
  transform: scale(1.2);
  transition: transform 0.2s ease;
}
</style>
