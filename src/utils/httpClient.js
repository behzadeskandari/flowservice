import axios from 'axios'

export function createHttpClient(options = {}) {
  const {
    baseURL = import.meta?.env?.VITE_API_BASE || '/',
    timeout = 15000,
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
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    },
    (error) => Promise.reject(error),
  )

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // place to trigger logout/refresh if needed
      }
      return Promise.reject(error)
    },
  )

  return instance
}

