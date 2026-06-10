import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../index";
import { requireRole } from "../middleware/auth";
import { validateBody, validateParams, validateQuery } from "../middleware/validate";
import { generateReportData, generateReportHTML } from "../services/report";

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
  // ─── LIST REPORTS ──────────────────────────────────────────
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

  // ─── PREVIEW (HTML) ───────────────────────────────────────
  fastify.get("/:id/preview", { preHandler: [validateParams(paramsSchema)] }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof paramsSchema>;
    // Support token from query param (for new-tab opening) or Bearer header
    const q = request.query as any;
    const queryToken = q?.token;
    if (queryToken) {
      // Set the token in the Authorization header so jwtVerify can find it
      (request.headers as any).authorization = `Bearer ${queryToken}`;
    }
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) return reply.status(404).send({ error: "Report not found" });

    const data = typeof report.data === "string"
      ? (() => { try { return JSON.parse(report.data); } catch { return {}; } })()
      : (report.data || {});

    const html = generateReportHTML(data as any, report.type as 'DAILY' | 'WEEKLY');
    return reply.type("text/html; charset=utf-8").send(html);
  });

  // ─── DOWNLOAD PDF ─────────────────────────────────────────
  // Download route must be BEFORE /:id to avoid "download" being matched as an id
  fastify.get("/:id/download", { preHandler: [requireRole("admin", "viewer"), validateParams(paramsSchema)] }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof paramsSchema>;
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) return reply.status(404).send({ error: "Report not found" });

    const data = typeof report.data === "string"
      ? (() => { try { return JSON.parse(report.data); } catch { return {}; } })()
      : (report.data || {});

    const html = generateReportHTML(data as any, report.type as 'DAILY' | 'WEEKLY');

    try {
      const puppeteer = require("puppeteer");
      const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });
      await new Promise(r => setTimeout(r, 2000));
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "10mm", bottom: "15mm", left: "10mm", right: "10mm" },
        displayHeaderFooter: true,
        headerTemplate: '<div style="font-size:8px;color:#556677;width:100%;text-align:center;margin-top:5mm;font-family:monospace;">Treda Solutions — Dashboard de Seguridad y Costos</div>',
        footerTemplate: '<div style="font-size:8px;color:#556677;width:100%;text-align:center;margin-bottom:5mm;font-family:monospace;">Página <span class="pageNumber"></span> de <span class="totalPages"></span> — Generado: ' + new Date().toLocaleDateString('es-CO') + '</div>',
      });
      await browser.close();

      const typeName = report.type === "DAILY" ? "diario" : "semanal";
      const dateStr = new Date(report.generatedAt).toISOString().slice(0, 10);
      reply.header("Content-Type", "application/pdf");
      reply.header("Content-Disposition", `attachment; filename="treda-informe-${typeName}-${dateStr}.pdf"`);
      return reply.send(pdf);
    } catch (err: any) {
      console.error("[Report] PDF generation failed:", err.message);
      // Fallback: send HTML
      reply.header("Content-Type", "text/html; charset=utf-8");
      reply.header("Content-Disposition", `attachment; filename="treda-informe-${report.type.toLowerCase()}-${new Date(report.generatedAt).toISOString().slice(0, 10)}.html"`);
      return reply.send(html);
    }
  });

  // ─── GET SINGLE REPORT ────────────────────────────────────
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

  // ─── GENERATE REPORT ──────────────────────────────────────
  fastify.post("/", { preHandler: [requireRole("admin"), validateBody(createSchema)] }, async (request, reply) => {
    const body = request.body as z.infer<typeof createSchema>;
    console.log('[REPORT] Generating:', body.type);
    try {
      const data = await generateReportData(body.type as 'DAILY' | 'WEEKLY');
      const report = await prisma.report.create({
        data: {
          type: body.type,
          status: "completed",
          data: data as any,
          generatedAt: new Date(),
          periodStart: body.periodStart ? new Date(body.periodStart) : undefined,
          periodEnd: body.periodEnd ? new Date(body.periodEnd) : undefined,
        },
      });
      return { report };
    } catch (e: any) {
      console.error('[REPORT ERROR]', e);
      const msg = e?.message || String(e);
      if (e?.code === 'P2000' || e?.code === 'P2001' || e?.code === 'P2010') {
        return reply.status(500).send({ error: msg.slice(0, 300) });
      }
      return reply.status(500).send({ error: msg.slice(0, 200) });
    }
  });

  // ─── DELETE REPORT ────────────────────────────────────────
  fastify.delete("/:id", { preHandler: [requireRole("admin"), validateParams(paramsSchema)] }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof paramsSchema>;
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) return reply.status(404).send({ error: "Report not found" });
    await prisma.report.delete({ where: { id } });
    return reply.status(204).send();
  });

  // ─── BULK DELETE REPORTS ──────────────────────────────────
  fastify.post("/bulk-delete", { preHandler: [requireRole("admin")] }, async (request, reply) => {
    const { ids } = request.body as { ids?: string[] };
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return reply.status(400).send({ error: "ids array is required" });
    }
    const result = await prisma.report.deleteMany({ where: { id: { in: ids } } });
    return { deleted: result.count };
  });
}
