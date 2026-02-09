<template>
  <div
    class="services-page min-h-screen fullscreen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-500">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <LogoutButton />

        <h1>مدیریت سرویس‌ها</h1>
        <p>ایجاد و ویرایش سرویس‌ها</p>
      </div>
      <div class="header-actions">
        <router-link to="/aggregates"
          class="px-3 py-2 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 text-white font-semibold rounded-xl shadow-lg hover:from-blue-500 hover:via-blue-600 hover:to-blue-700 transition duration-300 ease-in-out">
          <font-awesome-icon :icon="faArrowRight" style="color: white" />
          <span class="toolbar-text"> جدول تجمیع سرویس ها</span>
        </router-link>
        <button class="w-full h-12 mt-4 rounded-lg text-white text-sm  leading-7 font-bold text-lg shadow-lg hover:shadow-xl
          bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600
          hover:to-amber-700 active:scale-98 transition-all duration-200" @click="openAddModal">
          <i class="fas fa-plus"></i> سرویس جدید
        </button>
      </div>
    </div>
    <div class="search_holder" :key="resetKey">
      <button class="SearchButton" @click="SearchAgg">جستجو</button>
      <button class="btn-del-SearchButton" @click="resetSearch">حذف</button>
      <div>
        <label class="block font-medium text-orange-500 mb-1 text-right px-1 py-1">وضعیت </label>
        <select v-model="status" type="text" class="w-[300px] h-[50px] px-4 py-2 rounded-xl border border-gray-300
                       focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
                       bg-white shadow-sm transition text-right" required>
          <option :value="null">یک مورد انتخاب کنید</option>
          <option :value="true">فعال</option>
          <option :value="false">غیر فعال</option>
        </select>
      </div>

      <div>
        <label class="block font-medium text-orange-500 mb-1 text-right px-1 py-1">URL </label>
        <input dir="rtl" v-model="url" type="text" placeholder="URL را وارد کنید" class="w-[300px] h-[50px] px-4 py-2 rounded-xl border border-gray-300
                       focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
                       bg-white shadow-sm transition text-right" required />
      </div>
      <div>
        <label class="block font-medium text-orange-500 mb-1 text-right px-1 py-1">نام </label>
        <input v-model="name" type="text" placeholder="نام سرویس را وارد کنید" class="w-[300px] h-[50px] px-4 py-2 rounded-xl border border-gray-300
                       focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
                       bg-white shadow-sm transition text-right" required />
      </div>
    </div>
    <!-- Loading State -->
    <div v-if="isLoading" class="loading-container">
      <div class="spinner"></div>
      <p>در حال بارگذاری...</p>
    </div>

    <!-- Services Table -->
    <div v-else class="services-container">
      <div v-if="services.totalCount === 0" class="empty-state">
        <i class="fas fa-inbox"></i>
        <h3>هیچ سرویسی موجود نیست</h3>
        <p>سرویس جدیدی ایجاد کنید تا شروع کنید</p>
      </div>

      <table v-else class="services-table">
        <thead>
          <tr>
            <th>ردیف</th>
            <th>نام</th>
            <th>URL</th>
            <th>متد</th>
            <th>نوع</th>
            <th>احراز هویت</th>
            <th>فرمت احراز</th>
            <th>وضعیت</th>
            <th>اقدامات</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(service, index) in services.items" :key="service.id">
            <td class="name-cell">{{ index + 1 }}</td>
            <td class="name-cell">{{ service.name }}</td>
            <td class="url-cell">
              <code>{{ truncateUrl(service.url) }}</code>
            </td>
            <td class="method-cell">
              <span class="method-badge" :class="service.method">
                {{ service.method }}
              </span>
            </td>
            <td class="type-cell">{{ service.type }}</td>
            <td class="auth-mode-cell">
              <span v-if="!service.authenticationMode" class="text-gray-400">—</span>
              <span v-else-if="service.authenticationMode === 'Header'"
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                Header
              </span>
              <span v-else-if="service.authenticationMode === 'QueryString'"
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                Query
              </span>
            </td>
            <td class="auth-format-cell">
              <code v-if="service.authenticationFormat" class="text-xs break-all">
        {{ service.authenticationFormat }}
      </code>
              <span v-else class="text-gray-400">—</span>
            </td>
            <td class="status-cell">
              <span class="status-badge" :class="{ active: service.status, inactive: !service.status }">
                {{ service.status ? 'فعال' : 'غیرفعال' }}
              </span>
            </td>
            <td class="actions-cell">
              <button class="btn-icon btn-edit" @click="openEditModal(service)" title="ویرایش">
                <font-awesome-icon :icon="['fas', 'pen-to-square']" style="color: orange;" class="pen" />
              </button>
              <button class="btn-icon btn-delete" @click="changeStatus(service.id)" title="تغییر وضعیت">
                <font-awesome-icon :icon="['fas', 'toggle-off']" style="color: grey;" />
              </button>
              <button class="btn-icon btn-delete" @click="deleteModal(service.id)" title="حذف">
                <font-awesome-icon :icon="['fas', 'trash']" style="color: red;" />
              </button>

              <button class="btn-icon btn-delete" @click="AddStepMapping(service.id)"
                title="اضافه کردن مپ سرویس به مرحله">
                <!-- <font-awesome-icon :icon="['fas', 'faArrowLeft']" style="color: red;" /> -->
                <font-awesome-icon :icon="faExpand" style="color: orange" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <!-- Pagination Total -->
      <div class="btn-pagenumber-grey">
        <span> تعداد کل رکورد </span>
        <span>{{ services.totalCount }}</span>
      </div>

      <!-- Pagination Block -->
      <div style="display:block">
        <span class="btn-pagenumber" v-if="services.hasNextPage">
          <!--  -->
          <font-awesome-icon :icon="faArrowRight" style="color: orange;" @click="fetchNextPage" />
        </span>
        <span class="btn-pagenumber" @click="fetchNextpage" v-if="services.hasNextPage">{{ services.pageNumber + 1
        }}</span>
        <span class="btn-pagenumber-orange">{{ services.pageNumber }}</span>
        <!--  -->
        <!-- <span class="btn-totalpage">{{ aggregates.totalPages }}</span> -->
        <span class="btn-pagenumber" v-if="services.hasPreviousPage" @click="fetchPrevouisPage">
          <font-awesome-icon :icon="faArrowLeft" style="color: orange;" />
        </span>
      </div>
    </div>

    <!-- Service Modal -->
    <div v-if="showModal"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn p-4">
      <!-- @click.self="closeModal" -->
      <div class="bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 p-[2px] rounded-3xl w-full max-w-2xl">
        <div class="bg-white dark:bg-gray-900 shadow-2xl rounded-3xl w-full animate-scaleIn" style="padding:20px">

          <!-- Header -->
          <header
            class="flex flex-col sm:flex-row items-center justify-between border-b border-gray-200 pb-4 mb-6 gap-4">
            <h3
              class="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-orange-500 to-amber-600 bg-clip-text text-transparent text-center sm:text-right order-first sm:order-last">
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
                @click="saveService" :disabled="!isFormValid">
                <i class="fas fa-save"></i>
                <span class="hidden sm:inline">{{ isEditMode ? 'بروزرسانی' : 'ایجاد' }}</span>
              </button>
            </div>
          </header>

          <!-- Body -->
          <section class="space-y-5 max-h-[70vh] overflow-y-auto pr-2">
            <!-- Service Information Section -->
            <div class="space-y-5">
              <h4 class="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 pb-3 border-b border-orange-200">
                📋 اطلاعات سرویس</h4>

              <!-- Service Name -->
              <div class="space-y-2">
                <label class="block font-semibold text-gray-700 dark:text-gray-200 text-right">نام سرویس <span
                    class="text-red-500">*</span></label>
                <input v-model="formData.name" type="text" placeholder="مثال: Shahkar Service" class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700
                   focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
                   bg-white dark:bg-gray-800 dark:text-white shadow-sm transition duration-200 text-right" />
              </div>

              <div class="space-y-2">
                <label class="block font-semibold text-gray-700 dark:text-gray-200 text-right">
                  URL <span class="text-red-500">*</span>
                </label>
                <input v-model="formData.url" type="text" placeholder="https://api.example.com/endpoint" class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700
           focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
           bg-white dark:bg-gray-800 dark:text-white shadow-sm transition duration-200 text-right text-sm" />
                <p v-if="isValidFn" class="text-red-500 text-sm text-right mt-1">
                  لطفاً یک URL معتبر وارد کنید (مثال: https://api.example.com/path)
                </p>
              </div>



              <!-- Method and Type -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="space-y-2">
                  <label class="block font-semibold text-gray-700 dark:text-gray-200 text-right">متد HTTP <span
                      class="text-red-500">*</span></label>
                  <select v-model="formData.method"
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
                  <label class="block font-semibold text-gray-700 dark:text-gray-200 text-right">نوع سرویس <span
                      class="text-red-500">*</span></label>
                  <select v-model="formData.type"
                    class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700
                     focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
                     bg-white dark:bg-gray-800 dark:text-white shadow-sm transition duration-200 text-right font-medium">
                    <option value="REST">🌐 REST</option>
                    <option value="GRAPHQL">📊 GraphQL</option>
                    <option value="SOAP">📦 SOAP</option>
                  </select>
                </div>
              </div>
              <!-- Authentication Settings -->
              <div class="space-y-5 mt-6 pt-6 border-t border-orange-200 dark:border-orange-800">
                <h4
                  class="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 pb-3 border-b border-orange-200">
                  🔐 تنظیمات احراز هویت
                </h4>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <!-- Authentication Mode -->
                  <div class="space-y-2">
                    <label class="block font-semibold text-gray-700 dark:text-gray-200 text-right">
                      نوع احراز هویت
                    </label>
                    <select v-model="formData.authenticationMode" class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700
               focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
               bg-white dark:bg-gray-800 dark:text-white shadow-sm transition duration-200 text-right font-medium">
                      <option value="">بدون احراز هویت</option>
                      <option value="Header">در هدر (Header)</option>
                      <option value="QueryString">در کوئری استرینگ (Query String)</option>
                    </select>
                  </div>

                  <!-- Authentication Format / Template -->
                  <div class="space-y-2">
                    <label class="block font-semibold text-gray-700 dark:text-gray-200 text-right">
                      فرمت احراز هویت
                      <span v-if="formData.authenticationMode" class="text-red-500">*</span>
                    </label>
                    <textarea dir="rtl" v-model="formData.authenticationFormat" type="text"
                      placeholder="مثال: Bearer {token}   یا   X-API-Key: {key}"
                      :disabled="!formData.authenticationMode" class="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700
               focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
               bg-white dark:bg-gray-800 dark:text-white shadow-sm transition duration-200 text-right
               disabled:opacity-50 disabled:cursor-not-allowed" />
                    <p v-if="formData.authenticationMode && !formData.authenticationFormat?.trim()"
                      class="text-red-500 text-xs text-right mt-1">
                      این فیلد اجباری است
                    </p>
                  </div>
                </div>

                <!-- Optional helper text -->
                <div class="text-sm text-gray-600 dark:text-gray-400 bg-orange-50 dark:bg-orange-950/30 p-3 rounded-xl">
                  <strong>نمونه‌ها:</strong><br>
                  • Header → <code>Bearer {token}</code><br>
                  • Header → <code>ApiKey {api_key}</code><br>
                  • Query → <code>access_token={token}</code>
                </div>
              </div>
              <!-- Status -->
              <div
                class="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-4 flex items-center justify-between border-2 border-orange-100 dark:border-orange-800">
                <div class="flex items-center gap-3">
                  <input v-model="formData.status" type="checkbox" id="statusCheckbox"
                    class="w-6 h-6 rounded-lg border-2 border-orange-400 accent-orange-500 cursor-pointer" />
                  <label for="statusCheckbox"
                    class="font-semibold text-gray-700 dark:text-gray-200 cursor-pointer">وضعیت سرویس</label>
                </div>
                <span :class="formData.status ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'"
                  class="font-bold text-sm">
                  {{ formData.status ? '✓ فعال' : '✗ غیرفعال' }}
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
    <div v-if="showModalStepMapping"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn p-4 overflow-y-auto">
      <!-- @click.self="closeModalStepModal" -->
      <div
        class="bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 p-[2px] rounded-3xl w-full max-w-2xl my-auto">
        <div class="bg-white dark:bg-gray-900 shadow-2xl rounded-3xl w-full animate-scaleIn overflow-y-auto max-h-[90vh]" style="padding:20px">
          <!-- Header -->
          <header
            class="flex flex-col sm:flex-row items-center justify-between border-b border-gray-200 pb-4 mb-6 gap-4">
            <h3
              class="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-orange-500 to-amber-600 bg-clip-text text-transparent text-center sm:text-right order-first sm:order-last">
              {{ isEditMode ? 'مپ ویرایش سرویس' : ' مپ سرویس جدید' }}
            </h3>
          </header>
          <div class="space-y-6" :key="mappingUpdateKey">
            <div class="flex items-center justify-between">
              <h4 class="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 pb-3 border-b border-orange-200">
                📋
                نگاشت سرویس
              </h4>
            </div>

            <!-- Direction Selector -->
            <div class="flex gap-4 items-center justify-between bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
              <div class="flex gap-2">
                <button
                  @click="selectedDirection = 1"
                  :class="selectedDirection === 1
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'"
                  class="px-4 py-2 rounded-lg font-semibold transition">
                  <i class="fas fa-arrow-down mr-2"></i> نگاشت ورودی (Input)
                </button>
                <button
                  @click="selectedDirection = 2"
                  :class="selectedDirection === 2
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'"
                  class="px-4 py-2 rounded-lg font-semibold transition">
                  <i class="fas fa-arrow-up mr-2"></i> نگاشت خروجی (Output)
                </button>
              </div>
              <button type="button" @click="addNewMapping"
                class="px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl shadow hover:from-green-600 hover:to-emerald-700 transition flex items-center gap-2 text-sm font-medium">
                <i class="fas fa-plus"></i>
                افزودن نگاشت جدید
              </button>
            </div>

            <!-- No mappings yet -->
            <div v-if="stepMappings.length === 0" class="text-center py-10 text-gray-500 dark:text-gray-400">
              هنوز نگاشتی اضافه نشده است. روی "افزودن نگاشت جدید" کلیک کنید.
            </div>

            <!-- Input Mappings Section -->
            <div v-if="stepMappings.filter(m => m.direction === 1).length > 0">
              <h5 class="text-md font-bold text-blue-700 dark:text-blue-400 mb-4 flex items-center gap-2">
                <i class="fas fa-arrow-down text-blue-500"></i> نگاشت‌های ورودی (Input)
              </h5>
              <div class="space-y-4">
                <div v-for="(mapping, index) in stepMappings.filter(m => m.direction === 1)" :key="mapping.__key"
                  class="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-xl border-2 border-blue-200 dark:border-blue-700 relative">

                  <!-- Remove button (top right) -->
                  <button @click="removeMapping(stepMappings.indexOf(mapping))"
                    class="absolute top-3 right-3 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-600 transition text-lg hover:scale-110"
                    title="حذف این نگاشت">
                    <i class="fas fa-trash-alt"></i>
                  </button>

                  <!-- Badge for new mapping -->
                  <div v-if="!mapping.id"
                    class="absolute top-3 right-12 px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">
                    جدید
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 text-right mb-2">
                    Parent Service ID: <strong>{{ mapping.parentId || '—' }}</strong>
                  </div>
                  <div class="space-y-3 pr-8">
                    <!-- Name -->
                    <div class="space-y-1">
                      <label class="block font-semibold text-gray-700 dark:text-gray-200 text-right text-sm">
                        نام <span class="text-red-500">*</span>
                      </label>
                      <input v-model="mapping.name" type="text" placeholder="مثال: User ID"
                        class="w-full px-3 py-2 rounded-lg border-2 border-blue-200 dark:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 dark:text-white shadow-sm transition duration-200 text-right text-sm" />
                    </div>

                    <!-- Service + Type -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div class="space-y-1">
                        <label class="block font-semibold text-gray-700 dark:text-gray-200 text-right text-sm">
                          سرویس <span class="text-red-500">*</span>
                        </label>
                        <select v-if="isEditMode" disabled v-model="mapping.serviceId"
                          class="w-full px-3 py-2 rounded-lg border-2 border-blue-200 dark:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 dark:text-white shadow-sm transition duration-200 text-right text-sm font-medium">
                          <option value="">انتخاب کنید</option>
                          <option v-for="service in services.items" :key="service.id" :value="service.id">
                            {{ service.name }}
                          </option>
                        </select>

                        <select v-else-if="!isEditMode" v-model="mapping.serviceId"
                          class="w-full px-3 py-2 rounded-lg border-2 border-blue-200 dark:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 dark:text-white shadow-sm transition duration-200 text-right text-sm font-medium">
                          <option value="">انتخاب کنید</option>
                          <option v-for="service in services.items" :key="service.id" :value="service.id">
                            {{ service.name }}
                          </option>
                        </select>
                      </div>

                      <div class="space-y-1">
                        <label class="block font-semibold text-gray-700 dark:text-gray-200 text-right text-sm">
                          نوع <span class="text-red-500">*</span>
                        </label>
                        <select v-model="mapping.type"
                          class="w-full px-3 py-2 rounded-lg border-2 border-blue-200 dark:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 dark:text-white shadow-sm transition duration-200 text-right text-sm font-medium">
                          <option value="">انتخاب کنید</option>
                          <option value="String">رشته (String)</option>
                          <option value="Integer">عدد صحیح (Integer)</option>
                          <option value="Double">عدد اعشاری (Double)</option>
                          <option value="Boolean">بولی (Boolean)</option>
                          <option value="JSON">JSON</option>
                          <option value="Array">آرایه (Array)</option>
                          <option value="Object">شی (Object)</option>
                          <option value="Date">تاریخ (Date)</option>
                          <option value="DateTime">تاریخ و زمان (DateTime)</option>
                          <option value="File">فایل (File)</option>
                        </select>
                      </div>
                    </div>

                    <!-- Description -->
                    <div class="space-y-1">
                      <label class="block font-semibold text-gray-700 dark:text-gray-200 text-right text-sm">
                        توضیحات
                      </label>
                      <textarea v-model="mapping.description" rows="2"
                        class="w-full px-3 py-2 rounded-lg border-2 border-blue-200 dark:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 dark:text-white shadow-sm transition duration-200 text-right text-sm resize-none" />
                    </div>

                    <!-- Delete Button -->
                    <div class="pt-3 border-t border-blue-200 dark:border-blue-700">
                      <button @click="removeMapping(stepMappings.indexOf(mapping))"
                        class="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition duration-200 flex items-center justify-center gap-2">
                        <i class="fas fa-trash-alt"></i>
                        حذف این نگاشت
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Output Mappings Section -->
            <div v-if="stepMappings.filter(m => m.direction === 2).length > 0">
              <h5 class="text-md font-bold text-green-700 dark:text-green-400 mb-4 flex items-center gap-2">
                <i class="fas fa-arrow-up text-green-500"></i> نگاشت‌های خروجی (Output)
              </h5>
              <div class="space-y-4">
                <div v-for="(mapping, index) in stepMappings.filter(m => m.direction === 2)" :key="mapping.__key"
                  class="bg-green-50 dark:bg-green-900/20 p-5 rounded-xl border-2 border-green-200 dark:border-green-700 relative">

                  <!-- Remove button (top right) -->
                  <button @click="removeMapping(stepMappings.indexOf(mapping))"
                    class="absolute top-3 right-3 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-600 transition text-lg hover:scale-110"
                    title="حذف این نگاشت">
                    <i class="fas fa-trash-alt"></i>
                  </button>

                  <!-- Badge for new mapping -->
                  <div v-if="!mapping.id"
                    class="absolute top-3 right-12 px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">
                    جدید
                  </div>

                  <div class="space-y-3 pr-8">
                    <!-- Name -->
                    <div class="space-y-1">
                      <label class="block font-semibold text-gray-700 dark:text-gray-200 text-right text-sm">
                        نام <span class="text-red-500">*</span>
                      </label>
                      <input v-model="mapping.name" type="text" placeholder="مثال: Response Data"
                        class="w-full px-3 py-2 rounded-lg border-2 border-green-200 dark:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 dark:text-white shadow-sm transition duration-200 text-right text-sm" />
                    </div>

                    <!-- Service + Type -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div class="space-y-1">
                        <label class="block font-semibold text-gray-700 dark:text-gray-200 text-right text-sm">
                          سرویس <span class="text-red-500">*</span>
                        </label>
                        <select v-model="mapping.serviceId"
                          class="w-full px-3 py-2 rounded-lg border-2 border-green-200 dark:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 dark:text-white shadow-sm transition duration-200 text-right text-sm font-medium">
                          <option value="">انتخاب کنید</option>
                          <option v-for="service in services.items" :key="service.id" :value="service.id">
                            {{ service.name }}
                          </option>
                        </select>
                      </div>

                      <div class="space-y-1">
                        <label class="block font-semibold text-gray-700 dark:text-gray-200 text-right text-sm">
                          نوع <span class="text-red-500">*</span>
                        </label>
                        <select v-model="mapping.type"
                          class="w-full px-3 py-2 rounded-lg border-2 border-green-200 dark:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 dark:text-white shadow-sm transition duration-200 text-right text-sm font-medium">
                          <option value="">انتخاب کنید</option>
                          <option value="String">رشته (String)</option>
                          <option value="Int">عدد صحیح (Integer)</option>
                          <option value="Double">عدد اعشاری (Double)</option>
                          <option value="Boolean">بولی (Boolean)</option>
                          <option value="JSON">JSON</option>
                          <option value="Array">آرایه (Array)</option>
                          <option value="Object">شی (Object)</option>
                          <option value="Date">تاریخ (Date)</option>
                          <option value="DateTime">تاریخ و زمان (DateTime)</option>
                          <option value="File">فایل (File)</option>
                        </select>
                      </div>
                    </div>

                    <!-- Description -->
                    <div class="space-y-1">
                      <label class="block font-semibold text-gray-700 dark:text-gray-200 text-right text-sm">
                        توضیحات
                      </label>
                      <textarea v-model="mapping.description" rows="2"
                        class="w-full px-3 py-2 rounded-lg border-2 border-green-200 dark:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 dark:text-white shadow-sm transition duration-200 text-right text-sm resize-none" />
                    </div>

                    <!-- Delete Button -->
                    <div class="pt-3 border-t border-green-200 dark:border-green-700">
                      <button @click="removeMapping(stepMappings.indexOf(mapping))"
                        class="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition duration-200 flex items-center justify-center gap-2">
                        <i class="fas fa-trash-alt"></i>
                        حذف این نگاشت
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer Buttons -->
            <div class="flex gap-2 w-full sm:w-auto">
              <button
                class="flex-1 sm:flex-none px-4 sm:px-6 py-3 bg-gradient-to-r from-gray-400 via-gray-500 to-gray-600 text-white font-semibold rounded-xl shadow-lg hover:from-gray-500 hover:via-gray-600 hover:to-gray-700 transition duration-300 ease-in-out flex items-center justify-center gap-2"
                @click="closeModalStepModal">
                <i class="fas fa-times"></i>
                <span class="hidden sm:inline">لغو</span>
              </button>
              <button
                class="flex-1 sm:flex-none px-4 sm:px-6 py-3 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:from-orange-500 hover:via-orange-600 hover:to-orange-700 transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                @click="saveStepService" :disabled="!stepMappings.length > 0">
                <i class="fas fa-save"></i>
                <span class="hidden sm:inline">{{ isEditMode ? 'بروزرسانی' : 'ایجاد' }}</span>
              </button>
            </div>
          </div>


          <!-- formDataStepMapping -->
        </div>
      </div>
    </div>
    <!-- Notifications -->
    <notifications />
    <ConfirmModal :visible="showConfirm" message="آیا از پاک کردن گره مطمئن هستید؟" @confirm="onConfirmDelete"
      @cancel="onCancelDelete" />
  </div>
</template>

<script setup>
import { faCamera, faSun, faMoon, faPlus, faBars, faArrowLeft, faArrowRight, faExpand, faBoxOpen } from '@fortawesome/free-solid-svg-icons'

import { ref, computed, onMounted, toRaw, nextTick } from 'vue'
import { notify } from '@kyvg/vue3-notification'
import serviceAggregatorClient from '@/utils/service-aggregator-client'
import LogoutButton from '@/components/LogoutButton.vue'
import ConfirmModal from '@/components/modals/ConfirmModal.vue'

const services = ref({
  hasNextPage: true,
  hasPreviousPage: false,
  items: [],
  pageNumber: 0,
  totalCount: 0,
  totalPages: 0
})

const mappingUpdateKey = ref(0)

const name = ref("");
const url = ref("");
const status = ref(null);
const isLoading = ref(false)
const showModal = ref(false)
const showModalStepMapping = ref(false)
const resetKey = ref(0)
const selectedDirection = ref(1) // 1 for input, 2 for output

const isEditMode = ref(false)
const isEditModeStepMapping = ref(false)
const selectedId = ref("");
const showConfirm = ref(false)

const formData = ref({
  id: null,
  name: '',
  url: '',
  method: 'GET',
  type: 'REST',
  status: true,
  authenticationMode: "",
  authenticationFormat: "",
})
const formDataStepMapping = ref({
  id: null,
  name: '',
  serviceId: '',
  type: '',
  description: '',
  direction: 1,
})
const formDataStepMappingEdit = ref([])
const isStepMappingEditMode = ref(false)

const isStepMappingFormValid = computed(() => {
  return formDataStepMapping.value.name && formDataStepMapping.value.type && formDataStepMapping.value.direction;
  //&& formDataStepMapping.value.serviceId
})

const isFormValid = computed(() => {
  return (
    formData.value.name?.trim() &&
    formData.value.method &&
    formData.value.type
  );
})

const isUrlOrPathValid = computed(() => {
  const input = formData.value.url?.trim();
  if (!input) return false;

  if (input.startsWith('/')) {
    // Simple path check
    return /^\/[-a-zA-Z0-9@:%_+.~#?&/=]*$/.test(input);
  }

  // Full URL check
  return urlRegex.test(input);  // use the robust one
});


// Add this right before your isUrlValid computed
const urlRegex = /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u00a1-\uffff][a-z0-9\u00a1-\uffff_-]{0,62})?[a-z0-9\u00a1-\uffff]\.)+(?:[a-z\u00a1-\uffff]{2,}\.?))(?::\d{2,5})?(?:[/?#]\S*)?$/i;

const isUrlValid = computed(() => {
  const input = formData.value.url?.trim()
  if (!input) return false

  const domainOnlyRegex =
    /^(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d{1,5})?(?:\/[^\s]*)?$/i

  const fullDomainUrlRegex =
    /^(https?:\/\/)(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d{1,5})?(?:\/[^\s]*)?$/i

  const ipUrlRegex =
    /^(https?:\/\/)?(?:\d{1,3}\.){3}\d{1,3}(?::\d{1,5})?(?:\/[^\s]*)?$/

  return (
    domainOnlyRegex.test(input) ||
    fullDomainUrlRegex.test(input) ||
    ipUrlRegex.test(input)
  )
});



const truncateUrl = (url) => {
  if (!url) return ''
  return url.length > 50 ? url.slice(0, 47) + '...' : url
}
async function fetchNextpage() {
  var data = {
    PageIndex: services.value.pageNumber + 1,
    PageSize: 10,
  }
  var record = await serviceAggregatorClient.getServicesWithParams(data);
  services.value = record;
}

async function fetchPrevouisPage() {
  var data = {
    PageIndex: services.value.pageNumber - 1,
    PageSize: 10,
  }
  var record = await serviceAggregatorClient.getServicesWithParams(data);
  services.value = record;
}

async function fetchNextPage() {
  var data = {
    PageIndex: services.value.pageNumber + 1,
    PageSize: 10,
  }
  var record = await serviceAggregatorClient.getServicesWithParams(data);
  services.value = record;

}

async function resetSearch() {
  url.value = '';
  name.value = '';
  status.value = null;
  var data = {
    PageIndex: 1,
    PageSize: 10,
  }
  resetKey.value++
  var record = await serviceAggregatorClient.getServicesWithParams(data);
  services.value = record;

}
async function SearchAgg(params) {
  // if (name.value == "") {
  //   notify({
  //     title: 'نام را وارد کنید',
  //     text: 'نام را وارد کنید',
  //     type: 'error',
  //   })
  // }
  // if (url.value == "") {
  //   url.value = "";
  // }
  // if (status.value === null || status.value === undefined) {
  //   status.value = true;
  // }
  var data = {
    PageIndex: services.value.pageNumber,
    PageSize: 10,
    Name: name.value,
    URL: url.value,
    Status: status.value
  }
  var record = await serviceAggregatorClient.getServicesWithParamsWithSearch(data);
  services.value = record;
}

const deleteModal = async (id) => {
  showConfirm.value = true;
  selectedId.value = id;

}

const AddStepMapping = async (id) => {
  // Implement your logic to add step mapping here
  //isLoading.value = true;
  debugger
  var record = await serviceAggregatorClient.getServicesById(id);

  // Combine inputs and outputs
  const allMappings = [
    ...(record.inputs || []).map(m => ({ ...m, __key: m.id ?? new Date() + Math.random().toString() })),
    ...(record.outputs || []).map(m => ({ ...m, __key: m.id ?? new Date() + Math.random().toString() }))
  ]

  const mappedWithParent = allMappings.map(m => ({
    ...m,
    parentId: record.id   // ← this is the key change
  }));


  if (record.id && allMappings.length > 0) {
    isEditMode.value = true;
    // Populate stepMappings with both inputs and outputs
    stepMappings.value = mappedWithParent
    originalMappings.value = mappedWithParent.map(m => ({ ...m })) // track originals
  } else {
    isEditMode.value = false;
    stepMappings.value = [{ ...getEmptyMapping(), parentId: record.id }]
    originalMappings.value = [] // no originals in add mode
  }
  showModalStepMapping.value = true;
  formData.value.id = record.id;
  formData.value.name = record.name;
  formData.value.url = record.url;
  formData.value.method = record.method;
  formData.value.type = record.type;
  formData.value.status = record.status;
  formData.value.authenticationMode = record.authenticationMode || "";
  formData.value.authenticationFormat = record.authenticationFormat || "";
}


// Instead of one object → array of mappings
const stepMappings = ref([])           // all mappings user is creating/editing
const originalMappings = ref([])       // track original mappings to detect changes

// When opening modal in "add" mode → start with one empty item
const openAddModal = () => {
  //stepMappings.value = [getEmptyMapping()]
  //originalMappings.value = []          // no originals in add mode
  //showModalStepMapping.value = true
  isEditMode.value = false
  resetForm()
  showModal.value = true
}

// When opening in edit mode → load existing ones (example)
const openEditModal = (existingMappings) => {
  stepMappings.value = JSON.parse(JSON.stringify(existingMappings))//[...existingMappings].map(m => ({ ...m })) // deep copy
  originalMappings.value = JSON.parse(JSON.stringify(existingMappings)) // keep track of originals
  //showModalStepMapping.value = true
  isEditMode.value = true
  formData.value = JSON.parse(JSON.stringify(existingMappings))
  showModal.value = true
}


const getEmptyMapping = () => ({
  __key: new Date() + Math.random().toString(),
  name: '',
  serviceId: null,
  type: '',
  direction: 1,
  description: "",
  parentId: null,   // 1 = input, 2 = output
  // ... add other fields if needed (id, status, etc.)
})

const addNewMapping = async () => {
  stepMappings.value.push({ ...getEmptyMapping(), direction: selectedDirection.value })
  mappingUpdateKey.value++
  await nextTick()
}

const removeMapping = async (index) => {
  if (confirm('آیا مطمئن هستید که این نگاشت را حذف کنید؟')) {
    const removedMapping = stepMappings.value[index]
    // If it has an ID, it exists on server and will be deleted during save
    stepMappings.value.splice(index, 1)
    await serviceAggregatorClient.deleteAggregateMapping(removedMapping.id)
  }
}

async function onConfirmDelete() {
  showConfirm.value = false
  var response = await serviceAggregatorClient.deleteService(selectedId.value)
  await loadServices();
  close() // Close your main modal if you want
}

function onCancelDelete() {
  showConfirm.value = false
}
function close() {
  store.clearSelected()
}

const loadServices = async () => {
  isLoading.value = true
  try {
    const data = await serviceAggregatorClient.getServicesWithPagination()
    services.value = data ? data : [];
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

const resetStepMappingForm = () => {
  formDataStepMapping.value = {
    id: null,
    name: '',
    serviceId: '',
    type: '',
    description: '',
    direction: 1,
  }
}
const closeModalStepModal = () => {
  showModalStepMapping.value = false
  selectedDirection.value = 1
  resetStepMappingForm()
}
const closeModal = () => {
  showModal.value = false
  resetForm()
}

const isValidFn = () => {
  return !isUrlValid && formData.url?.trim()
}
const saveStepService = async () => {
  const invalid = stepMappings.value.some(m =>
    !m.name?.trim() || !m.serviceId || !m.type?.trim() || m.direction == null
  )

  if (invalid) {
    notify({
      title: 'خطا',
      text: 'لطفاً تمام فیلدهای اجباری را پر کنید',
      type: 'error'
    })
    return
  }

  try {
    const mappingsToSave = toRaw(stepMappings.value)

    // Separate mappings into: new (no ID), updated (has ID and changed), deleted (was in original but not in current)
    const newMappings = mappingsToSave.filter(m => !m.id)
    const updatedMappings = mappingsToSave.filter(m => m.id && originalMappings.value.some(orig =>
      orig.id === m.id && JSON.stringify(orig) !== JSON.stringify(m)
    ))
    const deletedMappings = originalMappings.value.filter(orig =>
      !mappingsToSave.some(m => m.id === orig.id)
    )

    // Add new mappings
    if (newMappings.length > 0) {
      await serviceAggregatorClient.addServiceMapping(newMappings)
      notify({
        title: 'موفق',
        text: `${newMappings.length} نگاشت جدید اضافه شد`,
        type: 'success'
      })
    }

    // Update modified mappings
    if (updatedMappings.length > 0) {
      for (const mapping of updatedMappings) {
        await serviceAggregatorClient.updateServiceMapping([mapping])
      }
      notify({
        title: 'موفق',
        text: `${updatedMappings.length} نگاشت بروزرسانی شد`,
        type: 'success'
      })
    }

    // Delete removed mappings
    if (deletedMappings.length > 0) {
      for (const mapping of deletedMappings) {
        try {
          await serviceAggregatorClient.deleteServiceMapping(mapping.id)
        } catch (err) {
          console.error('Error deleting mapping:', err)
          notify({
            title: 'اخطار',
            text: `خطا در حذف نگاشت ${mapping.name}`,
            type: 'warning'
          })
        }
      }
      notify({
        title: 'موفق',
        text: `${deletedMappings.length} نگاشت حذف شد`,
        type: 'success'
      })
    }

    // If nothing was added/updated/deleted, just close
    if (newMappings.length === 0 && updatedMappings.length === 0 && deletedMappings.length === 0) {
      notify({
        title: 'توجه',
        text: 'هیچ تغییری انجام نشد',
        type: 'info'
      })
    }

    closeModalStepModal()
  } catch (err) {
    notify({
      title: 'خطا',
      text: 'خطا در ذخیره نگاشت‌ها',
      type: 'error'
    })
    console.error(err)
  }
}
// if (!isStepMappingFormValid.value) {
//   notify({
//     title: 'خطا',
//     text: 'تمام فیلدهای الزامی را پر کنید',
//     type: 'error',
//   })
//   return
// }

// try {
//   if (isEditMode.value) {
//     await serviceAggregatorClient.updateServiceMapping(formDataStepMapping.value)
//     notify({
//       title: 'موفقیت',
//       text: 'سرویس بروزرسانی شد',
//       type: 'success',
//     })
//   } else {
//     await serviceAggregatorClient.addServiceMapping({
//       name: formDataStepMapping.value.name,
//       serviceId: formDataStepMapping.value.serviceId,
//       type: formData.value.type,
//       description: formDataStepMapping.value.description,
//       direction: formDataStepMapping.value.direction
//     })
//     notify({
//       title: 'موفقیت',
//       text: 'سرویس ایجاد شد',
//       type: 'success',
//     })
//   }
//   closeModalStepModal()
//   await loadServices()
// } catch (error) {
//   console.error('Error saving service:', error)
//   notify({
//     title: 'خطا',
//     text: isEditMode.value ? 'خطا در بروزرسانی سرویس' : 'خطا در ایجاد سرویس',
//     type: 'error',
//   })
// }
const saveService = async () => {
  if (!isUrlValid.value) {
    notify({
      title: 'خطا',
      text: ',URL را بدرستی پر کنید',
      type: 'error',
    })
    return
  }
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
      if (!isUrlValid.value) {
        notify({
          title: 'خطا',
          text: 'URL وارد شده اشتباه میباشد',
          type: 'error',
        })
      }
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

const changeStatus = async (serviceId) => {
  if (!confirm('آیا مطمئن هستید که می‌خواهید این سرویس را تغییر وضعیت دهید ؟')) {
    return
  }

  try {
    // Note: Backend might not have a delete endpoint, so we'll use status = false
    const serviceToDelete = services.value.items.find(s => s.id === serviceId)
    if (serviceToDelete) {
      await serviceAggregatorClient.updateService({
        ...serviceToDelete,
        status: false,
      })
      notify({
        title: 'موفقیت',
        text: 'سرویس تغییر وضعیت داده شد',
        type: 'success',
      })
      await loadServices()
    }
  } catch (error) {
    console.error('Error deleting service:', error)
    notify({
      title: 'خطا',
      text: 'خطا در تغییر وضعیت سرویس',
      type: 'error',
    })
  }
}

onMounted(() => {
  loadServices()
})
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

.search_holder {
  display: flex;
  flex-flow: row-reverse;
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

.services-page {
  min-height: 100vh;
  width: 100%;
  padding: 30px;
  margin: 0 auto;
  display: flex;
  flex-flow: column;
  box-sizing: border-box;
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
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
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
  font-size: 13px;
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
  background-color: orange;
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
  gap: 3px;
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

  .pen {
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

.pen {
  color: orange !important;
  transition: color 0.3s ease;
}

.pen:hover {
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
    margin-top: 28px;
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

  .header-actions>* {
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
