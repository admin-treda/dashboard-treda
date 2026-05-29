import { prisma } from "../index";

export async function generateReportData() {
  const [events, critical, high, medium, low, accounts, costsRaw] = await Promise.all([
    prisma.event.count(),
    prisma.event.count({ where: { severity: "CRITICAL" } }),
    prisma.event.count({ where: { severity: "HIGH" } }),
    prisma.event.count({ where: { severity: "MEDIUM" } }),
    prisma.event.count({ where: { severity: "LOW" } }),
    prisma.account.count(),
    prisma.$queryRawUnsafe("SELECT c.amount, a.name as n, c.service FROM costs c JOIN accounts a ON a.id = c.account_id WHERE c.period = '" + new Date().toISOString().slice(0, 7) + "'").catch(() => []),
  ]);

  const services: Record<string, number> = {};
  let totalCost = 0;

  for (const row of (costsRaw || []) as any[]) {
    const amt = parseFloat(String(row.amount || "0"));
    if (amt > 0) {
      totalCost += amt;
      services[row.service] = (services[row.service] || 0) + amt;
    }
  }

  return {
    accounts,
    events,
    critical,
    high,
    medium,
    low,
    totalCost: Math.round(totalCost * 100) / 100,
    services,
    generatedAt: new Date().toISOString(),
  };
}


export async function generateAndSendReport(type: 'DAILY' | 'WEEKLY'): Promise<void> {
  try {
    const data = await generateReportData();
    const report = await prisma.report.create({
      data: {
        type,
        status: 'completed',
        data: data,
        generatedAt: new Date(),
      },
    });
    console.log(`[Auto-Report] ${type} report ${report.id.slice(0, 8)} created`);
    
    // Send by email if channels configured
    const channels = await prisma.notificationChannel.findMany({ where: { enabled: true, type: 'SMTP' } });
    const { dispatchReport } = await import('./notifier');
    for (const ch of channels) {
      // Currently notifier only dispatches alerts, but this could be extended
    }
  } catch (e: any) {
    console.error('[Auto-Report] Failed:', e.message);
  }
}
