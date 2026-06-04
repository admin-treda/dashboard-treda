import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ExternalLink, Search, RefreshCw, Globe, Newspaper, Shield, Cpu, Bot, AlertTriangle, Trash2, Clock } from 'lucide-react'
import { toast } from 'sonner'

interface NewsItem {
  id: string
  title: string
  description: string
  url: string
  source: string
  category: string
  publishedAt: string
}

const CATEGORIES = ['Crítico', 'IA', 'Agentes', 'IT', 'Seguridad']

const categoryConfig: Record<string, { icon: JSX.Element; color: string; label: string }> = {
  Crítico: { icon: <AlertTriangle className="h-4 w-4" />, color: 'border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20', label: 'Alertas Críticas' },
  IA: { icon: <Bot className="h-4 w-4" />, color: 'border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20', label: 'Inteligencia Artificial' },
  Agentes: { icon: <Bot className="h-4 w-4" />, color: 'border-indigo-300 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20', label: 'Agentes AI' },
  IT: { icon: <Cpu className="h-4 w-4" />, color: 'border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20', label: 'Tecnología IT' },
  Seguridad: { icon: <Shield className="h-4 w-4" />, color: 'border-orange-300 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20', label: 'Ciberseguridad' },
}

const badgeColor: Record<string, string> = {
  Crítico: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800',
  IA: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  Agentes: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  IT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Seguridad: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
}

export function NoticiasPage() {
  const [allNews, setAllNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)

  const fetchNews = async () => {
    try {
      const [newsRes, statusRes] = await Promise.all([
        api.get('/news?limit=200'),
        api.get('/news/status').catch(() => null),
      ])
      setAllNews(newsRes.data?.data || [])
      if (statusRes?.data?.last_update) setLastUpdate(statusRes.data.last_update)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchNews() }, [])

  const handleSync = async () => {
    setSyncing(true)
    try {
      await api.post('/news/fetch')
      await fetchNews()
      toast.success('Noticias actualizadas')
    } catch { toast.error('Error al actualizar') }
    setSyncing(false)
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete('/news/' + id)
      setAllNews(prev => prev.filter(n => n.id !== id))
      toast.success('Noticia eliminada')
    } catch { toast.error('Error al eliminar') }
  }

  const filtered = search
    ? allNews.filter(n => n.title?.toLowerCase().includes(search.toLowerCase()) || n.description?.toLowerCase().includes(search.toLowerCase()))
    : allNews

  const grouped = CATEGORIES.map(cat => ({
    cat,
    config: categoryConfig[cat],
    items: filtered.filter(n => n.category === cat).slice(0, 50),
  })).filter(g => g.items.length > 0)

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h`
    return `${Math.floor(hours / 24)}d`
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold gradient-animated">Noticias Tecnológicas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            IA, Agentes, TI y Ciberseguridad — fuentes oficiales. La búsqueda y clasificación la realiza la aplicación sobre los artículos descargados.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing} className="gap-2 shrink-0">
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Actualizando...' : 'Actualizar'}
        </Button>
      </div>

      {lastUpdate && (
        <div className="text-xs text-muted-foreground">
          Última actualización de noticias: {new Date(lastUpdate).toLocaleString('es-CO', { timeZone: 'America/Bogota' })} — se actualiza cada 4 horas automáticamente
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar en todas las noticias..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Loading */}
      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-72 w-full" />)}
        </div>
      ) : grouped.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <Newspaper className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No hay noticias disponibles. Usa "Actualizar" para obtener las últimas.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {grouped.map(({ cat, config, items }) => (
            <Card key={cat} className={`glass-card border-2 ${config.color} flex flex-col`}>
              <CardHeader className="pb-2 shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    {config.icon}
                    {config.label}
                    <Badge variant="outline" className="text-[10px] ml-1">{items.length}</Badge>
                  </CardTitle>
                  {cat === 'Crítico' && (
                    <span className="text-[10px] text-muted-foreground">Auto-elimina en 15 días</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 flex-1 min-h-0">
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {items.map(article => (
                    <div key={article.id} className="group relative rounded-lg border border-border/50 p-2.5 hover:bg-accent/5 transition-colors">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${badgeColor[article.category] || ''}`}>
                              {article.category}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">{article.source}</span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Clock className="h-3 w-3" /> {timeAgo(article.publishedAt)}
                            </span>
                          </div>
                          <a href={article.url} target="_blank" rel="noopener noreferrer" className="block no-underline">
                            <h4 className="text-sm font-semibold text-foreground leading-snug hover:text-primary transition-colors line-clamp-2">{article.title}</h4>
                          </a>
                          {article.description && (
                            <p className="text-xs text-muted-foreground/90 mt-1 leading-relaxed line-clamp-3">{article.description}</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a href={article.url} target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-muted transition-colors">
                            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                          </a>
                          <button onClick={() => handleDelete(article.id)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
