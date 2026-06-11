import { useState, useEffect } from 'react'
import { BusinessUnitSelector } from '@/components/iso27001/BusinessUnitSelector'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import {
  AlertTriangle, Plus, Edit2, Trash2, Search, Filter,
  TrendingUp, Shield, Target, X,
} from 'lucide-react'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'

interface Risk {
  id: string
  title: string
  description: string
  category: string
  likelihood: number
  impact: number
  riskScore: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  treatmentOption: string
  treatmentPlan?: string
  residualRisk?: number
  status: string
  owner: string
  dueDate?: string
  createdAt: string
}

const categoryLabels: Record<string, string> = {
  STRATEGIC: 'Estratégico',
  OPERATIONAL: 'Operacional',
  FINANCIAL: 'Financiero',
  COMPLIANCE: 'Cumplimiento',
  TECHNICAL: 'Técnico',
  PHYSICAL: 'Físico',
  HUMAN: 'Humano',
}

const statusLabels: Record<string, { label: string; color: string }> = {
  OPEN: { label: 'Abierto', color: '#EF4444' },
  IN_PROGRESS: { label: 'En Progreso', color: '#EAB308' },
  MITIGATED: { label: 'Mitigado', color: '#10B981' },
  ACCEPTED: { label: 'Aceptado', color: '#6B7280' },
  TRANSFERRED: { label: 'Transferido', color: '#3B82F6' },
  CLOSED: { label: 'Cerrado', color: '#6B7280' },
}

const levelColors: Record<string, string> = {
  LOW: '#10B981',
  MEDIUM: '#EAB308',
  HIGH: '#F59E0B',
  CRITICAL: '#EF4444',
}

