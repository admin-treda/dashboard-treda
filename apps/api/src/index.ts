import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import { config } from "./config";
import { authenticate } from "./middleware/auth";
import { setCollectResult, getCollectTime, getCollectResult } from "./services/collector-state";
import { startPolling, collectAllAccounts, collectAllCosts } from "./services/collector";
import { generateAndSendReport } from "./services/report";
import { fetchAllNews, cleanupCriticalNews } from "./services/news";
import { PrismaClient } from "@prisma/client";

import authRoutes from "./routes/auth";
import accountRoutes from "./routes/accounts";
import eventRoutes from "./routes/events";
import costRoutes from "./routes/costs";
import notificationRoutes from "./routes/notifications";
import newsRoutes from "./routes/news";
import reportRoutes from "./routes/reports";
import userRoutes from "./routes/users";
import settingRoutes from "./routes/settings";
import pentestRoutes from "./routes/pentest";

export const prisma = new PrismaClient({
  log: config.NODE_ENV === "development" ? ["query", "info", "warn", "error"] : ["error"],
});

const app = Fastify({
  logger: {
    level: config.NODE_ENV === "development" ? "debug" : "info",
  },
});

async function main(): Promise<void> {
  await app.register(cors, {
    origin: ["http://127.0.0.1:5173", "http://localhost:5173", "http://127.0.0.1:80", "http://localhost:80"],
    credentials: true,
  });

  await app.register(cookie);
  await app.register(jwt, {
    secret: config.JWT_SECRET,
    sign: { expiresIn: config.JWT_EXPIRES_IN },
  });

  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  });

  await app.register(rateLimit, {
    max: 300,
    timeWindow: "1 minute",
  });

  // Custom JSON parser to sanitize parse errors (H1 fix)
  app.addContentTypeParser("application/json", { parseAs: "string" }, (req, body, done) => {
    try {
      const json = JSON.parse(body as string);
      done(null, json);
    } catch (err) {
      done(new Error("Invalid JSON"), undefined);
    }
  });

  app.get("/health", async () => ({ status: "ok", time: new Date().toISOString() }));

  await app.register(authRoutes, { prefix: "/api/v1/auth" });
  await app.register(accountRoutes, { prefix: "/api/v1/accounts" });
  await app.register(eventRoutes, { prefix: "/api/v1/events" });
  await app.register(costRoutes, { prefix: "/api/v1/costs" });
  await app.register(notificationRoutes, { prefix: "/api/v1/notifications" });
  await app.register(newsRoutes, { prefix: "/api/v1/news" });
  await app.register(reportRoutes, { prefix: "/api/v1/reports" });
  await app.register(userRoutes, { prefix: "/api/v1/users" });
  await app.register(settingRoutes, { prefix: "/api/v1/settings" });
  await app.register(pentestRoutes, { prefix: "/api/v1/pentest" });

  
// Seed all existing accounts on startup


app.get("/api/v1/collect", { preHandler: [authenticate] }, async () => {
  try {
    lastCollectTime = new Date();
    const result = await collectAllAccounts();
    lastCollectResult = { accounts: result.accounts, events: result.totalEvents };
    return { accounts_collected: result.accounts, new_events: result.totalEvents, collected_at: lastCollectTime.toISOString() };
  } catch (e: any) {
    setCollectResult({ error: e.message });
    return { error: e.message };
  }
});
  
  app.get("/api/v1/poll-status", { preHandler: [authenticate] }, async () => {
  return { 
    status: "running", 
    interval_minutes: 20,
    last_run: getCollectTime()?.toISOString() || null,
    last_result: getCollectResult()
  };
});

app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({ error: "Not Found" });
  });

  app.addHook("onSend", async (_request, reply) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("X-XSS-Protection", "1; mode=block");
  });

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    const statusCode = error.statusCode ?? 500;
    let message = "Internal Server Error";
    if (config.NODE_ENV !== "production") {
      message = error.message || message;
    }
    const response: Record<string, unknown> = { error: message };
    if (config.NODE_ENV !== "production") {
      response.stack = error.stack;
    }
    reply.status(statusCode).send(response);
  });

  try {
    startPolling(20);

  // Schedule daily cost refresh at 7 AM Colombia (12:00 UTC)
  const scheduleDailyCostCollection = () => {
    const now = new Date();
    // Colombia is UTC-5, so 7 AM COT = 12:00 UTC
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    const msUntilTarget = target.getTime() - now.getTime();
    setTimeout(async () => {
      console.log('[CostCollector] Running daily cost collection (7 AM Colombia time)');
      try {
        const result = await collectAllCosts();
        console.log(`[CostCollector] Daily collection done: ${result.accounts} accounts, ${result.categories} categories`);
      } catch (err: any) {
        console.error('[CostCollector] Daily collection error:', err.message);
      }
      // Schedule next day
      scheduleDailyCostCollection();
    }, msUntilTarget);
  };
  scheduleDailyCostCollection();

  // Schedule daily report at midnight
  const scheduleDailyReport = () => {
    const now = new Date();
    const night = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 5, 0);
    const msToMidnight = night.getTime() - now.getTime();
    setTimeout(async () => {
      await generateAndSendReport('DAILY').catch(() => {});
      scheduleDailyReport();
  // Fetch news every 4 hours at 8 AM
  const scheduleNewsFetch = () => {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    setTimeout(async () => {
      const count = await fetchAllNews().catch(() => 0);
      console.log(`[News] Fetched ${count} new articles`);
      scheduleNewsFetch();
  
  // Cleanup critical news older than 15 days (daily)
  cleanupCriticalNews().catch(() => {});
  setInterval(() => cleanupCriticalNews().catch(() => {}), 24 * 60 * 60 * 1000);
    }, target.getTime() - now.getTime());
  };
  scheduleNewsFetch();
  
  // Cleanup critical news older than 15 days (daily)
  cleanupCriticalNews().catch(() => {});
  setInterval(() => cleanupCriticalNews().catch(() => {}), 24 * 60 * 60 * 1000); // Schedule again for next day
    }, msToMidnight);
  };
  scheduleDailyReport();
  // Fetch news every 4 hours at 8 AM
  const scheduleNewsFetch = () => {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    setTimeout(async () => {
      const count = await fetchAllNews().catch(() => 0);
      console.log(`[News] Fetched ${count} new articles`);
      scheduleNewsFetch();
  
  // Cleanup critical news older than 15 days (daily)
  cleanupCriticalNews().catch(() => {});
  setInterval(() => cleanupCriticalNews().catch(() => {}), 24 * 60 * 60 * 1000);
    }, target.getTime() - now.getTime());
  };
  scheduleNewsFetch();
  
  // Cleanup critical news older than 15 days (daily)
  cleanupCriticalNews().catch(() => {});
  setInterval(() => cleanupCriticalNews().catch(() => {}), 24 * 60 * 60 * 1000);
    await app.listen({ port: config.PORT, host: config.HOST });
    app.log.info(`Server listening on http://${config.HOST}:${config.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
