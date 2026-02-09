<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn"

  >
  <!-- @click.self="onClose" -->
    <div class="bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 p-[2px] rounded-3xl">
      <div
        class="bg-white dark:bg-gray-900 shadow-2xl rounded-3xl w-full max-w-2xl animate-scaleIn"
        style="width: 90vw; padding: 17px"
      >
        <!-- Header -->
        <header class="flex items-center justify-between border-b pb-3 mb-4" >
          <div class="flex gap-2">
            <button
              class="px-6 py-3 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:from-orange-500 hover:via-orange-600 hover:to-orange-700 transition duration-300 ease-in-out"
              @click="onClose"
            >
              <font-awesome-icon :icon="faArrowUp" style="color: white" />
              <span class="header-btn-text">خروج</span>
            </button>
            <button
              class="px-6 py-3 bg-gradient-to-r from-green-400 via-green-500 to-green-600 text-white font-semibold rounded-xl shadow-lg hover:from-green-500 hover:via-green-600 hover:to-green-700 transition duration-300 ease-in-out"
              @click="onSave"
              :disabled="!stepData.stepName"
            >
              <font-awesome-icon :icon="faSave" style="color: white" />
              <span class="header-btn-text">ذخیره</span>
            </button>
          </div>
          <h3 class="text-xl font-bold text-gray-800 dark:text-gray-100 p-3">
            {{ mode === 'add' ? 'ایجاد مرحله' : 'ویرایش مرحله' }}
          </h3>
        </header>

        <!-- Body -->
        <section class="space-y-4 max-h-[60vh] overflow-y-auto pr-2" >
          <!-- Step Information Section -->
          <div class="space-y-4">
            <h4 class="text-lg font-semibold text-gray-700 dark:text-gray-200">اطلاعات مرحله</h4>

            <!-- Step Name -->
            <div>
              <label class="block font-medium text-gray-500 mb-1 text-right px-1 py-1">نام مرحله *</label>
              <input
                v-model="stepData.stepName"
                type="text"
                placeholder="نام مرحله را وارد کنید"
                class="w-full px-4 py-2 rounded-xl border border-gray-300
                       focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
                       bg-white shadow-sm transition text-right"
                required
              />
            </div>

            <!-- Service Selection -->
            <div>
              <label class="block font-medium text-gray-500 mb-1 text-right px-1 py-1">خدمات (اختیاری)</label>
              <select
                v-model="stepData.serviceId"
                disabled
                class="w-full px-4 py-2 rounded-xl border border-gray-300
                       focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
                       bg-white shadow-sm transition text-right"
              >
                <option :value="null">-- بدون سرویس --</option>
                <option
                  v-for="service in availableServices"
                  :key="service.id"
                  :value="service.id"
                >
                  {{ service.name }} ({{ service.method }})
                </option>
              </select>
              <small class="block mt-1 text-gray-600 text-right">
                از بین سرویس‌های موجود انتخاب کنید. سرویس‌ها به صورت جداگانه مدیریت می‌شوند.
              </small>
            </div>

            <!-- Service Preview -->
            <div v-if="selectedService" class="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
              <p class="font-semibold text-gray-700 dark:text-gray-200 mb-2">سرویس انتخاب شده:</p>
              <ul class="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                <li><strong>Name:</strong> {{ selectedService.name }}</li>
                <li><strong>URL:</strong> {{ selectedService.url }}</li>
                <li><strong>Method:</strong> {{ selectedService.method }}</li>
                <li><strong>Type:</strong> {{ selectedService.type }}</li>
              </ul>
            </div>
          </div>

          <!-- Condition Section -->
          <div class="space-y-4 pt-4 border-t border-gray-300">
            <h4 class="text-lg font-semibold text-gray-700 dark:text-gray-200">شرایط (اختیاری)</h4>

            <div>
              <label class="block font-medium text-gray-500 mb-1 text-right px-1 py-1">بیان شرط</label>
              <input
                v-model="stepData.condition"
                type="text"
                placeholder="مثال: response.status === 200"
                class="w-full px-4 py-2 rounded-xl border border-gray-300
                       focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
                       bg-white shadow-sm transition text-right"
              />
              <small class="block mt-1 text-gray-600 text-right">
                برای مراحل معمولی خالی بگذارید. برای ایجاد یک گره تصمیم، یک شرط اضافه کنید.
              </small>
            </div>

            <div v-if="stepData.condition">
              <label class="block font-medium text-gray-500 mb-1 text-right px-1 py-1">پارامترهای شرایط</label>
              <input
                v-model="stepData.conditionParameters"
                type="text"
                placeholder="مثال: status,code"
                class="w-full px-4 py-2 rounded-xl border border-gray-300
                       focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
                       bg-white shadow-sm transition text-right"
              />
              <small class="block mt-1 text-gray-600 text-right">
                فهرست پارامترهای استفاده شده در عبارت شرط که با کاما از هم جدا شده‌اند.
              </small>
            </div>
          </div>

          <!-- Fields Section -->
          <div v-if="selectedService" class="space-y-4 pt-4 border-t border-gray-300">
            <h4 class="text-lg font-semibold text-gray-700 dark:text-gray-200">جزئیات فیلدها</h4>
            <div v-if="stepData.fields && stepData.fields.length > 0" class="space-y-2">
              <div
                v-for="(field, index) in stepData.fields"
                :key="index"
                class="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700"
              >
                <div class="flex items-center justify-between mb-2">
                  <strong class="text-gray-700 dark:text-gray-200">{{ field.name || 'Unnamed Field' }}</strong>
                  <button
                    type="button"
                    class="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                    @click="removeField(index)"
                    title="حذف فیلد"
                  >
                    ×
                  </button>
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <p><strong>Type:</strong> {{ field.type || 'string' }}</p>
                  <p v-if="field.required"><strong>Required:</strong> {{ field.required ? 'Yes' : 'No' }}</p>
                  <p v-if="field.description"><strong>Description:</strong> {{ field.description }}</p>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-4 text-gray-500 dark:text-gray-400">
              <p>هیچ فیلدی برای این سرویس تعریف نشده‌است</p>
            </div>
          </div>

          <!-- Step Connections -->
          <div class="space-y-4 pt-4 border-t border-gray-300">
            <h4 class="text-lg font-semibold text-gray-700 dark:text-gray-200">اتصالات مرحله ای</h4>

            <!-- Regular step (no condition) -->
            <div v-if="!stepData.condition">
              <label class="block font-medium text-gray-500 mb-1 text-right px-1 py-1">مرحله بعدی</label>
              <select
                v-model="stepData.nextStepId"
                class="w-full px-4 py-2 rounded-xl border border-gray-300
                       focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
                       bg-white shadow-sm transition text-right"
              >
                <option :value="null">-- هیچکدام (مرحله پایانی) --</option>
                <option
                  v-for="step in availableNextSteps"
                  :key="step.id"
                  :value="step.id"
                >
                  {{ step.stepName || `Step ${step.id.slice(0, 8)}` }}
                </option>
              </select>
            </div>

            <!-- Conditional step -->
            <template v-else>
              <div>
                <label class="block font-medium text-gray-500 mb-1 text-right px-1 py-1">True Path</label>
                <select
                  v-model="stepData.trueStepId"
                  class="w-full px-4 py-2 rounded-xl border border-gray-300
                         focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
                         bg-white shadow-sm transition text-right"
                >
                  <option :value="null">-- هیچ --</option>
                  <option
                    v-for="step in availableNextSteps"
                    :key="step.id"
                    :value="step.id"
                  >
                    {{ step.stepName || `Step ${step.id.slice(0, 8)}` }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block font-medium text-gray-500 mb-1 text-right px-1 py-1">False Path</label>
                <select
                  v-model="stepData.falseStepId"
                  class="w-full px-4 py-2 rounded-xl border border-gray-300
                         focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
                         bg-white shadow-sm transition text-right"
                >
                  <option :value="null">-- هیچ --</option>
                  <option
                    v-for="step in availableNextSteps"
                    :key="step.id"
                    :value="step.id"
                  >
                    {{ step.stepName || `Step ${step.id.slice(0, 8)}` }}
                  </option>
                </select>
              </div>
            </template>
          </div>

          <!-- Mappings Section -->
          <div v-if="mode === 'edit' && stepData.aggregateStepId" class="space-y-4 pt-4 border-t border-gray-300" dir="rtl">
            <div class="flex items-center justify-between">
              <h4 class="text-lg font-semibold text-gray-700 dark:text-gray-200">Mapping ها</h4>
              <button
                class="px-4 py-2 bg-gradient-to-r from-green-400 via-green-500 to-green-600 text-white font-semibold rounded-xl shadow-lg hover:from-green-500 hover:via-green-600 hover:to-green-700 transition duration-300 ease-in-out"
                @click="openAddMappingModal"
                type="button"
              >
                + افزودن Mapping
              </button>
            </div>

            <div v-if="stepData.mappings && stepData.mappings.length > 0" class="space-y-2">
              <div
                v-for="(mapping, index) in stepData.mappings"
                :key="mapping.id || index"
                class="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700"
              >
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2 flex-1">
                    <strong class="text-gray-700 dark:text-gray-200">
                      {{ mapping.targetField || 'بدون فیلد هدف' }}
                    </strong>
                    <span class="text-gray-500">←</span>
                    <span class="text-gray-600 dark:text-gray-300">
                      {{ mapping.sourceField || mapping.value || mapping.source || 'بدون منبع' }}
                    </span>
                  </div>
                  <div class="flex gap-2">
                    <button
                      class="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                      @click="openEditMappingModal(mapping)"
                      title="ویرایش"
                    >
                      ✏️
                    </button>
                    <button
                      class="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                      @click="deleteMapping(mapping.id)"
                      title="حذف"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div class="flex gap-2 flex-wrap mt-2">
                  <span class="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg text-xs">
                    {{ mapping.source || 'response' }}
                  </span>
                  <span v-if="mapping.valueType" class="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg text-xs">
                    {{ mapping.valueType }}
                  </span>
                  <span
                    v-if="mapping.status === false"
                    class="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg text-xs"
                  >
                    غیرفعال
                  </span>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-4 text-gray-500 dark:text-gray-400">
              <p>هیچ mapping ای برای این مرحله تعریف نشده است</p>
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- Mapping Modal -->
    <div
      v-if="showMappingModal"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] animate-fadeIn"
    >
      <!-- @click.self="closeMappingModal" -->
      <div class="bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 p-[2px] rounded-3xl">
        <div
          class="bg-white dark:bg-gray-900 shadow-2xl rounded-3xl w-full max-w-md animate-scaleIn"
          style="width: 90vw; padding: 17px"
        >
          <!-- Mapping Modal Header -->
          <header class="flex items-center justify-between border-b pb-3 mb-4">
            <div class="flex gap-2">
              <button
                class="px-6 py-3 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:from-orange-500 hover:via-orange-600 hover:to-orange-700 transition duration-300 ease-in-out"
                @click="closeMappingModal"
              >
                <font-awesome-icon :icon="faArrowUp" style="color: white" />
                <span class="header-btn-text">لغو</span>
              </button>
              <button
                class="px-6 py-3 bg-gradient-to-r from-green-400 via-green-500 to-green-600 text-white font-semibold rounded-xl shadow-lg hover:from-green-500 hover:via-green-600 hover:to-green-700 transition duration-300 ease-in-out"
                @click="saveMapping"
                :disabled="!currentMapping.targetField"
              >
                <font-awesome-icon :icon="faSave" style="color: white" />
                <span class="header-btn-text">ذخیره</span>
              </button>
            </div>
            <h4 class="text-xl font-bold text-gray-800 dark:text-gray-100 p-3">
              {{ mappingModalMode === 'add' ? 'افزودن Mapping' : 'ویرایش Mapping' }}
            </h4>
          </header>

          <!-- Mapping Modal Body -->
          <section class="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <!-- Source Type Selection -->
            <div>
              <label class="block font-medium text-gray-500 mb-1 text-right px-1 py-1">Source Type *</label>
              <select
                v-model="currentMapping.source"
                class="w-full px-4 py-2 rounded-xl border border-gray-300
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       bg-white shadow-sm transition text-right"
                required
                @change="onSourceTypeChange"
              >
                <option value="">-- نوع منبع را انتخاب کنید --</option>
                <option value="Constant">Constant</option>
                <option value="AggregateInput">Aggregate Input</option>
                <option value="StepOutput">Step Output</option>
              </select>
              <small class="block mt-1 text-gray-600 text-right">
                نوع منبع داده را انتخاب کنید
              </small>
            </div>

            <!-- Step Selection (shown when source is StepOutput) -->
            <div v-if="currentMapping.source === 'StepOutput'">
              <label class="block font-medium text-gray-500 mb-1 text-right px-1 py-1">Select Step *</label>
              <select
                v-model="currentMapping.inputStepId"
                class="w-full px-4 py-2 rounded-xl border border-gray-300
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       bg-white shadow-sm transition text-right"
                required
              >
                <option value="">-- Select Step --</option>
                <option v-for="step in availableSteps" :key="step.id" :value="step.id">
                  {{ step.stepName || `Step ${step.id.slice(0, 8)}` }}
                </option>
              </select>
            </div>

            <!-- Aggregate Field Selection (shown when source is AggregateInput)   && aggregateFields.length > 0-->
            <div v-if="currentMapping.source === 'AggregateInput'">
               <label class="block font-medium text-gray-500 mb-1 text-right px-1 py-1">فیلد منبع (از Aggregate)</label>
                <select
                  v-model="currentMapping.sourceField"
                  class="w-full px-4 py-2 rounded-xl border border-gray-300
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       bg-white shadow-sm transition text-right"
                  :disabled="isLoadingAggregate"
                  required
                >
                  <option value="" disabled>لطفا یک فیلد انتخاب کنید</option>
                  <option
                    v-for="field in aggregateFields"
                    :key="field.id"
                    :value="field.name"
                  >
                    {{ field.name }} ({{ field.type }})
                  </option>
                  <option v-if="isLoadingAggregate" disabled>در حال بارگذاری فیلدها...</option>
                  <option v-if="!isLoadingAggregate && aggregateFields.length === 0" disabled>هیچ فیلدی یافت نشد</option>
                </select>
            </div>

            <div>
              <label class="block font-medium text-gray-500 mb-1 text-right px-1 py-1">Target Field *</label>
              <input
                v-model="currentMapping.targetField"
                type="text"
                placeholder="نام فیلد هدف"
                class="w-full px-4 py-2 rounded-xl border border-gray-300
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       bg-white shadow-sm transition text-right"
                required
              />
            </div>

            <!-- Source Field (shown when source is not AggregateInput) -->
            <div v-if="currentMapping.source && currentMapping.source !== 'AggregateInput'">
              <label class="block font-medium text-gray-500 mb-1 text-right px-1 py-1">
                {{ currentMapping.source === 'StepOutput' ? 'Source Field *' : 'Source Field' }}
              </label>
              <input
                v-model="currentMapping.sourceField"
                type="text"
                :placeholder="currentMapping.source === 'StepOutput' ? 'نام فیلد منبع' : 'نام فیلد منبع (اختیاری)'"
                class="w-full px-4 py-2 rounded-xl border border-gray-300
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       bg-white shadow-sm transition text-right"
                :required="currentMapping.source === 'StepOutput'"
              />
              <small v-if="currentMapping.source === 'StepOutput'" class="block mt-1 text-gray-600 text-right">
                نام فیلد در خروجی مرحله انتخاب شده
              </small>
            </div>

            <!-- Value (shown when source is Constant) -->
            <div v-if="currentMapping.source === 'Constant'">
              <label class="block font-medium text-gray-500 mb-1 text-right px-1 py-1">Value *</label>
              <input
                v-model="currentMapping.value"
                type="text"
                placeholder="مقدار ثابت"
                class="w-full px-4 py-2 rounded-xl border border-gray-300
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       bg-white shadow-sm transition text-right"
                required
              />
              <small class="block mt-1 text-gray-600 text-right">
                مقدار ثابت برای این فیلد
              </small>
            </div>

            <div>
              <label class="block font-medium text-gray-500 mb-1 text-right px-1 py-1">Value Type *</label>
              <select
                v-model="currentMapping.valueType"
                class="w-full px-4 py-2 rounded-xl border border-gray-300
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       bg-white shadow-sm transition text-right"
                required
              >
                <option value="">-- Select Type --</option>
                <option value="String">String</option>
                <option value="Number">Number</option>
                <option value="Object">Object</option>
                <option value="Array">Array</option>
                <option value="Boolean">Boolean</option>
              </select>
              <small class="block mt-1 text-gray-600 text-right">
                نوع مقدار را انتخاب کنید
              </small>
            </div>

            <!-- Mapping Type -->
            <div>
              <label class="block font-medium text-gray-500 mb-1 text-right px-1 py-1">Mapping Type *</label>
              <select
                v-model="currentMapping.mappingType"
                class="w-full px-4 py-2 rounded-xl border border-gray-300
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       bg-white shadow-sm transition text-right"
                required
              >
                <option value="Body">Body</option>
                <option value="Authentication">Authentication</option>
              </select>
            </div>

            <div class="flex items-center justify-end">
              <label class="flex items-center cursor-pointer">
                <span class="mr-2 font-medium text-gray-700 dark:text-gray-200">Status (فعال):</span>
                <div class="relative">
                  <input
                    type="checkbox"
                    class="sr-only"
                    v-model="currentMapping.status"
                  />
                  <div
                    class="block bg-gray-300 w-14 h-8 rounded-full transition-colors duration-300"
                    :class="{ 'bg-green-500': currentMapping.status }"
                  ></div>
                  <div
                    class="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-300"
                    :class="{ 'transform translate-x-6': currentMapping.status }"
                  ></div>
                </div>
              </label>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useFlowStore } from '@/stores/flowStore'
