import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../index";
import { requireRole } from "../middleware/auth";
import { validateBody, validateParams, validateQuery } from "../middleware/validate";
import { generateReportData } from "../services/report";

const createSchema = z.object({
  type: z.enum(["DAILY", "WEEKLY"]),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
});

const querySchema = z.object({
  type: z.enum(["DAILY", "WEEKLY"]).optional(),
  status: z.string().optional(),
  page: z.string().default("1"),
  limit: z.string().default("20"),
});

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export default async function reportRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get("/", { preHandler: [requireRole("admin", "viewer"), validateQuery(querySchema)] }, async (request) => {
    const q = request.query as z.infer<typeof querySchema>;
    const page = Number(q.page);
    const limit = Math.min(Number(q.limit), 100);
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (q.type) where.type = q.type;
    if (q.status) where.status = q.status;
    const [reports, total] = await Promise.all([
      prisma.report.findMany({ where, orderBy: { generatedAt: "desc" }, skip, take: limit }),
      prisma.report.count({ where }),
    ]);
    return { data: reports, meta: { page, limit, total, pages: Math.ceil(total / limit) } };
  });

  // Download route must be BEFORE /:id to avoid "download" being matched as an id
  fastify.get("/:id/download", { preHandler: [requireRole("admin", "viewer"), validateParams(paramsSchema)] }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof paramsSchema>;
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) return reply.status(404).send({ error: "Report not found" });

    const data = typeof report.data === "string" ? (() => { try { return JSON.parse(report.data); } catch { return {}; } })() : report.data || {};
    const s = data.summary || {};
    const lines = [
      "╔═══════════════════════════════════════════════════╗",
      "║        HERMES ALLEN - INFORME DE MONITOREO        ║",
      "╚═══════════════════════════════════════════════════╝",
      "",
      `  Tipo:       ${report.type === "DAILY" ? "Diario" : "Semanal"}`,
      `  Generado:   ${new Date(report.generatedAt).toLocaleString("es-CO", { timeZone: "America/Bogota" })}`,
      `  Periodo:    ${data.periodStart || "N/A"} - ${data.periodEnd || "N/A"}`,
      "",
      "═══════════════════════════════════════════════════════",
      "              RESUMEN GENERAL",
      "═══════════════════════════════════════════════════════",
      "",
      `  Cuentas monitoreadas:  ${s.accounts || 0}`,
      `    Saludables:          ${s.accountsHealthy || 0}`,
      `    Advertencia:         ${s.accountsWarning || 0}`,
      `    Críticas:            ${s.accountsCritical || 0}`,
      "",
      `  Eventos de seguridad:  ${s.events || 0}`,
      `    Críticos:            ${s.critical || 0}`,
      `    Altos:               ${s.high || 0}`,
      `    Medios:              ${s.medium || 0}`,
      `    Bajos:               ${s.low || 0}`,
      "",
      `  Costos del período:    $${(s.totalCost || 0).toFixed(2)}`,
      `  Alertas activas:       ${s.alertsActive || 0}`,
      "",
    ];

    // Costs by account
    if (data.byAccount && Object.keys(data.byAccount).length > 0) {
      lines.push("═══════════════════════════════════════════════════════");
      lines.push("              COSTOS POR CUENTA");
      lines.push("═══════════════════════════════════════════════════════");
      lines.push("");
      const sorted = Object.entries(data.byAccount).sort((a: any, b: any) => b[1] - a[1]);
      for (const [acct, amt] of sorted) {
        const pct = s.totalCost > 0 ? ((Number(amt) / s.totalCost) * 100).toFixed(1) : "0.0";
        lines.push(`  ${acct.padEnd(30)} $${Number(amt).toFixed(2).padStart(8)}  ${pct}%`);
      }
      lines.push("");
    }

    // By provider
    if (data.byProvider) {
      lines.push("═══════════════════════════════════════════════════════");
      lines.push("              POR PROVEEDOR");
      lines.push("═══════════════════════════════════════════════════════");
      lines.push("");
      for (const [prov, info] of Object.entries(data.byProvider)) {
        const i = info as any;
        lines.push(`  ${prov.padEnd(8)} Eventos: ${String(i.events || 0).padStart(5)}  Costo: $${(i.cost || 0).toFixed(2)}`);
      }
      lines.push("");
    }

    // Top services
    if (data.services && Object.keys(data.services).length > 0) {
      lines.push("═══════════════════════════════════════════════════════");
      lines.push("              TOP SERVICIOS POR COSTO");
      lines.push("═══════════════════════════════════════════════════════");
      lines.push("");
      const sorted = Object.entries(data.services).sort((a: any, b: any) => b[1] - a[1]).slice(0, 10);
      for (const [svc, amt] of sorted) {
        const pct = s.totalCost > 0 ? ((Number(amt) / s.totalCost) * 100).toFixed(1) : "0.0";
        lines.push(`  ${(svc.length > 45 ? svc.slice(0, 42) + "..." : svc).padEnd(48)} $${Number(amt).toFixed(2).padStart(8)}  ${pct}%`);
      }
      lines.push("");
    }

    // Event timeline
    if (data.eventTimeline && Object.keys(data.eventTimeline).length > 0) {
      lines.push("═══════════════════════════════════════════════════════");
      lines.push("              EVENTOS ÚLTIMOS 7 DÍAS");
      lines.push("═══════════════════════════════════════════════════════");
      lines.push("");
      for (const [day, cnt] of Object.entries(data.eventTimeline)) {
        const bar = "█".repeat(Math.min(Number(cnt), 40));
        lines.push(`  ${day}  ${String(cnt).padStart(4)}  ${bar}`);
      }
      lines.push("");
    }

    // Top events
    if (data.topEvents && data.topEvents.length > 0) {
      lines.push("═══════════════════════════════════════════════════════");
      lines.push("              ÚLTIMOS EVENTOS");
      lines.push("═══════════════════════════════════════════════════════");
      lines.push("");
      for (const evt of data.topEvents.slice(0, 5)) {
        const sev = (evt.severity || "?").padEnd(8);
        const desc = (evt.description || "").slice(0, 60);
        lines.push(`  [${sev}] ${desc}`);
      }
      lines.push("");
    }

    lines.push("═══════════════════════════════════════════════════════");
    lines.push(`  Generado automáticamente por Hermes Allen`);
    lines.push(`  ${new Date().toISOString()}`);
    lines.push("═══════════════════════════════════════════════════════");

    return reply.type("text/plain; charset=utf-8").send(lines.join("\n"));
  });

  fastify.get("/:id", { preHandler: [requireRole("admin", "viewer"), validateParams(paramsSchema)] }, async (request) => {
    const { id } = request.params as z.infer<typeof paramsSchema>;
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) return { error: "Report not found" };
    // data may be stored as JSON object (prisma Json type) or string
    if (typeof report.data === "string") {
      try { report.data = JSON.parse(report.data); } catch {}
    }
    return { report };
  });

  fastify.post("/", { preHandler: [requireRole("admin"), validateBody(createSchema)] }, async (request, reply) => {
    const body = request.body as z.infer<typeof createSchema>;
    console.log('[REPORT] body:', JSON.stringify(body));
    try {
      const data = await generateReportData();
      const report = await prisma.report.create({
        data: {
          type: body.type,
          status: "completed",
          data: data,  // Prisma schema is Json type, pass object directly
          generatedAt: new Date(),
          periodStart: body.periodStart ? new Date(body.periodStart) : undefined,
          periodEnd: body.periodEnd ? new Date(body.periodEnd) : undefined,
        },
      });
      return { report };
    } catch (e: any) {
      console.error('[REPORT ERROR]', e);
      const msg = e?.message || String(e);
      // Include full error for debugging
      if (e?.code === 'P2000' || e?.code === 'P2001' || e?.code === 'P2010') {
        return reply.status(500).send({ error: msg.slice(0, 300) });
      }
      return reply.status(500).send({ error: msg.slice(0, 200) });
    }
  });

  fastify.delete("/:id", { preHandler: [requireRole("admin"), validateParams(paramsSchema)] }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof paramsSchema>;
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) return reply.status(404).send({ error: "Report not found" });
    await prisma.report.delete({ where: { id } });
    return reply.status(204).send();
  });

  // Bulk delete reports
  fastify.post("/bulk-delete", { preHandler: [requireRole("admin")] }, async (request, reply) => {
    const { ids } = request.body as { ids?: string[] };
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return reply.status(400).send({ error: "ids array is required" });
    }
    const result = await prisma.report.deleteMany({ where: { id: { in: ids } } });
    return { deleted: result.count };
  });
}
