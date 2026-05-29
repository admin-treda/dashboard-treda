import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { LoginPage } from '@/pages/Login';
import { DashboardPage } from '@/pages/Dashboard';
import { CostosPage } from '@/pages/Costos';
import { SeguridadPage } from '@/pages/Seguridad';
import { InformesPage } from '@/pages/Informes';
import { CuentasPage } from '@/pages/Cuentas';
import { NotificacionesPage } from '@/pages/Notificaciones';
import { ConfiguracionPage } from '@/pages/Configuracion';
import { AuditoriaPage } from '@/pages/Auditoria';
import { AuthContext } from '@/context/AuthContext';

const PAGES = {
  dashboard: DashboardPage,
  costos: CostosPage,
  seguridad: SeguridadPage,
  informes: InformesPage,
  cuentas: CuentasPage,
  notificaciones: NotificacionesPage,
  configuracion: ConfiguracionPage,
  auditoria: AuditoriaPage,
};

function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const PageComponent = PAGES[page] || PAGES.dashboard;

  // Verificar sesión al cargar
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setLoading(false);
      return;
    }

    fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Invalid');
        return res.json();
      })
      .then(data => {
        if (data?.success) {
          setUser(data.user);
        } else {
          localStorage.removeItem('auth_token');
        }
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem('auth_token');
        setLoading(false);
      });
  }, []);

  const handleLogout = async () => {
    const token = localStorage.getItem('auth_token');
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) { /* ignorar */ }
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="login-container">
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="inline-block w-8 h-8 border-2 border-border border-t-accent-blue rounded-full animate-spin mb-4" />
          <p style={{ fontSize: 13 }}>Verificando sesión...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <AuthContext.Provider value={{ user, onLogout: handleLogout }}>
      <Layout page={page} setPage={setPage}>
        <PageComponent />
      </Layout>
    </AuthContext.Provider>
  );
}

export default App;
