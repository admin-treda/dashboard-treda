import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Cloud, ShieldAlert, DollarSign, FileText, TrendingUp } from 'lucide-react'
import { api } from '@/lib/api'

const providerColors: Record<string, string> = {
  AWS: '#FF9900',
  AZURE: '#0078D4',
  M365: '#D83B01',
}

const severities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
const severityColors = ['#EF4444', '#F59E0B', '#3B82F6', '#10B981']
const chartColors = ['#21286C', '#5B78FF', '#00F5B8', '#F59E0B', '#EF4444', '#3B82F6']

function SummaryCard({ title, value, subtitle, icon: Icon, loading }: any) {
  return (
    <Card className="glass-card hover:shadow-xl transition-all duration-300 group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{title}</p>
            {loading ? <Skeleton className="h-7 w-20" /> : <h3 className="text-xl font-bold">{value}</h3>}
            {!loading && subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="rounded-xl bg-primary/10 p-2.5 group-hover:bg-primary/20 transition-colors">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [eventSummary, setEventSummary] = useState<any>({})
  const [costsSummary, setCostsSummary] = useState<any>({})
  const [reportsCount, setReportsCount] = useState(0)

  useEffect(() => {
    Promise.all([
      api.get('/accounts').catch(() => ({ data: { accounts: [] } })),
      api.get('/events?limit=5').catch(() => ({ data: { data: [], summary: {} } })),
      api.get('/costs').catch(() => ({ data: { summary: {} } })),
      api.get('/reports?limit=1').catch(() => ({ data: { data: [] } })),
    ]).then(([acctR, evtR, costR, rptR]) => {
      setAccounts(acctR.data?.accounts || [])
      setEvents(evtR.data?.data || [])
      setEventSummary(evtR.data?.summary || {})
      setCostsSummary(costR.data?.summary || {})
      setReportsCount(rptR.data?.data?.length || 0)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const { total: costTotal = 0, byAccount = {}, byService = {} } = costsSummary
  const { total: eventTotal = 0, critical = 0, high = 0, medium = 0, low = 0 } = eventSummary
  const costByAccountData = Object.entries(byAccount).map(([n, v]) => ({ name: n, value: v as number }))
  const costByServiceData = Object.entries(byService).map(([n, v]) => ({ name: n, value: v as number })).sort((a, b) => b.value - a.value)
  const severityData = [
    { name: 'CRÍTICO', value: critical, color: '#EF4444' },
    { name: 'ALTO', value: high, color: '#F59E0B' },
    { name: 'MEDIO', value: medium, color: '#3B82F6' },
    { name: 'BAJO', value: low, color: '#10B981' },
  ].filter(s => s.value > 0)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gradient">Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="Cuentas Cloud" value={accounts.length} subtitle={`${accounts.filter((a: any) => a.health === 'healthy').length} saludables`} icon={Cloud} loading={loading} />
        <SummaryCard title="Eventos Críticos" value={critical} subtitle={`${eventTotal} eventos totales`} icon={ShieldAlert} loading={loading} />
        <SummaryCard title="Costo Total (Mayo)" value={`$${costTotal.toFixed(2)}`} subtitle={`${Object.keys(byAccount).length} cuentas con costo`} icon={DollarSign} loading={loading} />
        <SummaryCard title="Reportes" value={reportsCount} subtitle="generados" icon={FileText} loading={loading} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Costos por Cuenta */}
        <Card className="glass-card">
          <CardHeader><CardTitle className="text-sm font-semibold">Costos por Cuenta — Mayo 2026</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-48 w-full" /> : costByAccountData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">Sin datos de costos</p>
            ) : (
              <div className="space-y-3">
                {costByAccountData.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chartColors[i % chartColors.length] }} />
                      <span className="text-sm font-medium">{item.name}</span>
                    </div>
                    <span className="text-sm font-bold">${item.value.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <span className="text-sm font-semibold">Total</span>
                  <span className="text-sm font-bold">${costTotal.toFixed(2)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Eventos por Severidad */}
        <Card className="glass-card">
          <CardHeader><CardTitle className="text-sm font-semibold">Eventos por Severidad</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-48 w-full" /> : severityData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">Sin eventos</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={severityData}>
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {severityData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            <div className="flex flex-wrap gap-3 mt-3 text-xs">
              {severityData.map(s => (
                <span key={s.name} className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.name}: {s.value}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Últimos Eventos */}
      <Card className="glass-card">
        <CardHeader><CardTitle className="text-sm font-semibold">Últimos Eventos de Seguridad</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No hay eventos. Agrega cuentas cloud con credenciales válidas.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cuenta</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Severidad</TableHead>
                    <TableHead>Descripción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((evt: any) => (
                    <TableRow key={evt.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs whitespace-nowrap">{new Date(evt.createdAt).toLocaleString('es-CO')}</TableCell>
                      <TableCell className="font-medium text-sm">{evt.account?.name || evt.accountId?.slice(0,8)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs" style={{
                          backgroundColor: providerColors[evt.provider] + '15',
                          color: providerColors[evt.provider],
                          borderColor: providerColors[evt.provider] + '30',
                        }}>{evt.provider}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{evt.type}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs" style={{
                          backgroundColor: severityColors[severities.indexOf(evt.severity)] + '15',
                          color: severityColors[severities.indexOf(evt.severity)],
                          borderColor: severityColors[severities.indexOf(evt.severity)] + '30',
                        }}>{evt.severity}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{evt.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
