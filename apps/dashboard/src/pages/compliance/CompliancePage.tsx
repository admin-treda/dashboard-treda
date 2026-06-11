import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  CheckCircle2, XCircle, MinusCircle, Shield,
  ClipboardCheck, AlertTriangle,
} from 'lucide-react'
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, Tooltip,
} from 'recharts'

interface ComplianceCheck {
  id: string
  framework: string
  controlId: string
  title: string
  description: string
  status: 'pass' | 'fail' | 'not-applicable'
  lastChecked: string
}

const statusConfig: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  pass: { color: '#10B981', bg: 'bg-neon-green/10', icon: CheckCircle2, label: 'CUMPLE' },
  fail: { color: '#EF4444', bg: 'bg-neon-red/10', icon: XCircle, label: 'NO CUMPLE' },
  'not-applicable': { color: '#6B7280', bg: 'bg-muted/30', icon: MinusCircle, label: 'N/A' },
}

const frameworks = [
  { id: 'cis', name: 'CIS Benchmark', description: 'Center for Internet Security — 20 controles esenciales', color: '#06B6D4', icon: Shield },
  { id: 'soc2', name: 'SOC 2', description: 'Service Organization Control — 5 principios', color: '#3B82F6', icon: ClipboardCheck },
  { id: 'pci', name: 'PCI-DSS', description: 'Payment Card Industry — 12 requisitos', color: '#EAB308', icon: AlertTriangle },
]

