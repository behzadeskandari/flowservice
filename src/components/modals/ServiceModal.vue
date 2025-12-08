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
              خروج
            </button>
            <button v-if="isEdit"
              class="px-6 py-3 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:from-orange-500 hover:via-orange-600 hover:to-orange-700 transition duration-300 ease-in-out"
              @click="save">
              <font-awesome-icon :icon="faSave" style="color: white;" />
              ذخیره
            </button>
            <button v-if="isEdit"
              class="px-6 py-3 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:from-orange-500 hover:via-orange-600 hover:to-orange-700 transition duration-300 ease-in-out"
              @click="deleteNode">
              <font-awesome-icon :icon="faTrash" style="color: white;" />
              پاک کردن</button>
            <button v-if="isView"
              class="px-6 py-3 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:from-orange-500 hover:via-orange-600 hover:to-orange-700 transition duration-300 ease-in-out"
              @click="copyJson">کپی JSON</button>
          </div>
          <h3 class="text-xl font-bold text-gray-800 dark:text-gray-100 p-3">{{ title }}</h3>

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

            <h4 class="text-lg font-semibold text-gray-400 dark:text-gray-200">جزییات فیلدها</h4>

            <div class="space-y-3">
              <div v-for="(f, idx) in local.fields" :key="f.idx"
                class="flex gap-2 items-center bg-gray-50 dark:bg-gray-800 p-2 rounded-xl">
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
              <span class="text-white-300">
                اضافه کردن فیلد
              </span>
            </button>

          </div>

        </section>
      </div>
    </div>
  </div>
</template>


<script setup>
import { reactive, computed } from 'vue'
import { useFlowStore } from '../../stores/flowStore'
import { faTrash, faSave, faArrowUp } from '@fortawesome/free-solid-svg-icons'

const store = useFlowStore()

// derive selected node
const selectedId = computed(() => store.selectedNode)
const node = computed(() => store.nodes.find((n) => n.id === selectedId.value) || null)

const isCombined = computed(() => node.value && node.value.type === 'combinedServiceNode')
const isView = computed(() => store.modalMode === 'view')
const isEdit = computed(() => store.modalMode === 'edit')

const nodeData = computed(() => {
  if (!node.value) return null
  return node.value.data
})

const title = computed(() => {
  if (!node.value) return 'اضافه کردن سرویس'
  return isCombined.value ? ` ترکیب سرویس: ${nodeData.value.label}` : ` ویرایش: ${nodeData.value.label}`
})

// local copy for edits
const local = reactive({
  label: nodeData.value ? nodeData.value.label : '',
  serviceName: nodeData.value ? nodeData.value.serviceName : '',
  fields: nodeData.value ? JSON.parse(JSON.stringify(nodeData.value.fields || [])) : [],
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
      local.fields = JSON.parse(JSON.stringify(n.data.fields || []))
      localLabel.value = n.data.label || ''
    } else {
      local.label = ''
      local.serviceName = ''
      local.fields = []
      localLabel.value = ''
    }
  },
  { immediate: true },
)

function addField() {
  const newKey = `f_${Date.now().toString(36)}_${Math.floor(Math.random() * 1000)}`
  local.fields.push({ key: newKey, label: 'newField', type: 'string', defaultValue: '' })
}

function removeField(idx) {
  local.fields.splice(idx, 1)
}

function save() {
  if (!node.value) return
  const id = node.value.id
  store.updateNode(id, {
    data: {
      label: local.label,
      serviceName: local.serviceName,
      fields: local.fields,
    },
  })
  store.clearSelected()
}

function updateLabel() {
  if (!node.value) return
  store.updateNode(node.value.id, { label: localLabel.value })
  store.clearSelected()
}

function deleteNode() {
  if (!node.value) return
  if (confirm('پا ک کردن گره?')) {
    store.deleteNode(node.value.id)
  }
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
</style>
