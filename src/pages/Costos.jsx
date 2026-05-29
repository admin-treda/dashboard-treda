import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { CostRow, Spinner, EmptyState, StatusIndicator, SectionSpinner } from '@/components/ui';
import { fmtMoney } from '@/utils/format';
import { CostIcon, RefreshIcon, ChartIcon, CloudIcon } from '@/components/icons';

function CostosCuenta({ cuenta }) {
  const [costos, setCostos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const loadCostos = async () => {
    setLoading(true);
    try {
      const r = await api.costos(cuenta.id);
      setCostos(r.data || []);
    } catch (e) { console.error(e); setCostos([]); }
    setLoading(false);
  };

  useEffect(() => { loadCostos(); }, [cuenta.id]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.syncCostos(cuenta.id);
      await loadCostos();
    } catch (e) { console.error(e); }
    setSyncing(false);
  };

  if (loading) return (
    <div className="account-card">
      <Spinner />
      <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 8 }}>Cargando costos...</span>
    </div>
  );

  const total = (costos || []).reduce((s, d) => s + d.total, 0);
  const sorted = (costos || []).filter(d => d.total > 0).sort((a, b) => b.total - a.total);
  const max = sorted[0]?.total || 1;

  return (
    <div className="account-card">
      <div className="account-card-header">
        <div className="flex items-center gap-2">
          <StatusIndicator status={cuenta.estado_conexion} />
          <span className="account-card-title">{cuenta.nombre}</span>
          <span className={`badge ${cuenta.proveedor === 'aws' ? 'badge-orange' : 'badge-blue'}`}>
            {cuenta.proveedor === 'aws' ? 'AWS' : 'AZURE'}
          </span>
        </div>
        <button className="btn btn-ghost btn-xs" onClick={handleSync} disabled={syncing}>
          {syncing ? <Spinner /> : <><RefreshIcon size={10} /> Sincronizar</>}
        </button>
      </div>
      <div className="account-card-body">
        {sorted.length > 0 ? (
          <>
            <div className="flex items-baseline gap-2 mb-3">
              <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-green)', fontFamily: 'Montserrat, sans-serif' }}>
                {fmtMoney(total)}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {sorted[0]?.moneda || 'USD'} · Mes actual
              </span>
            </div>
            {sorted.map((s, i) => (
              <CostRow key={i} service={s.servicio} amount={s.total} max={max} />
            ))}
          </>
        ) : (
          <EmptyState icon={<CostIcon size={24} />} message="Sin datos de costos. Presiona Sincronizar." />
        )}
      </div>
    </div>
  );
}

