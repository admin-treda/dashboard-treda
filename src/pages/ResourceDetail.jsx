import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { CloudIcon, ShieldIcon, ChartIcon, RefreshIcon, StatusIndicator, ProviderBadge, SeverityBadge, EventFeed, Spinner, EmptyState, SectionSpinner } from '@/components/ui';
import { Topbar } from '@/components/Layout';
import { fmtDate, fmtMoney, fmtRel } from '@/utils/format';

export function ResourceDetailPage({ accountId, onBack }) {
  const [cuenta, setCuenta] = useState(null);
  const [eventos, setEventos] = useState([]);
  const [costos, setCostos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('resumen');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [ctaRes, evtRes, costRes] = await Promise.all([
          api.cuentas(),
          api.eventos({ cuenta_id: accountId, limite: 50 }),
          api.costos(accountId),
        ]);
        const cta = (ctaRes.data || []).find(c => c.id === accountId);
        setCuenta(cta);
        setEventos(evtRes.data || []);
        setCostos(costRes.data || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    if (accountId) load();
  }, [accountId]);

  if (loading) return <div className="page active"><SectionSpinner section="cuentas" /></div>;
  if (!cuenta) return <div className="page active"><EmptyState icon={<CloudIcon size={32} />} message="Recurso no encontrado" /></div>;

  const tabs = [
    { id: 'resumen', label: 'Resumen' },
    { id: 'eventos', label: `Eventos (${eventos.length})` },
    { id: 'costos', label: `Costos (${costos.length})` },
  ];

  return (
    <div className="page active">
      <div className="topbar">
        <div className="topbar-left">
          <button className="btn btn-ghost btn-sm" onClick={onBack}>← Volver</button>
          <h2 className="ml-2">{cuenta.nombre}</h2>
          <ProviderBadge provider={cuenta.proveedor} />
        </div>
        <div className="topbar-right">
          <StatusIndicator status={cuenta.estado_conexion} />
          <span className="text-xs text-text-secondary">{cuenta.estado_conexion || 'pendiente'}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {tabs.map(t => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'resumen' && (
        <div className="grid-2 mt-4">
          <div className="card">
            <div className="card-header"><div className="card-title">Información del Recurso</div></div>
            <div className="card-body">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-text-muted">Proveedor</span><div className="font-medium text-text-primary"><ProviderBadge provider={cuenta.proveedor} /></div></div>
                <div><span className="text-text-muted">Región</span><div className="font-medium text-text-primary">{cuenta.region || '—'}</div></div>
                <div><span className="text-text-muted">Estado</span><div className="font-medium text-text-primary">{cuenta.estado_conexion || 'pendiente'}</div></div>
                <div><span className="text-text-muted">Últ. sync</span><div className="font-medium text-text-primary">{fmtDate(cuenta.ultima_sincronizacion)}</div></div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">Eventos Recientes</div></div>
            <div className="card-body">
              {eventos.length > 0 ? (
                <div className="space-y-2">
                  {eventos.slice(0, 5).map(e => (
                    <div key={e.id} className="flex items-center gap-2 text-xs">
                      <SeverityBadge severity={e.severidad} />
                      <span className="flex-1 truncate text-text-secondary">{e.tipo_evento}</span>
                      <span className="text-text-muted">{fmtRel(e.fecha_evento)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-muted">Sin eventos recientes</p>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'eventos' && (
        <div className="mt-4">
          {eventos.length > 0 ? (
            <EventFeed events={eventos} />
          ) : (
            <EmptyState icon={<ShieldIcon size={32} />} message="Sin eventos para este recurso" />
          )}
        </div>
      )}

      {tab === 'costos' && (
        <div className="mt-4">
          {costos.length > 0 ? (
            <div className="card">
              <div className="card-body">
                {costos.sort((a, b) => b.total - a.total).map((c, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5 border-b border-border text-xs">
                    <span className="flex-1 text-text-secondary">{c.servicio}</span>
                    <span className="font-semibold text-text-primary">{fmtMoney(c.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState icon={<ChartIcon size={32} />} message="Sin datos de costos para este recurso" />
          )}
        </div>
      )}
    </div>
  );
}

// Placeholder imports for ui components not yet imported
function apiCall() { return Promise.resolve({ data: [] }); }
