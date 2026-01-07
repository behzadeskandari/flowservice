<template>
  <!-- @dblclick="openEdit" -->
  <div class="decision-node">
    <div class="diamond">
      <div class="diamond-content">
        <strong class="title">{{ data.stepName || 'شرط' }}</strong>
        <small class="condition" v-if="data.condition">if {{ data.condition }}</small>
        <small class="condition" v-else>مشروط</small>
        <small class="params" v-if="data.conditionParameters">پارامترها: {{ data.conditionParameters }}</small>
      </div>
    </div>
    <Handle type="target" position="left" id="in" />
    <Handle type="source" position="right" id="out" />
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
// function openEdit() {
//   store.setSelectedNode(props.id, 'edit')
// }
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
</style>
