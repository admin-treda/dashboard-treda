import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { FileText, Download, Trash2, Loader2, Eye, Calendar } from 'lucide-react'

export function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<any[]>([])
  const [generating, setGenerating] = useState<string | null>(null)
  const [periodStart, setPeriodStart] = useState(new Date().toISOString().slice(0, 10))
  const [periodEnd, setPeriodEnd] = useState(new Date().toISOString().slice(0, 10))
  const [viewReport, setViewReport] = useState<any>(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [viewContent, setViewContent] = useState<string>('')
  const [deleteReport, setDeleteReport] = useState<any>(null)

  const fetchReports = async () => {
    try {
      setLoading(true)
      const res = await api.get('/reports')
      setReports(res.data?.data || [])
    } catch {
      toast.error('Error al cargar informes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchReports() }, [])

  const statBox = (label: string, value: string | number, subtitle?: string) => {
    return `<div class="rounded-lg bg-muted/30 p-3"><div class="text-xs text-muted-foreground">${label}</div><div class="text-lg font-bold mt-0.5">${value}</div>${subtitle ? `<div class="text-xs text-muted-foreground mt-0.5">${subtitle}</div>` : ''}</div>`
  }

  const handleGenerate = async (type: string) => {
    setGenerating(type)
    try {
      const res = await api.post('/reports', {
        type: type.toUpperCase(),
        periodStart,
        periodEnd,
      })
      toast.success(`Informe ${type === 'DAILY' ? 'diario' : 'semanal'} generado`)
      await fetchReports()
    } catch (err: any) {
      console.error('Report generate error:', err.response?.data || err.message)
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Error al generar informe: ' + (err.message || 'desconocido'))
    } finally {
      setGenerating(null)
    }
  }

  const handleView = async (report: any) => {
    setViewReport(report)
    setViewLoading(true)
    try {
      const res = await api.get(`/reports/${report.id}`)
      const data = res.data?.report || res.data
      const parsed = typeof data.data === 'string' ? JSON.parse(data.data) : (data.data || {})
      const s = parsed.summary || {}
      
      let html = ''
      
      // Summary section
      html += '<div class="space-y-4">'
      html += '<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">'
      html += statBox('Cuentas', s.accounts || 0, `${s.accountsHealthy || 0} saludables`)
      html += statBox('Eventos', s.events || 0, `${s.critical || 0} críticos`)
      html += statBox('Costos', `$${(s.totalCost || 0).toFixed(2)}`, `${Object.keys(parsed.byAccount || {}).length} cuentas`)
      html += statBox('Alertas', s.alertsActive || 0, 'activas')
      html += '</div>'
      
      // Severity breakdown
      html += '<div class="mt-4"><h4 class="text-sm font-semibold mb-2">Eventos por severidad</h4>'
      html += '<div class="flex gap-2 flex-wrap">'
      const sevColors: Record<string, string> = { CRITICAL: '#EF4444', HIGH: '#F59E0B', MEDIUM: '#3B82F6', LOW: '#10B981' }
      for (const [sev, cnt] of Object.entries({ CRITICAL: s.critical, HIGH: s.high, MEDIUM: s.medium, LOW: s.low })) {
        if (Number(cnt) > 0) {
          html += `<span class="text-xs px-2 py-1 rounded-full border" style="border-color:${sevColors[sev]};color:${sevColors[sev]};background:${sevColors[sev]}15">${sev}: ${cnt}</span>`
        }
      }
      html += '</div></div>'
      
      // Costs by account
      if (parsed.byAccount && Object.keys(parsed.byAccount).length > 0) {
        html += '<div class="mt-4"><h4 class="text-sm font-semibold mb-2">Costos por cuenta</h4>'
        const sorted = Object.entries(parsed.byAccount).sort((a: any, b: any) => b[1] - a[1])
        for (const [acct, amt] of sorted) {
          html += `<div class="flex justify-between text-sm py-1 border-b border-muted/30 last:border-0"><span>${acct}</span><span class="font-semibold">$${Number(amt).toFixed(2)}</span></div>`
        }
        html += '</div>'
      }
      
      // Top services
      if (parsed.services && Object.keys(parsed.services).length > 0) {
        html += '<div class="mt-4"><h4 class="text-sm font-semibold mb-2">Top servicios</h4>'
        const sorted = Object.entries(parsed.services).sort((a: any, b: any) => b[1] - a[1]).slice(0, 8)
        for (const [svc, amt] of sorted) {
          const pct = s.totalCost > 0 ? (Number(amt) / s.totalCost * 100).toFixed(1) : '0'
          html += `<div class="flex justify-between text-xs py-1"><span class="truncate mr-2">${svc}</span><span>$${Number(amt).toFixed(2)} (${pct}%)</span></div>`
        }
        html += '</div>'
      }
      
      // Event timeline
      if (parsed.eventTimeline && Object.keys(parsed.eventTimeline).length > 0) {
        html += '<div class="mt-4"><h4 class="text-sm font-semibold mb-2">Eventos últimos 7 días</h4>'
        for (const [day, cnt] of Object.entries(parsed.eventTimeline)) {
          html += `<div class="flex items-center gap-2 text-xs py-0.5"><span class="w-24 text-right">${day}</span><div class="flex-1 h-3 rounded bg-muted overflow-hidden"><div class="h-full rounded" style="width:${Math.min(Number(cnt)/10*100, 100)}%;background:#5B78FF"></div></div><span class="w-8 text-right font-medium">${cnt}</span></div>`
        }
        html += '</div>'
      }
      
      // Top events
      if (parsed.topEvents && parsed.topEvents.length > 0) {
        html += '<div class="mt-4"><h4 class="text-sm font-semibold mb-2">Últimos eventos</h4>'
        for (const evt of parsed.topEvents.slice(0, 5)) {
          html += `<div class="text-xs py-1 border-b border-muted/20 last:border-0"><span class="font-medium">[${evt.severity}]</span> ${(evt.description || '').slice(0, 80)}</div>`
        }
        html += '</div>'
      }
      
      html += '</div>'
      setViewContent(html)
    } catch {
      setViewContent('<p class="text-center text-muted-foreground">Error al cargar el informe</p>')
    } finally {
      setViewLoading(false)
    }
  }

  const handleDownload = async (report: any) => {
    try {
      const res = await api.get(`/reports/${report.id}/download`, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `informe-${report.type}-${report.generatedAt?.slice(0, 10) || 'report'}.txt`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Informe descargado')
    } catch {
      toast.error('Error al descargar informe')
    }
  }

  const handleDelete = async () => {
    if (!deleteReport) return
    try {
      await api.delete(`/reports/${deleteReport.id}`)
      setReports(prev => prev.filter(r => r.id !== deleteReport.id))
      toast.success('Informe eliminado')
    } catch {
      toast.error('Error al eliminar informe')
    }
    setDeleteReport(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gradient">Informes</h1>
          <p className="text-sm text-muted-foreground mt-1">Genera y gestiona informes de seguridad y costos</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Informe Diario
            </CardTitle>
            <CardDescription className="text-xs">Resumen de eventos y costos del día</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="bg-muted/50 h-8 text-xs" />
            </div>
            <Button onClick={() => handleGenerate('DAILY')} disabled={generating === 'DAILY'} className="w-full gap-2" size="sm">
              {generating === 'DAILY' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {generating === 'DAILY' ? 'Generando...' : 'Generar informe diario'}
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Informe Semanal
            </CardTitle>
            <CardDescription className="text-xs">Resumen semanal de eventos y costos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="bg-muted/50 h-8 text-xs" />
            </div>
            <Button onClick={() => handleGenerate('WEEKLY')} disabled={generating === 'WEEKLY'} className="w-full gap-2" size="sm" variant="secondary">
              {generating === 'WEEKLY' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {generating === 'WEEKLY' ? 'Generando...' : 'Generar informe semanal'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Informes Generados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : reports.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">No hay informes generados</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Generado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report: any) => (
                    <TableRow key={report.id} className="hover:bg-muted/30">
                      <TableCell>
                        <Badge variant="outline" className={report.type === 'DAILY' ? 'bg-primary/10 text-primary border-primary/30' : 'bg-secondary/10 text-secondary border-secondary/30'}>
                          {report.type === 'DAILY' ? 'Diario' : 'Semanal'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={report.status === 'completed' ? 'bg-low/10 text-low border-low/30' : 'bg-muted text-muted-foreground border-border'}>
                          {report.status === 'completed' ? 'Completado' : report.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(report.generatedAt).toLocaleString('es-CO')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleView(report)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(report)}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-critical hover:text-critical hover:bg-critical/10" onClick={() => setDeleteReport(report)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={!!viewReport} onOpenChange={(open) => !open && setViewReport(null)}>
        <DialogContent className="glass-card max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Informe {viewReport?.type === 'DAILY' ? 'Diario' : 'Semanal'}
            </DialogTitle>
            <DialogDescription>
              Generado: {viewReport?.generatedAt ? new Date(viewReport.generatedAt).toLocaleString('es-CO') : 'N/A'}
            </DialogDescription>
          </DialogHeader>
          {viewLoading ? (
            <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-4 w-full" />)}</div>
          ) : (
            <div className="text-sm" dangerouslySetInnerHTML={{ __html: viewContent }} />
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setViewReport(null)}>Cerrar</Button>
            <Button variant="default" size="sm" className="gap-2" onClick={() => viewReport && handleDownload(viewReport)}>
              <Download className="h-4 w-4" /> Descargar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteReport} onOpenChange={(open) => !open && setDeleteReport(null)}>
        <DialogContent className="glass-card max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar informe</DialogTitle>
            <DialogDescription>¿Estás seguro de eliminar este informe?</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteReport(null)}>Cancelar</Button>
            <Button variant="destructive" size="sm" onClick={handleDelete}>Eliminar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
