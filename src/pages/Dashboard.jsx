import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/services/api';
import { Topbar } from '@/components/Layout';
import { StatCard, SeverityBar, SeverityLegend, HealthGrid, EventFeed, Spinner, SectionSpinner } from '@/components/ui';
import { fmtDate, fmtRel, fmtMoney } from '@/utils/format';
import { CloudIcon, ShieldIcon, ChartIcon, AlertIcon, RefreshIcon, EventIcon } from '@/components/icons';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const SEV_COLORS = {
  critico: '#dc2626', alto: '#f97316', medio: '#eab308', bajo: '#22c55e', informativo: '#6b7280',
};
const SEV_LABELS = {
  critico: 'Crítico', alto: 'Alto', medio: 'Medio', bajo: 'Bajo', informativo: 'Informativo',
};
const INITIAL_INTERVAL = 60000;
const MAX_INTERVAL = 300000;
const MAX_RETRIES = 5;

function calcNextInterval(current) {
  const next = current * 2;
  return next > MAX_INTERVAL ? MAX_INTERVAL : next;
}

function EventTimelineChart() {
  const [tendencia, setTendencia] = useState([]);
  const [loading, setLoading] = useState(true);
  const chartRef = useRef(null);
  const intervalRef = useRef(INITIAL_INTERVAL);
  const retryRef = useRef(0);
  const timerRef = useRef(null);
  const [isOffline, setIsOffline] = useState(false);

  const fetchTendencia = useCallback(async (resetBackoff = false) => {
    if (resetBackoff) { retryRef.current = 0; intervalRef.current = INITIAL_INTERVAL; setIsOffline(false); }
    try {
      const r = await api.seguridadTendencia(7);
      setTendencia(r.data || []);
      setIsOffline(false); retryRef.current = 0; intervalRef.current = INITIAL_INTERVAL;
    } catch (e) {
      console.error('Tendencia fetch error:', e);
      setIsOffline(true); retryRef.current += 1; intervalRef.current = calcNextInterval(intervalRef.current);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchTendencia();
    const id = setInterval(() => { fetchTendencia(false); }, 60000);
    return () => { clearInterval(id); if (timerRef.current) clearTimeout(timerRef.current); };
  }, [fetchTendencia]);

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <Spinner /><span className="ml-2 text-text-2 text-xs">Cargando tendencia...</span>
    </div>
  );

  const labels = tendencia.map(d => {
    const date = new Date(d.dia + 'T00:00:00');
    return date.toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short' });
  });
  const severityKeys = ['critico', 'alto', 'medio', 'bajo', 'informativo'];
  const datasets = severityKeys.map(key => ({
    label: SEV_LABELS[key], data: tendencia.map(d => d[key] || 0),
    backgroundColor: SEV_COLORS[key], borderWidth: 0, borderRadius: 3, barPercentage: 0.7,
  }));
  const chartData = { labels, datasets };

  const options = {
    responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top', labels: { color: '#a0aec0', font: { size: 10 }, usePointStyle: true, pointStyle: 'rectRounded', padding: 12 } },
      tooltip: {
        backgroundColor: '#151b23', titleColor: '#f0f4f8', bodyColor: '#a0aec0',
        borderColor: '#2d3748', borderWidth: 1, padding: 12,
        titleFont: { size: 11, weight: 'bold' }, bodyFont: { size: 10 },
        callbacks: {
          title: (items) => { const idx = items[0].dataIndex; const raw = tendencia[idx]?.dia; if (!raw) return ''; const d = new Date(raw + 'T00:00:00'); return d.toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }); },
          footer: (items) => { const idx = items[0].dataIndex; const total = tendencia[idx]?.total || 0; return `Total: ${total} eventos`; },
        },
      },
    },
    scales: {
      x: { stacked: true, ticks: { color: '#5a6577', font: { size: 10 } }, grid: { display: false } },
      y: { stacked: true, ticks: { color: '#5a6577', font: { size: 10 }, stepSize: 1 }, grid: { color: 'rgba(45,55,72,0.15)' }, beginAtZero: true },
    },
  };

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="card-header">
        <div className="card-title"><EventIcon size={14} /> Timeline de Eventos (Últimos 7 días)</div>
      </div>
      <div className="card-body"><div style={{ height: 260 }}><Bar ref={chartRef} data={chartData} options={options} /></div></div>
    </div>
  );
}

