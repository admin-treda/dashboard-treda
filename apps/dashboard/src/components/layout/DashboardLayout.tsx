import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { HonchoWidget } from '@/components/honcho/HonchoWidget'
import { useThemeStore } from '@/store/themeStore'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

export function DashboardLayout() {
  const { sidebarCollapsed: collapsed } = useThemeStore()
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <Header onMenuClick={() => setMobileMenuOpen(true)} />

      <div className="flex flex-1">
        {/* Sidebar */}
        <Sidebar 
          mobileOpen={mobileMenuOpen} 
          onMobileClose={() => setMobileMenuOpen(false)} 
        />

        {/* Main content */}
        <main
          className={cn(
            'flex-1 transition-all duration-300 pb-10 overflow-x-hidden',
            // Mobile: full width
            'ml-0',
            // Desktop: offset by sidebar
            collapsed ? 'md:ml-16' : 'md:ml-60'
          )}
        >
          <div className="p-4 md:p-6">
            <Outlet />
          </div>
          
          {/* Status bar */}
          <div className="fixed bottom-0 right-0 z-30 border-t border-border/30 bg-card/80 backdrop-blur-md"
            style={{ left: collapsed ? '4rem' : '16rem' }}>
            <div className="flex items-center justify-between px-4 md:px-6 py-1.5 text-[10px] text-text-dim">
              <span className="flex items-center gap-2 font-mono">
                <span className="status-dot active" />
                <span className="hidden sm:inline">Dashboard Treda</span>
                <span className="sm:hidden">Treda</span>
                <span className="text-text-dim/50">·</span>
                <span className="text-neon-cyan/60">Multi-Cloud</span>
              </span>
              <span className="flex items-center gap-1.5 font-mono">
                {lastUpdated ? (
                  <>
                    <span className="hidden md:inline">Recolectado:</span>
                    <span>{new Date(lastUpdated).toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' })}</span>
                  </>
                ) : (
                  <span className="text-text-dim/60">Auto-refresh 20min</span>
                )}
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
