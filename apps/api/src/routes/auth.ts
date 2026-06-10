// ═══════════════════════════════════════════════════════════════════════
// WARNING: DO NOT MODIFY MFA SECRET STORAGE WITHOUT READING THIS FIRST
// ═══════════════════════════════════════════════════════════════════════
// MFA secrets MUST be stored as plaintext base32 (16 chars: A-Z 2-7)
// NEVER use encrypt() from encryption.ts — it broke production before.
// The encrypt function is for cloud credentials (AWS/Azure keys) ONLY.
// See skill: dashboard-treda-mfa for full details.
// ═══════════════════════════════════════════════════════════════════════
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
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

const mfaVerifySchema = z.object({
  code: z.string().length(6),
});

// ── Account lockout ─────────────────────────────────────────
const failedAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

function isLocked(username: string): boolean {
  const record = failedAttempts.get(username.toLowerCase());
  if (!record) return false;
  if (record.lockedUntil > 0 && Date.now() > record.lockedUntil) {
    failedAttempts.delete(username.toLowerCase());
    return false;
  }
  return record.lockedUntil > 0;
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

// ── TOTP (RFC 6238 — base32 secret, Google Authenticator)
function generateTOTPSecret(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let secret = "";
  for (let i = 0; i < 16; i++) secret += chars[Math.floor(Math.random() * chars.length)];
  return secret;
}

function base32Decode(encoded: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = encoded.replace(/[=\s]/g, "").toUpperCase();
  let bits = "";
  for (const char of clean) {
    const val = alphabet.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }
  return Buffer.from(bytes);
}

async function verifyTOTP(secret: string, code: string): Promise<boolean> {
  try {
    const key = base32Decode(secret);
    const epoch = Math.floor(Date.now() / 1000 / 30);
    for (let offset = -1; offset <= 1; offset++) {
      const time = epoch + offset;
      const timeBuffer = Buffer.alloc(8);
      timeBuffer.writeUInt32BE(0, 0);
      timeBuffer.writeUInt32BE(time, 4);
      const hmac = crypto.createHmac("sha1", key);
      hmac.update(timeBuffer);
      const hash = hmac.digest();
      const off = hash[hash.length - 1] & 0x0f;
      const code2 = (
        ((hash[off] & 0x7f) << 24) |
        ((hash[off + 1] & 0xff) << 16) |
        ((hash[off + 2] & 0xff) << 8) |
        (hash[off + 3] & 0xff)
      ) % 1000000;
      if (code2.toString().padStart(6, "0") === code) return true;
    }
  } catch {}
  return false;
}

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
  // ── Login ─────────────────────────────────────────────────
  fastify.post("/login", {
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    preHandler: validateBody(loginSchema),
  }, async (request, reply) => {
    const { username, password, mfaCode } = request.body as z.infer<typeof loginSchema>;
    const ip = request.ip || request.socket.remoteAddress;
    const userAgent = request.headers["user-agent"] || "";

    if (isLocked(username)) {
      await auditLog({ username, action: "LOGIN_BLOCKED", resource: "auth", detail: { reason: "locked" }, ip, userAgent });
      return reply.status(423).send({ error: "Cuenta bloqueada temporalmente. Intente de nuevo en 15 minutos." });
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

    // MFA check — secret stored as plaintext base32
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

    clearFailedAttempts(username);

    const token = fastify.jwt.sign({
      userId: user.id,
      email: user.email,
      role: user.role,
      username: user.username,
    });

    await auditLog({ userId: user.id, username: user.username, action: "LOGIN_SUCCESS", resource: "auth", ip, userAgent });

    reply.setCookie("token", token, {
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 2 * 60 * 60,
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

  // ── Get current user ──────────────────────────────────────
  fastify.get("/me", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = (request as any).user;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, username: true, mfaEnabled: true, createdAt: true },
    });
    if (!user) return reply.status(404).send({ error: "Usuario no encontrado" });
    return { user };
  });

  // ── Change password ───────────────────────────────────────
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

  // ── MFA Setup — generate secret ───────────────────────────
  fastify.post("/mfa/setup", { preHandler: [requireAuth] }, async (request) => {
    const { userId, username } = (request as any).user;
    const secret = generateTOTPSecret();
    const uri = secretToGoogleAuthUri(secret, username);

    // Store as plaintext base32 (NOT encrypted — simpler and more reliable)
    await prisma.user.update({ where: { id: userId }, data: { mfaSecret: secret } });
    await auditLog({ userId, username, action: "MFA_SETUP_INITIATED", resource: "auth" });

    return { secret, uri };
  });

  // ── MFA Verify — confirm setup ────────────────────────────
  fastify.post("/mfa/verify", { preHandler: [requireAuth, validateBody(mfaVerifySchema)] }, async (request) => {
    const { userId, username } = (request as any).user;
    const { code } = request.body as z.infer<typeof mfaVerifySchema>;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.mfaSecret) return { error: "Primero ejecuta /mfa/setup" };

    const valid = await verifyTOTP(user.mfaSecret, code);
    if (!valid) return { error: "Código inválido — intenta de nuevo" };

    await prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
    await auditLog({ userId, username, action: "MFA_ENABLED", resource: "auth" });

    return { success: true, message: "MFA activado correctamente" };
  });

  // ── MFA Disable ───────────────────────────────────────────
  fastify.post("/mfa/disable", { preHandler: [requireAuth, validateBody(mfaVerifySchema)] }, async (request) => {
    const { userId, username } = (request as any).user;
    const { code } = request.body as z.infer<typeof mfaVerifySchema>;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.mfaSecret) return { error: "MFA no está activo" };

    const valid = await verifyTOTP(user.mfaSecret, code);
    if (!valid) return { error: "Código inválido" };

    await prisma.user.update({ where: { id: userId }, data: { mfaEnabled: false, mfaSecret: null } });
    await auditLog({ userId, username, action: "MFA_DISABLED", resource: "auth" });

    return { success: true, message: "MFA desactivado" };
  });

  // ── Audit logs ────────────────────────────────────────────
  fastify.get("/audit-logs", { preHandler: [requireAuth] }, async (request) => {
    const { userId, role } = (request as any).user;
    const q = request.query as any;
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
