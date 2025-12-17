<template>
  <div v-if="show" class="modal-overlay" @click.self="onClose">
    <div class="modal-content">
      <div class="modal-header">
        <h3>{{ isEditMode ? 'Edit Aggregate' : 'Create New Aggregate' }}</h3>
        <button class="close-button" @click="onClose">&times;</button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label>Aggregate Name *</label>
          <input
            v-model="formData.name"
            type="text"
            class="form-control"
            placeholder="e.g., User Registration Flow"
            required
          >
        </div>

        <div class="form-group">
          <label>Description (optional)</label>
          <textarea
            v-model="formData.description"
            class="form-control"
            placeholder="Describe what this aggregate/flow does"
            rows="4"
          ></textarea>
        </div>

        <div v-if="isEditMode" class="form-group">
          <label class="checkbox-label">
            <input v-model="formData.status" type="checkbox">
            <span>Active</span>
          </label>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="onClose">Cancel</button>
        <button class="btn btn-primary" @click="onSave" :disabled="!formData.name">
          {{ isEditMode ? 'Update' : 'Create' }} Aggregate
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useFlowStore } from '@/stores/flowStore'
import serviceAggregatorClient from '@/utils/service-aggregator-client'
import { notify } from '@kyvg/vue3-notification'

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
      title: 'Error',
      text: 'Aggregate name is required',
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
        title: 'Success',
        text: 'Aggregate updated successfully',
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
        title: 'Success',
        text: 'Aggregate created successfully',
        type: 'success',
      })
    }

    emit('update:show', false)
    emit('saved')
    resetForm()
  } catch (error) {
    console.error('Error saving aggregate:', error)
    notify({
      title: 'Error',
      text: isEditMode.value ? 'Failed to update aggregate' : 'Failed to create aggregate',
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
        const agg = Array.isArray(aggregates)
          ? aggregates.find(a => a.id === store.currentAggregateId)
          : (aggregates.id === store.currentAggregateId ? aggregates : null)
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
  z-index: 1100;
}

.modal-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  max-width: 500px;
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

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
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

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: 500;
}

.checkbox-label input {
  width: 18px;
  height: 18px;
  cursor: pointer;
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
