import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../index";
import { requireRole } from "../middleware/auth";
import { fetchAllNews, getLastNewsUpdate } from "../services/news";

export default async function (fastify: FastifyInstance) {
  // GET /api/v1/news/status
  fastify.get("/status", async () => {
    const lastUpdate = getLastNewsUpdate();
    const count = await prisma.news.count();
    return {
      last_update: lastUpdate?.toISOString() || null,
      total_articles: count,
    };
  });

  // GET /api/v1/news
  fastify.get("/", async (request) => {
    const query = request.query as any;
    const category = query.category || null;
    const limit = Math.min(parseInt(query.limit || "200"), 200);
    const offset = parseInt(query.offset || "0");
    const search = query.search || null;
    
    const where: any = {};
    if (category && category !== "all") where.category = category;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    const [items, total] = await Promise.all([
      prisma.news.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.news.count({ where }),
    ]);
    
    return { data: items, meta: { total, limit, offset } };
  });

  // POST /api/v1/news/fetch
  fastify.post("/fetch", { preHandler: [requireRole("admin")] }, async () => {
    const count = await fetchAllNews();
    return { new_articles: count, message: `Se obtuvieron ${count} artículos nuevos` };
  });

  // DELETE /api/v1/news/:id
  fastify.delete("/:id", { preHandler: [requireRole("admin")] }, async (request, reply) => {
    const { id } = request.params as any;
    await prisma.news.delete({ where: { id } });
    return reply.status(204).send();
  });
}
