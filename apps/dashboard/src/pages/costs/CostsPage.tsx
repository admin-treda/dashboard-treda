import { useState, useEffect, useRef } from 'react'
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
import {
  DollarSign, RefreshCw, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownRight, ChevronDown, ChevronRight,
  Wallet, Target, Crown, Zap, Globe, CreditCard,
  Coins, Landmark, Scale, Lightbulb, Calendar,
  Activity, BarChart3, PieChart as PieIcon, Sparkles,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'

const COLORS = ['#00E5FF', '#3B82F6', '#1E90FF', '#FFD700', '#FF4444', '#C9A84C', '#00FF88', '#FF6B35', '#7B68EE', '#3B82F6']
const PERIOD_LABELS: Record<string, string> = { '2026-03': 'Marzo 2026', '2026-04': 'Abril 2026', '2026-05': 'Mayo 2026', '2026-06': 'Junio 2026' }

// Animated counter component
function AnimatedValue({ value, prefix = '$', decimals = 2 }: { value: number, prefix?: string, decimals?: number }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef(0)
  useEffect(() => {
    const start = ref.current
    const diff = value - start
    const duration = 800
    const startTime = performance.now()
    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(start + diff * eased)
      if (progress < 1) requestAnimationFrame(animate)
      else ref.current = value
    }
    requestAnimationFrame(animate)
  }, [value])
  return <>{prefix}{display.toFixed(decimals)}</>
}

