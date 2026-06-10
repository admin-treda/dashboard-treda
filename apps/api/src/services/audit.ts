import { prisma } from "../index";

interface AuditEntry {
  userId?: string;
  username: string;
  action: string;
  resource: string;
  detail?: any;
  ip?: string;
  userAgent?: string;
}

export async function auditLog(entry: AuditEntry): Promise<void> {
  try {
    // Use Prisma create instead of raw SQL to handle JSONB properly
    await prisma.auditLog.create({
      data: {
        userId: entry.userId || null,
        username: entry.username,
        action: entry.action,
        resource: entry.resource,
        detail: entry.detail || undefined,
        ip: entry.ip || null,
        userAgent: entry.userAgent || null,
      },
    });
  } catch (err: any) {
    console.error("[AuditLog] Failed:", err.message);
  }
}

export async function getAuditLogs(params: {
  userId?: string;
  action?: string;
  limit?: number;
  offset?: number;
}) {
  const { userId, action, limit = 50, offset = 0 } = params;

  const where: any = {};
  if (userId) where.userId = userId;
  if (action) where.action = action;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
}
