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
    await prisma.$executeRawUnsafe(
      `INSERT INTO audit_logs (user_id, username, action, resource, detail, ip, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      entry.userId || null,
      entry.username,
      entry.action,
      entry.resource,
      entry.detail ? JSON.stringify(entry.detail) : null,
      entry.ip || null,
      entry.userAgent || null
    );
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
  let where = "1=1";
  const values: any[] = [];
  let idx = 1;

  if (userId) { where += ` AND user_id = $${idx++}`; values.push(userId); }
  if (action) { where += ` AND action = $${idx++}`; values.push(action); }

  const rows = await prisma.$queryRawUnsafe(
    `SELECT * FROM audit_logs WHERE ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
    ...values, limit, offset
  );
  const countResult = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) as total FROM audit_logs WHERE ${where}`,
    ...values
  );
  return { logs: rows, total: Number((countResult as any)[0]?.total || 0) };
}