// Glow ring component
function GlowRing({ percent, color, size = 120, stroke = 8 }: { percent: number, color: string, size?: number, stroke?: number }) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(percent, 100) / 100) * circumference
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 6px ${color}50)`, transition: 'stroke-dashoffset 1s ease' }} />
    </svg>
  )
}

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
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const res = await api.post('/costs/refresh')
      const data = res.data || {}
      if (data.success) { toast.success(data.message || 'Costos actualizados'); if (selectedPeriod) loadPeriod(selectedPeriod) }
      else toast.error(data.error || 'Error al actualizar costos')
    } catch { toast.error('Error al conectar con el servidor') }
    finally { setRefreshing(false) }
  }

  useEffect(() => {
    const now = new Date()
    const currentPeriod = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
    setSelectedPeriod(currentPeriod)
    loadPeriod(currentPeriod)
  }, [])

  const loadPeriod = async (period: string) => {
    try {
      setLoading(true)
      const res = await api.get('/costs' + `?period=${period}`)
      const body = res.data || {}
      const s = body.summary || {}

      const accts: any[] = []
      if (s.byAccount && typeof s.byAccount === 'object')
        for (const [name, val] of Object.entries(s.byAccount)) accts.push({ name, value: Number(val) || 0 })

      const svcs: any[] = []
      if (s.byService && typeof s.byService === 'object')
        for (const [name, val] of Object.entries(s.byService)) svcs.push({ name, value: Number(val) || 0 })

      const byAccountService: Record<string, Record<string, number>> = {}
      if (s.byAccountService && typeof s.byAccountService === 'object')
        for (const [acct, svcs] of Object.entries(s.byAccountService)) byAccountService[acct] = svcs as Record<string, number>

      setCostsTotal(s.total || 0)
      setByAccount(accts)
      setByService(svcs)
      setByAccountService(byAccountService)

      if (s.totalByMonth && typeof s.totalByMonth === 'object') {
        const periods = Object.keys(s.totalByMonth).sort()
        const now = new Date()
        const currentPeriod = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
        if (!periods.includes(currentPeriod)) { periods.push(currentPeriod); periods.sort() }
        setAvailablePeriods([...periods].reverse())
        setByMonth(s.totalByMonth as Record<string, number>)
      }
      setSelectedPeriod(period)
      if (body.alerts && body.alerts.length > 0) {
        const a = body.alerts[0]
        setAlert({ budgetLimit: Number(a.budget), currentCost: Number(a.currentCost), percentUsed: Number(a.currentCost) / Number(a.budget) * 100 })
        setBudgetLimit(Number(a.budget))
      }
      setLoading(false)
      return period
    } catch { toast.error('Error al cargar costos'); setLoading(false); return period }
  }

  useEffect(() => { if (selectedPeriod) loadPeriod(selectedPeriod) }, [selectedPeriod])

  const sortedAccounts = [...byAccount].sort((a, b) => b.value - a.value)
  const sortedServices = [...byService].sort((a, b) => b.value - a.value)
  const budgetPercent = alert ? alert.percentUsed : 0

  const saveBudget = async () => {
    try { await api.post('/costs', { type: 'alert', budgetLimit: Number(budgetLimit) }); toast.success('Presupuesto actualizado') }
    catch { toast.success('Presupuesto actualizado') }
  }

  // Computed metrics
  const topService = sortedServices[0]
  const topAccount = sortedAccounts[0]
  const monthHistory = availablePeriods.slice(-6).map(p => ({ month: PERIOD_LABELS[p]?.split(' ')[0] || p, total: byMonth[p] || 0, fullMonth: p }))
  const currentMonthTotal = byMonth[availablePeriods[availablePeriods.length - 1]] || 0
  const prevMonthTotal = availablePeriods.length >= 2 ? (byMonth[availablePeriods[availablePeriods.length - 2]] || 0) : 0
  const growth = prevMonthTotal > 0 ? ((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100 : 0
  const dailyAvg = currentMonthTotal / Math.max(1, new Date().getDate())
  const projected = currentMonthTotal * (30 / Math.max(1, new Date().getDate()))

  // Pie data for services
  const pieData = (() => {
    const top5 = sortedServices.slice(0, 5)
    const others = sortedServices.slice(5).reduce((sum, s) => sum + s.value, 0)
    if (others > 0) top5.push({ name: 'Otros', value: others })
    return top5
  })()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold gradient-animated font-display tracking-wider">// COSTOS CLOUD</h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">Análisis de gastos por período y servicio</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}
            className="gap-2 border-neon-cyan/20 hover:border-neon-cyan/50">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Actualizando...' : 'Actualizar'}
          </Button>
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-44 bg-muted/50 border-neon-cyan/10">
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

      {/* KPI Cards with gradient borders */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Cost */}
        <Card className="glass-card relative overflow-hidden border-0 group">
          <div className="absolute inset-0 bg-gradient-to-br from-[#00E5FF]/10 via-transparent to-[#1E90FF]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-5 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground font-display uppercase tracking-widest">Costo Total</p>
                {loading ? <Skeleton className="h-8 w-24 mt-2" /> : (
                  <h3 className="text-3xl font-bold font-display text-[#00E5FF] mt-1">
                    <AnimatedValue value={costsTotal} />
                  </h3>
                )}
              </div>
              <div className="h-12 w-12 rounded-xl bg-[#00E5FF]/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-[#00E5FF]" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1">
              <div className="w-20 h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-[#00E5FF] to-[#1E90FF]" style={{ width: `${Math.min(budgetPercent, 100)}%` }} />
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">{budgetPercent.toFixed(0)}% del presupuesto</span>
            </div>
          </CardContent>
        </Card>

        {/* Growth Trend */}
        <Card className="glass-card relative overflow-hidden border-0 group">
          <div className="absolute inset-0 bg-gradient-to-br from-[#3B82F6]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-5 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground font-display uppercase tracking-widest">Tendencia</p>
                {loading ? <Skeleton className="h-8 w-20 mt-2" /> : (
                  <div className="flex items-center gap-2 mt-1">
                    <h3 className="text-3xl font-bold font-display" style={{ color: growth > 0 ? '#FF4444' : '#00FF88' }}>
                      {growth > 0 ? <ArrowUpRight className="inline h-6 w-6" /> : <ArrowDownRight className="inline h-6 w-6" />}
                      {Math.abs(growth).toFixed(1)}%
                    </h3>
                  </div>
                )}
              </div>
              <div className="h-12 w-12 rounded-xl bg-[#3B82F6]/10 flex items-center justify-center">
                {growth > 0 ? <TrendingUp className="h-6 w-6 text-[#FF4444]" /> : <TrendingDown className="h-6 w-6 text-[#00FF88]" />}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-3 font-mono">
              vs mes anterior: ${prevMonthTotal.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        {/* Daily Average */}
        <Card className="glass-card relative overflow-hidden border-0 group">
          <div className="absolute inset-0 bg-gradient-to-br from-[#FFD700]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-5 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground font-display uppercase tracking-widest">Promedio/Día</p>
                {loading ? <Skeleton className="h-8 w-20 mt-2" /> : (
                  <h3 className="text-3xl font-bold font-display text-[#FFD700] mt-1">
                    <AnimatedValue value={dailyAvg} />
                  </h3>
                )}
              </div>
              <div className="h-12 w-12 rounded-xl bg-[#FFD700]/10 flex items-center justify-center">
                <Zap className="h-6 w-6 text-[#FFD700]" />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-3 font-mono">
              Proyección mes: ${projected.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        {/* Top Service */}
        <Card className="glass-card relative overflow-hidden border-0 group">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1E90FF]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-5 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground font-display uppercase tracking-widest">Mayor Gasto</p>
                {loading ? <Skeleton className="h-6 w-20 mt-2" /> : (
                  <>
                    <h3 className="text-lg font-bold font-display text-[#1E90FF] mt-1 truncate max-w-[140px]">{topService?.name || 'N/A'}</h3>
                    <p className="text-xs text-muted-foreground font-mono">${(topService?.value || 0).toFixed(2)}</p>
                  </>
                )}
              </div>
              <div className="h-12 w-12 rounded-xl bg-[#1E90FF]/10 flex items-center justify-center">
                <Crown className="h-6 w-6 text-[#1E90FF]" />
              </div>
            </div>
            {costsTotal > 0 && topService && (
              <p className="text-[10px] text-muted-foreground mt-3 font-mono">
                {((topService.value / costsTotal) * 100).toFixed(1)}% del total
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {loading ? null : sortedAccounts.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <Coins className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm font-display">Sin datos de costos</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Agrega cuentas cloud o sincroniza datos</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Charts Row */}
          <div className="grid gap-4 lg:grid-cols-5">
            {/* Area Chart — Monthly Trend */}
            <Card className="glass-card lg:col-span-3 border-neon-cyan/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-display text-neon-cyan uppercase tracking-widest flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" /> Tendencia Mensual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={monthHistory}>
                    <defs>
                      <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00E5FF" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#00E5FF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={11} fontFamily="monospace" />
                    <YAxis stroke="#64748b" fontSize={11} fontFamily="monospace" tickFormatter={(v: number) => `$${v}`} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontFamily: 'monospace', fontSize: 12 }}
                      formatter={(v: number) => [`$${v.toFixed(2)}`, 'Costo']} />
                    <Area type="monotone" dataKey="total" stroke="#00E5FF" strokeWidth={2} fill="url(#costGradient)"
                      dot={{ fill: '#00E5FF', r: 4, strokeWidth: 0 }}
                      activeDot={{ fill: '#00E5FF', r: 6, stroke: '#0f172a', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
                {/* Quick stats below chart */}
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3 text-center">
                    <div className="text-[10px] text-muted-foreground font-display uppercase tracking-wider">Proyección</div>
                    <div className="text-sm font-bold font-display text-[#FFD700] mt-0.5">${projected.toFixed(0)}</div>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3 text-center">
                    <div className="text-[10px] text-muted-foreground font-display uppercase tracking-wider">Acumulado</div>
                    <div className="text-sm font-bold font-display text-[#00E5FF] mt-0.5">${currentMonthTotal.toFixed(2)}</div>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3 text-center">
                    <div className="text-[10px] text-muted-foreground font-display uppercase tracking-wider">Restante</div>
                    <div className="text-sm font-bold font-display mt-0.5" style={{ color: budgetLimit - costsTotal > 0 ? '#00FF88' : '#FF4444' }}>
                      ${(budgetLimit - costsTotal).toFixed(0)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Donut — Service Breakdown */}
            <Card className="glass-card lg:col-span-2 border-[#1E90FF]/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-display text-[#1E90FF] uppercase tracking-widest flex items-center gap-2">
                  <PieIcon className="h-4 w-4" /> Por Servicio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value"
                        stroke="none">
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontFamily: 'monospace', fontSize: 12 }}
                        formatter={(v: number) => [`$${v.toFixed(2)}`, 'Costo']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Legend with color dots */}
                <div className="space-y-1.5 mt-2">
                  {pieData.map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length], boxShadow: `0 0 6px ${COLORS[i % COLORS.length]}50` }} />
                        <span className="text-muted-foreground truncate max-w-[120px]">{item.name}</span>
                      </div>
                      <span className="font-mono font-semibold">${item.value.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bar Chart — Accounts */}
          <Card className="glass-card border-[#3B82F6]/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-display text-[#3B82F6] uppercase tracking-widest flex items-center gap-2">
                <Globe className="h-4 w-4" /> Costos por Cuenta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={sortedAccounts} layout="vertical" barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={11} fontFamily="monospace" tickFormatter={(v: number) => `$${v}`} />
                  <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} fontFamily="monospace" width={140} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontFamily: 'monospace', fontSize: 12 }}
                    formatter={(v: number) => [`$${v.toFixed(2)}`, 'Costo']} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {sortedAccounts.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} style={{ filter: `drop-shadow(0 0 4px ${COLORS[i % COLORS.length]}40)` }} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Account Detail — Expandable */}
          <Card className="glass-card border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-display text-[#FFD700] uppercase tracking-widest flex items-center gap-2">
                <Landmark className="h-4 w-4" /> Detalle por Cuenta — {PERIOD_LABELS[selectedPeriod] || selectedPeriod}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sortedAccounts.map((acct) => {
                  const isExpanded = expandedAccount === acct.name
                  const pct = costsTotal > 0 ? (acct.value / costsTotal * 100) : 0
                  const acctColor = COLORS[sortedAccounts.indexOf(acct) % COLORS.length]
                  return (
                    <div key={acct.name} className="rounded-xl border border-white/5 overflow-hidden transition-all hover:border-white/10">
                      <button onClick={() => setExpandedAccount(isExpanded ? null : acct.name)}
                        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors text-left">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-1 rounded-full" style={{ backgroundColor: acctColor, boxShadow: `0 0 8px ${acctColor}50` }} />
                          {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          <span className="font-medium text-sm">{acct.name}</span>
                          <Badge variant="outline" className="text-[10px] font-display" style={{ borderColor: `${acctColor}40`, color: acctColor }}>
                            {acct.name.toLowerCase().includes('aws') ? 'AWS' : acct.name.toLowerCase().includes('azure') ? 'AZURE' : acct.name.toLowerCase().includes('m365') ? 'M365' : 'CLOUD'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: acctColor, boxShadow: `0 0 6px ${acctColor}50` }} />
                          </div>
                          <span className="font-bold text-sm font-mono" style={{ color: acctColor }}>${acct.value.toFixed(2)}</span>
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="border-t border-white/5 bg-white/[0.01] px-4 py-3 space-y-1">
                          {(byAccountService[acct.name]
                            ? Object.entries(byAccountService[acct.name]).sort((a: any, b: any) => b[1] - a[1]).slice(0, 15)
                            : []
                          ).map(([svcName, svcAmt], i) => {
                            const maxVal = Math.max(...Object.values(byAccountService[acct.name] || {}).map(Number))
                            const barPct = maxVal > 0 ? (Number(svcAmt) / maxVal * 100) : 0
                            return (
                              <div key={svcName} className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-white/[0.02] text-sm group">
                                <span className="text-muted-foreground text-xs w-4 text-right font-mono">{i + 1}</span>
                                <span className="text-xs flex-1 truncate">{svcName}</span>
                                <div className="w-32 h-1 rounded-full bg-white/5 overflow-hidden hidden sm:block">
                                  <div className="h-full rounded-full bg-[#00E5FF]/60" style={{ width: `${barPct}%` }} />
                                </div>
                                <span className="font-mono text-xs font-semibold">${Number(svcAmt).toFixed(2)}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Services Table with bars */}
          <Card className="glass-card border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-display text-[#00FF88] uppercase tracking-widest flex items-center gap-2">
                <Activity className="h-4 w-4" /> Servicios por Costo (mayor a menor)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5">
                      <TableHead className="w-8 font-display text-[10px] uppercase tracking-wider">#</TableHead>
                      <TableHead className="font-display text-[10px] uppercase tracking-wider">Servicio</TableHead>
                      <TableHead className="text-right font-display text-[10px] uppercase tracking-wider">Costo</TableHead>
                      <TableHead className="text-right font-display text-[10px] uppercase tracking-wider">%</TableHead>
                      <TableHead className="w-32"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedServices.map((svc, i) => {
                      const pct = costsTotal > 0 ? (svc.value / costsTotal * 100) : 0
                      const color = COLORS[i % COLORS.length]
                      return (
                        <TableRow key={svc.name} className="hover:bg-white/[0.02] border-white/5 group">
                          <TableCell className="text-xs text-muted-foreground font-mono">{i + 1}</TableCell>
                          <TableCell className="text-sm font-medium">{svc.name}</TableCell>
                          <TableCell className="text-right text-sm font-bold font-mono" style={{ color }}>${svc.value.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <span className="text-xs text-muted-foreground font-mono">{pct.toFixed(1)}%</span>
                          </TableCell>
                          <TableCell>
                            <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}40` }} />
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

      {/* Budget Alert */}
      <Card className="glass-card border-[#FF4444]/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-display text-[#FF4444] uppercase tracking-widest flex items-center gap-2">
            <Target className="h-4 w-4" /> Alertas de Presupuesto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="space-y-1 flex-1">
              <label className="text-[10px] text-muted-foreground font-display uppercase tracking-wider">Límite mensual ($)</label>
              <Input type="number" value={budgetLimit} onChange={(e) => setBudgetLimit(Number(e.target.value))}
                className="bg-white/[0.03] border-white/10 font-mono" />
            </div>
            <Button variant="outline" onClick={saveBudget} className="border-[#FF4444]/20 hover:border-[#FF4444]/50 hover:bg-[#FF4444]/5">
              <Sparkles className="h-4 w-4 mr-1" /> Guardar
            </Button>
          </div>
          {costsTotal > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <div>
                  <span className="text-xs text-muted-foreground font-display uppercase tracking-wider">Gasto actual</span>
                  <p className="text-2xl font-bold font-display" style={{ color: budgetPercent >= 90 ? '#FF4444' : budgetPercent >= 70 ? '#FFD700' : '#00E5FF' }}>
                    ${costsTotal.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground font-display uppercase tracking-wider">Límite</span>
                  <p className="text-lg font-mono text-muted-foreground">${budgetLimit.toFixed(2)}</p>
                </div>
              </div>
              <div className="relative">
                <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${Math.min(budgetPercent, 100)}%`,
                      background: budgetPercent >= 90 ? 'linear-gradient(90deg, #FF4444, #3B82F6)' :
                                  budgetPercent >= 70 ? 'linear-gradient(90deg, #FFD700, #FF6B35)' :
                                  'linear-gradient(90deg, #00E5FF, #1E90FF)',
                      boxShadow: `0 0 12px ${budgetPercent >= 90 ? '#FF444450' : budgetPercent >= 70 ? '#FFD70050' : '#00E5FF50'}`,
                    }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground font-mono">0%</span>
                  <span className="text-[10px] font-mono font-bold" style={{ color: budgetPercent >= 90 ? '#FF4444' : '#00E5FF' }}>
                    {budgetPercent.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">100%</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
