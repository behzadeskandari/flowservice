<template>
  <div class="services-page min-h-screen fullscreen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-500">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
         <LogoutButton />

        <h1>مدیریت سرویس‌ها</h1>
        <p>ایجاد و ویرایش سرویس‌ها</p>
      </div>
      <div class="header-actions">
        <router-link to="/home" class="w-full h-15 text-sm leading-7 mt-4 rounded-lg text-white font-bold text-lg shadow-lg hover:shadow-xl
          bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600
          hover:to-amber-700 active:scale-98 transition-all duration-200">
          <i class="fas fa-arrow-left"></i>
         <span class="l-hight">
         بازگشت به Flow
         </span>
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
                <font-awesome-icon :icon="['fas', 'pen-to-square']" style="color: orange;" class="pen" />
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
    <div v-if="showModal"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn p-4"
      @click.self="closeModal">
      <div class="bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 p-[2px] rounded-3xl w-full max-w-2xl">
        <div class="bg-white dark:bg-gray-900 shadow-2xl rounded-3xl w-full animate-scaleIn"
          style="padding:20px">

          <!-- Header -->
          <header class="flex flex-col sm:flex-row items-center justify-between border-b border-gray-200 pb-4 mb-6 gap-4">
            <h3 class="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-orange-500 to-amber-600 bg-clip-text text-transparent text-center sm:text-right order-first sm:order-last">
              {{ isEditMode ? 'ویرایش سرویس' : 'سرویس جدید' }}
            </h3>
            <div class="flex gap-2 w-full sm:w-auto">
              <button
                class="flex-1 sm:flex-none px-4 sm:px-6 py-3 bg-gradient-to-r from-gray-400 via-gray-500 to-gray-600 text-white font-semibold rounded-xl shadow-lg hover:from-gray-500 hover:via-gray-600 hover:to-gray-700 transition duration-300 ease-in-out flex items-center justify-center gap-2"
                @click="closeModal">
                <i class="fas fa-times"></i>
                <span class="hidden sm:inline">لغو</span>
              </button>
              <button
                class="flex-1 sm:flex-none px-4 sm:px-6 py-3 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:from-orange-500 hover:via-orange-600 hover:to-orange-700 transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                @click="saveService"
                :disabled="!isFormValid">
                <i class="fas fa-save"></i>
                <span class="hidden sm:inline">{{ isEditMode ? 'بروزرسانی' : 'ایجاد' }}</span>
              </button>
            </div>
          </header>

          <!-- Body -->
          <section class="space-y-5 max-h-[70vh] overflow-y-auto pr-2">
            <!-- Service Information Section -->
            <div class="space-y-5">
              <h4 class="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 pb-3 border-b border-orange-200">📋 اطلاعات سرویس</h4>

              <!-- Service Name -->
              <div class="space-y-2">
                <label class="block font-semibold text-gray-700 dark:text-gray-200 text-right">نام سرویس <span class="text-red-500">*</span></label>
                <input
                  v-model="formData.name"
                  type="text"
                  placeholder="مثال: Shahkar Service"
                  class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700
                   focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
                   bg-white dark:bg-gray-800 dark:text-white shadow-sm transition duration-200 text-right" />
              </div>

              <!-- URL -->
              <div class="space-y-2">
                <label class="block font-semibold text-gray-700 dark:text-gray-200 text-right">URL <span class="text-red-500">*</span></label>
                <input
                  v-model="formData.url"
                  type="text"
                  placeholder="https://api.example.com/endpoint"
                  class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700
                   focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
                   bg-white dark:bg-gray-800 dark:text-white shadow-sm transition duration-200 text-right text-sm" />
              </div>

              <!-- Method and Type -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="space-y-2">
                  <label class="block font-semibold text-gray-700 dark:text-gray-200 text-right">متد HTTP <span class="text-red-500">*</span></label>
                  <select
                    v-model="formData.method"
                    class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700
                     focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
                     bg-white dark:bg-gray-800 dark:text-white shadow-sm transition duration-200 text-right font-medium">
                    <option value="GET">🔵 GET</option>
                    <option value="POST">🟢 POST</option>
                    <option value="PUT">🟡 PUT</option>
                    <option value="DELETE">🔴 DELETE</option>
                    <option value="PATCH">🟣 PATCH</option>
                  </select>
                </div>

                <div class="space-y-2">
                  <label class="block font-semibold text-gray-700 dark:text-gray-200 text-right">نوع سرویس <span class="text-red-500">*</span></label>
                  <select
                    v-model="formData.type"
                    class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700
                     focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
                     bg-white dark:bg-gray-800 dark:text-white shadow-sm transition duration-200 text-right font-medium">
                    <option value="REST">🌐 REST</option>
                    <option value="GRAPHQL">📊 GraphQL</option>
                    <option value="SOAP">📦 SOAP</option>
                  </select>
                </div>
              </div>

              <!-- Status -->
              <div class="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-4 flex items-center justify-between border-2 border-orange-100 dark:border-orange-800">
                <div class="flex items-center gap-3">
                  <input
                    v-model="formData.status"
                    type="checkbox"
                    id="statusCheckbox"
                    class="w-6 h-6 rounded-lg border-2 border-orange-400 accent-orange-500 cursor-pointer" />
                  <label for="statusCheckbox" class="font-semibold text-gray-700 dark:text-gray-200 cursor-pointer">وضعیت سرویس</label>
                </div>
                <span :class="formData.status ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'" class="font-bold text-sm">
                  {{ formData.status ? '✓ فعال' : '✗ غیرفعال' }}
                </span>
              </div>
            </div>
          </section>
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
import LogoutButton from '@/components/LogoutButton.vue'

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
  //&& formData.value.url
  return formData.value.name  && formData.value.method && formData.value.type
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

