<template>
  <div v-if="show" class="modal-overlay" @click.self="onClose">
    <div class="modal-content">
      <div class="modal-header">
        <h3>{{ mode === 'add' ? 'Create Step' : 'Edit Step' }}</h3>
        <button class="close-button" @click="onClose">&times;</button>
      </div>

      <div class="modal-body">
        <!-- Step Name -->
        <div class="form-section">
          <h4>اطلاعات مرحله</h4>

          <div class="form-group">
            <label>نام مرحله *</label>
            <input
              v-model="stepData.stepName"
              type="text"
              class="form-control"
              placeholder="Enter step name"
              required
            >
          </div>

          <!-- Service Selection (Select from existing services) -->
          <div class="form-group">
            <label>خدمات (اختیاری)</label>
            <select v-model="stepData.serviceId" class="form-control">
              <option :value="null">-- بدون سرویس --</option>
              <option
                v-for="service in availableServices"
                :key="service.id"
                :value="service.id"
              >
                {{ service.name }} ({{ service.method }})
              </option>
            </select>
            <small class="form-text text-muted">
             از بین سرویس‌های موجود انتخاب کنید. سرویس‌ها به صورت جداگانه مدیریت می‌شوند.
            </small>
          </div>

          <!-- Show selected service details -->
          <div v-if="selectedService" class="service-preview">
            <p><strong>سرویس انتخاب شده:</strong></p>
            <ul>
              <li><strong>Name:</strong> {{ selectedService.name }}</li>
              <li><strong>URL:</strong> {{ selectedService.url }}</li>
              <li><strong>Method:</strong> {{ selectedService.method }}</li>
              <li><strong>Type:</strong> {{ selectedService.type }}</li>
            </ul>
          </div>
        </div>

        <!-- Condition -->
        <div class="form-section">
          <h4>شرایط (اختیاری)</h4>

          <div class="form-group">
            <label>بیان شرط</label>
            <input
              v-model="stepData.condition"
              type="text"
              class="form-control"
              placeholder="e.g., response.status === 200"
            >
            <small class="form-text text-muted">
             برای مراحل معمولی خالی بگذارید. برای ایجاد یک گره تصمیم، یک شرط اضافه کنید.
            </small>
          </div>

          <div v-if="stepData.condition" class="form-group">
            <label>پارامترهای شرایط</label>
            <input
              v-model="stepData.conditionParameters"
              type="text"
              class="form-control"
              placeholder="e.g., status,code"
            >
            <small class="form-text text-muted">
              فهرست پارامترهای استفاده شده در عبارت شرط که با کاما از هم جدا شده‌اند.
            </small>
          </div>
        </div>

        <!-- Fields Section -->
        <div v-if="selectedService" class="form-section">
          <h4>جزئیات فیلدها</h4>
          <div v-if="stepData.fields && stepData.fields.length > 0" class="fields-list">
            <div v-for="(field, index) in stepData.fields" :key="index" class="field-item">
              <div class="field-header">
                <strong>{{ field.name || 'Unnamed Field' }}</strong>
                <button
                  type="button"
                  class="btn-remove"
                  @click="removeField(index)"
                  title="حذف فیلد"
                >
                  ×
                </button>
              </div>
              <div class="field-details">
                <p><strong>Type:</strong> {{ field.type || 'string' }}</p>
                <p v-if="field.required"><strong>Required:</strong> {{ field.required ? 'Yes' : 'No' }}</p>
                <p v-if="field.description"><strong>Description:</strong> {{ field.description }}</p>
              </div>
            </div>
          </div>
          <div v-else class="no-fields">
            <p>هیچ فیلدی برای این سرویس تعریف نشده‌است</p>
          </div>
        </div>

        <!-- Step Connections -->
        <div class="form-section">
          <h4>اتصالات مرحله ای</h4>

          <!-- Regular step (no condition) -->
          <div v-if="!stepData.condition" class="form-group">
            <label>مرحله بعدی</label>
            <select v-model="stepData.nextStepId" class="form-control">
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
            <div class="form-group">
              <label>True Path</label>
              <select v-model="stepData.trueStepId" class="form-control">
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

            <div class="form-group">
              <label>False Path</label>
              <select v-model="stepData.falseStepId" class="form-control">
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
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="onClose">Cancel</button>
        <button class="btn btn-primary" @click="onSave" :disabled="!stepData.stepName">
          {{ mode === 'add' ? 'Create Step' : 'Update Step' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useFlowStore } from '@/stores/flowStore'
import serviceAggregatorClient from '@/utils/service-aggregator-client'
import { notify } from '@kyvg/vue3-notification'

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

const store = useFlowStore()
const availableServices = ref([])
const isLoadingServices = ref(false)

const stepData = ref({
  stepName: '',
  aggregateId: null,
  serviceId: null,
  nextStepId: null,
  trueStepId: null,
  falseStepId: null,
  condition: '',
  conditionParameters: '',
  fields: [],
})

// Get selected service details
const selectedService = computed(() => {
  if (!stepData.value.serviceId) return null
  return availableServices.value.find(s => s.id === stepData.value.serviceId) || null
})

// Get available next steps (all except current step)
const availableNextSteps = computed(() => {
  return store.nodes
    .filter(node => {
      // Exclude combined nodes
      if (node.type === 'combinedServiceNode') return false
      // Exclude current step
      if (mode === 'edit' && node.id === props.stepId) return false
      return true
    })
    .map(node => ({
      id: node.data.aggregateStepId || node.id,
      stepName: node.data.stepName || node.data.label || 'Unknown',
    }))
})

// Load available services from backend
const loadServices = async () => {
  isLoadingServices.value = true
  try {
    const data = await serviceAggregatorClient.getServices()
    availableServices.value = Array.isArray(data) ? data : []
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
        serviceId: node.data.serviceId || null,
        nextStepId: node.data.nextStepId || null,
        trueStepId: node.data.trueStepId || null,
        falseStepId: node.data.falseStepId || null,
        condition: node.data.condition || '',
        conditionParameters: node.data.conditionParameters || '',
        fields: node.data.fields ? [...node.data.fields] : [],
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
    serviceId: null,
    nextStepId: null,
    trueStepId: null,
    falseStepId: null,
    condition: '',
    conditionParameters: '',
    fields: [],
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
        await serviceAggregatorClient.updateAggregateStep(payload)

        // Update node in store
        await store.updateNode(props.stepId, {
          data: {
            ...node.data,
            stepName: payload.stepName,
            serviceId: payload.serviceId,
            condition: payload.condition,
            conditionParameters: payload.conditionParameters,
            nextStepId: payload.nextStepId,
            trueStepId: payload.trueStepId,
            falseStepId: payload.falseStepId,
            fields: stepData.value.fields || [],
          }
        })

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

watch(() => props.show, (newVal) => {
  if (newVal) {
    loadServices()
    loadStepData()
  }
}, { immediate: true })
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  position: sticky;
  top: 0;
  background: white;
  z-index: 10;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background 0.2s;
}

.close-button:hover {
  background: #f0f0f0;
}

.modal-body {
  padding: 20px;
}

.form-section {
  margin-bottom: 24px;
}

.form-section h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  border-bottom: 2px solid #007bff;
  padding-bottom: 8px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

.form-control {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-control:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.form-text {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #666;
}

.service-preview {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 4px;
  margin-top: 12px;
  font-size: 13px;
}

.service-preview p {
  margin: 0 0 8px 0;
}

.service-preview ul {
  margin: 0;
  padding-left: 20px;
  list-style: none;
}

.service-preview li {
  padding: 4px 0;
  color: #555;
}

.fields-list {
  margin-top: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.field-item {
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
}

.field-item:last-child {
  border-bottom: none;
}

.field-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.field-header strong {
  color: #333;
  font-size: 14px;
}

.btn-remove {
  background: #ff4444;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  padding: 0;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.btn-remove:hover {
  background: #cc0000;
}

.field-details {
  margin-left: 12px;
  font-size: 13px;
  color: #666;
}

.field-details p {
  margin: 4px 0;
}

.no-fields {
  padding: 12px;
  text-align: center;
  color: #999;
  font-size: 13px;
  background: #f9f9f9;
  border-radius: 4px;
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  position: sticky;
  bottom: 0;
  background: white;
  z-index: 10;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background: #f0f0f0;
  color: #333;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>
