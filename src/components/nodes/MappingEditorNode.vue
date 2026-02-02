// // MappingEditorNode.vue


<!-- src/components/nodes/MappingEditorNode.vue -->
<template>
  <div class="mapping-editor-node bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden w-full max-w-2xl">
    <!-- Header -->
    <div class="bg-gradient-to-r from-indigo-600 to-purple-600 p-4">
      <h3 class="text-white font-bold text-lg">📊 Field Mapping Editor</h3>
      <p class="text-indigo-100 text-sm mt-1">Drag to connect input fields to output fields</p>
    </div>

    <!-- Main Content -->
    <div class="p-6">
      <!-- Source and Target Service Info -->
      <div class="grid grid-cols-2 gap-4 mb-6">
        <div class="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p class="text-xs font-semibold text-blue-600 mb-1">Source Service</p>
          <p class="text-sm font-bold text-gray-800">{{ sourceServiceName || 'Unknown' }}</p>
        </div>
        <div class="p-3 bg-green-50 rounded-lg border border-green-200">
          <p class="text-xs font-semibold text-green-600 mb-1">Target Service</p>
          <p class="text-sm font-bold text-gray-800">{{ targetServiceName || 'Unknown' }}</p>
        </div>
      </div>

      <!-- Mapping Container -->
      <div class="flex gap-8">
        <!-- Input Fields (Source) -->
        <div class="flex-1">
          <h4 class="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <i class="fas fa-arrow-right text-blue-500"></i>
            Inputs
          </h4>
          <div class="space-y-2 p-4 bg-blue-50 rounded-lg min-h-64 border-2 border-blue-200">
            <div
              v-for="field in inputFields"
              :key="field.id"
              :draggable="true"
              @dragstart="startDrag($event, field, 'input')"
              class="p-3 bg-blue-100 hover:bg-blue-200 rounded-lg cursor-move transition border-l-4 border-blue-500 hover:shadow-md"
            >
              <p class="text-xs font-semibold text-blue-700">{{ field.name }}</p>
              <p class="text-xs text-blue-600">{{ field.type }}</p>
            </div>
            <div v-if="inputFields.length === 0" class="text-center py-8 text-gray-400">
              <p class="text-sm">No input fields</p>
            </div>
          </div>
        </div>

        <!-- Output Fields (Target) -->
        <div class="flex-1">
          <h4 class="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <i class="fas fa-arrow-left text-green-500"></i>
            Outputs
          </h4>
          <div class="space-y-2 p-4 bg-green-50 rounded-lg min-h-64 border-2 border-green-200"
            @dragover="dragOverOutput"
            @drop="dropOnOutput"
          >
            <div
              v-for="field in outputFields"
              :key="field.id"
              class="p-3 bg-green-100 rounded-lg transition border-r-4 border-green-500"
            >
              <p class="text-xs font-semibold text-green-700">{{ field.name }}</p>
              <p class="text-xs text-green-600">{{ field.type }}</p>
            </div>
            <div v-if="outputFields.length === 0" class="text-center py-8 text-gray-400">
              <p class="text-sm">No output fields</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Mappings List -->
      <div v-if="fieldMappings.length > 0" class="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 class="text-sm font-bold text-gray-700 mb-3">Active Mappings</h4>
        <div class="space-y-2">
          <div
            v-for="(mapping, idx) in fieldMappings"
            :key="idx"
            class="flex items-center justify-between p-3 bg-white rounded-lg border-l-4 border-indigo-500"
          >
            <div class="flex-1">
              <p class="text-sm font-semibold text-gray-800">
                <span class="text-blue-600">{{ mapping.sourceField }}</span>
                <i class="fas fa-arrow-right text-gray-400 mx-2"></i>
                <span class="text-green-600">{{ mapping.targetField }}</span>
              </p>
            </div>
            <button
              @click="removeMapping(idx)"
              class="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition"
            >
              <i class="fas fa-trash"></i> Remove
            </button>
          </div>
        </div>
      </div>

      <!-- Helper Text -->
      <div class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p class="text-xs text-yellow-800">
          <i class="fas fa-info-circle mr-2"></i>
          Drag a field from the left (Input) and drop it on the right (Output) to create a mapping.
        </p>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex gap-3 p-4 border-t border-gray-200 bg-gray-50">
      <button
        @click="$emit('delete-mapping')"
        class="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition"
      >
        <i class="fas fa-trash mr-2"></i> Delete Mapping
      </button>
      <button
        @click="$emit('save-mapping')"
        class="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition"
      >
        <i class="fas fa-save mr-2"></i> Save Mappings
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  edge: {
    type: Object,
    default: null
  },
  sourceStepData: {
    type: Object,
    default: null
  },
  targetStepData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['delete-mapping', 'save-mapping', 'add-mapping'])

// Input and Output fields from connected services
const inputFields = computed(() => {
  return props.sourceStepData?.service?.outputs || []
})

const outputFields = computed(() => {
  return props.targetStepData?.service?.inputs || []
})

// Service names
const sourceServiceName = computed(() => {
  return props.sourceStepData?.service?.name || 'Unknown'
})

const targetServiceName = computed(() => {
  return props.targetStepData?.service?.name || 'Unknown'
})

// Field mappings for this edge
const fieldMappings = ref([])

// Drag and drop handling
let draggedField = null

const startDrag = (event, field, type) => {
  draggedField = { field, type }
  event.dataTransfer.effectAllowed = 'copy'
  event.dataTransfer.setData('text/plain', JSON.stringify(field))
}

const dragOverOutput = (event) => {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'copy'
}

const dropOnOutput = (event) => {
  event.preventDefault()

  if (!draggedField || draggedField.type !== 'input') return

  const targetField = outputFields.value.find(f => f.name === event.target.textContent.trim())
  if (!targetField) return

  // Add mapping
  const newMapping = {
    sourceField: draggedField.field.name,
    targetField: targetField.name,
    source: props.sourceStepData?.id,
    sourceFieldId: draggedField.field.id,
    targetFieldId: targetField.id
  }

  // Check if mapping already exists
  if (!fieldMappings.value.some(m =>
    m.sourceField === newMapping.sourceField &&
    m.targetField === newMapping.targetField
  )) {
    fieldMappings.value.push(newMapping)
    emit('add-mapping', newMapping)
  }

  draggedField = null
}

const removeMapping = (idx) => {
  fieldMappings.value.splice(idx, 1)
}
</script>

<style scoped>
.mapping-editor-node {
  font-family: system-ui, sans-serif;
}
</style>

