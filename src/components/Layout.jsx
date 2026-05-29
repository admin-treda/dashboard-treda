import { useState } from 'react';
import { useClock } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import * as Icons from '@/components/icons';
import { Breadcrumb } from '@/components/Breadcrumb';

const AuditIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 16} height={props.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const NAV = [
  { id: 'dashboard', icon: Icons.DashboardIcon, label: 'Dashboard', section: 'MONITOR' },
  { id: 'costos', icon: Icons.ChartIcon, label: 'Costos', section: 'MONITOR' },
  { id: 'seguridad', icon: Icons.ShieldIcon, label: 'Seguridad', section: 'MONITOR' },
  { id: 'informes', icon: Icons.ReportIcon, label: 'Informes', section: 'INFORMES' },
  { id: 'cuentas', icon: Icons.CloudIcon, label: 'Cuentas', section: 'CONFIGURACIÓN' },
  { id: 'notificaciones', icon: Icons.BellIcon, label: 'Notificaciones', section: 'CONFIGURACIÓN' },
  { id: 'auditoria', icon: AuditIcon, label: 'Auditoría', section: 'CONFIGURACIÓN' },
  { id: 'configuracion', icon: Icons.SettingsIcon, label: 'Configuración', section: 'CONFIGURACIÓN' },
];

export function Layout({ children, page, setPage, alertCount = 0 }) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, onLogout } = useAuth();
  const sections = [...new Set(NAV.map(n => n.section))];

  return (
    <div className="app">
      <nav className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-top">
          <div className="sidebar-logo">
            <div className="logo-icon"><Icons.CloudIcon size={18} /></div>
            <div><h1>Cloud Dashboard</h1><small>Security Monitor</small></div>
          </div>
          <button className="sidebar-toggle" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? '▶' : '◀'}
          </button>
        </div>

        {sections.map(sec => (
          <div key={sec} className="sidebar-section">
            <div className="section-title">{sec}</div>
            <ul className="sidebar-nav">
              {NAV.filter(n => n.section === sec).map(n => {
                const IconComp = n.icon;
                return (
                  <li key={n.id}>
                    <a href="javascript:void(0)" className={page === n.id ? 'active' : ''} onClick={e => { e.preventDefault(); setPage(n.id); }}>
                      <span className="nav-icon"><IconComp size={14} /></span>
                      <span>{n.label}</span>
                      {n.id === 'seguridad' && alertCount > 0 && (
                        <span className="nav-badge">{alertCount}</span>
                      )}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        <div className="sidebar-status">
          <span className="status-dot ok" />
          <span>Sistema operativo</span>
        </div>

        <div className="sidebar-theme" onClick={toggleTheme} role="button" aria-label="Cambiar tema">
          <div className="sidebar-theme-track">
            <div className="sidebar-theme-icon" id="theme-icon">🌙</div>
          </div>
          <span className="sidebar-theme-label" id="theme-label">OSCURO</span>
        </div>
      </nav>

      <main className="main">
        {children}
      </main>
    </div>
  );
}

export function Topbar({ title, subtitle, onRefresh, rightContent, alertCount = 0, setPage }) {
  const time = useClock();
  const { user, onLogout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.dispatchEvent(new CustomEvent('dashboard:search', { detail: searchQuery.trim() }));
    }
  };

  return (
    <div className="topbar">
      <div className="topbar-left">
        <Breadcrumb />
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="topbar-right">
        <form className="topbar-search" onSubmit={handleSearch}>
          <Icons.SearchIcon size={12} />
          <input type="text" placeholder="Buscar eventos, cuentas..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </form>
        <div className="topbar-bell">
          <Icons.BellIcon size={14} />
          {alertCount > 0 && <span className="bell-badge">{alertCount}</span>}
        </div>
        {rightContent}
        <div className="live-indicator">
          <span className="live-dot" />
          EN VIVO
        </div>
        <div className="topbar-time">{time}</div>
        {onRefresh && (
          <button className="btn btn-ghost btn-sm" onClick={onRefresh}>
            <Icons.RefreshIcon size={12} /> Actualizar
          </button>
        )}
        <div className="topbar-divider" />
        <div className="user-menu">
          <div className="user-info">
            <span className="user-name">{user?.username || 'Admin'}</span>
            <span className="user-role">{user?.role || 'admin'}</span>
          </div>
          <button className="btn btn-ghost btn-xs" onClick={onLogout} title="Cerrar sesión">
            <Icons.LogOutIcon size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('ts-theme', next);
  const icon = document.getElementById('theme-icon');
  const label = document.getElementById('theme-label');
  if (icon && label) {
    icon.textContent = next === 'dark' ? '🌙' : '☀️';
    label.textContent = next === 'dark' ? 'OSCURO' : 'CLARO';
  }
}

(function() {
  const saved = localStorage.getItem('ts-theme');
  if (saved && saved !== 'dark') {
    document.documentElement.setAttribute('data-theme', saved);
    const icon = document.getElementById('theme-icon') || document.querySelector('.sidebar-theme-icon');
    const label = document.getElementById('theme-label') || document.querySelector('.sidebar-theme-label');
    if (icon && label) {
      icon.textContent = saved === 'dark' ? '🌙' : '☀️';
      label.textContent = saved === 'dark' ? 'OSCURO' : 'CLARO';
    }
  }
})();
