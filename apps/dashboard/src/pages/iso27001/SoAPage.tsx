import { useState, useEffect } from 'react'
import { BusinessUnitSelector } from '@/components/iso27001/BusinessUnitSelector'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  CheckCircle2, XCircle, MinusCircle, Shield,
  ClipboardCheck, Edit2, Download, Upload,
  Filter, Search,
} from 'lucide-react'

interface SoAControl {
  id: string
  controlId: string
  title: string
  description: string
  category: string
  applicable: boolean
  justification?: string
  implementationStatus: 'NOT_IMPLEMENTED' | 'PARTIAL' | 'IMPLEMENTED' | 'NOT_APPLICABLE'
  implementationNotes?: string
  owner?: string
  relatedModule?: string
  lastReviewed?: string
}

const categoryLabels: Record<string, string> = {
  A5_ORGANIZATIONAL: 'A.5 Organizativos (37)',
  A6_PEOPLE: 'A.6 Personas (8)',
  A7_PHYSICAL: 'A.7 Físicos (14)',
  A8_TECHNOLOGICAL: 'A.8 Tecnológicos (34)',
}

const statusLabels: Record<string, { label: string; color: string; icon: any }> = {
  IMPLEMENTED: { label: 'Implementado', color: '#10B981', icon: CheckCircle2 },
  PARTIAL: { label: 'Parcial', color: '#EAB308', icon: CheckCircle2 },
  NOT_IMPLEMENTED: { label: 'No Implementado', color: '#EF4444', icon: XCircle },
  NOT_APPLICABLE: { label: 'No Aplicable', color: '#6B7280', icon: MinusCircle },
}

