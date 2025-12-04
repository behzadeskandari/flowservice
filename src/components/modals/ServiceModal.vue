<!-- src/components/modals/ServiceModal.vue -->
<template>
  <div v-if="store.showModal" class="modal-backdrop" @click.self="close">
    <div class="modal">
      <header class="modal-header">
        <h3>{{ title }}</h3>
        <div class="actions">
          <button @click="close">Close</button>
          <button v-if="isEdit" @click="save">Save</button>
          <button v-if="isEdit" @click="deleteNode" class="danger">Delete</button>
          <button v-if="isView" @click="copyJson">Copy JSON</button>
        </div>
      </header>

      <section class="modal-body">
        <div v-if="isCombined">
          <h4>Combined Schema</h4>
          <pre>{{ JSON.stringify(nodeData.combinedSchema, null, 2) }}</pre>
          <hr />
          <h4>Edit Label</h4>
          <input v-model="localLabel" />
          <button @click="updateLabel">Update Label</button>
        </div>

        <div v-else>
          <label>
            Label
            <input v-model="local.label" />
          </label>
          <label>
            Service Name
            <input v-model="local.serviceName" />
          </label>

          <h4>Fields</h4>
          <div class="fields">
            <div v-for="(f, idx) in local.fields" :key="f.key" class="field-row">
              <input v-model="f.label" placeholder="label" />
              <input v-model="f.key" placeholder="key" />
              <select v-model="f.type">
                <option value="string">string</option>
                <option value="number">number</option>
                <option value="boolean">boolean</option>
                <option value="text">text</option>
              </select>
              <input v-model="f.defaultValue" placeholder="default" />
              <button @click="removeField(idx)">-</button>
            </div>
            <button @click="addField">+ Add field</button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed } from 'vue'
import { useFlowStore } from '../../stores/flowStore'
import { uniqueId } from '../../utils/modalUtils' // not required - will define locally

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
  if (!node.value) return 'Add Service'
  return isCombined.value ? `Combined: ${nodeData.value.label}` : `Edit: ${nodeData.value.label}`
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
    label: local.label,
    serviceName: local.serviceName,
    fields: local.fields,
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
  if (confirm('Delete node?')) {
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
  alert('JSON copied to clipboard.')
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
