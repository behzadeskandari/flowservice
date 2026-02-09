<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn"
    @click.self="onClose"
  >
    <div class="bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 p-[2px] rounded-3xl">
      <div class="bg-white dark:bg-gray-900 shadow-2xl rounded-3xl w-full max-w-2xl animate-scaleIn"
           style="width: 90vw; padding: 17px">

        <!-- Header -->
        <header class="flex items-center justify-between border-b pb-3 mb-4">
          <div class="flex gap-2">
            <button
              class="px-6 py-3 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:from-orange-500 hover:via-orange-600 hover:to-orange-700 transition duration-300 ease-in-out"
              @click="onClose"
            >
              <font-awesome-icon :icon="faArrowUp" style="color: white;" />
              <span class="header-btn-text">خروج</span>
            </button>
            <button
              class="px-6 py-3 bg-gradient-to-r from-green-400 via-green-500 to-green-600 text-white font-semibold rounded-xl shadow-lg hover:from-green-500 hover:via-green-600 hover:to-green-700 transition duration-300 ease-in-out"
              @click="onSave"
              :disabled="!formData.name"
            >
              <font-awesome-icon :icon="faSave" style="color: white;" />
              <span class="header-btn-text">ذخیره</span>
            </button>
          </div>
          <h3 class="text-xl font-bold text-gray-800 dark:text-gray-100 p-3">
            {{ isEditMode ? 'ویرایش تجمیع سرویس' : 'ایجاد تجمیع سرویس جدید' }}
          </h3>
        </header>

        <!-- Body -->
        <section class="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <!-- Aggregate Information Section -->
          <div class="space-y-4">
            <h4 class="text-lg font-semibold text-gray-700 dark:text-gray-200">اطلاعات تجمیع سرویس</h4>

            <!-- Name Field -->
            <div>
              <label class="block font-medium text-gray-500 mb-1 text-right px-1 py-1">نام *</label>
              <input
                v-model="formData.name"
                type="text"
                placeholder="نام تجمیع سرویس را وارد کنید"
                class="w-full px-4 py-2 rounded-xl border border-gray-300
                       focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
                       bg-white shadow-sm transition text-right"
                required
              />
            </div>

            <!-- Description Field -->
            <div>
              <label class="block font-medium text-gray-500 mb-1 text-right px-1 py-1">توضیحات (اختیاری)</label>
              <textarea
                v-model="formData.description"
                placeholder="شرح دهید که این مجموع/جریان چه کاری انجام می‌دهد"
                class="w-full px-4 py-2 rounded-xl border border-gray-300
                       focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
                       bg-white shadow-sm transition text-right"
                rows="4"
              ></textarea>
            </div>

            <!-- Status Toggle (Edit mode only) -->
            <div v-if="isEditMode" class="flex items-center justify-end">
              <label class="flex items-center cursor-pointer">
                <span class="mr-2 font-medium text-gray-700">وضعیت:</span>
                <div class="relative">
                  <input
                    type="checkbox"
                    class="sr-only"
                    v-model="formData.status"
                  >
                  <div
                    class="block bg-gray-300 w-14 h-8 rounded-full transition-colors duration-300"
                    :class="{'bg-green-500': formData.status}"
                  ></div>
                  <div
                    class="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-300"
                    :class="{'transform translate-x-6': formData.status}"
                  ></div>
                </div>
                <span class="mr-2 text-sm font-medium text-gray-700">
                  {{ formData.status ? 'فعال' : 'غیرفعال' }}
                </span>
              </label>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useFlowStore } from '@/stores/flowStore'
import serviceAggregatorClient from '@/utils/service-aggregator-client'
import { notify } from '@kyvg/vue3-notification'
import { faArrowUp, faSave } from '@fortawesome/free-solid-svg-icons'

const props = defineProps({
  show: Boolean,
  mode: {
    type: String,
    default: 'add',
    validator: (value) => ['add', 'edit'].includes(value)
  }
})

const emit = defineEmits(['update:show', 'saved'])

const store = useFlowStore()
const isEditMode = ref(false)

const formData = ref({
  id: null,
  name: '',
  description: '',
  status: true,
})

const resetForm = () => {
  formData.value = {
    id: null,
    name: '',
    description: '',
    status: true,
  }
}

const onClose = () => {
  emit('update:show', false)
  resetForm()
}

const onSave = async () => {
  if (!formData.value.name) {
    notify({
      title: 'خطا',
      text: 'نام تجمیع سرویس مورد نیاز است',
      type: 'error',
    })
    return
  }

  try {
    if (isEditMode.value && formData.value.id) {
      // Update existing aggregate
      await serviceAggregatorClient.updateAggregate({
        id: formData.value.id,
        name: formData.value.name,
        description: formData.value.description,
        status: formData.value.status,
      })
      notify({
        title: 'موفق',
        text: 'تجمیع سرویس با موفقیت به‌روزرسانی شد',
        type: 'success',
      })
    } else {
      // Create new aggregate
      const response = await serviceAggregatorClient.createAggregate({
        name: formData.value.name,
        description: formData.value.description,
      })

      // Set the newly created aggregate as current
      store.currentAggregateId = response.id

      notify({
        title: 'موفق',
        text: 'تجمیع سرویس با موفقیت ایجاد شد',
        type: 'success',
      })
    }

    emit('update:show', false)
    emit('saved')
    resetForm()
  } catch (error) {
    console.error('Error saving aggregate:', error)
    notify({
      title: 'خطا',
      text: isEditMode.value ? 'خطا در به‌روزرسانی تجمیع سرویس' : 'خطا در ایجاد تجمیع سرویس',
      type: 'error',
    })
  }
}

watch(() => props.show, async (newVal) => {
  if (newVal) {
    isEditMode.value = props.mode === 'edit'

    if (isEditMode.value && store.currentAggregateId) {
      // Load current aggregate data for editing
      try {
        const aggregates = await serviceAggregatorClient.getAggregates()
        console.log(
          aggregates,'agggregatessssss'
        )
        const agg = Array.isArray(aggregates.items)
          ? aggregates.items.find(a => a.id === store.currentAggregateId)
          : (aggregates.items.id === store.currentAggregateId ? aggregates : null)
        if (agg) {
          formData.value.id = agg.id
          formData.value.name = agg.name || ''
          formData.value.description = agg.description || ''
          formData.value.status = agg.status !== undefined ? agg.status : true
        }
      } catch (error) {
        console.error('Failed to load aggregate data for edit:', error)
      }
    }
  } else {
    resetForm()
  }
}, { immediate: true })
</script>

<style scoped>
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes scaleIn {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-in-out;
}

.animate-scaleIn {
  animation: scaleIn 0.3s ease-in-out;
}

.header-btn-text {
  display: inline;
  white-space: nowrap;
}

/* Toggle Switch Styles */
input:checked + .dot {
  transform: translateX(100%);
  background-color: #48bb78;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .header-btn-text {
    display: none;
  }

  .modal-content {
    width: 95vw !important;
    padding: 10px !important;
  }

  .btn {
    padding: 0.5rem 1rem;
  }
}
</style>
