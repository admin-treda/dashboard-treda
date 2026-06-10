import { prisma } from "../index";

export interface ReportData {
  period: { start: string; end: string; label: string };
  summary: {
    accounts: number;
    accountsHealthy: number;
    accountsWarning: number;
    accountsCritical: number;
    events: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    totalCost: number;
    alertsActive: number;
  };
  byProvider: Record<string, { events: number; cost: number; accounts: number }>;
  byAccount: Record<string, number>;
  accountHealth: { name: string; provider: string; health: string }[];
  services: Record<string, number>;
  eventTimeline: Record<string, number>;
  costTimeline: Record<string, number>;
  topEventTypes: { type: string; count: number }[];
  topEvents: { severity: string; description: string; provider: string; createdAt: string }[];
  notificationsSent: number;
  generatedAt: string;
}

export async function generateReportData(type: 'DAILY' | 'WEEKLY' = 'DAILY'): Promise<ReportData> {
  const now = new Date();
  const periodStart = type === 'DAILY'
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const periodEnd = now;

  const periodLabel = type === 'DAILY'
    ? `${periodStart.toLocaleDateString('es-CO')} — ${periodEnd.toLocaleDateString('es-CO')}`
    : `Semana: ${periodStart.toLocaleDateString('es-CO')} — ${periodEnd.toLocaleDateString('es-CO')}`;

  // ─── PARALLEL QUERIES ────────────────────────────────────────
  const [
    accounts, accountsHealthy, accountsWarning, accountsCritical,
    eventsTotal, critical, high, medium, low,
    costsRaw, costAlerts,
    recentEvents, eventsByProvider, eventsByType,
    notificationsCount,
  ] = await Promise.all([
    prisma.account.count(),
    prisma.account.count({ where: { health: "healthy" } }),
    prisma.account.count({ where: { health: "warning" } }),
    prisma.account.count({ where: { health: "critical" } }),
    prisma.event.count(),
    prisma.event.count({ where: { severity: "CRITICAL" } }),
    prisma.event.count({ where: { severity: "HIGH" } }),
    prisma.event.count({ where: { severity: "MEDIUM" } }),
    prisma.event.count({ where: { severity: "LOW" } }),
    prisma.$queryRawUnsafe(`
      SELECT c.amount, a.name as account_name, a.provider, c.service
      FROM costs c JOIN accounts a ON a.id = c.account_id
      WHERE c.period = '${now.toISOString().slice(0, 7)}'
    `).catch(() => []),
    prisma.costAlert.count({ where: { notified: false } }),
    prisma.event.findMany({
      where: { createdAt: { gte: new Date(now.getTime() - (type === 'DAILY' ? 7 : 30) * 24 * 60 * 60 * 1000) } },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { severity: true, description: true, provider: true, type: true, createdAt: true },
    }),
    prisma.event.groupBy({ by: ["provider"], _count: { id: true }, where: { createdAt: { gte: periodStart } } }),
    prisma.event.groupBy({ by: ["type"], _count: { id: true }, where: { createdAt: { gte: periodStart } }, orderBy: { _count: { id: "desc" } }, take: 10 }),
    prisma.auditLog.count({ where: { action: { contains: "notification" }, createdAt: { gte: periodStart } } }).catch(() => 0),
  ]);

  // ─── PROCESS COSTS ───────────────────────────────────────────
  const services: Record<string, number> = {};
  const byProvider: Record<string, { events: number; cost: number; accounts: number }> = {};
  const byAccount: Record<string, number> = {};
  let totalCost = 0;

  for (const row of (costsRaw || []) as any[]) {
    const amt = parseFloat(String(row.amount || "0"));
    if (amt > 0) {
      totalCost += amt;
      services[row.service] = (services[row.service] || 0) + amt;
      byAccount[row.account_name] = (byAccount[row.account_name] || 0) + amt;
      const prov = row.provider || "UNKNOWN";
      if (!byProvider[prov]) byProvider[prov] = { events: 0, cost: 0, accounts: 0 };
      byProvider[prov].cost += amt;
    }
  }

  for (const ep of eventsByProvider) {
    const prov = ep.provider;
    if (!byProvider[prov]) byProvider[prov] = { events: 0, cost: 0, accounts: 0 };
    byProvider[prov].events = ep._count.id;
  }

  const accountsByProvider = await prisma.account.groupBy({ by: ["provider"], _count: { id: true } });
  for (const abp of accountsByProvider) {
    const prov = abp.provider;
    if (!byProvider[prov]) byProvider[prov] = { events: 0, cost: 0, accounts: 0 };
    byProvider[prov].accounts = abp._count.id;
  }

  // ─── ACCOUNT HEALTH ──────────────────────────────────────────
  const allAccounts = await prisma.account.findMany({ select: { name: true, provider: true, health: true } });
  const accountHealth = allAccounts.map(a => ({ name: a.name, provider: a.provider, health: a.health }));

  // ─── EVENT TIMELINE ──────────────────────────────────────────
  const eventTimeline: Record<string, number> = {};
  const days = type === 'DAILY' ? 7 : 30;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    eventTimeline[d.toISOString().slice(0, 10)] = 0;
  }
  for (const evt of recentEvents) {
    const day = new Date(evt.createdAt).toISOString().slice(0, 10);
    if (eventTimeline[day] !== undefined) eventTimeline[day]++;
  }

  const costTimeline: Record<string, number> = {};
  for (let i = days - 1; i >= 0; i--) {
    costTimeline[new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)] = 0;
  }

  const topEventTypes = eventsByType.map(e => ({ type: e.type, count: e._count.id }));
  const topEvents = recentEvents.slice(0, 15).map(e => ({
    severity: e.severity,
    description: (e.description || "").slice(0, 120),
    provider: e.provider,
    createdAt: new Date(e.createdAt).toLocaleString('es-CO', { timeZone: 'America/Bogota' }),
  }));

  const alertsActive = costAlerts + recentEvents.filter(e => e.severity === 'CRITICAL').length;

  return {
    period: { start: periodStart.toISOString(), end: periodEnd.toISOString(), label: periodLabel },
    summary: { accounts, accountsHealthy, accountsWarning, accountsCritical, events: eventsTotal, critical, high, medium, low, totalCost: Math.round(totalCost * 100) / 100, alertsActive },
    byProvider, byAccount, accountHealth, services, eventTimeline, costTimeline, topEventTypes, topEvents,
    notificationsSent: notificationsCount,
    generatedAt: now.toISOString(),
  };
}