import serviceAggregatorClient from '@/utils/service-aggregator-client'
import { notify } from '@kyvg/vue3-notification'
import { faArrowUp, faSave } from '@fortawesome/free-solid-svg-icons'

const props = defineProps({
  show: Boolean,
  stepId: String,
  mode: {
    type: String,
    default: 'add',
    validator: (value) => ['add', 'edit'].includes(value)
  }
})

const emit = defineEmits(['update:show', 'saved'])
const aggregateFields = ref([])
const store = useFlowStore()
const availableServices = ref([])
const isLoadingServices = ref(false)

const stepData = ref({
  stepName: '',
  aggregateId: null,
  aggregateStepId: null,
  serviceId: null,
  nextStepId: null,
  trueStepId: null,
  falseStepId: null,
  condition: '',
  conditionParameters: '',
  fields: [],
  mappings: [],
})
const isLoadingAggregate = ref(false)
const showMappingModal = ref(false)
const mappingModalMode = ref('add') // 'add' or 'edit'
const currentMapping = ref({
  id: null,
  source: '',
  targetField: '',
  sourceField: '',
  inputStepId: null,
  value: '',
  valueType: 'String',
  mappingType: 'Body',
  status: true,
})

// Get selected service details
const selectedService = computed(() => {
  if (!stepData.value.serviceId) return null
  return availableServices.value.find(s => s.id === stepData.value.serviceId) || null
})
// Get available next steps (all except current step)
const availableSteps = computed(() => {
  return store.nodes
    .filter(node => {
      // Exclude combined nodes and current step
      if (node.type === 'combinedServiceNode') return false
      if (props.mode === 'edit' && node.id === props.stepId) return false
      return true
    })
    .map(node => ({
      id: node.data.aggregateStepId || node.id,
      stepName: node.data.stepName || node.data.label || `Step ${node.id.slice(0, 8)}`,
    }))
})
console.log('availableSteps:', availableSteps.value)
const availableNextSteps = computed(() => availableSteps.value)

