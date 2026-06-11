import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import {
  ShieldAlert, DollarSign, RefreshCw,
  Shield, Server, Database, AlertTriangle,
  Zap, Globe, ArrowUpRight, ArrowDownRight,
  History, Loader2,
} from 'lucide-react'
import { api } from '@/lib/api'

/* ── Constants ─────────────────────────────────────────── */
const providerColors: Record<string, string> = { AWS: '#FF9900', AZURE: '#0078D4', M365: '#D83B01' }
const severityCfg: Record<string, { color: string; label: string }> = {
  CRITICAL: { color: '#EF4444', label: 'CRÍTICO' },
  HIGH: { color: '#F59E0B', label: 'ALTO' },
  MEDIUM: { color: '#3B82F6', label: 'MEDIO' },
  LOW: { color: '#10B981', label: 'BAJO' },
}
const scanColors: Record<string, string> = {
  completed: '#10B981', running: '#3B82F6', queued: '#EAB308',
  error: '#EF4444', pending: '#6B7280', cancelled: '#6B7280',
}
const auditColors: Record<string, string> = {
  LOGIN_SUCCESS: '#10B981', LOGIN_FAILED: '#EF4444', PENTEST_STARTED: '#F59E0B',
  REPORT_GENERATED: '#06B6D4', USER_CREATED: '#10B981', PASSWORD_CHANGED: '#3B82F6',
  MFA_ENABLED: '#06B6D4', USER_DELETED: '#EF4444', USER_UPDATED: '#3B82F6',
  MFA_DISABLED: '#EAB308', PASSWORD_CHANGE_FAILED: '#EF4444', LOGIN_BLOCKED: '#EF4444',
}

