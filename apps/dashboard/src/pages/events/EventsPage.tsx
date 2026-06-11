import { useState, useEffect, useMemo, useRef } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Search, Download, Filter, Calendar, ShieldAlert, AlertTriangle, Info, CheckCircle2, User, Clock, X, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import { EventHeatmap } from '@/components/charts/EventHeatmap'

const severityConfig: Record<string, { color: string; bg: string; border: string; icon: any; label: string; glow: string }> = {
  CRITICAL: { color: 'text-[#EF4444]', bg: 'bg-[#EF4444]/15', border: 'border-[#EF4444]/30', icon: ShieldAlert, label: 'CRÍTICO', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.15)]' },
  HIGH: { color: 'text-[#F59E0B]', bg: 'bg-[#F59E0B]/15', border: 'border-[#F59E0B]/30', icon: AlertTriangle, label: 'ALTO', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]' },
  MEDIUM: { color: 'text-[#3B82F6]', bg: 'bg-[#3B82F6]/15', border: 'border-[#3B82F6]/30', icon: Info, label: 'MEDIO', glow: 'shadow-[0_0_15px_rgba(59,130,246,0.15)]' },
  LOW: { color: 'text-[#10B981]', bg: 'bg-[#10B981]/15', border: 'border-[#10B981]/30', icon: CheckCircle2, label: 'BAJO', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]' },
}

const providerBadge: Record<string, string> = {
  AWS: 'bg-[#FF9900]/10 text-[#FF9900] border-[#FF9900]/30',
  AZURE: 'bg-[#0078D4]/10 text-[#0078D4] border-[#0078D4]/30',
  M365: 'bg-[#D83B01]/10 text-[#D83B01] border-[#D83B01]/30',
}

const providerLabel: Record<string, string> = {
  AWS: 'AWS',
  AZURE: 'Azure',
  M365: 'M365',
}

