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
  Search,
  LogOut,
  User,
  Settings,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

export function Header() {
  const navigate = useNavigate()
  const { toggleSidebar } = useThemeStore()
  const { user, logout } = useAuthStore()
  const [notifications, setNotifications] = useState<any[]>([])
  const [currentTime, setCurrentTime] = useState(new Date())

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

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const timeStr = currentTime.toLocaleTimeString('es-ES', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    hour12: false 
  })

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neon-cyan/15 bg-background/80 backdrop-blur-md">
      <div className="flex h-16 items-center px-4 gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleSidebar} 
          className="shrink-0 text-muted-foreground hover:text-neon-cyan hover:bg-neon-cyan/5"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg gradient-brand flex items-center justify-center">
            <span className="text-black font-bold text-sm font-display">T</span>
          </div>
          <div className="hidden sm:block">
            <span className="font-bold text-lg gradient-animated font-display tracking-wider">TREDA</span>
          </div>
        </div>

        <div className="flex-1 px-4 max-w-md hidden md:block">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar..."
              className="pl-8 bg-muted/50 border-neon-cyan/10 focus:border-neon-cyan focus:shadow-[0_0_12px_rgba(0,255,255,0.15)] font-mono text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          {/* Live clock */}
          <div className="hidden sm:flex items-center px-3 py-1.5 border border-neon-yellow/30 bg-neon-yellow/5 rounded">
            <span className="font-mono text-sm text-neon-yellow tracking-wider">{timeStr}</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative text-muted-foreground hover:text-neon-blue hover:bg-neon-blue/5"
              >
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-neon-blue text-black border-none shadow-[0_0_8px_rgba(30,90,200,0.4)]">
                    {notifications.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-background/95 backdrop-blur-md border-neon-cyan/15">
              <DropdownMenuLabel className="font-display text-neon-cyan tracking-wider">Notificaciones</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-neon-cyan/10" />
              {notifications.length === 0 ? (
                <DropdownMenuItem disabled className="text-muted-foreground">Sin notificaciones</DropdownMenuItem>
              ) : (
                notifications.map((n, i) => (
                  <DropdownMenuItem key={i} className="flex flex-col items-start gap-1 hover:bg-neon-cyan/5">
                    <span className={`font-medium font-display text-xs ${n.severity === 'critical' ? 'text-neon-red' : 'text-neon-yellow'}`}>{n.title}</span>
                    <span className="text-xs text-muted-foreground font-mono">{n.desc}</span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative h-8 w-8 rounded-full hover:bg-neon-cyan/5 transition-colors">
                <Avatar className="h-8 w-8 border border-neon-cyan/20">
                  <AvatarFallback className="bg-gradient-to-br from-neon-cyan to-neon-blue text-black font-bold font-display">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-md border-neon-cyan/15">
              <DropdownMenuLabel className="font-display text-neon-cyan">{user?.name || 'Usuario'}</DropdownMenuLabel>
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal font-mono">
                {user?.email || ''}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-neon-cyan/10" />
              <DropdownMenuItem onClick={() => toast.info(`${user?.name || 'Usuario'} · ${user?.email || ''} · Rol: ${user?.role || 'admin'}`)} className="hover:bg-neon-cyan/5">
                <User className="mr-2 h-4 w-4 text-neon-cyan" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/settings')} className="hover:bg-neon-cyan/5">
                <Settings className="mr-2 h-4 w-4 text-neon-cyan" />
                Configuración
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-neon-cyan/10" />
              <DropdownMenuItem onClick={logout} className="hover:bg-neon-red/5 text-neon-red">
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