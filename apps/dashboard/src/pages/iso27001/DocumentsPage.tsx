import { useState, useEffect } from 'react'
import { useBusinessUnit } from '@/contexts/BusinessUnitContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Archive,
} from 'lucide-react'

interface Document {
  id: string
  title: string
  type: string
  category: string
  content?: string
  fileUrl?: string
  fileSize?: number
  version: string
  status: string
  owner?: string
  reviewers: string[]
  approvedBy?: string
  approvedAt?: string
  nextReviewDate?: string
  tags: string[]
  relatedSoA: string[]
  createdAt: string
  updatedAt: string
}

interface DocumentStats {
  total: number
  byType: Record<string, number>
  byStatus: Record<string, number>
  approved: number
  pendingReview: number
}

const documentTypes = [
  { value: 'POLICY', label: 'Política' },
  { value: 'PROCEDURE', label: 'Procedimiento' },
  { value: 'WORK_INSTRUCTION', label: 'Instrucción de Trabajo' },
  { value: 'RECORD', label: 'Registro' },
  { value: 'PLAN', label: 'Plan' },
  { value: 'REPORT', label: 'Informe' },
  { value: 'MANUAL', label: 'Manual' },
]

const documentCategories = [
  { value: 'INFORMATION_SECURITY', label: 'Seguridad de la Información' },
  { value: 'ACCESS_CONTROL', label: 'Control de Acceso' },
  { value: 'CRYPTOGRAPHY', label: 'Criptografía' },
  { value: 'PHYSICAL_SECURITY', label: 'Seguridad Física' },
  { value: 'OPERATIONS_SECURITY', label: 'Seguridad Operacional' },
  { value: 'COMMUNICATIONS_SECURITY', label: 'Seguridad en Comunicaciones' },
  { value: 'SYSTEM_ACQUISITION', label: 'Adquisición de Sistemas' },
  { value: 'SUPPLIER_RELATIONSHIPS', label: 'Relaciones con Proveedores' },
  { value: 'INCIDENT_MANAGEMENT', label: 'Gestión de Incidentes' },
  { value: 'BUSINESS_CONTINUITY', label: 'Continuidad del Negocio' },
  { value: 'COMPLIANCE', label: 'Cumplimiento' },
  { value: 'HR_SECURITY', label: 'Seguridad en RRHH' },
  { value: 'ASSET_MANAGEMENT', label: 'Gestión de Activos' },
  { value: 'RISK_MANAGEMENT', label: 'Gestión de Riesgos' },
]

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  DRAFT: { icon: Edit, color: 'bg-gray-500', label: 'Borrador' },
  IN_REVIEW: { icon: Clock, color: 'bg-yellow-500', label: 'En Revisión' },
  APPROVED: { icon: CheckCircle, color: 'bg-green-500', label: 'Aprobado' },
  REJECTED: { icon: XCircle, color: 'bg-red-500', label: 'Rechazado' },
  OBSOLETE: { icon: Archive, color: 'bg-gray-400', label: 'Obsoleto' },
}