export function RisksPage() {
  const [loading, setLoading] = useState(true)
  const [selectedBU, setSelectedBU] = useState<string | null>(null)
  const [risks, setRisks] = useState<Risk[]>([])
  const [stats, setStats] = useState<any>({})
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [levelFilter, setLevelFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'TECHNICAL',
    likelihood: 3,
    impact: 3,
    treatmentOption: 'MITIGATE',
    treatmentPlan: '',
    status: 'OPEN',
    owner: '',
    dueDate: '',
  })

  useEffect(() => {
    fetchRisks()
  }, [selectedBU])

  const fetchRisks = async () => {
    try {
      setLoading(true)
      const params = selectedBU ? `?businessUnitId=${selectedBU}` : ''
      const res = await api.get(`/iso27001/risks${params}`)
      setRisks(res.data.risks || [])
      setStats(res.data.stats || {})
    } catch (error) {
      toast.error('Error al cargar riesgos')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (risk?: Risk) => {
    if (risk) {
      setEditingRisk(risk)
      setFormData({
        title: risk.title,
        description: risk.description,
        category: risk.category,
        likelihood: risk.likelihood,
        impact: risk.impact,
        treatmentOption: risk.treatmentOption,
        treatmentPlan: risk.treatmentPlan || '',
        status: risk.status,
        owner: risk.owner,
        dueDate: risk.dueDate?.split('T')[0] || '',
      })
    } else {
      setEditingRisk(null)
      setFormData({
        title: '',
        description: '',
        category: 'TECHNICAL',
        likelihood: 3,
        impact: 3,
        treatmentOption: 'MITIGATE',
        treatmentPlan: '',
        status: 'OPEN',
        owner: '',
        dueDate: '',
      })
    }
    setDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      if (editingRisk) {
        await api.put(`/iso27001/risks/${editingRisk.id}`, formData)
        toast.success('Riesgo actualizado')
      } else {
        await api.post('/iso27001/risks', { ...formData, businessUnitId: selectedBU })
        toast.success('Riesgo creado')
      }
      setDialogOpen(false)
      fetchRisks()
    } catch (error) {
      toast.error('Error al guardar riesgo')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este riesgo?')) return
    try {
      await api.delete(`/iso27001/risks/${id}`)
      toast.success('Riesgo eliminado')
      fetchRisks()
    } catch (error) {
      toast.error('Error al eliminar riesgo')
    }
  }

  const filteredRisks = risks.filter(r => {
    const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || r.status === statusFilter
    const matchLevel = levelFilter === 'all' || r.riskLevel === levelFilter
    return matchSearch && matchStatus && matchLevel
  })

  // Matrix data
  const matrixData = risks.map(r => ({
    x: r.likelihood,
    y: r.impact,
    z: r.riskScore,
    name: r.title,
    level: r.riskLevel,
  }))

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
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
            <h1 className="text-2xl font-bold gradient-animated">Gestión de Riesgos</h1>
            <p className="text-sm text-muted-foreground mt-1">ISO 27001 - Evaluación y tratamiento de riesgos</p>
          </div>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" /> Nuevo Riesgo
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="h-10 w-10 rounded-lg bg-neon-cyan/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-neon-cyan" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Total Riesgos</p>
            <h3 className="text-2xl font-bold text-neon-cyan mt-1">{stats.total || 0}</h3>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="h-10 w-10 rounded-lg bg-neon-red/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-neon-red" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Críticos</p>
            <h3 className="text-2xl font-bold text-neon-red mt-1">{stats.critical || 0}</h3>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="h-10 w-10 rounded-lg bg-neon-yellow/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-neon-yellow" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Abiertos</p>
            <h3 className="text-2xl font-bold text-neon-yellow mt-1">{stats.open || 0}</h3>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="h-10 w-10 rounded-lg bg-neon-green/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-neon-green" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Mitigados</p>
            <h3 className="text-2xl font-bold text-neon-green mt-1">{stats.mitigated || 0}</h3>
          </CardContent>
        </Card>
      </div>

      {/* Risk Matrix */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Matriz de Riesgos (Probabilidad × Impacto)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" dataKey="x" name="Probabilidad" domain={[0, 6]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} label={{ value: 'Probabilidad', position: 'bottom', fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              <YAxis type="number" dataKey="y" name="Impacto" domain={[0, 6]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} label={{ value: 'Impacto', angle: -90, position: 'left', fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }}
                formatter={(value: any, name: string) => [value, name]}
                labelFormatter={() => ''}
              />
              <Scatter data={matrixData} fill="#8884d8">
                {matrixData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={levelColors[entry.level]} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar riesgos..."
                className="pl-9 bg-muted/30 border-border/30"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40 bg-muted/30 border-border/30">
                <Filter className="h-3.5 w-3.5 mr-1" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="OPEN">Abierto</SelectItem>
                <SelectItem value="IN_PROGRESS">En Progreso</SelectItem>
                <SelectItem value="MITIGATED">Mitigado</SelectItem>
                <SelectItem value="ACCEPTED">Aceptado</SelectItem>
                <SelectItem value="CLOSED">Cerrado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-full sm:w-40 bg-muted/30 border-border/30">
                <SelectValue placeholder="Nivel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="CRITICAL">Crítico</SelectItem>
                <SelectItem value="HIGH">Alto</SelectItem>
                <SelectItem value="MEDIUM">Medio</SelectItem>
                <SelectItem value="LOW">Bajo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Risks Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          {filteredRisks.length === 0 ? (
            <div className="py-12 text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No hay riesgos registrados</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Haz clic en "Nuevo Riesgo" para comenzar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30 hover:bg-transparent">
                    <TableHead className="text-xs">Riesgo</TableHead>
                    <TableHead className="text-xs">Categoría</TableHead>
                    <TableHead className="text-xs">Nivel</TableHead>
                    <TableHead className="text-xs">Score</TableHead>
                    <TableHead className="text-xs">Tratamiento</TableHead>
                    <TableHead className="text-xs">Estado</TableHead>
                    <TableHead className="text-xs">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRisks.map(risk => (
                    <TableRow key={risk.id} className="border-border/20 hover:bg-neon-cyan/3">
                      <TableCell>
                        <p className="text-sm font-medium">{risk.title}</p>
                        {risk.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[300px]">{risk.description}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{categoryLabels[risk.category] || risk.category}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-medium"
                          style={{
                            backgroundColor: `${levelColors[risk.riskLevel]}15`,
                            color: levelColors[risk.riskLevel],
                            borderColor: `${levelColors[risk.riskLevel]}30`,
                          }}
                        >
                          {risk.riskLevel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-bold">{risk.riskScore}</TableCell>
                      <TableCell className="text-xs">{risk.treatmentOption}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-medium"
                          style={{
                            color: statusLabels[risk.status]?.color,
                            borderColor: `${statusLabels[risk.status]?.color}40`,
                          }}
                        >
                          {statusLabels[risk.status]?.label || risk.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenDialog(risk)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-neon-red" onClick={() => handleDelete(risk.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRisk ? 'Editar Riesgo' : 'Nuevo Riesgo'}</DialogTitle>
            <DialogDescription>
              {editingRisk ? 'Modifica los detalles del riesgo' : 'Registra un nuevo riesgo de seguridad'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-xs text-muted-foreground">Título</label>
              <Input
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="Nombre del riesgo"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Descripción</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción detallada del riesgo"
                className="w-full h-24 bg-muted/30 border border-border rounded-lg p-3 text-sm resize-none mt-1"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs text-muted-foreground">Categoría</label>
                <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Owner</label>
                <Input
                  value={formData.owner}
                  onChange={e => setFormData({ ...formData, owner: e.target.value })}
                  placeholder="Responsable"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs text-muted-foreground">Probabilidad (1-5)</label>
                <Input
                  type="number"
                  min="1"
                  max="5"
                  value={formData.likelihood}
                  onChange={e => setFormData({ ...formData, likelihood: Number(e.target.value) })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Impacto (1-5)</label>
                <Input
                  type="number"
                  min="1"
                  max="5"
                  value={formData.impact}
                  onChange={e => setFormData({ ...formData, impact: Number(e.target.value) })}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="p-3 bg-muted/20 rounded-lg">
              <p className="text-xs text-muted-foreground">Score de Riesgo: <span className="font-bold text-lg">{formData.likelihood * formData.impact}</span></p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Opción de Tratamiento</label>
              <Select value={formData.treatmentOption} onValueChange={v => setFormData({ ...formData, treatmentOption: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MITIGATE">Mitigar</SelectItem>
                  <SelectItem value="TRANSFER">Transferir</SelectItem>
                  <SelectItem value="ACCEPT">Aceptar</SelectItem>
                  <SelectItem value="AVOID">Evitar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Plan de Tratamiento</label>
              <textarea
                value={formData.treatmentPlan}
                onChange={e => setFormData({ ...formData, treatmentPlan: e.target.value })}
                placeholder="Describe cómo se tratará este riesgo"
                className="w-full h-20 bg-muted/30 border border-border rounded-lg p-3 text-sm resize-none mt-1"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs text-muted-foreground">Estado</label>
                <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Abierto</SelectItem>
                    <SelectItem value="IN_PROGRESS">En Progreso</SelectItem>
                    <SelectItem value="MITIGATED">Mitigado</SelectItem>
                    <SelectItem value="ACCEPTED">Aceptado</SelectItem>
                    <SelectItem value="TRANSFERRED">Transferido</SelectItem>
                    <SelectItem value="CLOSED">Cerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Fecha Límite</label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 gap-2">
                <X className="h-4 w-4" /> Cancelar
              </Button>
              <Button onClick={handleSave} className="flex-1 gap-2">
                {editingRisk ? 'Actualizar' : 'Crear'} Riesgo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}