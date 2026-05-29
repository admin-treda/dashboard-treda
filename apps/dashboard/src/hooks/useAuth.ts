import { useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'
import { toast } from 'sonner'

export function useAuth() {
  const { user, token, isAuthenticated, setAuth, logout: storeLogout } = useAuthStore()

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const response = await api.post('/auth/login', { email, password })
        const { user, token } = response.data
        setAuth(user, token)
        toast.success('Inicio de sesión exitoso')
        return { success: true }
      } catch (error: any) {
        const message = error.response?.data?.message || 'Error al iniciar sesión'
        toast.error(message)
        return { success: false, error: message }
      }
    },
    [setAuth]
  )

  const logout = useCallback(() => {
    storeLogout()
    toast.info('Sesión cerrada')
    window.location.href = '/'
  }, [storeLogout])

  return {
    user,
    token,
    isAuthenticated,
    login,
    logout,
  }
}
