import { useState, useEffect } from 'react';
import { SettingsIcon, ServerIcon, ClockIcon, DatabaseIcon, RefreshIcon, TrashIcon, LockIcon } from '@/components/icons';
import { Topbar } from '@/components/Layout';
import { api } from '@/services/api';
import { fmtDate } from '@/utils/format';

function Section({ title, icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card mb-3">
      <button
        className="card-header w-full flex items-center justify-between cursor-pointer hover:bg-bg-elevated transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="card-title flex items-center gap-2">
          {icon}
          {title}
        </div>
        <svg width="12" height="12" viewBox="0 0 12 12" className={`transition-transform text-text-muted ${open ? 'rotate-180' : ''}`}>
          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </button>
      {open && <div className="card-body">{children}</div>}
    </div>
  );
}

function FormRow({ label, children }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
      <span className="text-xs text-text-secondary">{label}</span>
      <div className="w-64">{children}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = {
    ok: 'bg-green-500/15 text-green-400',
    error: 'bg-red-500/15 text-red-400',
    pendiente: 'bg-yellow-500/15 text-yellow-400',
    conectado: 'bg-green-500/15 text-green-400',
  };
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${colors[status] || 'bg-gray-500/15 text-gray-400'}`}>
      {status?.toUpperCase() || 'N/A'}
    </span>
  );
}

export function ConfiguracionPage() {
  const [cuentas, setCuentas] = useState([]);
  const [notificaciones, setNotificaciones] = useState([]);
  const [mantenimiento, setMantenimiento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(null);
  const [cleaning, setCleaning] = useState(false);
  const [saved, setSaved] = useState('');
  const [showChangePass, setShowChangePass] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [cuentasRes, notifRes, mantRes] = await Promise.all([
        api.cuentas(),
        api.notificaciones(),
        fetch('/api/mantenimiento/estado').then(r => r.json()),
      ]);
      setCuentas(cuentasRes.data || []);
      setNotificaciones(notifRes.data || []);
      setMantenimiento(mantRes.data);
    } catch (e) {
      console.error('Error cargando configuración:', e);
    } finally {
      setLoading(false);
    }
  }

  async function syncCuenta(cuentaId, tipo) {
    setSyncing(cuentaId + '-' + tipo);
    try {
      if (tipo === 'seguridad') {
        await api.syncSeguridad(cuentaId);
      } else {
        await api.syncCostos(cuentaId);
      }
      setSaved(`${tipo === 'seguridad' ? 'Seguridad' : 'Costos'} sincronizado`);
      setTimeout(() => setSaved(''), 3000);
      loadData();
    } catch (e) {
      setSaved('Error: ' + e.message);
      setTimeout(() => setSaved(''), 3000);
    } finally {
      setSyncing(null);
    }
  }

  async function handleChangePassword() {
    setPassError('');
    setPassSuccess('');
    if (!currentPass || !newPass || !confirmPass) {
      setPassError('Todos los campos son requeridos');
      return;
    }
    if (newPass.length < 6) {
      setPassError('Mínimo 6 caracteres');
      return;
    }
    if (newPass !== confirmPass) {
      setPassError('Las contraseñas no coinciden');
      return;
    }
    setChangingPass(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass })
      });
      const data = await res.json();
      if (!data.success) {
        setPassError(data.error || 'Error');
      } else {
        setPassSuccess('Contraseña actualizada');
        setCurrentPass(''); setNewPass(''); setConfirmPass('');
        setTimeout(() => { setPassSuccess(''); setShowChangePass(false); }, 2000);
      }
    } catch (e) {
      setPassError('Error de conexión');
    } finally {
      setChangingPass(false);
    }
  }

  async function limpiarEventos() {
    setCleaning(true);
    try {
      const r = await api.maintenanceStatus();
      await api.cleanupEvents(7, 50000);
      setSaved(`Limpieza completada`);
      setTimeout(() => setSaved(''), 5000);
      loadData();
    } catch (e) {
      setSaved('Error: ' + e.message);
      setTimeout(() => setSaved(''), 3000);
    } finally {
      setCleaning(false);
    }
  }

  if (loading) {
    return (
      <div className="page active">
        <Topbar title="Configuración" subtitle="Ajustes del sistema" />
        <div className="flex items-center justify-center h-48">
          <span className="inline-block w-5 h-5 border-2 border-border border-t-accent-blue rounded-full animate-spin" />
          <span className="ml-2 text-text-secondary text-xs">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="page active">
      <Topbar title="Configuración" subtitle="Ajustes y mantenimiento del sistema" />

      {/* Cuentas Cloud */}
      <Section title="Cuentas Cloud" icon={<ServerIcon size={14} />}>
        {cuentas.length === 0 ? (
          <p className="text-xs text-text-muted">No hay cuentas configuradas.</p>
        ) : (
          cuentas.map(c => (
            <div key={c.id} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
              <div>
                <div className="text-xs text-text-primary font-medium">{c.nombre}</div>
                <div className="text-[10px] text-text-muted">{c.proveedor.toUpperCase()} · {c.region}</div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={c.estado_conexion} />
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => syncCuenta(c.id, 'seguridad')}
                  disabled={syncing === c.id + '-seguridad'}
                >
                  {syncing === c.id + '-seguridad' ? (
                    <span className="inline-block w-3 h-3 border-2 border-border border-t-accent-blue rounded-full animate-spin" />
                  ) : (
                    <><RefreshIcon size={10} /> Seguridad</>
                  )}
                </button>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => syncCuenta(c.id, 'costos')}
                  disabled={syncing === c.id + '-costos'}
                >
                  {syncing === c.id + '-costos' ? (
                    <span className="inline-block w-3 h-3 border-2 border-border border-t-accent-blue rounded-full animate-spin" />
                  ) : (
                    <><RefreshIcon size={10} /> Costos</>
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </Section>

      {/* Notificaciones */}
      <Section title="Canales de Notificación" icon={<SettingsIcon size={14} />}>
        {notificaciones.length === 0 ? (
          <p className="text-xs text-text-muted">No hay canales de notificación configurados.</p>
        ) : (
          notificaciones.map(n => (
            <div key={n.id} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
              <div>
                <div className="text-xs text-text-primary font-medium uppercase">{n.canal}</div>
                <div className="text-[10px] text-text-muted">Configurado</div>
              </div>
              <StatusBadge status={n.activo ? 'ok' : 'pendiente'} />
            </div>
          ))
        )}
      </Section>

      {/* Programación */}
      <Section title="Programación de Tareas" icon={<ClockIcon size={14} />}>
        <FormRow label="Evaluación de seguridad">
          <span className="text-xs text-text-muted">Cada 20 minutos</span>
        </FormRow>
        <FormRow label="Consulta de costos">
          <span className="text-xs text-text-muted">Cada 24 horas</span>
        </FormRow>
        <FormRow label="Informe diario">
          <span className="text-xs text-text-muted">Todos los días a las 8:00 AM</span>
        </FormRow>
        <FormRow label="Informe semanal">
          <span className="text-xs text-text-muted">Lunes a las 8:00 AM</span>
        </FormRow>
        <FormRow label="Limpieza automática">
          <span className="text-xs text-text-muted">Eventos mayores a 7 días (cada hora)</span>
        </FormRow>
      </Section>

      {/* Base de Datos */}
      <Section title="Mantenimiento" icon={<DatabaseIcon size={14} />} defaultOpen={false}>
        {mantenimiento?.eventos && (
          <>
            <FormRow label="Total de eventos">
              <span className="text-xs text-text-muted">{mantenimiento.eventos.total?.toLocaleString() || 0}</span>
            </FormRow>
            <FormRow label="Evento más antiguo">
              <span className="text-xs text-text-muted">{mantenimiento.eventos.mas_antiguo ? fmtDate(mantenimiento.eventos.mas_antiguo) : 'N/A'}</span>
            </FormRow>
            <FormRow label="Evento más reciente">
              <span className="text-xs text-text-muted">{mantenimiento.eventos.mas_reciente ? fmtDate(mantenimiento.eventos.mas_reciente) : 'N/A'}</span>
            </FormRow>
            <div className="mt-3 pt-3 border-t border-border">
              <button
                className="btn btn-danger btn-sm"
                onClick={limpiarEventos}
                disabled={cleaning}
              >
                {cleaning ? (
                  <><span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> Limpiando...</>
                ) : (
                  <><TrashIcon size={12} /> Limpiar eventos antiguos</>
                )}
              </button>
              <p className="text-[10px] text-text-muted mt-1">Elimina eventos con más de 7 días de antigüedad.</p>
            </div>
          </>
        )}
      </Section>

      {/* Seguridad */}
      <Section title="Seguridad" icon={<LockIcon size={14} />} defaultOpen={false}>
        <FormRow label="Cambiar contraseña">
          <button className="btn btn-outline btn-sm" onClick={() => setShowChangePass(!showChangePass)}>
            {showChangePass ? 'Cancelar' : 'Cambiar contraseña'}
          </button>
        </FormRow>
        {showChangePass && (
          <div className="mt-3 p-3 border border-border rounded-lg bg-bg-elevated space-y-3">
            <div>
              <label className="form-label">Contraseña actual</label>
              <input className="form-input" type="password" value={currentPass} onChange={e => setCurrentPass(e.target.value)} placeholder="Ingresa tu contraseña actual" />
            </div>
            <div>
              <label className="form-label">Nueva contraseña</label>
              <input className="form-input" type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            <div>
              <label className="form-label">Confirmar nueva contraseña</label>
              <input className="form-input" type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="Repite la nueva contraseña" />
            </div>
            {passError && <p className="text-xs text-red-400">{passError}</p>}
            {passSuccess && <p className="text-xs text-green-400">{passSuccess}</p>}
            <button className="btn btn-primary btn-sm" onClick={handleChangePassword} disabled={changingPass}>
              {changingPass ? 'Cambiando...' : 'Guardar nueva contraseña'}
            </button>
          </div>
        )}
      </Section>

      {/* Sistema */}
      <Section title="Información del Sistema" icon={<ServerIcon size={14} />} defaultOpen={false}>
        <FormRow label="Versión">
          <span className="text-xs text-text-muted">v2.0.0</span>
        </FormRow>
        <FormRow label="Base de datos">
          <span className="text-xs text-text-muted">SQLite (better-sqlite3)</span>
        </FormRow>
        <FormRow label="Frontend">
          <span className="text-xs text-text-muted">React 18 + Vite + TailwindCSS v4</span>
        </FormRow>
        <FormRow label="Backend">
          <span className="text-xs text-text-muted">Node.js + Express</span>
        </FormRow>
      </Section>

      {/* Feedback */}
      {saved && (
        <div className="fixed bottom-4 right-4 bg-bg-card border border-border rounded-lg px-4 py-2 shadow-lg z-50">
          <span className="text-xs text-green-400">{saved}</span>
        </div>
      )}
    </div>
  );
}