// Get available aggregate fields
// const aggregateFields = computed(() => {
//   if (!store.currentAggregate || !store.currentAggregate.mappings) return []
//   return store.currentAggregate.mappings.map(mapping => ({
//     id: mapping.id,
//     name: mapping.name,
//     type: mapping.type || 'String',
//     description: mapping.description || ''
//   }))
// })


// const aggregateFields = computed(() => {
//   // Try to get the aggregate ID from the current step
//   const aggregateId = stepData.value?.aggregateId ||
//                      store.nodes.find(n => n.id === props.stepId)?.data?.aggregateId

//   if (!aggregateId) {
//     console.warn('No aggregate ID found for the current step')
//     return []
//   }

//   // If we have the aggregate ID, try to find it in the store
//   const aggregate = store.aggregates?.find(a => a.id === aggregateId)

//   console.log('Aggregate ID:', aggregateId)
//   console.log('Aggregate mappings:', aggregate?.mappings)
//   if (!aggregate?.mappings) {
//     console.warn('No mappings found for aggregate:', aggregateId)
//     return []
//   }

//   return aggregate.mappings.map(mapping => ({
//     id: mapping.id,
//     name: mapping.name,
//     type: mapping.type || 'String',
//     description: mapping.description || ''
//   }))
// })

// Add this function to fetch aggregate by ID
const fetchAggregateById = async (aggregateId) => {
  try {
    const response = await serviceAggregatorClient.getAggregate(aggregateId)
    if (response && response.mappings) {
      return response.mappings
    }
    return []
  } catch (error) {
    console.error('Error fetching aggregate:', error)
    return []
  }
}

