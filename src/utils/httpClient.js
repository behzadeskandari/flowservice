import axios from 'axios'
import StatusCode from '@/constant/StatusCode'
import { notify } from '@kyvg/vue3-notification'

export function createHttpClient(options = {}) {
  const {
    baseURL = "http://192.168.13.117:5294/api", //"http://192.168.140.172:8099/api", /// || '/',
    timeout = 1000,
    headers = {},
    getToken = () => localStorage.getItem('token'),
  } = options

  const instance = axios.create({
    baseURL,
    timeout,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  })

  instance.interceptors.request.use(
    (config) => {
      const token = getToken?.()
      if (token) {
        let cleanToken = token
        if (typeof token === 'string') {
          try {
            const parsed = JSON.parse(token)
            if (typeof parsed === 'string') {
              cleanToken = parsed
            }
          } catch (e) {
            cleanToken = token.replace(/^["']|["']$/g, '')
          }
        }
        config.headers.Authorization = `Bearer ${cleanToken}`
      }
      return config
    },
    (error) => Promise.reject(error),
  )

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === StatusCode.UNAUTHORIZED) {
        notify({
          title: 'دسترسی غیرمجاز',
          text: 'دسترسی شما به این بخش محدود است.',
          type: 'error',
          duration: 3000,
        })
      }
      if (error.response?.status === StatusCode.FORBIDDEN) {
        notify({
          title: 'دسترسی غیرمجاز',
          text: 'دسترسی شما به این بخش محدود است.',
          type: 'error',
          duration: 3000,
        })
      }
      return Promise.reject(error)
    },
  )

  return instance
}