export function CompliancePage() {
  const [loading, setLoading] = useState(true)
  const [activeFramework, setActiveFramework] = useState('cis')
  const [checks, setChecks] = useState<ComplianceCheck[]>([])
  const [allFrameworksData, setAllFrameworksData] = useState<any[]>([])

  const fetchChecks = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/compliance?framework=${activeFramework}`).catch(() => ({ data: { checks: [] } }))
      const serverChecks = res.data?.checks || []
      setChecks(serverChecks)
    } catch { setChecks([]) }
    finally { setLoading(false) }
  }

  const fetchAllFrameworks = async () => {
    try {
      const promises = frameworks.map(f => 
        api.get(`/compliance?framework=${f.id}`).catch(() => ({ data: { checks: [] } }))
      )
      const results = await Promise.all(promises)
      const data = results.map((res, i) => {
        const checks = res.data?.checks || []
        const pass = checks.filter((c: any) => c.status === 'pass').length
        const applicable = checks.filter((c: any) => c.status !== 'not-applicable').length
        const score = applicable > 0 ? Math.round((pass / applicable) * 100) : 0
        return {
          framework: frameworks[i].name,
          score,
          fullMark: 100,
        }
      })
      setAllFrameworksData(data)
    } catch {}
  }

  useEffect(() => { fetchChecks() }, [activeFramework])
  useEffect(() => { fetchAllFrameworks() }, [])

  const updateCheckStatus = async (checkId: string, status: string) => {
    try {
      await api.patch(`/compliance/${checkId}`, { status }).catch(() => {})
      setChecks(prev => prev.map(c => c.id === checkId ? { ...c, status: status as any, lastChecked: new Date().toISOString() } : c))
      toast.success('Estado actualizado')
      fetchAllFrameworks()
    } catch { toast.error('Error al actualizar') }
  }

  const passCount = checks.filter(c => c.status === 'pass').length
  const failCount = checks.filter(c => c.status === 'fail').length
  const naCount = checks.filter(c => c.status === 'not-applicable').length
  const applicable = checks.filter(c => c.status !== 'not-applicable').length
  const score = applicable > 0 ? Math.round((passCount / applicable) * 100) : 0

  const fw = frameworks.find(f => f.id === activeFramework)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold gradient-animated tracking-tight">Compliance</h1>
        <p className="text-xs text-text-muted font-mono mt-1">Cumplimiento de normativas y estándares de seguridad</p>
      </div>

      {/* Framework Selector */}
      <div className="grid gap-3 md:grid-cols-3">
        {frameworks.map(f => {
          const Icon = f.icon
          return (
            <Card 
              key={f.id} 
              className={`glass-card cursor-pointer transition-all ${activeFramework === f.id ? 'ring-1' : 'hover:border-border/60'}`}
              style={activeFramework === f.id ? { '--ring-color': f.color } as any : {}}
              onClick={() => setActiveFramework(f.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center border" style={{ backgroundColor: `${f.color}10`, borderColor: `${f.color}20` }}>
                    <Icon className="h-4 w-4" style={{ color: f.color }} />
                  </div>
                  {activeFramework === f.id && (
                    <Badge className="text-[9px] font-medium" style={{ backgroundColor: `${f.color}15`, color: f.color, borderColor: `${f.color}30` }}>
                      ACTIVO
                    </Badge>
                  )}
                </div>
                <h3 className="font-semibold text-sm">{f.name}</h3>
                <p className="text-[10px] text-text-muted mt-1">{f.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Radar Chart + Score */}
      {!loading && allFrameworksData.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="glass-card lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-neon-cyan tracking-wider uppercase flex items-center gap-2">
                <div className="h-1 w-4 bg-neon-cyan rounded-full" />
                Comparativa de Frameworks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={allFrameworksData}>
                  <PolarGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <PolarAngleAxis dataKey="framework" tick={{ fill: 'hsl(var(--text-secondary))', fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: 'hsl(var(--text-dim))', fontSize: 9 }} />
                  <Radar name="Score" dataKey="score" stroke="#06B6D4" fill="#06B6D4" fillOpacity={0.2} strokeWidth={2} />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))', 
                      borderRadius: 8, 
                      fontSize: 11 
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-5 flex flex-col items-center justify-center h-full">
              <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider">Score General</p>
              <div className="relative mt-3">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle cx="64" cy="64" r="56" stroke="hsl(var(--border))" strokeWidth="8" fill="none" />
                  <circle 
                    cx="64" cy="64" r="56" 
                    stroke={score >= 80 ? '#10B981' : score >= 50 ? '#EAB308' : '#EF4444'}
                    strokeWidth="8" 
                    fill="none"
                    strokeDasharray={`${(score / 100) * 352} 352`}
                    strokeLinecap="round"
                    style={{ filter: `drop-shadow(0 0 8px ${score >= 80 ? '#10B981' : score >= 50 ? '#EAB308' : '#EF4444'}40)` }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold" style={{ color: score >= 80 ? '#10B981' : score >= 50 ? '#EAB308' : '#EF4444' }}>
                    {score}%
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-text-dim mt-3 font-mono">{fw?.name}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stats */}
      {!loading && checks.length > 0 && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <div className="metric-card" style={{ '--metric-color': '#10B981' } as any}>
            <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider">Cumplen</p>
            <h3 className="text-2xl font-bold text-neon-green mt-1">{passCount}</h3>
          </div>
          <div className="metric-card" style={{ '--metric-color': '#EF4444' } as any}>
            <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider">No Cumplen</p>
            <h3 className="text-2xl font-bold text-neon-red mt-1">{failCount}</h3>
          </div>
          <div className="metric-card" style={{ '--metric-color': '#6B7280' } as any}>
            <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider">N/A</p>
            <h3 className="text-2xl font-bold text-text-muted mt-1">{naCount}</h3>
          </div>
          <div className="metric-card" style={{ '--metric-color': '#06B6D4' } as any}>
            <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider">Total</p>
            <h3 className="text-2xl font-bold text-neon-cyan mt-1">{checks.length}</h3>
          </div>
        </div>
      )}

      {/* Checks List */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold tracking-wider uppercase flex items-center gap-2" style={{ color: fw?.color }}>
            <div className="h-1 w-4 rounded-full" style={{ backgroundColor: fw?.color }} />
            Controles — {fw?.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : checks.length === 0 ? (
            <div className="empty-state py-8">
              <div className="empty-state-icon">
                <ClipboardCheck className="h-6 w-6 text-text-dim" />
              </div>
              <p className="text-sm text-text-muted">Sin controles definidos</p>
            </div>
          ) : (
            <div className="space-y-2">
              {checks.map(check => {
                const st = statusConfig[check.status] || statusConfig.fail
                const SIcon = st.icon
                return (
                  <div key={check.id} className="data-row p-3">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 border`} style={{ backgroundColor: `${st.color}10`, borderColor: `${st.color}20` }}>
                      <SIcon className="h-4 w-4" style={{ color: st.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-text-dim">{check.controlId}</span>
                        <span className="text-sm font-medium">{check.title}</span>
                      </div>
                      <p className="text-[10px] text-text-muted mt-0.5">{check.description}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {(['pass', 'fail', 'not-applicable'] as const).map(s => (
                        <button 
                          key={s} 
                          onClick={() => updateCheckStatus(check.id, s)}
                          className={`px-2 py-1 rounded text-[9px] font-medium border transition-all ${check.status === s ? 'border-current' : 'border-transparent opacity-40 hover:opacity-100'}`}
                          style={{ color: statusConfig[s].color, backgroundColor: check.status === s ? `${statusConfig[s].color}15` : 'transparent' }}
                        >
                          {statusConfig[s].label}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
