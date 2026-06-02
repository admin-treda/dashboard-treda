import { Link, useLocation } from 'react-router-dom'
import { useThemeStore } from '@/store/themeStore'
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
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/accounts', label: 'Cuentas', icon: Cloud },
  { path: '/events', label: 'Seguridad', icon: ShieldAlert },
  { path: '/costs', label: 'Costos', icon: DollarSign },
  { path: '/notifications', label: 'Notificaciones', icon: Bell },
  { path: '/noticias', label: 'Noticias', icon: Globe },
  { path: '/reports', label: 'Informes', icon: FileText },
  { path: '/settings', label: 'Configuración', icon: Settings },
]

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useThemeStore()
  const location = useLocation()

  return (
    <aside
      className={cn(
        'fixed left-0 top-16 z-30 h-[calc(100vh-4rem)] border-r bg-background/95 backdrop-blur-md transition-all duration-300',
        sidebarCollapsed ? 'w-[4rem]' : 'w-[16rem]'
      )}
    >
      <div className="flex flex-col h-full">
        <div className="flex-1 py-4">
          <nav className="space-y-1 px-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary/15 text-accent-cyan shadow-sm'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  )}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-accent-cyan')} />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="border-t p-2">
          <button
            onClick={toggleSidebar}
            className="flex w-full items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <div className="flex items-center gap-2">
                <ChevronLeft className="h-5 w-5" />
                <span className="text-sm">Colapsar</span>
              </div>
            )}
          </button>
        </div>
      </div>
    </aside>
  )
}
