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
import { GraduationCap, Plus, Users, Edit2, Trash2 } from 'lucide-react'

const categoryLabels: Record<string, string> = {
  SECURITY_AWARENESS: 'Concientización',
  PHISHING: 'Phishing',
  PASSWORD_SECURITY: 'Contraseñas',
  DATA_PROTECTION: 'Protección de Datos',
  INCIDENT_RESPONSE: 'Incidentes',
  COMPLIANCE: 'Cumplimiento',
  ROLE_SPECIFIC: 'Rol Específico',
  ONBOARDING: 'Onboarding',
  CRYPTOGRAPHY: 'Criptografía',
  ACCESS_CONTROL: 'Control de Acceso',
}

const statusColors: Record<string, string> = {
  ENROLLED: '#6B7280',
  IN_PROGRESS: '#3B82F6',
  COMPLETED: '#10B981',
  FAILED: '#EF4444',
  EXPIRED: '#F59E0B',
}

export function TrainingPage() {
  const [loading, setLoading] = useState(true)
  const [selectedBU, setSelectedBU] = useState<string | null>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [stats, setStats] = useState<any>({})
  const [enrollStats, setEnrollStats] = useState<any>({})
  const [activeTab, setActiveTab] = useState<'courses' | 'enrollments'>('courses')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<any>(null)
  const [formData, setFormData] = useState({
    title: '', description: '', category: 'SECURITY_AWARENESS',
    durationMinutes: 60, required: false, frequency: 'annual',
    passingScore: 80, soaControls: [] as string[],
  })

  useEffect(() => { fetchData() }, [selectedBU])

  const fetchData = async () => {
    try {
      setLoading(true)
      const buParam = selectedBU ? `?businessUnitId=${selectedBU}` : ''
      const [coursesRes, enrollRes] = await Promise.all([
        api.get(`/training/courses${buParam}`).then(r => r.data),
        api.get(`/training/enrollments${buParam}`).then(r => r.data),
      ])
      setCourses(coursesRes.courses || [])
      setStats(coursesRes.stats || {})
      setEnrollments(enrollRes.enrollments || [])
      setEnrollStats(enrollRes.stats || {})
    } catch { toast.error('Error al cargar datos') }
    finally { setLoading(false) }
  }

  const handleSeed = async () => {
    if (!confirm('¿Crear 10 cursos ISO 27001 requeridos?')) return
    try {
      const data = await api.post('/training/seed').then(r => r.data)
      toast.success(data.message)
      fetchData()
    } catch { toast.error('Error al crear cursos') }
  }

  const handleSave = async () => {
    try {
      if (editingCourse) {
        await api.put(`/training/courses/${editingCourse.id}`, formData)
      } else {
        await api.post('/training/courses', { ...formData, businessUnitId: selectedBU })
      }
      toast.success(editingCourse ? 'Curso actualizado' : 'Curso creado')
      setDialogOpen(false)
      fetchData()
    } catch { toast.error('Error al guardar') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar curso?')) return
    try {
      await api.delete(`/training/courses/${id}`)
      toast.success('Curso eliminado')
      fetchData()
    } catch { toast.error('Error al eliminar') }
  }

  const openNew = () => {
    setEditingCourse(null)
    setFormData({ title: '', description: '', category: 'SECURITY_AWARENESS', durationMinutes: 60, required: false, frequency: 'annual', passingScore: 80, soaControls: [] })
    setDialogOpen(true)
  }

  const openEdit = (course: any) => {
    setEditingCourse(course)
    setFormData({
      title: course.title, description: course.description, category: course.category,
      durationMinutes: course.durationMinutes, required: course.required,
      frequency: course.frequency || 'annual', passingScore: course.passingScore,
      soaControls: course.soaControls || [],
    })
    setDialogOpen(true)
  }

  const completionRate = enrollStats.total > 0 ? Math.round((enrollStats.completed / enrollStats.total) * 100) : 0

  if (loading) return <div className="p-6 space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32" />)}</div>

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BusinessUnitSelector selectedId={selectedBU} onSelect={setSelectedBU} />
          <div>
            <h1 className="text-2xl font-bold gradient-animated">Capacitación y Concientización</h1>
            <p className="text-sm text-muted-foreground mt-1">ISO 27001 — Control A.6.3</p>
          </div>
        </div>
        <div className="flex gap-2">
          {courses.length === 0 && <Button onClick={handleSeed} variant="outline" className="gap-2"><GraduationCap className="h-4 w-4" /> Cursos ISO</Button>}
          <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Nuevo Curso</Button>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <div className="metric-card"><p className="text-[10px] text-muted-foreground uppercase">Cursos</p><h3 className="text-2xl font-bold text-neon-cyan mt-1">{stats.total || 0}</h3></div>
        <div className="metric-card"><p className="text-[10px] text-muted-foreground uppercase">Inscripciones</p><h3 className="text-2xl font-bold text-neon-blue mt-1">{enrollStats.total || 0}</h3></div>
        <div className="metric-card"><p className="text-[10px] text-muted-foreground uppercase">Completados</p><h3 className="text-2xl font-bold text-neon-green mt-1">{enrollStats.completed || 0}</h3></div>
        <div className="metric-card"><p className="text-[10px] text-muted-foreground uppercase">Tasa Completado</p><h3 className="text-2xl font-bold text-neon-purple mt-1">{completionRate}%</h3></div>
      </div>

      <div className="flex gap-2">
        <Button variant={activeTab === 'courses' ? 'default' : 'outline'} onClick={() => setActiveTab('courses')} className="gap-2"><GraduationCap className="h-4 w-4" /> Cursos</Button>
        <Button variant={activeTab === 'enrollments' ? 'default' : 'outline'} onClick={() => setActiveTab('enrollments')} className="gap-2"><Users className="h-4 w-4" /> Inscripciones</Button>
      </div>

      {activeTab === 'courses' ? (
        <Card className="glass-card">
          <CardContent className="p-0">
            {courses.length === 0 ? (
              <div className="py-12 text-center"><GraduationCap className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" /><p className="text-sm text-muted-foreground">Sin cursos. Haz clic en "Cursos ISO"</p></div>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Curso</TableHead><TableHead>Categoría</TableHead><TableHead>Duración</TableHead><TableHead>Frecuencia</TableHead><TableHead>Requerido</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader>
                <TableBody>
                  {courses.map(c => (
                    <TableRow key={c.id}>
                      <TableCell><p className="text-sm font-medium">{c.title}</p><p className="text-xs text-muted-foreground">{c.description?.slice(0, 60)}</p></TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{categoryLabels[c.category] || c.category}</Badge></TableCell>
                      <TableCell className="text-xs">{c.durationMinutes} min</TableCell>
                      <TableCell className="text-xs">{c.frequency || '-'}</TableCell>
                      <TableCell>{c.required ? <Badge className="bg-neon-red/20 text-neon-red text-[10px]">SÍ</Badge> : <Badge variant="outline" className="text-[10px]">NO</Badge>}</TableCell>
                      <TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Edit2 className="h-3.5" /></Button><Button variant="ghost" size="icon" className="h-7 w-7 text-neon-red" onClick={() => handleDelete(c.id)}><Trash2 className="h-3.5" /></Button></div></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card">
          <CardContent className="p-0">
            {enrollments.length === 0 ? (
              <div className="py-12 text-center"><Users className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" /><p className="text-sm text-muted-foreground">Sin inscripciones</p></div>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Curso</TableHead><TableHead>Usuario</TableHead><TableHead>Estado</TableHead><TableHead>Inicio</TableHead><TableHead>Final</TableHead><TableHead>Nota</TableHead></TableRow></TableHeader>
                <TableBody>
                  {enrollments.map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="text-sm">{e.course?.title}</TableCell>
                      <TableCell className="text-sm">{e.userName}</TableCell>
                      <TableCell><Badge style={{ backgroundColor: statusColors[e.status] + '20', color: statusColors[e.status], borderColor: statusColors[e.status] + '30' }} className="text-[10px]">{e.status}</Badge></TableCell>
                      <TableCell className="text-xs">{e.startedAt ? new Date(e.startedAt).toLocaleDateString('es-CO') : '-'}</TableCell>
                      <TableCell className="text-xs">{e.completedAt ? new Date(e.completedAt).toLocaleDateString('es-CO') : '-'}</TableCell>
                      <TableCell className="text-sm font-bold">{e.score != null ? `${e.score}%` : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingCourse ? 'Editar Curso' : 'Nuevo Curso'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><label className="text-xs text-muted-foreground">Título *</label><Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="mt-1" /></div>
            <div><label className="text-xs text-muted-foreground">Descripción</label><Input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Categoría</label><Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(categoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
              <div><label className="text-xs text-muted-foreground">Duración (min)</label><Input type="number" value={formData.durationMinutes} onChange={e => setFormData({ ...formData, durationMinutes: +e.target.value })} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Frecuencia</label><Select value={formData.frequency} onValueChange={v => setFormData({ ...formData, frequency: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="annual">Anual</SelectItem><SelectItem value="quarterly">Trimestral</SelectItem><SelectItem value="monthly">Mensual</SelectItem></SelectContent></Select></div>
              <div><label className="text-xs text-muted-foreground">Nota mínima (%)</label><Input type="number" value={formData.passingScore} onChange={e => setFormData({ ...formData, passingScore: +e.target.value })} className="mt-1" /></div>
            </div>
            <div className="flex items-center gap-2"><input type="checkbox" checked={formData.required} onChange={e => setFormData({ ...formData, required: e.target.checked })} className="rounded" /><label className="text-sm">Requerido para todos los empleados</label></div>
            <div className="flex gap-2 pt-4"><Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Cancelar</Button><Button onClick={handleSave} className="flex-1">{editingCourse ? 'Actualizar' : 'Crear'}</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}