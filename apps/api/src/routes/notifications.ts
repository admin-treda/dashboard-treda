import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../index";
import { requireRole } from "../middleware/auth";
import { validateBody, validateParams } from "../middleware/validate";
import nodemailer from "nodemailer";

const createSchema = z.object({
  type: z.enum(["SMTP", "TELEGRAM"]),
  name: z.string().min(1),
  config: z.record(z.unknown()),
  enabled: z.boolean().default(true),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  config: z.record(z.unknown()).optional(),
  enabled: z.boolean().optional(),
});

const paramsSchema = z.object({
  id: z.string().uuid(),
});

function formatChannelConfig(config: any) {
  if (typeof config === "string") {
    try { return JSON.parse(config); } catch { return {}; }
  }
  return config || {};
}

async function sendTestSmtp(config: any): Promise<boolean> {
  try {
    const cfg = formatChannelConfig(config);
    const transporter = nodemailer.createTransport({
      host: cfg.host || "smtp.gmail.com",
      port: cfg.port || 587,
      secure: cfg.secure || cfg.port === 465,
      auth: cfg.auth ? { user: cfg.user || "", pass: cfg.pass || "" } : undefined,
      tls: { rejectUnauthorized: false },
    });

    const recipients = (cfg.to || "").split(",").map((r: string) => r.trim()).filter(Boolean);
    if (recipients.length === 0) throw new Error("No recipients configured");

    await transporter.sendMail({
      from: cfg.from || cfg.user || "noreply@hermes-allen.local",
      to: recipients.join(", "),
      subject: "🔒 Hermes Allen - Prueba de notificación",
      text: "Esta es una prueba de configuración SMTP.\nSi recibiste este correo, la configuración es correcta.\n\nHermes Allen - Dashboard Multi-Cloud",
      html: `<div style="font-family:sans-serif;max-width:500px;margin:auto;padding:20px;border:1px solid #e2e8f0;border-radius:8px">
        <h2 style="color:#21286C">🔒 Hermes Allen</h2>
        <p style="color:#475569">Prueba de configuración SMTP exitosa.</p>
        <p style="color:#94a3b8;font-size:12px">Dashboard Multi-Cloud</p>
      </div>`,
    });

    return true;
  } catch (e: any) {
    console.error("SMTP test failed:", e.message);
    return false;
  }
}

async function sendTestTelegram(config: any): Promise<boolean> {
  try {
    const cfg = formatChannelConfig(config);
    if (!cfg.botToken || !cfg.chatId) throw new Error("Missing botToken or chatId");

    const resp = await fetch(`https://api.telegram.org/bot${cfg.botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: cfg.chatId,
        text: "🔒 *Hermes Allen - Prueba de notificación*\n\nSi recibiste este mensaje, la configuración de Telegram es correcta.\n\n_Hermes Allen - Dashboard Multi-Cloud_",
        parse_mode: "Markdown",
      }),
    });

    const data = await resp.json();
    return data.ok === true;
  } catch (e: any) {
    console.error("Telegram test failed:", e.message);
    return false;
  }
}

export default async function notificationRoutes(fastify: FastifyInstance): Promise<void> {
  // GET / - list all channels
  fastify.get("/", { preHandler: requireRole("admin", "viewer") }, async () => {
    const channels = await prisma.notificationChannel.findMany({ orderBy: { createdAt: "desc" } });
    return { channels };
  });

  // GET /:id - get one channel
  fastify.get("/:id", { preHandler: [requireRole("admin", "viewer"), validateParams(paramsSchema)] }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof paramsSchema>;
    const channel = await prisma.notificationChannel.findUnique({ where: { id } });
    if (!channel) return reply.status(404).send({ error: "Channel not found" });
    return { channel };
  });

  // GET /:id/test - test connection (must be before /:id to avoid match issues)
  fastify.get("/:id/test", { preHandler: [requireRole("admin"), validateParams(paramsSchema)] }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof paramsSchema>;
    const channel = await prisma.notificationChannel.findUnique({ where: { id } });
    if (!channel) return reply.status(404).send({ error: "Channel not found" });

    let success = false;
    if (channel.type === "SMTP") {
      success = await sendTestSmtp(channel.config);
    } else if (channel.type === "TELEGRAM") {
      success = await sendTestTelegram(channel.config);
    }

    if (success) {
      return { success: true, message: `Notificación de prueba enviada a ${channel.name}` };
    } else {
      return reply.status(500).send({ error: "Error al enviar notificación de prueba. Verifica la configuración." });
    }
  });

  // POST / - create
  fastify.post("/", { preHandler: [requireRole("admin"), validateBody(createSchema)] }, async (request, reply) => {
    const body = request.body as z.infer<typeof createSchema>;
    const channel = await prisma.notificationChannel.create({
      data: {
        type: body.type,
        name: body.name,
        config: JSON.stringify(body.config),
        enabled: body.enabled,
      },
    });
    return reply.status(201).send({ channel });
  });

  // PATCH /:id - update
  fastify.patch("/:id", { preHandler: [requireRole("admin"), validateParams(paramsSchema), validateBody(updateSchema)] }, async (request) => {
    const { id } = request.params as z.infer<typeof paramsSchema>;
    const body = request.body as z.infer<typeof updateSchema>;
    const data: Record<string, unknown> = { ...body };
    if (body.config) data.config = JSON.stringify(body.config);
    const channel = await prisma.notificationChannel.update({ where: { id }, data });
    return { channel };
  });

  // DELETE /:id - delete
  fastify.delete("/:id", { preHandler: [requireRole("admin"), validateParams(paramsSchema)] }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof paramsSchema>;
    await prisma.notificationChannel.delete({ where: { id } });
    return reply.status(204).send();
  });
}
