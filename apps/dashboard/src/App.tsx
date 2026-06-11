import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { LoginPage } from '@/pages/auth/LoginPage'
import { NotFoundPage } from '@/pages/not-found/NotFoundPage'
import { PermissionsProvider } from '@/lib/permissions'
import { BusinessUnitProvider } from '@/contexts/BusinessUnitContext'
import { Skeleton } from '@/components/ui/skeleton'

// Lazy load pages for code splitting
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })))
const AccountsListPage = lazy(() => import('@/pages/accounts/AccountsListPage').then(m => ({ default: m.AccountsListPage })))
const AccountCreatePage = lazy(() => import('@/pages/accounts/AccountCreatePage').then(m => ({ default: m.AccountCreatePage })))
const EventsPage = lazy(() => import('@/pages/events/EventsPage').then(m => ({ default: m.EventsPage })))
const CostsPage = lazy(() => import('@/pages/costs/CostsPage').then(m => ({ default: m.CostsPage })))
const NotificationsPage = lazy(() => import('@/pages/notifications/NotificationsPage').then(m => ({ default: m.NotificationsPage })))
const ReportsPage = lazy(() => import('@/pages/reports/ReportsPage').then(m => ({ default: m.ReportsPage })))
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })))
const NoticiasPage = lazy(() => import('@/pages/news/NoticiasPage').then(m => ({ default: m.NoticiasPage })))
const PentestPage = lazy(() => import('@/pages/pentest/PentestPage').then(m => ({ default: m.PentestPage })))
const HonchoPage = lazy(() => import('@/pages/honcho/HonchoPage').then(m => ({ default: m.HonchoPage })))
const AuditLogPage = lazy(() => import('@/pages/audit/AuditLogPage').then(m => ({ default: m.AuditLogPage })))
const HealthPage = lazy(() => import('@/pages/health/HealthPage').then(m => ({ default: m.HealthPage })))
const VulnerabilitiesPage = lazy(() => import('@/pages/vulnerabilities/VulnerabilitiesPage').then(m => ({ default: m.VulnerabilitiesPage })))
const IncidentsPage = lazy(() => import('@/pages/incidents/IncidentsPage').then(m => ({ default: m.IncidentsPage })))
const CompliancePage = lazy(() => import('@/pages/compliance/CompliancePage').then(m => ({ default: m.CompliancePage })))
const AssetsPage = lazy(() => import('@/pages/assets/AssetsPage').then(m => ({ default: m.AssetsPage })))
const ISMSDashboardPage = lazy(() => import('@/pages/iso27001/ISMSDashboardPage').then(m => ({ default: m.ISMSDashboardPage })))
const RisksPage = lazy(() => import('@/pages/iso27001/RisksPage').then(m => ({ default: m.RisksPage })))
const SoAPage = lazy(() => import('@/pages/iso27001/SoAPage').then(m => ({ default: m.SoAPage })))
const DocumentsPage = lazy(() => import('@/pages/iso27001/DocumentsPage').then(m => ({ default: m.DocumentsPage })))
const TrainingPage = lazy(() => import('@/pages/iso27001/TrainingPage').then(m => ({ default: m.TrainingPage })))
const AuditProgramPage = lazy(() => import('@/pages/iso27001/AuditProgramPage').then(m => ({ default: m.AuditProgramPage })))
const CAPAPage = lazy(() => import('@/pages/iso27001/CAPAPage').then(m => ({ default: m.CAPAPage })))
const BusinessUnitsPage = lazy(() => import('@/pages/iso27001/BusinessUnitsPage').then(m => ({ default: m.BusinessUnitsPage })))

// Page loading skeleton
function PageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  )
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/" replace />
}

function HomeRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
}

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <PermissionsProvider>
                <BusinessUnitProvider>
                  <ErrorBoundary>
                    <DashboardLayout />
                  </ErrorBoundary>
                </BusinessUnitProvider>
              </PermissionsProvider>
            </PrivateRoute>
          }
        >
          <Route path="dashboard" element={<Suspense fallback={<PageSkeleton />}><ErrorBoundary><DashboardPage /></ErrorBoundary></Suspense>} />
          <Route path="accounts" element={<Suspense fallback={<PageSkeleton />}><ErrorBoundary><AccountsListPage /></ErrorBoundary></Suspense>} />
          <Route path="accounts/new" element={<Suspense fallback={<PageSkeleton />}><ErrorBoundary><AccountCreatePage /></ErrorBoundary></Suspense>} />
          <Route path="accounts/:id" element={<Suspense fallback={<PageSkeleton />}><ErrorBoundary><AccountCreatePage /></ErrorBoundary></Suspense>} />
          <Route path="events" element={<Suspense fallback={<PageSkeleton />}><ErrorBoundary><EventsPage /></ErrorBoundary></Suspense>} />
          <Route path="costs" element={<Suspense fallback={<PageSkeleton />}><ErrorBoundary><CostsPage /></ErrorBoundary></Suspense>} />
          <Route path="notifications" element={<Suspense fallback={<PageSkeleton />}><ErrorBoundary><NotificationsPage /></ErrorBoundary></Suspense>} />
          <Route path="reports" element={<Suspense fallback={<PageSkeleton />}><ErrorBoundary><ReportsPage /></ErrorBoundary></Suspense>} />
          <Route path="settings" element={<Suspense fallback={<PageSkeleton />}><ErrorBoundary><SettingsPage /></ErrorBoundary></Suspense>} />
          <Route path="noticias" element={<Suspense fallback={<PageSkeleton />}><ErrorBoundary><NoticiasPage /></ErrorBoundary></Suspense>} />
          <Route path="pentest" element={<Suspense fallback={<PageSkeleton />}><ErrorBoundary><PentestPage /></ErrorBoundary></Suspense>} />
          <Route path="honcho" element={<Suspense fallback={<PageSkeleton />}><ErrorBoundary><HonchoPage /></ErrorBoundary></Suspense>} />
          <Route path="audit" element={<Suspense fallback={<PageSkeleton />}><ErrorBoundary><AuditLogPage /></ErrorBoundary></Suspense>} />
          <Route path="health" element={<Suspense fallback={<PageSkeleton />}><ErrorBoundary><HealthPage /></ErrorBoundary></Suspense>} />
          <Route path="vulnerabilities" element={<Suspense fallback={<PageSkeleton />}><ErrorBoundary><VulnerabilitiesPage /></ErrorBoundary></Suspense>} />
          <Route path="incidents" element={<Suspense fallback={<PageSkeleton />}><ErrorBoundary><IncidentsPage /></ErrorBoundary></Suspense>} />
          <Route path="compliance" element={<Suspense fallback={<PageSkeleton />}><ErrorBoundary><CompliancePage /></ErrorBoundary></Suspense>} />
          <Route path="assets" element={<Suspense fallback={<PageSkeleton />}><ErrorBoundary><AssetsPage /></ErrorBoundary></Suspense>} />
          <Route path="isms" element={<Suspense fallback={<PageSkeleton />}><ErrorBoundary><ISMSDashboardPage /></ErrorBoundary></Suspense>} />
          <Route path="risks" element={<Suspense fallback={<PageSkeleton />}><ErrorBoundary><RisksPage /></ErrorBoundary></Suspense>} />
          <Route path="soa" element={<Suspense fallback={<PageSkeleton />}><ErrorBoundary><SoAPage /></ErrorBoundary></Suspense>} />
          <Route path="documents" element={<Suspense fallback={<PageSkeleton />}><ErrorBoundary><DocumentsPage /></ErrorBoundary></Suspense>} />
          <Route path="training" element={<Suspense fallback={<PageSkeleton />}><ErrorBoundary><TrainingPage /></ErrorBoundary></Suspense>} />
          <Route path="audit-program" element={<Suspense fallback={<PageSkeleton />}><ErrorBoundary><AuditProgramPage /></ErrorBoundary></Suspense>} />
          <Route path="capa" element={<Suspense fallback={<PageSkeleton />}><ErrorBoundary><CAPAPage /></ErrorBoundary></Suspense>} />
          <Route path="business-units" element={<Suspense fallback={<PageSkeleton />}><ErrorBoundary><BusinessUnitsPage /></ErrorBoundary></Suspense>} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  )
}

export default App