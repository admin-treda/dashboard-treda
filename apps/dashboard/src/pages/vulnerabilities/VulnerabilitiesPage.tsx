import { useState, useEffect, useMemo } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Bug, ShieldAlert, AlertTriangle, CheckCircle, Search,
  Download, Filter,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts'

const sevCfg: Record<string, { color: string; label: string }> = {
  critical: { color: '#EF4444', label: 'CRÍTICO' },
  high: { color: '#F59E0B', label: 'ALTO' },
  medium: { color: '#3B82F6', label: 'MEDIO' },
  low: { color: '#10B981', label: 'BAJO' },
  info: { color: '#6B7280', label: 'INFO' },
}

const statusCfg: Record<string, { color: string; label: string }> = {
  open: { color: '#EF4444', label: 'ABIERTO' },
  'in-progress': { color: '#EAB308', label: 'EN PROGRESO' },
  remediated: { color: '#10B981', label: 'REMEDIADO' },
  accepted: { color: '#6B7280', label: 'ACEPTADO' },
  'false-positive': { color: '#6B7280', label: 'FALSO POSITIVO' },
}

export function VulnerabilitiesPage() {
  const [loading, setLoading] = useState(true)
  const [vulns, setVulns] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [stats, setStats] = useState({ total: 0, open: 0, remediated: 0, critical: 0 })

  const fetchVulns = async () => {
    try {
      setLoading(true)
      const res = await api.get('/vulnerabilities').catch(() => ({ data: { vulns: [], stats: {} } }))
      const data = res.data || {}
      setVulns(data.vulns || data.data || [])
      setStats(data.stats || { total: 0, open: 0, remediated: 0, critical: 0 })
    } catch { toast.error('Error al cargar vulnerabilidades') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchVulns() }, [])

  const filtered = useMemo(() => {
    return vulns.filter(v => {
      const matchSearch = !search || (v.title || '').toLowerCase().includes(search.toLowerCase()) || (v.description || '').toLowerCase().includes(search.toLowerCase())
      const matchSev = severityFilter === 'all' || v.severity === severityFilter
      const matchStatus = statusFilter === 'all' || (v.status || 'open') === statusFilter
      return matchSearch && matchSev && matchStatus
    })
  }, [vulns, search, severityFilter, statusFilter])

  // Severity distribution for chart
  const severityData = useMemo(() => {
    const counts: Record<string, number> = {}
    vulns.forEach(v => {
      const sev = v.severity?.toLowerCase() || 'info'
      counts[sev] = (counts[sev] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({
      name: sevCfg[name]?.label || name.toUpperCase(),
      value,
      color: sevCfg[name]?.color || '#6B7280',
    }))
  }, [vulns])

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await api.patch(`/vulnerabilities/${id}`, { status: newStatus })
      setVulns(prev => prev.map(v => v.id === id ? { ...v, status: newStatus } : v))
      toast.success('Estado actualizado')
    } catch { toast.error('Error al actualizar') }
  }

  const exportCSV = () => {
    const headers = ['Título', 'Severidad', 'Estado', 'Herramienta', 'Descripción', 'Detectado']
    const rows = filtered.map(v => [v.title, v.severity, v.status || 'open', v.tool || '', v.description || '', v.createdAt || ''])
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `vulns_${new Date().toISOString().slice(0,10)}.csv`; a.click()
    toast.success('CSV exportado')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold gradient-animated tracking-tight">Vulnerabilidades</h1>
          <p className="text-xs text-text-muted font-mono mt-1">Gestión y seguimiento de vulnerabilidades detectadas</p>
        </div>
        <Button 
          variant="outline" 
          className="gap-2 border-border/40 hover:border-neon-cyan/30 hover:bg-neon-cyan/5 text-text-secondary hover:text-neon-cyan" 
          onClick={exportCSV}
        >
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 animate-stagger">
        {[
          { label: 'Total', value: stats.total, color: '#06B6D4', icon: Bug },
          { label: 'Abiertas', value: stats.open, color: '#EF4444', icon: ShieldAlert },
          { label: 'Remediadas', value: stats.remediated, color: '#10B981', icon: CheckCircle },
          { label: 'Críticas', value: stats.critical, color: '#EF4444', icon: AlertTriangle },
        ].map(s => (
          <div key={s.label} className="metric-card" style={{ '--metric-color': s.color } as any}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider">{s.label}</p>
                <h3 className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</h3>
              </div>
              <div className="h-10 w-10 rounded-xl flex items-center justify-center border" style={{ backgroundColor: `${s.color}10`, borderColor: `${s.color}20` }}>
                <s.icon className="h-5 w-5" style={{ color: s.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Severity Distribution Chart */}
      {!loading && severityData.length > 0 && (
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-neon-purple tracking-wider uppercase flex items-center gap-2">
              <div className="h-1 w-4 bg-neon-purple rounded-full" />
              Distribución por Severidad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie 
                    data={severityData} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={45} 
                    outerRadius={70} 
                    paddingAngle={2} 
                    dataKey="value" 
                    stroke="none"
                  >
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      background: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))', 
                      borderRadius: 8, 
                      fontSize: 11 
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {severityData.map(s => (
                  <div key={s.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color, boxShadow: `0 0 6px ${s.color}` }} />
                      <span className="text-xs text-text-secondary">{s.name}</span>
                    </div>
                    <span className="text-sm font-bold font-mono" style={{ color: s.color }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-dim" />
              <Input 
                placeholder="Buscar vulnerabilidades..." 
                className="pl-9 bg-muted/30 border-border/30 text-xs" 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
              />
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-full sm:w-36 bg-muted/30 border-border/30">
                <Filter className="h-3.5 w-3.5 mr-1 text-text-dim" />
                <SelectValue placeholder="Severidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="critical">Crítico</SelectItem>
                <SelectItem value="high">Alto</SelectItem>
                <SelectItem value="medium">Medio</SelectItem>
                <SelectItem value="low">Bajo</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-36 bg-muted/30 border-border/30">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="open">Abierto</SelectItem>
                <SelectItem value="in-progress">En Progreso</SelectItem>
                <SelectItem value="remediated">Remediado</SelectItem>
                <SelectItem value="accepted">Aceptado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Vulns Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">{Array.from({length: 6}).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state py-12">
              <div className="empty-state-icon">
                <Bug className="h-6 w-6 text-text-dim" />
              </div>
              <p className="text-sm text-text-muted">Sin vulnerabilidades registradas</p>
              <p className="text-xs text-text-dim mt-1">Los escaneos de pentest crean vulnerabilidades automáticamente</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4">
              <div className="min-w-[700px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/30 hover:bg-transparent">
                      {['Título', 'Severidad', 'Estado', 'Herramienta', 'Detectado', 'Acciones'].map(h => (
                        <TableHead key={h} className="text-[10px] text-neon-cyan/70 uppercase font-semibold tracking-wider">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(v => {
                      const sev = sevCfg[v.severity?.toLowerCase()] || sevCfg.info
                      const status = statusCfg[v.status || 'open'] || statusCfg.open
                      return (
                        <TableRow key={v.id} className="border-border/20 hover:bg-neon-cyan/3">
                          <TableCell>
                            <p className="text-sm font-medium text-text-secondary">{v.title}</p>
                            {v.description && <p className="text-[10px] text-text-muted truncate max-w-[300px] mt-0.5">{v.description}</p>}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[9px] font-medium" style={{ 
                              backgroundColor: `${sev.color}10`, 
                              color: sev.color, 
                              borderColor: `${sev.color}25` 
                            }}>
                              {sev.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[9px] font-medium" style={{ 
                              color: status.color, 
                              borderColor: `${status.color}30`,
                              backgroundColor: `${status.color}10`
                            }}>
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-mono text-text-dim">{v.tool || '—'}</TableCell>
                          <TableCell className="text-[10px] text-text-dim font-mono whitespace-nowrap">
                            {v.createdAt ? new Date(v.createdAt).toLocaleDateString('es-CO') : '—'}
                          </TableCell>
                          <TableCell>
                            <Select value={v.status || 'open'} onValueChange={(val) => updateStatus(v.id, val)}>
                              <SelectTrigger className="w-28 h-7 text-[10px] bg-muted/30 border-border/30">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="open">Abierto</SelectItem>
                                <SelectItem value="in-progress">En Progreso</SelectItem>
                                <SelectItem value="remediated">Remediado</SelectItem>
                                <SelectItem value="accepted">Aceptado</SelectItem>
                                <SelectItem value="false-positive">Falso Positivo</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
