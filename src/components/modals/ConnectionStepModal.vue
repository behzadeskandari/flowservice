<template>
  <div v-if="store.showConnectionModal" class="modal-overlay" @click.self="onClose">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Connect Steps - Enter Step Details</h3>
        <button class="close-button" @click="onClose">&times;</button>
      </div>

      <div class="modal-body">
        <!-- Step Details Section -->
        <div class="form-section">
          <h4>Step Information</h4>

          <div class="form-group">
            <label>Step Name *</label>
            <input
              v-model="stepData.stepName"
              type="text"
              class="form-control"
              placeholder="Enter step name"
              required
            >
          </div>

          <div class="form-group">
            <label>Service ID (optional)</label>
            <input
              v-model="stepData.serviceId"
              type="text"
              class="form-control"
              placeholder="Service ID (if service exists)"
            >
            <small class="form-text text-muted">
              Leave empty if no service is associated with this step.
            </small>
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

          <div v-if="stepData.condition" class="form-group">
            <label>Condition Parameters (optional)</label>
            <input
              v-model="stepData.conditionParameters"
              type="text"
              class="form-control"
              placeholder="e.g., role,status"
            >
            <small class="form-text text-muted">
              Comma-separated parameter names used in the condition.
            </small>
          </div>
        </div>

        <!-- Step Connections -->
        <div class="form-section">
          <h4>Step Connections</h4>

          <div v-if="!stepData.condition" class="form-group">
            <label>Next Step (optional)</label>
            <select
              v-model="stepData.nextStepId"
              class="form-control"
            >
              <option :value="null">-- None (Terminal Step) --</option>
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
                <option :value="null">-- None --</option>
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
                <option :value="null">-- None --</option>
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
          Create Connection & Merge Services
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useFlowStore } from '@/stores/flowStore'

const store = useFlowStore()

const stepData = ref({
  stepName: '',
  aggregateId: null,
  serviceId: null,
  nextStepId: null,
  trueStepId: null,
  falseStepId: null,
  condition: '',
  conditionParameters: '',
})

// Available steps that can be connected to (excluding current step)
const availableNextSteps = computed(() => {
  return store.nodes
    .filter(node => node.type !== 'combinedServiceNode') // Don't show combined nodes
    .map(node => ({
      id: node.data.aggregateStepId || node.data.stepId || node.id,
      stepName: node.data.stepName || node.data.label || node.data.serviceName,
    }))
})

function onClose() {
  store.closeConnectionModal()
  resetForm()
}

async function onSave() {
  if (!stepData.value.stepName) {
    alert('Step name is required')
    return
  }

  try {
    // Prepare the data for the backend
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

    // Call the store function to save the connection
    await store.saveConnectionStep(payload)
    resetForm()
  } catch (error) {
    console.error('Error saving connection step:', error)
  }
}

function resetForm() {
  stepData.value = {
    stepName: '',
    aggregateId: null,
    serviceId: null,
    nextStepId: null,
    trueStepId: null,
    falseStepId: null,
    condition: '',
    conditionParameters: '',
  }
}

// Watch for modal opening and update aggregateId
watch(() => store.connectionStepData, (newData) => {
  if (newData) {
    stepData.value = JSON.parse(JSON.stringify(newData))
  }
}, { immediate: true, deep: true })
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

.text-muted {
  color: #666;
}
</style>
