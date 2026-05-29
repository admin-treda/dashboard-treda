import { useState, useEffect, useMemo } from 'react'
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
import { Search, Download, Filter, Calendar, ShieldAlert, AlertTriangle, Info, CheckCircle2 } from 'lucide-react'

const severityConfig: Record<string, { color: string; icon: any; label: string }> = {
  CRITICAL: { color: 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30', icon: ShieldAlert, label: 'CRÍTICO' },
  HIGH: { color: 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30', icon: AlertTriangle, label: 'ALTO' },
  MEDIUM: { color: 'bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/30', icon: Info, label: 'MEDIO' },
  LOW: { color: 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30', icon: CheckCircle2, label: 'BAJO' },
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

  const filtered = useMemo(() => {
    if (!search) return events
    const q = search.toLowerCase()
    return events.filter((e: any) =>
      (e.description || '').toLowerCase().includes(q) ||
      (e.type || '').toLowerCase().includes(q) ||
      (e.account?.name || '').toLowerCase().includes(q)
    )
  }, [events, search])

  const exportCSV = () => {
    const headers = ['Fecha', 'Cuenta', 'Proveedor', 'Tipo', 'Severidad', 'Descripción']
    const rows = filtered.map((e: any) => [
      new Date(e.createdAt).toLocaleString('es-CO'),
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gradient">Eventos de Seguridad</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitoreo de eventos de seguridad en tiempo real</p>
          <p className="text-xs text-muted-foreground mt-1">Última actualización: {new Date().toLocaleTimeString('es-CO')} — Recolector cada 20 min</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={exportCSV}>
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Críticos</p>
              <h3 className="text-2xl font-bold text-critical">{summary.critical || 0}</h3>
            </div>
            <ShieldAlert className="h-8 w-8 text-critical/40" />
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Altos</p>
              <h3 className="text-2xl font-bold text-high">{summary.high || 0}</h3>
            </div>
            <AlertTriangle className="h-8 w-8 text-high/40" />
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Medios</p>
              <h3 className="text-2xl font-bold text-medium">{summary.medium || 0}</h3>
            </div>
            <Info className="h-8 w-8 text-medium/40" />
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Bajos</p>
              <h3 className="text-2xl font-bold text-low">{summary.low || 0}</h3>
            </div>
            <CheckCircle2 className="h-8 w-8 text-low/40" />
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col xl:flex-row gap-3 xl:items-center xl:justify-between">
            <CardTitle className="text-base font-semibold">Eventos</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar..." className="pl-8 w-full sm:w-56 bg-muted/50" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input type="date" className="w-36 bg-muted/50 text-xs h-9" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                <span className="text-xs text-muted-foreground">-</span>
                <Input type="date" className="w-36 bg-muted/50 text-xs h-9" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
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
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-full sm:w-32 bg-muted/50"><Filter className="h-3.5 w-3.5 mr-1" /><SelectValue placeholder="Sev." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="CRITICAL">Crítico</SelectItem>
                  <SelectItem value="HIGH">Alto</SelectItem>
                  <SelectItem value="MEDIUM">Medio</SelectItem>
                  <SelectItem value="LOW">Bajo</SelectItem>
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
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cuenta</TableHead>
                    <TableHead>Prov.</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Severidad</TableHead>
                    <TableHead>Descripción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((ev: any) => {
                    const cfg = severityConfig[ev.severity] || severityConfig.LOW
                    const Icon = cfg.icon
                    return (
                      <TableRow key={ev.id} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setSelectedEvent(ev)}>
                        <TableCell className="text-xs whitespace-nowrap">{new Date(ev.createdAt).toLocaleString('es-CO')}</TableCell>
                        <TableCell className="font-medium text-sm">{ev.account?.name || ev.accountId?.slice(0, 8)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={providerBadge[ev.provider] || ''}>{providerLabel[ev.provider] || ev.provider}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{ev.type}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`gap-1 ${cfg.color}`}>
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

      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="glass-card max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Detalle del Evento
            </DialogTitle>
            <DialogDescription>ID: {selectedEvent?.id?.slice(0, 8)}...</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cuenta</span>
              <span className="font-medium">{selectedEvent?.account?.name || selectedEvent?.accountId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Proveedor</span>
              <Badge variant="outline" className={providerBadge[selectedEvent?.provider] || ''}>{selectedEvent?.provider}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Severidad</span>
              <Badge variant="outline" className={selectedEvent ? severityConfig[selectedEvent.severity]?.color : ''}>{selectedEvent ? (severityConfig[selectedEvent.severity]?.label || selectedEvent.severity) : ''}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipo</span>
              <span className="font-medium">{selectedEvent?.type}</span>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 mt-2">
              <p className="text-muted-foreground text-xs mb-1">Descripción</p>
              <p className="font-medium">{selectedEvent?.description}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-muted-foreground text-xs mb-1">Metadatos</p>
              <pre className="font-mono text-xs whitespace-pre-wrap">{JSON.stringify(selectedEvent?.metadata, null, 2)}</pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
