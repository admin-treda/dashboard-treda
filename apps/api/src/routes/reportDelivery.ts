import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { getReportDeliveryConfig, updateReportDeliveryConfig, sendReportNow } from "../services/reportDelivery";

const updateSchema = z.object({
  enabled: z.boolean().optional(),
  channelIds: z.array(z.string()).optional(),
  schedule: z.string().optional(),
  includePdf: z.boolean().optional(),
  reportType: z.enum(["DAILY", "WEEKLY"]).optional(),
});

export default async function reportDeliveryRoutes(fastify: FastifyInstance): Promise<void> {
  // GET / - get delivery config
  fastify.get("/", { preHandler: requireRole("admin", "viewer") }, async () => {
    const config = await getReportDeliveryConfig();
    return { config };
  });

  // PUT / - update delivery config
  fastify.put("/", { preHandler: [requireRole("admin"), validateBody(updateSchema)] }, async (request) => {
    const body = request.body as z.infer<typeof updateSchema>;
    const config = await updateReportDeliveryConfig(body);
    return { config };
  });

  // POST /send - send report now (manual trigger)
  fastify.post("/send", { preHandler: [requireRole("admin")] }, async (request, reply) => {
    const body = request.body as { reportId?: string };
    const result = await sendReportNow(body?.reportId);
    if (!result.success) {
      return reply.status(400).send(result);
    }
    return result;
  });
}
