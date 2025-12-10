import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { createHttpClient} from '@/utils/httpClient'
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

  function login(username, password) {
    // Simulate authentication
    //Todo Use use UTILS httpClient to authenticate
    // In a real application, you would replace this with an API call
    if (!username || !password) return false


    if (username === '' &&  password === '') {
      return false;
    }
    else {

      createHttpClient().post('/Auth/login', { username, password }).then(response => {
        if (response && response.status === 200) {
            let userRecord = response
            user.value = userRecord
            localStorage.setItem('user', JSON.stringify(userRecord))
            localStorage.setItem('token', JSON.stringify(userRecord?.token))
            localStorage.setItem('username', JSON.stringify(userRecord?.username))

            isAuthenticated.value = true
            localStorage.setItem('isAuthenticated','true')
        } else {
            notify({
              title: 'خطا در ورود',
              text: 'نام کاربری یا رمز عبور اشتباه است.',
              type: 'error',
              duration: 3000,
            })
        }
      })

      return true
    }
    return false
  }

  function logout() {
    user.value = null
  }

  return { logout,login,isAuthenticated,user }
})
