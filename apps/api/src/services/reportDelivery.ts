import { prisma } from "../index";
import nodemailer from "nodemailer";
import { generateReportData, generateReportHTML } from "./report";

function formatChannelConfig(config: any) {
  if (typeof config === "string") {
    try { return JSON.parse(config); } catch { return {}; }
  }
  return config || {};
}

async function sendEmail(config: any, subject: string, html: string, pdfBuffer?: Buffer): Promise<boolean> {
  try {
    const cfg = formatChannelConfig(config);
    const transporter = nodemailer.createTransport({
      host: cfg.host || "smtp.gmail.com",
      port: cfg.port || 587,
      secure: cfg.secure || cfg.port === 465,
      auth: cfg.auth ? { user: cfg.user || "", pass: cfg.pass || "" } : undefined,
    });

    const recipients = (cfg.to || "").split(",").map((r: string) => r.trim()).filter(Boolean);
    if (recipients.length === 0) {
      console.error("[ReportDelivery] No recipients configured for SMTP channel");
      return false;
    }

    const attachments = pdfBuffer ? [{
      filename: `treda-informe-${new Date().toISOString().slice(0, 10)}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    }] : [];

    await transporter.sendMail({
      from: cfg.from || cfg.user || "noreply@dashboard-treda.local",
      to: recipients.join(", "),
      subject,
      html,
      attachments,
    });

    console.log(`[ReportDelivery] Email sent to ${recipients.length} recipient(s)`);
    return true;
  } catch (e: any) {
    console.error("[ReportDelivery] Email failed:", e.message);
    return false;
  }
}

async function sendTelegram(config: any, text: string): Promise<boolean> {
  try {
    const cfg = formatChannelConfig(config);
    if (!cfg.botToken || !cfg.chatId) {
      console.error("[ReportDelivery] Missing botToken or chatId for Telegram channel");
      return false;
    }

    const resp = await fetch(`https://api.telegram.org/bot${cfg.botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: cfg.chatId,
        text,
        parse_mode: "Markdown",
      }),
    });

    const data = await resp.json() as any;
    if (data.ok) {
      console.log("[ReportDelivery] Telegram message sent");
      return true;
    } else {
      console.error("[ReportDelivery] Telegram error:", data.description);
      return false;
    }
  } catch (e: any) {
    console.error("[ReportDelivery] Telegram failed:", e.message);
    return false;
  }
}

