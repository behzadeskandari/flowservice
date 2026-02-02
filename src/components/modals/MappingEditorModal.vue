// //MappingEditorModal

<template>
  <Teleport to="body">
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4"
      @click.self="closeModal"
    >
      <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        <!-- Header -->
        <div class="p-5 border-b flex justify-between items-center bg-gradient-to-r from-indigo-50 to-purple-50">
          <h2 class="text-xl font-bold text-indigo-800">Field Mapping Editor</h2>
          <button
            @click="closeModal"
            class="text-gray-500 hover:text-gray-800 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <!-- Main content -->
        <div class="p-6">
          <MappingEditorNode
            :edge="edge"
            :source-step-data="sourceStepData"
            :target-step-data="targetStepData"
            @delete-mapping="handleDeleteMapping"
            @save-mapping="handleSaveMapping"
            @add-mapping="handleAddMapping"
          />
        </div>

        <!-- Footer -->
        <div class="p-5 border-t bg-gray-50 flex justify-end gap-4">
          <button
            @click="closeModal"
            class="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium rounded-lg transition"
          >
            Cancel
          </button>
          <button
            @click="saveMappings"
            class="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition"
          >
            Save All
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { notify } from '@kyvg/vue3-notification'
import MappingEditorNode from '@/components/nodes/MappingEditorNode.vue'
import serviceAggregatorClient from '@/utils/service-aggregator-client'

const route = useRoute()

const props = defineProps({
  edge: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close'])

const showModal = ref(false)
const sourceStepData = ref(null)
const targetStepData = ref(null)
const fieldMappings = ref([])
const edge = computed(() => props.edge)

// Watch for edge prop changes and show modal
watch(() => props.edge, async (newEdge) => {
  console.log('Edge prop changed:', newEdge)
  if (newEdge) {
    // Fetch step data from the backend based on source and target node IDs
    try {
      // Extract aggregate ID and step IDs from edge
      const sourceNodeId = newEdge.source?.replace('node-', '')
      const targetNodeId = newEdge.target?.replace('node-', '')
      const aggregateId = route.params.id

      console.log('Source Node ID:', sourceNodeId)
      console.log('Target Node ID:', targetNodeId)
      console.log('Aggregate ID:', aggregateId)

      // Fetch aggregate data
      const aggregateData = await serviceAggregatorClient.getAggregateByid(aggregateId)
      console.log('Aggregate data:', aggregateData)

      // Find the source and target steps in the aggregate
      const sourceStep = aggregateData.steps?.find(step => step.id === sourceNodeId)
      const targetStep = aggregateData.steps?.find(step => step.id === targetNodeId)

      if (sourceStep) {
        sourceStepData.value = sourceStep
        console.log('Source step found:', sourceStep)
      } else {
        console.warn('Source step not found:', sourceNodeId)
      }

      if (targetStep) {
        targetStepData.value = targetStep
        console.log('Target step found:', targetStep)
      } else {
        console.warn('Target step not found:', targetNodeId)
      }

      showModal.value = true
    } catch (err) {
      console.error('Error loading step data:', err)
      notify({
        title: 'Error',
        text: 'Failed to load step data',
        type: 'error'
      })
    }
  } else {
    // When edge is null/cleared, close the modal
    showModal.value = false
  }
}, { deep: true })

const closeModal = () => {
  showModal.value = false
  sourceStepData.value = null
  targetStepData.value = null
  fieldMappings.value = []
  emit('close')
}

const handleDeleteMapping = () => {
  if (confirm('Are you sure you want to delete this mapping?')) {
    notify({
      title: 'Deleted',
      text: 'Mapping deleted successfully',
      type: 'success'
    })
  }
}

const handleAddMapping = (mapping) => {
  console.log('Mapping added:', mapping)
  fieldMappings.value.push(mapping)
  notify({
    title: 'Added',
    text: `Mapping created: ${mapping.sourceField} → ${mapping.targetField}`,
    type: 'success'
  })
}

const handleSaveMapping = () => {
  saveMappings()
}

const saveMappings = async () => {
  try {
    if (fieldMappings.value.length === 0) {
      notify({
        title: 'Warning',
        text: 'No mappings to save',
        type: 'warning'
      })
      return
    }

    // Save mappings to backend
    // const response = await serviceAggregatorClient.addAggregateStepMapping(fieldMappings.value)

    notify({
      title: 'Success',
      text: `${fieldMappings.value.length} field mapping(s) saved successfully`,
      type: 'success'
    })
    closeModal()
  } catch (err) {
    console.error('Error saving mappings:', err)
    notify({
      title: 'Error',
      text: 'Failed to save mappings',
      type: 'error'
    })
  }
}
</script>