export function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [stats, setStats] = useState<DocumentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const { selectedBU } = useBusinessUnit()
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [formData, setFormData] = useState<Partial<Document>>({
    title: '',
    type: 'POLICY',
    category: 'INFORMATION_SECURITY',
    content: '',
    version: '1.0',
    status: 'DRAFT',
    owner: '',
    reviewers: [],
    tags: [],
    relatedSoA: [],
  })

  useEffect(() => {
    fetchDocuments()
  }, [selectedBU])

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (typeFilter !== 'all') params.append('type', typeFilter)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (searchTerm) params.append('search', searchTerm)
      if (selectedBU) params.append('businessUnitId', selectedBU)

      const response = await api.get(`/documents?${params.toString()}`)
      setDocuments(response.data.documents)
      setStats(response.data.stats)
    } catch (error) {
      console.error('Error fetching documents:', error)
      toast.error('Error al cargar documentos')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setFormData({
      title: '',
      type: 'POLICY',
      category: 'INFORMATION_SECURITY',
      content: '',
      version: '1.0',
      status: 'DRAFT',
      owner: '',
      reviewers: [],
      tags: [],
      relatedSoA: [],
    })
    setEditDialogOpen(true)
  }

  const handleEdit = (doc: Document) => {
    setFormData(doc)
    setEditDialogOpen(true)
  }

  const handleView = (doc: Document) => {
    setSelectedDoc(doc)
    setViewDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      if (formData.id) {
        await api.put(`/documents/${formData.id}`, formData)
        toast.success('Documento actualizado')
      } else {
        await api.post('/documents', { ...formData, businessUnitId: selectedBU })
        toast.success('Documento creado')
      }
      setEditDialogOpen(false)
      fetchDocuments()
    } catch (error) {
      console.error('Error saving document:', error)
      toast.error('Error al guardar documento')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este documento?')) return

    try {
      await api.delete(`/documents/${id}`)
      toast.success('Documento eliminado')
      fetchDocuments()
    } catch (error) {
      console.error('Error deleting document:', error)
      toast.error('Error al eliminar documento')
    }
  }

  const handleSeed = async () => {
    if (!confirm('¿Deseas crear los documentos ISO 27001 requeridos?')) return

    try {
      const response = await api.post('/documents/seed')
      toast.success(response.data.message)
      fetchDocuments()
    } catch (error) {
      console.error('Error seeding documents:', error)
      toast.error('Error al crear documentos')
    }
  }

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.content?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === 'all' || doc.type === typeFilter
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter
    return matchesSearch && matchesType && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || statusConfig.DRAFT
    const Icon = config.icon
    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const getTypeLabel = (type: string) => {
    return documentTypes.find(t => t.value === type)?.label || type
  }

  const getCategoryLabel = (category: string) => {
    return documentCategories.find(c => c.value === category)?.label || category
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Gestión de Documentos</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Documentos</h1>
          <p className="text-muted-foreground mt-1">
            Políticas, procedimientos y documentación ISO 27001
          </p>
        </div>
        <div className="flex gap-2">

          {documents.length === 0 && (
            <Button onClick={handleSeed} variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              Crear Documentos ISO 27001
            </Button>
          )}
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Documento
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Documentos</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Aprobados</p>
                  <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">En Revisión</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.byStatus.IN_REVIEW || 0}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Revisión Pendiente</p>
                  <p className="text-2xl font-bold text-red-600">{stats.pendingReview}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar documentos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {documentTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {Object.entries(statusConfig).map(([value, config]) => (
                  <SelectItem key={value} value={value}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Documentos ({filteredDocuments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay documentos</p>
              <p className="text-sm text-muted-foreground mt-2">
                Crea el primer documento o carga los documentos ISO 27001 requeridos
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Versión</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Propietario</TableHead>
                  <TableHead>Próxima Revisión</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.title}</TableCell>
                    <TableCell>{getTypeLabel(doc.type)}</TableCell>
                    <TableCell>{getCategoryLabel(doc.category)}</TableCell>
                    <TableCell>{doc.version}</TableCell>
                    <TableCell>{getStatusBadge(doc.status)}</TableCell>
                    <TableCell>{doc.owner || '-'}</TableCell>
                    <TableCell>
                      {doc.nextReviewDate ? (
                        new Date(doc.nextReviewDate).toLocaleDateString('es-ES')
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(doc)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(doc)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(doc.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedDoc?.title}</DialogTitle>
            <DialogDescription>
              {getTypeLabel(selectedDoc?.type || '')} - {getCategoryLabel(selectedDoc?.category || '')}
            </DialogDescription>
          </DialogHeader>
          {selectedDoc && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Versión</label>
                  <p className="text-sm text-muted-foreground">{selectedDoc.version}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Estado</label>
                  <div className="mt-1">{getStatusBadge(selectedDoc.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Propietario</label>
                  <p className="text-sm text-muted-foreground">{selectedDoc.owner || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Próxima Revisión</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedDoc.nextReviewDate
                      ? new Date(selectedDoc.nextReviewDate).toLocaleDateString('es-ES')
                      : '-'}
                  </p>
                </div>
              </div>
              {selectedDoc.content && (
                <div>
                  <label className="text-sm font-medium">Contenido</label>
                  <div className="mt-2 p-4 bg-muted rounded-md whitespace-pre-wrap">
                    {selectedDoc.content}
                  </div>
                </div>
              )}
              {selectedDoc.tags.length > 0 && (
                <div>
                  <label className="text-sm font-medium">Etiquetas</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedDoc.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {selectedDoc.relatedSoA.length > 0 && (
                <div>
                  <label className="text-sm font-medium">Controles SoA Relacionados</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedDoc.relatedSoA.map((control, i) => (
                      <Badge key={i} variant="outline">
                        {control}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                <p>Creado: {new Date(selectedDoc.createdAt).toLocaleString('es-ES')}</p>
                <p>Actualizado: {new Date(selectedDoc.updatedAt).toLocaleString('es-ES')}</p>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button onClick={() => setViewDialogOpen(false)}>Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {formData.id ? 'Editar Documento' : 'Nuevo Documento'}
            </DialogTitle>
            <DialogDescription>
              {formData.id
                ? 'Actualiza la información del documento'
                : 'Completa la información para crear un nuevo documento'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Título *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ej: Política de Seguridad de la Información"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Tipo *</label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Categoría *</label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {documentCategories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Versión</label>
                <Input
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  placeholder="1.0"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Estado</label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusConfig).map(([value, config]) => (
                      <SelectItem key={value} value={value}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Propietario</label>
              <Input
                value={formData.owner}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                placeholder="Nombre del responsable"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Contenido</label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Contenido del documento (Markdown soportado)"
                rows={12}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Próxima Fecha de Revisión</label>
              <Input
                type="date"
                value={formData.nextReviewDate?.split('T')[0] || ''}
                onChange={(e) =>
                  setFormData({ ...formData, nextReviewDate: e.target.value })
                }
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {formData.id ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
