import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Building2, Plus, Edit2, Trash2, Shield, FileText, ClipboardCheck } from 'lucide-react'

export function BusinessUnitsPage() {
  const [loading, setLoading] = useState(true)
  const [units, setUnits] = useState<any[]>([])
  const [stats, setStats] = useState<any>({})
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [fd, setFd] = useState({ name: '', description: '', industry: '', status: 'ACTIVE' })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const r = await api.get('/business-units')
      setUnits(r.data.units || [])
      setStats(r.data.stats || {})
    } catch { toast.error('Error al cargar unidades') }
    finally { setLoading(false) }
  }

  const handleSave = async () => {
    try {
      if (editing) {
        await api.put(`/business-units/${editing.id}`, fd)
        toast.success('Unidad actualizada')
      } else {
        await api.post('/business-units', fd)
        toast.success('Unidad creada')
      }
      setDialogOpen(false)
      fetchData()
    } catch { toast.error('Error al guardar') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta unidad? Se perderán todos los datos ISO asociados.')) return
    try {
      await api.delete(`/business-units/${id}`)
      toast.success('Unidad eliminada')
      fetchData()
    } catch { toast.error('Error al eliminar') }
  }

  const openNew = () => { setEditing(null); setFd({ name: '', description: '', industry: '', status: 'ACTIVE' }); setDialogOpen(true) }
  const openEdit = (u: any) => { setEditing(u); setFd({ name: u.name, description: u.description || '', industry: u.industry || '', status: u.status }); setDialogOpen(true) }

  if (loading) return <div className="p-6 space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}</div>

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-animated">Unidades de Negocio</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestiona las ramas de negocio — Cada unidad tiene su propio SGSI ISO 27001</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Nueva Unidad</Button>
      </div>

      <div className="grid gap-3 grid-cols-3">
        <div className="metric-card"><p className="text-[10px] text-muted-foreground uppercase">Total</p><h3 className="text-2xl font-bold text-neon-cyan mt-1">{stats.total || 0}</h3></div>
        <div className="metric-card"><p className="text-[10px] text-muted-foreground uppercase">Activas</p><h3 className="text-2xl font-bold text-neon-green mt-1">{stats.active || 0}</h3></div>
        <div className="metric-card"><p className="text-[10px] text-muted-foreground uppercase">Inactivas</p><h3 className="text-2xl font-bold text-neon-yellow mt-1">{stats.inactive || 0}</h3></div>
      </div>

      {units.length === 0 ? (
        <Card className="glass-card"><CardContent className="py-12 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No hay unidades de negocio. Crea la primera para comenzar con ISO 27001.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {units.map(u => (
            <Card key={u.id} className="glass-card hover:border-neon-cyan/20 transition-all cursor-pointer" onClick={() => window.location.href = `/isms?bu=${u.id}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="h-10 w-10 rounded-lg bg-neon-cyan/10 flex items-center justify-center border border-neon-cyan/20">
                    <Building2 className="h-5 w-5 text-neon-cyan" />
                  </div>
                  <div className="flex gap-1">
                    <Badge variant="outline" className="text-[9px]" style={{ color: u.status === 'ACTIVE' ? '#10B981' : '#6B7280', borderColor: u.status === 'ACTIVE' ? '#10B98130' : '#6B728030' }}>
                      {u.status === 'ACTIVE' ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>
                </div>
                <h3 className="font-semibold text-sm mb-1">{u.name}</h3>
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{u.description || 'Sin descripción'}</p>
                {u.industry && <p className="text-[10px] text-neon-blue mb-3">Sector: {u.industry}</p>}
                <div className="flex gap-3 text-[10px] text-muted-foreground pt-2 border-t border-border/30">
                  <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> {u._count?.risks || 0} riesgos</span>
                  <span className="flex items-center gap-1"><ClipboardCheck className="h-3 w-3" /> {u._count?.soaControls || 0} controles</span>
                  <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {u._count?.documents || 0} docs</span>
                </div>
                <div className="flex gap-1 mt-3" onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(u)}><Edit2 className="h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-neon-red" onClick={() => handleDelete(u.id)}><Trash2 className="h-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Editar Unidad' : 'Nueva Unidad de Negocio'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><label className="text-xs text-muted-foreground">Nombre *</label><Input value={fd.name} onChange={e => setFd({ ...fd, name: e.target.value })} placeholder="Ej: Plataforma Firmado Digital" className="mt-1" /></div>
            <div><label className="text-xs text-muted-foreground">Descripción</label><Input value={fd.description} onChange={e => setFd({ ...fd, description: e.target.value })} placeholder="Breve descripción de la rama de negocio" className="mt-1" /></div>
            <div><label className="text-xs text-muted-foreground">Sector / Industria</label><Input value={fd.industry} onChange={e => setFd({ ...fd, industry: e.target.value })} placeholder="Ej: Tecnología, Legal, Finanzas" className="mt-1" /></div>
            <div className="flex gap-2 pt-4"><Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Cancelar</Button><Button onClick={handleSave} className="flex-1">{editing ? 'Actualizar' : 'Crear'}</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}