<!-- src/components/modals/ServiceModal.vue -->
<template>
  <div v-if="store.showModal"
    class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn"
    @click.self="close">
    <div class="bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 p-[2px] rounded-3xl">

      <div class="bg-white dark:bg-gray-900 shadow-2xl rounded-3xl w-full max-w-2xl animate-scaleIn "
        style="width:90vw; padding:17px">

        <!-- Header -->
        <header class="flex items-center justify-between border-b pb-3 mb-4">

          <div class="flex gap-2">
            <button
              class="px-6 py-3 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:from-orange-500 hover:via-orange-600 hover:to-orange-700 transition duration-300 ease-in-out"
              @click="close">
              <font-awesome-icon :icon="faArrowUp" style="color: white;" />
              <span class="header-btn-text">خروج</span>
            </button>
            <button v-if="isEdit"
              class="px-6 py-3 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:from-orange-500 hover:via-orange-600 hover:to-orange-700 transition duration-300 ease-in-out"
              @click="save">
              <font-awesome-icon :icon="faSave" style="color: white;" />
              <span class="header-btn-text">ذخیره</span>
            </button>
            <button v-if="isEdit && node && node.data && node.data.serviceId"
              class="px-6 py-3 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:from-orange-500 hover:via-orange-600 hover:to-orange-700 transition duration-300 ease-in-out"
              @click="askDelete">
              <font-awesome-icon :icon="faTrash" style="color: white;" />
              <span class="header-btn-text">پاک کردن</span>
            </button>
            <button v-if="isView"
              class="px-6 py-3 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:from-orange-500 hover:via-orange-600 hover:to-orange-700 transition duration-300 ease-in-out"
              @click="copyJson">کپی JSON</button>
          </div>
          <h3 class="text-xl font-bold text-gray-800 dark:text-gray-100 p-3 responsive-modal-header">{{ title }}</h3>

        </header>

        <!-- Body -->
        <section class="space-y-4 max-h-[60vh] overflow-y-auto pr-2">

          <!-- Combined Node -->
          <div v-if="isCombined" class="space-y-4">
            <h4 class="text-lg font-semibold text-gray-700 dark:text-gray-200 ">Schema ترکیب شده</h4>

            <pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded-xl text-sm whitespace-pre-wrap">
{{ JSON.stringify(nodeData.combinedSchema, null, 2) }}
          </pre>

            <hr class="border-gray-300 dark:border-gray-700" />

            <h4 class="text-lg font-semibold text-gray-700 dark:text-gray-200">ویرایش نام</h4>

            <input v-model="localLabel" class="w-full px-4 py-2 rounded-lg bg-gray-800 text-gray-200 border border-gray-700
         focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Label" />

            <button
              class="px-6 py-3 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:from-orange-500 hover:via-orange-600 hover:to-orange-700 transition duration-300 ease-in-out"
              @click="updateLabel">بروزرسانی Label</button>
          </div>

          <!-- Normal Node -->
          <div v-else class="space-y-4">

            <div>
              <label class="block font-medium text-gray-500 mb-1 text-right px-1 py-1 text-xl">عنوان</label>
              <input v-model="local.label" class="w-full px-4 py-2 rounded-xl border border-gray-300
         focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
         text-xl
         bg-white shadow-sm transition text-right" />
            </div>

            <div>
              <label class="block font-medium text-gray-500 mb-1 text-right px-1 py-1 text-xl"> نام سرویس</label>
              <input v-model="local.serviceName" placeholder="سرویس" class="w-full px-4 py-2 rounded-xl border text-right text-xl border-gray-300
         focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
         bg-white shadow-sm transition" />
            </div>

            <div>
              <label class="block font-medium text-gray-500 mb-1 text-right px-1 py-1 text-xl">URL</label>
              <input v-model="local.url" placeholder="https://api.example.com/endpoint" class="w-full px-4 py-2 rounded-xl border text-right text-xl border-gray-300
         focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
         bg-white shadow-sm transition" />
            </div>

            <div>
              <label class="block font-medium text-gray-500 mb-1 text-right px-1 py-1 text-xl">Method</label>
              <select v-model="local.method" class="w-full px-4 py-2 rounded-xl border text-right text-xl border-gray-300
         focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
         bg-white shadow-sm transition">
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>

            <div>
              <label class="block font-medium text-gray-500 mb-1 text-right px-1 py-1 text-xl">Type</label>
              <select v-model="local.type" class="w-full px-4 py-2 rounded-xl border text-right text-xl border-gray-300
         focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
         bg-white shadow-sm transition">
                <option value="REST">REST</option>
                <option value="SOAP">SOAP</option>
                <option value="GRAPHQL">GRAPHQL</option>
              </select>
            </div>

            <h4 class="text-lg font-semibold text-gray-400 dark:text-gray-200">جزییات فیلدها</h4>

            <div class="space-y-3">
              <div v-for="(f, idx) in local.fields" :key="f.idx"
                class="field-row-mobile flex gap-2 items-center bg-gray-50 dark:bg-gray-800 p-2 rounded-xl">
                <input v-model="f.label" placeholder="label" class="w-full px-4 py-2 rounded-xl border border-gray-300
         focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
         bg-white shadow-sm transition" />
                <input v-model="f.key" placeholder="key" class="w-full px-4 py-2 rounded-xl border border-gray-300
         focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
         bg-white shadow-sm transition" />

                <select v-model="f.type"
                  class="input-sm w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500">
                  <option value="string">string</option>
                  <option value="number">number</option>
                  <option value="boolean">boolean</option>
                  <option value="text">text</option>
                </select>

                <input v-model="f.defaultValue" placeholder="default" class="input-sm w-full px-4 py-2 rounded-xl border border-gray-300
                                                                          focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                                                                          bg-white shadow-sm transition" />

                <button
                  class="px-6 py-3 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:from-orange-500 hover:via-orange-600 hover:to-orange-700 transition duration-300 ease-in-out"
                  @click="removeField(idx)">
                  <font-awesome-icon :icon="['fas', 'trash']"
                    style="color: var(--color-white-400); margin-top:4px;font-size:larger" />
                  <!-- پاک کردن -->
                </button>
              </div>
            </div>

            <button
              class="px-6 py-3 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:from-orange-500 hover:via-orange-600 hover:to-orange-700 transition duration-300 ease-in-out"
              @click="addField">
              <font-awesome-icon :icon="['fas', 'plus']" style="color: var(--color-white-300); font-size:larger" />
              <span class="responsive-btn-text text-white-300">
                اضافه کردن فیلد
              </span>
            </button>

          </div>

        </section>
        <ConfirmModal :visible="showConfirm" message="آیا از پاک کردن گره مطمئن هستید؟" @confirm="onConfirmDelete"
          @cancel="onCancelDelete" />
      </div>
    </div>
  </div>
