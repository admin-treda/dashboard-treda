import nodemailer from "nodemailer";
import { config } from "../config";
import type { NotificationChannel } from "@prisma/client";

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure?: boolean;
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASS) {
    throw new Error("SMTP not configured");
  }

  const transporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT ?? 587,
    secure: (config.SMTP_PORT ?? 587) === 465,
    auth: {
      user: config.SMTP_USER,
      pass: config.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: config.SMTP_USER,
    to,
    subject,
    html,
  });
}

export async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  if (!config.TELEGRAM_BOT_TOKEN) {
    throw new Error("Telegram bot token not configured");
  }

  const url = `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Telegram API error: ${err}`);
  }
}

export async function dispatchNotification(channel: NotificationChannel, message: string): Promise<void> {
  const cfg = typeof channel.config === "string" ? JSON.parse(channel.config) : (channel.config as Record<string, unknown>);

  if (channel.type === "SMTP") {
    const smtp = cfg as SmtpConfig;
    await sendEmail(smtp.user, "Hermes Allen Alert", message);
  } else if (channel.type === "TELEGRAM") {
    const tg = cfg as TelegramConfig;
    await sendTelegramMessage(tg.chatId, message);
  } else {
    throw new Error(`Unsupported channel type: ${channel.type}`);
  }
}