export function SoAPage() {
  const [loading, setLoading] = useState(true)
  const [selectedBU, setSelectedBU] = useState<string | null>(null)
  const [controls, setControls] = useState<SoAControl[]>([])
  const [stats, setStats] = useState<any>({})
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingControl, setEditingControl] = useState<SoAControl | null>(null)
  const [formData, setFormData] = useState({
    applicable: true,
    justification: '',
    implementationStatus: 'NOT_IMPLEMENTED',
    implementationNotes: '',
    owner: '',
    relatedModule: '',
  })

  useEffect(() => {
    fetchControls()
  }, [selectedBU])

  const fetchControls = async () => {
    try {
      setLoading(true)
      const params = selectedBU ? `?businessUnitId=${selectedBU}` : ''
      const res = await api.get(`/iso27001/soa${params}`)
      setControls(res.data.controls || [])
      setStats(res.data.stats || {})
    } catch (error) {
      toast.error('Error al cargar controles')
    } finally {
      setLoading(false)
    }
  }

  const handleSeed = async () => {
    if (!confirm('¿Cargar los 93 controles del Anexo A de ISO 27001:2022?')) return
    try {
      await api.post('/iso27001/soa/seed', { businessUnitId: selectedBU })
      toast.success('Controles cargados exitosamente')
      fetchControls()
    } catch (error) {
      toast.error('Error al cargar controles')
    }
  }

  const handleOpenDialog = (control?: SoAControl) => {
    if (control) {
      setEditingControl(control)
      setFormData({
        applicable: control.applicable,
        justification: control.justification || '',
        implementationStatus: control.implementationStatus,
        implementationNotes: control.implementationNotes || '',
        owner: control.owner || '',
        relatedModule: control.relatedModule || '',
      })
    } else {
      setEditingControl(null)
      setFormData({
        applicable: true,
        justification: '',
        implementationStatus: 'NOT_IMPLEMENTED',
        implementationNotes: '',
        owner: '',
        relatedModule: '',
      })
    }
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!editingControl) return
    try {
      await api.put(`/iso27001/soa/${editingControl.id}`, formData)
      toast.success('Control actualizado')
      setDialogOpen(false)
      fetchControls()
    } catch (error) {
      toast.error('Error al guardar control')
    }
  }

  const handleExport = () => {
    const csv = [
      ['ID', 'Título', 'Categoría', 'Aplicable', 'Estado', 'Owner', 'Notas'].join(','),
      ...controls.map(c => [
        c.controlId,
        `"${c.title}"`,
        c.category,
        c.applicable ? 'Sí' : 'No',
        c.implementationStatus,
        c.owner || '',
        `"${c.implementationNotes || ''}"`,
      ].join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `soa_iso27001_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    toast.success('SoA exportado')
  }

  const filteredControls = controls.filter(c => {
    const matchCategory = categoryFilter === 'all' || c.category === categoryFilter
    const matchStatus = statusFilter === 'all' || c.implementationStatus === statusFilter
    const matchSearch = !search || 
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.controlId.toLowerCase().includes(search.toLowerCase())
    return matchCategory && matchStatus && matchSearch
  })

  const compliancePercentage = stats.total > 0 
    ? Math.round((stats.implemented / stats.total) * 100) 
    : 0

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BusinessUnitSelector selectedId={selectedBU} onSelect={setSelectedBU} />
          <div>
            <h1 className="text-2xl font-bold gradient-animated">Declaración de Aplicabilidad</h1>
            <p className="text-sm text-muted-foreground mt-1">ISO 27001:2022 - Anexo A (93 controles)</p>
          </div>
        </div>
        <div className="flex gap-2">
          {controls.length === 0 && (
            <Button onClick={handleSeed} variant="outline" className="gap-2">
              <Upload className="h-4 w-4" /> Cargar 93 Controles
            </Button>
          )}
          <Button onClick={handleExport} variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="h-10 w-10 rounded-lg bg-neon-cyan/10 flex items-center justify-center">
                <ClipboardCheck className="h-5 w-5 text-neon-cyan" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Total Controles</p>
            <h3 className="text-2xl font-bold text-neon-cyan mt-1">{stats.total || 0}</h3>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="h-10 w-10 rounded-lg bg-neon-green/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-neon-green" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Implementados</p>
            <h3 className="text-2xl font-bold text-neon-green mt-1">{stats.implemented || 0}</h3>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="h-10 w-10 rounded-lg bg-neon-yellow/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-neon-yellow" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Parciales</p>
            <h3 className="text-2xl font-bold text-neon-yellow mt-1">{stats.partial || 0}</h3>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="h-10 w-10 rounded-lg bg-neon-purple/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-neon-purple" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Cumplimiento</p>
            <h3 className="text-2xl font-bold text-neon-purple mt-1">{compliancePercentage}%</h3>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <div className="grid gap-4 md:grid-cols-4">
        {Object.entries(categoryLabels).map(([key, label]) => {
          const categoryControls = controls.filter(c => c.category === key)
          const implemented = categoryControls.filter(c => c.implementationStatus === 'IMPLEMENTED').length
          const percentage = categoryControls.length > 0 
            ? Math.round((implemented / categoryControls.length) * 100) 
            : 0

          return (
            <Card key={key} className="glass-card">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-2">{label}</p>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-lg font-bold">{implemented}/{categoryControls.length}</p>
                    <p className="text-xs text-muted-foreground">{percentage}% completo</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-muted/30 flex items-center justify-center">
                    <span className="text-sm font-bold" style={{ color: percentage >= 80 ? '#10B981' : percentage >= 50 ? '#EAB308' : '#EF4444' }}>
                      {percentage}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar controles..."
                className="pl-9 bg-muted/30 border-border/30"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-muted/30 border-border/30">
                <Filter className="h-3.5 w-3.5 mr-1" />
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-muted/30 border-border/30">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="IMPLEMENTED">Implementado</SelectItem>
                <SelectItem value="PARTIAL">Parcial</SelectItem>
                <SelectItem value="NOT_IMPLEMENTED">No Implementado</SelectItem>
                <SelectItem value="NOT_APPLICABLE">No Aplicable</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Controls List */}
      <div className="space-y-2">
        {filteredControls.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-12 text-center">
              <ClipboardCheck className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No hay controles</p>
              {controls.length === 0 && (
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Haz clic en "Cargar 93 Controles" para comenzar
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredControls.map(control => {
            const status = statusLabels[control.implementationStatus] || statusLabels.NOT_IMPLEMENTED
            const StatusIcon = status.icon

            return (
              <Card key={control.id} className="glass-card hover:border-neon-cyan/20 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <Badge variant="outline" className="text-xs font-mono">
                        {control.controlId}
                      </Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-sm font-semibold">{control.title}</h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge
                            variant="outline"
                            className="text-[10px] font-medium"
                            style={{
                              backgroundColor: `${status.color}15`,
                              color: status.color,
                              borderColor: `${status.color}30`,
                            }}
                          >
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleOpenDialog(control)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{control.description}</p>
                      {control.implementationNotes && (
                        <p className="text-xs text-muted-foreground/80 italic">
                          {control.implementationNotes}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {control.owner && (
                          <span>Owner: <span className="font-medium">{control.owner}</span></span>
                        )}
                        {control.relatedModule && (
                          <span>Módulo: <span className="font-medium">{control.relatedModule}</span></span>
                        )}
                        {control.lastReviewed && (
                          <span>Revisado: {new Date(control.lastReviewed).toLocaleDateString('es-CO')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Control {editingControl?.controlId}</DialogTitle>
            <DialogDescription>
              {editingControl?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-xs text-muted-foreground">Aplicable</label>
              <Select 
                value={formData.applicable ? 'yes' : 'no'} 
                onValueChange={v => setFormData({ ...formData, applicable: v === 'yes' })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Sí</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!formData.applicable && (
              <div>
                <label className="text-xs text-muted-foreground">Justificación de Exclusión</label>
                <textarea
                  value={formData.justification}
                  onChange={e => setFormData({ ...formData, justification: e.target.value })}
                  placeholder="¿Por qué este control no es aplicable?"
                  className="w-full h-20 bg-muted/30 border border-border rounded-lg p-3 text-sm resize-none mt-1"
                />
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground">Estado de Implementación</label>
              <Select 
                value={formData.implementationStatus} 
                onValueChange={v => setFormData({ ...formData, implementationStatus: v as any })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IMPLEMENTED">Implementado</SelectItem>
                  <SelectItem value="PARTIAL">Parcial</SelectItem>
                  <SelectItem value="NOT_IMPLEMENTED">No Implementado</SelectItem>
                  <SelectItem value="NOT_APPLICABLE">No Aplicable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Notas de Implementación</label>
              <textarea
                value={formData.implementationNotes}
                onChange={e => setFormData({ ...formData, implementationNotes: e.target.value })}
                placeholder="Describe cómo se implementa este control..."
                className="w-full h-24 bg-muted/30 border border-border rounded-lg p-3 text-sm resize-none mt-1"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs text-muted-foreground">Owner</label>
                <Input
                  value={formData.owner}
                  onChange={e => setFormData({ ...formData, owner: e.target.value })}
                  placeholder="Responsable del control"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Módulo Relacionado</label>
                <Select 
                  value={formData.relatedModule} 
                  onValueChange={v => setFormData({ ...formData, relatedModule: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pentest">Pentesting</SelectItem>
                    <SelectItem value="vulnerabilities">Vulnerabilidades</SelectItem>
                    <SelectItem value="incidents">Incidentes</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                    <SelectItem value="assets">Activos</SelectItem>
                    <SelectItem value="audit">Auditoría</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleSave} className="flex-1">
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}