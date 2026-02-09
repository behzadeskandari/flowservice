<template>
  <div v-if="isOpen"
    class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn"
    @click.self="onClose">
    <div class="bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 p-[2px] rounded-3xl">

      <div class="bg-white dark:bg-gray-900 shadow-2xl rounded-3xl w-full max-w-2xl animate-scaleIn"
        style="width:90vw; padding:17px">

        <!-- Header -->
        <header class="flex items-center justify-between border-b pb-3 mb-4">
          <div class="flex gap-2">
            <button
              class="px-6 py-3 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:from-orange-500 hover:via-orange-600 hover:to-orange-700 transition duration-300 ease-in-out"
              @click="onClose">
              <font-awesome-icon :icon="faArrowUp" style="color: white;" />
              <span class="header-btn-text">خروج</span>
            </button>
            <button
              class="px-6 py-3 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:from-orange-500 hover:via-orange-600 hover:to-orange-700 transition duration-300 ease-in-out"
              @click="onSave" :disabled="!stepData.stepName">
              <font-awesome-icon :icon="faSave" style="color: white;" />
              <span class="header-btn-text">ذخیره</span>
            </button>
          </div>
          <h3 class="text-xl font-bold text-gray-800 dark:text-gray-100 p-3">اضافه کردن مرحله</h3>
        </header>

        <!-- Body -->
        <section class="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <!-- Step Information Section -->
          <div class="space-y-4">
            <h4 class="text-lg font-semibold text-gray-700 dark:text-gray-200">اطلاعات مرحله</h4>

            <!-- Step Name -->
            <div>
              <label class="block font-medium text-gray-500 mb-1 text-right px-1 py-1">نام مرحله *</label>
              <input v-model="stepData.stepName" type="text" placeholder="نام مرحله را وارد کنید" class="w-full px-4 py-2 rounded-xl border border-gray-300
               focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
               bg-white shadow-sm transition text-right" />
            </div>

            <!-- Service Dropdown -->
            <div>
              <label class="block font-medium text-gray-500 mb-1 text-right px-1 py-1">سرویس (اختیاری)</label>
              <select v-model="stepData.serviceId" disabled class="w-full px-4 py-2 rounded-xl border border-gray-300
               focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
               bg-white shadow-sm transition text-right" required>
                <option :value="null">-- بدون سرویس --</option>
                <option v-for="service in availableServices.items" :key="service.id" :value="service.id">
                  {{ service.name }} ({{ service.method }})
                </option>
              </select>
              <small class="block mt-1 text-gray-600 text-right">
                از بین سرویس‌های موجود انتخاب کنید. سرویس‌ها در صفحه سرویس‌ها مدیریت می‌شوند.
              </small>
            </div>

            <!-- Condition Field -->
            <div>
              <label class="block font-medium text-gray-500 mb-1 text-right px-1 py-1">شرط (اختیاری)</label>
              <input v-model="stepData.condition" type="text" placeholder="مثال: user.role === 'admin'" class="w-full px-4 py-2 rounded-xl border border-gray-300
               focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
               bg-white shadow-sm transition text-right" />
              <small class="block mt-1 text-gray-600 text-right">
                برای مراحل معمولی خالی بگذارید. برای ایجاد یک مرحله شرطی، یک شرط اضافه کنید.
              </small>
            </div>

            <!-- Condition Parameters (visible only if condition exists) -->
            <div v-if="stepData.condition">
              <label class="block font-medium text-gray-500 mb-1 text-right px-1 py-1">پارامترهای شرط (اختیاری)</label>
              <input v-model="stepData.conditionParameters" type="text" placeholder="مثال: role,status" class="w-full px-4 py-2 rounded-xl border border-gray-300
               focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
               bg-white shadow-sm transition text-right" />
              <small class="block mt-1 text-gray-600 text-right">
                نام پارامترهای جدا شده با کاما که در شرط استفاده می‌شوند.
              </small>
            </div>
          </div>

          <!-- Step Connections Section -->
          <div class="space-y-4 pt-4 border-t border-gray-300">
            <h4 class="text-lg font-semibold text-gray-700 dark:text-gray-200">اتصالات مرحله</h4>

            <!-- Normal Next Step (if no condition) -->
            <div v-if="!stepData.condition">
              <label class="block font-medium text-gray-500 mb-1 text-right px-1 py-1">مرحله بعدی (اختیاری)</label>
              <select v-model="stepData.nextStepId" class="w-full px-4 py-2 rounded-xl border border-gray-300
               focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
               bg-white shadow-sm transition text-right">
                <option :value="null">-- هیچکدام (مرحله پایانی) --</option>
                <option v-for="step in availableNextSteps" :key="step.id" :value="step.id">
                  {{ step.stepName || `Step ${step.id.slice(0, 8)}` }}
                </option>
              </select>
            </div>

            <!-- Conditional Steps (if condition exists) -->
            <template v-else>
              <div>
                <label class="block font-medium text-gray-500 mb-1 text-right px-1 py-1">مسیر درست (وقتی شرط درست
                  باشد)</label>
                <select v-model="stepData.trueStepId" class="w-full px-4 py-2 rounded-xl border border-gray-300
                 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
                 bg-white shadow-sm transition text-right">
                  <option :value="null">-- None --</option>
                  <option v-for="step in availableNextSteps" :key="step.id" :value="step.id">
                    {{ step.stepName || `Step ${step.id.slice(0, 8)}` }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block font-medium text-gray-500 mb-1 text-right px-1 py-1">مسیر نادرست (وقتی شرط نادرست
                  است)</label>
                <select v-model="stepData.falseStepId" class="w-full px-4 py-2 rounded-xl border border-gray-300
                 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
                 bg-white shadow-sm transition text-right">
                  <option :value="null">-- None --</option>
                  <option v-for="step in availableNextSteps" :key="step.id" :value="step.id">
                    {{ step.stepName || `Step ${step.id.slice(0, 8)}` }}
                  </option>
                </select>
              </div>
            </template>
          </div>

        </section>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useFlowStore } from '@/stores/flowStore'
