import type { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../index";
import { validateBody } from "../middleware/validate";

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(6),
});

const requireAuth = async (request: any, reply: any) => {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ error: "No autorizado" });
  }
};

export default async function (fastify: FastifyInstance) {
  fastify.post("/login", { preHandler: validateBody(loginSchema) }, async (request, reply) => {
    const { username, password } = request.body as z.infer<typeof loginSchema>;

    const user = await prisma.user.findFirst({
      where: { OR: [{ username }, { email: username }] },
    });
    if (!user) {
      return reply.status(401).send({ error: "Credenciales inválidas" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return reply.status(401).send({ error: "Credenciales inválidas" });
    }

    const token = fastify.jwt.sign({
      userId: user.id,
      email: user.email,
      role: user.role,
      username: user.username,
    });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    };
  });

  fastify.get("/me", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = (request as any).user;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, username: true, createdAt: true },
    });
    if (!user) return reply.status(404).send({ error: "Usuario no encontrado" });
    return { user };
  });

  fastify.post("/change-password", { preHandler: [requireAuth, validateBody(changePasswordSchema)] }, async (request, reply) => {
    const { currentPassword, newPassword } = request.body as z.infer<typeof changePasswordSchema>;
    const { userId } = (request as any).user;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return reply.status(404).send({ error: "Usuario no encontrado" });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return reply.status(401).send({ error: "Contraseña actual incorrecta" });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

    return { success: true, message: "Contraseña actualizada" };
  });
}