// Update the aggregateFields computed property
// const aggregateFields = computed(async () => {
//   // Try to get the aggregate ID from the current step
//   const aggregateId = stepData.value?.aggregateId ||
//                      store.nodes.find(n => n.id === props.stepId)?.data?.aggregateId

//   if (!aggregateId) {
//     console.warn('No aggregate ID found for the current step')
//     return []
//   }

//   // First, try to find in the store
//   const aggregate = store.aggregates?.find(a => a.id === aggregateId)

//   if (aggregate?.mappings) {
//     return aggregate.mappings.map(mapping => formatMapping(mapping))
//   }

//   // If not found in store, try to fetch it
//   console.log('Aggregate not found in store, fetching...')
//   const mappings = await fetchAggregateById(aggregateId)
//   return mappings.map(mapping => formatMapping(mapping))
// })

// Helper function to format mapping
const formatMapping = (mapping) => ({
  id: mapping.id,
  name: mapping.name,
  type: mapping.type || 'String',
  description: mapping.description || ''
})


const loadAggregateFields = async () => {
  debugger
  store.loadAggregates();
  const aggregate = store.aggregates;
  console.log('aggregate aggregate aggregate:', stepData.value.aggregateId)
  if (!aggregate) {
    aggregateFields.value = []
    return
  }
  isLoadingAggregate.value = true
  try {
    // Try to find in store first
    //const aggregate = store.aggregates?.find(a => a.id === aggregateId)
    const aggregate = store.aggregates
    if (aggregate?.mappings) {
      aggregateFields.value = aggregate.mappings.map(formatMapping)
      return
    }
    // If not in store, fetch it
    const response = await serviceAggregatorClient.getAggregateByid(stepData.value.aggregateId)
    if (response?.mappings) {
      aggregateFields.value = response.mappings.map(formatMapping)
      // Optionally update the store here if needed
    } else {
      aggregateFields.value = []
    }
  } catch (error) {
    console.error('Error loading aggregate fields:', error)
    aggregateFields.value = []
  } finally {
    isLoadingAggregate.value = false
  }
}
// Call this when the component is mounted or when stepData changes
onMounted(loadAggregateFields)
watch(() => stepData.value.aggregateId, (newVal) => {
  if (showMappingModal.value && currentMapping.value.source === 'AggregateInput') {
    loadAggregateFields()
  }
}, { immediate: true })


