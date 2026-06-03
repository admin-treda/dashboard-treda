import { useState, useEffect, createContext, useContext } from 'react'
import { api } from './api'

interface Permissions {
  role: string
  canViewDashboard: boolean
  canViewEvents: boolean
  canViewCosts: boolean
  canViewReports: boolean
  canGenerateReports: boolean
  canRunPentest: boolean
  canManageUsers: boolean
  canConfig: boolean
  canRefresh: boolean
  canDelete: boolean
}

const ROLE_PERMISSIONS: Record<string, Omit<Permissions, 'role'>> = {
  admin: {
    canViewDashboard: true, canViewEvents: true, canViewCosts: true, canViewReports: true,
    canGenerateReports: true, canRunPentest: true, canManageUsers: true, canConfig: true,
    canRefresh: true, canDelete: true,
  },
  analyst: {
    canViewDashboard: true, canViewEvents: true, canViewCosts: true, canViewReports: true,
    canGenerateReports: true, canRunPentest: true, canManageUsers: false, canConfig: false,
    canRefresh: true, canDelete: false,
  },
  viewer: {
    canViewDashboard: true, canViewEvents: true, canViewCosts: true, canViewReports: true,
    canGenerateReports: false, canRunPentest: false, canManageUsers: false, canConfig: false,
    canRefresh: false, canDelete: false,
  },
}

const PermissionsContext = createContext<Permissions>({
  role: 'viewer', canViewDashboard: true, canViewEvents: true, canViewCosts: true,
  canViewReports: true, canGenerateReports: false, canRunPentest: false,
  canManageUsers: false, canConfig: false, canRefresh: false, canDelete: false,
})

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const [perms, setPerms] = useState<Permissions>(() => {
    // Try to get role from JWT in localStorage
    try {
      const token = localStorage.getItem('token')
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]))
        const role = payload.role || 'viewer'
        return { role, ...ROLE_PERMISSIONS[role] }
      }
    } catch {}
    return { role: 'viewer', ...ROLE_PERMISSIONS.viewer }
  })

  const refreshPerms = async () => {
    try {
      const res = await api.get('/auth/me')
      const user = res.data?.user || res.data
      if (user?.role) {
        setPerms({ role: user.role, ...ROLE_PERMISSIONS[user.role] })
      }
    } catch {}
  }

  useEffect(() => { refreshPerms() }, [])

  return (
    <PermissionsContext.Provider value={perms}>
      {children}
    </PermissionsContext.Provider>
  )
}

export function usePermissions() {
  return useContext(PermissionsContext)
}