import serviceAggregatorClient from '@/utils/service-aggregator-client'
import { notify } from '@kyvg/vue3-notification'
import { faArrowUp, faSave } from '@fortawesome/free-solid-svg-icons'

const store = useFlowStore()
const availableServices = ref([])
const isOpen = ref(false)

const stepData = ref({
  stepName: '',
  aggregateId: null,
  serviceId: null,
  nextStepId: null,
  trueStepId: null,
  falseStepId: null,
  condition: '',
  conditionParameters: '',
  positionX: null,
  positionY: null,
  nodeId: null, // For updating existing local node
})

const resetForm = () => {
  stepData.value = {
    stepName: '',
    aggregateId: null,
    serviceId: null,
    nextStepId: null,
    trueStepId: null,
    falseStepId: null,
    condition: '',
    conditionParameters: '',
    positionX: null,
    positionY: null,
    nodeId: null,
  }
}

// Load available services
const loadServices = async () => {
  try {
    const data = await serviceAggregatorClient.getServices()
    availableServices.value = data ? data : []
  } catch (error) {
    console.error('Error loading services:', error)
    notify({
      title: 'خطا',
      text: 'خطا در بارگذاری سرویس‌ها',
      type: 'error',
    })
  }
}

// Available steps that can be connected
const availableNextSteps = computed(() => {
  return store.nodes
    .filter(node => node.type !== 'combinedServiceNode')
    .map(node => ({
      id: node.data.aggregateStepId || node.data.stepId || node.id,
      stepName: node.data.stepName || node.data.label || node.data.serviceName,
    }))
})

// Expose open/close methods
const openModal = (mode = 'add', initialData = null) => {
  // // First, reset the form to clear any previous state
  // resetForm()

  // // Then load services
  // loadServices()

  // // Set the initial data after reset
  // if (initialData && Object.keys(initialData).length > 0) {
  //   // Ensure serviceId is properly typed (string or null)
  //   const cleanedData = {
  //     ...initialData,
  //     serviceId: initialData.serviceId ? String(initialData.serviceId) : null,
  //   }
  //   stepData.value = Object.assign({}, stepData.value, cleanedData)
  //   localStorage.setItem('stepData', stepData.value)
  //   console.log('StepModal opened with data:', stepData.value)
  // }

  // Finally, open the modal
  // isOpen.value = true
  resetForm()
  loadServices()

  if (initialData) {
    stepData.value = {
      ...stepData.value,
      // Map the backend DB ID to .id so onSave knows to UPDATE
      id: initialData.aggregateStepId || initialData.id || null,
      nodeId: initialData.nodeId || initialData.id || null, // Vue Flow reference
      stepName: initialData.stepName || '',
      serviceId: initialData.serviceId || null,
      aggregateId: initialData.aggregateId || store.currentAggregateId,
      nextStepId: initialData.nextStepId || null,
      condition: initialData.condition || '',
      conditionParameters: initialData.conditionParameters || '',
      positionX: initialData.position?.x || initialData.positionX || 100,
      positionY: initialData.position?.y || initialData.positionY || 100,
    };
  }
  isOpen.value = true
}

