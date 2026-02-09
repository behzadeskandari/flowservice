<template>
  <div
    class="aggregates-page min-h-screen fullscreen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-500">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <LogoutButton />
        <h1>مدیریت </h1>
        <h3>تجمیع سرویس</h3>
        <p>مدیریت و مشاهده تمام </p>
        <p> تجمیع ها</p>
      </div>
      <div class="header-actions">

        <router-link to="/services"
          class="px-3 py-2 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 text-white font-semibold rounded-xl shadow-lg hover:from-blue-500 hover:via-blue-600 hover:to-blue-700 transition duration-300 ease-in-out">
          <font-awesome-icon :icon="faArrowLeft" style="color: white" />
          <span class="toolbar-text"> جدول سرویس ها</span>
        </router-link>
        <button class="w-full h-12 mt-4 rounded-lg text-white text-sm leading-7 font-bold text-lg shadow-lg hover:shadow-xl
          bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600
          hover:to-amber-700 active:scale-98 transition-all duration-200" @click="openAddModal">
          <span class="l-hight" style="margin-inline : 20px;">
            تجمیع سرویس جدید
          </span>
        </button>
      </div>
    </div>
    <div class="search_holder">
      <button class="SearchButton" @click="SearchAgg">جستجو</button>
      <button class="btn-del-SearchButton" @click="resetSearch">حذف</button>
      <div>
        <label class="block font-medium text-orange-500 mb-1 text-right px-1 py-1">وضعیت </label>
        <select v-model="status" type="text" placeholder="نام Aggregate را وارد کنید" class="w-[300px] h-[50px] px-4 py-2 rounded-xl border border-gray-300
                       focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
                       bg-white shadow-sm transition text-right" required>
          <option :value="null">یک مورد انتخاب کنید</option>
          <option :value="true">فعال</option>
          <option :value="false">غیر فعال</option>
        </select>
      </div>
      <div>
        <label class="block font-medium text-orange-500 mb-1 text-right px-1 py-1">نام </label>
        <input v-model="name" type="text" placeholder="نام Aggregate را وارد کنید" class="w-[300px] h-[50px] px-4 py-2 rounded-xl border border-gray-300
                       focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
                       bg-white shadow-sm transition text-right" required />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-container">
      <div class="spinner"></div>
      <p>در حال بارگذاری...</p>
    </div>

    <!-- Aggregates Table -->
    <div v-else class="aggregates-container">
      <div v-if="aggregates.totalCount === 0" class="empty-state">
        <i class="fas fa-inbox"></i>
        <h3>هیچ Aggregate موجود نیست</h3>
        <p>Aggregate جدیدی ایجاد کنید تا شروع کنید</p>
      </div>
      <div v-else>

        <table class="aggregates-table">
          <thead>
            <tr>
              <th>ردیف</th>
              <th>نام</th>
              <th>توضیحات</th>
              <th>وضعیت</th>
              <th>زمان ویرایش</th>
              <th>زمان ایجاد</th>
              <th>اقدامات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(aggregate, index) in aggregates.items" :key="aggregate.id" @click="navigateToEditor(aggregate.id)"
              class="clickable-row">
              <td class="name-cell">{{ index + 1 }}</td>
              <td class="name-cell">{{ aggregate.name || 'بدون نام' }}</td>
              <td class="description-cell">{{ truncateDescription(aggregate.description) }}</td>
              <td class="status-cell">
                <span class="status-badge" :class="{ active: aggregate.status, inactive: !aggregate.status }">
                  {{ aggregate.status ? 'فعال' : 'غیرفعال' }}
                </span>
              </td>
              <td class="status-cell">
                <span class="status-badge" :class="{ active: aggregate.status, inactive: !aggregate.status }">
                  {{ aggregate.updateDate }}
                </span>

              </td>

              <td class="status-cell">
                <span class="status-badge" :class="{ active: aggregate.status, inactive: !aggregate.status }">
                  {{ aggregate.createDate }}
                </span>
              </td>
              <td class="actions-cell" @click.stop>
                <button class="btn-icon btn-view" @click.stop="navigateToEditor(aggregate.id)" title="مشاهده Flow">
                  <FontAwesomeIcon :icon="['fa', 'play']" />
                  <font-awesome-icon :icon="['fas', 'eye']" style="color: red;" />
                </button>
                <button class="btn-icon btn-edit" @click.stop="openEditModal(aggregate)" title="ویرایش">
                  <font-awesome-icon :icon="['fas', 'pen-to-square']" style="color: orange;" class="pen" />
                </button>
                <button class="btn-icon btn-delete" @click.stop="deleteModal(aggregate.id)" title="پاک کردن">
                  <font-awesome-icon :icon="faDeleteLeft" style="color: red;" />
                </button>
                <!-- 🔥 NEW: Add Mapping -->
                <button class="btn-icon btn-add" title="Add Mapping" @click.stop="openAddMappingModal(aggregate.id)">
                  <font-awesome-icon :icon="faPlus" style="color : orange" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="btn-pagenumber-grey">
        <span> تعداد کل رکورد </span>
        <span>{{ aggregates.totalCount }}</span>
      </div>

      <div style="display:block" dir="ltr">
        <span class="btn-pagenumber" v-if="aggregates.hasPreviousPage" @click="fetchPrevouisPage">
          <font-awesome-icon :icon="faArrowLeft" style="color: orange;" />
        </span>
        <span class="btn-pagenumber-orange">{{ aggregates.pageNumber }}</span>
        <span class="btn-pagenumber" @click="fetchNextpage" v-if="aggregates.hasNextPage">{{ aggregates.pageNumber + 1
        }}</span>
        <!-- <span class="btn-totalpage">{{ aggregates.totalPages }}</span> -->
        <!-- <span class="btn-pagenumber-grey">{{ aggregates.totalCount }} تعداد کل رکورد </span> -->
        <span class="btn-pagenumber" v-if="aggregates.hasNextPage" @click="fetchNextPage">
          <font-awesome-icon :icon="faArrowRight" style="color: orange;" />
        </span>
      </div>
    </div>

    <!-- Aggregate Modal -->
    <AggregateModal :show="showModal" :mode="isEditMode ? 'edit' : 'add'" @update:show="showModal = $event"
      @saved="handleModalSaved" />
    <ConfirmModal :visible="showConfirm" message="آیا از پاک کردن گره مطمئن هستید؟" @confirm="onConfirmDelete"
      @cancel="onCancelDelete" />
    <AggregateMappingModal :show="showMappingModal" :mode="mappingMode" :aggregate-id="selectedAggregateId"
      :mapping="selectedMapping" @close="showMappingModal = false" @saved="onMappingSaved" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { notify } from '@kyvg/vue3-notification'
