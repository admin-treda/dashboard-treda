import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, Check, Cloud, CloudRain, Mail } from 'lucide-react'

const providers = [
  { id: 'AWS', name: 'Amazon Web Services', icon: Cloud, color: '#FF9900', desc: 'Conecta tus cuentas AWS para monitoreo de seguridad y costos' },
  { id: 'AZURE', name: 'Microsoft Azure', icon: CloudRain, color: '#0078D4', desc: 'Integra suscripciones Azure para visibilidad unificada' },
  { id: 'M365', name: 'Microsoft 365', icon: Mail, color: '#D83B01', desc: 'Conecta tenant M365 para auditoría de seguridad' },
]

export function AccountCreatePage() {
  const { id } = useParams()
  const isEditing = !!id
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [validating, setValidating] = useState(false)
  useEffect(() => {
    if (id) {
      api.get('/accounts/' + id).then(res => {
        const acct = res.data?.account || res.data
        if (acct) {
          setSelectedProvider(acct.provider)
          const creds = typeof acct.credentials === 'string' ? JSON.parse(acct.credentials) : acct.credentials
          setFormData({ ...creds, accountName: acct.name })
          setStep(2) // Auto-advance to credential step
        }
      }).catch(() => toast.error('Error al cargar cuenta'))
    }
  }, [id])

  const provider = providers.find((p) => p.id === selectedProvider)

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleNext = () => {
    if (step === 1 && !selectedProvider) {
      toast.error('Selecciona un proveedor')
      return
    }
    if (step === 2) {
      const required = getRequiredFields(selectedProvider!)
      for (const f of required) {
        if (!formData[f.name]?.trim()) {
          toast.error(`El campo ${f.label} es obligatorio`)
          return
        }
      }
    }
    setStep((s) => s + 1)
  }

  const handleBack = () => setStep((s) => s - 1)

  const handleSubmit = async () => {
    if (!selectedProvider) return
    setValidating(true)
    try {
      const accName = formData['accountName'] || formData['accessKeyId'] || formData['tenantId'] || selectedProvider + ' Account';
      const region = formData['region'] || '';
      const creds = { ...formData };
      delete creds.accountName;
      delete creds.region;
      const endpoint = isEditing ? '/accounts/' + id : '/accounts'
      const method = isEditing ? api.patch : api.post
      await method(endpoint, {
        name: accName,
        provider: selectedProvider,
        credentials: creds,
        region,
      })
      toast.success('Cuenta agregada exitosamente')
      navigate('/accounts')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al agregar cuenta')
    } finally {
      setValidating(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/accounts')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold gradient-animated">Nueva Cuenta Cloud</h1>
          <p className="text-sm text-muted-foreground">Configura una nueva cuenta en 3 pasos</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={
              `h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step === s ? 'gradient-brand text-white shadow-lg' :
                step > s ? 'bg-low text-white' : 'bg-muted text-muted-foreground'
              }`
            }>
              {step > s ? <Check className="h-4 w-4" /> : s}
            </div>
            <span className={`text-xs font-medium ${step === s ? 'text-foreground' : 'text-muted-foreground'}`}>
              {s === 1 ? 'Proveedor' : s === 2 ? 'Credenciales' : 'Resumen'}
            </span>
            {s < 3 && <Separator className="w-8 hidden sm:block" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="grid gap-4">
          {providers.map((p) => {
            const Icon = p.icon
            const isSelected = selectedProvider === p.id
            return (
              <Card
                key={p.id}
                onClick={() => setSelectedProvider(p.id)}
                className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                  isSelected ? 'ring-2 ring-primary glass-card' : 'glass-card opacity-90 hover:opacity-100'
                }`}
              >
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${p.color}15` }}>
                    <Icon className="h-6 w-6" style={{ color: p.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{p.name}</h3>
                      {isSelected && <Badge className="gradient-brand text-white">Seleccionado</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{p.desc}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {step === 2 && provider && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Credenciales {provider.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {getRequiredFields(provider.id).map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>{field.label}</Label>
                <Input
                  id={field.name}
                  type={field.type}
                  placeholder={field.placeholder}
                  value={formData[field.name] || ''}
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {step === 3 && provider && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Proveedor</span>
                <span className="font-medium">{provider.name}</span>
              </div>
              {getRequiredFields(provider.id).map((field) => (
                <div key={field.name} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{field.label}</span>
                  <span className="font-medium">{field.type === 'password' ? '••••••••' : formData[field.name]}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Check className="h-3 w-3 text-low" />
              <span>Validaremos la conexión antes de guardar</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack} disabled={step === 1}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Atrás
        </Button>
        {step < 3 ? (
          <Button onClick={handleNext} className="gradient-brand hover:opacity-90 transition-opacity">
            Siguiente <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={validating} className="gradient-brand hover:opacity-90 transition-opacity">
            {validating ? 'Validando...' : 'Guardar cuenta'} <Check className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  )
}

function getRequiredFields(provider: string) {
  if (provider === 'AWS') {
    return [
      { name: 'accountName', label: 'Nombre de la cuenta', type: 'text', placeholder: 'Producción AWS' },
      { name: 'accessKeyId', label: 'AWS Access Key ID', type: 'text', placeholder: 'AKIA...' },
      { name: 'secretAccessKey', label: 'AWS Secret Access Key', type: 'password', placeholder: '••••••••' },
      { name: 'region', label: 'Región por defecto', type: 'text', placeholder: 'us-east-1' },
    ]
  }
  if (provider === 'AZURE') {
    return [
      { name: 'accountName', label: 'Nombre de la cuenta', type: 'text', placeholder: 'Suscripción Azure' },
      { name: 'tenantId', label: 'Tenant ID', type: 'text', placeholder: '00000000-0000-0000-0000-000000000000' },
      { name: 'clientId', label: 'Client ID (Application)', type: 'text', placeholder: '00000000-0000-0000-0000-000000000000' },
      { name: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: '••••••••' },
      { name: 'subscriptionId', label: 'Subscription ID', type: 'text', placeholder: '00000000-0000-0000-0000-000000000000' },
    ]
  }
  return [
    { name: 'accountName', label: 'Nombre de la cuenta', type: 'text', placeholder: 'Tenant M365' },
    { name: 'tenantId', label: 'Tenant ID', type: 'text', placeholder: 'treda.onmicrosoft.com' },
    { name: 'clientId', label: 'Client ID', type: 'text', placeholder: '00000000-0000-0000-0000-000000000000' },
    { name: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: '••••••••' },
  ]
}
