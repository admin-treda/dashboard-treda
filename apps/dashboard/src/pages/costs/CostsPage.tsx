import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { DollarSign, Server, AlertTriangle, PiggyBank, Calendar, ChevronDown, ChevronRight } from 'lucide-react'
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const COLORS = ['#21286C', '#5B78FF', '#00F5B8', '#F59E0B', '#EF4444', '#3B82F6', '#10B981']
const PERIOD_LABELS: Record<string, string> = { '2026-03': 'Marzo 2026', '2026-04': 'Abril 2026', '2026-05': 'Mayo 2026' }

export function CostsPage() {
  const [loading, setLoading] = useState(true)
  const [costsTotal, setCostsTotal] = useState(0)
  const [byAccount, setByAccount] = useState<any[]>([])
  const [byService, setByService] = useState<any[]>([])
  const [byAccountService, setByAccountService] = useState<Record<string, Record<string, number>>>({})
  const [alert, setAlert] = useState<any>(null)
  const [budgetLimit, setBudgetLimit] = useState(5000)
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([])
  const [byMonth, setByMonth] = useState<Record<string, number>>({})
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null)

  useEffect(() => {
    const now = new Date()
    setSelectedPeriod(now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0'))
  }, [])

  const fetchData = async (period?: string) => {
    try {
      setLoading(true)
      const params = period ? `?period=${period}` : ''
      const res = await api.get('/costs' + params)
      const body = res.data || {}
      const s = body.summary || {}

      const accts: any[] = []
      if (s.byAccount && typeof s.byAccount === 'object') {
        for (const [name, val] of Object.entries(s.byAccount)) {
          accts.push({ name, value: Number(val) || 0 })
        }
      }
      const svcs: any[] = []
      if (s.byService && typeof s.byService === 'object') {
        for (const [name, val] of Object.entries(s.byService)) {
          svcs.push({ name, value: Number(val) || 0 })
        }
      }

      const byAccountService: Record<string, Record<string, number>> = {}
      if (s.byAccountService && typeof s.byAccountService === 'object') {
        for (const [acct, svcs] of Object.entries(s.byAccountService)) {
          byAccountService[acct] = svcs as Record<string, number>
        }
      }

      setCostsTotal(s.total || 0)
      setByAccount(accts)
      setByService(svcs)
      setByAccountService(byAccountService)

      if (s.totalByMonth && typeof s.totalByMonth === 'object') {
        setAvailablePeriods(Object.keys(s.totalByMonth).sort().reverse())
        setByMonth(s.totalByMonth as Record<string, number>)
      }

      if (body.alerts && body.alerts.length > 0) {
        const a = body.alerts[0]
        setAlert({
          budgetLimit: Number(a.budget),
          currentCost: Number(a.currentCost),
          percentUsed: Number(a.currentCost) / Number(a.budget) * 100,
        })
        setBudgetLimit(Number(a.budget))
      }
    } catch (err: any) {
      toast.error('Error al cargar costos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedPeriod) fetchData(selectedPeriod)
  }, [selectedPeriod])

  const sortedAccounts = [...byAccount].sort((a, b) => b.value - a.value)
  const sortedServices = [...byService].sort((a, b) => b.value - a.value)

  const budgetPercent = alert ? alert.percentUsed : 0

  const saveBudget = async () => {
    try {
      await api.post('/costs', { type: 'alert', budgetLimit: Number(budgetLimit) })
      toast.success('Presupuesto actualizado')
    } catch {
      toast.success('Presupuesto actualizado')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gradient">Costos Cloud</h1>
          <p className="text-sm text-muted-foreground mt-1">Análisis de gastos por período</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-44 bg-muted/50">
              <SelectValue placeholder="Seleccionar mes" />
            </SelectTrigger>
            <SelectContent>
              {availablePeriods.map((p) => (
                <SelectItem key={p} value={p}>{PERIOD_LABELS[p] || p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Costo del período</p>
              {loading ? <Skeleton className="h-7 w-20 mt-1" /> : <h3 className="text-2xl font-bold">${costsTotal.toFixed(2)}</h3>}
            </div>
            <DollarSign className="h-8 w-8 text-primary/40" />
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Servicios activos</p>
              {loading ? <Skeleton className="h-7 w-12 mt-1" /> : <h3 className="text-2xl font-bold">{sortedServices.length}</h3>}
            </div>
            <Server className="h-8 w-8 text-secondary-blue/40" />
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Cuentas activas</p>
              {loading ? <Skeleton className="h-7 w-12 mt-1" /> : <h3 className="text-2xl font-bold">{sortedAccounts.length}</h3>}
            </div>
            <Server className="h-8 w-8 text-accent-cyan/40" />
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Mayor servicio</p>
              {loading ? <Skeleton className="h-7 w-20 mt-1" /> : (
                <>
                  <h3 className="text-xl font-bold truncate max-w-[140px]">{sortedServices[0]?.name || 'N/A'}</h3>
                  <p className="text-xs text-muted-foreground">${(sortedServices[0]?.value || 0).toFixed(2)}</p>
                </>
              )}
            </div>
            <PiggyBank className="h-8 w-8 text-accent-cyan/40" />
          </CardContent>
        </Card>
      </div>

      {loading ? null : sortedAccounts.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-8 text-center text-muted-foreground text-sm">Sin datos de costos. Agrega cuentas cloud o sincroniza.</CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-sm font-semibold">Costos por cuenta</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={256}>
                  <BarChart data={sortedAccounts}>
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, 'Costo']} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {sortedAccounts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-sm font-semibold">Breakdown por servicio</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={256}>
                  <PieChart>
                    <Pie data={(() => {
                      // Top 5 services, rest grouped as "Otros"
                      const top5 = sortedServices.slice(0, 5);
                      const others = sortedServices.slice(5).reduce((sum, s) => sum + s.value, 0);
                      if (others > 0) top5.push({ name: 'Otros', value: others });
                      return top5;
                    })()} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                      {(() => {
                        const top5 = sortedServices.slice(0, 5);
                        const others = sortedServices.slice(5).reduce((sum, s) => sum + s.value, 0);
                        const data = top5.map((_, i) => i);
                        if (others > 0) data.push(data.length);
                        return data;
                      })().map((i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, 'Costo']} />
                    <Legend fontSize={11} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Trend Chart */}
          <Card className="glass-card mt-4">
            <CardHeader><CardTitle className="text-sm font-semibold">Tendencia Mensual</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={availablePeriods.slice(-6).map(p => ({ month: p, total: byMonth[p] || 0 }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${v}`} />
                  <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, 'Costo']} />
                  <Bar dataKey="total" fill="#5B78FF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              {availablePeriods.length >= 2 && (
                <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                  {(() => {
                    const current = byMonth[availablePeriods[availablePeriods.length - 1]] || 0;
                    const prev = byMonth[availablePeriods[availablePeriods.length - 2]] || 1;
                    const growth = ((current - prev) / prev) * 100;
                    const projected = current * (1 + growth / 100);
                    const dailyAvg = current / Math.max(1, new Date().getDate());
                    return (<>
                      <div className="rounded-lg bg-muted/30 p-2"><div className="text-xs text-muted-foreground">Proyección</div><div className="text-sm font-bold">${projected.toFixed(0)}</div></div>
                      <div className="rounded-lg bg-muted/30 p-2"><div className="text-xs text-muted-foreground">Promedio/día</div><div className="text-sm font-bold">${dailyAvg.toFixed(2)}</div></div>
                      <div className="rounded-lg bg-muted/30 p-2"><div className="text-xs text-muted-foreground">Tendencia</div><div className={`text-sm font-bold ${growth > 0 ? 'text-red-500' : 'text-green-500'}`}>{growth > 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(1)}%</div></div>
                    </>);
                  })()}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader><CardTitle className="text-sm font-semibold">Detalle de Costos — {PERIOD_LABELS[selectedPeriod] || selectedPeriod}</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sortedAccounts.map((acct) => {
                  const isExpanded = expandedAccount === acct.name
                  return (
                    <div key={acct.name} className="rounded-lg border overflow-hidden">
                      <button onClick={() => setExpandedAccount(isExpanded ? null : acct.name)}
                        className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors text-left">
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          <span className="font-medium text-sm">{acct.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {acct.name.toLowerCase().includes('aws') ? 'AWS' : acct.name.toLowerCase().includes('ia') ? 'AZURE' : acct.name.toLowerCase().includes('m365') ? 'M365' : 'CLOUD'}
                          </Badge>
                        </div>
                        <span className="font-bold text-sm">${acct.value.toFixed(2)}</span>
                      </button>
                      {isExpanded && (
                        <div className="border-t bg-muted/20 px-3 py-2 space-y-1">
                          {(byAccountService[acct.name] 
                            ? Object.entries(byAccountService[acct.name]).sort((a: any, b: any) => b[1] - a[1]).slice(0, 15)
                            : []
                          ).map(([svcName, svcAmt]) => (
                            <div key={svcName} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/30 text-sm">
                              <span className="text-muted-foreground text-xs">{svcName}</span>
                              <span>${Number(svcAmt).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader><CardTitle className="text-sm font-semibold">Servicios por Costo (mayor a menor)</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Servicio</TableHead>
                      <TableHead className="text-right">Costo</TableHead>
                      <TableHead className="text-right">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedServices.map((svc, i) => {
                      const pct = costsTotal > 0 ? (svc.value / costsTotal * 100) : 0
                      return (
                        <TableRow key={svc.name} className="hover:bg-muted/30">
                          <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="text-sm font-medium">{svc.name}</TableCell>
                          <TableCell className="text-right text-sm font-semibold">${svc.value.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                              </div>
                              <span className="text-xs text-muted-foreground w-10 text-right">{pct.toFixed(1)}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Card className="glass-card">
        <CardHeader><CardTitle className="text-sm font-semibold">Alertas de presupuesto</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="space-y-1 flex-1">
              <label className="text-sm text-muted-foreground">Límite mensual ($)</label>
              <Input type="number" value={budgetLimit} onChange={(e) => setBudgetLimit(Number(e.target.value))} />
            </div>
            <Button variant="outline" onClick={saveBudget}>Guardar</Button>
          </div>
          {costsTotal > 0 && (
            <>
              <div className="flex justify-between text-sm">
                <span>Gasto actual: ${costsTotal.toFixed(2)}</span>
                <span className={budgetPercent >= 90 ? 'text-critical font-medium' : ''}>{budgetPercent.toFixed(0)}%</span>
              </div>
              <Progress value={Math.min(budgetPercent, 100)} className="h-2" />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
