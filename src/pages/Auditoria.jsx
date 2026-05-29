import { useState, useEffect } from 'react';
import { Topbar } from '@/components/Layout';
import { Spinner, EmptyState } from '@/components/ui';
import { api } from '@/services/api';
import { fmtDate } from '@/utils/format';
import { AuditIcon, UserIcon } from '@/components/icons';

export function AuditoriaPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAuditLog();
  }, []);

  const loadAuditLog = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.auditLog(100);
      setLogs(r.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const actionColors = {
    LOGIN: 'badge-green',
    LOGOUT: 'badge-gray',
    LOGIN_FAILED: 'badge-red',
    CREATE_ACCOUNT: 'badge-blue',
    DELETE_ACCOUNT: 'badge-red',
    CREATE_NOTIFICATION: 'badge-blue',
    DELETE_NOTIFICATION: 'badge-red',
    SYNC_COSTS: 'badge-orange',
    SYNC_SECURITY: 'badge-orange',
    CLEANUP_EVENTS: 'badge-gray',
    USER_CREATED: 'badge-blue',
  };

  const actionLabels = {
    LOGIN: 'Inicio de sesión',
    LOGOUT: 'Cierre de sesión',
    LOGIN_FAILED: 'Login fallido',
    CREATE_ACCOUNT: 'Crear cuenta',
    DELETE_ACCOUNT: 'Eliminar cuenta',
    CREATE_NOTIFICATION: 'Crear notificación',
    DELETE_NOTIFICATION: 'Eliminar notificación',
    SYNC_COSTS: 'Sincronizar costos',
    SYNC_SECURITY: 'Sincronizar seguridad',
    CLEANUP_EVENTS: 'Limpieza de eventos',
    USER_CREATED: 'Crear usuario',
  };

  return (
    <div className="page active">
      <Topbar
        title="Auditoría"
        subtitle="Registro de todas las acciones realizadas en el sistema"
      />

      {error && (
        <div className="alert-error">
          <span>Error: {error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Spinner />
          <span className="ml-2 text-text-secondary text-xs">Cargando registros...</span>
        </div>
      ) : logs.length === 0 ? (
        <EmptyState icon={<AuditIcon size={32} />} message="No hay registros de auditoría" />
      ) : (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Registro de Actividad ({logs.length} registros)</div>
          </div>
          <div className="audit-table">
            <div className="audit-header">
              <span>Fecha y Hora</span>
              <span>Usuario</span>
              <span>Acción</span>
              <span>Recurso</span>
              <span>Detalle</span>
            </div>
            {logs.map(log => (
              <div key={log.id} className="audit-row">
                <span className="audit-date">{fmtDate(log.created_at)}</span>
                <span className="audit-user">
                  {log.username || '—'}
                </span>
                <span className="audit-action">
                  <span className={`badge ${actionColors[log.action] || 'badge-gray'}`}>
                    {actionLabels[log.action] || log.action}
                  </span>
                </span>
                <span className="audit-resource">{log.resource || '—'}</span>
                <span className="audit-details" title={log.details}>{log.details || '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
