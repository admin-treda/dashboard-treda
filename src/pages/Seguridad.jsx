import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { Topbar } from '@/components/Layout';
import { Spinner, SeverityBadge, ProviderBadge, EmptyState, SectionSpinner } from '@/components/ui';
import { fmtDate, SEVERITIES, sevColor } from '@/utils/format';
import { ShieldIcon, RefreshIcon, SearchIcon, XIcon } from '@/components/icons';

const PAGE_SIZE = 100;

export function SeguridadPage() {
  const [summary, setSummary] = useState({});
  const [cuentas, setCuentas] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [totalEventos, setTotalEventos] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastEval, setLastEval] = useState(null);
  const [page, setPage] = useState(0);
  const [filtros, setFiltros] = useState({ severidad: '', proveedor: '', cuenta_id: '', desde: '', hasta: '', q: '' });

  // Leer query de búsqueda global al montar o cambiar de página
  useEffect(() => {
    const savedQuery = sessionStorage.getItem('searchQuery');
    if (savedQuery) {
      setFiltros(prev => ({ ...prev, q: savedQuery }));
      sessionStorage.removeItem('searchQuery');
    }
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const [ctaRes, evalRes] = await Promise.all([api.cuentas(), api.ultimaEvaluacion()]);
        setCuentas(ctaRes.data || []);
        setLastEval(evalRes?.ultima_captura || null);
      } catch (e) { console.error(e); }
    }
    load();
  }, []);

  const loadEvts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limite: PAGE_SIZE, offset: page * PAGE_SIZE };
      if (filtros.severidad) params.severidad = filtros.severidad;
      if (filtros.proveedor) params.proveedor = filtros.proveedor;
      if (filtros.cuenta_id) params.cuenta_id = filtros.cuenta_id;
      if (filtros.desde) params.desde = filtros.desde;
      if (filtros.hasta) params.hasta = filtros.hasta;
      if (filtros.q) params.q = filtros.q;
      const r = await api.eventos(params);
      setEventos(r.data || []);
      setTotalEventos(r.total || 0);
      setSummary(r.summary || {});
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [filtros, page]);

  useEffect(() => { loadEvts(); }, [loadEvts]);

  const handleChange = (key, value) => { setFiltros(prev => ({ ...prev, [key]: value })); setPage(0); };
  const limpiarFiltros = () => { setFiltros({ severidad: '', proveedor: '', cuenta_id: '', desde: '', hasta: '' }); setPage(0); };
  const totalPages = Math.ceil(totalEventos / PAGE_SIZE);
  const refreshData = () => { loadEvts(); };

  // Active filters as chips
  const activeFilters = [];
  if (filtros.severidad) activeFilters.push({ key: 'severidad', label: `Severidad: ${filtros.severidad}` });
  if (filtros.proveedor) activeFilters.push({ key: 'proveedor', label: `Proveedor: ${filtros.proveedor}` });
  if (filtros.cuenta_id) { const cta = cuentas.find(c => c.id === filtros.cuenta_id); activeFilters.push({ key: 'cuenta_id', label: `Cuenta: ${cta?.nombre || filtros.cuenta_id}` }); }
  if (filtros.desde) activeFilters.push({ key: 'desde', label: `Desde: ${filtros.desde}` });
  if (filtros.hasta) activeFilters.push({ key: 'hasta', label: `Hasta: ${filtros.hasta}` });
  if (filtros.q) activeFilters.push({ key: 'q', label: `Buscar: "${filtros.q}"` });

  return (
    <div className="page active">
      <Topbar
        title="Centro de Seguridad"
        subtitle={`${totalEventos} eventos totales · Actualización cada 20 min`}
        onRefresh={refreshData}
      />

      {/* Severity Summary Cards */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        {SEVERITIES.map(s => (
          <div key={s} className={`text-center py-3 px-2 rounded-lg bg-bg-3 border ${s === 'CRITICO' ? 'border-red-500/40 bg-red-500/10' : s === 'ALTO' ? 'border-orange-500/40 bg-orange-500/10' : 'border-border'}`}>
            <div className={`text-2xl font-bold ${s === 'CRITICO' ? 'text-red-500' : s === 'ALTO' ? 'text-orange-500' : s === 'MEDIO' ? 'text-yellow-500' : s === 'BAJO' ? 'text-green-500' : 'text-gray-400'}`}>
              {summary[s] || 0}
            </div>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-text-3 mt-1">{s}</div>
          </div>
        ))}
      </div>

      {/* Total Events Bar */}
      <div className="bg-bg-2 border border-border rounded-lg p-3 mb-4 flex justify-between items-center">
        <span className="text-sm font-semibold text-text-1">Total de eventos</span>
        <span className="text-2xl font-bold text-blue-500">{totalEventos}</span>
      </div>

      {/* Filters + Summary */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header"><div className="card-title"><SearchIcon size={14} /> Filtros</div></div>
          <div className="card-body">
            <div className="filter-bar">
              <input
                type="text"
                className="form-input"
                placeholder="Buscar por evento, usuario, recurso..."
                value={filtros.q}
                onChange={e => handleChange('q', e.target.value)}
                style={{ minWidth: 200 }}
              />
              <select className="form-select" value={filtros.severidad} onChange={e => handleChange('severidad', e.target.value)}>
                <option value="">Todas ({totalEventos})</option>
                {SEVERITIES.map(s => <option key={s} value={s}>{s} ({summary[s] || 0})</option>)}
              </select>
              <select className="form-select" value={filtros.proveedor} onChange={e => handleChange('proveedor', e.target.value)}>
                <option value="">Todos</option>
                <option value="aws">AWS</option>
                <option value="azure_m365">Azure</option>
              </select>
              <select className="form-select" value={filtros.cuenta_id} onChange={e => handleChange('cuenta_id', e.target.value)}>
                <option value="">Todas</option>
                {cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div className="filter-bar" style={{ marginTop: 6 }}>
              <label style={{ fontSize: 10, color: '#5a6577', marginRight: 4 }}>Desde:</label>
              <input type="datetime-local" className="form-input" style={{ minWidth: 160 }} value={filtros.desde} onChange={e => handleChange('desde', e.target.value)} />
              <label style={{ fontSize: 10, color: '#5a6577', margin: '0 4px' }}>Hasta:</label>
              <input type="datetime-local" className="form-input" style={{ minWidth: 160 }} value={filtros.hasta} onChange={e => handleChange('hasta', e.target.value)} />
              {activeFilters.length > 0 && (
                <button className="btn btn-ghost btn-xs" onClick={limpiarFiltros}><XIcon size={10} /> Limpiar</button>
              )}
            </div>
            {/* Active Filter Chips */}
            {activeFilters.length > 0 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                {activeFilters.map(f => (
                  <span key={f.key} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent-blue/10 text-accent-blue text-[9px] font-medium">
                    {f.label}
                    <button onClick={() => handleChange(f.key, '')} className="hover:text-white"><XIcon size={8} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">Resumen</div></div>
          <div className="card-body">
            {SEVERITIES.map(s => (
              <div key={s} className="flex justify-between items-center py-1.5 border-b border-border">
                <span className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: sevColor(s) }}></span>
                  {s}
                </span>
                <span className="font-bold text-sm" style={{ color: sevColor(s) }}>{summary[s] || 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Events Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Registro de Eventos</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 10, color: '#5a6577' }}>
            <span>Pág {page + 1} de {totalPages || 1}</span>
            <button className="btn btn-ghost btn-xs" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>← Anterior</button>
            <button className="btn btn-ghost btn-xs" onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}>Siguiente →</button>
          </div>
        </div>
        {loading ? (
          <div className="p-4"><SectionSpinner section="seguridad" /></div>
        ) : eventos.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Severidad</th>
                  <th>Fecha y Hora</th>
                  <th>Proveedor</th>
                  <th>Cuenta</th>
                  <th>Evento</th>
                  <th>Usuario</th>
                </tr>
              </thead>
              <tbody>
                {eventos.map(e => (
                  <tr key={e.id}>
                    <td><SeverityBadge severity={e.severidad} /></td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 10, color: '#5a6577' }}>{fmtDate(e.fecha_evento)}</td>
                    <td><ProviderBadge provider={e.proveedor} /></td>
                    <td style={{ fontSize: 10 }}>{e.cuenta_nombre || '—'}</td>
                    <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }} title={e.tipo_evento}>{e.tipo_evento}</td>
                    <td style={{ fontSize: 10, color: '#5a6577' }}>{e.usuario || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={<ShieldIcon size={24} />} message="No hay eventos. El scheduler capturará eventos automáticamente cada 20 minutos." />
        )}
      </div>
    </div>
  );
}
