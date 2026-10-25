<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4"
      @click.self="closeModal"
    >
      <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto flex flex-col">
        <!-- Header -->
        <div class="p-5 border-b flex justify-between items-center bg-gray-50">
          <div>
            <h2 class="text-lg font-bold text-gray-800">تعریف ورودی(JSON) تجمیع</h2>
            <p class="text-sm text-gray-500">{{ aggregateName }}</p>
          </div>
          <button
            @click="closeModal"
            class="text-gray-500 hover:text-gray-800 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <!-- Toolbar -->
        <div class="p-4 border-b flex flex-wrap gap-2 bg-gray-50">
          <button
            @click="loadFromBackend"
            :disabled="loading"
            class="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <font-awesome-icon :icon="faDownload" /> بارگذاری از سرور
          </button>
          <button
            @click="beautify"
            :disabled="loading || !jsonText.trim()"
            class="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <font-awesome-icon :icon="faWandMagic" /> کمپک کردن JSON
          </button>
          <button
            @click="clearContent"
            :disabled="loading || !jsonText.trim()"
            class="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <font-awesome-icon :icon="faEraser" /> پاک کردن
          </button>
          <button
            @click="save"
            :disabled="loading || !dirty"
            class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <font-awesome-icon :icon="faSave" /> ذخیره در سرور
          </button>
        </div>

        <!-- Editor -->
        <div class="p-4 flex-1 overflow-auto relative">
          <textarea
            v-model="jsonText"
            :class="{
              'border-red-500 focus:ring-red-500': jsonError,
              'border-green-500 focus:ring-green-500': !jsonError && isValid && jsonText.trim(),
            }"
            class="w-full h-full font-mono text-sm border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:border-transparent transition dir-ltr"
            dir="ltr"
            spellcheck="false"
            placeholder='مثال: { "nationalId": "0079714422", "mobileNumber": "09331007051" }'
            @input="onInput"
          />
          <div
            v-if="jsonError"
            class="absolute bottom-2 right-2 text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded max-w-[80%]"
          >
            {{ jsonError }}
          </div>
          <div v-else-if="isValid && jsonText.trim()" class="absolute bottom-2 right-2 text-xs text-green-600 bg-green-50 border border-green-200 px-3 py-1.5 rounded">
            JSON معتبر است
          </div>
        </div>

        <!-- Footer -->
        <div class="p-4 border-t flex justify-between items-center bg-gray-50">
          <span class="text-xs text-gray-500">{{ statusText }}</span>
          <button
            @click="closeModal"
            class="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { notify } from '@kyvg/vue3-notification'
import { faDownload, faSave, faWandMagic, faEraser } from '@fortawesome/free-solid-svg-icons'
import { useFlowStore } from '@/stores/flowStore'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  aggregateId: {
    type: String,
    required: true,
  },
  aggregateName: {
    type: String,
    default: '',
  },
  // Saved input JSON definition coming from the store/backend
  modelValue: {
    type: [String, null],
    default: null,
  },
})

const emit = defineEmits(['update:modelValue', 'close'])

const store = useFlowStore()

const jsonText = ref(props.modelValue || '')
const jsonError = ref('')
const loading = ref(false)

const isValid = computed(() => {
  if (!jsonText.value || !jsonText.value.trim()) return true
  try {
    JSON.parse(jsonText.value)
    return true
  } catch {
    return false
  }
})

const dirty = computed(() => jsonText.value !== (props.modelValue || ''))

const statusText = computed(() => {
  if (loading.value) return 'در حال پردازش...'
  if (jsonError.value) return 'JSON نامعتبر است'
  if (dirty.value) return 'تغییرات ذخیره نشده'
  return 'بدون تغییر'
})

watch(
  () => props.modelValue,
  (val) => {
    jsonText.value = val || ''
    jsonError.value = ''
  },
)

const onInput = () => {
  jsonError.value = ''
}

const openModal = () => {
  jsonError.value = ''
}

const closeModal = () => {
  emit('close')
}

const validateText = (text) => {
  if (!text || !text.trim()) {
    jsonError.value = ''
    return true
  }
  try {
    JSON.parse(text)
    jsonError.value = ''
    return true
  } catch (error) {
    jsonError.value = 'JSON نامعتبر است: ' + error.message
    return false
  }
}

const beautify = async () => {
  if (loading.value) return
  if (!validateText(jsonText.value)) return
  loading.value = true
  try {
    const parsed = jsonText.value.trim() ? JSON.parse(jsonText.value) : null
    jsonText.value = parsed === null ? '' : JSON.stringify(parsed, null, 2)
    store.setAggregateInput(jsonText.value)
  } finally {
    loading.value = false
  }
}

const clearContent = async () => {
  if (loading.value) return
  jsonText.value = ''
  jsonError.value = ''
  store.setAggregateInput('')
}

const loadFromBackend = async () => {
  if (loading.value) return
  loading.value = true
  jsonError.value = ''
  try {
    await store.loadAggregateInput(props.aggregateId)
    jsonText.value = store.aggregateInputJson.value || ''
  } catch (error) {
    jsonError.value = 'بارگذاری ناموفق بود: ' + (error?.message || '')
  } finally {
    loading.value = false
  }
}

const save = async () => {
  if (loading.value) return
  if (!validateText(jsonText.value)) {
    notify({ title: 'خطا', text: 'لطفاً ابتدا خطای JSON را برطرف کنید', type: 'error' })
    return
  }

  // Push the edited text into the store (single source of truth for dirty state)
  store.setAggregateInput(jsonText.value || null)

  const ok = await store.saveAggregateInput()
  if (ok) {
    // Re-emit the persisted value so the parent stays in sync
    emit('update:modelValue', store.aggregateInputJson.value)
    jsonError.value = ''
  }
}

defineExpose({
  openModal,
  closeModal,
})
</script>

<style scoped>
textarea {
  resize: none;
}
</style>