/* ── Sparkline ─────────────────────────────────────────── */
let _spId = 0
function Sparkline({ data, color = '#06B6D4', height = 32 }: { data: number[]; color?: string; height?: number }) {
  if (!data.length || data.every(v => v === 0)) return null
  const id = `sp${++_spId}`
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data.map((v, i) => ({ x: i, y: v }))} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="y" stroke={color} strokeWidth={1.5} fill={`url(#${id})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/* ── KPI Card v2 ──────────────────────────────────────────── */
function KpiCard({ title, value, subtitle, icon: Icon, color, spark, loading, trend }: {
  title: string; value: string | number; subtitle?: string; icon: any; color: string
  spark?: number[]; loading?: boolean; trend?: number
}) {
  return (
    <div 
      className="metric-card group" 
      style={{ '--metric-color': color } as React.CSSProperties}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="space-y-0.5 flex-1 min-w-0">
          <p className="text-[10px] text-text-muted tracking-wider font-medium uppercase">{title}</p>
          {loading ? <Skeleton className="h-7 w-20 rounded mt-1" /> : (
            <h3 className="text-2xl font-bold tracking-tight" style={{ color }}>{value}</h3>
          )}
        </div>
        <div 
          className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ml-2 border"
          style={{ 
            backgroundColor: `${color}10`,
            borderColor: `${color}20`,
            boxShadow: `0 0 12px ${color}15`
          }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
      </div>
      
      {spark && spark.length > 0 && !loading && (
        <div className="my-1 -mx-1">
          <Sparkline data={spark} color={color} />
        </div>
      )}
      
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/20">
        {!loading && subtitle && (
          <p className="text-[10px] text-text-dim font-mono truncate">{subtitle}</p>
        )}
        {trend !== undefined && trend !== 0 && (
          <span className={`text-[10px] font-mono flex items-center gap-0.5 flex-shrink-0 ${trend > 0 ? 'text-neon-red' : 'text-neon-green'}`}>
            {trend > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  )
}

/* ── Dashboard v4.0 ─────────────────────────────────────────── */
export function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [eventSummary, setEventSummary] = useState<any>({})
  const [costsSummary, setCostsSummary] = useState<any>({})
  const [scans, setScans] = useState<any[]>([])
  const [health, setHealth] = useState<any>(null)
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [spark7d, setSpark7d] = useState<number[]>([])
  const [costSpark, setCostSpark] = useState<number[]>([])
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [acctR, evtR, costR, scanR, healthR, pollR, auditR] = await Promise.all([
        api.get('/accounts').catch(() => ({ data: { accounts: [] } })),
        api.get('/events?limit=500').catch(() => ({ data: { data: [], summary: {} } })),
        api.get('/costs').catch(() => ({ data: { summary: {} } })),
        api.get('/pentest/scans').catch(() => ({ data: [] })),
        api.get('/../../health').catch(() => ({ data: { status: 'error' } })),
        api.get('/poll-status').catch(() => ({ data: {} })),
        api.get('/auth/audit-logs?limit=8').catch(() => ({ data: { logs: [] } })),
      ])

      setAccounts(acctR.data?.accounts || [])
      setEvents((evtR.data?.data || []).slice(0, 8))
      setEventSummary(evtR.data?.summary || {})
      setCostsSummary(costR.data?.summary || {})
      setScans((Array.isArray(scanR.data) ? scanR.data : []).slice(0, 5))
      setHealth({ api: healthR.data, polling: pollR.data })
      setAuditLogs(auditR.data?.logs || auditR.data?.data || [])

      // 7-day event sparkline
      const allEvts = evtR.data?.data || []
      const now = new Date()
      const d7: number[] = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0)
        const next = new Date(d); next.setDate(next.getDate() + 1)
        d7.push(allEvts.filter((e: any) => { const t = new Date(e.createdAt); return t >= d && t < next }).length)
      }
      setSpark7d(d7)

      // Cost sparkline
      const bm = costR.data?.summary?.totalByMonth || {}
      setCostSpark(Object.keys(bm).sort().slice(-7).map(m => Number(bm[m]) || 0))

      setLoading(false)
      setLastRefresh(new Date())
    } catch { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { const i = setInterval(fetchData, 30000); return () => clearInterval(i) }, [fetchData])

  const handleRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false) }

  const { total: costTotal = 0, byAccount = {} } = costsSummary
  const { total: eventTotal = 0, critical = 0, high = 0, medium = 0, low = 0 } = eventSummary

  const severityData = [
    { name: 'CRÍTICO', value: critical, color: '#EF4444' },
    { name: 'ALTO', value: high, color: '#F59E0B' },
    { name: 'MEDIO', value: medium, color: '#3B82F6' },
    { name: 'BAJO', value: low, color: '#10B981' },
  ].filter(s => s.value > 0)

  const bm = costsSummary.totalByMonth || {}
  const costTrend = Object.keys(bm).sort().slice(-6).map(m => ({
    month: m.split('-')[1] + '/' + m.split('-')[0].slice(2),
    total: Number(bm[m]) || 0,
  }))

  const activeScans = scans.filter(s => s.status === 'running' || s.status === 'queued')
  const doneScans = scans.filter(s => s.status === 'completed')
  const apiOk = health?.api?.status === 'ok'
  const pollOn = health?.polling?.status === 'running'
  const hAcc = accounts.filter((a: any) => a.health === 'healthy').length
  const wAcc = accounts.filter((a: any) => a.health === 'warning').length
  const cAcc = accounts.filter((a: any) => a.health === 'critical').length

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold gradient-animated tracking-tight">Dashboard</h1>
          <p className="text-xs text-text-muted font-mono mt-1">
            Última actualización: {lastRefresh.toLocaleTimeString('es-CO')} · Auto-refresh 30s
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh} 
          disabled={refreshing}
          className="gap-2 border-border/40 hover:border-neon-cyan/30 hover:bg-neon-cyan/5 text-text-secondary hover:text-neon-cyan"
        >
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {refreshing ? 'Actualizando...' : 'Actualizar'}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 animate-stagger">
        <KpiCard title="Eventos Totales" value={eventTotal}
          subtitle={`${accounts.length} cuentas · ${hAcc} saludables`}
          icon={ShieldAlert} color="#06B6D4" spark={spark7d} loading={loading} />
        <KpiCard title="Eventos Críticos" value={critical}
          subtitle={`${high} alto · ${medium} medio · ${low} bajo`}
          icon={AlertTriangle} color="#EF4444" spark={spark7d} loading={loading} />
        <KpiCard title="Costo Total" value={`$${costTotal.toFixed(2)}`}
          subtitle={`${Object.keys(byAccount).length} cuentas con costo`}
          icon={DollarSign} color="#EAB308" spark={costSpark} loading={loading} />
        <KpiCard title="Escaneos" value={scans.length}
          subtitle={`${activeScans.length} activos · ${doneScans.length} completados`}
          icon={Shield} color="#8B5CF6" loading={loading} />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Severity Donut */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-neon-blue tracking-wider uppercase flex items-center gap-2">
              <div className="h-1 w-4 bg-neon-blue rounded-full" />
              Distribución por Severidad
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-48 w-full" /> : severityData.length === 0 ? (
              <div className="empty-state py-10">
                <div className="empty-state-icon">
                  <ShieldAlert className="h-6 w-6 text-text-dim" />
                </div>
                <p className="text-sm text-text-muted">Sin eventos</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={severityData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={3} dataKey="value" stroke="none">
                      {severityData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        background: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))', 
                        borderRadius: 8, 
                        fontFamily: 'JetBrains Mono, monospace', 
                        fontSize: 11,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                      }}
                      formatter={(v: number) => [v, 'Eventos']} 
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-3 justify-center">
                  {severityData.map(s => (
                    <span key={s.name} className="flex items-center gap-1.5 text-xs font-mono">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color, boxShadow: `0 0 6px ${s.color}` }} />
                      {s.name}: {s.value}
                    </span>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Cost Trend */}
        <Card className="glass-card lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-neon-cyan tracking-wider uppercase flex items-center gap-2">
              <div className="h-1 w-4 bg-neon-cyan rounded-full" />
              Tendencia de Costos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-48 w-full" /> : costTrend.length === 0 ? (
              <div className="empty-state py-10">
                <div className="empty-state-icon">
                  <DollarSign className="h-6 w-6 text-text-dim" />
                </div>
                <p className="text-sm text-text-muted">Sin datos de costos</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={costTrend}>
                  <defs>
                    <linearGradient id="cgDash" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#06B6D4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="month" stroke="hsl(var(--text-dim))" fontSize={10} fontFamily="JetBrains Mono, monospace" />
                  <YAxis stroke="hsl(var(--text-dim))" fontSize={10} fontFamily="JetBrains Mono, monospace" tickFormatter={(v: number) => `$${v}`} />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))', 
                      borderRadius: 8, 
                      fontFamily: 'JetBrains Mono, monospace', 
                      fontSize: 11,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                    }}
                    formatter={(v: number) => [`$${v.toFixed(2)}`, 'Costo']} 
                  />
                  <Area type="monotone" dataKey="total" stroke="#06B6D4" strokeWidth={2} fill="url(#cgDash)"
                    dot={{ fill: '#06B6D4', r: 3, strokeWidth: 0 }}
                    activeDot={{ fill: '#06B6D4', r: 5, stroke: 'hsl(var(--card))', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pentest + Health */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pentest Widget */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-neon-purple tracking-wider uppercase flex items-center gap-2">
              <div className="h-1 w-4 bg-neon-purple rounded-full" />
              Últimos Escaneos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
              : scans.length === 0 ? (
                <div className="empty-state py-6">
                  <div className="empty-state-icon">
                    <Shield className="h-6 w-6 text-text-dim" />
                  </div>
                  <p className="text-sm text-text-muted">Sin escaneos aún</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {scans.map((s: any) => (
                    <div key={s.id} className="data-row">
                      <span className="status-dot" style={{ 
                        backgroundColor: scanColors[s.status] || '#6B7280',
                        boxShadow: `0 0 6px ${scanColors[s.status] || '#6B7280'}`
                      }} />
                      <span className="text-xs font-mono truncate flex-1 text-text-secondary">{s.url}</span>
                      <Badge variant="outline" className="text-[9px] font-medium" style={{ 
                        color: scanColors[s.status], 
                        borderColor: `${scanColors[s.status]}40`,
                        backgroundColor: `${scanColors[s.status]}10`
                      }}>
                        {s.status}
                      </Badge>
                      {s.summary && <span className="text-[10px] font-mono text-text-dim">{s.summary.total || 0} vulns</span>}
                    </div>
                  ))}
                </div>
              )}
          </CardContent>
        </Card>

        {/* Health Widget */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-neon-green tracking-wider uppercase flex items-center gap-2">
              <div className="h-1 w-4 bg-neon-green rounded-full" />
              Estado del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
              : (
                <div className="space-y-2">
                  {[
                    { label: 'API Server', icon: Server, color: '#06B6D4', ok: apiOk, text: apiOk ? 'ONLINE' : 'OFFLINE' },
                    { label: 'Collector', icon: Zap, color: '#EAB308', ok: pollOn, text: pollOn ? 'ACTIVO' : 'DETENIDO',
                      extra: health?.polling?.last_run ? new Date(health.polling.last_run).toLocaleTimeString('es-CO') : null },
                    { label: 'PostgreSQL', icon: Database, color: '#10B981', ok: true, text: 'CONNECTED' },
                  ].map(item => (
                    <div key={item.label} className="data-row">
                      <item.icon className="h-4 w-4" style={{ color: item.color }} />
                      <span className="text-xs font-medium flex-1">{item.label}</span>
                      <Badge variant="outline" className="text-[9px] font-medium"
                        style={{ color: item.ok ? '#10B981' : '#EF4444', borderColor: item.ok ? '#10B98140' : '#EF444440', backgroundColor: item.ok ? '#10B98110' : '#EF444410' }}>
                        {item.text}
                      </Badge>
                      {item.extra && <span className="text-[10px] text-text-dim font-mono">{item.extra}</span>}
                    </div>
                  ))}
                  <div className="data-row">
                    <Globe className="h-4 w-4 text-neon-yellow" />
                    <span className="text-xs font-medium flex-1">Cuentas</span>
                    <div className="flex gap-2 text-[10px] font-mono">
                      <span className="text-neon-green">{hAcc} OK</span>
                      <span className="text-neon-yellow">{wAcc} WARN</span>
                      <span className="text-neon-red">{cAcc} CRIT</span>
                    </div>
                  </div>
                </div>
              )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed + Recent Events */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Activity Feed */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-neon-yellow tracking-wider uppercase flex items-center gap-2">
              <div className="h-1 w-4 bg-neon-yellow rounded-full" />
              Actividad Reciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <div className="space-y-2">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
              : auditLogs.length === 0 ? (
                <div className="empty-state py-6">
                  <div className="empty-state-icon">
                    <History className="h-6 w-6 text-text-dim" />
                  </div>
                  <p className="text-sm text-text-muted">Sin actividad</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {auditLogs.map((log: any) => (
                    <div key={log.id} className="data-row py-2">
                      <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: auditColors[log.action] || '#6B7280' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-mono truncate text-text-secondary">
                          {log.username} · {log.action.replace(/_/g, ' ').toLowerCase()}
                        </p>
                      </div>
                      <span className="text-[9px] text-text-dim font-mono flex-shrink-0">
                        {new Date(log.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
          </CardContent>
        </Card>

        {/* Recent Events */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-neon-purple tracking-wider uppercase flex items-center gap-2">
              <div className="h-1 w-4 bg-neon-purple rounded-full" />
              Últimos Eventos de Seguridad
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <div className="space-y-2">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
              : events.length === 0 ? (
                <div className="empty-state py-8">
                  <div className="empty-state-icon">
                    <ShieldAlert className="h-6 w-6 text-text-dim" />
                  </div>
                  <p className="text-sm text-text-muted">No hay eventos</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 px-4">
                  <div className="min-w-[600px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border/30 hover:bg-transparent">
                          {['Fecha', 'Cuenta', 'Prov.', 'Tipo', 'Sev.', 'Descripción'].map(h => (
                            <TableHead key={h} className="text-[10px] text-neon-cyan/70 uppercase font-semibold tracking-wider">{h}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {events.map((evt: any) => {
                          const sev = severityCfg[evt.severity] || severityCfg.LOW
                          return (
                            <TableRow key={evt.id} className="border-border/20 hover:bg-neon-cyan/3">
                              <TableCell className="text-[10px] whitespace-nowrap font-mono text-text-dim">
                                {new Date(evt.createdAt).toLocaleString('es-CO')}
                              </TableCell>
                              <TableCell className="text-xs font-mono text-text-secondary">
                                {evt.account?.name || evt.accountId?.slice(0, 8)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[9px] font-medium" style={{ 
                                  backgroundColor: (providerColors[evt.provider] || '#666') + '10', 
                                  color: providerColors[evt.provider] || '#666', 
                                  borderColor: (providerColors[evt.provider] || '#666') + '25' 
                                }}>
                                  {evt.provider}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs font-mono text-text-secondary">{evt.type}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[9px] font-medium" style={{ 
                                  backgroundColor: sev.color + '10', 
                                  color: sev.color, 
                                  borderColor: sev.color + '25' 
                                }}>
                                  {sev.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-text-muted max-w-[200px] truncate font-mono">
                                {evt.description}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
