import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authenticate } from "../middleware/auth";

const HONCHO_URL = process.env.HONCHO_URL || "http://localhost:8000";

export default async function honchoRoutes(app: FastifyInstance) {
  // Chat with Honcho
  app.post(
    "/chat",
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { query, reasoning_level } = request.body as {
          query: string;
          reasoning_level?: string;
        };

        if (!query || typeof query !== "string") {
          return reply.status(400).send({ error: "Query is required" });
        }

        const res = await fetch(
          `${HONCHO_URL}/v3/workspaces/hermes/peers/hermes/chat`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, reasoning_level }),
          }
        );

        const data = await res.json();
        return reply.send(data);
      } catch (error: any) {
        app.log.error("Honcho chat error:", error);
        return reply.status(502).send({
          error: "Honcho service unavailable",
          detail: error.message,
        });
      }
    }
  );

  // Search Honcho memory
  app.post(
    "/search",
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { query, max_tokens } = request.body as {
          query: string;
          max_tokens?: number;
        };

        if (!query || typeof query !== "string") {
          return reply.status(400).send({ error: "Query is required" });
        }

        const res = await fetch(
          `${HONCHO_URL}/v3/workspaces/hermes/peers/hermes/memory/search`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, max_tokens }),
          }
        );

        const data = await res.json();
        return reply.send(data);
      } catch (error: any) {
        app.log.error("Honcho search error:", error);
        return reply.status(502).send({
          error: "Honcho service unavailable",
          detail: error.message,
        });
      }
    }
  );

  // Get Honcho profile/context
  app.get(
    "/context",
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const res = await fetch(
          `${HONCHO_URL}/v3/workspaces/hermes/peers/hermes/context`
        );

        const data = await res.json();
        return reply.send(data);
      } catch (error: any) {
        app.log.error("Honcho context error:", error);
        return reply.status(502).send({
          error: "Honcho service unavailable",
          detail: error.message,
        });
      }
    }
  );

  // Health check for Honcho
  app.get(
    "/health",
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const res = await fetch(`${HONCHO_URL}/health`);
        const data = await res.json();
        return reply.send({ status: "ok", honcho: data });
      } catch (error: any) {
        return reply.send({
          status: "unreachable",
          honcho: { error: error.message },
        });
      }
    }
  );
}
