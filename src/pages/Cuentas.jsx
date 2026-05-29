import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { Spinner, EmptyState, SectionSpinner, StatusIndicator, ProviderBadge } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import { CloudIcon, PlusIcon } from '@/components/icons';
import { fmtDate } from '@/utils/format';
import { CuentaModal } from '@/components/CuentaModal';

export function CuentasPage() {
  const [cuentas, setCuentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [testing, setTesting] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const { addToast } = useToast();

  const loadCuentas = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.cuentas();
      setCuentas(r.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCuentas(); }, []);

  const handleTest = async (id) => {
    setTesting(id);
    try {
      const r = await api.probarCuenta(id);
      addToast(`Conexión: ${r.estado}${r.detalle ? ' - ' + r.detalle : ''}`, 'success');
      await loadCuentas();
    } catch (e) {
      addToast('Error: ' + e.message, 'error');
    }
    setTesting(null);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta cuenta?')) return;
    try {
      await api.eliminarCuenta(id);
      addToast('Cuenta eliminada correctamente', 'success');
      await loadCuentas();
    } catch (e) {
      addToast('Error: ' + e.message, 'error');
    }
  };

  const handleSave = async () => {
    setShowModal(false);
    await loadCuentas();
  };

  const awsCuentas = cuentas.filter(c => c.proveedor === 'aws');
  const azureCuentas = cuentas.filter(c => c.proveedor === 'azure_m365');

  return (
    <div className="page active">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2><CloudIcon size={18} /> Gestión de Cuentas Cloud</h2>
          <p>Configura las credenciales para monitorear tus recursos. Las credenciales se cifran con AES-256.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <PlusIcon size={14} /> Agregar Cuenta
        </button>
      </div>

      {/* Modal para agregar cuenta */}
      {showModal && (
        <CuentaModal
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}

      {error && (
        <div className="alert-error">
          <span>Error al cargar cuentas: {error}</span>
        </div>
      )}

      {loading ? (
        <SectionSpinner section="cuentas" />
      ) : (
        <>
          {/* AWS Section */}
          <div className="card-section">
            <div className="card-section-header">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-500" />
                <h3>Amazon Web Services</h3>
                <span className="badge badge-orange">{awsCuentas.length}</span>
              </div>
            </div>
            {awsCuentas.length > 0 ? (
              <div className="account-list">
                {awsCuentas.map(c => (
                  <AccountRow
                    key={c.id}
                    cuenta={c}
                    testing={testing}
                    onTest={handleTest}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            ) : (
              <EmptyState icon={<CloudIcon size={28} />} message="No hay cuentas AWS configuradas. Agrega una para empezar a monitorear." />
            )}
          </div>

          {/* Azure Section */}
          <div className="card-section">
            <div className="card-section-header">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                <h3>Azure / Microsoft 365</h3>
                <span className="badge badge-blue">{azureCuentas.length}</span>
              </div>
            </div>
            {azureCuentas.length > 0 ? (
              <div className="account-list">
                {azureCuentas.map(c => (
                  <AccountRow
                    key={c.id}
                    cuenta={c}
                    testing={testing}
                    onTest={handleTest}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            ) : (
              <EmptyState icon={<CloudIcon size={28} />} message="No hay cuentas Azure configuradas. Agrega una para empezar a monitorear." />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function AccountRow({ cuenta, testing, onTest, onDelete }) {
  const isTesting = testing === cuenta.id;

  return (
    <div className="account-row">
      <div className="account-row-main">
        <div className="flex items-center gap-3">
          <StatusIndicator status={cuenta.estado_conexion} />
          <div>
            <div className="account-name">{cuenta.nombre}</div>
            <div className="account-meta">
              <ProviderBadge provider={cuenta.proveedor} />
              <span className="account-region">{cuenta.region || 'Sin región'}</span>
            </div>
          </div>
        </div>
        <div className="account-status">
          <span className={`status-text ${cuenta.estado_conexion === 'conectado' ? 'status-ok' : cuenta.estado_conexion === 'error' ? 'status-error' : 'status-pending'}`}>
            {cuenta.estado_conexion || 'pendiente'}
          </span>
        </div>
      </div>
      <div className="account-row-details">
        <span className="detail-label">Últ. sync</span>
        <span className="detail-value">{cuenta.ultima_sincronizacion ? fmtDate(cuenta.ultima_sincronizacion) : '—'}</span>
      </div>
      <div className="account-row-actions">
        <button
          className="btn btn-ghost btn-xs"
          onClick={() => onTest(cuenta.id)}
          disabled={isTesting}
          title="Probar conexión"
        >
          {isTesting ? (
            <span className="inline-block w-3 h-3 border-2 border-border border-t-accent-blue rounded-full animate-spin" />
          ) : (
            'Probar'
          )}
        </button>
        <button
          className="btn btn-danger btn-xs"
          onClick={() => onDelete(cuenta.id)}
          title="Eliminar cuenta"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}