export function CostosPage() {
  const [cuentas, setCuentas] = useState([]);
  const [costosData, setCostosData] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('aws');

  const loadData = async () => {
    setLoading(true);
    try {
      const r = await api.cuentas();
      const cuentasList = r.data || [];
      setCuentas(cuentasList);
      const costosMap = {};
      for (const c of cuentasList) {
        try {
          const cr = await api.costos(c.id);
          costosMap[c.id] = cr.data || [];
        } catch (e) { costosMap[c.id] = []; }
      }
      setCostosData(costosMap);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const awsCuentas = cuentas.filter(c => c.proveedor === 'aws');
  const azureCuentas = cuentas.filter(c => c.proveedor === 'azure_m365');

  const getCostoTotal = (cuentaId) => {
    const costos = costosData[cuentaId] || [];
    return costos.reduce((s, d) => s + d.total, 0);
  };

  const awsTotal = awsCuentas.reduce((sum, c) => sum + getCostoTotal(c.id), 0);
  const azureTotal = azureCuentas.reduce((sum, c) => sum + getCostoTotal(c.id), 0);
  const granTotal = awsTotal + azureTotal;

  return (
    <div className="page active">
      <div className="topbar">
        <div className="topbar-left">
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.2, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', fontFamily: 'Montserrat, sans-serif' }}>
            <CostIcon size={18} /> Costos por Servicio
          </span>
          <p>Datos reales del mes actual</p>
        </div>
        <div className="topbar-right">
          <button className="btn btn-ghost btn-sm" onClick={() => { setLoading(true); loadData(); }}>
            <RefreshIcon size={12} /> Sincronizar Todo
          </button>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${tab === 'aws' ? 'active' : ''}`} onClick={() => setTab('aws')}>AWS ({awsCuentas.length})</button>
        <button className={`tab-btn ${tab === 'azure' ? 'active' : ''}`} onClick={() => setTab('azure')}>Azure / M365 ({azureCuentas.length})</button>
        <button className={`tab-btn ${tab === 'comp' ? 'active' : ''}`} onClick={() => setTab('comp')}>Comparativo</button>
      </div>

      {tab === 'aws' && (
        <div style={{ marginTop: 16 }}>
          {loading ? <SectionSpinner section="costos" /> :
           awsCuentas.length > 0 ? (
             <>
               {awsCuentas.map(c => <CostosCuenta key={c.id} cuenta={c} />)}
               <div className="card" style={{ marginTop: 12, marginBottom: 12 }}>
                 <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Total AWS</span>
                   <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-aws)', fontFamily: 'Montserrat, sans-serif' }}>
                     {fmtMoney(awsTotal)}
                   </span>
                 </div>
               </div>
             </>
           ) : <EmptyState icon={<CloudIcon size={24} />} message="No hay cuentas AWS" />}
        </div>
      )}

      {tab === 'azure' && (
        <div style={{ marginTop: 16 }}>
          {loading ? <SectionSpinner section="costos" /> :
           azureCuentas.length > 0 ? (
             <>
               {azureCuentas.map(c => <CostosCuenta key={c.id} cuenta={c} />)}
               <div className="card" style={{ marginTop: 12, marginBottom: 12 }}>
                 <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Total Azure / M365</span>
                   <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-blue)', fontFamily: 'Montserrat, sans-serif' }}>
                     {fmtMoney(azureTotal)}
                   </span>
                 </div>
               </div>
             </>
           ) : <EmptyState icon={<CloudIcon size={24} />} message="No hay cuentas Azure" />}
        </div>
      )}

      {tab === 'comp' && (
        <div style={{ marginTop: 16 }}>
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="card-header">
              <div className="card-title"><ChartIcon size={14} /> Comparativo AWS vs Azure</div>
            </div>
            <div className="card-body">
              <div className="grid-2 mb-4">
                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'Montserrat, sans-serif', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>AWS</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent-aws)', fontFamily: 'Montserrat, sans-serif' }}>{fmtMoney(awsTotal)}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{awsCuentas.length} cuentas</div>
                </div>
                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'Montserrat, sans-serif', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Azure / M365</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent-blue)', fontFamily: 'Montserrat, sans-serif' }}>{fmtMoney(azureTotal)}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{azureCuentas.length} cuentas</div>
                </div>
              </div>
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'Montserrat, sans-serif', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>TOTAL</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent-green)', fontFamily: 'Montserrat, sans-serif' }}>{fmtMoney(granTotal)}</div>
              </div>
            </div>
          </div>

          {[...awsCuentas, ...azureCuentas].length > 0 && (
            <div className="card">
              <div className="card-header"><div className="card-title">Detalle por Cuenta</div></div>
              <div className="card-body">
                {[...awsCuentas, ...azureCuentas].map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2">
                      <StatusIndicator status={c.estado_conexion} />
                      <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{c.nombre}</span>
                      <span className={`badge ${c.proveedor === 'aws' ? 'badge-orange' : 'badge-blue'}`}>
                        {c.proveedor === 'aws' ? 'AWS' : 'AZ'}
                      </span>
                    </div>
                    <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)', fontFamily: 'Montserrat, sans-serif' }}>
                      {fmtMoney(getCostoTotal(c.id))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