// Load available services from backend
const loadServices = async () => {
  isLoadingServices.value = true
  try {
    const data = await serviceAggregatorClient.getServices()
    availableServices.value = data.items ? data.items : []
  } catch (error) {
    console.error('Error loading services:', error)
    notify({
      title: 'خطا',
      text: 'خطا در بارگذاری سرویس‌ها',
      type: 'error',
    })
  } finally {
    isLoadingServices.value = false
  }
}

// Load current step data for edit mode
const loadStepData = () => {
  if (props.mode === 'edit' && props.stepId) {
    const node = store.nodes.find(n => n.id === props.stepId)
    if (node && node.data) {
      stepData.value = {
        stepName: node.data.stepName || '',
        aggregateId: node.data.aggregateId || store.currentAggregateId,
        aggregateStepId: node.data.aggregateStepId || null,
        serviceId: node.data.serviceId || null,
        nextStepId: node.data.nextStepId || null,
        trueStepId: node.data.trueStepId || null,
        falseStepId: node.data.falseStepId || null,
        condition: node.data.condition || '',
        conditionParameters: node.data.conditionParameters || '',
        fields: node.data.fields ? [...node.data.fields] : [],
        mappings: node.data.mappings ? [...node.data.mappings] : [],
      }
    }
  } else {
    resetForm()
  }
}

