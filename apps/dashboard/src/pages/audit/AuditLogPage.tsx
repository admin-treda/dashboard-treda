import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  History, Search, User, Shield, Download, ChevronLeft, ChevronRight,
  LogIn, Key, Settings, AlertTriangle, Trash2, Eye, FileText,
} from 'lucide-react'

interface AuditEntry {
  id: string
  userId?: string
  username: string
  action: string
  resource: string
  detail?: Record<string, any>
  ip?: string
  userAgent?: string
  createdAt: string
}

const actionConfig: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  LOGIN_SUCCESS: { color: 'text-[#00FF88]', bg: 'bg-[#00FF88]/10', icon: LogIn, label: 'LOGIN OK' },
  LOGIN_FAILED: { color: 'text-[#FF4444]', bg: 'bg-[#FF4444]/10', icon: AlertTriangle, label: 'LOGIN FAIL' },
  LOGIN_BLOCKED: { color: 'text-[#FF4444]', bg: 'bg-[#FF4444]/10', icon: Shield, label: 'BLOQUEADO' },
  PASSWORD_CHANGED: { color: 'text-[#3B82F6]', bg: 'bg-[#3B82F6]/10', icon: Key, label: 'PWD CHANGE' },
  PASSWORD_CHANGE_FAILED: { color: 'text-[#FF4444]', bg: 'bg-[#FF4444]/10', icon: AlertTriangle, label: 'PWD FAIL' },
  MFA_ENABLED: { color: 'text-[#00E5FF]', bg: 'bg-[#00E5FF]/10', icon: Shield, label: 'MFA ON' },
  MFA_DISABLED: { color: 'text-[#FFD700]', bg: 'bg-[#FFD700]/10', icon: Key, label: 'MFA OFF' },
  MFA_SETUP_INITIATED: { color: 'text-[#1E90FF]', bg: 'bg-[#1E90FF]/10', icon: Settings, label: 'MFA SETUP' },
  USER_CREATED: { color: 'text-[#00FF88]', bg: 'bg-[#00FF88]/10', icon: User, label: 'USER +1' },
  USER_DELETED: { color: 'text-[#FF4444]', bg: 'bg-[#FF4444]/10', icon: Trash2, label: 'USER DEL' },
  USER_UPDATED: { color: 'text-[#3B82F6]', bg: 'bg-[#3B82F6]/10', icon: User, label: 'USER MOD' },
  PENTEST_STARTED: { color: 'text-[#FF9500]', bg: 'bg-[#FF9500]/10', icon: Shield, label: 'SCAN +' },
  REPORT_GENERATED: { color: 'text-[#00E5FF]', bg: 'bg-[#00E5FF]/10', icon: FileText, label: 'INFORME' },
}

export function AuditLogPage() {
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [actionFilter, setActionFilter] = useState('all')
  const [search, setSearch] = useState('')
  const limit = 30

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ limit: String(limit), offset: String(page * limit) })
      if (actionFilter !== 'all') params.set('action', actionFilter)
      const res = await api.get(`/auth/audit-logs?${params.toString()}`)
      const body = res.data
      setLogs(body.logs || body.data || [])
      setTotal(body.total || 0)
    } catch {
      toast.error('Error al cargar auditoría')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLogs() }, [page, actionFilter])

  const filtered = logs.filter(l => {
    if (!search) return true
    const q = search.toLowerCase()
    return l.username.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      l.resource.toLowerCase().includes(q)
  })

  const exportCSV = () => {
    const headers = ['Fecha', 'Usuario', 'Acción', 'Recurso', 'IP', 'Detalle']
    const rows = filtered.map(l => [
      new Date(l.createdAt).toLocaleString('es-CO'),
      l.username,
      l.action,
      l.resource,
      l.ip || '',
      l.detail ? JSON.stringify(l.detail) : '',
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `audit_log_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    toast.success('CSV exportado')
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold gradient-animated font-display tracking-wider">// AUDITORÍA</h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">Registro de actividad del sistema — {total} entradas</p>
        </div>
        <Button variant="outline" className="gap-2 border-[#00E5FF]/20 hover:border-[#00E5FF]/50" onClick={exportCSV}>
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="glass-card border-white/5">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por usuario, acción..."
                className="pl-8 bg-muted/50 text-xs font-mono"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full sm:w-44 bg-muted/50">
                <SelectValue placeholder="Filtrar acción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las acciones</SelectItem>
                <SelectItem value="LOGIN_SUCCESS">Logins exitosos</SelectItem>
                <SelectItem value="LOGIN_FAILED">Logins fallidos</SelectItem>
                <SelectItem value="PASSWORD_CHANGED">Cambio de contraseña</SelectItem>
                <SelectItem value="MFA_ENABLED">MFA activado</SelectItem>
                <SelectItem value="USER_CREATED">Usuarios creados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Log Table */}
      <Card className="glass-card border-white/5">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <History className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm font-display">Sin registros de auditoría</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Las acciones se registrarán automáticamente</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5">
                    <TableHead className="font-display text-[10px] uppercase tracking-wider">Fecha</TableHead>
                    <TableHead className="font-display text-[10px] uppercase tracking-wider">Usuario</TableHead>
                    <TableHead className="font-display text-[10px] uppercase tracking-wider">Acción</TableHead>
                    <TableHead className="font-display text-[10px] uppercase tracking-wider">Recurso</TableHead>
                    <TableHead className="font-display text-[10px] uppercase tracking-wider">IP</TableHead>
                    <TableHead className="font-display text-[10px] uppercase tracking-wider">Detalle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((log) => {
                    const cfg = actionConfig[log.action] || { color: 'text-muted-foreground', bg: 'bg-muted/10', icon: Eye, label: log.action }
                    const Icon = cfg.icon
                    return (
                      <TableRow key={log.id} className="border-white/5 hover:bg-white/[0.02]">
                        <TableCell className="text-xs whitespace-nowrap font-mono">
                          {new Date(log.createdAt).toLocaleString('es-CO')}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-mono text-[#00E5FF] flex items-center gap-1">
                            <User className="h-3 w-3" /> {log.username}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] font-display gap-1 ${cfg.bg} ${cfg.color} border-${cfg.color.replace('text-', '')}/30`}>
                            <Icon className="h-3 w-3" /> {cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono">{log.resource}</TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">{log.ip || '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {log.detail ? JSON.stringify(log.detail) : '—'}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-white/5">
              <span className="text-xs text-muted-foreground font-mono">
                Página {page + 1} de {totalPages}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}
                  className="border-white/10 hover:border-[#00E5FF]/30">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
                  className="border-white/10 hover:border-[#00E5FF]/30">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
