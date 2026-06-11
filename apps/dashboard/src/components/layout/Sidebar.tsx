import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useThemeStore } from '@/store/themeStore'
import { usePermissions } from '@/lib/permissions'
import { useBusinessUnit } from '@/contexts/BusinessUnitContext'
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
  GraduationCap,
  ClipboardCheck,
  AlertTriangle as AlertTriangleIcon,
  ShieldCheck,
  Building2,
  Shield,
  Brain,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Activity,
  History,
  Bug,
  AlertTriangle,
  Server,
  X,
  Target,
} from 'lucide-react'

interface SidebarProps {
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const location = useLocation()
  const { sidebarCollapsed: collapsed, toggleSidebar: toggleCollapsed } = useThemeStore()
  const perms = usePermissions()
  const { units, selectedBU, setSelectedBU, loading: buLoading } = useBusinessUnit()
  const [buDropdownOpen, setBuDropdownOpen] = useState(false)

  const selectedUnit = units.find(u => u.id === selectedBU)

  const mainMenuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, show: perms.canViewDashboard, group: 'main' },
    { path: '/accounts', label: 'Cuentas', icon: Cloud, show: perms.canViewDashboard, group: 'main' },
    { path: '/events', label: 'Seguridad', icon: ShieldAlert, show: perms.canViewEvents, group: 'security' },
    { path: '/pentest', label: 'Pentest', icon: Shield, show: perms.canRunPentest, group: 'security' },
    { path: '/vulnerabilities', label: 'Vulnerabilidades', icon: Bug, show: perms.canViewEvents, group: 'security' },
    { path: '/incidents', label: 'Incidentes', icon: AlertTriangle, show: perms.canViewEvents, group: 'security' },
    { path: '/costs', label: 'Costos', icon: DollarSign, show: perms.canViewCosts, group: 'ops' },
    { path: '/health', label: 'Salud', icon: Activity, show: perms.canViewDashboard, group: 'ops' },
    { path: '/assets', label: 'Inventario', icon: Server, show: perms.canViewDashboard, group: 'ops' },
    { path: '/compliance', label: 'Compliance', icon: ClipboardCheck, show: perms.canViewDashboard, group: 'ops' },
    { path: '/notifications', label: 'Alertas', icon: Bell, show: perms.canViewDashboard, group: 'tools' },
    { path: '/noticias', label: 'Noticias', icon: Globe, show: perms.canViewDashboard, group: 'tools' },
    { path: '/reports', label: 'Informes', icon: FileText, show: perms.canViewReports, group: 'tools' },
    { path: '/settings', label: 'Configuración', icon: Settings, show: perms.canManageUsers || perms.canConfig, group: 'admin' },
    { path: '/honcho', label: 'Honcho', icon: Brain, show: true, group: 'admin' },
  ].filter(item => item.show)

  // ISO submenu items - shown when a BU is selected
  const isoMenuItems = [
    { path: '/isms', label: 'SGSI', icon: Target },
    { path: '/risks', label: 'Riesgos', icon: AlertTriangle },
    { path: '/soa', label: 'SoA', icon: ShieldCheck },
    { path: '/documents', label: 'Documentos', icon: FileText },
    { path: '/training', label: 'Capacitación', icon: GraduationCap },
    { path: '/audit-program', label: 'Auditorías', icon: ClipboardCheck },
    { path: '/capa', label: 'CAPA', icon: AlertTriangleIcon },
  ]

  const groups = [
    { id: 'main', label: 'Principal' },
    { id: 'security', label: 'Seguridad' },
    { id: 'ops', label: 'Operaciones' },
    { id: 'tools', label: 'Herramientas' },
    { id: 'admin', label: 'Administración' },
  ]

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border/50">
        <div className="h-8 w-8 rounded-lg gradient-brand flex items-center justify-center flex-shrink-0 shadow-lg shadow-neon-cyan/10">
          <span className="font-bold text-sm text-background">T</span>
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold tracking-wider gradient-animated">TREDA</span>
            <p className="text-[9px] text-text-dim font-mono uppercase tracking-widest">Multi-Cloud</p>
          </div>
        )}
        {/* Mobile close button */}
        {onMobileClose && (
          <button 
            onClick={onMobileClose}
            className="md:hidden h-7 w-7 rounded-lg flex items-center justify-center text-text-muted hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-4 overflow-y-auto scrollbar-thin">
        {/* Main menu groups */}
        {groups.map(group => {
          const groupItems = mainMenuItems.filter(item => item.group === group.id)
          if (groupItems.length === 0) return null
          
          return (
            <div key={group.id} className="space-y-1">
              {!collapsed && (
                <p className="px-3 py-1 text-[9px] font-semibold text-text-dim uppercase tracking-[0.15em]">
                  {group.label}
                </p>
              )}
              {groupItems.map(({ path, label, icon: Icon }) => {
                const isActive = location.pathname === path || location.pathname.startsWith(path + '/')
                return (
                  <Link
                    key={path}
                    to={path}
                    onClick={onMobileClose}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 group relative',
                      isActive
                        ? 'bg-neon-cyan/8 text-neon-cyan font-medium'
                        : 'text-text-muted hover:bg-muted/40 hover:text-text-secondary'
                    )}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-neon-cyan rounded-r-full shadow-[0_0_8px_hsl(var(--neon-cyan)/0.4)]" />
                    )}
                    <Icon className={cn(
                      'h-4 w-4 flex-shrink-0 transition-colors',
                      isActive ? 'text-neon-cyan' : 'text-text-dim group-hover:text-text-secondary'
                    )} />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </Link>
                )
              })}
            </div>
          )
        })}

        {/* ISO 27001 Section with BU Selector */}
        <div className="space-y-1">
          {!collapsed && (
            <p className="px-3 py-1 text-[9px] font-semibold text-text-dim uppercase tracking-[0.15em]">
              ISO 27001
            </p>
          )}
          
          {/* Always show Unidades link */}
          <Link
            to="/business-units"
            onClick={onMobileClose}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 group relative',
              collapsed ? 'justify-center' : '',
              location.pathname === '/business-units'
                ? 'bg-neon-cyan/8 text-neon-cyan font-medium'
                : 'text-text-muted hover:bg-muted/40 hover:text-text-secondary'
            )}
          >
            {location.pathname === '/business-units' && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-neon-cyan rounded-r-full shadow-[0_0_8px_hsl(var(--neon-cyan)/0.4)]" />
            )}
            <Building2 className={cn(
              'h-4 w-4 flex-shrink-0 transition-colors',
              location.pathname === '/business-units' ? 'text-neon-cyan' : 'text-text-dim group-hover:text-text-secondary'
            )} />
            {!collapsed && <span className="truncate">Unidades</span>}
          </Link>
          
          {/* Business Unit Selector - only when NOT on business-units page */}
          {!collapsed && location.pathname !== '/business-units' && (
            <div className="px-2 mb-2">
              <div className="relative">
                <button
                  onClick={() => setBuDropdownOpen(!buDropdownOpen)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] transition-all border',
                    selectedBU
                      ? 'bg-neon-cyan/8 border-neon-cyan/30 text-neon-cyan'
                      : 'bg-muted/30 border-border/30 text-text-muted hover:border-neon-cyan/20'
                  )}
                >
                  <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="flex-1 text-left truncate">
                    {selectedUnit ? selectedUnit.name : 'Seleccionar unidad'}
                  </span>
                  <ChevronDown className={cn(
                    'h-3.5 w-3.5 transition-transform',
                    buDropdownOpen && 'rotate-180'
                  )} />
                </button>
                
                {buDropdownOpen && (
                  <div className="ml-2 mt-1 space-y-0.5">
                    <button
                      onClick={() => { setSelectedBU(null); setBuDropdownOpen(false) }}
                      className={cn(
                        'w-full text-left px-3 py-1.5 rounded text-[11px] hover:bg-muted/30 transition-colors',
                        !selectedBU ? 'text-neon-cyan bg-muted/20' : 'text-text-muted'
                      )}
                    >
                      Todas las unidades
                    </button>
                    {units.map(u => (
                      <button
                        key={u.id}
                        onClick={() => { setSelectedBU(u.id); setBuDropdownOpen(false) }}
                        className={cn(
                          'w-full text-left px-3 py-1.5 rounded text-[11px] hover:bg-muted/30 transition-colors',
                          selectedBU === u.id ? 'text-neon-cyan bg-muted/20' : ''
                        )}
                      >
                        <div className="font-medium">{u.name}</div>
                        {u.industry && <div className="text-[9px] text-text-dim">{u.industry}</div>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}


          {/* ISO Sub-menu items - only show when a BU is selected */}
          {selectedBU && isoMenuItems.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path
            return (
              <Link
                key={path}
                to={path}
                onClick={onMobileClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 group relative',
                  collapsed ? 'justify-center' : 'pl-6',
                  isActive
                    ? 'bg-neon-cyan/8 text-neon-cyan font-medium'
                    : 'text-text-muted hover:bg-muted/40 hover:text-text-secondary'
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-neon-cyan rounded-r-full shadow-[0_0_8px_hsl(var(--neon-cyan)/0.4)]" />
                )}
                <Icon className={cn(
                  'h-4 w-4 flex-shrink-0 transition-colors',
                  isActive ? 'text-neon-cyan' : 'text-text-dim group-hover:text-text-secondary'
                )} />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            )
          })}

          {/* Show message when no BU selected */}
          {!collapsed && !selectedBU && !buLoading && units.length > 0 && (
            <p className="px-6 py-2 text-[11px] text-text-dim italic">
              Selecciona una unidad para ver los módulos
            </p>
          )}
        </div>

        {/* Audit section */}
        <div className="space-y-1">
          {!collapsed && (
            <p className="px-3 py-1 text-[9px] font-semibold text-text-dim uppercase tracking-[0.15em]">
              Auditoría
            </p>
          )}
          <Link
            to="/audit"
            onClick={onMobileClose}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 group relative',
              location.pathname === '/audit'
                ? 'bg-neon-cyan/8 text-neon-cyan font-medium'
                : 'text-text-muted hover:bg-muted/40 hover:text-text-secondary'
            )}
          >
            {location.pathname === '/audit' && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-neon-cyan rounded-r-full shadow-[0_0_8px_hsl(var(--neon-cyan)/0.4)]" />
            )}
            <History className={cn(
              'h-4 w-4 flex-shrink-0 transition-colors',
              location.pathname === '/audit' ? 'text-neon-cyan' : 'text-text-dim group-hover:text-text-secondary'
            )} />
            {!collapsed && <span className="truncate">Registro de Auditoría</span>}
          </Link>
        </div>
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="px-3 py-3 border-t border-border/50">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/30 border border-border/30">
            <span className="status-dot active" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-medium text-text-secondary truncate">{perms.role.toUpperCase()}</p>
              <p className="text-[9px] text-text-dim font-mono">Sistema operativo</p>
            </div>
          </div>
        </div>
      )}
    </>
  )

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        data-open={mobileOpen}
        className={cn(
          'fixed left-0 top-0 bottom-0 z-50 flex flex-col border-r border-border/50 bg-card/95 backdrop-blur-xl transition-all duration-300',
          // Mobile
          'md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop
          collapsed ? 'md:w-16' : 'md:w-60',
          // Mobile always full width when open
          !collapsed && 'w-60'
        )}
      >
        {/* Mobile top padding to account for header */}
        <div className="h-16 md:hidden flex-shrink-0" />
        
        {sidebarContent}

        {/* Collapse toggle - desktop only */}
        <button
          onClick={toggleCollapsed}
          className="hidden md:flex absolute -right-3 top-20 h-6 w-6 rounded-full bg-card border border-border/50 items-center justify-center hover:bg-muted hover:border-neon-cyan/20 transition-all z-10 shadow-md"
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          {collapsed ? <ChevronRight className="h-3 w-3 text-text-muted" /> : <ChevronLeft className="h-3 w-3 text-text-muted" />}
        </button>
      </aside>
    </>
  )
}
