import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../index";
import { requireRole } from "../middleware/auth";
import { validateQuery } from "../middleware/validate";

const querySchema = z.object({
    accountId: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    accountId: z.string().optional(),
  accountId: z.string().uuid().optional(),
  provider: z.enum(["AWS", "AZURE", "M365"]).optional(),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional(),
  type: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.string().default("1"),
  limit: z.string().default("20"),
});

export default async function eventRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get("/", { preHandler: [requireRole("admin", "viewer"), validateQuery(querySchema)] }, async (request) => {
    const q = request.query as z.infer<typeof querySchema>;
    const page = Number(q.page);
    const limit = Math.min(Number(q.limit), 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (q.accountId) where.accountId = q.accountId;
    if (q.provider) where.provider = q.provider;
    if (q.severity) where.severity = q.severity;
    if (q.type) where.type = q.type;
    if (q.from || q.to) {
      where.createdAt = {};
      if (q.from) (where.createdAt as Record<string, unknown>).gte = new Date(q.from);
      if (q.to) (where.createdAt as Record<string, unknown>).lte = new Date(q.to);
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { account: { select: { name: true, provider: true } } },
      }),
      prisma.event.count({ where }),
    ]);

    // Summary stats
    const [critical, high, medium, low] = await Promise.all([
      prisma.event.count({ where: { ...where, severity: "CRITICAL" } }),
      prisma.event.count({ where: { ...where, severity: "HIGH" } }),
      prisma.event.count({ where: { ...where, severity: "MEDIUM" } }),
      prisma.event.count({ where: { ...where, severity: "LOW" } }),
    ]);

    return {
      data: events,
      summary: { critical, high, medium, low, total },
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  });
}
