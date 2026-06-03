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
  Cell,
} from 'recharts'
import { Cloud, ShieldAlert, DollarSign, FileText } from 'lucide-react'
import { api } from '@/lib/api'

const providerColors: Record<string, string> = {
  AWS: '#FF9900',
  AZURE: '#0078D4',
  M365: '#D83B01',
}

const severities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
const severityColors = ['#FF0040', '#FF0080', '#BF00FF', '#00E5FF']
const chartColors = ['#00FFFF', '#FF0080', '#BF00FF', '#FFFF00', '#FF0040', '#39FF14']

function SummaryCard({ title, value, subtitle, icon: Icon, loading, index }: any) {
  const glowColors = [
    'shadow-[0_0_15px_rgba(0,255,255,0.15)]',
    'shadow-[0_0_15px_rgba(255,0,128,0.15)]',
    'shadow-[0_0_15px_rgba(191,0,255,0.15)]',
    'shadow-[0_0_15px_rgba(201,168,76,0.15)]',
  ]
  const borderColors = [
    'border-l-neon-cyan',
    'border-l-neon-pink',
    'border-l-neon-purple',
    'border-l-brass',
  ]
  const textColors = [
    'text-neon-cyan',
    'text-neon-pink',
    'text-neon-purple',
    'text-brass',
  ]

  return (
    <Card className={`glass-card card-hover group border-l-4 ${borderColors[index % 4]}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground tracking-wide font-display uppercase">{title}</p>
            {loading ? (
              <div className="h-7 w-20 rounded skeleton" />
            ) : (
              <h3 className={`text-xl font-bold tracking-tight font-display ${textColors[index % 4]}`}>
                {value}
              </h3>
            )}
            {!loading && subtitle && <p className="text-xs text-muted-foreground/80 font-mono">{subtitle}</p>}
          </div>
          <div className={`rounded-lg bg-muted/50 p-2.5 group-hover:scale-110 transition-all duration-300 ${glowColors[index % 4]}`}>
            <Icon className={`h-4 w-4 ${textColors[index % 4]}`} />
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
  const severityData = [
    { name: 'CRÍTICO', value: critical, color: '#FF0040' },
    { name: 'ALTO', value: high, color: '#FF0080' },
    { name: 'MEDIO', value: medium, color: '#BF00FF' },
    { name: 'BAJO', value: low, color: '#00E5FF' },
  ].filter(s => s.value > 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gradient font-display tracking-wider">// DASHBOARD</h1>
        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <span className="spinner" /> Cargando datos...
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="Cuentas Cloud" value={accounts.length} subtitle={`${accounts.filter((a: any) => a.health === 'healthy').length} saludables`} icon={Cloud} loading={loading} index={0} />
        <SummaryCard title="Eventos Críticos" value={critical} subtitle={`${eventTotal} eventos totales`} icon={ShieldAlert} loading={loading} index={1} />
        <SummaryCard title="Costo Total (Mayo)" value={`$${costTotal.toFixed(2)}`} subtitle={`${Object.keys(byAccount).length} cuentas con costo`} icon={DollarSign} loading={loading} index={2} />
        <SummaryCard title="Reportes" value={reportsCount} subtitle="generados" icon={FileText} loading={loading} index={3} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Costos por Cuenta */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold font-display text-neon-cyan tracking-wider uppercase">
              ⚙ Costos por Cuenta — Mayo 2026
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-48 w-full" /> : costByAccountData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10 font-mono">Sin datos de costos</p>
            ) : (
              <div className="space-y-3">
                {costByAccountData.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-neon-cyan/5 hover:border-neon-cyan/15 transition-all">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chartColors[i % chartColors.length], boxShadow: `0 0 8px ${chartColors[i % chartColors.length]}` }} />
                      <span className="text-sm font-medium font-mono">{item.name}</span>
                    </div>
                    <span className="text-sm font-bold font-display text-neon-cyan">${item.value.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between p-3 rounded-lg bg-neon-cyan/5 border border-neon-cyan/20">
                  <span className="text-sm font-semibold font-display text-neon-cyan">TOTAL</span>
                  <span className="text-sm font-bold font-display text-neon-cyan">${costTotal.toFixed(2)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Eventos por Severidad */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold font-display text-neon-pink tracking-wider uppercase">
              ◈ Eventos por Severidad
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-48 w-full" /> : severityData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10 font-mono">Sin eventos</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={severityData}>
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} fontFamily="Orbitron" />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} fontFamily="Share Tech Mono" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(240 20% 6%)', 
                      border: '1px solid hsl(180 100% 50% / 0.3)', 
                      borderRadius: '8px',
                      fontFamily: 'Share Tech Mono',
                      boxShadow: '0 0 15px rgba(0, 255, 255, 0.15)',
                    }} 
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {severityData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            <div className="flex flex-wrap gap-3 mt-3 text-xs font-mono">
              {severityData.map(s => (
                <span key={s.name} className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color, boxShadow: `0 0 6px ${s.color}` }} />
                  {s.name}: {s.value}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Últimos Eventos */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-sm font-semibold font-display text-neon-purple tracking-wider uppercase">
            ◉ Últimos Eventos de Seguridad
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8 font-mono">No hay eventos. Agrega cuentas cloud con credenciales válidas.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-neon-cyan/10">
                    <TableHead className="font-display text-neon-cyan">Fecha</TableHead>
                    <TableHead className="font-display text-neon-cyan">Cuenta</TableHead>
                    <TableHead className="font-display text-neon-cyan">Proveedor</TableHead>
                    <TableHead className="font-display text-neon-cyan">Tipo</TableHead>
                    <TableHead className="font-display text-neon-cyan">Severidad</TableHead>
                    <TableHead className="font-display text-neon-cyan">Descripción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((evt: any) => (
                    <TableRow key={evt.id} className="hover:bg-neon-cyan/3 border-neon-cyan/5">
                      <TableCell className="text-xs whitespace-nowrap font-mono">{new Date(evt.createdAt).toLocaleString('es-CO')}</TableCell>
                      <TableCell className="font-medium text-sm font-mono">{evt.account?.name || evt.accountId?.slice(0,8)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-display" style={{
                          backgroundColor: providerColors[evt.provider] + '15',
                          color: providerColors[evt.provider],
                          borderColor: providerColors[evt.provider] + '30',
                        }}>{evt.provider}</Badge>
                      </TableCell>
                      <TableCell className="text-sm font-mono">{evt.type}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-display" style={{
                          backgroundColor: severityColors[severities.indexOf(evt.severity)] + '15',
                          color: severityColors[severities.indexOf(evt.severity)],
                          borderColor: severityColors[severities.indexOf(evt.severity)] + '30',
                          boxShadow: `0 0 6px ${severityColors[severities.indexOf(evt.severity)]}20`,
                        }}>{evt.severity}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate font-mono">{evt.description}</TableCell>
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