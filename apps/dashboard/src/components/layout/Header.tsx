import { useState, useEffect } from 'react'
import { useThemeStore } from '@/store/themeStore'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
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
  Moon,
  Search,
  Sun,
  LogOut,
  User,
  Settings,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { api } from '@/lib/api'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

export function Header() {
  const navigate = useNavigate()
  const { toggleSidebar } = useThemeStore()
  const { user, logout } = useAuthStore()
  const { theme, setTheme } = useTheme()
  const [notifications, setNotifications] = useState<any[]>([])

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
      } catch {
        // silently fail
      }
    }
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="flex h-16 items-center px-4 gap-4">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="shrink-0">
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg gradient-brand flex items-center justify-center">
            <span className="text-white font-bold text-sm">TS</span>
          </div>
          <span className="font-bold text-lg hidden sm:inline-block text-gradient">Dashboard Treda</span>
        </div>

        <div className="flex-1 px-4 max-w-md hidden md:block">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar..."
              className="pl-8 bg-muted/50"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]">
                    {notifications.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <DropdownMenuItem disabled>Sin notificaciones</DropdownMenuItem>
              ) : (
                notifications.map((n, i) => (
                  <DropdownMenuItem key={i} className="flex flex-col items-start gap-1">
                    <span className={`font-medium ${n.severity === 'critical' ? 'text-critical' : 'text-warning'}`}>{n.title}</span>
                    <span className="text-xs text-muted-foreground">{n.desc}</span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative h-8 w-8 rounded-full hover:bg-muted transition-colors">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary-navy text-white">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user?.name || 'Usuario'}</DropdownMenuLabel>
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                {user?.email || ''}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => toast.info(`${user?.name || 'Usuario'} · ${user?.email || ''} · Rol: ${user?.role || 'admin'}`)}>
                <User className="mr-2 h-4 w-4" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Configuración
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
