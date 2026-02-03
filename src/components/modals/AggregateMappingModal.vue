<template>
  <div v-if="show" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

      <!-- Header -->
      <div class="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 z-10 flex items-center justify-between">
        <h2 class="text-xl font-bold text-gray-900 dark:text-white text-right">
          مدیریت Mapping ها
        </h2>
        <button
          @click="$emit('close')"
          class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl"
        >
          ×
        </button>
      </div>

      <!-- Content -->
      <div class="p-6">

        <!-- Add button -->
        <button
          @click="addMapping"
          class="w-full mb-6 py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800
                 text-white font-medium rounded-xl shadow-md transition-all duration-200 flex items-center justify-center gap-2"
        >
          <span class="text-lg">➕</span> افزودن Mapping جدید
        </button>

        <!-- Cards -->
        <div class="space-y-5">
          <div
            v-for="(m, index) in visibleMappings"
            :key="m.tempId"
            class="border border-gray-200 dark:border-gray-700 rounded-xl p-5 bg-gray-50 dark:bg-gray-800/50 relative shadow-sm hover:shadow transition-shadow"
          >
            <!-- Status badge -->
            <span
              v-if="m.__status"
              class="absolute top-3 left-3 text-xs font-medium px-2.5 py-1 rounded-full"
              :class="badgeClass(m.__status)"
            >
              {{ statusLabel(m.__status) }}
            </span>

            <!-- Parent selector (skip for first item) -->
            <div class="mb-5">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 text-right">
                Parent
              </label>
              <div v-if="index === 0" class="text-sm text-gray-500 dark:text-gray-400 py-2.5 px-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                — (ریشه - بدون والد)
              </div>
              <select
                v-else
                v-model="m.parentId"
                @change="markUpdated(m)"
                class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                       transition duration-150"
                required
              >
                <option value="" disabled>انتخاب کنید</option>
                <option v-for="option in parentOptions(m.tempId)" :key="option.id" :value="option.id">
                  {{ option.name || 'بدون نام' }}
                </option>
              </select>
            </div>

            <!-- Fields -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 text-right">
                  نام
                </label>
                <input
                  v-model="m.name"
                  @input="markUpdated(m)"
                  class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                         transition duration-150"
                  placeholder="نام فیلد"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 text-right">
                  نوع
                </label>
                <select
                  v-model="m.type"
                  @change="markUpdated(m)"
                  class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                         transition duration-150"
                >
                  <option value="">انتخاب کنید</option>
                  <option value="string">string</option>
                  <option value="number">number</option>
                  <option value="boolean">boolean</option>
                  <option value="object">object</option>
                </select>
              </div>

              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 text-right">
                  توضیحات
                </label>
                <textarea
                  v-model="m.description"
                  @input="markUpdated(m)"
                  rows="3"
                  class="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                         transition duration-150 resize-y min-h-[80px]"
                  placeholder="توضیحات اختیاری..."
                ></textarea>
              </div>
            </div>

            <!-- Delete button -->
            <div class="flex justify-end mt-6">
              <button
                @click="removeMapping(m)"
                class="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg
                       shadow-sm transition-all duration-200 flex items-center gap-2"
              >
                <span>🗑</span> حذف
              </button>
            </div>
          </div>
        </div>

        <!-- Footer buttons -->
        <div class="flex flex-col sm:flex-row justify-end gap-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            @click="$emit('close')"
            class="px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600
                   text-gray-800 dark:text-gray-200 font-medium rounded-xl transition duration-200"
          >
            انصراف
          </button>
          <button
            @click="saveAll"
            class="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl
                   shadow-md transition duration-200"
          >
            ذخیره تغییرات
          </button>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// ──────────────────────────────────────────────
// Your existing script logic remains 100% unchanged
// ──────────────────────────────────────────────

import { ref, computed, onMounted } from 'vue'
import serviceAggregatorClient from '@/utils/service-aggregator-client'
import { notify } from '@kyvg/vue3-notification';

const props = defineProps<{
  show: boolean
  aggregateId: string | null
}>()

const emit = defineEmits(['close', 'saved'])

const mappings = ref<any[]>([])

const visibleMappings = computed(() =>
  mappings.value.filter(m => m.__status !== 'deleted')
)

onMounted(async () => {
  if (!props.aggregateId) return

  const aggregate = await serviceAggregatorClient.getAggregateByid(props.aggregateId)

  mappings.value = (aggregate.mappings || []).map(m => ({
    ...m,
    tempId: crypto.randomUUID(),
    __status: undefined
  }))
})

const addMapping = () => {
  mappings.value.unshift({
    tempId: crypto.randomUUID(),
    aggregateId: props.aggregateId!,
    name: '',
    type: '',
    description: '',
    __status: 'new',
    parentId: null
  })
}

const markUpdated = (m: any) => {
  if (m.id && !m.__status) {
    m.__status = 'updated'
  }
}

const removeMapping = (m: any) => {
  if (m.id) {
    m.__status = 'deleted'
  } else {
    mappings.value = mappings.value.filter(x => x.tempId !== m.tempId)
  }
}

const saveAll = async () => {
  if (!validateMappings()) return

  for (const m of mappings.value.filter(x => x.__status === 'new'))
    await serviceAggregatorClient.addAggregateMapping(m)

  for (const m of mappings.value.filter(x => x.__status === 'updated'))
    await serviceAggregatorClient.updateAggregateMapping(m)

  for (const m of mappings.value.filter(x => x.__status === 'deleted'))
    await serviceAggregatorClient.deleteAggregateMapping({ id: m.id })

  emit('saved')
}

/* UI helpers */
const statusLabel = (s: string) =>
  s === 'new' ? 'جدید' : s === 'updated' ? 'ویرایش شده' : 'حذف شده'

const badgeClass = (s: string) => ({
  new: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  updated: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  deleted: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
}[s] || '')

const parentOptions = (currentTempId: string) => {
  return mappings.value
    .filter(m => m.tempId !== currentTempId && m.__status !== 'deleted')
    .map(m => ({ id: m.id || m.tempId, name: m.name }))
}

const validateMappings = () => {
  for (let i = 1; i < mappings.value.length; i++) {
    const m = mappings.value[i]
    if (!m.parentId) {
      notify({
        title: 'خطا',
        text: `برای Mapping شماره ${i + 1} باید یک Parent انتخاب کنید.`,
        type: 'error',
      })
      return false
    }
  }
  return true
}
</script>