// ─── PDF HTML GENERATION ────────────────────────────────────────
export function generateReportHTML(data: ReportData, type: 'DAILY' | 'WEEKLY'): string {
  const s = data.summary;
  const periodType = type === 'DAILY' ? 'INFORME DIARIO' : 'INFORME SEMANAL';
  const dateStr = new Date(data.generatedAt).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', year: 'numeric', month: 'long', day: 'numeric' });

  const sevColor: Record<string, string> = { CRITICAL: '#ef4444', HIGH: '#f59e0b', MEDIUM: '#3b82f6', LOW: '#10b981' };
  const healthColor: Record<string, string> = { healthy: '#10b981', warning: '#f59e0b', critical: '#ef4444' };
  const provColor: Record<string, string> = { AWS: '#ff9900', AZURE: '#0078d4', M365: '#d83b01' };

  const barChart = (items: { label: string; value: number; color: string }[], maxVal: number) =>
    items.map(item => {
      const pct = maxVal > 0 ? (item.value / maxVal * 100) : 0;
      return `<div style="display:flex;align-items:center;margin:4px 0;font-size:11px;"><div style="width:100px;text-align:right;padding-right:10px;color:#8899aa;font-family:monospace;">${item.label}</div><div style="flex:1;background:#1a1f2e;border-radius:3px;height:18px;overflow:hidden;"><div style="height:100%;width:${Math.max(pct, 1)}%;background:${item.color};border-radius:3px;"></div></div><div style="width:60px;text-align:right;padding-left:10px;color:#e0e6ed;font-weight:600;">${item.value}</div></div>`;
    }).join('');

  const timelineChart = (timeline: Record<string, number>, color: string) => {
    const entries = Object.entries(timeline);
    const maxVal = Math.max(...entries.map(([, v]) => v), 1);
    return `<div style="display:flex;align-items:flex-end;gap:2px;height:100px;padding:10px 0;">${entries.map(([day, cnt]) => {
      const h = Math.max((cnt / maxVal) * 80, 2);
      return `<div style="display:flex;flex-direction:column;align-items:center;flex:1;"><div style="font-size:9px;color:#8899aa;margin-bottom:2px;">${cnt}</div><div style="width:40px;height:${h}px;background:${color};border-radius:2px 2px 0 0;"></div><div style="font-size:8px;color:#556677;margin-top:2px;transform:rotate(-45deg);">${day.slice(5)}</div></div>`;
    }).join('')}</div>`;
  };

  const kpiCard = (label: string, value: string | number, subtitle: string, color: string) =>
    `<div style="background:#0d1117;border:1px solid ${color}22;border-left:3px solid ${color};border-radius:8px;padding:16px;text-align:center;"><div style="font-size:11px;color:#8899aa;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">${label}</div><div style="font-size:28px;font-weight:800;color:${color};font-family:'Courier New',monospace;">${value}</div><div style="font-size:10px;color:#556677;margin-top:4px;">${subtitle}</div></div>`;

  const dataTable = (headers: string[], rows: string[][]) =>
    `<table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr style="background:#161b22;">${headers.map(h => `<th style="padding:8px 12px;text-align:left;color:#8899aa;font-weight:600;text-transform:uppercase;font-size:10px;letter-spacing:0.5px;border-bottom:1px solid #21262d;">${h}</th>`).join('')}</tr></thead><tbody>${rows.map((row, i) => `<tr style="background:${i % 2 === 0 ? '#0d1117' : '#161b22'};border-bottom:1px solid #21262d;">${row.map(cell => `<td style="padding:8px 12px;color:#e0e6ed;">${cell}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

  const sevBadge = (sev: string) => {
    const c = sevColor[sev] || '#6b7280';
    return `<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;background:${c}15;color:${c};border:1px solid ${c}40;">${sev}</span>`;
  };

  const provRows = Object.entries(data.byProvider).map(([prov, info]) => [
    `<span style="color:${provColor[prov] || '#888'};font-weight:600;">${prov}</span>`,
    String(info.accounts), String(info.events), `$${info.cost.toFixed(2)}`,
  ]);

  const serviceRows = Object.entries(data.services).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([svc, amt]) => {
    const pct = s.totalCost > 0 ? (amt / s.totalCost * 100).toFixed(1) : '0.0';
    return [svc.length > 50 ? svc.slice(0, 47) + '...' : svc, `$${amt.toFixed(2)}`, `${pct}%`,
      `<div style="width:80px;height:6px;background:#1a1f2e;border-radius:3px;"><div style="height:100%;width:${pct}%;background:#5b78ff;border-radius:3px;"></div></div>`];
  });

  const healthRows = data.accountHealth.map(a => [a.name, `<span style="color:${provColor[a.provider] || '#888'};">${a.provider}</span>`,
    `<span style="color:${healthColor[a.health] || '#888'};font-weight:600;">${a.health.toUpperCase()}</span>`]);

  const eventRows = data.topEvents.slice(0, 10).map(e => [
    sevBadge(e.severity), `<span style="color:${provColor[e.provider] || '#888'};">${e.provider}</span>`,
    (e.description.length > 80 ? e.description.slice(0, 77) + '...' : e.description),
    `<span style="color:#556677;font-size:10px;">${e.createdAt}</span>`]);

  const eventTypeMax = Math.max(...data.topEventTypes.map(t => t.count), 1);
  const eventTypeBars = barChart(data.topEventTypes.map(t => ({ label: t.type.length > 25 ? t.type.slice(0, 22) + '...' : t.type, value: t.count, color: '#5b78ff' })), eventTypeMax);
  const provMax = Math.max(...Object.values(data.byProvider).map(p => p.events), 1);
  const provBars = barChart(Object.entries(data.byProvider).map(([prov, info]) => ({ label: prov, value: info.events, color: provColor[prov] || '#6b7280' })), provMax);
  const costMax = Math.max(...Object.values(data.byProvider).map(p => p.cost), 1);
  const costBars = barChart(Object.entries(data.byProvider).map(([prov, info]) => ({ label: prov, value: info.cost, color: provColor[prov] || '#6b7280' })), costMax);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, sans-serif; background: #0a0e17; color: #e0e6ed; line-height: 1.5; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { page-break-after: always; padding: 0; min-height: 100vh; }
    .page:last-child { page-break-after: auto; }
    .cover { height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; background: linear-gradient(135deg, #0a0e17 0%, #0d1520 50%, #0f1923 100%); position: relative; }
    .cover::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: radial-gradient(circle at 20% 30%, rgba(0,229,255,0.05) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(91,120,255,0.05) 0%, transparent 50%); }
    .cover-content { position: relative; z-index: 1; text-align: center; }
    .cover-logo { font-size: 64px; font-weight: 900; letter-spacing: 8px; background: linear-gradient(135deg, #00e5ff, #5b78ff, #00e5ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 20px; font-family: 'Courier New', monospace; }
    .cover-title { font-size: 18px; color: #8899aa; letter-spacing: 6px; text-transform: uppercase; margin-bottom: 8px; }
    .cover-type { font-size: 32px; font-weight: 700; color: #e0e6ed; margin-bottom: 30px; }
    .cover-meta { font-size: 12px; color: #556677; font-family: 'Courier New', monospace; line-height: 2; }
    .cover-line { width: 120px; height: 2px; background: linear-gradient(90deg, transparent, #00e5ff, transparent); margin: 30px auto; }
    .cover-footer { position: absolute; bottom: 40px; left: 0; right: 0; text-align: center; font-size: 10px; color: #334455; font-family: monospace; }
    .section { padding: 30px 40px; }
    .section-title { font-size: 16px; font-weight: 700; color: #00e5ff; text-transform: uppercase; letter-spacing: 2px; padding-bottom: 8px; border-bottom: 1px solid #00e5ff22; margin-bottom: 20px; font-family: monospace; }
    .section-subtitle { font-size: 12px; color: #556677; margin-bottom: 16px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .chart-container { background: #0d1117; border: 1px solid #21262d; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
    .chart-title { font-size: 12px; font-weight: 600; color: #8899aa; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .page-footer { text-align: center; padding: 20px; font-size: 10px; color: #334455; font-family: monospace; border-top: 1px solid #21262d; }
    .rec-item { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-bottom: 1px solid #21262d; }
    .rec-icon { width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; margin-top: 2px; }
    .rec-text { font-size: 12px; color: #c0c8d4; line-height: 1.6; }
    .rec-label { font-weight: 600; color: #e0e6ed; }
    @media print { body { background: #0a0e17; } }
  </style>
</head>
<body>
  <div class="page cover">
    <div class="cover-content">
      <div class="cover-logo">TREDA</div>
      <div class="cover-title">Treda Solutions — Security & Cost Dashboard</div>
      <div class="cover-line"></div>
      <div class="cover-type">${periodType}</div>
      <div class="cover-meta">${data.period.label}<br>Generado: ${dateStr}<br>Zona horaria: America/Bogota (COT)</div>
    </div>
    <div class="cover-footer">CONFIDENCIAL — Solo para uso interno de Treda Solutions<br>Generado automáticamente por Dashboard Treda v2.0</div>
  </div>

  <div class="page section">
    <div class="section-title">// RESUMEN EJECUTIVO</div>
    <div class="section-subtitle">Indicadores clave de seguridad y costos del período</div>
    <div class="kpi-grid">
      ${kpiCard('Cuentas', s.accounts, `${s.accountsHealthy} saludables · ${s.accountsCritical} críticas`, '#00e5ff')}
      ${kpiCard('Eventos', s.events, `${s.critical} críticos · ${s.high} altos`, '#5b78ff')}
      ${kpiCard('Costos', `$${s.totalCost.toFixed(2)}`, `Este período`, '#ffd700')}
      ${kpiCard('Alertas', s.alertsActive, `Activas`, '#ff6b6b')}
    </div>
    <div class="kpi-grid">
      ${kpiCard('Cuenta Críticas', s.accountsCritical, `Requieren atención`, '#ef4444')}
      ${kpiCard('Notificaciones', data.notificationsSent, `Enviadas`, '#8b5cf6')}
      ${kpiCard('Costo/Día', `$${(s.totalCost / Math.max(1, type === 'DAILY' ? 1 : 7)).toFixed(2)}`, `Promedio`, '#06b6d4')}
    </div>
    <div class="two-col">
      <div class="chart-container"><div class="chart-title">Eventos por Severidad</div>${barChart([
        { label: 'CRITICAL', value: s.critical, color: '#ef4444' },
        { label: 'HIGH', value: s.high, color: '#f59e0b' },
        { label: 'MEDIUM', value: s.medium, color: '#3b82f6' },
        { label: 'LOW', value: s.low, color: '#10b981' },
      ], Math.max(s.critical, s.high, s.medium, s.low, 1))}</div>
      <div class="chart-container"><div class="chart-title">Salud de Cuentas</div>${barChart([
        { label: 'SALUDABLES', value: s.accountsHealthy, color: '#10b981' },
        { label: 'ADVERTENCIA', value: s.accountsWarning, color: '#f59e0b' },
        { label: 'CRÍTICAS', value: s.accountsCritical, color: '#ef4444' },
      ], Math.max(s.accountsHealthy, s.accountsWarning, s.accountsCritical, 1))}</div>
    </div>
    <div class="page-footer">Dashboard Treda — Informe ${periodType} — ${data.period.label} — Página 2</div>
  </div>

  <div class="page section">
    <div class="section-title">// ANÁLISIS DE EVENTOS</div>
    <div class="section-subtitle">Distribución y tendencia de eventos de seguridad</div>
    <div class="two-col">
      <div class="chart-container"><div class="chart-title">Eventos por Proveedor</div>${provBars}</div>
      <div class="chart-container"><div class="chart-title">Tipos de Evento Más Frecuentes</div>${eventTypeBars}</div>
    </div>
    <div class="chart-container"><div class="chart-title">Línea de Tiempo — Eventos (Últimos ${type === 'DAILY' ? 7 : 30} días)</div>${timelineChart(data.eventTimeline, '#5b78ff')}</div>
    ${eventRows.length > 0 ? `<div class="chart-container"><div class="chart-title">Últimos Eventos de Seguridad</div>${dataTable(['Severidad', 'Proveedor', 'Descripción', 'Fecha'], eventRows)}</div>` : ''}
    <div class="page-footer">Dashboard Treda — Informe ${periodType} — ${data.period.label} — Página 3</div>
  </div>

  <div class="page section">
    <div class="section-title">// ANÁLISIS DE COSTOS</div>
    <div class="section-subtitle">Desglose de costos por proveedor, cuenta y servicio</div>
    <div class="two-col">
      <div class="chart-container"><div class="chart-title">Costos por Proveedor</div>${costBars}</div>
      <div class="chart-container"><div class="chart-title">Distribución por Proveedor</div>${dataTable(['Proveedor', 'Cuentas', 'Eventos', 'Costo'], provRows)}</div>
    </div>
    ${serviceRows.length > 0 ? `<div class="chart-container"><div class="chart-title">Top Servicios por Costo</div>${dataTable(['Servicio', 'Costo', 'Porcentaje', ''], serviceRows)}</div>` : ''}
    <div class="page-footer">Dashboard Treda — Informe ${periodType} — ${data.period.label} — Página 4</div>
  </div>

  <div class="page section">
    <div class="section-title">// CUENTAS MONITOREADAS</div>
    <div class="section-subtitle">Estado de salud de las cuentas cloud</div>
    ${healthRows.length > 0 ? `<div class="chart-container"><div class="chart-title">Estado de Cuentas</div>${dataTable(['Cuenta', 'Proveedor', 'Salud'], healthRows)}</div>` : ''}
    <div class="page-footer">Dashboard Treda — Informe ${periodType} — ${data.period.label} — Página 5</div>
  </div>

  <div class="page section">
    <div class="section-title">// RECOMENDACIONES</div>
    <div class="section-subtitle">Acciones sugeridas basadas en el análisis del período</div>
    <div class="chart-container">
      ${s.accountsCritical > 0 ? `<div class="rec-item"><div class="rec-icon" style="background:#ef444420;color:#ef4444;">!</div><div><div class="rec-label" style="color:#ef4444;">CRÍTICO: ${s.accountsCritical} cuenta(s) en estado crítico</div><div class="rec-text">Revisar inmediatamente las cuentas marcadas como críticas. Verificar credenciales, estado de servicios y posibles compromisos.</div></div></div>` : ''}
      ${s.critical > 0 ? `<div class="rec-item"><div class="rec-icon" style="background:#ef444420;color:#ef4444;">!</div><div><div class="rec-label" style="color:#ef4444;">${s.critical} evento(s) crítico(s) detectado(s)</div><div class="rec-text">Investigar los eventos de severidad CRITICAL. Revisar logs de CloudTrail/Activity Log y correlacionar con intentos de acceso no autorizado.</div></div></div>` : ''}
      ${s.totalCost > 500 ? `<div class="rec-item"><div class="rec-icon" style="background:#ffd70020;color:#ffd700;">$</div><div><div class="rec-label" style="color:#ffd700;">Costos elevados: $${s.totalCost.toFixed(2)} este período</div><div class="rec-text">Revisar servicios con mayor consumo. Considerar Reserved Instances, Savings Plans o right-sizing para optimizar costos.</div></div></div>` : ''}
      ${s.accountsWarning > 0 ? `<div class="rec-item"><div class="rec-icon" style="background:#f59e0b20;color:#f59e0b;">⚠</div><div><div class="rec-label" style="color:#f59e0b;">${s.accountsWarning} cuenta(s) con advertencias</div><div class="rec-text">Monitorear de cerca las cuentas en estado de advertencia. Pueden escalar a estado crítico si no se atienden.</div></div></div>` : ''}
      <div class="rec-item"><div class="rec-icon" style="background:#00e5ff20;color:#00e5ff;">✓</div><div><div class="rec-label" style="color:#00e5ff;">Mantenimiento preventivo</div><div class="rec-text">Continuar con el monitoreo continuo. Verificar que todos los canales de notificación estén configurados correctamente.</div></div></div>
    </div>
    <div class="page-footer">Dashboard Treda — Informe ${periodType} — ${data.period.label} — Página 6<br><span style="color:#334455;">CONFIDENCIAL — Generado automáticamente — ${dateStr}</span></div>
  </div>
</body>
</html>`;
}

export async function generateAndSendReport(type: 'DAILY' | 'WEEKLY'): Promise<void> {
  try {
    const data = await generateReportData(type);
    const report = await prisma.report.create({
      data: { type, status: 'completed', data: data as any, generatedAt: new Date() },
    });
    console.log(`[Auto-Report] ${type} report ${report.id.slice(0, 8)} created`);
  } catch (e: any) {
    console.error('[Auto-Report] Failed:', e.message);
  }
}
