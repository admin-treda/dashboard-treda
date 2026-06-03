import { Link, useLocation } from 'react-router-dom'
import { useThemeStore } from '@/store/themeStore'
import { usePermissions } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Cloud,
  ShieldAlert,
  DollarSign,
  Bell,
  Globe,
  FileText,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

export function Sidebar() {
  const location = useLocation()
  const { collapsed, toggleCollapsed } = useThemeStore()
  const perms = usePermissions()

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, show: perms.canViewDashboard },
    { path: '/accounts', label: 'Cuentas', icon: Cloud, show: perms.canViewDashboard },
    { path: '/events', label: 'Seguridad', icon: ShieldAlert, show: perms.canViewEvents },
    { path: '/pentest', label: 'Pentest', icon: Shield, show: perms.canRunPentest },
    { path: '/costs', label: 'Costos', icon: DollarSign, show: perms.canViewCosts },
    { path: '/notifications', label: 'Notificaciones', icon: Bell, show: perms.canViewDashboard },
    { path: '/noticias', label: 'Noticias', icon: Globe, show: perms.canViewDashboard },
    { path: '/reports', label: 'Informes', icon: FileText, show: perms.canViewReports },
    { path: '/settings', label: 'Configuración', icon: Settings, show: perms.canManageUsers || perms.canConfig },
  ].filter(item => item.show)

  return (
    <aside
      className={cn(
        'fixed left-0 top-16 bottom-0 z-30 flex flex-col border-r border-border bg-card transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className="flex items-center gap-2 px-4 py-4 border-b border-border">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-primary font-bold text-sm">T</span>
        </div>
        {!collapsed && (
          <span className="text-sm font-bold tracking-wider">TREDA</span>
        )}
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {menuItems.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path || location.pathname.startsWith(path + '/')
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 group',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className={cn('h-4 w-4 flex-shrink-0', isActive && 'text-primary')} />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Role badge */}
      {!collapsed && (
        <div className="px-3 py-2 border-t border-border">
          <div className="text-[10px] text-muted-foreground font-display uppercase tracking-wider">
            Rol: <span className="text-[#BF00FF]">{perms.role}</span>
          </div>
        </div>
      )}

      <button
        onClick={toggleCollapsed}
        className="absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors z-10"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </aside>
  )
}
