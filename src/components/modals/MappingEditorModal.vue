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
          <div v-if="edge" class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p class="text-sm text-gray-600">
              <strong>Edge:</strong> {{ edge.source }} → {{ edge.target }}
            </p>
          </div>

          <MappingEditorNode
            @delete-node="handleDelete"
            @add-field="handleAddField"
            @update-node="handleUpdate"
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
            Save Mapping
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { notify } from '@kyvg/vue3-notification'
import MappingEditorNode from '@/components/nodes/MappingEditorNode.vue'

const props = defineProps({
  edge: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close'])

const showModal = ref(false)
const currentEdge = ref(null)

// Watch for edge prop changes and show modal
watch(() => props.edge, (newEdge) => {
  console.log('Edge prop changed:', newEdge)
  if (newEdge) {
    currentEdge.value = newEdge
    showModal.value = true
  }
})

const edge = computed(() => currentEdge.value)

const closeModal = () => {
  showModal.value = false
  currentEdge.value = null
  emit('close')
}

const handleDelete = () => {
  notify({
    title: 'تایید',
    text: 'نگاشت حذف شد',
    type: 'info'
  })
}

const handleAddField = () => {
  notify({
    title: 'اضافه شد',
    text: 'فیلد جدید اضافه شد',
    type: 'success'
  })
}

const handleUpdate = () => {
  notify({
    title: 'بروزرسانی',
    text: 'نگاشت بروزرسانی شد',
    type: 'info'
  })
}

const saveMappings = () => {
  notify({
    title: 'موفق',
    text: 'نگاشت‌ها ذخیره شدند',
    type: 'success'
  })
  closeModal()
}

</script>
