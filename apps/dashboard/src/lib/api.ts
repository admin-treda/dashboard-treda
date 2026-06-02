import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000/api/v1'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth state from store AND localStorage
      localStorage.removeItem('token')
      localStorage.removeItem('auth-storage')
      // Use zustand's getState() to call logout outside React
      useAuthStore.getState().logout()
      // Only redirect if not already on login page (prevents redirect loops)
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/'
      }
    }
    return Promise.reject(error)
  }
)

export default api
