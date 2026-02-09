<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
    <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
      <!-- Header -->
      <div class="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4 flex justify-between items-center">
        <h2 class="text-xl font-bold text-white">اجرای Aggregate</h2>
        <button @click="closeModal" class="text-white text-2xl leading-none hover:opacity-75">×</button>
      </div>

      <!-- Body -->
      <div class="p-6 space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">داده‌های ورودی (JSON)</label>
          <textarea
            v-model="jsonInput"
            placeholder='{"nationalId": "0079714422", "mobileNumber": "09331007051"}'
            class="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
            :class="{ 'border-red-500 focus:ring-red-500': jsonError }"
            dir="ltr"
          />
          <small v-if="jsonError" class="text-red-600 mt-1 block">{{ jsonError }}</small>
          <small class="text-gray-600 mt-1 block">یک JSON معتبر وارد کنید یا خالی بگذارید برای بدون داده</small>
        </div>

        <!-- Preview -->
        <div v-if="parsedJson" class="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 class="font-semibold text-gray-700 mb-2">پیش‌نمایش:</h3>
          <pre dir="ltr" class="text-xs text-gray-600 overflow-auto max-h-32">{{ JSON.stringify(parsedJson, null, 2) }}</pre>
        </div>
      </div>

      <!-- Footer -->
      <div class="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
        <button
          @click="closeModal"
          class="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium rounded-lg transition"
        >
          لغو
        </button>
        <button
          @click="executeAggregate"
          :disabled="isExecuting "
          class="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <font-awesome-icon v-if="isExecuting" :icon="faSpinner" class="animate-spin" />
          <span>{{ isExecuting ? 'درحال اجرا...' : 'اجرا' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { notify } from '@kyvg/vue3-notification'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import serviceAggregatorClient from '@/utils/service-aggregator-client'

const props = defineProps({
  aggregateId: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['execute', 'close'])

const isOpen = ref(false)
const jsonInput = ref('')
const isExecuting = ref(false)
const jsonError = ref('')

// Parse and validate JSON
const parsedJson = computed(() => {
  if (!jsonInput.value.trim()) {
    jsonError.value = ''
    return null
  }

  try {
    jsonError.value = ''
    return JSON.parse(jsonInput.value)
  } catch (error) {
    jsonError.value = `JSON غلط: ${error.message}`
    return null
  }
})

const openModal = () => {
  isOpen.value = true
  jsonInput.value = ''
  jsonError.value = ''
}

const closeModal = () => {
  isOpen.value = false
  jsonInput.value = ''
  jsonError.value = ''
}

const executeAggregate = async () => {
  if (!props.aggregateId) {
    notify({
      title: 'خطا',
      text: 'تجمیع سرویس ID یافت نشد',
      type: 'error'
    })
    return
  }

  if (jsonError.value) {
    notify({
      title: 'خطا',
      text: 'لطفاً JSON معتبر وارد کنید',
      type: 'error'
    })
    return
  }

  isExecuting.value = true

  try {
    const payload = {
      id: props.aggregateId,
      data: parsedJson.value || {}
    }

    console.log('Executing aggregate with payload:', payload)

    const response = await serviceAggregatorClient.executeAggregate(payload)

    notify({
      title: 'موفق',
      text: 'Aggregate با موفقیت اجرا شد',
      type: 'success'
    })

    // Emit response before closing so parent can handle execution animation
    emit('execute', response)

    // Close modal after emitting response
    closeModal()

  } catch (error) {
    console.error('Execution failed:', error)
    notify({
      title: 'خطا',
      text: error?.message || 'خطا در اجرای Aggregate',
      type: 'error'
    })
  } finally {
    isExecuting.value = false
  }
}

defineExpose({
  openModal,
  closeModal
})
</script>

<style scoped>
:deep(.animate-spin) {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
