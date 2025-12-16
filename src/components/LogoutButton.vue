<template>
  <button
    @click="handleLogout"
    :class="[
      ' h-12 mt-4 rounded-lg text-white font-bold text-lg shadow-lg hover:shadow-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 active:scale-98 transition-all duration-200',
      'logout-btn',
      variant === 'icon' ? 'logout-btn--icon' : '',
      variant === 'text' ? 'logout-btn--text' : '',
      variant === 'gradient' ? 'logout-btn--gradient' : ''
    ]"
    :title="showLabel ? '' : 'خروج'"
  >
    <svg
      v-if="showIcon"
      class="logout-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
      <polyline points="16 17 21 12 16 7"></polyline>
      <line x1="21" y1="12" x2="9" y2="12"></line>
    </svg>
    <span v-if="showLabel" class="logout-label">{{ label }}</span>
  </button>
</template>

<script setup>
import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'vue-router'
import { notify } from '@kyvg/vue3-notification'

const props = defineProps({
  // 'icon' - just icon, 'text' - just text, 'gradient' - gradient styled button
  variant: {
    type: String,
    default: 'gradient', // or 'icon', 'text'
    validator: (value) => ['icon', 'text', 'gradient'].includes(value)
  },
  showIcon: {
    type: Boolean,
    default: true
  },
  showLabel: {
    type: Boolean,
    default: true
  },
  label: {
    type: String,
    default: 'خروج'
  },
  confirmLogout: {
    type: Boolean,
    default: true
  }
})

const authStore = useAuthStore()
const router = useRouter()

const handleLogout = () => {
  if (props.confirmLogout) {
    const confirmed = confirm('آیا می‌خواهید از سیستم خارج شوید؟')
    if (!confirmed) return
  }

  // Clear localStorage
  localStorage.removeItem('user')
  localStorage.removeItem('token')
  localStorage.removeItem('username')
  localStorage.removeItem('isAuthenticated')

  // Clear auth store
  authStore.logout()

  // Show notification
  notify({
    title: 'خروج موفق',
    text: 'شما از سیستم خارج شدید.',
    type: 'success',
    duration: 2000,
  })

  // Redirect to login immediately
  router.push('/Login')
}
</script>

<style scoped>
/* Base button styles */
.logout-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
  font-family: 'Vazir', 'Yekan', sans-serif;
}

.logout-btn:hover {
  transform: translateY(-2px);
}

.logout-btn:active {
  transform: translateY(0);
}

/* Icon variant - minimal */
.logout-btn--icon {
  padding: 8px;
  background: transparent;
  color: #ef4444;
}

.logout-btn--icon:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

/* Text variant */
.logout-btn--text {
  padding: 8px 12px;
  background: transparent;
  color: #ef4444;
  font-weight: 600;
}

.logout-btn--text:hover {
  background: rgba(239, 68, 68, 0.05);
  color: #dc2626;
}

/* Gradient variant - default */
.logout-btn--gradient {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
}

.logout-btn--gradient:hover {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

.logout-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.logout-label {
  white-space: nowrap;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .logout-btn {
    padding: 6px 12px;
    font-size: 13px;
    gap: 6px;
  }

  .logout-btn--icon {
    padding: 6px;
  }

  .logout-icon {
    width: 18px;
    height: 18px;
  }
}

@media (max-width: 480px) {
  .logout-btn {
    padding: 5px 10px;
    font-size: 12px;
  }

  .logout-btn--icon {
    padding: 5px;
  }

  .logout-icon {
    width: 16px;
    height: 16px;
  }

  .logout-label {
    display: none;
  }
}
</style>
