<!-- src/components/nodes/MappingEditorNode.vue -->
<template>
  <div class="mapping-editor-node bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden w-80 min-h-[320px] flex flex-col">
    <!-- Top buttons bar -->
    <div class="bg-gradient-to-r from-indigo-600 to-purple-600 p-3 flex justify-center gap-4">
      <button
        @click="$emit('delete-node')"
        class="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg shadow transition transform hover:scale-105 active:scale-95"
      >
        Delete
      </button>
      <button
        @click="$emit('add-field')"
        class="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg shadow transition transform hover:scale-105 active:scale-95"
      >
        Add
      </button>
      <button
        @click="$emit('update-node')"
        class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow transition transform hover:scale-105 active:scale-95"
      >
        Update
      </button>
    </div>

    <!-- Main dashed area -->
    <div class="relative flex-1 border-2 border-dashed border-gray-400 rounded-lg m-4 bg-gray-50/40">
      <!-- Labels -->
      <div class="absolute top-3 left-4 text-sm font-bold text-gray-700">
        input: [ ]
      </div>
      <div class="absolute bottom-3 left-4 text-sm font-bold text-gray-700">
        output: [ ]
      </div>

      <!-- Input fields (upper half) -->
      <div class="absolute inset-x-4 top-10 bottom-1/2 flex flex-wrap gap-3 content-start">
        <div
          v-for="field in inputFields"
          :key="field.id"
          class="px-4 py-2 rounded-full text-xs font-medium shadow-sm cursor-pointer transition-all hover:scale-105 hover:shadow-md"
          :class="field.color"
        >
          {{ field.name }}
        </div>
      </div>

      <!-- Output fields (lower half) -->
      <div class="absolute inset-x-4 top-1/2 bottom-10 flex flex-wrap gap-3 content-end">
        <div
          v-for="field in outputFields"
          :key="field.id"
          class="px-4 py-2 rounded-full text-xs font-medium shadow-sm cursor-pointer transition-all hover:scale-105 hover:shadow-md"
          :class="field.color"
        >
          {{ field.name }}
        </div>
      </div>

      <!-- Curved connection lines -->
      <svg class="absolute inset-0 pointer-events-none" preserveAspectRatio="none">
        <path
          v-for="(link, idx) in exampleLinks"
          :key="idx"
          :d="getCurvedPath(link)"
          stroke="#6366f1"
          stroke-width="1.5"
          fill="none"
          stroke-dasharray="4 2"
          opacity="0.7"
        />
      </svg>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

// Demo data – in real app these would come from props.data
const inputFields = ref([
  { id: 1, name: 'userId',     color: 'bg-emerald-100 text-emerald-800' },
  { id: 2, name: 'amount',     color: 'bg-blue-100 text-blue-800' },
  { id: 3, name: 'createdAt',  color: 'bg-purple-100 text-purple-800' },
  { id: 4, name: 'status',     color: 'bg-amber-100 text-amber-800' },
  { id: 5, name: 'email',      color: 'bg-pink-100 text-pink-800' },
  { id: 6, name: 'phone',      color: 'bg-cyan-100 text-cyan-800' },
])

const outputFields = ref([
  { id: 7,  name: 'user_id',   color: 'bg-emerald-200 text-emerald-900' },
  { id: 8,  name: 'total',     color: 'bg-blue-200 text-blue-900' },
  { id: 9,  name: 'date',      color: 'bg-purple-200 text-purple-900' },
  { id: 10, name: 'isActive',  color: 'bg-amber-200 text-amber-900' },
  { id: 11, name: 'mail',      color: 'bg-pink-200 text-pink-900' },
  { id: 12, name: 'mobile',    color: 'bg-cyan-200 text-cyan-900' },
])

// Demo connections (input id → output id)
const exampleLinks = ref([
  { from: 1, to: 7 },
  { from: 2, to: 8 },
  { from: 3, to: 9 },
  { from: 4, to: 10 },
])

const getCurvedPath = ({ from, to }) => {
  // Very rough approximation – in real app you'd calculate real positions
  const y1 = 80 + from * 35
  const y2 = 220 + (to - 7) * 35
  return `M 60,${y1} Q 200,${(y1 + y2)/2} 460,${y2}`
}

// Optional: emit events for parent to handle
defineEmits(['delete-node', 'add-field', 'update-node'])
</script>

<style scoped>
.mapping-editor-node {
  font-family: system-ui, sans-serif;
}
</style>
