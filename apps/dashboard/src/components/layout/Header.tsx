import { useState, useEffect } from 'react'
import { useThemeStore } from '@/store/themeStore'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Bell,
  Menu,
  Search,
  LogOut,
  User,
  Settings,
  Shield,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { GlobalSearch } from '@/components/search/GlobalSearch'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate()
  const { toggleSidebar } = useThemeStore()
  const { user, logout } = useAuthStore()
  const [notifications, setNotifications] = useState<any[]>([])
  const [currentTime, setCurrentTime] = useState(new Date())
  const [searchOpen, setSearchOpen] = useState(false)

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'Ctrl+K': () => setSearchOpen(true),
    'Ctrl+D': () => navigate('/dashboard'),
    'Ctrl+E': () => navigate('/events'),
    'Ctrl+P': () => navigate('/pentest'),
    'Ctrl+C': () => navigate('/costs'),
    'Ctrl+R': () => navigate('/reports'),
  })

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const [eventsRes, costsRes] = await Promise.all([
          api.get('/events?limit=3&severity=CRITICAL'),
          api.get('/costs'),
        ])
        const criticals = eventsRes.data?.data?.slice(0, 3) || []
        const alerts = costsRes.data?.alerts || []
        const items: any[] = []
        
        for (const evt of criticals) {
          items.push({ title: 'Evento crítico', desc: (evt.description || '').slice(0, 60), severity: 'critical' })
        }
        for (const alert of alerts) {
          items.push({ title: 'Alerta de costos', desc: `${alert.account_name || 'Cuenta'} superó el presupuesto`, severity: 'warning' })
        }
        
        setNotifications(items.slice(0, 5))
      } catch {}
    }
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const timeStr = currentTime.toLocaleTimeString('es-ES', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  })

  return (
    <>
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-card/80 backdrop-blur-xl">
        <div className="flex h-14 md:h-16 items-center px-3 md:px-4 gap-3">
          {/* Mobile menu button */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onMenuClick}
            className="md:hidden shrink-0 h-9 w-9 text-text-muted hover:text-neon-cyan hover:bg-neon-cyan/5"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Desktop sidebar toggle */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleSidebar} 
            className="hidden md:flex shrink-0 h-9 w-9 text-text-muted hover:text-neon-cyan hover:bg-neon-cyan/5"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg gradient-brand flex items-center justify-center shadow-lg shadow-neon-cyan/10">
              <Shield className="h-4 w-4 text-background" />
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-base gradient-animated tracking-wider">TREDA</span>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex-1 px-4 max-w-sm hidden md:block">
            <button 
              onClick={() => setSearchOpen(true)} 
              className="w-full flex items-center gap-2 px-3 py-1.5 bg-muted/30 border border-border/30 rounded-lg hover:border-neon-cyan/20 hover:bg-muted/40 transition-all text-left group"
              aria-label="Buscar"
            >
              <Search className="h-3.5 w-3.5 text-text-dim group-hover:text-neon-cyan/60 transition-colors" />
              <span className="text-xs text-text-dim font-mono">Buscar...</span>
              <kbd className="ml-auto text-[9px] text-text-dim/60 bg-muted/50 px-1.5 py-0.5 rounded border border-border/30 font-mono">⌘K</kbd>
            </button>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Clock */}
            <div className="hidden lg:flex items-center px-2.5 py-1 border border-border/30 bg-muted/20 rounded-md">
              <span className="font-mono text-xs text-text-secondary tracking-wider">{timeStr}</span>
            </div>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative h-9 w-9 text-text-muted hover:text-neon-blue hover:bg-neon-blue/5"
                  aria-label="Notificaciones"
                >
                  <Bell className="h-4 w-4" />
                  {notifications.length > 0 && (
                    <Badge className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center p-0 text-[9px] bg-neon-red text-white border-none rounded-full">
                      {notifications.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 bg-card/95 backdrop-blur-xl border-border/40 shadow-xl">
                <DropdownMenuLabel className="text-xs font-semibold text-neon-cyan tracking-wider uppercase">
                  Notificaciones
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/30" />
                {notifications.length === 0 ? (
                  <DropdownMenuItem disabled className="text-text-muted text-xs">
                    Sin notificaciones
                  </DropdownMenuItem>
                ) : (
                  notifications.map((n, i) => (
                    <DropdownMenuItem key={i} className="flex flex-col items-start gap-1 hover:bg-neon-cyan/5 cursor-pointer">
                      <span className={`text-xs font-medium ${n.severity === 'critical' ? 'text-neon-red' : 'text-neon-yellow'}`}>
                        {n.title}
                      </span>
                      <span className="text-[11px] text-text-muted font-mono truncate w-full">{n.desc}</span>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="relative h-8 w-8 rounded-full hover:ring-2 hover:ring-neon-cyan/20 transition-all"
                  aria-label="Menú de usuario"
                >
                  <Avatar className="h-8 w-8 border border-border/40">
                    <AvatarFallback className="bg-gradient-to-br from-neon-cyan/20 to-neon-blue/20 text-neon-cyan font-bold text-xs border border-neon-cyan/20">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card/95 backdrop-blur-xl border-border/40 shadow-xl w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-0.5">
                    <span className="text-sm font-medium text-foreground">{user?.name || 'Usuario'}</span>
                    <span className="text-[11px] text-text-muted font-mono">{user?.email || ''}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/30" />
                <DropdownMenuItem 
                  onClick={() => toast.info(`${user?.name} · ${user?.email} · ${user?.role}`)} 
                  className="hover:bg-neon-cyan/5 cursor-pointer text-xs"
                >
                  <User className="mr-2 h-3.5 w-3.5 text-neon-cyan/70" />
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onSelect={() => navigate('/settings')} 
                  className="hover:bg-neon-cyan/5 cursor-pointer text-xs"
                >
                  <Settings className="mr-2 h-3.5 w-3.5 text-neon-cyan/70" />
                  Configuración
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border/30" />
                <DropdownMenuItem 
                  onClick={logout} 
                  className="hover:bg-neon-red/5 cursor-pointer text-neon-red text-xs"
                >
                  <LogOut className="mr-2 h-3.5 w-3.5" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
    </>
  )
}