export function EventsPage() {
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<any[]>([])
  const [summary, setSummary] = useState<any>({})
  const [search, setSearch] = useState('')
  const [providerFilter, setProviderFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [realTimeEnabled, setRealTimeEnabled] = useState(false)
  const [newEventAlert, setNewEventAlert] = useState<any>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (severityFilter !== 'all') params.set('severity', severityFilter)
      if (providerFilter !== 'all') params.set('provider', providerFilter)
      if (dateFrom) params.set('from', dateFrom)
      if (dateTo) params.set('to', dateTo)
      params.set('limit', '100')
      const res = await api.get(`/events?${params.toString()}`)
      const body = res.data
      if (body && Array.isArray(body.data)) {
        setEvents(body.data)
        setSummary(body.summary || {})
      } else {
        setEvents([])
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al cargar eventos')
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [severityFilter, providerFilter, dateFrom, dateTo])

  // Real-time SSE for critical events
  useEffect(() => {
    if (!realTimeEnabled) {
      if (eventSourceRef.current) { eventSourceRef.current.close(); eventSourceRef.current = null }
      return
    }
    try {
      const apiBase = (api.defaults.baseURL || '').replace(/\/$/, '')
      const token = localStorage.getItem('token')
      const es = new EventSource(`${apiBase}/events/stream?token=${token}`)
      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          if (data.severity === 'CRITICAL' || data.severity === 'HIGH') {
            setNewEventAlert(data)
            setTimeout(() => setNewEventAlert(null), 5000)
          }
          fetchEvents()
        } catch {}
      }
      es.onerror = () => { es.close(); setRealTimeEnabled(false) }
      eventSourceRef.current = es
    } catch { setRealTimeEnabled(false) }
    return () => { eventSourceRef.current?.close() }
  }, [realTimeEnabled])

  const filtered = useMemo(() => {
    if (!search) return events
    const q = search.toLowerCase()
    return events.filter((e: any) =>
      (e.description || '').toLowerCase().includes(q) ||
      (e.type || '').toLowerCase().includes(q) ||
      (e.account?.name || '').toLowerCase().includes(q) ||
      (e.username || '').toLowerCase().includes(q)
    )
  }, [events, search])

  const exportCSV = () => {
    const headers = ['Fecha', 'Usuario', 'Cuenta', 'Proveedor', 'Tipo', 'Severidad', 'Descripción']
    const rows = filtered.map((e: any) => [
      new Date(e.createdAt).toLocaleString('es-CO'),
      e.username || 'N/A',
      e.account?.name || e.accountId || '',
      providerLabel[e.provider] || e.provider,
      e.type,
      severityConfig[e.severity]?.label || e.severity,
      e.description,
    ])
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `eventos_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    toast.success('CSV exportado')
  }

  const handleSeverityClick = (sev: string) => {
    setSeverityFilter(prev => prev === sev ? 'all' : sev)
  }

  const clearFilters = () => {
    setSearch('')
    setProviderFilter('all')
    setSeverityFilter('all')
    setDateFrom('')
    setDateTo('')
  }

  const hasActiveFilters = search || providerFilter !== 'all' || severityFilter !== 'all' || dateFrom || dateTo

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Real-time Alert Banner */}
      {newEventAlert && (
        <div className="p-3 rounded-lg border animate-pulse" style={{ backgroundColor: newEventAlert.severity === 'CRITICAL' ? '#FF444415' : '#F59E0B15', borderColor: newEventAlert.severity === 'CRITICAL' ? '#FF444440' : '#F59E0B40' }}>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" style={{ color: newEventAlert.severity === 'CRITICAL' ? '#FF4444' : '#F59E0B' }} />
            <span className="text-sm font-medium">Nuevo evento {newEventAlert.severity === 'CRITICAL' ? 'CRÍTICO' : 'ALTO'}: {newEventAlert.description || newEventAlert.type}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold gradient-animated font-display tracking-wider">// SEGURIDAD</h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">Monitoreo de eventos de seguridad en tiempo real</p>
          <p className="text-xs text-muted-foreground mt-1">Última actualización: {new Date().toLocaleTimeString('es-CO')} — Recolector cada 20 min</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={realTimeEnabled ? 'default' : 'outline'} size="sm" onClick={() => setRealTimeEnabled(!realTimeEnabled)}
            className={`gap-2 text-xs ${realTimeEnabled ? 'bg-[#00FF88]/20 text-[#00FF88] border-[#00FF88]/30' : 'border-[#00E5FF]/20'}`}>
            <span className={`h-2 w-2 rounded-full ${realTimeEnabled ? 'bg-[#00FF88] animate-pulse' : 'bg-muted-foreground'}`} />
            {realTimeEnabled ? 'Tiempo Real' : 'En vivo'}
          </Button>
          <Button variant="outline" className="gap-2 border-[#00E5FF]/20 hover:border-[#00E5FF]/50" onClick={exportCSV}>
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* Severity Cards — CLICKABLE FILTERS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => {
          const cfg = severityConfig[sev]
          const Icon = cfg.icon
          const isActive = severityFilter === sev
          const count = summary[sev.toLowerCase()] || 0
          return (
            <Card key={sev}
              className={`glass-card cursor-pointer transition-all duration-200 ${isActive ? `${cfg.border} border-2 ${cfg.glow} ring-1 ring-inset` : 'border-white/5 hover:border-white/10'}`}
              style={isActive ? { borderColor: sev === 'CRITICAL' ? '#EF4444' : sev === 'HIGH' ? '#F59E0B' : sev === 'MEDIUM' ? '#3B82F6' : '#10B981' } : {}}
              onClick={() => handleSeverityClick(sev)}>
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground font-display uppercase tracking-widest">{cfg.label}</p>
                  <h3 className={`text-2xl font-bold font-display ${isActive ? cfg.color : ''}`} style={!isActive ? { color: sev === 'CRITICAL' ? '#EF4444' : sev === 'HIGH' ? '#F59E0B' : sev === 'MEDIUM' ? '#3B82F6' : '#10B981' } : {}}>
                    {count}
                  </h3>
                </div>
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${cfg.bg}`}>
                  <Icon className={`h-5 w-5 ${cfg.color}`} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Trend Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Events by Severity Bar Chart */}
        <Card className="glass-card border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-display text-neon-cyan uppercase tracking-widest flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Eventos por Severidad
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <div className="h-40 animate-pulse bg-muted/20 rounded" /> : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={[
                  { name: 'CRÍTICO', value: summary.critical || 0, color: '#FF4444' },
                  { name: 'ALTO', value: summary.high || 0, color: '#F59E0B' },
                  { name: 'MEDIO', value: summary.medium || 0, color: '#3B82F6' },
                  { name: 'BAJO', value: summary.low || 0, color: '#10B981' },
                ].filter(d => d.value > 0)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} fontFamily="monospace" />
                  <YAxis stroke="#64748b" fontSize={10} fontFamily="monospace" />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontFamily: 'monospace', fontSize: 12 }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {[
                      { name: 'CRÍTICO', color: '#FF4444' },
                      { name: 'ALTO', color: '#F59E0B' },
                      { name: 'MEDIO', color: '#3B82F6' },
                      { name: 'BAJO', color: '#10B981' },
                    ].map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Heatmap */}
        <EventHeatmap events={events} loading={loading} />
      </div>

      <Card className="glass-card border-white/5">
        <CardHeader className="pb-3">
          <div className="flex flex-col xl:flex-row gap-3 xl:items-center xl:justify-between">
            <CardTitle className="text-xs font-display text-[#FFD700] uppercase tracking-widest flex items-center gap-2">
              <Search className="h-4 w-4" /> Eventos
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-[10px] gap-1 text-[#FF4444] hover:text-[#FF4444] ml-2">
                  <X className="h-3 w-3" /> Limpiar filtros
                </Button>
              )}
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por usuario, descripción..." className="pl-8 w-full sm:w-64 bg-muted/50 text-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <input type="datetime-local" className="w-44 bg-muted/50 text-xs h-9 rounded-md border border-input px-3 text-foreground" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                <span className="text-xs text-muted-foreground">-</span>
                <input type="datetime-local" className="w-44 bg-muted/50 text-xs h-9 rounded-md border border-input px-3 text-foreground" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <Select value={providerFilter} onValueChange={setProviderFilter}>
                <SelectTrigger className="w-full sm:w-32 bg-muted/50"><Filter className="h-3.5 w-3.5 mr-1" /><SelectValue placeholder="Prov" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="AWS">AWS</SelectItem>
                  <SelectItem value="AZURE">Azure</SelectItem>
                  <SelectItem value="M365">M365</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay eventos. Agrega cuentas cloud con credenciales válidas.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5">
                    <TableHead className="font-display text-[10px] uppercase tracking-wider">Fecha</TableHead>
                    <TableHead className="font-display text-[10px] uppercase tracking-wider"><User className="h-3 w-3 inline mr-1" />Usuario</TableHead>
                    <TableHead className="font-display text-[10px] uppercase tracking-wider">Cuenta</TableHead>
                    <TableHead className="font-display text-[10px] uppercase tracking-wider">Prov.</TableHead>
                    <TableHead className="font-display text-[10px] uppercase tracking-wider">Tipo</TableHead>
                    <TableHead className="font-display text-[10px] uppercase tracking-wider">Severidad</TableHead>
                    <TableHead className="font-display text-[10px] uppercase tracking-wider">Descripción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((ev: any) => {
                    const cfg = severityConfig[ev.severity] || severityConfig.LOW
                    const Icon = cfg.icon
                    return (
                      <TableRow key={ev.id} className="cursor-pointer hover:bg-white/[0.02] transition-colors border-white/5" onClick={() => setSelectedEvent(ev)}>
                        <TableCell className="text-xs whitespace-nowrap font-mono">{new Date(ev.createdAt).toLocaleString('es-CO')}</TableCell>
                        <TableCell>
                          {ev.username ? (
                            <span className="text-xs font-mono text-[#00E5FF] flex items-center gap-1">
                              <User className="h-3 w-3" /> {ev.username}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-sm">{ev.account?.name || ev.accountId?.slice(0, 8)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] font-display ${providerBadge[ev.provider] || ''}`}>{providerLabel[ev.provider] || ev.provider}</Badge>
                        </TableCell>
                        <TableCell className="text-sm font-mono">{ev.type}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`gap-1 text-[10px] font-display ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                            <Icon className="h-3 w-3" /> {cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-sm truncate">{ev.description}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="glass-card max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <ShieldAlert className="h-5 w-5 text-[#FF4444]" />
              Detalle del Evento
            </DialogTitle>
            <DialogDescription className="font-mono">ID: {selectedEvent?.id?.slice(0, 8)}...</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            {selectedEvent?.username && (
              <div className="rounded-lg bg-[#00E5FF]/5 border border-[#00E5FF]/20 p-3">
                <div className="flex items-center gap-2 text-[#00E5FF]">
                  <User className="h-4 w-4" />
                  <span className="text-xs font-display uppercase tracking-wider">Usuario</span>
                </div>
                <p className="font-mono text-lg mt-1">{selectedEvent.username}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="text-muted-foreground text-[10px] font-display uppercase tracking-wider">Cuenta</p>
                <p className="font-medium mt-0.5">{selectedEvent?.account?.name || selectedEvent?.accountId}</p>
              </div>
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="text-muted-foreground text-[10px] font-display uppercase tracking-wider">Proveedor</p>
                <Badge variant="outline" className={`mt-1 text-[10px] ${providerBadge[selectedEvent?.provider] || ''}`}>{selectedEvent?.provider}</Badge>
              </div>
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="text-muted-foreground text-[10px] font-display uppercase tracking-wider">Severidad</p>
                <Badge variant="outline" className={`mt-1 text-[10px] ${selectedEvent ? severityConfig[selectedEvent.severity]?.bg : ''} ${selectedEvent ? severityConfig[selectedEvent.severity]?.color : ''} ${selectedEvent ? severityConfig[selectedEvent.severity]?.border : ''}`}>
                  {selectedEvent ? (severityConfig[selectedEvent.severity]?.label || selectedEvent.severity) : ''}
                </Badge>
              </div>
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="text-muted-foreground text-[10px] font-display uppercase tracking-wider">Tipo</p>
                <p className="font-mono mt-0.5">{selectedEvent?.type}</p>
              </div>
              <div className="rounded-lg bg-muted/30 p-3 col-span-2">
                <p className="text-muted-foreground text-[10px] font-display uppercase tracking-wider">Fecha/Hora</p>
                <p className="font-mono mt-0.5 flex items-center gap-1"><Clock className="h-3 w-3" /> {selectedEvent?.createdAt ? new Date(selectedEvent.createdAt).toLocaleString('es-CO') : 'N/A'}</p>
              </div>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-muted-foreground text-[10px] font-display uppercase tracking-wider mb-1">Descripción</p>
              <p className="font-medium">{selectedEvent?.description}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-muted-foreground text-[10px] font-display uppercase tracking-wider mb-1">Metadatos</p>
              <pre className="font-mono text-xs whitespace-pre-wrap">{JSON.stringify(selectedEvent?.metadata, null, 2)}</pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
