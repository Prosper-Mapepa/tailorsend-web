import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function normalizeOrigin(value: string | undefined, fallback: string): string {
  const raw = (value ?? fallback).trim();
  return raw.replace(/\/+$/, "");
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: required("DATABASE_URL"),
  sessionSecret: required("SESSION_SECRET", "dev-session-secret-change-in-production"),
  frontendUrl: normalizeOrigin(process.env.FRONTEND_URL, "http://localhost:3000"),
  appUrl: normalizeOrigin(
    process.env.APP_URL ?? process.env.FRONTEND_URL,
    "http://localhost:3000",
  ),
  sessionDays: Number(process.env.SESSION_DAYS ?? 30),
  resetTokenHours: Number(process.env.RESET_TOKEN_HOURS ?? 1),
  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from: process.env.SMTP_FROM ?? "TailorSend <noreply@localhost>",
  },
};

export function isDev(): boolean {
  return config.nodeEnv !== "production";
}
