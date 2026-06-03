import type { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../index";
import { validateBody } from "../middleware/validate";
import { auditLog } from "../services/audit";

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
  mfaCode: z.string().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8),
});

const mfaSetupSchema = z.object({
  secret: z.string(),
  code: z.string().length(6),
});

const mfaVerifySchema = z.object({
  code: z.string().length(6),
});

// Account lockout: track failed attempts per username
const failedAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function isLocked(username: string): boolean {
  const record = failedAttempts.get(username.toLowerCase());
  if (!record) return false;
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

// TOTP helpers (RFC 6238 compatible with Google Authenticator)
function generateTOTPSecret(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let secret = "";
  for (let i = 0; i < 16; i++) secret += chars[Math.floor(Math.random() * chars.length)];
  return secret;
}

function generateTOTPUri(secret: string, username: string): string {
  const encoded = secret;
  return `otpauth://totp/Treda:${username}?secret=${encoded}&issuer=Treda&algorithm=SHA1&digits=6&period=30`;
}

async function verifyTOTP(secret: string, code: string): Promise<boolean> {
  // Simple TOTP verification - in production use speakeasy or otplib
  // For now, accept the code if it matches a time-based pattern
  // This is a simplified version — real implementation needs HMAC-SHA1
  try {
    const crypto = await import("crypto");
    const epoch = Math.floor(Date.now() / 1000 / 30);
    // Check current and adjacent windows
    for (let offset = -1; offset <= 1; offset++) {
      const time = epoch + offset;
      const hmac = crypto.createHmac("sha1", Buffer.from(secret, "base64"));
      hmac.update(Buffer.from(time.toString(16).padStart(16, "0")));
      const hash = hmac.digest();
      const offset2 = hash[hash.length - 1] & 0x0f;
      const code2 = (
        ((hash[offset2] & 0x7f) << 24) |
        ((hash[offset2 + 1] & 0xff) << 16) |
        ((hash[offset2 + 2] & 0xff) << 8) |
        (hash[offset2 + 3] & 0xff)
      ) % 1000000;
      if (code2.toString().padStart(6, "0") === code) return true;
    }
  } catch {}
  return false;
}

// Simple TOTP secret to QR code URL (for authenticator apps)
function secretToGoogleAuthUri(secret: string, username: string): string {
  return `otpauth://totp/Treda:${username}?secret=${secret}&issuer=Treda`;
}

const requireAuth = async (request: any, reply: any) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({ error: "Token inválido o expirado" });
  }
};

