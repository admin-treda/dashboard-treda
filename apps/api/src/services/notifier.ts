import { prisma } from '../index';
import nodemailer from 'nodemailer';

export async function dispatchNotifications(events: { severity: string; type: string; description: string; accountId: string }[]): Promise<void> {
  const critical = events.filter(e => e.severity === 'CRITICAL');
  const high = events.filter(e => e.severity === 'HIGH');

  if (critical.length === 0 && high.length === 0) return;

  const channels = await prisma.notificationChannel.findMany({ where: { enabled: true } });
  if (channels.length === 0) return;

  const subject = `🔒 ${critical.length} crítico(s) · ${high.length} alto(s) · Hermes Allen`;
  const lines = critical.map(e => `🔴 [CRÍTICO] ${e.description.slice(0, 100)}`);
  const lines2 = high.map(e => `🟡 [ALTO] ${e.description.slice(0, 100)}`);
  const text = `⚠️ Alertas de seguridad detectadas:\n\n${lines.join('\n')}\n${lines2.join('\n')}\n\n-- Hermes Allen`;

  for (const ch of channels) {
    const cfg = typeof ch.config === 'string' ? JSON.parse(ch.config) : (ch.config || {});

    if (ch.type === 'SMTP') {
      try {
        const transporter = nodemailer.createTransport({
          host: cfg.host || 'smtp.gmail.com',
          port: cfg.port || 587,
          secure: cfg.secure || cfg.port === 465,
          auth: cfg.auth ? { user: cfg.user || '', pass: cfg.pass || '' } : undefined,
          tls: { rejectUnauthorized: false },
        });
        const recipients = (cfg.to || '').split(',').map((r: string) => r.trim()).filter(Boolean);
        if (recipients.length > 0) {
          await transporter.sendMail({
            from: cfg.from || cfg.user || 'noreply@hermes-allen.local',
            to: recipients.join(', '),
            subject,
            text,
          });
        }
      } catch { /* silent */ }
    } else if (ch.type === 'TELEGRAM') {
      try {
        await fetch(`https://api.telegram.org/bot${cfg.botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: cfg.chatId, text: subject + '\n\n' + text, parse_mode: 'HTML' }),
        });
      } catch { /* silent */ }
    }
  }
}

export async function dispatchCostAlert(accountName: string, currentCost: number, budget: number): Promise<void> {
  const channels = await prisma.notificationChannel.findMany({ where: { enabled: true } });
  if (channels.length === 0) return;

  const pct = ((currentCost / budget) * 100).toFixed(0);
  const text = `💰 Alerta de costos: ${accountName}\nGasto actual: $${currentCost.toFixed(2)}\nPresupuesto: $${budget.toFixed(2)}\nConsumido: ${pct}%`;

  for (const ch of channels) {
    const cfg = typeof ch.config === 'string' ? JSON.parse(ch.config) : (ch.config || {});

    if (ch.type === 'SMTP') {
      try {
        const transporter = nodemailer.createTransport({
          host: cfg.host || 'smtp.gmail.com',
          port: cfg.port || 587,
          secure: cfg.secure || cfg.port === 465,
          auth: cfg.auth ? { user: cfg.user || '', pass: cfg.pass || '' } : undefined,
        });
        const recipients = (cfg.to || '').split(',').map((r: string) => r.trim()).filter(Boolean);
        if (recipients.length > 0) {
          await transporter.sendMail({
            from: cfg.from || cfg.user || 'noreply@hermes-allen.local',
            to: recipients.join(', '),
            subject: `💰 Alerta de costos · ${accountName} · ${pct}% del presupuesto`,
            text,
          });
        }
      } catch { /* silent */ }
    } else if (ch.type === 'TELEGRAM') {
      try {
        await fetch(`https://api.telegram.org/bot${cfg.botToken}/sendMessage`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: cfg.chatId, text, parse_mode: 'HTML' }),
        });
      } catch { /* silent */ }
    }
  }
}