const resetForm = () => {
  stepData.value = {
    stepName: '',
    aggregateId: store.currentAggregateId,
    aggregateStepId: null,
    serviceId: null,
    nextStepId: null,
    trueStepId: null,
    falseStepId: null,
    condition: '',
    conditionParameters: '',
    fields: [],
    mappings: [],
  }
}

const onClose = () => {
  emit('update:show', false)
  resetForm()
}

const onSave = async () => {
  if (!stepData.value.stepName) {
    notify({
      title: 'خطا',
      text: 'نام Step الزامی است',
      type: 'error',
    })
    return
  }

  try {
    const payload = {
      stepName: stepData.value.stepName,
      aggregateId: stepData.value.aggregateId || store.currentAggregateId,
      serviceId: stepData.value.serviceId || null,
      nextStepId: stepData.value.nextStepId || null,
      trueStepId: stepData.value.trueStepId || null,
      falseStepId: stepData.value.falseStepId || null,
      condition: stepData.value.condition || '',
      conditionParameters: stepData.value.conditionParameters || '',
    }

    if (props.mode === 'edit' && props.stepId) {
      // Update existing step
      const node = store.nodes.find(n => n.id === props.stepId)
      if (node && node.data.aggregateStepId) {
        payload.id = node.data.aggregateStepId
        payload.status = true
        // Include current node position when updating
        payload.positionX = node.position?.x ?? 100
        payload.positionY = node.position?.y ?? 100
        await serviceAggregatorClient.updateAggregateStep(payload)

        // Update node in store
        // await store.updateNode(props.stepId, {
        //   data: {
        //     ...node.data,
        //     stepName: payload.stepName,
        //     serviceId: payload.serviceId,
        //     condition: payload.condition,
        //     conditionParameters: payload.conditionParameters,
        //     nextStepId: payload.nextStepId,
        //     trueStepId: payload.trueStepId,
        //     falseStepId: payload.falseStepId,
        //     fields: stepData.value.fields || [],
        //     mappings: stepData.value.mappings || [],
        //   }
        // })

        notify({
          title: 'موفقیت',
          text: 'Step بروزرسانی شد',
          type: 'success',
        })
      }
    } else {
      // Create new step (this should be handled by handleConnect)
      await store.saveConnectionStep(payload)
      notify({
        title: 'موفقیت',
        text: 'Step ایجاد شد',
        type: 'success',
      })
    }

    emit('update:show', false)
    emit('saved')
    resetForm()
  } catch (error) {
    console.error('Error saving step:', error)
    notify({
      title: 'خطا',
      text: props.mode === 'edit' ? 'خطا در بروزرسانی Step' : 'خطا در ایجاد Step',
      type: 'error',
    })
  }
}

