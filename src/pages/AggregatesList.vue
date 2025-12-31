<template>
  <div class="aggregates-page min-h-screen fullscreen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-500">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <LogoutButton />
        <h1>مدیریت Aggregates</h1>
        <p>مشاهده و مدیریت تمام Aggregates</p>
      </div>
      <div class="header-actions">
        <router-link to="/home" class="w-full h-15 text-sm leading-7 mt-4 rounded-lg text-white font-bold text-lg shadow-lg hover:shadow-xl
          bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600
          hover:to-amber-700 active:scale-98 transition-all duration-200">
          <i class="fas fa-arrow-left"></i>
          <span class="l-hight">بازگشت به Flow</span>
        </router-link>
        <button class="w-full h-12 mt-4 rounded-lg text-white text-sm leading-7 font-bold text-lg shadow-lg hover:shadow-xl
          bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600
          hover:to-amber-700 active:scale-98 transition-all duration-200" @click="openAddModal">
          <i class="fas fa-plus"></i> Aggregate جدید
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-container">
      <div class="spinner"></div>
      <p>در حال بارگذاری...</p>
    </div>

    <!-- Aggregates Table -->
    <div v-else class="aggregates-container">
      <div v-if="aggregates.length === 0" class="empty-state">
        <i class="fas fa-inbox"></i>
        <h3>هیچ Aggregate موجود نیست</h3>
        <p>Aggregate جدیدی ایجاد کنید تا شروع کنید</p>
      </div>

      <table v-else class="aggregates-table">
        <thead>
          <tr>
            <th>نام</th>
            <th>توضیحات</th>
            <th>وضعیت</th>
            <th>اقدامات</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="aggregate in aggregates"
            :key="aggregate.id"
            @click="navigateToEditor(aggregate.id)"
            class="clickable-row"
          >
            <td class="name-cell">{{ aggregate.name || 'بدون نام' }}</td>
            <td class="description-cell">{{ truncateDescription(aggregate.description) }}</td>
            <td class="status-cell">
              <span class="status-badge" :class="{ active: aggregate.status, inactive: !aggregate.status }">
                {{ aggregate.status ? 'فعال' : 'غیرفعال' }}
              </span>
            </td>
            <td class="actions-cell" @click.stop>
               <button class="btn-icon btn-view" @click.stop="navigateToEditor(aggregate.id)" title="مشاهده Flow">
                <FontAwesomeIcon :icon="['fa','play']" />
                <font-awesome-icon :icon="['fas', 'eye']" style="color: red;" />
               </button>
              <button class="btn-icon btn-edit" @click.stop="openEditModal(aggregate)" title="ویرایش">
                <font-awesome-icon :icon="['fas', 'pen-to-square']" style="color: orange;" class="pen" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Aggregate Modal -->
    <AggregateModal
      :show="showModal"
      :mode="isEditMode ? 'edit' : 'add'"
      @update:show="showModal = $event"
      @saved="handleModalSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { notify } from '@kyvg/vue3-notification'
import serviceAggregatorClient from '@/utils/service-aggregator-client'
import LogoutButton from '@/components/LogoutButton.vue'
import AggregateModal from '@/components/modals/AggregateModal.vue'
import { useFlowStore } from '@/stores/flowStore'

const router = useRouter()
const store = useFlowStore()

const aggregates = ref<any[]>([])
const isLoading = ref(false)
const showModal = ref(false)
const isEditMode = ref(false)

const truncateDescription = (description: string | null | undefined): string => {
  if (!description) return 'بدون توضیحات'
  return description.length > 80 ? description.slice(0, 77) + '...' : description
}

const loadAggregates = async () => {
  isLoading.value = true
  try {
    const data = await serviceAggregatorClient.getAggregates()
    aggregates.value = Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Error loading aggregates:', error)
    notify({
      title: 'خطا',
      text: 'خطا در بارگذاری Aggregates',
      type: 'error',
    })
  } finally {
    isLoading.value = false
  }
}

const openAddModal = () => {
  isEditMode.value = false
  showModal.value = true
}

const openEditModal = (aggregate: any) => {
  isEditMode.value = true
  store.currentAggregateId = aggregate.id
  showModal.value = true
}

const handleModalSaved = async () => {
  await loadAggregates()
  showModal.value = false
}

const navigateToEditor = (aggregateId: string) => {
  router.push(`/aggregates/${aggregateId}`)
}

onMounted(() => {
  loadAggregates()
})
</script>

<style scoped lang="postcss">
.aggregates-page {
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

.aggregates-container {
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

.aggregates-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.aggregates-table thead {
  background: #f8f9fa;
  border-bottom: 2px solid #dee2e6;
}

.aggregates-table th {
  padding: 16px;
  text-align: center;
  font-weight: 600;
  color: #2c3e50;
  font-size: 14px;
  word-break: break-word;
}

.aggregates-table td {
  padding: 16px;
  border-bottom: 1px solid #dee2e6;
  text-align: center;
  word-break: break-word;
}

.aggregates-table tbody tr {
  background-color: white;
  transition: background-color 0.2s ease;
}

.aggregates-table tbody tr:nth-child(even) {
  background-color: #f8f9fa;
}

.aggregates-table tbody tr:hover {
  background-color: #e8f0f8;
}

.clickable-row {
  cursor: pointer;
}

.name-cell {
  font-weight: 500;
  color: #2c3e50;
  text-align: center;
}

.description-cell {
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
}

.btn-edit:hover .pen {
  color: white !important;
}

.pen {
  color: orange !important;
  transition: color 0.3s ease;
}

.btn-view {
  background: #e7f3ff;
  color: orange !important;
}

.btn-view:hover {
  background: orange;
  color: white;
}

.btn-view:hover .view-icon {
  color: black !important;
}

.view-icon {
  color: black !important;
  transition: color 0.3s ease;
}

/* Responsive Styles */
@media (max-width: 768px) {
  .aggregates-page {
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

  .aggregates-container {
    width: 100%;
  }

  .aggregates-table {
    font-size: 12px;
  }

  .aggregates-table th,
  .aggregates-table td {
    padding: 12px 8px;
    font-size: 12px;
  }

  .btn-icon {
    width: 32px;
    height: 32px;
    font-size: 14px;
  }
}
</style>

