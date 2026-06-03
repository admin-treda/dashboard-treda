import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { AccountsListPage } from '@/pages/accounts/AccountsListPage'
import { AccountCreatePage } from '@/pages/accounts/AccountCreatePage'
import { EventsPage } from '@/pages/events/EventsPage'
import { CostsPage } from '@/pages/costs/CostsPage'
import { NotificationsPage } from '@/pages/notifications/NotificationsPage'
import { ReportsPage } from '@/pages/reports/ReportsPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { NoticiasPage } from '@/pages/news/NoticiasPage'
import { PentestPage } from '@/pages/pentest/PentestPage'
import { PermissionsProvider } from '@/lib/permissions'

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
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <PermissionsProvider>
              <DashboardLayout />
            </PermissionsProvider>
          </PrivateRoute>
        }
      >
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="accounts" element={<AccountsListPage />} />
        <Route path="accounts/new" element={<AccountCreatePage />} />
        <Route path="accounts/:id" element={<AccountCreatePage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="costs" element={<CostsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
            <Route path="noticias" element={<NoticiasPage />} />
            <Route path="pentest" element={<PentestPage />} />
      </Route>
    </Routes>
  )
}

export default App