// Watch for modal opening
const removeField = (index) => {
  if (index >= 0 && index < stepData.value.fields.length) {
    stepData.value.fields.splice(index, 1)
  }
}

// Mapping management functions
const openAddMappingModal = () => {
  currentMapping.value = {
    id: null,
    source: '',
    targetField: '',
    sourceField: '',
    value: '',
    valueType: 'String',
    mappingType: 'Body',
    status: true,
  }
  mappingModalMode.value = 'add'
  showMappingModal.value = true
  loadAggregateFields()
}

const openEditMappingModal = (mapping) => {
  currentMapping.value = {
    id: mapping.id,
    source: mapping.source || '',
    targetField: mapping.targetField || '',
    sourceField: mapping.sourceField || '',
    inputStepId: mapping.inputStepId || null,
    value: mapping.value || '',
    valueType: mapping.valueType || 'String',
    mappingType: mapping.mappingType || 'Body',
    status: mapping.status !== undefined ? mapping.status : true,
  }
  mappingModalMode.value = 'edit'
  showMappingModal.value = true
  loadAggregateFields()
}

const onSourceTypeChange = () => {
  // Reset related fields when source type changes
  currentMapping.value.sourceField = ''
  currentMapping.value.inputStepId = null
  currentMapping.value.value = ''
}

const closeMappingModal = () => {
  showMappingModal.value = false
  currentMapping.value = {
    id: null,
    source: '',
    targetField: '',
    sourceField: '',
    inputStepId: null,
    value: '',
    valueType: 'String',
    mappingType: 'Body',
    status: true,
  }
}

