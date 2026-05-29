import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../index";
import { collectAllAccounts } from "../services/collector";
import { requireRole } from "../middleware/auth";
import { validateBody, validateParams } from "../middleware/validate";

const createSchema = z.object({
  name: z.string().min(1),
  provider: z.enum(["AWS", "AZURE", "M365", "Azure", "azure"]),
  credentials: z.record(z.unknown()),
  region: z.string().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  credentials: z.record(z.unknown()).optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
  health: z.enum(["healthy", "warning", "critical"]).optional(),
  region: z.string().optional(),
});

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export default async function accountRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get("/", { preHandler: requireRole("admin", "viewer") }, async () => {
    const accounts = await prisma.account.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Add last activity timestamp from events
    const lastEvents: any[] = await prisma.$queryRawUnsafe(
      "SELECT DISTINCT ON (account_id) account_id, created_at FROM events ORDER BY account_id, created_at DESC"
    );
    const lastEventMap: Record<string, Date> = {};
    for (const row of lastEvents || []) {
      lastEventMap[row.account_id] = row.created_at;
    }

    const result = accounts.map((acc) => ({
      ...acc,
      lastActivity: lastEventMap[acc.id] || null,
    }));

    return { accounts: result };
  });

  fastify.get("/:id", { preHandler: [requireRole("admin", "viewer"), validateParams(paramsSchema)] }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof paramsSchema>;
    const account = await prisma.account.findUnique({ where: { id } });
    if (!account) return reply.status(404).send({ error: "Account not found" });
    return { account };
  });

  fastify.post("/", { preHandler: [requireRole("admin"), validateBody(createSchema)] }, async (request, reply) => {
    const body = request.body as z.infer<typeof createSchema>;
    const account = await prisma.account.create({
      data: {
        ...body,
        credentials: JSON.stringify(body.credentials),
      },
    });
    return reply.status(201).send({ account });
  });

  fastify.patch("/:id", { preHandler: [requireRole("admin"), validateParams(paramsSchema), validateBody(updateSchema)] }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof paramsSchema>;
    const body = request.body as z.infer<typeof updateSchema>;
    const data: Record<string, unknown> = { ...body };
    if (body.credentials) {
      data.credentials = JSON.stringify(body.credentials);
    }
    const account = await prisma.account.update({ where: { id }, data });
    return { account };
  });

  fastify.delete("/:id", { preHandler: [requireRole("admin"), validateParams(paramsSchema)] }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof paramsSchema>;
    await prisma.account.delete({ where: { id } });
    return reply.status(204).send();
  });
}
