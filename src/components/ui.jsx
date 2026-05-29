import { fmtDate, fmtRel, fmtMoney, sevCls, sevColor, SEVERITIES } from '@/utils/format';

// ── Badge de Severidad (TechSoluciones brand) ──
export function SeverityBadge({ severity }) {
  const cls = sevCls(severity);
  const badgeMap = {
    critico: 'badge-red',
    alto: 'badge-orange',
    medio: 'badge-orange',
    bajo: 'badge-green',
    informativo: 'badge-gray',
  };
  return (
    <span className={`badge ${badgeMap[cls] || 'badge-gray'}`}>
      {severity}
    </span>
  );
}

// ── Badge de Proveedor (TechSoluciones brand) ──
export function ProviderBadge({ provider }) {
  const isAws = provider === 'aws';
  return (
    <span className={`badge ${isAws ? 'badge-orange' : 'badge-blue'}`}>
      {isAws ? 'AWS' : 'AZURE'}
    </span>
  );
}

// ── Indicador de estado ──
export function StatusIndicator({ status }) {
  const isConnected = status === 'conectado';
  const isError = status === 'error';
  return (
    <span className="status-indicator">
      {isConnected && (
        <span className="absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-50 animate-ping" />
      )}
      <span className={`status-indicator-dot ${isConnected ? 'connected' : isError ? 'error' : 'pending'}`} />
    </span>
  );
}

export function StatusDot({ status }) {
  return <StatusIndicator status={status} />;
}

// ── Card de Estadística (AWS CloudWatch style) ──
export function StatCard({ label, value, sub, color = 'blue', icon, trend, trendValue }) {
  const colorMap = {
    blue: 'var(--accent-cyan)', green: 'var(--accent-green)', orange: 'var(--accent-orange)',
    red: 'var(--accent-red)', purple: 'var(--accent-purple)',
  };
  const lineColor = {
    blue: 'var(--accent-cyan)', green: 'var(--accent-green)', orange: 'var(--accent-orange)',
    red: 'var(--accent-red)', purple: 'var(--accent-purple)',
  };
  return (
    <div className="card p-4 relative overflow-hidden" style={{borderRadius: 12}}>
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{background: lineColor[color]}} />
      <div className="flex items-start justify-between">
        <div className="text-[9px] font-semibold uppercase tracking-wider text-text-muted mb-1" style={{fontFamily: 'Montserrat, sans-serif'}}>{label}</div>
        {icon && <div style={{color: colorMap[color], opacity: 0.6}}>{icon}</div>}
      </div>
      <div className="text-3xl font-bold tracking-tight leading-none" style={{color: colorMap[color], fontFamily: 'Montserrat, sans-serif'}}>{value ?? '—'}</div>
      {sub && <div className="text-[9px] text-text-muted mt-1">{sub}</div>}
      {trend && trendValue && (
        <div className="flex items-center gap-1 mt-2 text-[9px] font-medium" style={{color: trend === 'up' ? 'var(--accent-green)' : trend === 'down' ? 'var(--accent-red)' : 'var(--text-muted)'}}>
          {trend === 'up' && '▲'} {trend === 'down' && '▼'} {trendValue}
        </div>
      )}
    </div>
  );
}

// ── Barra de Severidad (horizontal) ──
export function SeverityBar({ data }) {
  const map = {};
  (data || []).forEach(d => { map[d.severity] = d.total; });
  const total = SEVERITIES.reduce((s, k) => s + (map[k] || 0), 0);
  const colorMap = { critico: 'bg-red-500', alto: 'bg-orange-500', medio: 'bg-yellow-500', bajo: 'bg-green-500', info: 'bg-gray-500' };

  return (
    <div className="flex h-1.5 rounded-sm overflow-hidden gap-px my-2">
      {SEVERITIES.map(s => (
        <div
          key={s}
          className={`rounded-sm transition-all duration-300 ${colorMap[sevCls(s)]}`}
          style={{ width: total > 0 ? `${((map[s] || 0) / total) * 100}%` : '0%' }}
          title={`${s}: ${map[s] || 0}`}
        />
      ))}
    </div>
  );
}

// ── Leyenda de Severidad ──
export function SeverityLegend({ data }) {
  const map = {};
  (data || []).forEach(d => { map[d.severity] = d.total; });

  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
      {SEVERITIES.map(s => (
        <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, color: '#6b7280' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: sevColor(s) }} />
          {s}: {map[s] || 0}
        </span>
      ))}
    </div>
  );
}