const saveMapping = async () => {
  try {
    // Validate required fields based on source type
    if (!currentMapping.value.targetField?.trim()) {
      notify({
        title: 'خطا',
        text: 'فیلد هدف الزامی است',
        type: 'error'
      })
      return
    }
    if (currentMapping.value.source === 'StepOutput' && !currentMapping.value.sourceField?.trim()) {
      notify({
        title: 'خطا',
        text: 'فیلد منبع برای Step Output الزامی است',
        type: 'error'
      })
      return
    }
    // Prepare mapping data based on source type
    const mappingData = {
      id: currentMapping.value.id,
      aggregateStepId: stepData.value.aggregateStepId,
      mappingType: currentMapping.value.mappingType || 'Body',
      source: currentMapping.value.source,
      targetField: currentMapping.value.targetField.trim(),
      sourceField: currentMapping.value.sourceField?.trim() || null,
      value: null,  // Will be set based on source type
      valueType: currentMapping.value.valueType || 'String',
      status: currentMapping.value.status,
      inputStepId: null  // Will be set for StepOutput
    }
    // Handle different source types
    if (currentMapping.value.source === 'Constant') {
      if (!currentMapping.value.value?.trim()) {
        notify({
          title: 'خطا',
          text: 'مقدار ثابت الزامی است',
          type: 'error'
        })
        return
      }
      mappingData.value = currentMapping.value.value.trim()
      // mappingData.sourceField = null
      delete mappingData.sourceField
    } else if (currentMapping.value.source === 'StepOutput') {
      if (!currentMapping.value.inputStepId) {
        notify({
          title: 'خطا',
          text: 'انتخاب مرحله مبدا الزامی است',
          type: 'error'
        })
        return
      }
      mappingData.inputStepId = currentMapping.value.inputStepId
      // Remove value for StepOutput
      delete mappingData.value
    } else if (currentMapping.value.source === 'AggregateInput') {
        delete mappingData.value
      if (!currentMapping.value.sourceField?.trim()) {
        notify({
          title: 'خطا',
          text: 'انتخاب فیلد از Aggregate الزامی است',
          type: 'error'
        })
        return
      }
    }
    // Make the API call
    if (mappingModalMode.value === 'add') {
      const newMapping = await serviceAggregatorClient.addAggregateStepMapping(mappingData)
      if (newMapping) {
        stepData.value.mappings.push(newMapping)
        notify({
          title: 'موفقیت',
          text: 'Mapping با موفقیت اضافه شد',
          type: 'success'
        })
      }
    } else {
      const updatedMapping = await serviceAggregatorClient.updateAggregateStepMapping(
        mappingData
      )
      if (updatedMapping) {
        const index = stepData.value.mappings.findIndex(m => m.id === currentMapping.value.id)
        if (index !== -1) {
          stepData.value.mappings[index] = updatedMapping
        }
        notify({
          title: 'موفقیت',
          text: 'Mapping با موفقیت به‌روزرسانی شد',
          type: 'success'
        })
      }
    }
    closeMappingModal()
  } catch (error) {
    console.error('خطا در ذخیره‌سازی Mapping:', error)
    const errorMessage = error.response?.data?.title || 'خطا در ذخیره‌سازی Mapping'
    notify({
      title: 'خطا',
      text: errorMessage,
      type: 'error'
    })
  }
}

const deleteMapping = async (mappingId) => {
  if (!confirm('آیا از حذف این mapping مطمئن هستید؟')) {
    return
  }

  if (!stepData.value.aggregateStepId) {
    notify({
      title: 'خطا',
      text: 'aggregateStepId یافت نشد',
      type: 'error',
    })
    return
  }

  try {
    const success = await store.deleteStepMapping(stepData.value.aggregateStepId, mappingId)
    if (success) {
      stepData.value.mappings = stepData.value.mappings.filter(m => m.id !== mappingId)
    }
  } catch (error) {
    console.error('Error deleting mapping:', error)
  }
}

watch(() => props.show, (newVal) => {
  if (newVal) {
    loadServices()
    loadStepData()
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
.dot {
  transition: transform 0.3s ease-in-out;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .header-btn-text {
    display: none;
  }
}
</style>