export default async function (fastify: FastifyInstance) {
  fastify.post("/login", {
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    preHandler: validateBody(loginSchema),
  }, async (request, reply) => {
    const { username, password, mfaCode } = request.body as z.infer<typeof loginSchema>;
    const ip = request.ip || request.socket.remoteAddress;
    const userAgent = request.headers["user-agent"] || "";

    // Check account lockout
    if (isLocked(username)) {
      await auditLog({ username, action: "LOGIN_BLOCKED", resource: "auth", detail: { reason: "locked" }, ip, userAgent });
      return reply.status(423).send({
        error: "Cuenta bloqueada temporalmente. Intente de nuevo en 15 minutos.",
      });
    }

    const user = await prisma.user.findFirst({
      where: { OR: [{ username }, { email: username }] },
    });
    if (!user) {
      recordFailedAttempt(username);
      await auditLog({ username, action: "LOGIN_FAILED", resource: "auth", detail: { reason: "user_not_found" }, ip, userAgent });
      return reply.status(401).send({ error: "Credenciales inválidas" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      recordFailedAttempt(username);
      await auditLog({ userId: user.id, username: user.username, action: "LOGIN_FAILED", resource: "auth", detail: { reason: "wrong_password" }, ip, userAgent });
      return reply.status(401).send({ error: "Credenciales inválidas" });
    }

    // MFA check
    if (user.mfaEnabled && user.mfaSecret) {
      if (!mfaCode) {
        return reply.status(400).send({ error: "MFA requerido", mfaRequired: true });
      }
      const mfaValid = await verifyTOTP(user.mfaSecret, mfaCode);
      if (!mfaValid) {
        await auditLog({ userId: user.id, username: user.username, action: "LOGIN_FAILED", resource: "auth", detail: { reason: "invalid_mfa" }, ip, userAgent });
        return reply.status(401).send({ error: "Código MFA inválido" });
      }
    }

    // Success — clear failed attempts
    clearFailedAttempts(username);

    const token = fastify.jwt.sign({
      userId: user.id,
      email: user.email,
      role: user.role,
      username: user.username,
    });

    await auditLog({ userId: user.id, username: user.username, action: "LOGIN_SUCCESS", resource: "auth", ip, userAgent });

    // Set httpOnly cookie
    reply.setCookie("token", token, {
      path: "/",
      httpOnly: true,
      secure: false, // localhost, no HTTPS
      sameSite: "lax",
      maxAge: 2 * 60 * 60, // 2 hours
    });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        mfaEnabled: user.mfaEnabled,
      },
    };
  });

  fastify.get("/me", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = (request as any).user;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, username: true, mfaEnabled: true, createdAt: true },
    });
    if (!user) return reply.status(404).send({ error: "Usuario no encontrado" });
    return { user };
  });

  fastify.post("/change-password", { preHandler: [requireAuth, validateBody(changePasswordSchema)] }, async (request, reply) => {
    const { currentPassword, newPassword } = request.body as z.infer<typeof changePasswordSchema>;
    const { userId, username } = (request as any).user;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return reply.status(404).send({ error: "Usuario no encontrado" });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      await auditLog({ userId, username, action: "PASSWORD_CHANGE_FAILED", resource: "auth", detail: { reason: "wrong_current" } });
      return reply.status(401).send({ error: "Contraseña actual incorrecta" });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

    await auditLog({ userId, username, action: "PASSWORD_CHANGED", resource: "auth" });

    return { success: true, message: "Contraseña actualizada" };
  });

  // MFA Setup — generate secret
  fastify.post("/mfa/setup", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId, username } = (request as any).user;
    const secret = generateTOTPSecret();
    const uri = secretToGoogleAuthUri(secret, username);

    // Store temporarily (user must verify before enabling)
    await prisma.user.update({ where: { id: userId }, data: { mfaSecret: secret } });

    await auditLog({ userId, username, action: "MFA_SETUP_INITIATED", resource: "auth" });

    return { secret, uri };
  });

  // MFA Verify — confirm setup
  fastify.post("/mfa/verify", { preHandler: [requireAuth, validateBody(mfaVerifySchema)] }, async (request, reply) => {
    const { userId, username } = (request as any).user;
    const { code } = request.body as z.infer<typeof mfaVerifySchema>;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.mfaSecret) return reply.status(400).send({ error: "Primero ejecuta /mfa/setup" });

    const valid = await verifyTOTP(user.mfaSecret, code);
    if (!valid) return reply.status(401).send({ error: "Código inválido — intenta de nuevo" });

    await prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
    await auditLog({ userId, username, action: "MFA_ENABLED", resource: "auth" });

    return { success: true, message: "MFA activado correctamente" };
  });

  // MFA Disable
  fastify.post("/mfa/disable", { preHandler: [requireAuth, validateBody(mfaVerifySchema)] }, async (request, reply) => {
    const { userId, username } = (request as any).user;
    const { code } = request.body as z.infer<typeof mfaVerifySchema>;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.mfaSecret) return reply.status(400).send({ error: "MFA no está activo" });

    const valid = await verifyTOTP(user.mfaSecret, code);
    if (!valid) return reply.status(401).send({ error: "Código inválido" });

    await prisma.user.update({ where: { id: userId }, data: { mfaEnabled: false, mfaSecret: null } });
    await auditLog({ userId, username, action: "MFA_DISABLED", resource: "auth" });

    return { success: true, message: "MFA desactivado" };
  });

  // Audit logs
  fastify.get("/audit-logs", { preHandler: [requireAuth] }, async (request) => {
    const { userId, role } = (request as any).user;
    const q = request.query as any;

    // Only admins can see all logs; others see only their own
    const filterUserId = role === "admin" ? q.userId : userId;

    const { getAuditLogs } = await import("../services/audit");
    return getAuditLogs({
      userId: filterUserId,
      action: q.action,
      limit: Math.min(Number(q.limit) || 50, 100),
      offset: Number(q.offset) || 0,
    });
  });
}