</template>


<script setup>
import { reactive, computed, ref } from 'vue'
import { useFlowStore } from '../../stores/flowStore'
import { faTrash, faSave, faArrowUp } from '@fortawesome/free-solid-svg-icons'
import ConfirmModal from './ConfirmModal.vue'

const store = useFlowStore()
const showConfirm = ref(false)
// derive selected node
const selectedId = computed(() => store.selectedNode)
const node = computed(() => store.nodes.find((n) => n.id === selectedId.value) || null)

const isCombined = computed(() => node.value && node.value.type === 'combinedServiceNode')
const isView = computed(() => store.modalMode === 'view')
const isEdit = computed(() => {
  const mode = store.modalMode
  return mode === 'edit' || (mode === 'add' && node.value)
})

const nodeData = computed(() => {
  if (!node.value) return null
  return node.value.data
})

const title = computed(() => {
  if (!node.value || !nodeData.value) return 'اضافه کردن سرویس'
  const label = nodeData.value.label || nodeData.value.stepName || 'سرویس'
  return isCombined.value ? ` ترکیب سرویس: ${label}` : ` ویرایش: ${label}`
})

// local copy for edits - always initialize with defaults first
const local = reactive({
  label: '',
  serviceName: '',
  url: '',
  method: 'GET',
  type: 'REST',
  fields: [],
})

const localLabel = reactive({ value: nodeData.value ? nodeData.value.label : '' })

/* Watch for node changes to refresh local copy */
import { watch } from 'vue'
import { notify } from '@kyvg/vue3-notification'
watch(
  node,
  (n) => {
    if (n && n.data) {
      local.label = n.data.label || ''
      local.serviceName = n.data.serviceName || ''
      local.url = n.data.url || ''
      local.method = n.data.method || 'GET'
      local.type = n.data.type || 'REST'
      local.fields = JSON.parse(JSON.stringify(n.data.fields || []))
      localLabel.value = n.data.label || ''
    } else {
      local.label = ''
      local.serviceName = ''
      local.url = ''
      local.method = 'GET'
      local.type = 'REST'
      local.fields = []
      localLabel.value = ''
    }
  },
  { immediate: true },
)

/**
 * Add a field to the service (local only, no API call)
 */
