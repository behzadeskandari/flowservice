<template>
  <div class="start-node">
    <div class="start-box">
      <div class="start-content">
        <strong>{{ data.stepName || 'Start' }}</strong>
        <small v-if="data.stepName">شروع جریان</small>
      </div>
    </div>
    <Handle type="target" position="top" id="in" />
  </div>
</template>
<script setup>

import { Handle } from '@vue-flow/core'
import { useFlowStore } from '@/stores/flowStore'
import { onMounted } from 'vue';

const props = defineProps({
  id: { type: String, required: true },
  data: { type: Object, required: true },
})
onMounted(() => {
  console.log(props.data,'datadatadatadata')
});
const store = useFlowStore()


</script>

<style scoped>
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
  background:#289604;
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
  box-shadow: 0 4px 12px  rgba(8, 166, 22, 0.925);
  transform: scale(1.05);
}

/* Notch on the right side */
.start-box::after {
  content: '';

  position: absolute;
  /* right: -10px; */
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
  /* right: -10px; */
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
  color: #333;
  font-size: 14px;
  z-index: 10;
}

.start-content strong {
  display: block;
  margin-bottom: 2px;
  font-weight: 600;
  color: #eee;
  font-size: 17px;
}

.start-content small {
  display: block;
  color: #eee;
  font-size: 17px;
}
</style>
