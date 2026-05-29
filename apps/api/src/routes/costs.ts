import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../index";
import { requireRole } from "../middleware/auth";

export default async function (fastify: FastifyInstance) {
  fastify.get("/", { preHandler: requireRole("admin", "viewer") }, async (request) => {
    const query = request.query as any;
    const alerts = await prisma.costAlert.findMany({
      orderBy: { createdAt: "desc" },
      include: { account: { select: { name: true, provider: true } } },
    });

    let total = 0;
    let totalByMonth: Record<string, number> = {};
    const byAccount: Record<string, number> = {};
    const byService: Record<string, number> = {};
    const byAccountService: Record<string, Record<string, number>> = {};

    const targetPeriod = query.period || new Date().toISOString().slice(0, 7);

    try {
      const raw: any[] = await prisma.$queryRawUnsafe(
        "SELECT c.service, c.amount, c.period, c.account_id, a.name as account_name, a.provider " +
        "FROM costs c JOIN accounts a ON a.id = c.account_id ORDER BY c.period DESC"
      );

      for (const row of raw) {
        const amt = parseFloat(String(row.amount || "0"));
        if (amt <= 0) continue;

        totalByMonth[row.period] = (totalByMonth[row.period] || 0) + amt;

        if (row.period === targetPeriod) {
          total += amt;
          const acctName = row.account_name || String(row.account_id || "").slice(0, 8);
          byAccount[acctName] = (byAccount[acctName] || 0) + amt;
          byService[row.service] = (byService[row.service] || 0) + amt;

          if (!byAccountService[acctName]) byAccountService[acctName] = {};
          byAccountService[acctName][row.service] = (byAccountService[acctName][row.service] || 0) + amt;
        }
      }
    } catch (e: any) {
      console.error("Costs query error:", e.message);
    }

    return {
      alerts,
      summary: {
        total,
        totalByMonth,
        byAccount,
        byService,
        byAccountService,
        currentPeriod: targetPeriod,
      },
    };
  });
}
