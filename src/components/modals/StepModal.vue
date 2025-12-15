<template>
  <div v-if="show" class="modal-overlay" @click.self="onClose">
    <div class="modal-content">
      <div class="modal-header">
        <h3>{{ mode === 'add' ? 'Add Step' : 'Edit Step' }}</h3>
        <button class="close-button" @click="onClose">&times;</button>
      </div>

      <div class="modal-body">
        <!-- Step Details -->
        <div class="form-section">
          <h4>Step Information</h4>
          <div class="form-group">
            <label>Step Name</label>
            <input
              v-model="stepData.stepName"
              type="text"
              class="form-control"
              placeholder="Enter step name"
            >
          </div>

          <div class="form-group">
            <label>Condition (optional)</label>
            <input
              v-model="stepData.condition"
              type="text"
              class="form-control"
              placeholder="e.g., user.role === 'admin'"
            >
            <small class="form-text text-muted">
              Leave empty for regular steps. Add a condition to create a conditional step.
            </small>
          </div>
        </div>

        <!-- Service Details -->
        <div class="form-section">
          <div class="d-flex justify-content-between align-items-center">
            <h4>Service</h4>
            <button
              v-if="!stepData.service"
              class="btn btn-sm btn-outline-primary"
              @click="addService"
            >
              Add Service
            </button>
          </div>

          <div v-if="stepData.service" class="service-details">
            <div class="form-group">
              <label>Service Name</label>
              <input
                v-model="stepData.service.name"
                type="text"
                class="form-control"
                placeholder="Service name"
              >
            </div>

            <div class="form-group">
              <label>URL</label>
              <input
                v-model="stepData.service.url"
                type="text"
                class="form-control"
                placeholder="https://api.example.com/endpoint"
              >
            </div>

            <div class="row">
              <div class="col-md-6">
                <div class="form-group">
                  <label>Method</label>
                  <select v-model="stepData.service.method" class="form-control">
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="PATCH">PATCH</option>
                  </select>
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group">
                  <label>Type</label>
                  <select v-model="stepData.service.type" class="form-control">
                    <option value="REST">REST</option>
                    <option value="GRAPHQL">GraphQL</option>
                    <option value="SOAP">SOAP</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="form-group form-check">
              <input
                v-model="stepData.service.status"
                type="checkbox"
                class="form-check-input"
                id="serviceStatus"
              >
              <label class="form-check-label" for="serviceStatus">Active</label>
            </div>

            <button
              class="btn btn-sm btn-outline-danger"
              @click="removeService"
            >
              Remove Service
            </button>
          </div>

          <div v-else class="no-service">
            <p class="text-muted">No service attached to this step</p>
          </div>
        </div>

        <!-- Step Connections -->
        <div class="form-section">
          <h4>Step Connections</h4>

          <div v-if="!stepData.condition" class="form-group">
            <label>Next Step</label>
            <select
              v-model="stepData.nextStepId"
              class="form-control"
            >
              <option :value="null">-- Select next step --</option>
              <option
                v-for="step in availableNextSteps"
                :key="step.id"
                :value="step.id"
              >
                {{ step.stepName || `Step ${step.id.slice(0, 8)}` }}
              </option>
            </select>
          </div>

          <template v-else>
            <div class="form-group">
              <label>True Path (when condition is true)</label>
              <select
                v-model="stepData.trueStepId"
                class="form-control"
              >
                <option :value="null">-- Select next step --</option>
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
              <label>False Path (when condition is false)</label>
              <select
                v-model="stepData.falseStepId"
                class="form-control"
              >
                <option :value="null">-- Select next step --</option>
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
        <button class="btn btn-primary" @click="onSave">
          {{ mode === 'add' ? 'Create Step' : 'Save Changes' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useStepFlowStore } from '@/stores/stepFlowStore'

const props = defineProps({
  show: Boolean,
  step: {
    type: Object,
    default: () => ({
      stepName: '',
      condition: '',
      nextStepId: null,
      trueStepId: null,
      falseStepId: null,
      service: null,
    })
  },
  mode: {
    type: String,
    default: 'add',
    validator: (value) => ['add', 'edit'].includes(value)
  }
})

const emit = defineEmits(['update:show', 'saved'])

const store = useStepFlowStore()

const stepData = ref({
  stepName: '',
  condition: '',
  nextStepId: null,
  trueStepId: null,
  falseStepId: null,
  service: null,
})

// Available steps that can be connected to (excluding current step and its children)
const availableNextSteps = computed(() => {
  return store.nodes
    .filter(node =>
      node.data.stepId !== stepData.value.stepId && // Not the current step
      !isChildStep(node.data.stepId) // Not a child step of the current step
    )
    .map(node => ({
      id: node.data.stepId,
      stepName: node.data.stepName,
    }))
})

// Check if a step is a child of the current step
function isChildStep(stepId) {
  if (!stepData.value.stepId) return false

  // This is a simplified check - in a real app, you'd need to traverse the graph
  return (
    stepData.value.nextStepId === stepId ||
    stepData.value.trueStepId === stepId ||
    stepData.value.falseStepId === stepId
  )
}

function addService() {
  stepData.value.service = {
    name: '',
    url: '',
    method: 'GET',
    type: 'REST',
    status: true
  }
}

function removeService() {
  if (confirm('Are you sure you want to remove the service from this step?')) {
    stepData.value.service = null
  }
}

function onClose() {
  emit('update:show', false)
  resetForm()
}

async function onSave() {
  try {
    await store.saveStep(stepData.value)
    emit('update:show', false)
    emit('saved')
    resetForm()
  } catch (error) {
    console.error('Error saving step:', error)
  }
}

function resetForm() {
  stepData.value = {
    stepName: '',
    condition: '',
    nextStepId: null,
    trueStepId: null,
    falseStepId: null,
    service: null,
  }
}

// Watch for prop changes and update local state
watch(() => props.step, (newStep) => {
  if (newStep) {
    stepData.value = JSON.parse(JSON.stringify(newStep))
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
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1050;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 700px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  font-weight: bold;
  cursor: pointer;
  opacity: 0.7;
  padding: 0.25rem 0.5rem;
  line-height: 1;
}

.close-button:hover {
  opacity: 1;
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e9ecef;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.form-section {
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #f0f0f0;
}

.form-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.form-section h4 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1rem;
  font-weight: 600;
  color: #495057;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
}

.form-control {
  display: block;
  width: 100%;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  line-height: 1.5;
  color: #495057;
  background-color: #fff;
  background-clip: padding-box;
  border: 1px solid #ced4da;
  border-radius: 0.25rem;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.form-control:focus {
  border-color: #80bdff;
  outline: 0;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

.btn {
  display: inline-block;
  font-weight: 400;
  text-align: center;
  white-space: nowrap;
  vertical-align: middle;
  user-select: none;
  border: 1px solid transparent;
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  line-height: 1.5;
  border-radius: 0.25rem;
  transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out,
    border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
  cursor: pointer;
}

.btn-primary {
  color: #fff;
  background-color: #007bff;
  border-color: #007bff;
}

.btn-primary:hover {
  background-color: #0069d9;
  border-color: #0062cc;
}

.btn-secondary {
  color: #fff;
  background-color: #6c757d;
  border-color: #6c757d;
}

.btn-secondary:hover {
  background-color: #5a6268;
  border-color: #545b62;
}

.btn-outline-primary {
  color: #007bff;
  border-color: #007bff;
  background-color: transparent;
}

.btn-outline-primary:hover {
  color: #fff;
  background-color: #007bff;
  border-color: #007bff;
}

.btn-outline-danger {
  color: #dc3545;
  border-color: #dc3545;
  background-color: transparent;
}

.btn-outline-danger:hover {
  color: #fff;
  background-color: #dc3545;
  border-color: #dc3545;
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  line-height: 1.5;
  border-radius: 0.2rem;
}

.service-details {
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 0.25rem;
  margin-top: 1rem;
}

.no-service {
  padding: 1.5rem;
  text-align: center;
  background-color: #f8f9fa;
  border: 1px dashed #dee2e6;
  border-radius: 0.25rem;
  margin-top: 1rem;
}

.text-muted {
  color: #6c757d !important;
}

.form-text {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: #6c757d;
}

.form-check {
  position: relative;
  display: block;
  padding-left: 1.5rem;
}

.form-check-input {
  position: absolute;
  margin-top: 0.3rem;
  margin-left: -1.5rem;
}

.form-check-label {
  margin-bottom: 0;
  font-size: 0.875rem;
}

.row {
  display: flex;
  flex-wrap: wrap;
  margin-right: -0.75rem;
  margin-left: -0.75rem;
}

.col-md-6 {
  position: relative;
  width: 100%;
  padding-right: 0.75rem;
  padding-left: 0.75rem;
}

@media (min-width: 768px) {
  .col-md-6 {
    flex: 0 0 50%;
    max-width: 50%;
  }
}

.d-flex {
  display: flex !important;
}

.justify-content-between {
  justify-content: space-between !important;
}

.align-items-center {
  align-items: center !important;
}

.mb-3 {
  margin-bottom: 1rem !important;
}

.mt-3 {
  margin-top: 1rem !important;
}

.mr-2 {
  margin-right: 0.5rem !important;
}

.ml-2 {
  margin-left: 0.5rem !important;
}
</style>
