import type { FastifyRequest, FastifyReply } from "fastify";
import { ZodSchema, ZodError } from "zod";

export function validateBody<T>(schema: ZodSchema<T>) {
  return async function (
    request: FastifyRequest<{ Body: unknown }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      request.body = schema.parse(request.body);
    } catch (err) {
      if (err instanceof ZodError) {
        reply.status(400).send({ error: "Validation failed", issues: err.issues });
        return;
      }
      reply.status(400).send({ error: "Invalid body" });
    }
  };
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return async function (
    request: FastifyRequest<{ Params: unknown }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      request.params = schema.parse(request.params) as Record<string, unknown>;
    } catch (err) {
      if (err instanceof ZodError) {
        reply.status(400).send({ error: "Validation failed", issues: err.issues });
        return;
      }
      reply.status(400).send({ error: "Invalid params" });
    }
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return async function (
    request: FastifyRequest<{ Querystring: unknown }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      request.query = schema.parse(request.query) as Record<string, unknown>;
    } catch (err) {
      if (err instanceof ZodError) {
        reply.status(400).send({ error: "Validation failed", issues: err.issues });
        return;
      }
      reply.status(400).send({ error: "Invalid query" });
    }
  };
}
