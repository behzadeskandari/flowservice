<template>
  <div
    v-if="visible"
    class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
    @click.self="cancel"
  >
    <div
      class="bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 p-[2px] rounded-3xl max-w-sm w-full"
    >
      <div
        class="bg-white dark:bg-gray-900 rounded-3xl p-6 text-center"
      >
        <p class="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-6">
          {{ props.message }}
        </p>

        <div class="flex justify-center gap-4">
          <button
            class="px-6 py-2 rounded-xl bg-gray-300 hover:bg-gray-400 transition"
            @click="cancel"
          >
            لغو
          </button>
          <button
            class="px-6 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition"
            @click="confirm"
          >
            پاک کن
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {  defineProps } from 'vue'

const props = defineProps({
  visible: Boolean,
  message: {
    type: String,
    default: 'آیا از پاک کردن گره مطمئن هستید؟',
  },
})

const emit = defineEmits(['confirm', 'cancel'])

function confirm() {
  emit('confirm')
}

function cancel() {
  emit('cancel')
}
</script>
