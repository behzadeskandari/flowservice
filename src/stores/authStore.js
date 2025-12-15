import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { createHttpClient } from '@/utils/httpClient'
import StatusCode from './../constant/StatusCode';
import { notify } from '@kyvg/vue3-notification';
export const useAuthStore = defineStore('auth', () => {

  const count = ref(0)
  function increment() {
    count.value++
  }
  const user = ref(null)
  const isAuthenticated = computed(() => {
    if (localStorage.getItem('isAuthenticated') === 'true') {
      return true
    }
    else {
      return !!user.value
    }
  })

  async function login(username, password) {
    // Validate input
    if (!username || !password || username.trim() === '' || password.trim() === '') {
      return false;
    }

    try {
      const response = await createHttpClient().post('/Auth/login', { username, password });

      if (response.data && response.status === StatusCode.OK) {
        const userRecord = response.data;
        user.value = userRecord;
        localStorage.setItem('user', JSON.stringify(userRecord));
        localStorage.setItem('token', userRecord?.token || '');
        localStorage.setItem('username', userRecord?.username || '');
        localStorage.setItem('isAuthenticated', 'true');
        isAuthenticated.value = true;
        return true;
      } else {
        isAuthenticated.value = false;
        notify({
          title: 'خطا در ورود',
          text: 'نام کاربری یا رمز عبور اشتباه است.',
          type: 'error',
          duration: 3000,
        });
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      notify({
        title: 'خطا در ارتباط با سرور',
        text: 'خطایی در برقراری ارتباط با سرور رخ داده است.',
        type: 'error',
        duration: 3000,
      });
      return false;
    }
  }

  function logout() {
    user.value = null
  }

  return { logout, login, isAuthenticated, user }
})
