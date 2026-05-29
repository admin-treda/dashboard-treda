// Utilidades de formateo para Colombia (UTC-5)
const TZ = 'America/Bogota';

export function toColombia(date) {
  if (!date) return null;
  return new Date(new Date(date).toLocaleString('en-US', { timeZone: TZ }));
}

export function fmtDate(date) {
  if (!date) return '—';
  const d = toColombia(date);
  return d.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short', hour12: true });
}

export function fmtDateShort(date) {
  if (!date) return '—';
  const d = toColombia(date);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' }) + ' ' +
    d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function fmtRel(date) {
  if (!date) return '—';
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 0) return 'ahora';
  if (s < 60) return `hace ${s}s`;
  if (s < 3600) return `hace ${Math.floor(s / 60)}m`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export function fmtMoney(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
}

export function sevCls(s) {
  return { CRITICO: 'critico', ALTO: 'alto', MEDIO: 'medio', BAJO: 'bajo', INFORMATIVO: 'informativo' }[s] || 'informativo';
}

export function sevColor(s) {
  return { CRITICO: '#dc2626', ALTO: '#f97316', MEDIO: '#eab308', BAJO: '#22c55e', INFORMATIVO: '#6b7280' }[s] || '#6b7280';
}

export const SEVERITIES = ['CRITICO', 'ALTO', 'MEDIO', 'BAJO', 'INFORMATIVO'];
