<template>
  <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
    <div class="modal-content">
      <!-- Header -->
      <div class="modal-header">
        <h2>نتیجه اجرا</h2>
        <button class="close-btn" @click="closeModal">
          <font-awesome-icon :icon="faTimes" />
        </button>
      </div>

      <!-- Body -->
      <div class="modal-body">
        <!-- Tracker ID -->
        <div class="tracker-info">
          <label>شناسه پیگیری:</label>
          <div class="tracker-value">
            <input type="text" :value="trackerIdValue" readonly />
            <button class="copy-btn" @click="copyTrackerId" title="کپی کنید">
              <font-awesome-icon :icon="faCopy" />
            </button>
          </div>
        </div>

        <!-- Result Data -->
        <div class="result-section">
          <h3>داده‌های نتیجه</h3>
          <div class="json-viewer">
            <div class="json-toolbar">
              <button class="action-btn" @click="copyJsonToClipboard">
                <font-awesome-icon :icon="faCopy" />
                <span>کپی JSON</span>
              </button>
              <button class="action-btn" @click="downloadJson">
                <font-awesome-icon :icon="faDownload" />
                <span>دانلود JSON</span>
              </button>
              <button class="action-btn" @click="toggleJsonFormat">
                <font-awesome-icon :icon="faExpandAlt" />
                <span>{{ isExpanded ? 'فشرده' : 'پیش‌نمایش' }}</span>
              </button>
            </div>
            <pre class="json-content">{{ formattedJson }}</pre>
          </div>
        </div>

      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <button class="btn btn-primary" @click="closeModal">بستن</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { faTimes, faCopy, faDownload, faExpandAlt } from '@fortawesome/free-solid-svg-icons'
import { notify } from '@kyvg/vue3-notification'

const showModal = ref(false)
const response = ref<any>(null)
const isExpanded = ref(false)

const trackerIdValue = computed(() => {
  return response.value?.trackerId || 'N/A'
})

const formattedJson = computed(() => {
  if (!response.value) return ''
  return JSON.stringify(response.value, null, isExpanded.value ? 2 : 0)
})

const dynamicResults = computed(() => {
  if (!response.value?.result) return []
  
  const result = response.value.result
  const resultArray: any[] = []

  // Iterate through all properties in result object
  for (const [key, value] of Object.entries(result)) {
    if (Array.isArray(value)) {
      resultArray.push({
        name: key,
        isArray: true,
        data: value
      })
    } else if (value !== null && typeof value === 'object') {
      resultArray.push({
        name: key,
        isArray: false,
        data: value
      })
    }
  }

  return resultArray
})

const getTableHeaders = (data: any[]): string[] => {
  if (data.length === 0) return []
  return Object.keys(data[0])
}

const formatValue = (value: any): string => {
  if (value === null || value === undefined) return 'N/A'
  if (typeof value === 'boolean') return value ? 'بله' : 'خیر'
  if (typeof value === 'object') return JSON.stringify(value)
  if (typeof value === 'number') return value.toString()
  if (typeof value === 'string' && value.length > 50) {
    return value.substring(0, 50) + '...'
  }
  return value.toString()
}

const copyTrackerId = async () => {
  try {
    await navigator.clipboard.writeText(response.value?.trackerId || '')
    notify({
      title: 'موفق',
      text: 'کپی شد',
      type: 'success'
    })
  } catch (error) {
    notify({
      title: 'خطا',
      text: 'خطا در کپی',
      type: 'error'
    })
  }
}

const copyJsonToClipboard = async () => {
  try {
    const jsonString = JSON.stringify(response.value, null, 2)
    await navigator.clipboard.writeText(jsonString)
    notify({
      title: 'موفق',
      text: 'JSON کپی شد',
      type: 'success'
    })
  } catch (error) {
    notify({
      title: 'خطا',
      text: 'خطا در کپی JSON',
      type: 'error'
    })
  }
}

const downloadJson = () => {
  try {
    const jsonString = JSON.stringify(response.value, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'execution-result-' + new Date().getTime() + '.json'
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
    notify({
      title: 'موفق',
      text: 'JSON دانلود شد',
      type: 'success'
    })
  } catch (error) {
    notify({
      title: 'خطا',
      text: 'خطا در دانلود JSON',
      type: 'error'
    })
  }
}

const toggleJsonFormat = () => {
  isExpanded.value = !isExpanded.value
}

const closeModal = () => {
  showModal.value = false
}

const openModal = (data: any) => {
  response.value = data
  isExpanded.value = false
  showModal.value = true
}

defineExpose({
  openModal,
  closeModal
})
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
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  max-width: 900px;
  width: 100%;
  max-height: 85vh;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.tracker-info {
  margin-bottom: 24px;
  padding: 16px;
  background: #f0f4f8;
  border-radius: 8px;
  border-right: 4px solid #667eea;
}

.tracker-info label {
  display: block;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 8px;
}

.tracker-value {
  display: flex;
  gap: 8px;
  align-items: center;
}

.tracker-value input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  background: white;
}

.copy-btn {
  padding: 10px 12px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.copy-btn:hover {
  background: #5568d3;
  transform: scale(1.05);
}

.result-section {
  margin-bottom: 24px;
}

.result-section h3 {
  margin: 0 0 12px 0;
  color: #2c3e50;
  font-size: 16px;
  font-weight: 600;
}

.json-viewer {
  background: #f5f7fa;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.json-toolbar {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-bottom: 1px solid #e2e8f0;
  background: #f9fafb;
  flex-wrap: wrap;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #374151;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.json-content {
  padding: 12px;
  margin: 0;
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  overflow-x: auto;
  max-height: 300px;
  overflow-y: auto;
}

.result-tables {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.result-table {
  background: #f9fafb;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.result-table h4 {
  margin: 0;
  padding: 12px 16px;
  background: #667eea;
  color: white;
  font-size: 14px;
  font-weight: 600;
}

.table-container {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

thead {
  background: #f3f4f6;
  border-bottom: 2px solid #e5e7eb;
}

th {
  padding: 12px 16px;
  text-align: right;
  font-weight: 600;
  color: #374151;
}

td {
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  color: #6b7280;
}

tbody tr:hover {
  background: #f9fafb;
}

.object-display {
  padding: 16px;
}

.property-row {
  display: flex;
  padding: 8px 0;
  border-bottom: 1px solid #e5e7eb;
}

.property-key {
  flex: 0 0 200px;
  font-weight: 600;
  color: #374151;
  margin-right: 16px;
}

.property-value {
  flex: 1;
  color: #6b7280;
  word-break: break-word;
}

.empty-data {
  padding: 24px;
  text-align: center;
  color: #9ca3af;
}

.modal-footer {
  display: flex;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid #e2e8f0;
  background: #f9fafb;
  justify-content: flex-end;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5568d3;
}

/* Responsive */
@media (max-width: 768px) {
  .modal-overlay {
    padding: 10px;
  }

  .modal-content {
    max-height: 90vh;
  }

  .modal-header {
    padding: 16px;
  }

  .modal-body {
    padding: 16px;
  }

  .json-toolbar {
    flex-direction: column;
  }

  .action-btn {
    width: 100%;
    justify-content: center;
  }

  .property-row {
    flex-direction: column;
  }

  .property-key {
    flex: none;
    margin-right: 0;
    margin-bottom: 4px;
  }

  table {
    font-size: 12px;
  }

  th,
  td {
    padding: 8px 12px;
  }
}
</style>