import serviceAggregatorClient from '@/utils/service-aggregator-client'
import LogoutButton from '@/components/LogoutButton.vue'
import AggregateModal from '@/components/modals/AggregateModal.vue'
import { useFlowStore } from '@/stores/flowStore'
import { faCamera, faSun, faMoon, faPlus, faBars, faArrowLeft, faArrowRight, faExpand, faDeleteLeft, faArrowsLeftRight } from '@fortawesome/free-solid-svg-icons'
import ConfirmModal from '@/components/modals/ConfirmModal.vue'
import AggregateMappingModal from '@/components/modals/AggregateMappingModal.vue'

const showMappingModal = ref(false)
const selectedAggregateId = ref<string | null>(null)
const selectedMapping = ref<any>(null)
const mappingMode = ref<'add' | 'edit'>('add')

const router = useRouter()
const store = useFlowStore()
const showConfirm = ref(false)
const status = ref(null);
const name = ref("");
const aggregates = ref<{
  hasNextPage: true,
  hasPreviousPage: false,
  items: [],
  pageNumber: 0,
  totalCount: 0,
  totalPages: 0
}>({
  hasNextPage: true,
  hasPreviousPage: false,
  items: [],
  pageNumber: 0,
  totalCount: 0,
  totalPages: 0
})


const isLoading = ref(false)
const showModal = ref(false)
const isEditMode = ref(false)
const selectedId = ref("");


const onMappingSaved = () => {
  debugger
  showMappingModal.value = false
  notify({
    title: 'موفق',
    text: 'Mapping با موفقیت ذخیره شد',
    type: 'success'
  })
}


async function onConfirmDelete() {
  showConfirm.value = false
  var response = await serviceAggregatorClient.deleteAggregate(selectedId.value)
  await loadAggregates();
  close() // Close your main modal if you want
}

function onCancelDelete() {
  showConfirm.value = false
}
function close() {
  store.clearSelected()
}

const truncateDescription = (description: string | null | undefined): string => {
  if (!description) return 'بدون توضیحات'
  return description.length > 80 ? description.slice(0, 77) + '...' : description
}
async function fetchNextpage() {
  var data = {
    PageIndex: aggregates.value.pageNumber + 1,
    PageSize: 10,
  }
  var record = await serviceAggregatorClient.getAggregatesWithParams(data);
  aggregates.value = record;
}

