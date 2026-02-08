AppLogin


<template>
  <div>
    <div class="min-h-screen fullscreen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-500">
      <div
        class="w-full max-w-lg relative p-1 rounded-2xl bg-gradient-to-br from-gery-400 via-gery-500 to-amber-600 shadow-2xl">
        <!-- Glassy Card -->
        <div class="relative bg-white/80 backdrop-blur-xl rounded-xl p-8 border border-white/30 shadow-inner">
          <!-- Optional inner glow -->
          <div class="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent pointer-events-none">
          </div>

          <div class="flex flex-col items-center justify-center space-y-2">
            <img src="../assets/css/images/omidLogo.png" alt="امید تک" class="w-24 h-24 object-contain mx-auto" />
            <!-- <h1 class="text-3xl font-bold text-orange-500 text-center drop-shadow-md py-4">
              ورود
            </h1> -->
          </div>
          <form class="space-y-6" @submit.prevent="hanldeLogin">
            <div class="flex flex-col">
              <label class="text-right text-lg font-semibold text-orange-700 mb-2">نام کاربری</label>
              <input tabindex="1" type="text" v-model="username"
                class="text-right h-12 px-4 rounded-lg border border-orange-200 bg-white/70 backdrop-blur-sm focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-200/50 outline-none text-gray-800 placeholder-gray-500 transition-all"
                placeholder="نام کاربری خود را وارد کنید" />
            </div>

            <div class="flex flex-col">
              <label class="text-right text-lg font-semibold text-orange-700 mb-2">رمزعبور</label>
              <input tabindex="2" type="password" v-model="password"
                class="text-right h-12 px-4 rounded-lg border border-orange-200 bg-white/70 backdrop-blur-sm focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-200/50 outline-none text-gray-800 placeholder-gray-500 transition-all"
                placeholder="رمز عبور خود را وارد کنید" />
            </div>
            <div class="flex flex-col">
              <Captcha ref="captchaRef"  @update="onCaptchaUpdate" />
            </div>
            <button tabindex="3" type="submit"
              class="w-full h-12 mt-4 rounded-lg text-white font-bold text-lg shadow-lg hover:shadow-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 active:scale-98 transition-all duration-200">
              ورود
            </button>
          </form>
          <p v-if="errorMessage" class="text-red-600 mt-4 text-center errorMessage">
            <font-awesome-icon :icon="faExclamationCircle" class="mr-2" style="color: red" />
            {{ errorMessage }}
          </p>

        </div>
          <div class="version">
            <p class="text-white text-sm py-2">نسخه 1.0.1</p>
          </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import Captcha from '../components/AppVerifyCaptcha.vue'
import { useAuthStore } from '@/stores/authStore'
import { ref } from 'vue'
import { notify } from '@kyvg/vue3-notification'
import { useRouter } from 'vue-router'
import { faExclamationCircle } from '@fortawesome/free-solid-svg-icons'
const router = useRouter()
const username = ref('')
const password = ref('')
const errorMessage = ref('')
const authStore = useAuthStore()
const captchaRef = ref(null)


const captcha = ref('')
const captchaKey = ref('')

function onCaptchaUpdate(payload) {
  captcha.value = payload.captcha
  captchaKey.value = payload.key
}

async function hanldeLogin() {
  if (!captcha.value || !captchaKey.value) {
    errorMessage.value = 'لطفا کد امنیتی را وارد کنید.'
    return
  }

  try {
    await authStore.loginWithCaptcha({
      username: username.value,
      password: password.value,
      captcha: captcha.value,
      key: captchaKey.value,
    })

    notify({
      title: 'ورود موفقیت آمیز',
      text: 'شما با موفقیت وارد شدید.',
      type: 'success',
      duration: 3000,
    })

    setTimeout(() => router.push('/aggregates'), 800)
  } catch (err) {
    errorMessage.value =
      err?.response?.data?.message || 'کد امنیتی یا اطلاعات ورود اشتباه است.'

    // 🔁 refresh captcha after error
    captchaRef.value?.fetchCaptcha()
  }
}
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  console.log('Navigating to:', to.path, 'Authenticated:', authStore.isAuthenticated)
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/Login')
  } else {
    next()
  }
})
</script>

<style scoped>
/* Optional: extra smooth glass effect on Safari */
@supports (backdrop-filter: blur(12px)) {
  .backdrop-blur-xl {
    backdrop-filter: blur(16px);
  }
}

.errorMessage {
  color: #f15a03;
  font-weight: bold;
  text-align: center;
}
</style>
