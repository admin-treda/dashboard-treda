import type { FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config";

export interface JwtPayload {
  userId: string;
  email: string;
  role: "admin" | "analyst" | "viewer";
  iat: number;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: JwtPayload;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();
    request.user = request.user as JwtPayload;
  } catch {
    reply.status(401).send({ error: "Unauthorized" });
  }
}

export function requireRole(...allowedRoles: Array<"admin" | "analyst" | "viewer">) {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      await request.jwtVerify();
      request.user = request.user as JwtPayload;
    } catch {
      reply.status(401).send({ error: "Unauthorized" });
      return;
    }
    const user = request.user;
    if (!user || !allowedRoles.includes(user.role)) {
      reply.status(403).send({ error: "Forbidden" });
      return;
    }
  };
}
