'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import {
  Search, ShieldAlert, DollarSign, Shield, FileText,
  Globe, ArrowRight, Loader2,
} from 'lucide-react'

interface SearchResult {
  type: 'event' | 'cost' | 'scan' | 'report' | 'account' | 'news'
  id: string
  title: string
  subtitle: string
  icon: any
  color: string
  path: string
}

const typeConfig: Record<string, { icon: any; color: string; label: string; path: string }> = {
  event: { icon: ShieldAlert, color: '#FF4444', label: 'Evento', path: '/events' },
  cost: { icon: DollarSign, color: '#FFD700', label: 'Costo', path: '/costs' },
  scan: { icon: Shield, color: '#8B5CF6', label: 'Pentest', path: '/pentest' },
  report: { icon: FileText, color: '#00E5FF', label: 'Informe', path: '/reports' },
  account: { icon: Globe, color: '#00FF88', label: 'Cuenta', path: '/accounts' },
}

export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setSelectedIdx(0)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  const search = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const lower = q.toLowerCase()
      const [evtR, scanR, acctR] = await Promise.all([
        api.get('/events?limit=20').catch(() => ({ data: { data: [] } })),
        api.get('/pentest/scans').catch(() => ({ data: [] })),
        api.get('/accounts').catch(() => ({ data: { accounts: [] } })),
      ])

      const items: SearchResult[] = []

      // Search events
      for (const evt of (evtR.data?.data || []).slice(0, 50)) {
        const text = `${evt.description || ''} ${evt.type || ''} ${evt.account?.name || ''} ${evt.provider || ''}`.toLowerCase()
        if (text.includes(lower)) {
          items.push({
            type: 'event', id: evt.id,
            title: `${evt.type} — ${evt.severity}`,
            subtitle: (evt.description || '').slice(0, 80),
            icon: typeConfig.event.icon, color: typeConfig.event.color,
            path: '/events',
          })
        }
      }

      // Search scans
      for (const scan of (Array.isArray(scanR.data) ? scanR.data : []).slice(0, 30)) {
        if ((scan.url || '').toLowerCase().includes(lower)) {
          items.push({
            type: 'scan', id: scan.id,
            title: scan.url,
            subtitle: `Estado: ${scan.status} · ${(scan.summary?.total || 0)} findings`,
            icon: typeConfig.scan.icon, color: typeConfig.scan.color,
            path: '/pentest',
          })
        }
      }

      // Search accounts
      for (const acct of (acctR.data?.accounts || []).slice(0, 20)) {
        if ((acct.name || '').toLowerCase().includes(lower)) {
          items.push({
            type: 'account', id: acct.id,
            title: acct.name,
            subtitle: `${acct.provider} · ${acct.region || 'N/A'} · ${acct.health || 'unknown'}`,
            icon: typeConfig.account.icon, color: typeConfig.account.color,
            path: '/accounts',
          })
        }
      }

      setResults(items.slice(0, 15))
      setSelectedIdx(0)
    } catch { setResults([]) }
    setLoading(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300)
    return () => clearTimeout(timer)
  }, [query, search])

  const handleSelect = (result: SearchResult) => {
    navigate(result.path)
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && results[selectedIdx]) { handleSelect(results[selectedIdx]) }
    else if (e.key === 'Escape') { onClose() }
  }

  const shortcuts = [
    { keys: 'Ctrl+K', desc: 'Abrir búsqueda' },
    { keys: 'Ctrl+E', desc: 'Ir a Eventos' },
    { keys: 'Ctrl+D', desc: 'Ir a Dashboard' },
    { keys: 'Ctrl+P', desc: 'Ir a Pentest' },
    { keys: 'Ctrl+C', desc: 'Ir a Costos' },
  ]

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-card max-w-xl p-0 gap-0 overflow-hidden border-neon-cyan/20">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
          <Search className="h-4 w-4 text-neon-cyan" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar eventos, cuentas, escaneos..."
            className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm font-mono"
          />
          {loading && <Loader2 className="h-4 w-4 text-neon-cyan animate-spin" />}
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {results.length > 0 ? (
            <div className="p-2">
              {results.map((r, i) => {
                const RIcon = r.icon
                return (
                  <button
                    key={`${r.type}-${r.id}`}
                    onClick={() => handleSelect(r)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      i === selectedIdx ? 'bg-neon-cyan/10 border border-neon-cyan/20' : 'hover:bg-muted/30 border border-transparent'
                    }`}
                  >
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: r.color + '15' }}>
                      <RIcon className="h-4 w-4" style={{ color: r.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate font-mono">{r.subtitle}</p>
                    </div>
                    <Badge variant="outline" className="text-[9px] font-display flex-shrink-0" style={{ color: r.color, borderColor: r.color + '40' }}>
                      {typeConfig[r.type]?.label}
                    </Badge>
                    <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  </button>
                )
              })}
            </div>
          ) : query.length >= 2 && !loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground font-mono">Sin resultados para "{query}"</div>
          ) : query.length < 2 ? (
            <div className="p-4 space-y-3">
              <p className="text-[10px] text-muted-foreground font-display uppercase tracking-wider">Atajos de teclado</p>
              <div className="space-y-1.5">
                {shortcuts.map(s => (
                  <div key={s.keys} className="flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-muted/20">
                    <span className="text-xs text-muted-foreground">{s.desc}</span>
                    <kbd className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted/50 border border-white/10">{s.keys}</kbd>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
