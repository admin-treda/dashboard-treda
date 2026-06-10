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
import { FileText, Download, Trash2, Loader2, Eye, Calendar, CheckSquare, Square, Trash, ExternalLink, Filter } from 'lucide-react'

export function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<any[]>([])
  const [generating, setGenerating] = useState<string | null>(null)
  const [periodStart, setPeriodStart] = useState(new Date().toISOString().slice(0, 10))
  const [periodEnd, setPeriodEnd] = useState(new Date().toISOString().slice(0, 10))
  const [viewReport, setViewReport] = useState<any>(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [viewHtml, setViewHtml] = useState<string>('')
  const [deleteReport, setDeleteReport] = useState<any>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [showBulkDelete, setShowBulkDelete] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [downloading, setDownloading] = useState<string | null>(null)

  const fetchReports = async () => {
    try {
      setLoading(true)
      const params: any = { limit: '50' }
      if (typeFilter !== 'ALL') params.type = typeFilter
      const res = await api.get('/reports', { params })
      setReports(res.data?.data || [])
    } catch {
      toast.error('Error al cargar informes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchReports() }, [typeFilter])

  const handleGenerate = async (type: string) => {
    setGenerating(type)
    try {
      const res = await api.post('/reports', {
        type: type.toUpperCase(),
        periodStart,
        periodEnd,
      })
      toast.success(`Informe ${type === 'DAILY' ? 'diario' : 'semanal'} generado correctamente`)
      await fetchReports()
    } catch (err: any) {
      console.error('Report generate error:', err.response?.data || err.message)
      toast.error(err.response?.data?.error || 'Error al generar informe')
    } finally {
      setGenerating(null)
    }
  }

  const handleView = async (report: any) => {
    setViewReport(report)
    setViewLoading(true)
    setViewHtml('')
    try {
      // Use preview endpoint to get rendered HTML
      const res = await api.get(`/reports/${report.id}/preview`, {
        responseType: 'text',
        headers: { 'Accept': 'text/html' },
      })
      setViewHtml(typeof res.data === 'string' ? res.data : '')
    } catch {
      // Fallback: render from report data
      try {
        const res2 = await api.get(`/reports/${report.id}`)
        const data = res2.data?.report || res2.data
        const parsed = typeof data.data === 'string' ? JSON.parse(data.data) : (data.data || {})
        setViewHtml(buildFallbackHtml(parsed, report))
      } catch {
        setViewHtml('<div style="text-align:center;padding:40px;color:#666;">Error al cargar la vista previa del informe</div>')
      }
    } finally {
      setViewLoading(false)
    }
  }

  const buildFallbackHtml = (data: any, report: any) => {
    const s = data.summary || {}
    return `
      <div style="padding:20px;font-family:Inter,sans-serif;color:#e0e6ed;background:#0a0e17;min-height:100vh;">
        <h1 style="color:#00e5ff;font-size:24px;margin-bottom:8px;">Informe ${report.type === 'DAILY' ? 'Diario' : 'Semanal'}</h1>
        <p style="color:#556677;font-size:12px;margin-bottom:24px;">Generado: ${new Date(report.generatedAt).toLocaleString('es-CO')}</p>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px;">
          <div style="background:#0d1117;border:1px solid #21262d;border-radius:8px;padding:16px;text-align:center;">
            <div style="font-size:11px;color:#8899aa;">CUENTAS</div>
            <div style="font-size:28px;font-weight:800;color:#00e5ff;">${s.accounts || 0}</div>
          </div>
          <div style="background:#0d1117;border:1px solid #21262d;border-radius:8px;padding:16px;text-align:center;">
            <div style="font-size:11px;color:#8899aa;">EVENTOS</div>
            <div style="font-size:28px;font-weight:800;color:#5b78ff;">${s.events || 0}</div>
          </div>
          <div style="background:#0d1117;border:1px solid #21262d;border-radius:8px;padding:16px;text-align:center;">
            <div style="font-size:11px;color:#8899aa;">COSTOS</div>
            <div style="font-size:28px;font-weight:800;color:#ffd700;">$${(s.totalCost || 0).toFixed(2)}</div>
          </div>
          <div style="background:#0d1117;border:1px solid #21262d;border-radius:8px;padding:16px;text-align:center;">
            <div style="font-size:11px;color:#8899aa;">ALERTAS</div>
            <div style="font-size:28px;font-weight:800;color:#ff6b6b;">${s.alertsActive || 0}</div>
          </div>
        </div>
        <p style="color:#556677;font-size:12px;text-align:center;">Vista previa básica — descargue el PDF para el informe completo</p>
      </div>
    `
  }

  const handleDownload = async (report: any) => {
    setDownloading(report.id)
    try {
      const res = await api.get(`/reports/${report.id}/download`, {
        responseType: 'blob',
      })
      // Check if it's actually a PDF or fallback HTML
      const contentType = res.headers?.['content-type'] || ''
      const isPdf = contentType.includes('application/pdf') || res.data?.type === 'application/pdf'
      
      const blob = isPdf
        ? new Blob([res.data], { type: 'application/pdf' })
        : new Blob([res.data], { type: 'text/html' })
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const ext = isPdf ? 'pdf' : 'html'
      a.download = `treda-informe-${report.type.toLowerCase()}-${report.generatedAt?.slice(0, 10) || 'report'}.${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`Informe descargado como ${ext.toUpperCase()}`)
    } catch {
      toast.error('Error al descargar informe')
    } finally {
      setDownloading(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteReport) return
    try {
      await api.delete(`/reports/${deleteReport.id}`)
      setReports(prev => prev.filter(r => r.id !== deleteReport.id))
      setSelectedIds(prev => { const n = new Set(prev); n.delete(deleteReport.id); return n })
      toast.success('Informe eliminado')
    } catch {
      toast.error('Error al eliminar informe')
    }
    setDeleteReport(null)
  }

  // Selection handlers
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === reports.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(reports.map(r => r.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    setBulkDeleting(true)
    try {
      await api.post('/reports/bulk-delete', { ids: [...selectedIds] })
      setReports(prev => prev.filter(r => !selectedIds.has(r.id)))
      toast.success(`${selectedIds.size} informe(s) eliminado(s)`)
      setSelectedIds(new Set())
      setShowBulkDelete(false)
    } catch {
      toast.error('Error al eliminar informes')
    } finally {
      setBulkDeleting(false)
    }
  }

  const allSelected = reports.length > 0 && selectedIds.size === reports.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < reports.length

  // Get report summary for display
  const getReportSummary = (report: any) => {
    try {
      const data = typeof report.data === 'string' ? JSON.parse(report.data) : (report.data || {})
      const s = data.summary || {}
      return {
        events: s.events || 0,
        critical: s.critical || 0,
        cost: s.totalCost || 0,
      }
    } catch {
      return { events: 0, critical: 0, cost: 0 }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold gradient-animated font-display tracking-wider">// INFORMES</h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">Genera informes PDF profesionales de seguridad y costos</p>
        </div>
      </div>

      {/* Generate Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="glass-card border-[#00E5FF]/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-display text-[#00E5FF] uppercase tracking-widest flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Informe Diario
            </CardTitle>
            <CardDescription className="text-xs">Resumen consolidado de eventos, costos y seguridad del día</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="bg-muted/50 h-8 text-xs" />
            </div>
            <Button onClick={() => handleGenerate('DAILY')} disabled={generating === 'DAILY'} className="w-full gap-2 border-[#00E5FF]/20 hover:border-[#00E5FF]/50" size="sm">
              {generating === 'DAILY' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {generating === 'DAILY' ? 'Generando PDF...' : 'Generar informe diario'}
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-card border-[#1E90FF]/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-display text-[#1E90FF] uppercase tracking-widest flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Informe Semanal
            </CardTitle>
            <CardDescription className="text-xs">Consolidado semanal con análisis de tendencias y recomendaciones</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="bg-muted/50 h-8 text-xs" />
            </div>
            <Button onClick={() => handleGenerate('WEEKLY')} disabled={generating === 'WEEKLY'} className="w-full gap-2 border-[#1E90FF]/20 hover:border-[#1E90FF]/50" size="sm" variant="secondary">
              {generating === 'WEEKLY' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {generating === 'WEEKLY' ? 'Generando PDF...' : 'Generar informe semanal'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Reports Table */}
      <Card className="glass-card border-white/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-display text-[#FFD700] uppercase tracking-widest flex items-center gap-2">
              <FileText className="h-4 w-4" /> Informes Generados
              {selectedIds.size > 0 && (
                <Badge className="ml-2 bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/30 text-[10px]">
                  {selectedIds.size} seleccionado(s)
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Type Filter */}
              <div className="flex items-center gap-1 mr-2">
                <Filter className="h-3 w-3 text-muted-foreground" />
                {['ALL', 'DAILY', 'WEEKLY'].map(t => (
                  <Button
                    key={t}
                    variant={typeFilter === t ? 'default' : 'ghost'}
                    size="sm"
                    className={`h-6 text-[10px] px-2 ${typeFilter === t ? 'bg-[#00E5FF]/20 text-[#00E5FF]' : 'text-muted-foreground'}`}
                    onClick={() => setTypeFilter(t)}
                  >
                    {t === 'ALL' ? 'Todos' : t === 'DAILY' ? 'Diario' : 'Semanal'}
                  </Button>
                ))}
              </div>
              {/* Bulk actions */}
              {selectedIds.size > 0 && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}
                    className="h-7 text-xs gap-1 border-white/10 hover:border-white/20">
                    Limpiar
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => setShowBulkDelete(true)}
                    className="h-7 text-xs gap-1 bg-[#FF4444]/10 text-[#FF4444] border-[#FF4444]/30 hover:bg-[#FF4444]/20">
                    <Trash className="h-3 w-3" />
                    Eliminar ({selectedIds.size})
                  </Button>
                </>
              )}
            </div>
          </div>
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
                  <TableRow className="border-white/5">
                    <TableHead className="w-10">
                      <button onClick={toggleSelectAll} className="flex items-center justify-center">
                        {allSelected ? (
                          <CheckSquare className="h-4 w-4 text-[#00E5FF]" />
                        ) : someSelected ? (
                          <div className="h-4 w-4 rounded border-2 border-[#00E5FF] bg-[#00E5FF]/20 flex items-center justify-center">
                            <div className="h-1.5 w-1.5 rounded-sm bg-[#00E5FF]" />
                          </div>
                        ) : (
                          <Square className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="font-display text-[10px] uppercase tracking-wider">Tipo</TableHead>
                    <TableHead className="font-display text-[10px] uppercase tracking-wider">Estado</TableHead>
                    <TableHead className="font-display text-[10px] uppercase tracking-wider hidden sm:table-cell">Resumen</TableHead>
                    <TableHead className="font-display text-[10px] uppercase tracking-wider">Generado</TableHead>
                    <TableHead className="text-right font-display text-[10px] uppercase tracking-wider">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report: any) => {
                    const isSelected = selectedIds.has(report.id)
                    const summary = getReportSummary(report)
                    return (
                      <TableRow key={report.id} className={`border-white/5 transition-colors ${isSelected ? 'bg-[#00E5FF]/[0.03]' : 'hover:bg-white/[0.02]'}`}>
                        <TableCell>
                          <button onClick={() => toggleSelect(report.id)} className="flex items-center justify-center">
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-[#00E5FF]" />
                            ) : (
                              <Square className="h-4 w-4 text-muted-foreground hover:text-[#00E5FF] transition-colors" />
                            )}
                          </button>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] font-display ${report.type === 'DAILY' ? 'bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/30' : 'bg-[#1E90FF]/10 text-[#1E90FF] border-[#1E90FF]/30'}`}>
                            {report.type === 'DAILY' ? 'Diario' : 'Semanal'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] font-display ${report.status === 'completed' ? 'bg-[#00FF88]/10 text-[#00FF88] border-[#00FF88]/30' : 'bg-muted text-muted-foreground border-border'}`}>
                            {report.status === 'completed' ? 'Completado' : report.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex gap-3 text-[10px]">
                            <span className="text-[#00E5FF]">{summary.events} eventos</span>
                            {summary.critical > 0 && <span className="text-[#FF4444]">{summary.critical} críticos</span>}
                            <span className="text-[#FFD700]">${summary.cost.toFixed(2)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {new Date(report.generatedAt).toLocaleString('es-CO')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-[#00E5FF]" onClick={() => handleView(report)} title="Vista previa">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-[#FFD700]" onClick={() => handleDownload(report)} disabled={downloading === report.id} title="Descargar PDF">
                              {downloading === report.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-[#FF4444] hover:bg-[#FF4444]/10" onClick={() => setDeleteReport(report)} title="Eliminar">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
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

      {/* ═══ VIEW DIALOG — iframe preview ═══════════════════════ */}
      <Dialog open={!!viewReport} onOpenChange={(open) => !open && setViewReport(null)}>
        <DialogContent className="glass-card max-w-5xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-3">
            <DialogTitle className="flex items-center gap-2 font-display">
              <FileText className="h-5 w-5 text-[#00E5FF]" />
              Informe {viewReport?.type === 'DAILY' ? 'Diario' : 'Semanal'}
            </DialogTitle>
            <DialogDescription>
              Generado: {viewReport?.generatedAt ? new Date(viewReport.generatedAt).toLocaleString('es-CO') : 'N/A'}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-2">
            {viewLoading ? (
              <div className="space-y-2 py-4">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-4 w-full" />)}</div>
            ) : (
              <div className="rounded-lg overflow-hidden border border-white/10 bg-[#0a0e17]" style={{ height: '60vh' }}>
                {/* Use dangerouslySetInnerHTML for proper HTML rendering */}
                <iframe
                  srcDoc={viewHtml}
                  title="Vista previa del informe"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  sandbox="allow-same-origin"
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 px-6 pb-6">
            <Button variant="outline" size="sm" onClick={() => setViewReport(null)}>Cerrar</Button>
            <Button variant="default" size="sm" className="gap-2" onClick={() => viewReport && handleDownload(viewReport)}>
              <Download className="h-4 w-4" /> Descargar PDF
            </Button>
            <Button variant="ghost" size="sm" className="gap-2 text-[#00E5FF]" onClick={() => {
              if (viewReport) {
                const url = `${api.defaults.baseURL}/reports/${viewReport.id}/preview`
                window.open(url, '_blank')
              }
            }}>
              <ExternalLink className="h-4 w-4" /> Abrir en nueva pestaña
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Single Delete Confirmation */}
      <Dialog open={!!deleteReport} onOpenChange={(open) => !open && setDeleteReport(null)}>
        <DialogContent className="glass-card max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Eliminar informe</DialogTitle>
            <DialogDescription>¿Estás seguro de eliminar este informe?</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteReport(null)}>Cancelar</Button>
            <Button variant="destructive" size="sm" onClick={handleDelete}>Eliminar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation */}
      <Dialog open={showBulkDelete} onOpenChange={(open) => !open && setShowBulkDelete(false)}>
        <DialogContent className="glass-card max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Trash className="h-5 w-5 text-[#FF4444]" />
              Eliminar múltiples
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de eliminar <strong className="text-[#FF4444]">{selectedIds.size}</strong> informe(s)? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowBulkDelete(false)}>Cancelar</Button>
            <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={bulkDeleting} className="gap-1">
              {bulkDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              {bulkDeleting ? 'Eliminando...' : `Eliminar ${selectedIds.size}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