function buildEmailHtml(data: any, type: string): string {
  const s = data.summary || {};
  const periodType = type === 'DAILY' ? 'Diario' : 'Semanal';
  const dateStr = new Date(data.generatedAt).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', year: 'numeric', month: 'long', day: 'numeric' });

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0e17;font-family:'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#0d1117;border:1px solid #21262d;border-radius:12px;overflow:hidden;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0a0e17,#0d1520);padding:30px;text-align:center;border-bottom:1px solid #21262d;">
      <div style="font-size:36px;font-weight:900;letter-spacing:6px;background:linear-gradient(135deg,#00e5ff,#5b78ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-family:'Courier New',monospace;">TREDA</div>
      <div style="font-size:11px;color:#8899aa;letter-spacing:4px;text-transform:uppercase;margin-top:4px;">Treda Solutions — Security & Cost Dashboard</div>
    </div>

    <!-- Report Title -->
    <div style="padding:20px 30px;text-align:center;border-bottom:1px solid #21262d;">
      <div style="font-size:20px;font-weight:700;color:#e0e6ed;">INFORME ${periodType.toUpperCase()}</div>
      <div style="font-size:12px;color:#556677;margin-top:4px;">${dateStr} — Generado automáticamente</div>
    </div>

    <!-- KPI Cards -->
    <div style="padding:20px 30px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:8px;text-align:center;background:#0a0e17;border:1px solid #00e5ff22;border-left:3px solid #00e5ff;border-radius:6px;">
            <div style="font-size:10px;color:#8899aa;text-transform:uppercase;">CUENTAS</div>
            <div style="font-size:24px;font-weight:800;color:#00e5ff;">${s.accounts || 0}</div>
            <div style="font-size:10px;color:#556677;">${s.accountsHealthy || 0} saludables</div>
          </td>
          <td style="width:12px;"></td>
          <td style="padding:8px;text-align:center;background:#0a0e17;border:1px solid #5b78ff22;border-left:3px solid #5b78ff;border-radius:6px;">
            <div style="font-size:10px;color:#8899aa;text-transform:uppercase;">EVENTOS</div>
            <div style="font-size:24px;font-weight:800;color:#5b78ff;">${s.events || 0}</div>
            <div style="font-size:10px;color:#556677;">${s.critical || 0} críticos</div>
          </td>
          <td style="width:12px;"></td>
          <td style="padding:8px;text-align:center;background:#0a0e17;border:1px solid #ffd70022;border-left:3px solid #ffd700;border-radius:6px;">
            <div style="font-size:10px;color:#8899aa;text-transform:uppercase;">COSTOS</div>
            <div style="font-size:24px;font-weight:800;color:#ffd700;">$${(s.totalCost || 0).toFixed(2)}</div>
            <div style="font-size:10px;color:#556677;">este período</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Severity -->
    <div style="padding:0 30px 20px;">
      <div style="font-size:11px;color:#8899aa;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Eventos por Severidad</div>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:6px 12px;background:#ef444415;border:1px solid #ef444430;border-radius:4px;text-align:center;color:#ef4444;font-weight:700;font-size:12px;">CRITICAL: ${s.critical || 0}</td>
          <td style="width:8px;"></td>
          <td style="padding:6px 12px;background:#f59e0b15;border:1px solid #f59e0b30;border-radius:4px;text-align:center;color:#f59e0b;font-weight:700;font-size:12px;">HIGH: ${s.high || 0}</td>
          <td style="width:8px;"></td>
          <td style="padding:6px 12px;background:#3b82f615;border:1px solid #3b82f630;border-radius:4px;text-align:center;color:#3b82f6;font-weight:700;font-size:12px;">MEDIUM: ${s.medium || 0}</td>
          <td style="width:8px;"></td>
          <td style="padding:6px 12px;background:#10b98115;border:1px solid #10b98130;border-radius:4px;text-align:center;color:#10b981;font-weight:700;font-size:12px;">LOW: ${s.low || 0}</td>
        </tr>
      </table>
    </div>

    <!-- Footer -->
    <div style="padding:16px 30px;text-align:center;border-top:1px solid #21262d;font-size:10px;color:#334455;">
      CONFIDENCIAL — Generado automáticamente por Dashboard Treda v2.0<br>
      ${dateStr} — America/Bogota (COT)
    </div>
  </div>
</body>
</html>`;
}

function buildTelegramMessage(data: any, type: string): string {
  const s = data.summary || {};
  const periodType = type === 'DAILY' ? 'Diario' : 'Semanal';
  const dateStr = new Date(data.generatedAt).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });

  let msg = `🔒 *TREDA — Informe ${periodType}*\n`;
  msg += `_${dateStr}_\n\n`;
  msg += `📊 *Resumen:*\n`;
  msg += `• Cuentas: ${s.accounts || 0} (${s.accountsHealthy || 0} saludables, ${s.accountsCritical || 0} críticas)\n`;
  msg += `• Eventos: ${s.events || 0} (${s.critical || 0} críticos, ${s.high || 0} altos)\n`;
  msg += `• Costos: $${(s.totalCost || 0).toFixed(2)}\n`;
  msg += `• Alertas: ${s.alertsActive || 0} activas\n`;

  if (s.critical > 0) {
    msg += `\n⚠️ *ATENCIÓN:* ${s.critical} evento(s) crítico(s) requiere(n) investigación.\n`;
  }

  if (s.accountsCritical > 0) {
    msg += `🔴 *CRÍTICO:* ${s.accountsCritical} cuenta(s) en estado crítico.\n`;
  }

  return msg;
}

export async function getReportDeliveryConfig() {
  let config = await prisma.reportDelivery.findFirst();
  if (!config) {
    config = await prisma.reportDelivery.create({
      data: { enabled: false, channelIds: [], schedule: "0 8 * * *", includePdf: true, reportType: "DAILY" },
    });
  }
  return config;
}

export async function updateReportDeliveryConfig(data: {
  enabled?: boolean;
  channelIds?: string[];
  schedule?: string;
  includePdf?: boolean;
  reportType?: string;
}) {
  let config = await prisma.reportDelivery.findFirst();
  if (!config) {
    config = await prisma.reportDelivery.create({ data: data as any });
  } else {
    config = await prisma.reportDelivery.update({ where: { id: config.id }, data: data as any });
  }
  return config;
}

export async function sendReportNow(reportId?: string): Promise<{ success: boolean; message: string; details: any[] }> {
  const config = await getReportDeliveryConfig();
  const details: any[] = [];

  if (!config.enabled) {
    return { success: false, message: "El envío de informes está desactivado", details: [] };
  }

  // Get or generate report
  let report;
  if (reportId) {
    report = await prisma.report.findUnique({ where: { id: reportId } });
  }
  if (!report) {
    // Generate a fresh report
    const reportType = (config.reportType || 'DAILY') as 'DAILY' | 'WEEKLY';
    const data = await generateReportData(reportType);
    report = await prisma.report.create({
      data: { type: reportType, status: "completed", data: data as any, generatedAt: new Date() },
    });
  }

  const data = typeof report.data === "string"
    ? (() => { try { return JSON.parse(report.data); } catch { return {}; } })()
    : (report.data || {});

  // Get selected channels
  const channelIds = (config.channelIds as string[]) || [];
  if (channelIds.length === 0) {
    return { success: false, message: "No hay canales de notificación seleccionados", details: [] };
  }

  const channels = await prisma.notificationChannel.findMany({
    where: { id: { in: channelIds }, enabled: true },
  });

  if (channels.length === 0) {
    return { success: false, message: "Los canales seleccionados no están habilitados", details: [] };
  }

  // Generate PDF if needed
  let pdfBuffer: Buffer | undefined;
  if (config.includePdf) {
    try {
      const html = generateReportHTML(data as any, report.type as 'DAILY' | 'WEEKLY');
      const puppeteer = require("puppeteer");
      const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });
      await new Promise(r => setTimeout(r, 2000));
      pdfBuffer = await page.pdf({
        format: "A4", printBackground: true,
        margin: { top: "10mm", bottom: "15mm", left: "10mm", right: "10mm" },
      });
      await browser.close();
      console.log("[ReportDelivery] PDF generated:", pdfBuffer.length, "bytes");
    } catch (e: any) {
      console.error("[ReportDelivery] PDF generation failed:", e.message);
    }
  }

  // Send to each channel
  const periodType = report.type === 'DAILY' ? 'Diario' : 'Semanal';
  const dateStr = new Date(report.generatedAt).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' });
  const subject = `🔒 TREDA — Informe ${periodType} — ${dateStr}`;

  for (const channel of channels) {
    try {
      let sent = false;
      if (channel.type === "SMTP") {
        const emailHtml = buildEmailHtml(data, report.type);
        sent = await sendEmail(channel.config, subject, emailHtml, pdfBuffer);
      } else if (channel.type === "TELEGRAM") {
        const tgMsg = buildTelegramMessage(data, report.type);
        sent = await sendTelegram(channel.config, tgMsg);
      }
      details.push({ channel: channel.name, type: channel.type, sent });
    } catch (e: any) {
      details.push({ channel: channel.name, type: channel.type, sent: false, error: e.message });
    }
  }

  // Update lastSentAt
  await prisma.reportDelivery.update({
    where: { id: config.id },
    data: { lastSentAt: new Date() },
  });

  const sentCount = details.filter(d => d.sent).length;
  return {
    success: sentCount > 0,
    message: `Informe enviado a ${sentCount}/${channels.length} canal(es)`,
    details,
  };
}

export async function checkAndSendScheduledReports(): Promise<void> {
  try {
    const config = await getReportDeliveryConfig();
    if (!config.enabled) return;

    // Check if already sent today
    const now = new Date();
    if (config.lastSentAt) {
      const lastSent = new Date(config.lastSentAt);
      const sameDay = lastSent.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
      if (sameDay) return; // Already sent today
    }

    // Simple cron check: if schedule contains hour, check if current hour matches
    // For "0 8 * * *" → send at 8:00 AM
    const parts = (config.schedule || "0 8 * * *").split(" ");
    const cronHour = parseInt(parts[1] || "8");
    const currentHour = parseInt(now.toLocaleTimeString('en-US', { hour: '2-digit', hour12: false, timeZone: 'America/Bogota' }));

    if (currentHour === cronHour) {
      console.log(`[ReportDelivery] Scheduled report time reached (${config.schedule})`);
      const result = await sendReportNow();
      console.log(`[ReportDelivery] Scheduled send result:`, result.message);
    }
  } catch (e: any) {
    console.error("[ReportDelivery] Scheduled check failed:", e.message);
  }
}
