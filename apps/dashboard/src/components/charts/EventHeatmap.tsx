import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Flame } from 'lucide-react'

interface EventHeatmapProps {
  events: any[]
  loading?: boolean
}

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

function getIntensityColor(value: number, max: number): string {
  if (value === 0) return 'rgba(255,255,255,0.02)'
  const ratio = value / max
  if (ratio < 0.25) return 'rgba(0,229,255,0.15)'
  if (ratio < 0.5) return 'rgba(0,229,255,0.35)'
  if (ratio < 0.75) return 'rgba(59,130,246,0.55)'
  return 'rgba(255,68,68,0.7)'
}

export function EventHeatmap({ events, loading }: EventHeatmapProps) {
  const grid = useMemo(() => {
    const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))
    for (const evt of events) {
      const d = new Date(evt.createdAt)
      let dayOfWeek = d.getDay() - 1 // Monday=0
      if (dayOfWeek < 0) dayOfWeek = 6 // Sunday=6
      matrix[dayOfWeek][d.getHours()]++
    }
    return matrix
  }, [events])

  const maxVal = Math.max(...grid.flat(), 1)

  if (loading) {
    return (
      <Card className="glass-card border-white/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold font-display text-neon-purple tracking-wider uppercase flex items-center gap-2">
            <Flame className="h-4 w-4" /> Mapa de Actividad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40 animate-pulse bg-muted/20 rounded-lg" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-card border-white/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold font-display text-neon-purple tracking-wider uppercase flex items-center gap-2">
          <Flame className="h-4 w-4" /> Mapa de Actividad — Eventos por Hora/Día
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="inline-flex flex-col gap-0.5">
            {/* Hour labels */}
            <div className="flex items-center gap-0.5 pl-8">
              {HOURS.map(h => (
                <div key={h} className="w-[18px] text-center text-[7px] text-muted-foreground font-mono">
                  {h % 6 === 0 ? `${h}h` : ''}
                </div>
              ))}
            </div>
            {/* Grid rows */}
            {DAYS.map((day, di) => (
              <div key={day} className="flex items-center gap-0.5">
                <span className="w-7 text-[9px] text-muted-foreground font-mono text-right pr-1">{day}</span>
                {HOURS.map(h => (
                  <div
                    key={h}
                    className="w-[18px] h-[18px] rounded-sm transition-all hover:scale-125 hover:z-10 cursor-default"
                    style={{ backgroundColor: getIntensityColor(grid[di][h], maxVal) }}
                    title={`${day} ${h}:00 — ${grid[di][h]} eventos`}
                  />
                ))}
              </div>
            ))}
          </div>
          {/* Legend */}
          <div className="flex items-center gap-2 mt-3 justify-end">
            <span className="text-[9px] text-muted-foreground font-mono">Menos</span>
            {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
              <div key={ratio} className="w-3 h-3 rounded-sm" style={{ backgroundColor: getIntensityColor(Math.round(ratio * maxVal), maxVal) }} />
            ))}
            <span className="text-[9px] text-muted-foreground font-mono">Más</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
