// import { ref, computed } from 'vue'
// import { defineStore } from 'pinia'
// import { createHttpClient } from '@/utils/httpClient'
// import StatusCode from './../constant/StatusCode';
// import { notify } from '@kyvg/vue3-notification';
// export const useAuthStore = defineStore('auth', () => {

//   const user = ref(null)
//   const isAuthenticated = computed(() => {
//     if (localStorage.getItem('isAuthenticated') === 'true') {
//       return true
//     }
//     else {
//       return !!user.value
//     }
//   })

//   async function loginWithCaptcha(payload) {
//     // Validate input
//     if (!payload.username || !payload.password || payload.username.trim() === '' || payload.password.trim() === '') {
//       return false;
//     }

//     try {
//       const response = await createHttpClient().post('/Auth/loginwithcaptcha', payload);

//       if (response.data && response.status === StatusCode.OK) {
//         const userRecord = response.data;
//         user.value = userRecord;
//         localStorage.setItem('user', JSON.stringify(userRecord));
//         localStorage.setItem('token', userRecord?.token || '');
//         localStorage.setItem('username', userRecord?.username || '');
//         localStorage.setItem('isAuthenticated', 'true');
//         localStorage.setItem('role',userRecord?.role || '');
//         isAuthenticated.value = true;
//         return true;
//       } else {
//         isAuthenticated.value = false;
//         notify({
//           title: 'خطا در ورود',
//           text: 'نام کاربری یا رمز عبور اشتباه است.',
//           type: 'error',
//           duration: 3000,
//         });
//         return false;
//       }
//     } catch (error) {
//       console.error('Login error:', error);
//       notify({
//         title: 'خطا در ارتباط با سرور',
//         text: 'خطایی در برقراری ارتباط با سرور رخ داده است.',
//         type: 'error',
//         duration: 3000,
//       });
//       return false;
//     }
//   }

//  async function logout() {
//     let response = await createHttpClient().post('/Auth/logout').catch((error) => {
//       console.error('Logout error:', error);
//     });
//     if(response && response.status === StatusCode.OK){
//       user.value = null
//     }
//   }

//   return { logout, loginWithCaptcha, isAuthenticated, user }
// })

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { createHttpClient } from '@/utils/httpClient'
import StatusCode from './../constant/StatusCode';
import { notify } from '@kyvg/vue3-notification'

// ---------- JWT helpers (you can move them to @/utils/jwt.js) ----------
function decodeJwt(token) {
  try {
    const base64Url = token.split('.')[1]
    if (!base64Url) return null

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

function isTokenExpired(token, leeway = 30) {
  const payload = decodeJwt(token)
  if (!payload?.exp) return true
  const now = Math.floor(Date.now() / 1000)
  return payload.exp < now + leeway
}

function getRoleFromToken(token) {
  const payload = decodeJwt(token)
  if (!payload) return null
  return (
    payload.role ||
    payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
    null
  )
}

function isValidSessionToken(token) {
  if (!token || isTokenExpired(token)) return false
  const role = getRoleFromToken(token)
  return role === 'admin' || role === 'Admin'
}
// ----------------------------------------------------------------------

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)

  // Load initial state from localStorage
  const token = ref(localStorage.getItem('token') || null)

  // Main authentication check (token + not expired + has role)
  const isAuthenticated = computed(() => {
    const currentToken = token.value || localStorage.getItem('token')
    return isValidSessionToken(currentToken)
  })

  // Useful extra getters
  const userRole = computed(() => {
    const currentToken = token.value || localStorage.getItem('token')
    return currentToken ? getRoleFromToken(currentToken) : null
  })

  const expiresIn = computed(() => {
    const currentToken = token.value || localStorage.getItem('token')
    if (!currentToken) return 0
    const payload = decodeJwt(currentToken)
    if (!payload?.exp) return 0
    return Math.max(0, payload.exp - Math.floor(Date.now() / 1000))
  })

  // ---------- Actions ----------
  async function loginWithCaptcha(payload) {
    if (!payload.username || !payload.password ||
        payload.username.trim() === '' || payload.password.trim() === '') {
      return false
    }

    try {
      const response = await createHttpClient().post('/Auth/loginwithcaptcha', payload)

      if (response.data && response.status === StatusCode.OK) {
        const userRecord = response.data
        user.value = userRecord
        token.value = userRecord?.token || ''

        localStorage.setItem('user', JSON.stringify(userRecord))
        localStorage.setItem('token', userRecord?.token || '')
        localStorage.setItem('username', userRecord?.username || '')
        localStorage.setItem('isAuthenticated', 'true')
        localStorage.setItem('role', userRecord?.role || '')

        return true
      } else {
        notify({
          title: 'خطا در ورود',
          text: 'نام کاربری یا رمز عبور اشتباه است.',
          type: 'error',
          duration: 3000,
        })
        return false
      }
    } catch (error) {
      console.error('Login error:', error)
      notify({
        title: 'خطا در ارتباط با سرور',
        text: 'خطایی در برقراری ارتباط با سرور رخ داده است.',
        type: 'error',
        duration: 3000,
      })
      return false
    }
  }

  async function logout() {
    try {
      await createHttpClient().post('/Auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Always clear local data
      user.value = null
      token.value = null
      localStorage.removeItem('user')
      localStorage.removeItem('token')
      localStorage.removeItem('username')
      localStorage.removeItem('isAuthenticated')
      localStorage.removeItem('role')
    }
  }

  /**
   * Call this in the router guard.
   * Returns true if session is still valid, otherwise logs the user out.
   */
  function checkSession() {
    const currentToken = token.value || localStorage.getItem('token')
    if (!isValidSessionToken(currentToken)) {
      logout()
      return false
    }
    return true
  }

  return {
    user,
    token,
    isAuthenticated,
    userRole,
    expiresIn,
    loginWithCaptcha,
    logout,
    checkSession,
  }
})