// ── Tabla de Severidad (resumen) ──
export function SeveritySummary({ data }) {
  const map = {};
  (data || []).forEach(d => { map[d.severity] = d.total; });

  return (
    <div className="grid grid-cols-5 gap-1.5 mb-4">
      {SEVERITIES.map(s => (
        <div key={s} className={`text-center py-2.5 px-1 rounded-md bg-bg-3 border border-border ${s === 'CRITICO' ? 'border-red-500/30 bg-red-500/5' : s === 'ALTO' ? 'border-orange-500/30 bg-orange-500/5' : ''}`}>
          <div className={`text-xl font-bold leading-none ${s === 'CRITICO' ? 'text-red-500' : s === 'ALTO' ? 'text-orange-500' : s === 'MEDIO' ? 'text-yellow-500' : s === 'BAJO' ? 'text-green-500' : 'text-gray-500'}`}>
            {map[s] || 0}
          </div>
          <div className="text-[8px] font-semibold uppercase tracking-wider text-text-3 mt-1">{s}</div>
        </div>
      ))}
    </div>
  );
}

// ── Mapa de Salud (grid de cuentas con Resource Groups) ──
export function HealthGrid({ cuentas }) {
  if (!cuentas?.length) {
    return <EmptyState icon={<CloudIcon size={32} />} message="No hay cuentas configuradas" />;
  }
  const aws = cuentas.filter(c => c.proveedor === 'aws');
  const azure = cuentas.filter(c => c.proveedor !== 'aws');

  const renderCard = (c) => (
    <div key={c.id} className="flex items-center gap-2 py-2 px-2.5 bg-bg-elevated border border-border rounded-md hover:bg-bg-hover transition-colors">
      <StatusIndicator status={c.estado_conexion} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-text-primary whitespace-nowrap overflow-hidden text-ellipsis">{c.nombre}</div>
        <div className="text-[9px] text-text-muted"><ProviderBadge provider={c.proveedor} /> · {c.estado_conexion || 'pendiente'}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {aws.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Recursos AWS ({aws.length})</span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2">
            {aws.map(renderCard)}
          </div>
        </div>
      )}
      {azure.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Recursos Azure ({azure.length})</span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2">
            {azure.map(renderCard)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Feed de Eventos ──
export function EventFeed({ events }) {
  if (!events?.length) {
    return <EmptyState icon={<ShieldIcon size={32} />} message="No hay eventos recientes" />;
  }
  return (
    <div className="max-h-[380px] overflow-y-auto">
      {events.map(e => (
        <div key={e.id} className="flex gap-2 py-2.5 px-3 border-b border-border hover:bg-bg-elevated transition-colors duration-75">
          <div className={`w-[3px] rounded-sm shrink-0 self-stretch ${sevCls(e.severidad) === 'critico' ? 'bg-red-500' : sevCls(e.severidad) === 'alto' ? 'bg-orange-500' : sevCls(e.severidad) === 'medio' ? 'bg-yellow-500' : sevCls(e.severidad) === 'bajo' ? 'bg-green-500' : 'bg-gray-500'}`} />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-text-primary mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis" title={e.tipo_evento}>{e.tipo_evento}</div>
            <div className="flex items-center gap-1.5 text-[9px] text-text-muted flex-wrap">
              <SeverityBadge severity={e.severidad} />
              <ProviderBadge provider={e.proveedor} />
              {e.cuenta_nombre && <span>{e.cuenta_nombre}</span>}
              <span>{e.usuario || 'N/A'}</span>
            </div>
          </div>
          <div className="text-[9px] text-text-muted whitespace-nowrap shrink-0 pt-0.5">{fmtRel(e.fecha_evento)}</div>
        </div>
      ))}
    </div>
  );
}

// ── Tabla de Eventos (con filtros) ──
export function EventTable({ events, loading }) {
  if (loading) return <div style={{ textAlign: 'center', padding: 30, color: '#3d4454' }}>Cargando...</div>;
  if (!events?.length) return <div style={{ textAlign: 'center', padding: 30, color: '#3d4454' }}>No se encontraron eventos</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {['Severidad', 'Fecha y Hora', 'Proveedor', 'Cuenta', 'Evento', 'Usuario', 'Recurso'].map(h => (
              <th key={h} className="text-left py-2 px-3 text-[8px] font-semibold uppercase tracking-wider text-text-3 border-b border-border bg-bg-1 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {events.map(e => (
            <tr key={e.id} className="hover:bg-bg-3">
              <td className="py-2 px-3 text-xs border-b border-border text-text-1 align-middle"><SeverityBadge severity={e.severidad} /></td>
              <td className="py-2 px-3 text-xs border-b border-border text-text-1 align-middle whitespace-nowrap" style={{ fontSize: 10, color: '#6b7280' }}>{fmtDate(e.fecha_evento)}</td>
              <td className="py-2 px-3 text-xs border-b border-border text-text-1 align-middle"><ProviderBadge provider={e.proveedor} /></td>
              <td className="py-2 px-3 text-xs border-b border-border text-text-1 align-middle" style={{ fontSize: 10 }}>{e.cuenta_nombre || '—'}</td>
              <td className="py-2 px-3 text-xs border-b border-border text-text-1 align-middle max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap" title={e.tipo_evento}>{e.tipo_evento}</td>
              <td className="py-2 px-3 text-xs border-b border-border text-text-1 align-middle" style={{ fontSize: 10, color: '#6b7280' }}>{e.usuario || '—'}</td>
              <td className="py-2 px-3 text-xs border-b border-border text-text-1 align-middle max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap" style={{ fontSize: 10, color: '#3d4454' }} title={e.recurso || ''}>{e.recurso || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Fila de Costo (con barra) ──
export function CostRow({ service, amount, max }) {
  const pct = max > 0 ? Math.round((amount / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-border text-xs">
      <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis text-text-secondary" title={service}>{service}</span>
      <div className="w-24 h-1.5 bg-bg-elevated rounded-full overflow-hidden shrink-0">
        <div className="h-full rounded-full bg-accent-blue transition-all duration-300" style={{ width: `${Math.max(3, pct)}%` }} />
      </div>
      <span className="text-text-muted w-8 text-right shrink-0">{pct}%</span>
      <span className="font-semibold text-text-primary w-[60px] text-right shrink-0">{fmtMoney(amount)}</span>
    </div>
  );
}

// ── Card de Cuenta Cloud (Azure Resource Manager style) ──
export function AccountCard({ cuenta, onSync, onTest, onEdit, onDelete }) {
  return (
    <div className="bg-bg-elevated border border-border rounded-lg p-3 mb-2 hover:border-border-light transition-colors">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <StatusIndicator status={cuenta.estado_conexion} />
          <div>
            <span className="text-sm font-semibold text-text-primary">{cuenta.nombre}</span>
            <div className="text-[9px] text-text-muted"><ProviderBadge provider={cuenta.proveedor} /></div>
          </div>
        </div>
        <div className="flex gap-1">
          {onTest && <button className="btn btn-ghost btn-xs" title="Probar conexión" onClick={() => onTest(cuenta.id)}>🔌</button>}
          {onEdit && <button className="btn btn-ghost btn-xs" title="Editar" onClick={() => onEdit(cuenta)}>✏️</button>}
          {onDelete && <button className="btn btn-danger btn-xs" title="Eliminar" onClick={() => onDelete(cuenta.id)}>🗑️</button>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
        <div className="flex justify-between"><span className="text-text-muted">Región</span><span className="text-text-secondary">{cuenta.region || '—'}</span></div>
        <div className="flex justify-between"><span className="text-text-muted">Estado</span><span className="text-text-secondary">{cuenta.estado_conexion || 'pendiente'}</span></div>
        <div className="flex justify-between col-span-2"><span className="text-text-muted">Últ. sync</span><span className="text-text-secondary">{fmtDate(cuenta.ultima_sincronizacion)}</span></div>
      </div>
    </div>
  );
}

// ── Alert Box ──
export function AlertBox({ type = 'error', children }) {
  return <div className={`bg-red-500/8 border border-red-500/25 rounded-md py-2 px-3 mb-2.5 text-xs text-red-500 ${type === 'warn' ? 'bg-orange-500/8 border-orange-500/25 text-orange-500' : ''}`}>{children}</div>;
}

// ── Loading Spinner ──
export function Spinner() {
  return <div className="inline-block w-2.5 h-2.5 border-2 border-border border-t-blue-500 rounded-full animate-spin" />;
}

// ── Skeleton Block ──
export function SkeletonBlock({ className = '', style = {} }) {
  return (
    <div
      className={`bg-bg-3 rounded animate-pulse ${className}`}
      style={{ animationDuration: '1.5s', ...style }}
    />
  );
}

// ── Section-specific loading skeletons ──
function DashboardSkeleton() {
  return (
    <div className="animate-[fadeIn_0.3s_ease-out]">
      {/* Stats row */}
      <div className="grid grid-cols-5 gap-3 mb-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-bg-2 border border-border rounded-lg p-4">
            <SkeletonBlock className="h-3 w-16 mb-2" />
            <SkeletonBlock className="h-7 w-20 mb-1" />
            <SkeletonBlock className="h-2 w-12" />
          </div>
        ))}
      </div>
      {/* Severity bar */}
      <div className="bg-bg-2 border border-border rounded-lg mb-4">
        <div className="p-3 border-b border-border"><SkeletonBlock className="h-3 w-32" /></div>
        <div className="p-4">
          <SkeletonBlock className="h-2 w-full mb-3" />
          <div className="flex gap-3">
            {[...Array(5)].map((_, i) => <SkeletonBlock key={i} className="h-2 w-12" />)}
          </div>
        </div>
      </div>
      {/* Timeline chart */}
      <div className="bg-bg-2 border border-border rounded-lg mb-4">
        <div className="p-3 border-b border-border"><SkeletonBlock className="h-3 w-48" /></div>
        <div className="p-4"><SkeletonBlock className="h-64 w-full" /></div>
      </div>
      {/* Bottom grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 bg-bg-2 border border-border rounded-lg">
          <div className="p-3 border-b border-border"><SkeletonBlock className="h-3 w-40" /></div>
          <div className="p-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex gap-2 py-2 border-b border-border">
                <SkeletonBlock className="h-3 w-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-bg-2 border border-border rounded-lg">
          <div className="p-3 border-b border-border"><SkeletonBlock className="h-3 w-24" /></div>
          <div className="p-4 grid grid-cols-2 gap-2">
            {[...Array(6)].map((_, i) => <SkeletonBlock key={i} className="h-10 w-full" />)}
          </div>
        </div>
      </div>
    </div>
  );
}

function CostosSkeleton() {
  return (
    <div className="animate-[fadeIn_0.3s_ease-out]">
      {/* Tabs */}
      <div className="flex gap-1 mb-4 px-3 border-b border-border">
        {[...Array(3)].map((_, i) => <SkeletonBlock key={i} className="h-8 w-24 mx-1" />)}
      </div>
      {/* Account cards */}
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-bg-2 border border-border rounded-lg mb-3">
          <div className="p-3 border-b border-border flex justify-between">
            <SkeletonBlock className="h-4 w-32" />
            <SkeletonBlock className="h-5 w-24" />
          </div>
          <div className="p-4">
            <SkeletonBlock className="h-8 w-28 mb-3" />
            {[...Array(5)].map((_, j) => (
              <div key={j} className="flex items-center gap-2 py-1.5 border-b border-border">
                <SkeletonBlock className="h-3 flex-1" />
                <SkeletonBlock className="h-1.5 w-20" />
                <SkeletonBlock className="h-3 w-14" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SeguridadSkeleton() {
  return (
    <div className="animate-[fadeIn_0.3s_ease-out]">
      {/* Summary cards */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-bg-2 border border-border rounded-lg p-4 text-center">
            <SkeletonBlock className="h-8 w-10 mx-auto mb-1" />
            <SkeletonBlock className="h-2 w-8 mx-auto" />
          </div>
        ))}
      </div>
      {/* Total bar */}
      <div className="bg-bg-2 border border-border rounded-lg p-3 mb-4 flex justify-between items-center">
        <SkeletonBlock className="h-4 w-32" />
        <SkeletonBlock className="h-8 w-12" />
      </div>
      {/* Filters + Summary */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-bg-2 border border-border rounded-lg">
          <div className="p-3 border-b border-border"><SkeletonBlock className="h-3 w-16" /></div>
          <div className="p-4">
            <div className="flex gap-2 mb-2">
              {[...Array(3)].map((_, i) => <SkeletonBlock key={i} className="h-7 flex-1" />)}
            </div>
          </div>
        </div>
        <div className="bg-bg-2 border border-border rounded-lg">
          <div className="p-3 border-b border-border"><SkeletonBlock className="h-3 w-16" /></div>
          <div className="p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex justify-between py-1.5 border-b border-border">
                <SkeletonBlock className="h-3 w-16" />
                <SkeletonBlock className="h-3 w-8" />
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Table */}
      <div className="bg-bg-2 border border-border rounded-lg">
        <div className="p-3 border-b border-border"><SkeletonBlock className="h-3 w-36" /></div>
        <div className="p-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex gap-2 py-2 border-b border-border">
              <SkeletonBlock className="h-4 w-16" />
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="h-4 w-12" />
              <SkeletonBlock className="h-4 flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CuentasSkeleton() {
  return (
    <div className="animate-[fadeIn_0.3s_ease-out]">
      <div className="grid grid-cols-2 gap-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-bg-2 border border-border rounded-lg">
            <div className="p-3 border-b border-border">
              <SkeletonBlock className="h-3 w-28" />
            </div>
            <div className="p-4">
              {[...Array(2)].map((_, j) => (
                <div key={j} className="bg-bg-3 border border-border rounded-md p-2.5 mb-1.5">
                  <div className="flex justify-between mb-2">
                    <SkeletonBlock className="h-4 w-24" />
                    <div className="flex gap-1">
                      {[...Array(3)].map((_, k) => <SkeletonBlock key={k} className="h-5 w-5" />)}
                    </div>
                  </div>
                  {[...Array(4)].map((_, k) => (
                    <div key={k} className="flex justify-between py-0.5">
                      <SkeletonBlock className="h-3 w-16" />
                      <SkeletonBlock className="h-3 w-20" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InformesSkeleton() {
  return (
    <div className="animate-[fadeIn_0.3s_ease-out]">
      {/* Tabs */}
      <div className="flex gap-1 mb-4 px-3 border-b border-border">
        {[...Array(2)].map((_, i) => <SkeletonBlock key={i} className="h-8 w-28 mx-1" />)}
      </div>
      {/* Header card */}
      <div className="bg-bg-2 border border-border rounded-lg p-4 mb-4">
        <div className="flex justify-between">
          <div>
            <SkeletonBlock className="h-5 w-32 mb-1" />
            <SkeletonBlock className="h-3 w-48" />
          </div>
          <SkeletonBlock className="h-7 w-24" />
        </div>
      </div>
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-bg-2 border border-border rounded-lg p-4 text-center">
            <SkeletonBlock className="h-8 w-12 mx-auto mb-1" />
            <SkeletonBlock className="h-2 w-16 mx-auto" />
          </div>
        ))}
      </div>
      {/* Content sections */}
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-bg-2 border border-border rounded-lg mb-4">
          <div className="p-3 border-b border-border"><SkeletonBlock className="h-3 w-40" /></div>
          <div className="p-4">
            {[...Array(5)].map((_, j) => (
              <div key={j} className="flex justify-between py-1.5 border-b border-border">
                <SkeletonBlock className="h-3 flex-1 mr-4" />
                <SkeletonBlock className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const SECTION_SKELETONS = {
  dashboard: DashboardSkeleton,
  costos: CostosSkeleton,
  seguridad: SeguridadSkeleton,
  cuentas: CuentasSkeleton,
  informes: InformesSkeleton,
};

// ── Section Spinner with contextual loading ──
export function SectionSpinner({ section = 'dashboard' }) {
  const Skeleton = SECTION_SKELETONS[section] || DashboardSkeleton;

  const messages = {
    dashboard: 'Cargando resumen...',
    costos: 'Cargando costos...',
    seguridad: 'Cargando eventos...',
    cuentas: 'Cargando cuentas...',
    informes: 'Cargando informes...',
  };

  return (
    <div>
      {/* Loading message bar */}
      <div className="flex items-center justify-center gap-2 py-2 mb-4 bg-bg-2 border border-border rounded-lg">
        <Spinner />
        <span className="text-xs text-text-2">{messages[section] || messages.dashboard}</span>
      </div>
      {/* Skeleton content */}
      <Skeleton />
    </div>
  );
}


// ── Empty State (mejorado) ──
export function EmptyState({ icon, message, actionLabel, onAction }) {
  return (
    <div className="text-center py-12 px-4">
      {icon && <div className="text-text-muted opacity-40 mb-3 flex justify-center">{icon}</div>}
      <p className="text-xs text-text-muted mb-3">{message}</p>
      {actionLabel && onAction && (
        <button className="btn btn-ghost btn-sm" onClick={onAction}>{actionLabel}</button>
      )}
    </div>
  );
}

// ── Toast Container (mejorado con animación) ──
export function ToastContainer({ toasts, onRemove }) {
  if (!toasts || toasts.length === 0) return null;

  const typeStyles = {
    success: 'bg-green-500/10 border-green-500/30 text-green-400',
    error: 'bg-red-500/10 border-red-500/30 text-red-400',
    warning: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  };

  const typeIcons = {
    success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️',
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-center gap-2 px-3 py-2.5 border rounded-lg shadow-lg backdrop-blur-sm animate-[slideInRight_0.3s_ease-out] ${typeStyles[toast.type] || typeStyles.info}`}
        >
          <span className="text-sm">{typeIcons[toast.type] || typeIcons.info}</span>
          <span className="flex-1 text-xs font-medium">{toast.message}</span>
          <button className="text-xs opacity-60 hover:opacity-100 transition-opacity" onClick={() => onRemove(toast.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}
