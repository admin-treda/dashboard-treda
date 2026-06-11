import { useState, useEffect, useMemo } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  Server, Database, HardDrive, Wifi, Cloud, Plus,
  Search, Filter, Trash2,
} from 'lucide-react'

const typeConfig: Record<string, { icon: any; color: string; label: string }> = {
  server: { icon: Server, color: '#00E5FF', label: 'Servidor' },
  database: { icon: Database, color: '#3B82F6', label: 'Base de Datos' },
  storage: { icon: HardDrive, color: '#FFD700', label: 'Almacenamiento' },
  network: { icon: Wifi, color: '#8B5CF6', label: 'Red' },
  saas: { icon: Cloud, color: '#00FF88', label: 'SaaS' },
}

const providerBadge: Record<string, string> = {
  AWS: 'bg-[#FF9900]/10 text-[#FF9900] border-[#FF9900]/30',
  Azure: 'bg-[#0078D4]/10 text-[#0078D4] border-[#0078D4]/30',
  M365: 'bg-[#D83B01]/10 text-[#D83B01] border-[#D83B01]/30',
}

export function AssetsPage() {
  const [loading, setLoading] = useState(true)
  const [assets, setAssets] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [providerFilter, setProviderFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'server', provider: 'AWS', region: 'us-east-1', tags: '', costPerMonth: '' })
  const [saving, setSaving] = useState(false)
  const [stats, setStats] = useState({ total: 0, byType: {} as Record<string, number>, totalCost: 0 })

  const fetchAssets = async () => {
    try {
      setLoading(true)
      const res = await api.get('/assets').catch(() => ({ data: { assets: [], stats: {} } }))
      const data = res.data || {}
      setAssets(data.assets || data.data || [])
      setStats(data.stats || { total: 0, byType: {}, totalCost: 0 })
    } catch { toast.error('Error al cargar activos') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAssets() }, [])

  const filtered = useMemo(() => {
    return assets.filter(a => {
      const matchSearch = !search || (a.name || '').toLowerCase().includes(search.toLowerCase()) || (a.tags || '').toLowerCase().includes(search.toLowerCase())
      const matchType = typeFilter === 'all' || a.type === typeFilter
      const matchProvider = providerFilter === 'all' || a.provider === providerFilter
      return matchSearch && matchType && matchProvider
    })
  }, [assets, search, typeFilter, providerFilter])

  const createAsset = async () => {
    if (!form.name.trim()) { toast.error('Nombre requerido'); return }
    setSaving(true)
    try {
      await api.post('/assets', { ...form, costPerMonth: form.costPerMonth ? parseFloat(form.costPerMonth) : null })
      toast.success('Activo creado')
      setShowCreate(false)
      setForm({ name: '', type: 'server', provider: 'AWS', region: 'us-east-1', tags: '', costPerMonth: '' })
      fetchAssets()
    } catch (err: any) { toast.error(err.response?.data?.error || 'Error') }
    finally { setSaving(false) }
  }

  const deleteAsset = async (id: string) => {
    try { await api.delete(`/assets/${id}`); toast.success('Activo eliminado'); fetchAssets() }
    catch { toast.error('Error al eliminar') }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold gradient-animated font-display tracking-wider">// INVENTARIO</h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">CMDB — Gestión de activos e infraestructura</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 bg-[#00E5FF]/10 border border-[#00E5FF]/30 text-[#00E5FF] hover:bg-[#00E5FF]/20">
          <Plus className="h-4 w-4" /> Nuevo Activo
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="glass-card border-white/5"><CardContent className="p-4 text-center"><p className="text-[10px] text-muted-foreground font-display uppercase">Total</p><h3 className="text-2xl font-bold text-[#00E5FF] font-display mt-1">{stats.total}</h3></CardContent></Card>
        {Object.entries(typeConfig).map(([key, cfg]) => (
          <Card key={key} className="glass-card border-white/5"><CardContent className="p-4 text-center">
            <p className="text-[10px] text-muted-foreground font-display uppercase">{cfg.label}</p>
            <h3 className="text-2xl font-bold font-display mt-1" style={{ color: cfg.color }}>{stats.byType?.[key] || 0}</h3>
          </CardContent></Card>
        ))}
      </div>

      {/* Filters + Table */}
      <Card className="glass-card border-white/5">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar activos..." className="pl-8 bg-muted/50 text-xs" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-36 bg-muted/50"><Filter className="h-3.5 w-3.5 mr-1" /><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(typeConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="w-full sm:w-36 bg-muted/50"><SelectValue placeholder="Proveedor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="AWS">AWS</SelectItem>
                <SelectItem value="Azure">Azure</SelectItem>
                <SelectItem value="M365">M365</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">{Array.from({length: 5}).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Server className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm font-display">Sin activos registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5">
                    {['Nombre', 'Tipo', 'Proveedor', 'Región', 'Costo/Mes', 'Tags', ''].map(h => (
                      <TableHead key={h} className="font-display text-[10px] uppercase tracking-wider">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(asset => {
                    const tc = typeConfig[asset.type] || typeConfig.server
                    const AIcon = tc.icon
                    return (
                      <TableRow key={asset.id} className="border-white/5 hover:bg-white/[0.02]">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: tc.color + '15' }}>
                              <AIcon className="h-3.5 w-3.5" style={{ color: tc.color }} />
                            </div>
                            <span className="font-medium text-sm">{asset.name}</span>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-[9px] font-display" style={{ color: tc.color, borderColor: tc.color + '40' }}>{tc.label}</Badge></TableCell>
                        <TableCell><Badge variant="outline" className={`text-[9px] font-display ${providerBadge[asset.provider] || ''}`}>{asset.provider}</Badge></TableCell>
                        <TableCell className="text-xs font-mono">{asset.region || '—'}</TableCell>
                        <TableCell className="text-xs font-mono text-[#FFD700]">{asset.costPerMonth ? `$${Number(asset.costPerMonth).toFixed(2)}` : '—'}</TableCell>
                        <TableCell className="text-[10px] text-muted-foreground max-w-[150px] truncate">{asset.tags || '—'}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-[#FF4444]" onClick={() => deleteAsset(asset.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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
            <DialogTitle className="font-display flex items-center gap-2"><Server className="h-5 w-5 text-[#00E5FF]" /> Nuevo Activo</DialogTitle>
            <DialogDescription>Registrar un nuevo activo en el inventario</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label className="text-xs">Nombre</Label><Input placeholder="Mi servidor" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} className="h-8 text-xs" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Tipo</Label>
                <Select value={form.type} onValueChange={v => setForm(p => ({...p, type: v}))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Proveedor</Label>
                <Select value={form.provider} onValueChange={v => setForm(p => ({...p, provider: v}))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="AWS">AWS</SelectItem><SelectItem value="Azure">Azure</SelectItem><SelectItem value="M365">M365</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label className="text-xs">Región</Label><Input placeholder="us-east-1" value={form.region} onChange={e => setForm(p => ({...p, region: e.target.value}))} className="h-8 text-xs" /></div>
              <div className="space-y-1"><Label className="text-xs">Costo/Mes (USD)</Label><Input type="number" placeholder="0.00" value={form.costPerMonth} onChange={e => setForm(p => ({...p, costPerMonth: e.target.value}))} className="h-8 text-xs" /></div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Tags (separados por coma)</Label><Input placeholder="web, producción, backend" value={form.tags} onChange={e => setForm(p => ({...p, tags: e.target.value}))} className="h-8 text-xs" /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancelar</Button>
              <Button size="sm" onClick={createAsset} disabled={saving} className="gap-2">{saving ? 'Creando...' : 'Crear Activo'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
