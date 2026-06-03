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

// Account lockout: track failed attempts per username
const failedAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function isLocked(username: string): boolean {
  const record = failedAttempts.get(username.toLowerCase());
  if (!record) return false;
  // Only check lockout expiry if lockout is active (lockedUntil > 0)
  if (record.lockedUntil > 0) {
    if (Date.now() > record.lockedUntil) {
      failedAttempts.delete(username.toLowerCase());
      return false;
    }
    return true;
  }
  return false;
}

function recordFailedAttempt(username: string): void {
  const key = username.toLowerCase();
  const record = failedAttempts.get(key);
  if (record) {
    record.count++;
    if (record.count >= MAX_FAILED_ATTEMPTS) {
      record.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    }
  } else {
    failedAttempts.set(key, { count: 1, lockedUntil: 0 });
  }
}

function clearFailedAttempts(username: string): void {
  failedAttempts.delete(username.toLowerCase());
}

export default async function (fastify: FastifyInstance) {
  fastify.post("/login", {
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    preHandler: validateBody(loginSchema),
  }, async (request, reply) => {
    const { username, password } = request.body as z.infer<typeof loginSchema>;

    // Check account lockout
    if (isLocked(username)) {
      return reply.status(423).send({
        error: "Cuenta bloqueada temporalmente. Intente de nuevo en 15 minutos.",
      });
    }

    const user = await prisma.user.findFirst({
      where: { OR: [{ username }, { email: username }] },
    });
    if (!user) {
      recordFailedAttempt(username);
      return reply.status(401).send({ error: "Credenciales inválidas" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      recordFailedAttempt(username);
      return reply.status(401).send({ error: "Credenciales inválidas" });
    }

    // Success — clear failed attempts
    clearFailedAttempts(username);

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
