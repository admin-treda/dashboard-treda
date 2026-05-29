import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { config } from "../config";
import { createReport } from "./report";
import { dispatchNotification } from "./notification";
import { prisma } from "../index";

const redis = new IORedis(config.REDIS_URL, { maxRetriesPerRequest: null });

export const reportQueue = new Queue("reports", { connection: redis });
export const notificationQueue = new Queue("notifications", { connection: redis });

export async function scheduleReport(type: "DAILY" | "WEEKLY"): Promise<void> {
  await reportQueue.add("generate-report", { type }, {
    repeat: {
      pattern: type === "DAILY" ? "0 6 * * *" : "0 6 * * 1",
    },
  });
}

export async function enqueueNotification(channelId: string, message: string): Promise<void> {
  await notificationQueue.add("send-notification", { channelId, message });
}

const reportWorker = new Worker("reports", async (job) => {
  if (job.name === "generate-report") {
    const { type } = job.data as { type: "DAILY" | "WEEKLY" };
    await createReport(type);
  }
}, { connection: redis });

const notificationWorker = new Worker("notifications", async (job) => {
  if (job.name === "send-notification") {
    const { channelId, message } = job.data as { channelId: string; message: string };
    const channel = await prisma.notificationChannel.findUnique({ where: { id: channelId } });
    if (channel && channel.enabled) {
      await dispatchNotification(channel, message);
    }
  }
}, { connection: redis });

reportWorker.on("failed", (job, err) => {
  console.error(`Report job ${job?.id} failed:`, err);
});

notificationWorker.on("failed", (job, err) => {
  console.error(`Notification job ${job?.id} failed:`, err);
});
