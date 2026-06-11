import { useState, useEffect } from 'react'
import { useBusinessUnit } from '@/contexts/BusinessUnitContext'
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
import { AlertTriangle, Plus, Edit2, Trash2, CheckCircle, Clock, Shield, XCircle } from 'lucide-react'

const typeLabels: Record<string, string> = {
  CORRECTIVE: 'Correctiva',
  PREVENTIVE: 'Preventiva',
  IMPROVEMENT: 'Mejora',
}

const statusLabels: Record<string, { label: string; color: string; icon: any }> = {
  OPEN: { label: 'Abierta', color: '#EF4444', icon: AlertTriangle },
  IN_PROGRESS: { label: 'En Progreso', color: '#3B82F6', icon: Clock },
  IMPLEMENTED: { label: 'Implementada', color: '#F59E0B', icon: Shield },
  VERIFIED: { label: 'Verificada', color: '#10B981', icon: CheckCircle },
  CLOSED: { label: 'Cerrada', color: '#6B7280', icon: XCircle },
  REJECTED: { label: 'Rechazada', color: '#EF4444', icon: XCircle },
}

export function CAPAPage() {
  const [loading, setLoading] = useState(true)
  const { selectedBU } = useBusinessUnit()
  const [items, setItems] = useState<any[]>([])
  const [stats, setStats] = useState<any>({})
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [fd, setFd] = useState({
    title: '', description: '', type: 'CORRECTIVE', source: '',
    rootCause: '', correctiveAction: '', preventiveAction: '',
    owner: '', dueDate: '', status: 'OPEN', effectiveness: '',
  })

  useEffect(() => { fetchData() }, [selectedBU])

  const fetchData = async () => {
    try {
      setLoading(true)
      const params = selectedBU ? `?businessUnitId=${selectedBU}` : ''
      const r = await api.get(`/audit-capa/capa${params}`).then(r => r.data)
      setItems(r.items || [])
      setStats(r.stats || {})
    } catch { toast.error('Error al cargar CAPAs') }
    finally { setLoading(false) }
  }

  const handleSave = async () => {
    try {
      if (editing) {
        await api.put(`/audit-capa/capa/${editing.id}`, fd)
      } else {
        await api.post('/audit-capa/capa', fd)
      }
      toast.success(editing ? 'CAPA actualizada' : 'CAPA creada')
      setDialogOpen(false)
      fetchData()
    } catch { toast.error('Error al guardar') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar CAPA?')) return
    await api.delete(`/audit-capa/capa/${id}`)
    toast.success('Eliminada')
    fetchData()
  }

  const openNew = () => {
    setEditing(null)
    setFd({ title: '', description: '', type: 'CORRECTIVE', source: '', rootCause: '', correctiveAction: '', preventiveAction: '', owner: '', dueDate: '', status: 'OPEN', effectiveness: '' })
    setDialogOpen(true)
  }

  const openEdit = (item: any) => {
    setEditing(item)
    setFd({ ...item, dueDate: item.dueDate?.split('T')[0] || '' })
    setDialogOpen(true)
  }

  if (loading) return <div className="p-6 space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}</div>

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">

          <div>
            <h1 className="text-2xl font-bold gradient-animated">Acciones Correctivas y Preventivas</h1>
            <p className="text-sm text-muted-foreground mt-1">ISO 27001 — Cláusula 10.2 — CAPA</p>
          </div>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Nueva CAPA</Button>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <div className="metric-card"><p className="text-[10px] text-muted-foreground uppercase">Total</p><h3 className="text-2xl font-bold text-neon-cyan mt-1">{stats.total || 0}</h3></div>
        <div className="metric-card"><p className="text-[10px] text-muted-foreground uppercase">Abiertas</p><h3 className="text-2xl font-bold text-neon-red mt-1">{stats.open || 0}</h3></div>
        <div className="metric-card"><p className="text-[10px] text-muted-foreground uppercase">En Progreso</p><h3 className="text-2xl font-bold text-neon-blue mt-1">{stats.inProgress || 0}</h3></div>
        <div className="metric-card"><p className="text-[10px] text-muted-foreground uppercase">Cerradas</p><h3 className="text-2xl font-bold text-neon-green mt-1">{stats.closed || 0}</h3></div>
        <div className="metric-card"><p className="text-[10px] text-muted-foreground uppercase">Vencidas</p><h3 className="text-2xl font-bold text-neon-yellow mt-1">{stats.overdue || 0}</h3></div>
      </div>

      <div className="grid gap-3 grid-cols-3">
        <div className="metric-card"><p className="text-[10px] text-muted-foreground uppercase">Correctivas</p><h3 className="text-lg font-bold text-neon-red mt-1">{stats.corrective || 0}</h3></div>
        <div className="metric-card"><p className="text-[10px] text-muted-foreground uppercase">Preventivas</p><h3 className="text-lg font-bold text-neon-blue mt-1">{stats.preventive || 0}</h3></div>
        <div className="metric-card"><p className="text-[10px] text-muted-foreground uppercase">Mejora</p><h3 className="text-lg font-bold text-neon-green mt-1">{stats.improvement || 0}</h3></div>
      </div>

      <Card className="glass-card">
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="py-12 text-center"><AlertTriangle className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" /><p className="text-sm text-muted-foreground">Sin CAPAs registradas</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CAPA</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fuente</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(item => {
                  const st = statusLabels[item.status] || statusLabels.OPEN
                  const isOverdue = item.status !== 'CLOSED' && item.status !== 'REJECTED' && item.dueDate && new Date(item.dueDate) < new Date()
                  return (
                    <TableRow key={item.id} className={isOverdue ? 'bg-neon-red/5' : ''}>
                      <TableCell>
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.description?.slice(0, 50)}</p>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{typeLabels[item.type]}</Badge></TableCell>
                      <TableCell className="text-xs">{item.source || '-'}</TableCell>
                      <TableCell className="text-xs">{item.owner}</TableCell>
                      <TableCell className={`text-xs ${isOverdue ? 'text-neon-red font-bold' : ''}`}>
                        {item.dueDate ? new Date(item.dueDate).toLocaleDateString('es-CO') : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge style={{ color: st.color, borderColor: st.color + '30', backgroundColor: st.color + '10' }} className="text-[10px]">
                          {st.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}><Edit2 className="h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-neon-red" onClick={() => handleDelete(item.id)}><Trash2 className="h-3.5" /></Button>
                        </div>
                      </TableCell>
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
          <DialogHeader><DialogTitle>{editing ? 'Editar CAPA' : 'Nueva CAPA'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><label className="text-xs text-muted-foreground">Título *</label><Input value={fd.title} onChange={e => setFd({ ...fd, title: e.target.value })} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Tipo</label><Select value={fd.type} onValueChange={v => setFd({ ...fd, type: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
              <div><label className="text-xs text-muted-foreground">Estado</label><Select value={fd.status} onValueChange={v => setFd({ ...fd, status: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Fuente</label><Input value={fd.source} onChange={e => setFd({ ...fd, source: e.target.value })} placeholder="Auditoría, Incidente, etc." className="mt-1" /></div>
              <div><label className="text-xs text-muted-foreground">Owner *</label><Input value={fd.owner} onChange={e => setFd({ ...fd, owner: e.target.value })} className="mt-1" /></div>
            </div>
            <div><label className="text-xs text-muted-foreground">Fecha Límite</label><Input type="date" value={fd.dueDate} onChange={e => setFd({ ...fd, dueDate: e.target.value })} className="mt-1" /></div>
            <div><label className="text-xs text-muted-foreground">Causa Raíz</label><textarea value={fd.rootCause} onChange={e => setFd({ ...fd, rootCause: e.target.value })} className="w-full h-16 bg-muted/30 border border-border rounded-lg p-3 text-sm resize-none mt-1" /></div>
            <div><label className="text-xs text-muted-foreground">Acción Correctiva</label><textarea value={fd.correctiveAction} onChange={e => setFd({ ...fd, correctiveAction: e.target.value })} className="w-full h-16 bg-muted/30 border border-border rounded-lg p-3 text-sm resize-none mt-1" /></div>
            <div><label className="text-xs text-muted-foreground">Acción Preventiva</label><textarea value={fd.preventiveAction} onChange={e => setFd({ ...fd, preventiveAction: e.target.value })} className="w-full h-16 bg-muted/30 border border-border rounded-lg p-3 text-sm resize-none mt-1" /></div>
            <div><label className="text-xs text-muted-foreground">Efectividad</label><textarea value={fd.effectiveness} onChange={e => setFd({ ...fd, effectiveness: e.target.value })} className="w-full h-16 bg-muted/30 border border-border rounded-lg p-3 text-sm resize-none mt-1" /></div>
            <div className="flex gap-2 pt-4"><Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Cancelar</Button><Button onClick={handleSave} className="flex-1">{editing ? 'Actualizar' : 'Crear'}</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}