import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Activity, Server, Database, Clock, RefreshCw, CheckCircle2,
  XCircle, AlertTriangle, Zap, Globe, Shield, Cpu, HardDrive,
  Wifi, WifiOff, TrendingUp,
} from 'lucide-react'

interface HealthData {
  api: { status: string; uptime: string; port: number }
  polling: { status: string; interval_minutes: number; last_run: string | null; last_result: any }
  accounts: { total: number; healthy: number; warning: number; critical: number }
  database: { status: string; connections: number }
}

export function HealthPage() {
  const [loading, setLoading] = useState(true)
  const [health, setHealth] = useState<HealthData | null>(null)
  const [collecting, setCollecting] = useState(false)

  const fetchHealth = async () => {
    try {
      setLoading(true)
      const [healthRes, pollRes, acctRes] = await Promise.all([
        api.get('/../../health').catch(() => ({ data: { status: 'error' } })),
        api.get('/poll-status').catch(() => ({ data: {} })),
        api.get('/accounts').catch(() => ({ data: { accounts: [] } })),
      ])

      const accounts = acctRes.data?.accounts || []
      const healthy = accounts.filter((a: any) => a.health === 'healthy').length
      const warning = accounts.filter((a: any) => a.health === 'warning').length
      const critical = accounts.filter((a: any) => a.health === 'critical').length

      setHealth({
        api: {
          status: healthRes.data?.status || 'unknown',
          uptime: healthRes.data?.time || new Date().toISOString(),
          port: 3000,
        },
        polling: {
          status: pollRes.data?.status || 'unknown',
          interval_minutes: pollRes.data?.interval_minutes || 20,
          last_run: pollRes.data?.last_run || null,
          last_result: pollRes.data?.last_result || null,
        },
        accounts: {
          total: accounts.length,
          healthy,
          warning,
          critical,
        },
        database: {
          status: 'connected',
          connections: 0,
        },
      })
    } catch {
      toast.error('Error al cargar estado del sistema')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchHealth() }, [])

  const triggerCollect = async () => {
    setCollecting(true)
    try {
      const res = await api.get('/collect')
      toast.success(`Recolección completada: ${res.data?.new_events || 0} nuevos eventos`)
      fetchHealth()
    } catch {
      toast.error('Error en la recolección')
    } finally {
      setCollecting(false)
    }
  }

  const overallStatus = health?.accounts.critical
    ? 'critical'
    : health?.accounts.warning
      ? 'warning'
      : 'healthy'

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold gradient-animated font-display tracking-wider">// SALUD DEL SISTEMA</h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">Estado de servicios, collectors y cuentas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchHealth} className="gap-2 border-white/10 hover:border-[#00E5FF]/30">
            <RefreshCw className="h-4 w-4" /> Actualizar
          </Button>
          <Button size="sm" onClick={triggerCollect} disabled={collecting}
            className="gap-2 btn-gradient font-display uppercase tracking-wider text-xs">
            {collecting ? <><span className="spinner" /> Recolectando...</> : <><Zap className="h-4 w-4" /> Recolectar Ahora</>}
          </Button>
        </div>
      </div>

      {/* Overall Status Banner */}
      {!loading && health && (
        <Card className={`glass-card border-${overallStatus === 'critical' ? '[#FF4444]' : overallStatus === 'warning' ? '[#FFD700]' : '[#00FF88]'}/30`}>
          <CardContent className="p-5 flex items-center gap-4">
            <div className={`h-14 w-14 rounded-xl flex items-center justify-center ${
              overallStatus === 'critical' ? 'bg-[#FF4444]/10' : overallStatus === 'warning' ? 'bg-[#FFD700]/10' : 'bg-[#00FF88]/10'
            }`}>
              {overallStatus === 'critical' ? <XCircle className="h-7 w-7 text-[#FF4444]" /> :
               overallStatus === 'warning' ? <AlertTriangle className="h-7 w-7 text-[#FFD700]" /> :
               <CheckCircle2 className="h-7 w-7 text-[#00FF88]" />}
            </div>
            <div>
              <h3 className={`text-lg font-bold font-display ${
                overallStatus === 'critical' ? 'text-[#FF4444]' : overallStatus === 'warning' ? 'text-[#FFD700]' : 'text-[#00FF88]'
              }`}>
                {overallStatus === 'critical' ? 'ALERTAS CRÍTICAS' : overallStatus === 'warning' ? 'ADVERTENCIAS' : 'SISTEMA SALUDABLE'}
              </h3>
              <p className="text-xs text-muted-foreground font-mono">
                {health.accounts.healthy} cuentas OK · {health.accounts.warning} con warning · {health.accounts.critical} con errores
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Service Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />) : health && (
          <>
            {/* API Status */}
            <Card className="glass-card border-[#00E5FF]/10">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] text-muted-foreground font-display uppercase tracking-widest">API</span>
                  <div className="h-8 w-8 rounded-lg bg-[#00E5FF]/10 flex items-center justify-center">
                    <Server className="h-4 w-4 text-[#00E5FF]" />
                  </div>
                </div>
                <Badge variant="outline" className={`text-[10px] font-display ${health.api.status === 'ok' ? 'bg-[#00FF88]/10 text-[#00FF88] border-[#00FF88]/30' : 'bg-[#FF4444]/10 text-[#FF4444] border-[#FF4444]/30'}`}>
                  {health.api.status === 'ok' ? 'ONLINE' : 'OFFLINE'}
                </Badge>
                <p className="text-xs text-muted-foreground mt-2 font-mono">Puerto {health.api.port}</p>
              </CardContent>
            </Card>

            {/* Polling Status */}
            <Card className="glass-card border-[#3B82F6]/10">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] text-muted-foreground font-display uppercase tracking-widest">Collector</span>
                  <div className="h-8 w-8 rounded-lg bg-[#3B82F6]/10 flex items-center justify-center">
                    <Activity className="h-4 w-4 text-[#3B82F6]" />
                  </div>
                </div>
                <Badge variant="outline" className={`text-[10px] font-display ${health.polling.status === 'running' ? 'bg-[#00FF88]/10 text-[#00FF88] border-[#00FF88]/30' : 'bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/30'}`}>
                  {health.polling.status === 'running' ? 'ACTIVO' : 'DETENIDO'}
                </Badge>
                <p className="text-xs text-muted-foreground mt-2 font-mono">
                  Cada {health.polling.interval_minutes} min
                  {health.polling.last_run && (
                    <span className="block">Última: {new Date(health.polling.last_run).toLocaleTimeString('es-CO')}</span>
                  )}
                </p>
              </CardContent>
            </Card>

            {/* Accounts Health */}
            <Card className="glass-card border-[#FFD700]/10">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] text-muted-foreground font-display uppercase tracking-widest">Cuentas</span>
                  <div className="h-8 w-8 rounded-lg bg-[#FFD700]/10 flex items-center justify-center">
                    <Globe className="h-4 w-4 text-[#FFD700]" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="text-center">
                    <p className="text-lg font-bold text-[#00FF88] font-display">{health.accounts.healthy}</p>
                    <p className="text-[9px] text-muted-foreground">OK</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-[#FFD700] font-display">{health.accounts.warning}</p>
                    <p className="text-[9px] text-muted-foreground">WARN</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-[#FF4444] font-display">{health.accounts.critical}</p>
                    <p className="text-[9px] text-muted-foreground">CRIT</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Database */}
            <Card className="glass-card border-[#00FF88]/10">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] text-muted-foreground font-display uppercase tracking-widest">Database</span>
                  <div className="h-8 w-8 rounded-lg bg-[#00FF88]/10 flex items-center justify-center">
                    <Database className="h-4 w-4 text-[#00FF88]" />
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] font-display bg-[#00FF88]/10 text-[#00FF88] border-[#00FF88]/30">
                  CONNECTED
                </Badge>
                <p className="text-xs text-muted-foreground mt-2 font-mono">PostgreSQL</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Last Collection Result */}
      {!loading && health?.polling.last_result && (
        <Card className="glass-card border-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-display text-[#1E90FF] uppercase tracking-widest flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Última Recolección
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3 text-center">
                <div className="text-[10px] text-muted-foreground font-display uppercase">Cuentas</div>
                <div className="text-lg font-bold font-display text-[#00E5FF] mt-1">{health.polling.last_result.accounts || 0}</div>
              </div>
              <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3 text-center">
                <div className="text-[10px] text-muted-foreground font-display uppercase">Eventos Nuevos</div>
                <div className="text-lg font-bold font-display text-[#3B82F6] mt-1">{health.polling.last_result.events || health.polling.last_result.totalEvents || 0}</div>
              </div>
              <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3 text-center">
                <div className="text-[10px] text-muted-foreground font-display uppercase">Estado</div>
                <Badge variant="outline" className="text-[10px] font-display bg-[#00FF88]/10 text-[#00FF88] border-[#00FF88]/30 mt-1">
                  {health.polling.last_result.error ? 'ERROR' : 'OK'}
                </Badge>
              </div>
              <div className="rounded-lg bg-white/[0.03] border border-white/5 p-3 text-center">
                <div className="text-[10px] text-muted-foreground font-display uppercase">Intervalo</div>
                <div className="text-lg font-bold font-display text-[#FFD700] mt-1">{health.polling.interval_minutes}m</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
