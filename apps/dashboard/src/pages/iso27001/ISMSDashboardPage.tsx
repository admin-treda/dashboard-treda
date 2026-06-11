import { useState, useEffect } from 'react'
import { BusinessUnitSelector } from '@/components/iso27001/BusinessUnitSelector'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Shield, Target, Users, FileText, Calendar,
  TrendingUp, CheckCircle2, AlertTriangle, Clock,
  Edit2, Save, X,
} from 'lucide-react'

interface ISMSData {
  id?: string
  scope: string
  context: any
  interestedParties: any[]
  policyUrl?: string
  policyVersion?: string
  policyApprovedAt?: string
  policyApprovedBy?: string
  overallCompliance: number
  lastManagementReview?: string
  nextAuditDate?: string
}

export function ISMSDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [selectedBU, setSelectedBU] = useState<string | null>(null)
  const [isms, setIsms] = useState<ISMSData | null>(null)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState<ISMSData>({
    scope: '',
    context: {},
    interestedParties: [],
    overallCompliance: 0,
  })

  useEffect(() => {
    fetchISMS()
  }, [selectedBU])

  const fetchISMS = async () => {
    try {
      setLoading(true)
      const params = selectedBU ? `?businessUnitId=${selectedBU}` : ''
      const res = await api.get(`/iso27001/isms${params}`)
      if (res.data && Object.keys(res.data).length > 0) {
        setIsms(res.data)
        setFormData(res.data)
      } else {
        // Crear uno vacío
        const newIsms = await api.post('/iso27001/isms', { businessUnitId: selectedBU,
          scope: '',
          context: {},
          interestedParties: [],
          overallCompliance: 0,
        })
        setIsms(newIsms.data)
        setFormData(newIsms.data)
      }
    } catch (error) {
      toast.error('Error al cargar ISMS')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      if (isms?.id) {
        await api.put(`/iso27001/isms/${isms.id}`, formData)
        toast.success('ISMS actualizado')
      } else {
        const res = await api.post('/iso27001/isms', formData)
        setIsms(res.data)
        setFormData(res.data)
        toast.success('ISMS creado')
      }
      setEditing(false)
      fetchISMS()
    } catch (error) {
      toast.error('Error al guardar')
    }
  }

  const handleCancel = () => {
    if (isms) setFormData(isms)
    setEditing(false)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-64" />
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
            <h1 className="text-2xl font-bold gradient-animated">Sistema de Gestión de Seguridad</h1>
            <p className="text-sm text-muted-foreground mt-1">ISO 27001:2022 - SGSI Central</p>
          </div>
        </div>
        {!editing ? (
          <Button onClick={() => setEditing(true)} className="gap-2">
            <Edit2 className="h-4 w-4" /> Editar
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} className="gap-2">
              <X className="h-4 w-4" /> Cancelar
            </Button>
            <Button onClick={handleSave} className="gap-2">
              <Save className="h-4 w-4" /> Guardar
            </Button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="h-10 w-10 rounded-lg bg-neon-cyan/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-neon-cyan" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Cumplimiento General</p>
            <h3 className="text-2xl font-bold text-neon-cyan mt-1">
              {editing ? (
                <input
                  type="number"
                  value={formData.overallCompliance}
                  onChange={e => setFormData({ ...formData, overallCompliance: Number(e.target.value) })}
                  className="w-full bg-transparent border-none outline-none text-2xl font-bold"
                  min="0"
                  max="100"
                />
              ) : (
                `${isms?.overallCompliance || 0}%`
              )}
            </h3>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="h-10 w-10 rounded-lg bg-neon-green/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-neon-green" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Última Revisión</p>
            <h3 className="text-sm font-bold mt-1">
              {editing ? (
                <input
                  type="date"
                  value={formData.lastManagementReview?.split('T')[0] || ''}
                  onChange={e => setFormData({ ...formData, lastManagementReview: e.target.value })}
                  className="w-full bg-transparent border-none outline-none text-sm"
                />
              ) : (
                isms?.lastManagementReview
                  ? new Date(isms.lastManagementReview).toLocaleDateString('es-CO')
                  : 'No definida'
              )}
            </h3>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="h-10 w-10 rounded-lg bg-neon-yellow/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-neon-yellow" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Próxima Auditoría</p>
            <h3 className="text-sm font-bold mt-1">
              {editing ? (
                <input
                  type="date"
                  value={formData.nextAuditDate?.split('T')[0] || ''}
                  onChange={e => setFormData({ ...formData, nextAuditDate: e.target.value })}
                  className="w-full bg-transparent border-none outline-none text-sm"
                />
              ) : (
                isms?.nextAuditDate
                  ? new Date(isms.nextAuditDate).toLocaleDateString('es-CO')
                  : 'No programada'
              )}
            </h3>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="h-10 w-10 rounded-lg bg-neon-purple/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-neon-purple" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Política Versión</p>
            <h3 className="text-lg font-bold mt-1">
              {editing ? (
                <input
                  type="text"
                  value={formData.policyVersion || ''}
                  onChange={e => setFormData({ ...formData, policyVersion: e.target.value })}
                  className="w-full bg-transparent border-none outline-none text-lg font-bold"
                  placeholder="v1.0"
                />
              ) : (
                isms?.policyVersion || 'No definida'
              )}
            </h3>
          </CardContent>
        </Card>
      </div>

      {/* Scope & Context */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-neon-cyan" />
              Alcance del SGSI
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <textarea
                value={formData.scope}
                onChange={e => setFormData({ ...formData, scope: e.target.value })}
                className="w-full h-32 bg-muted/30 border border-border rounded-lg p-3 text-sm resize-none"
                placeholder="Define el alcance del Sistema de Gestión de Seguridad de la Información..."
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {isms?.scope || 'No definido. Haz clic en Editar para definir el alcance.'}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-neon-blue" />
              Partes Interesadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <textarea
                value={JSON.stringify(formData.interestedParties, null, 2)}
                onChange={e => {
                  try {
                    setFormData({ ...formData, interestedParties: JSON.parse(e.target.value) })
                  } catch {}
                }}
                className="w-full h-32 bg-muted/30 border border-border rounded-lg p-3 text-xs font-mono resize-none"
                placeholder='[{"name": "Clientes", "requirements": "Seguridad de datos"}]'
              />
            ) : (
              <div className="space-y-2">
                {(isms?.interestedParties || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No definidas. Haz clic en Editar para agregar partes interesadas.
                  </p>
                ) : (
                  (isms?.interestedParties || []).map((party: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-muted/20 rounded-lg">
                      <Users className="h-4 w-4 text-neon-blue" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{party.name}</p>
                        <p className="text-xs text-muted-foreground">{party.requirements}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Policy Information */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4 text-neon-green" />
            Política de Seguridad de la Información
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs text-muted-foreground">URL del Documento</label>
              {editing ? (
                <Input
                  value={formData.policyUrl || ''}
                  onChange={e => setFormData({ ...formData, policyUrl: e.target.value })}
                  placeholder="https://..."
                  className="mt-1"
                />
              ) : (
                <p className="text-sm mt-1">
                  {isms?.policyUrl ? (
                    <a href={isms.policyUrl} target="_blank" rel="noopener noreferrer" className="text-neon-cyan hover:underline">
                      {isms.policyUrl}
                    </a>
                  ) : 'No definida'}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Aprobada Por</label>
              {editing ? (
                <Input
                  value={formData.policyApprovedBy || ''}
                  onChange={e => setFormData({ ...formData, policyApprovedBy: e.target.value })}
                  placeholder="Nombre del aprobador"
                  className="mt-1"
                />
              ) : (
                <p className="text-sm mt-1">{isms?.policyApprovedBy || 'No definido'}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <Button variant="outline" className="h-auto py-4 flex flex-col items-start gap-2" onClick={() => window.location.href = '/risks'}>
              <AlertTriangle className="h-5 w-5 text-neon-yellow" />
              <div className="text-left">
                <p className="font-semibold">Gestión de Riesgos</p>
                <p className="text-xs text-muted-foreground">Evaluar y tratar riesgos</p>
              </div>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-start gap-2" onClick={() => window.location.href = '/soa'}>
              <CheckCircle2 className="h-5 w-5 text-neon-green" />
              <div className="text-left">
                <p className="font-semibold">Declaración de Aplicabilidad</p>
                <p className="text-xs text-muted-foreground">93 controles del Anexo A</p>
              </div>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-start gap-2" onClick={() => window.location.href = '/compliance'}>
              <Clock className="h-5 w-5 text-neon-cyan" />
              <div className="text-left">
                <p className="font-semibold">Compliance</p>
                <p className="text-xs text-muted-foreground">CIS, SOC2, PCI-DSS</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}