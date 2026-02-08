<template>
  <div class="start-node" :class="statusClass">
    <div class="start-box">
      <div class="start-content">
        <strong>{{ data.stepName || 'Start' }}</strong>
        <small v-if="data.stepName">شروع جریان</small>
        <div v-if="nodeStatus === 'success'" class="status-icon success">✓</div>
        <div v-if="nodeStatus === 'error'" class="status-icon error">✗</div>
        <div v-if="nodeStatus === 'executing'" class="status-icon executing">
          <span class="spinner"></span> در حال اجرا...
        </div>
      </div>
      <Handle type="target" position="top" id="in" />
    </div>
  </div>
</template>
<script setup>

import { Handle } from '@vue-flow/core'
import { useFlowStore } from '@/stores/flowStore'
import { computed, inject, onMounted } from 'vue';

const store = useFlowStore()

const props = defineProps({
  id: { type: String, required: true },
  data: { type: Object, required: true },
})
onMounted(() => {
  console.log(props.data, 'datadatadatadata')
});
const nodeStatus = computed(() => {
  return store.executionStatus?.[props.id] ?? 'idle'
})
const statusClass = computed(() => ({
  'status-executing': nodeStatus.value === 'executing',
  'status-success': nodeStatus.value === 'success',
  'status-error': nodeStatus.value === 'error',
  'status-idle': nodeStatus.value === 'idle',
}))

const nodeResult = computed(() => store.nodeResults?.[props.id] || null)

</script>

<style scoped lang="scss">
.start-node {
  position: relative;
  width: 180px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.start-box {
  width: 160px;
  height: 70px;
  background: #289604;
  border: 3px solid #289604;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: 0 2px 8px rgba(8, 166, 22, 0.925);
  cursor: pointer;
  transition: all 0.2s ease;
}

.start-box:hover {
  box-shadow: 0 4px 12px rgba(8, 166, 22, 0.925);
  transform: scale(1.05);
}

/* Notch on the right side */
.start-box::after {
  content: '';
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-top: 12px solid transparent;
  border-bottom: 12px solid transparent;
}

.start-box::before {
  content: '';
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-top: 10px solid transparent;
  border-bottom: 10px solid transparent;
}

.start-content {
  text-align: center;
  color: #eee;
  font-size: 14px;
  z-index: 10;
  position: relative;
}

.start-content strong {
  display: block;
  margin-bottom: 2px;
  font-weight: 600;
  font-size: 17px;
}

.start-content small {
  display: block;
  font-size: 14px;
}

/* Status icons */
.status-icon {
  position: absolute;
  top: 6px;
  right: 10px;
  font-size: 1.5rem;
  font-weight: bold;
  line-height: 1;
}

.success {
  left: 90px;
  top: 0px;
  color: white;
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.4);
}

.error {
  color: white;
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.4);
}

.executing {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: white;
}

/* Spinner inside executing state */
.spinner {
  width: 14px;
  height: 14px;
  border: 2.5px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
.status-idle .start-box {
  background: #289604 !important;
  border-color: #289604 !important;
  box-shadow: 0 2px 8px rgba(8, 166, 22, 0.925) !important;
  animation: none !important;
}

.status-idle .status-icon {
  display: none;
}
/* Animations */
@keyframes gradient-flow {
  0% {
    background-position: 0% 50%;
  }

  100% {
    background-position: 200% 50%;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes error-shake {

  0%,
  100% {
    transform: translateX(0);
  }

  20%,
  60% {
    transform: translateX(-4px);
  }

  40%,
  80% {
    transform: translateX(4px);
  }
}

/* Hover effect (optional) */
.start-box:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
}
</style>