function addField() {
  const newKey = `f_${Date.now().toString(36)}_${Math.floor(Math.random() * 1000)}`
  local.fields.push({ key: newKey, label: 'newField', type: 'string', defaultValue: '' })
}

function removeField(idx) {
  local.fields.splice(idx, 1)
}

/**
 * Save the service
 * - Edit mode: if serviceId exists → update-service; if not → create-service then update step locally
 * - Add mode: create-service then update step locally (no extra update-service call)
 */
async function save() {
  if (!node.value || !node.value.data) return
  const id = node.value.id
  const nodeData = node.value.data

  if (isEdit.value) {
    if (nodeData.serviceId) {
      // update-service
      await store.updateNode(id, {
        data: {
          label: local.label,
          serviceName: local.serviceName,
          url: local.url || nodeData.url || '',
          method: local.method || nodeData.method || 'GET',
          type: local.type || nodeData.type || 'REST',
          status: nodeData.status !== undefined ? nodeData.status : true,
          fields: local.fields,
        },
      })
      notify({ title: 'ذخیره شد', text: 'سرویس با موفقیت بروزرسانی شد', type: 'success' })
    } else {
      // create-service then update step locally (skip service sync to avoid extra update-service)
      await store.createServiceForNode(id, {
        serviceName: local.serviceName,
        name: local.serviceName,
        url: local.url || '',
        method: local.method || 'GET',
        type: local.type || 'REST',
      })
      await store.updateNode(
        id,
        {
          data: {
            label: local.label,
            serviceName: local.serviceName,
            url: local.url || '',
            method: local.method || 'GET',
            type: local.type || 'REST',
            status: nodeData.status !== undefined ? nodeData.status : true,
            fields: local.fields,
          },
        },
        { skipServiceSync: true },
      )
      notify({ title: 'ذخیره شد', text: 'سرویس با موفقیت ایجاد شد', type: 'success' })
    }
  } else {
    // add mode: always create-service then update step locally
    await store.createServiceForNode(id, {
      serviceName: local.serviceName,
      name: local.serviceName,
      url: local.url || '',
      method: local.method || 'GET',
      type: local.type || 'REST',
    })
    await store.updateNode(
      id,
      {
        data: {
          label: local.label,
          serviceName: local.serviceName,
          url: local.url || '',
          method: local.method || 'GET',
          type: local.type || 'REST',
          status: nodeData.status !== undefined ? nodeData.status : true,
          fields: local.fields,
        },
      },
      { skipServiceSync: true },
    )
    notify({ title: 'ذخیره شد', text: 'سرویس با موفقیت ایجاد شد', type: 'success' })
  }

  store.clearSelected()
}

function updateLabel() {
  if (!node.value) return
  store.updateNode(node.value.id, { label: localLabel.value })
  store.clearSelected()
}

function askDelete() {
  showConfirm.value = true
}

function onConfirmDelete() {
  if (!node.value) return
  store.deleteNode(node.value.id)
  showConfirm.value = false
  close() // Close your main modal if you want
}

function onCancelDelete() {
  showConfirm.value = false
}
function close() {
  store.clearSelected()
}

function copyJson() {
  if (!node.value) return
  const payload = isCombined.value ? nodeData.value.combinedSchema : nodeValueToExport(node.value)
  window.navigator.clipboard?.writeText(JSON.stringify(payload, null, 2))

  notify({
    title: "JSON مورد نظر کپی شد.",
    text: "JSON مورد نظر کپی شد.",
    type: "success"
  });
}

function nodeValueToExport(n) {
  return n.data
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal {
  width: 760px;
  background: white;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.modal-body {
  max-height: 60vh;
  overflow: auto;
  padding-top: 8px;
}

.field-row {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
  align-items: center;
}

.actions button {
  margin-left: 8px;
}

.danger {
  background: #fee2e2;
}
.responsive-modal-header {
  font-size: 1.25rem;
  padding: 0.75rem;
}
@media (max-width: 600px) {
  .responsive-modal-header {
    font-size: 1rem;
    padding: 0.5rem 0.25rem;
    word-break: break-word;
  }
}
.header-btn-text {
  display: inline;
  margin-right: 0.4rem;
}
@media (max-width: 600px) {
  .header-btn-text {
    display: none !important;
  }
}
.responsive-btn-text {
  display: inline;
  margin-right: 0.4rem;
}

@media (max-width: 600px) {
  .responsive-btn-text {
    display: none !important;
  }
}
.field-row-mobile {
  display: flex;
  gap: 8px;
  align-items: center;
}
@media (max-width: 600px) {
  .field-row-mobile {
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 0.5rem !important;
  }
}
</style>