<style scoped lang="postcss">
.services-page {
  min-height: 100vh;
  width: 100%;
  padding: 30px;
  margin: 0 auto;
  display: flex;
  flex-flow: column;
  box-sizing: border-box;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto 30px;
  background: white;
  padding: 25px 30px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
}

.header-content h1 {
  margin: 0;
  font-size: 28px;
  color: #2c3e50;
  margin-bottom: 5px;
  text-align: center;
  flex: 1;
}

.header-content p {
  margin: 0;
  color: #7f8c8d;
  font-size: 14px;
  text-align: center;
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
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
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
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  box-sizing: border-box;
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
  table-layout: fixed;
}

.services-table thead {
  background: #f8f9fa;
  border-bottom: 2px solid #dee2e6;
}

.services-table th {
  padding: 16px;
  text-align: center;
  font-weight: 600;
  color: #2c3e50;
  font-size: 14px;
  word-break: break-word;
}

.services-table td {
  padding: 16px;
  border-bottom: 1px solid #dee2e6;
  text-align: center;
  word-break: break-word;
}

.services-table tbody tr {
  background-color: white;
  transition: background-color 0.2s ease;
}

.services-table tbody tr:nth-child(even) {
  background-color: #f8f9fa;
}

.services-table tbody tr:hover {
  background-color: #e8f0f8;
}

.name-cell {
  font-weight: 500;
  color: #2c3e50;
  text-align: center;
}

.url-cell {
  text-align: center;
}

.url-cell code {
  background: #f8f9fa;
  padding: 4px 8px;
  border-radius: 4px;
  color: #d63384;
  font-size: 11px;
  display: inline-block;
  word-break: break-all;
}

.method-cell {
  text-align: center;
}

.method-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  color: white;
  min-height: 30px;
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
  text-align: center;
}

.status-cell {
  text-align: center;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  min-height: 30px;
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
  align-items: center;
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
  flex-shrink: 0;
}

.btn-edit {
  background: #e7f3ff;
  color: #ffa600;
}

.btn-edit:hover {
  background: #ffa600;
  color: white;
  .pen{
    color: white !important;
  }
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
.pen{
  color: orange !important;
  transition: color 0.3s ease;
}
.pen:hover{
  color: white !important;
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
    text-align: center;
  }

  .actions-cell {
    flex-direction: row;
  }

  .modal-footer {
    flex-direction: row-reverse;
  }
}

/* Responsive Styles */
@media (max-width: 768px) {
  .services-page {
    padding: 15px;
  }

  .page-header {
    flex-direction: column;
    align-items: center;
    width: 100%;
    gap: 20px;
    padding: 20px 15px;
  }

  .header-content h1 {
    font-size: 24px;
    text-align: center;
  }

  .header-content p {
    font-size: 12px;
    text-align: center;
  }

  .header-actions {
    width: 100%;
    flex-direction: column;
    gap: 10px;
  }

  .header-actions > * {
    width: 100%;
  }

  .services-container {
    width: 100%;
  }

  .services-table {
    font-size: 12px;
  }

  .services-table th,
  .services-table td {
    padding: 12px 8px;
    font-size: 12px;
  }

  .btn-icon {
    width: 32px;
    height: 32px;
    font-size: 14px;
  }

  .url-cell code {
    font-size: 10px;
  }

  .method-badge,
  .status-badge {
    padding: 4px 8px;
    font-size: 10px;
  }
}

@media (max-width: 480px) {
  .services-page {
    padding: 10px;
  }

  .page-header {
    padding: 15px 10px;
  }

  .header-content h1 {
    font-size: 20px;
  }

  .header-actions {
    gap: 8px;
  }

  .services-table th,
  .services-table td {
    padding: 10px 6px;
    font-size: 11px;
  }

  .btn-icon {
    width: 30px;
    height: 30px;
    font-size: 12px;
  }

  .method-badge,
  .status-badge {
    padding: 4px 8px;
    font-size: 10px;
    min-height: 26px;
  }

  .url-cell code {
    padding: 2px 4px;
    font-size: 9px;
  }
}

/* RTL Responsive */
@supports (direction: rtl) {
  @media (max-width: 768px) {
    .page-header {
      flex-direction: column-reverse;
      align-items: center;
    }

    .header-actions {
      flex-direction: column-reverse;
    }

    .services-table th,
    .services-table td {
      text-align: center;
    }

    .actions-cell {
      flex-direction: row;
      height: 18vh;
    }
  }
}

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
</style>