const closeModal = () => {
  isOpen.value = false
  resetForm()
}

function onClose() {
  closeModal()
}

// Auto-load services when modal opens

// Inside StepModal.vue -> onSave function
const onSave = async () => {
  try {
    // Validate required fields
    if (!stepData.value.stepName || !stepData.value.stepName.trim()) {
      notify({ title: 'خطا', text: 'نام مرحله مورد نیاز است', type: 'error' });
      return;
    }

    // Prepare payload with aggregateId fallback
    const payload = {
      ...stepData.value,
      aggregateId: stepData.value.aggregateId || store.currentAggregateId
    };

    let stepResult;

    // Create or update step in backend
    if (!stepData.value.id) {
      stepResult = await serviceAggregatorClient.addAggregateStep(payload);
    } else {
      stepResult = await serviceAggregatorClient.updateAggregateStep(payload);
    }

    if (!stepResult?.id) {
      throw new Error('Server did not return step ID');
    }

    // Update the aggregate's firstStepId if this is the first node
    if (store.nodes.length === 0 || store.nodes.length === 1) {
      debugger
      const aggregateRecord = await store.getAggregateByid(payload.aggregateId);
      if (aggregateRecord.firstStepId && aggregateRecord.firstStepId != null && aggregateRecord.firstStepId != undefined) {

      } else {
        await serviceAggregatorClient.updateAggregate({
          ...aggregateRecord,
          firstStepId: stepResult.id,
          status: true
        });
      }

    }

    // Find the node in the store to update the UI
    const targetId = stepData.value.nodeId || stepData.value.id;
    let nodeIndex = store.nodes.findIndex((n) => n.id === String(targetId));

    // Fallback: search by aggregateStepId if not found
    if (nodeIndex === -1 && stepData.value.id) {
      nodeIndex = store.nodes.findIndex((n) => n.data?.aggregateStepId === stepData.value.id);
    }

    if (nodeIndex !== -1) {
      // Create a shallow copy of the node to trigger reactivity
      const updatedNode = { ...store.nodes[nodeIndex] };

      updatedNode.data = {
        ...updatedNode.data,
        ...payload,
        aggregateStepId: stepResult.id,
        nextStepId: payload.nextStepId
      };

      // Update the node ID if it was a new node
      if (!stepData.value.id) {
        updatedNode.id = String(stepResult.id);
      }

      // Update the node at the specific index
      store.nodes[nodeIndex] = updatedNode;
    } else {
      // Node not found - reload from store to ensure UI is fresh
      console.warn(`Node not found with ID ${targetId}. Store has ${store.nodes.length} nodes.`);
      await store.loadSingleAggregateFlow(payload.aggregateId);
    }

    // Force array reactivity by creating a new reference
    store.nodes = [...store.nodes];

    // Handle pending connection
    if (store.pendingConnection) {
      store.persistentEdges.push({
        source: store.pendingConnection.source,
        target: store.pendingConnection.target,
        type: 'smoothstep',
        animated: true
      });
      store.pendingConnection = null;
    }

    // Always rebuild edges to show the new connection
    if (typeof store.rebuildEdgesFromPersistent === 'function') {
      store.rebuildEdgesFromPersistent();
    }

    notify({ title: 'موفق', text: 'تغییرات با موفقیت ذخیره شد', type: 'success' });
    closeModal();
  } catch (error) {
    console.error('Save failed:', error);
    notify({
      title: 'خطا',
      text: error?.message || 'خطا در ذخیره مرحله',
      type: 'error'
    });
  }
};

watch(isOpen, (newVal) => {
  if (newVal) {
    loadServices()
  }
})

// Watch availableServices to ensure dropdown selection is properly synchronized
watch(availableServices, () => {
  // Validate that the selected serviceId exists in availableServices
  if (stepData.value.serviceId && availableServices.value.length > 0) {
    const serviceExists = availableServices.value.some(s => String(s.id) === String(stepData.value.serviceId))
    if (!serviceExists) {
      console.warn(`Selected service ${stepData.value.serviceId} not found in available services`)
      // Don't clear it, just log - the service might load later
    }
  }
}, { deep: true })

// Export methods for parent component to use
defineExpose({
  openModal,
  closeModal,
})

onMounted(() => {
  loadServices()
})
</script>

<style scoped>
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

.header-btn-text {
  display: inline;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .header-btn-text {
    display: none;
  }
}
</style>