async function fetchPrevouisPage() {
  var data = {
    PageIndex: aggregates.value.pageNumber - 1,
    PageSize: 10,
  }
  var record = await serviceAggregatorClient.getAggregatesWithParams(data);
  aggregates.value = record;
}


async function fetchNextPage() {
  var data = {
    PageIndex: aggregates.value.pageNumber + 1,
    PageSize: 10,
  }
  var record = await serviceAggregatorClient.getAggregatesWithParams(data);
  aggregates.value = record;

}
async function resetSearch() {

  name.value = '';
  status.value = null;
  var data = {
    PageIndex: 1,
    PageSize: 10,
  }
  var record = await serviceAggregatorClient.getServicesWithParams(data);
  aggregates.value = record;
}
async function SearchAgg(params) {
  // if (name.value == "") {
  //   notify({
  //     title: 'نام را وارد کنید',
  //     text: 'نام را وارد کنید',
  //     type: 'error',
  //   })
  // }
  // if (status.value === null || status.value === undefined) {
  //   status.value = true;
  // }
  var data = {
    PageIndex: aggregates.value.pageNumber,
    PageSize: 10,
    Name: name.value,
    Status: status.value,
  }
  var record = await serviceAggregatorClient.getAggregatesWithParamsWithSearch(data);
  aggregates.value = record;
}
const deleteModal = async (id) => {
  showConfirm.value = true;
  selectedId.value = id;
}

const loadAggregates = async () => {
  isLoading.value = true
  try {
    const data = await serviceAggregatorClient.getAggregates()
    aggregates.value = data ? data : []
  } catch (error) {
    console.error('Error loading aggregates:', error)
    notify({
      title: 'خطا',
      text: 'خطا در بارگذاری تجمیع سرویس',
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
  console.log(aggregate, 'aggregateididids')
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

const openAddMappingModal = (aggregateId: string) => {
  selectedAggregateId.value = aggregateId
  selectedMapping.value = null
  mappingMode.value = 'add'
  showMappingModal.value = true
}

const openEditMappingModal = (mapping: any) => {
  selectedMapping.value = mapping
  mappingMode.value = 'edit'
  showMappingModal.value = true
}

const confirmDeleteMapping = async (mappingId: string) => {
  await serviceAggregatorClient.deleteAggregateMapping(mappingId)
  notify({
    title: 'موفق',
    text: 'Mapping حذف شد',
    type: 'success'
  })
}
</script>

<style scoped lang="postcss">
.SearchButton {
  background-color: rgb(249, 120, 0);
  width: 250px;
  height: 50px;
  line-height: 1;
  margin-top: 2.3em;
  border-radius: 50px;
  color: white;

}

.btn-del-SearchButton {
  background-color: rgb(10, 184, 1);
  width: 250px;
  height: 50px;
  line-height: 1;
  margin-top: 2.3em;
  border-radius: 50px;
  color: white;
}

.search_holder {
  direction: ltr;
  display: flex;
  background-color: #f7f7f7;
  height: 150px;
  gap: 10;
  padding: 10px;
  margin: 0 auto;
  justify-content: center;
  gap: 10px;
  width: 75.8%;
  margin-bottom: 22px;
  border-radius: 10px;
}

.aggregates-page {
  min-height: 100vh;
  width: 100%;
  padding: 30px;
  margin: 0 auto;
  display: flex;
  flex-flow: column;
  box-sizing: border-box;
}

.btn-pagenumber,
.btn-pagenumber-orange,
.btn-totalpage {
  color: orange;
  border-radius: 50%;
  line-height: 3;
  background-color: #eee;
  border: 1px solid rgb(185, 184, 184);
  display: inline-block;
  width: 50px;
  height: 50px;
  margin: 10px;
}

.btn-pagenumber-orange {
  background-color: orange;
  color: white;
}

.btn-totalpage {
  color: white;
  background-color: rgb(182, 179, 179);
}

.btn-pagenumber-grey {
  background-color: rgb(231, 229, 229);
  cursor: none;
  pointer-events: none;
  color: black;
  line-height: 3;
  display: block;
  position: relative;
  right: 0;
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
  direction: ltr;
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
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
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
  font-size: 13px;
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

.btn-delete {
  background: #e7f3ff;
  color: red;
}
.btn-add{
  background: #E7F3FF;
  color: e7f3ff;
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

  .header-actions>* {
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
