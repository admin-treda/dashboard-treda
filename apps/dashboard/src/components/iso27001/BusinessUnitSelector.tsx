import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Building2, ChevronDown } from 'lucide-react'

interface BusinessUnit {
  id: string
  name: string
  description: string
  industry?: string
  status: string
}

export function BusinessUnitSelector({ 
  selectedId, 
  onSelect 
}: { 
  selectedId: string | null
  onSelect: (id: string | null) => void 
}) {
  const [units, setUnits] = useState<BusinessUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    api.get('/business-units').then(r => {
      setUnits(r.data.units || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const selected = units.find(u => u.id === selectedId)

  if (loading) return <div className="h-9 w-48 bg-muted/30 rounded-lg animate-pulse" />
  if (units.length === 0) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 bg-muted/30 border border-border/30 rounded-lg hover:border-neon-cyan/20 transition-all text-sm min-w-[200px]"
      >
        <Building2 className="h-4 w-4 text-neon-cyan" />
        <span className="flex-1 text-left truncate">
          {selected ? selected.name : 'Todas las unidades'}
        </span>
        {selected && (
          <Badge variant="outline" className="text-[9px] ml-1">
            {selected.industry || 'N/A'}
          </Badge>
        )}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-full bg-card border border-border/40 rounded-lg shadow-xl z-50 max-h-60 overflow-auto">
          <button
            onClick={() => { onSelect(null); setOpen(false) }}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/30 transition-colors ${!selectedId ? 'text-neon-cyan bg-muted/20' : 'text-muted-foreground'}`}
          >
            Todas las unidades
          </button>
          {units.map(u => (
            <button
              key={u.id}
              onClick={() => { onSelect(u.id); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/30 transition-colors ${selectedId === u.id ? 'text-neon-cyan bg-muted/20' : ''}`}
            >
              <div className="font-medium">{u.name}</div>
              {u.industry && <div className="text-[10px] text-muted-foreground">{u.industry}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
