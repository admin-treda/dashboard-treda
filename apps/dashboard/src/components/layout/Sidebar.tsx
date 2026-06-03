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
  Shield,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/accounts', label: 'Cuentas', icon: Cloud },
  { path: '/events', label: 'Seguridad', icon: ShieldAlert },
  { path: '/pentest', label: 'Pentest', icon: Shield },
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
        'fixed left-0 top-16 z-30 h-[calc(100vh-4rem)] border-r border-neon-cyan/10 bg-background/95 backdrop-blur-md transition-all duration-300',
        sidebarCollapsed ? 'w-[4rem]' : 'w-[16rem]'
      )}
      style={{
        boxShadow: '4px 0 30px rgba(0, 255, 255, 0.05)',
      }}
    >
      {/* Neon border glow */}
      <div 
        className="absolute top-0 right-0 w-[2px] h-full"
        style={{
          background: 'linear-gradient(180deg, hsl(180 100% 50%), hsl(330 100% 50%), hsl(280 100% 60%), hsl(180 100% 50%))',
          opacity: 0.3,
          animation: 'border-glow 3s ease-in-out infinite',
        }}
      />

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
                    'aurora-nav-item',
                    isActive && 'active'
                  )}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon className={cn(
                    'h-5 w-5 shrink-0 transition-all duration-200',
                    isActive 
                      ? 'text-neon-cyan drop-shadow-[0_0_6px_rgba(0,255,255,0.5)]' 
                      : 'text-muted-foreground'
                  )} />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="border-t border-neon-cyan/10 p-2">
          <button
            onClick={toggleSidebar}
            className="flex w-full items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-neon-cyan/5 hover:text-neon-cyan transition-all duration-200"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <div className="flex items-center gap-2">
                <ChevronLeft className="h-5 w-5" />
                <span className="text-sm font-medium">Colapsar</span>
              </div>
            )}
          </button>
        </div>
      </div>
    </aside>
  )
}