import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireRole } from "../middleware/auth";
import { validateBody } from "../middleware/validate";

const settingsSchema = z.object({
  brand: z.object({
    primaryNavy: z.string().default("#21286C"),
    accentCyan: z.string().default("#00F5B8"),
    secondaryBlue: z.string().default("#5B78FF"),
    softBlue: z.string().default("#E8F0FE"),
  }).optional(),
  notifications: z.object({
    enabled: z.boolean().default(true),
    channels: z.array(z.string()).optional(),
  }).optional(),
  reports: z.object({
    autoGenerate: z.boolean().default(false),
    timezone: z.string().default("UTC"),
  }).optional(),
});

let settingsStore: Record<string, unknown> = {
  brand: {
    primaryNavy: "#21286C",
    accentCyan: "#00F5B8",
    secondaryBlue: "#5B78FF",
    softBlue: "#E8F0FE",
  },
  notifications: {
    enabled: true,
    channels: [],
  },
  reports: {
    autoGenerate: false,
    timezone: "UTC",
  },
};

export default async function settingRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get("/", { preHandler: requireRole("admin", "viewer") }, async () => {
    return { settings: settingsStore };
  });

  fastify.put("/", { preHandler: [requireRole("admin"), validateBody(settingsSchema)] }, async (request) => {
    const body = request.body as z.infer<typeof settingsSchema>;
    settingsStore = { ...settingsStore, ...body };
    return { settings: settingsStore };
  });
}
