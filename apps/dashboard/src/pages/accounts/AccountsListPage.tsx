import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { toast } from 'sonner'
import { Plus, Search, RefreshCw, Trash2, Edit3, Filter } from 'lucide-react'

interface Account {
  id: string
  name: string
  provider: 'AWS' | 'Azure' | 'M365'
  status: 'connected' | 'disconnected' | 'error'
  region: string
  lastActivity: string
}

const providerBadge = {
  AWS: 'bg-[#FF9900]/10 text-[#FF9900] border-[#FF9900]/30',
  Azure: 'bg-[#0078D4]/10 text-[#0078D4] border-[#0078D4]/30',
  M365: 'bg-[#D83B01]/10 text-[#D83B01] border-[#D83B01]/30',
}

const statusBadge: Record<string, string> = {
  active: 'bg-low/15 text-low border-low/30',
  connected: 'bg-low/15 text-low border-low/30',
  inactive: 'bg-muted text-muted-foreground border-border',
  disconnected: 'bg-muted text-muted-foreground border-border',
  error: 'bg-critical/15 text-critical border-critical/30',
  critical: 'bg-critical/15 text-critical border-critical/30',
}

const statusLabel: Record<string, string> = {
  active: 'Activo',
  connected: 'Conectado',
  inactive: 'Inactivo',
  disconnected: 'Desconectado',
  error: 'Error',
  critical: 'Crítico',
}

export function AccountsListPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [search, setSearch] = useState('')
  const [providerFilter, setProviderFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deleteAccount, setDeleteAccount] = useState<Account | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)

  const fetchAccounts = async () => {
    try {
      setLoading(true)
      const res = await api.get('/accounts')
      const data = Array.isArray(res.data) ? res.data : res.data.accounts || []
      setAccounts(data)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al cargar cuentas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  const filtered = accounts.filter((a) => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) || a.region.toLowerCase().includes(search.toLowerCase())
    const matchProvider = providerFilter === 'all' || a.provider === providerFilter
    const matchStatus = statusFilter === 'all' || a.status === statusFilter
    return matchSearch && matchProvider && matchStatus
  })

  const handleDelete = async () => {
    if (!deleteAccount) return
    try {
      await api.delete(`/accounts/${deleteAccount.id}`)
      setAccounts((prev) => prev.filter((a) => a.id !== deleteAccount.id))
      toast.success(`Cuenta "${deleteAccount.name}" eliminada`)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al eliminar cuenta')
    } finally {
      setDeleteAccount(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gradient">Cuentas Cloud</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestiona tus cuentas de AWS, Azure y Microsoft 365</p>
        </div>
          <div className="flex items-center gap-2">
            {lastSync && (
              <span className="text-xs text-muted-foreground">Última sincronización: {new Date(lastSync).toLocaleString('es-CO')}</span>
            )}
            <Button variant="outline" size="sm" className="gap-2" onClick={async () => {
              setSyncing(true)
              try {
                const res = await api.get('/collect')
                toast.success(`Sincronizado: ${res.data?.new_events || 0} nuevos eventos`)
                setLastSync(new Date().toISOString())
                fetchAccounts()
              } catch { toast.error('Error al sincronizar') }
              finally { setSyncing(false) }
            }} disabled={syncing}>
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
            </Button>
            <Button onClick={() => navigate('/accounts/new')} className="gap-2 gradient-brand hover:opacity-90 transition-opacity">
              <Plus className="h-4 w-4" />
              Agregar cuenta
            </Button>
          </div>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <CardTitle className="text-base font-semibold">Listado de cuentas</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cuenta..."
                  className="pl-8 w-full sm:w-64 bg-muted/50"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={providerFilter} onValueChange={setProviderFilter}>
                <SelectTrigger className="w-full sm:w-40 bg-muted/50">
                  <Filter className="h-3.5 w-3.5 mr-1" />
                  <SelectValue placeholder="Proveedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="AWS">AWS</SelectItem>
                  <SelectItem value="Azure">Azure</SelectItem>
                  <SelectItem value="M365">M365</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40 bg-muted/50">
                  <Filter className="h-3.5 w-3.5 mr-1" />
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="connected">Conectado</SelectItem>
                  <SelectItem value="disconnected">Desconectado</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Región</TableHead>
                    <TableHead>Última actividad</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No se encontraron cuentas
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((account) => (
                      <TableRow key={account.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <Badge variant="outline" className={providerBadge[account.provider]}>
                            {account.provider}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-sm">{account.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusBadge[account.status]}>
                            {statusLabel[account.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{account.region}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{account.lastActivity}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={async () => {
  try {
    await api.get('/collect');
    toast.success('Sincronizado');
    fetchAccounts();
  } catch { toast.error('Error al sincronizar'); }
}}>
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/accounts/${account.id}`)}>
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-critical hover:text-critical hover:bg-critical/10" onClick={() => setDeleteAccount(account)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!deleteAccount} onOpenChange={(open) => !open && setDeleteAccount(null)}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>¿Eliminar cuenta?</DialogTitle>
            <DialogDescription>
              Esto eliminará la cuenta <strong>{deleteAccount?.name}</strong> y todos sus datos asociados. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteAccount(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Eliminar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
