import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { HonchoWidget } from '@/components/honcho/HonchoWidget'
import { useThemeStore } from '@/store/themeStore'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

export function DashboardLayout() {
  const { collapsed } = useThemeStore()
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.get('/poll-status')
        if (res.data?.last_run) {
          setLastUpdated(res.data.last_run)
        }
      } catch {}
    }
    fetchStatus()
    const interval = setInterval(fetchStatus, 15000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header: sticky at top, full width */}
      <Header />

      <div className="flex flex-1">
        {/* Sidebar: fixed left, below header */}
        <Sidebar />

        {/* Main content: offset by sidebar width */}
        <main
          className={cn(
            'flex-1 transition-all duration-300 pb-8 overflow-x-hidden',
            collapsed ? 'ml-16' : 'ml-60'
          )}
        >
          <div className="p-6">
            <Outlet />
          </div>
          <div className="fixed bottom-0 right-0 z-40 border-t bg-background/80 backdrop-blur-sm"
            style={{ left: collapsed ? '4rem' : '16rem' }}>
            <div className="flex items-center justify-between px-6 py-1.5 text-xs text-foreground/50">
              <span className="flex items-center gap-2">
                <span className="status-dot active" />
                Dashboard Treda — Dashboard Multi-Cloud
              </span>
              <span className="flex items-center gap-1.5">
                {lastUpdated
                  ? `Última recolección: ${new Date(lastUpdated).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`
                  : 'Recolector automático cada 20 minutos'}
              </span>
            </div>
          </div>
        </main>
      </div>

      {/* Honcho floating widget */}
      <HonchoWidget />
    </div>
  )
}
