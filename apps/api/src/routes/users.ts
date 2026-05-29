import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../index";
import { requireRole } from "../middleware/auth";
import { validateBody, validateParams } from "../middleware/validate";

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["admin", "viewer"]).default("viewer"),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(["admin", "viewer"]).optional(),
});

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export default async function userRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get("/", { preHandler: requireRole("admin") }, async () => {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    return { users };
  });

  fastify.get("/:id", { preHandler: [requireRole("admin"), validateParams(paramsSchema)] }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof paramsSchema>;
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    if (!user) return reply.status(404).send({ error: "User not found" });
    return { user };
  });

  fastify.post("/", { preHandler: [requireRole("admin"), validateBody(createSchema)] }, async (request, reply) => {
    const body = request.body as z.infer<typeof createSchema>;
    const exists = await prisma.user.findUnique({ where: { email: body.email } });
    if (exists) return reply.status(409).send({ error: "Email already in use" });

    const hash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: { name: body.name, email: body.email, password: hash, role: body.role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    return reply.status(201).send({ user });
  });

  fastify.patch("/:id", { preHandler: [requireRole("admin"), validateParams(paramsSchema), validateBody(updateSchema)] }, async (request) => {
    const { id } = request.params as z.infer<typeof paramsSchema>;
    const body = request.body as z.infer<typeof updateSchema>;
    const data: Record<string, unknown> = { ...body };
    if (body.password) {
      data.password = await bcrypt.hash(body.password, 12);
    }
    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    return { user };
  });

  fastify.delete("/:id", { preHandler: [requireRole("admin"), validateParams(paramsSchema)] }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof paramsSchema>;
    await prisma.user.delete({ where: { id } });
    return reply.status(204).send();
  });
}
