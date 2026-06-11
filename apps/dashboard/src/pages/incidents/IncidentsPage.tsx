import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  AlertTriangle, ShieldAlert, Clock, CheckCircle2, Plus,
  XCircle, Activity,
} from 'lucide-react'

const statusCfg: Record<string, { color: string; label: string; icon: any }> = {
  detected: { color: '#FF4444', label: 'DETECTADO', icon: ShieldAlert },
  triaged: { color: '#FFD700', label: 'EN ANÁLISIS', icon: Clock },
  'in-progress': { color: '#3B82F6', label: 'EN PROCESO', icon: Activity },
  resolved: { color: '#00FF88', label: 'RESUELTO', icon: CheckCircle2 },
  closed: { color: '#6B7280', label: 'CERRADO', icon: XCircle },
}

const severityCfg: Record<string, { color: string; label: string }> = {
  critical: { color: '#FF4444', label: 'CRÍTICO' },
  high: { color: '#F59E0B', label: 'ALTO' },
  medium: { color: '#3B82F6', label: 'MEDIO' },
  low: { color: '#10B981', label: 'BAJO' },
}

export function IncidentsPage() {
  const [loading, setLoading] = useState(true)
  const [incidents, setIncidents] = useState<any[]>([])
  const [stats, setStats] = useState({ total: 0, detected: 0, resolved: 0, avgResolution: 0 })
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: '', severity: 'medium', description: '' })
  const [saving, setSaving] = useState(false)
  const [selectedIncident, setSelectedIncident] = useState<any>(null)

  const fetchIncidents = async () => {
    try {
      setLoading(true)
      const res = await api.get('/incidents').catch(() => ({ data: { incidents: [], stats: {} } }))
      setIncidents(res.data?.incidents || res.data?.data || [])
      setStats(res.data?.stats || { total: 0, detected: 0, resolved: 0, avgResolution: 0 })
    } catch { toast.error('Error al cargar incidentes') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchIncidents() }, [])

  const createIncident = async () => {
    if (!form.title.trim()) { toast.error('Título requerido'); return }
    setSaving(true)
    try {
      await api.post('/incidents', form)
      toast.success('Incidente creado')
      setShowCreate(false)
      setForm({ title: '', severity: 'medium', description: '' })
      fetchIncidents()
    } catch (err: any) { toast.error(err.response?.data?.error || 'Error') }
    finally { setSaving(false) }
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/incidents/${id}`, { status })
      toast.success('Estado actualizado')
      fetchIncidents()
    } catch { toast.error('Error al actualizar') }
  }

  const recentIncidents = incidents.slice(0, 20)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold gradient-animated font-display tracking-wider">// INCIDENTES</h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">Gestión y seguimiento de incidentes de seguridad</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 bg-[#FF4444]/10 border border-[#FF4444]/30 text-[#FF4444] hover:bg-[#FF4444]/20">
          <Plus className="h-4 w-4" /> Nuevo Incidente
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total', value: stats.total, color: '#00E5FF' },
          { label: 'Activos', value: stats.detected, color: '#FF4444' },
          { label: 'Resueltos', value: stats.resolved, color: '#00FF88' },
          { label: 'Tiempo Prom.', value: stats.avgResolution ? `${stats.avgResolution}h` : 'N/A', color: '#FFD700' },
        ].map(s => (
          <Card key={s.label} className="glass-card border-white/5">
            <CardContent className="p-4">
              <p className="text-[10px] text-muted-foreground font-display uppercase tracking-widest">{s.label}</p>
              <h3 className="text-2xl font-bold font-display mt-1" style={{ color: s.color }}>{s.value}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Incidents Table */}
      <Card className="glass-card border-white/5">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">{Array.from({length: 5}).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : recentIncidents.length === 0 ? (
            <div className="py-12 text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm font-display">Sin incidentes registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5">
                    {['Título', 'Severidad', 'Estado', 'Asignado', 'Creado', 'Acciones'].map(h => (
                      <TableHead key={h} className="font-display text-[10px] uppercase tracking-wider">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentIncidents.map(inc => {
                    const st = statusCfg[inc.status] || statusCfg.detected
                    const sv = severityCfg[inc.severity?.toLowerCase()] || severityCfg.medium
                    const SIcon = st.icon
                    return (
                      <TableRow key={inc.id} className="border-white/5 hover:bg-white/[0.02] cursor-pointer" onClick={() => setSelectedIncident(inc)}>
                        <TableCell className="font-medium text-sm">{inc.title}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px] font-display" style={{ color: sv.color, borderColor: sv.color + '40' }}>{sv.label}</Badge></TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-display gap-1" style={{ color: st.color, borderColor: st.color + '40' }}>
                            <SIcon className="h-3 w-3" /> {st.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono">{inc.assignee || '—'}</TableCell>
                        <TableCell className="text-[10px] text-muted-foreground font-mono">{inc.createdAt ? new Date(inc.createdAt).toLocaleDateString('es-CO') : '—'}</TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          <Select value={inc.status || 'detected'} onValueChange={(val) => updateStatus(inc.id, val)}>
                            <SelectTrigger className="w-28 h-7 text-[10px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="detected">Detectado</SelectItem>
                              <SelectItem value="triaged">En Análisis</SelectItem>
                              <SelectItem value="in-progress">En Proceso</SelectItem>
                              <SelectItem value="resolved">Resuelto</SelectItem>
                              <SelectItem value="closed">Cerrado</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="glass-card max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-[#FF4444]" /> Nuevo Incidente</DialogTitle>
            <DialogDescription>Registrar un nuevo incidente de seguridad</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Título</Label>
              <Input placeholder="Descripción breve del incidente" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Severidad</Label>
              <Select value={form.severity} onValueChange={v => setForm(p => ({ ...p, severity: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Crítico</SelectItem>
                  <SelectItem value="high">Alto</SelectItem>
                  <SelectItem value="medium">Medio</SelectItem>
                  <SelectItem value="low">Bajo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descripción</Label>
              <textarea className="w-full h-20 text-xs rounded-md border border-input bg-transparent px-3 py-2 resize-none" placeholder="Detalles del incidente..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancelar</Button>
              <Button size="sm" onClick={createIncident} disabled={saving} className="gap-2 bg-[#FF4444]/10 text-[#FF4444] border border-[#FF4444]/30">
                {saving ? 'Creando...' : 'Crear Incidente'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!selectedIncident} onOpenChange={(o) => !o && setSelectedIncident(null)}>
        <DialogContent className="glass-card max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">{selectedIncident?.title}</DialogTitle>
          </DialogHeader>
          {selectedIncident && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted/30 p-3">
                  <p className="text-muted-foreground text-[10px] font-display uppercase">Severidad</p>
                  <p className="font-mono mt-1" style={{ color: severityCfg[selectedIncident.severity]?.color }}>{severityCfg[selectedIncident.severity]?.label || selectedIncident.severity}</p>
                </div>
                <div className="rounded-lg bg-muted/30 p-3">
                  <p className="text-muted-foreground text-[10px] font-display uppercase">Estado</p>
                  <p className="font-mono mt-1" style={{ color: statusCfg[selectedIncident.status]?.color }}>{statusCfg[selectedIncident.status]?.label || selectedIncident.status}</p>
                </div>
              </div>
              {selectedIncident.description && (
                <div className="rounded-lg bg-muted/30 p-3">
                  <p className="text-muted-foreground text-[10px] font-display uppercase mb-1">Descripción</p>
                  <p>{selectedIncident.description}</p>
                </div>
              )}
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="text-muted-foreground text-[10px] font-display uppercase mb-1">Timeline</p>
                <p className="text-xs font-mono">Creado: {selectedIncident.createdAt ? new Date(selectedIncident.createdAt).toLocaleString('es-CO') : 'N/A'}</p>
                {selectedIncident.resolvedAt && <p className="text-xs font-mono text-[#00FF88]">Resuelto: {new Date(selectedIncident.resolvedAt).toLocaleString('es-CO')}</p>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
