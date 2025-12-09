import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { createHttpClient} from '@/utils/httpClient'
export const useAuthStore = defineStore('auth', () => {

  const count = ref(0)
  function increment() {
    count.value++
  }
  const user = ref(null)
  const isAuthenticated = computed(() => !!user.value)

  function login(username, password) {
    // Simulate authentication
    //Todo Use use UTILS httpClient to authenticate
    // In a real application, you would replace this with an API call
    if (!username || !password) return false


    if (username === '' &&  password === '') {
      return false;
    }
    else {

      // createHttpClient().post('/login', { username, password }).then(response => {
      //   if (response.data.success) {
      //     let userRecord = response.data.user
      //     user.value = userRecord
      //     localStorage.setItem('user', JSON.stringify(userRecord))
            user.value = { username ,password }  // Simple user object
            isAuthenticated.value = true
      //   } else {
      //     throw new Error('Authentication failed')
      //   }
      // })

      return true
    }
    return false
  }

  function logout() {
    user.value = null
  }

  return { logout,login,isAuthenticated,user }
})
