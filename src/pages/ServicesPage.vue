<template>
  <div class="services-page min-h-screen fullscreen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-500">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <h1>مدیریت سرویس‌ها</h1>
        <p>ایجاد و ویرایش سرویس‌های خود</p>
      </div>
      <div class="header-actions">
        <router-link to="/home" class="w-full h-15 text-sm leading-7 mt-4 rounded-lg text-white font-bold text-lg shadow-lg hover:shadow-xl
          bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600
          hover:to-amber-700 active:scale-98 transition-all duration-200">
          <i class="fas fa-arrow-left"></i> بازگشت به Flow
        </router-link>
        <button class="w-full h-12 mt-4 rounded-lg text-white text-sm  leading-7 font-bold text-lg shadow-lg hover:shadow-xl
          bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600
          hover:to-amber-700 active:scale-98 transition-all duration-200" @click="openAddModal">
          <i class="fas fa-plus"></i> سرویس جدید
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-container">
      <div class="spinner"></div>
      <p>در حال بارگذاری...</p>
    </div>

    <!-- Services Table -->
    <div v-else class="services-container">
      <div v-if="services.length === 0" class="empty-state">
        <i class="fas fa-inbox"></i>
        <h3>هیچ سرویسی موجود نیست</h3>
        <p>سرویس جدیدی ایجاد کنید تا شروع کنید</p>
      </div>

      <table v-else class="services-table">
        <thead>
          <tr>
            <th>نام</th>
            <th>URL</th>
            <th>متد</th>
            <th>نوع</th>
            <th>وضعیت</th>
            <th>اقدامات</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="service in services" :key="service.id">
            <td class="name-cell">{{ service.name }}</td>
            <td class="url-cell">
              <code>{{ truncateUrl(service.url) }}</code>
            </td>
            <td class="method-cell">
              <span class="method-badge" :class="service.method.toLowerCase()">
                {{ service.method }}
              </span>
            </td>
            <td class="type-cell">{{ service.type }}</td>
            <td class="status-cell">
              <span class="status-badge" :class="{ active: service.status, inactive: !service.status }">
                {{ service.status ? 'فعال' : 'غیرفعال' }}
              </span>
            </td>
            <td class="actions-cell">
              <button class="btn-icon btn-edit" @click="openEditModal(service)" title="ویرایش">
                <font-awesome-icon :icon="['fas', 'pen-to-square']" style="color: #ff9900;" />
              </button>
              <button class="btn-icon btn-delete" @click="deleteService(service.id)" title="حذف">
                <font-awesome-icon :icon="['fas', 'trash']" style="color: red;" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Service Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ isEditMode ? 'ویرایش سرویس' : 'سرویس جدید' }}</h3>
          <button class="close-btn" @click="closeModal">&times;</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>نام سرویس *</label>
            <input
              v-model="formData.name"
              type="text"
              class="form-control"
              placeholder="نام سرویس را وارد کنید"
            >
          </div>

          <div class="form-group">
            <label>URL *</label>
            <input
              v-model="formData.url"
              type="text"
              class="form-control"
              placeholder="https://api.example.com/endpoint"
            >
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>متد HTTP *</label>
              <select v-model="formData.method" class="form-control">
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>

            <div class="form-group">
              <label>نوع سرویس *</label>
              <select v-model="formData.type" class="form-control">
                <option value="REST">REST</option>
                <option value="GRAPHQL">GraphQL</option>
                <option value="SOAP">SOAP</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input v-model="formData.status" type="checkbox">
              <span>فعال</span>
            </label>
          </div>
        </div>

        <div class="modal-footer">
          <button class="w-full h-12 mt-4 rounded-lg text-white font-bold text-lg shadow-lg hover:shadow-xl
          bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600
          hover:to-amber-700 active:scale-98 transition-all duration-200" @click="closeModal">لغو</button>
          <button class="w-full h-12 mt-4 rounded-lg text-white font-bold text-lg shadow-lg hover:shadow-xl
          bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600
          hover:to-amber-700 active:scale-98 transition-all duration-200" @click="saveService" :disabled="!isFormValid">
            {{ isEditMode ? 'بروزرسانی' : 'ایجاد' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Notifications -->
    <notifications />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { notify } from '@kyvg/vue3-notification'
import serviceAggregatorClient from '@/utils/service-aggregator-client'

const services = ref([])
const isLoading = ref(false)
const showModal = ref(false)
const isEditMode = ref(false)

const formData = ref({
  id: null,
  name: '',
  url: '',
  method: 'GET',
  type: 'REST',
  status: true,
})

const isFormValid = computed(() => {
  return formData.value.name && formData.value.url && formData.value.method && formData.value.type
})

const truncateUrl = (url) => {
  if (!url) return ''
  return url.length > 50 ? url.slice(0, 47) + '...' : url
}

const loadServices = async () => {
  isLoading.value = true
  try {
    const data = await serviceAggregatorClient.getServices()
    services.value = Array.isArray(data) ? data : []
    notify({
      title: 'موفقیت',
      text: 'سرویس‌ها بارگذاری شدند',
      type: 'success',
    })
  } catch (error) {
    console.error('Error loading services:', error)
    notify({
      title: 'خطا',
      text: 'خطا در بارگذاری سرویس‌ها',
      type: 'error',
    })
  } finally {
    isLoading.value = false
  }
}

const openAddModal = () => {
  isEditMode.value = false
  resetForm()
  showModal.value = true
}

const openEditModal = (service) => {
  isEditMode.value = true
  formData.value = JSON.parse(JSON.stringify(service))
  showModal.value = true
}

const resetForm = () => {
  formData.value = {
    id: null,
    name: '',
    url: '',
    method: 'GET',
    type: 'REST',
    status: true,
  }
}

const closeModal = () => {
  showModal.value = false
  resetForm()
}

const saveService = async () => {
  if (!isFormValid.value) {
    notify({
      title: 'خطا',
      text: 'تمام فیلدهای الزامی را پر کنید',
      type: 'error',
    })
    return
  }

  try {
    if (isEditMode.value) {
      await serviceAggregatorClient.updateService(formData.value)
      notify({
        title: 'موفقیت',
        text: 'سرویس بروزرسانی شد',
        type: 'success',
      })
    } else {
      await serviceAggregatorClient.createService({
        name: formData.value.name,
        url: formData.value.url,
        method: formData.value.method,
        type: formData.value.type,
      })
      notify({
        title: 'موفقیت',
        text: 'سرویس ایجاد شد',
        type: 'success',
      })
    }
    closeModal()
    await loadServices()
  } catch (error) {
    console.error('Error saving service:', error)
    notify({
      title: 'خطا',
      text: isEditMode.value ? 'خطا در بروزرسانی سرویس' : 'خطا در ایجاد سرویس',
      type: 'error',
    })
  }
}

const deleteService = async (serviceId) => {
  if (!confirm('آیا مطمئن هستید که می‌خواهید این سرویس را حذف کنید؟')) {
    return
  }

  try {
    // Note: Backend might not have a delete endpoint, so we'll use status = false
    const serviceToDelete = services.value.find(s => s.id === serviceId)
    if (serviceToDelete) {
      await serviceAggregatorClient.updateService({
        ...serviceToDelete,
        status: false,
      })
      notify({
        title: 'موفقیت',
        text: 'سرویس حذف شد',
        type: 'success',
      })
      await loadServices()
    }
  } catch (error) {
    console.error('Error deleting service:', error)
    notify({
      title: 'خطا',
      text: 'خطا در حذف سرویس',
      type: 'error',
    })
  }
}

onMounted(() => {
  loadServices()
})
</script>

<style scoped>
.services-page {
  min-height: 100vh;
  width: 99.2vw;
  padding: 30px;
  margin: 0 auto;
  display: flex;
  flex-flow: column;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 90vw;
  margin-bottom: 30px;
  background: white;
  padding: 25px 30px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.header-content h1 {
  margin: 0;
  font-size: 28px;
  color: #2c3e50;
  margin-bottom: 5px;
}

.header-content p {
  margin: 0;
  color: #7f8c8d;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 15px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.services-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  width: 90vw;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 30px;
  text-align: center;
}

.empty-state i {
  font-size: 48px;
  color: #bdc3c7;
  margin-bottom: 20px;
}

.empty-state h3 {
  color: #2c3e50;
  margin: 10px 0;
}

.empty-state p {
  color: #7f8c8d;
}

.services-table {
  width: 100%;
  border-collapse: collapse;
}

.services-table thead {
  background: #f8f9fa;
  border-bottom: 2px solid #dee2e6;
}

.services-table th {
  padding: 16px;
  text-align: right;
  font-weight: 600;
  color: #2c3e50;
  font-size: 14px;
}

.services-table td {
  padding: 16px;
  border-bottom: 1px solid #dee2e6;
}

.services-table tbody tr:hover {
  background: #f8f9fa;
}

.name-cell {
  font-weight: 500;
  color: #2c3e50;
}

.url-cell code {
  background: #f8f9fa;
  padding: 4px 8px;
  border-radius: 4px;
  color: #d63384;
  font-size: 12px;
}

.method-cell {
  text-align: center;
}

.method-badge {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  color: white;
}

.method-badge.get {
  background: #007bff;
}

.method-badge.post {
  background: #28a745;
}

.method-badge.put {
  background: #ffc107;
  color: #333;
}

.method-badge.delete {
  background: #dc3545;
}

.method-badge.patch {
  background: #17a2b8;
}

.type-cell {
  color: #555;
  font-size: 14px;
}

.status-cell {
  text-align: center;
}

.status-badge {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.status-badge.active {
  background: #d4edda;
  color: #155724;
}

.status-badge.inactive {
  background: #f8d7da;
  color: #721c24;
}

.actions-cell {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s ease;
}

.btn-edit {
  background: #e7f3ff;
  color: #007bff;
}

.btn-edit:hover {
  background: #007bff;
  color: white;
}

.btn-delete {
  background: #ffe7e7;
  color: #dc3545;
}

.btn-delete:hover {
  background: #dc3545;
  color: white;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-secondary {
  background: #e9ecef;
  color: #495057;
}

.btn-secondary:hover {
  background: #dee2e6;
}

/* Modal Styles */
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
  border-radius: 12px;
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
  padding: 20px 25px;
  border-bottom: 1px solid #dee2e6;
  position: sticky;
  top: 0;
  background: white;
}

.modal-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 20px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #7f8c8d;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f8f9fa;
  color: #2c3e50;
}

.modal-body {
  padding: 25px;
}

.form-group {
  margin-bottom: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #2c3e50;
  font-size: 14px;
}

.form-control {
  width: 100%;
  padding: 12px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  transition: all 0.3s ease;
}

.form-control:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-weight: 500;
  color: #2c3e50;
}

.checkbox-label input {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.modal-footer {
  padding: 16px 25px;
  border-top: 1px solid #dee2e6;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  position: sticky;
  bottom: 0;
  background: white;
}

.modal-footer .btn {
  min-width: 100px;
  justify-content: center;
}

/* RTL Support */
@supports (direction: rtl) {
  .services-page {
    direction: rtl;
  }

  .page-header {
    flex-direction: row-reverse;
  }

  .header-actions {
    flex-direction: row-reverse;
  }

  .services-table th,
  .services-table td {
    text-align: right;
  }

  .actions-cell {
    flex-direction: row-reverse;
  }

  .modal-footer {
    flex-direction: row-reverse;
  }
}
</style>
