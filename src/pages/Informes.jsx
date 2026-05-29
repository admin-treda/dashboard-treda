import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { fmtDate, fmtMoney, SEVERITIES, sevColor } from '@/utils/format';
import { ReportIcon, RefreshIcon, AlertIcon, CloudIcon, UserIcon, CheckIcon, ChartIcon } from '@/components/icons';
import { EmptyState, SeverityBadge, ProviderBadge, Spinner, SectionSpinner, StatusIndicator, StatCard } from '@/components/ui';

function InformeDiario() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const r = await api.informeDiario();
      setData(r.data || r);
    } catch (e) { console.error(e); setData(null); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  if (loading) return <SectionSpinner section="informes" />;
  if (!data) return <EmptyState icon={<ReportIcon size={32} />} message="No hay datos del informe diario" actionLabel="Reintentar" onAction={loadData} />;

  const d = data;
  const resumen = d.resumen || {};

  return (
    <>
      {/* Header del informe */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Montserrat, sans-serif' }}>
            📋 Informe Diario
          </h3>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {d.periodo} · Generado: {fmtDate(d.generado_en)}
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={loadData}>
          <RefreshIcon size={12} /> Actualizar
        </button>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid" style={{ marginBottom: 16 }}>
        <StatCard label="Eventos totales" color="blue" value={resumen.total_eventos || 0} />
        <StatCard label="Alertas críticas/altas" color="red" value={resumen.alertas_criticas || 0} />
        <StatCard label="Costo del día" color="green" value={fmtMoney(resumen.costo_dia || 0)} />
      </div>

      {/* Eventos por severidad */}
      {d.eventos_por_severidad && d.eventos_por_severidad.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-header"><div className="card-title">🛡️ Eventos por Severidad</div></div>
          <div className="card-body">
            <div className="grid grid-cols-5 gap-2 mb-3">
              {SEVERITIES.map(s => {
                const found = d.eventos_por_severidad.find(e => (e.severity || e.severidad) === s);
                const count = found ? (found.total || 0) : 0;
                const colors = { CRITICO: 'var(--accent-red)', ALTO: 'var(--accent-orange)', MEDIO: 'var(--accent-orange)', BAJO: 'var(--accent-green)', INFORMATIVO: 'var(--text-muted)' };
                return (
                  <div key={s} style={{ textAlign: 'center', padding: '8px 4px', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: colors[s] || 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif' }}>{count}</div>
                    <div style={{ fontSize: 8, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>{s}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Alertas detalle */}
      {d.alertas_detalle && d.alertas_detalle.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-header"><div className="card-title"><AlertIcon size={14} /> Alertas Críticas/Altas</div></div>
          <div className="card-body" style={{ maxHeight: 300, overflowY: 'auto' }}>
            {d.alertas_detalle.map((a, i) => (
              <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 11 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span><SeverityBadge severity={a.severidad} /> <b style={{ color: 'var(--text-primary)' }}>{a.tipo_evento}</b></span>
                  <span style={{ color: 'var(--text-muted)' }}>{fmtDate(a.fecha_evento)}</span>
                </div>
                <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>
                  <ProviderBadge provider={a.proveedor} /> {a.cuenta_nombre} · {a.usuario || 'N/A'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estado de cuentas */}
      {d.estado_cuentas && d.estado_cuentas.length > 0 && (
        <div className="card">
          <div className="card-header"><div className="card-title"><CloudIcon size={14} /> Estado de Cuentas</div></div>
          <div className="card-body">
            {d.estado_cuentas.map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                  <ProviderBadge provider={c.proveedor} /> {c.nombre}
                </span>
                <StatusIndicator status={c.estado_conexion} />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function InformeSemanal() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const r = await api.informeSemanal();
      setData(r.data || r);
    } catch (e) { console.error(e); setData(null); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  if (loading) return <SectionSpinner section="informes" />;
  if (!data) return <EmptyState icon={<ReportIcon size={32} />} message="No hay datos del informe semanal" actionLabel="Reintentar" onAction={loadData} />;

  const d = data;
  const resumen = d.resumen || {};

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Montserrat, sans-serif' }}>
            📊 Informe Semanal
          </h3>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {d.periodo} · Generado: {fmtDate(d.generado_en)}
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={loadData}>
          <RefreshIcon size={12} /> Actualizar
        </button>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid" style={{ marginBottom: 16 }}>
        <StatCard label="Eventos totales" color="blue" value={resumen.total_eventos || 0} />
        <StatCard label="Alertas críticas/altas" color="red" value={resumen.alertas_criticas || 0} />
        <StatCard label="Costo acumulado" color="green" value={fmtMoney(resumen.costo_acumulado || 0)} />
      </div>

      {/* Eventos por severidad */}
      {d.eventos_por_severidad && d.eventos_por_severidad.length > 0 && (
        <div className="card mb-3">
          <div className="card-header"><div className="card-title">🛡️ Eventos por Severidad</div></div>
          <div className="card-body">
            <div className="grid grid-cols-5 gap-2">
              {SEVERITIES.map(s => {
                const found = d.eventos_por_severidad.find(e => (e.severity || e.severidad) === s);
                const count = found ? (found.total || 0) : 0;
                const colors = { CRITICO: 'var(--accent-red)', ALTO: 'var(--accent-orange)', MEDIO: 'var(--accent-orange)', BAJO: 'var(--accent-green)', INFORMATIVO: 'var(--text-muted)' };
                return (
                  <div key={s} style={{ textAlign: 'center', padding: '10px 4px', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: colors[s] || 'var(--text-muted)', fontFamily: 'Montserrat, sans-serif' }}>{count}</div>
                    <div style={{ fontSize: 8, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>{s}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tendencia diaria */}
      {d.tendencia_diaria && d.tendencia_diaria.length > 0 && (
        <div className="card mb-3">
          <div className="card-header"><div className="card-title">📅 Tendencia Diaria</div></div>
          <div className="card-body">
            {d.tendencia_diaria.map((t, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{t.dia}</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Montserrat, sans-serif' }}>{t.total} eventos ({t.criticos} críticos)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top eventos */}
      {d.top_eventos && d.top_eventos.length > 0 && (
        <div className="card mb-3">
          <div className="card-header"><div className="card-title">🔝 Top 10 Eventos Más Frecuentes</div></div>
          <div className="card-body">
            {d.top_eventos.map((e, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>{i+1}.</span>
                  {e.tipo_evento} (<ProviderBadge provider={e.proveedor} />)
                </span>
                <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)' }}>{e.ocurrencias} veces</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top usuarios */}
      {d.top_usuarios && d.top_usuarios.length > 0 && (
        <div className="card">
          <div className="card-header"><div className="card-title"><UserIcon size={14} /> Top Usuarios con Más Actividad</div></div>
          <div className="card-body">
            {d.top_usuarios.map((u, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>{i+1}.</span>
                  {u.usuario} (<ProviderBadge provider={u.proveedor} />)
                </span>
                <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)' }}>{u.eventos} evt, {u.alertas} alertas</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export function InformesPage() {
  const [subTab, setSubTab] = useState('diario');

  return (
    <div className="page active">
      <div className="topbar">
        <div className="topbar-left">
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.2, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', fontFamily: 'Montserrat, sans-serif' }}>
            <ReportIcon size={18} /> Informes
          </span>
          <p>Resúmenes automáticos de seguridad y costos</p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="tabs">
        <button className={`tab-btn ${subTab === 'diario' ? 'active' : ''}`} onClick={() => setSubTab('diario')}>📋 Informe Diario</button>
        <button className={`tab-btn ${subTab === 'semanal' ? 'active' : ''}`} onClick={() => setSubTab('semanal')}>📊 Informe Semanal</button>
      </div>

      <div style={{ marginTop: 16 }}>
        {subTab === 'diario' && <InformeDiario />}
        {subTab === 'semanal' && <InformeSemanal />}
      </div>
    </div>
  );
}