export function DashboardPage({ onNavigate } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [currentInterval, setCurrentInterval] = useState(INITIAL_INTERVAL);

  const intervalRef = useRef(INITIAL_INTERVAL);
  const retryRef = useRef(0);
  const timerRef = useRef(null);
  const mountedRef = useRef(true);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const fetchData = useCallback(async (isManualRetry = false) => {
    if (isManualRetry) {
      retryRef.current = 0;
      intervalRef.current = INITIAL_INTERVAL;
      setRetryCount(0);
      setCurrentInterval(INITIAL_INTERVAL);
      setIsPaused(false);
      setIsOffline(false);
    }

    try {
      setLoading(true);
      const [health, dashboard, cuentas, eventos, sevRes] = await Promise.all([
        api.health(), api.dashboard(), api.cuentas(),
        api.eventos({ limite: 20 }), api.seguridadResumen()
      ]);
      if (!mountedRef.current) return;
      setData({
        health: health.data || health,
        dashboard: dashboard.data || {},
        cuentas: cuentas.data || [],
        eventos: eventos.data || [],
        sev: sevRes.data || [],
      });
      // Reset backoff on success
      retryRef.current = 0;
      intervalRef.current = INITIAL_INTERVAL;
      setRetryCount(0);
      setCurrentInterval(INITIAL_INTERVAL);
      setIsOffline(false);
      setIsPaused(false);
    } catch (e) {
      console.error('Dashboard fetch error:', e);
      if (!mountedRef.current) return;
      setIsOffline(true);
      const newRetry = retryRef.current + 1;
      retryRef.current = newRetry;
      setRetryCount(newRetry);
      if (newRetry >= MAX_RETRIES) {
        setIsPaused(true);
        setLoading(false);
        return;
      }
      intervalRef.current = calcNextInterval(intervalRef.current);
      setCurrentInterval(intervalRef.current);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => {
      mountedRef.current = false;
      clearTimer();
    };
  }, [fetchData, clearTimer]);

  // Schedule next poll
  useEffect(() => {
    if (isPaused || loading) return;
    clearTimer();
    timerRef.current = setTimeout(() => {
      if (mountedRef.current && !isPaused) {
        fetchData(false);
      }
    }, intervalRef.current);
    return clearTimer;
  }, [isPaused, loading, currentInterval, clearTimer, fetchData]);

  const handleRetry = useCallback(() => {
    clearTimer();
    fetchData(true);
  }, [clearTimer, fetchData]);

  const handleRefresh = useCallback(() => {
    clearTimer();
    setLoading(true);
    fetchData(true);
  }, [clearTimer, fetchData]);

  if (loading && !data) {
    return (
      <div className="page active">
        <SectionSpinner section="dashboard" />
      </div>
    );
  }

  const d = data?.dashboard || {};
  const lastEval = data?.health?.ultima_evaluacion_eventos;
  const alertCount = d.eventos_criticos_7d || 0;
  const cuentas = data?.cuentas || [];
  const eventos = data?.eventos || [];
  const sev = data?.sev || [];
  const aws = cuentas.filter(c => c.proveedor === 'aws').length;
  const az = cuentas.filter(c => c.proveedor === 'azure_m365').length;

  const formatInterval = (ms) => {
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    return `${Math.round(s / 60)}m`;
  };

  return (
    <div className="page active">
      <Topbar
        title="Dashboard"
        subtitle="Monitor unificado de seguridad y costos cloud"
        onRefresh={handleRefresh}
        alertCount={alertCount}
      />

      {/* Offline Banner */}
      {isOffline && (
        <div className={`flex items-center justify-between gap-3 px-4 py-2.5 mb-4 rounded-lg border ${isPaused ? 'bg-red-500/8 border-red-500/25' : 'bg-orange-500/8 border-orange-500/25'}`}>
          <div className="flex items-center gap-2">
            <span className={`inline-block w-2 h-2 rounded-full ${isPaused ? 'bg-red-500' : 'bg-orange-500 animate-pulse'}`} />
            <span className={`text-xs font-medium ${isPaused ? 'text-red-500' : 'text-orange-500'}`}>
              {isPaused
                ? 'Sin conexión — Polling pausado después de 5 reintentos'
                : `Sin conexión — Reintento ${retryCount}/${MAX_RETRIES} en ${formatInterval(currentInterval)}`
              }
            </span>
          </div>
          <button className="btn btn-ghost btn-xs text-xs" onClick={handleRetry}>
            <RefreshIcon size={10} /> Reintentar ahora
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="stats-grid">
        <StatCard icon={<CloudIcon size={14} />} label="Cuentas Activas" color="blue" value={cuentas.length} sub={`${aws} AWS · ${az} Azure`} />
        <StatCard icon={<ChartIcon size={14} />} label="Costo del Mes" color="green" value={fmtMoney(d.costo_total_30d)} sub="Mes actual" />
        <StatCard icon={<ShieldIcon size={14} />} label="Eventos (24h)" color="orange" value={d.eventos_24h || 0} sub="Todas las cuentas" />
        <StatCard icon={<AlertIcon size={14} />} label="Alertas Críticas (7d)" color="red" value={alertCount} sub="CRÍTICO + ALTO" />
        <StatCard icon={<RefreshIcon size={14} />} label="Última Evaluación" color="purple" value={lastEval ? fmtRel(lastEval) : 'Nunca'} sub={lastEval ? fmtDate(lastEval) : 'Eventos de seguridad'} />
      </div>

      {/* Severity Bar */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-header">
          <div className="card-title"><ShieldIcon size={14} /> Severidad de Eventos (24h)</div>
          <div className="live-indicator" style={{ marginLeft: 'auto' }}>
            <span className={`live-dot ${isOffline ? 'bg-orange-500' : ''}`} />
            {isOffline ? 'Reconectando...' : `Auto-actualización cada ${isPaused ? '—' : formatInterval(currentInterval)}`}
          </div>
        </div>
        <div className="card-body">
          <SeverityBar data={sev} />
          <SeverityLegend data={sev} />
        </div>
      </div>

      {/* Timeline Chart */}
      <EventTimelineChart />

      {/* Error Accounts */}
      {(d.cuentas_error || []).length > 0 && (
        <div className="alert-box" style={{ marginBottom: 12 }}>
          <AlertIcon size={14} /> {(d.cuentas_error || []).map(e => (
            <span key={e.id}>{e.nombre} ({e.proveedor}) — Error de conexión<br/></span>
          ))}
        </div>
      )}

      {/* Bottom Grid: Health + Feed */}
      <div className="grid-left">
        <div>
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="card-header"><div className="card-title">Mapa de Salud</div></div>
            <div className="card-body"><HealthGrid cuentas={cuentas} /></div>
          </div>
        </div>
        <div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card-header">
              <div className="card-title">Feed de Seguridad en Vivo</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <div className="last-eval">
                  <span className="dot" />
                  <span>Última eval: <span className="time">{lastEval ? fmtDate(lastEval) : '—'}</span></span>
                </div>
                <a href="javascript:void(0)" onClick={e => { e.preventDefault(); onNavigate && onNavigate('seguridad'); }} className="btn btn-ghost btn-xs">Ver todos →</a>
              </div>
            </div>
            <EventFeed events={eventos} />
          </div>
        </div>
      </div>
    </div>
  );
}
