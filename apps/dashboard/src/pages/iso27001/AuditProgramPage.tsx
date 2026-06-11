import { useState, useEffect } from 'react'
import { BusinessUnitSelector } from '@/components/iso27001/BusinessUnitSelector'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { ClipboardCheck, Plus, Edit2, Trash2 } from 'lucide-react'

const typeLabels: Record<string, string> = {
  FULL_ISO27001: 'Completa ISO 27001',
  PARTIAL: 'Parcial',
  SURVEILLANCE: 'Seguimiento',
  FOLLOW_UP: 'Seguimiento NCs',
  PRE_CERTIFICATION: 'Pre-Certificación',
}

const statusLabels: Record<string, { label: string; color: string }> = {
  PLANNED: { label: 'Planificada', color: '#6B7280' },
  IN_PROGRESS: { label: 'En Curso', color: '#3B82F6' },
  COMPLETED: { label: 'Completada', color: '#10B981' },
  FOLLOW_UP: { label: 'Seguimiento', color: '#F59E0B' },
  CLOSED: { label: 'Cerrada', color: '#6B7280' },
}

export function AuditProgramPage() {
  const [loading, setLoading] = useState(true)
  const [selectedBU, setSelectedBU] = useState<string | null>(null)
  const [audits, setAudits] = useState<any[]>([])
  const [stats, setStats] = useState<any>({})
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [fd, setFd] = useState({
    title: '', description: '', auditType: 'FULL_ISO27001', scope: '',
    criteria: '', auditorName: '', auditDate: '', status: 'PLANNED',
    nonConformities: 0, opportunities: 0, positives: 0,
    findings: [] as any[], nextAuditDate: '',
  })

  useEffect(() => { fetchData() }, [selectedBU])

  const fetchData = async () => {
    try {
      setLoading(true)
      const params = selectedBU ? `?businessUnitId=${selectedBU}` : ''
      const r = await api.get(`/audit-capa/audits${params}`).then(r => r.data)
      setAudits(r.audits || [])
      setStats(r.stats || {})
    } catch { toast.error('Error al cargar auditorías') }
    finally { setLoading(false) }
  }

  const handleSave = async () => {
    try {
      if (editing) {
        await api.put(`/audit-capa/audits/${editing.id}`, fd)
      } else {
        await api.post('/audit-capa/audits', fd)
      }
      toast.success(editing ? 'Auditoría actualizada' : 'Auditoría creada')
      setDialogOpen(false)
      fetchData()
    } catch { toast.error('Error al guardar') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar auditoría?')) return
    await api.delete(`/audit-capa/audits/${id}`)
    toast.success('Eliminada')
    fetchData()
  }

  const openNew = () => {
    setEditing(null)
    setFd({ title: '', description: '', auditType: 'FULL_ISO27001', scope: '', criteria: '', auditorName: '', auditDate: '', status: 'PLANNED', nonConformities: 0, opportunities: 0, positives: 0, findings: [], nextAuditDate: '' })
    setDialogOpen(true)
  }

  const openEdit = (a: any) => {
    setEditing(a)
    setFd({ ...a, auditDate: a.auditDate?.split('T')[0] || '', nextAuditDate: a.nextAuditDate?.split('T')[0] || '' })
    setDialogOpen(true)
  }

  if (loading) return <div className="p-6 space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}</div>

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BusinessUnitSelector selectedId={selectedBU} onSelect={setSelectedBU} />
          <div>
            <h1 className="text-2xl font-bold gradient-animated">Programa de Auditorías Internas</h1>
            <p className="text-sm text-muted-foreground mt-1">ISO 27001 — Cláusula 9.2</p>
          </div>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Nueva Auditoría</Button>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <div className="metric-card"><p className="text-[10px] text-muted-foreground uppercase">Total</p><h3 className="text-2xl font-bold text-neon-cyan mt-1">{stats.total || 0}</h3></div>
        <div className="metric-card"><p className="text-[10px] text-muted-foreground uppercase">Planificadas</p><h3 className="text-2xl font-bold text-neon-blue mt-1">{stats.planned || 0}</h3></div>
        <div className="metric-card"><p className="text-[10px] text-muted-foreground uppercase">Completadas</p><h3 className="text-2xl font-bold text-neon-green mt-1">{stats.completed || 0}</h3></div>
        <div className="metric-card"><p className="text-[10px] text-muted-foreground uppercase">Hallazgos</p><h3 className="text-2xl font-bold text-neon-yellow mt-1">{stats.totalFindings || 0}</h3></div>
        <div className="metric-card"><p className="text-[10px] text-muted-foreground uppercase">No Conformidades</p><h3 className="text-2xl font-bold text-neon-red mt-1">{stats.totalNCs || 0}</h3></div>
      </div>

      <Card className="glass-card">
        <CardContent className="p-0">
          {audits.length === 0 ? (
            <div className="py-12 text-center"><ClipboardCheck className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" /><p className="text-sm text-muted-foreground">Sin auditorías programadas</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Auditoría</TableHead><TableHead>Tipo</TableHead><TableHead>Auditor</TableHead>
                  <TableHead>Fecha</TableHead><TableHead>Estado</TableHead><TableHead>NCs</TableHead>
                  <TableHead>Hallazgos</TableHead><TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audits.map(a => {
                  const st = statusLabels[a.status] || statusLabels.PLANNED
                  return (
                    <TableRow key={a.id}>
                      <TableCell><p className="text-sm font-medium">{a.title}</p><p className="text-xs text-muted-foreground">{a.scope?.slice(0, 50)}</p></TableCell>
                      <TableCell className="text-xs">{typeLabels[a.auditType]}</TableCell>
                      <TableCell className="text-xs">{a.auditorName}</TableCell>
                      <TableCell className="text-xs">{new Date(a.auditDate).toLocaleDateString('es-CO')}</TableCell>
                      <TableCell><Badge style={{ color: st.color, borderColor: st.color + '30', backgroundColor: st.color + '10' }} className="text-[10px]">{st.label}</Badge></TableCell>
                      <TableCell className="text-sm font-bold text-neon-red">{a.nonConformities}</TableCell>
                      <TableCell className="text-xs">{Array.isArray(a.findings) ? a.findings.length : 0}</TableCell>
                      <TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}><Edit2 className="h-3.5" /></Button><Button variant="ghost" size="icon" className="h-7 w-7 text-neon-red" onClick={() => handleDelete(a.id)}><Trash2 className="h-3.5" /></Button></div></TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar Auditoría' : 'Nueva Auditoría'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><label className="text-xs text-muted-foreground">Título *</label><Input value={fd.title} onChange={e => setFd({ ...fd, title: e.target.value })} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Tipo</label><Select value={fd.auditType} onValueChange={v => setFd({ ...fd, auditType: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
              <div><label className="text-xs text-muted-foreground">Estado</label><Select value={fd.status} onValueChange={v => setFd({ ...fd, status: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><label className="text-xs text-muted-foreground">Alcance</label><Input value={fd.scope} onChange={e => setFd({ ...fd, scope: e.target.value })} className="mt-1" /></div>
            <div><label className="text-xs text-muted-foreground">Criterios</label><Input value={fd.criteria} onChange={e => setFd({ ...fd, criteria: e.target.value })} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Auditor *</label><Input value={fd.auditorName} onChange={e => setFd({ ...fd, auditorName: e.target.value })} className="mt-1" /></div>
              <div><label className="text-xs text-muted-foreground">Fecha *</label><Input type="date" value={fd.auditDate} onChange={e => setFd({ ...fd, auditDate: e.target.value })} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-xs text-muted-foreground">No Conformidades</label><Input type="number" min="0" value={fd.nonConformities} onChange={e => setFd({ ...fd, nonConformities: +e.target.value })} className="mt-1" /></div>
              <div><label className="text-xs text-muted-foreground">Oportunidades</label><Input type="number" min="0" value={fd.opportunities} onChange={e => setFd({ ...fd, opportunities: +e.target.value })} className="mt-1" /></div>
              <div><label className="text-xs text-muted-foreground">Positivos</label><Input type="number" min="0" value={fd.positives} onChange={e => setFd({ ...fd, positives: +e.target.value })} className="mt-1" /></div>
            </div>
            <div><label className="text-xs text-muted-foreground">Descripción</label><textarea value={fd.description} onChange={e => setFd({ ...fd, description: e.target.value })} className="w-full h-20 bg-muted/30 border border-border rounded-lg p-3 text-sm resize-none mt-1" /></div>
            <div className="flex gap-2 pt-4"><Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Cancelar</Button><Button onClick={handleSave} className="flex-1">{editing ? 'Actualizar' : 'Crear'}</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}