import "dotenv/config";
import { z } from "zod";

const optionalKeepaliveSecret = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().min(32).max(512).optional(),
);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(8000),
  JOB_EXECUTION_MODE: z.enum(["inline", "worker"]).default("inline"),
  WORKER_ID: z.string().max(200).optional(),
  WORKER_POLL_MS: z.coerce.number().int().min(250).max(60000).default(1500),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(10).default(2),
  JOB_STALE_AFTER_SECONDS: z.coerce.number().int().min(30).max(86400).default(900),
  RATE_LIMIT_READ_PER_MINUTE: z.coerce.number().int().min(10).max(10000).default(240),
  RATE_LIMIT_WRITE_PER_MINUTE: z.coerce.number().int().min(5).max(5000).default(60),
  UPLOAD_MAX_BYTES: z.coerce.number().int().min(1024).max(100 * 1024 * 1024).default(10 * 1024 * 1024),
  ARTIFACT_RETENTION_DAYS: z.coerce.number().int().min(1).max(3650).default(30),
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.string().max(100).optional(),
  KEEPALIVE_CRON_SECRET: optionalKeepaliveSecret,
  ENABLE_GENERIC_JOB_API: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  /** Comma-separated allowlist, e.g. https://rontgenai.dev,https://www.rontgenai.dev */
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:3000")
    .transform((v) => v.split(",").map((s) => s.trim()).filter(Boolean)),

  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_PUBLISHABLE_KEY: z.string().optional(),
  CLERK_WEBHOOK_SECRET: z.string().optional(),

  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  PADDLE_API_KEY: z.string().optional(),
  PADDLE_ENV: z.enum(["sandbox", "production"]).default("sandbox"),
  PADDLE_WEBHOOK_SECRET: z.string().optional(),
  PADDLE_PRICE_PRO_MONTHLY: z.string().optional(),
  PADDLE_PRICE_PRO_YEARLY: z.string().optional(),
  PADDLE_PRICE_TEAM_MONTHLY: z.string().optional(),
  PADDLE_PRICE_TEAM_YEARLY: z.string().optional(),

  INNGEST_EVENT_KEY: z.string().optional(),

  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_BASE_URL: z.string().url().default("https://api.deepseek.com"),
  DEEPSEEK_MODEL: z.string().default("deepseek-chat"),

  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_S3_API_ENDPOINT: z.string().optional(),
  R2_PUBLIC_BASE_URL: z.string().optional(),

  GITHUB_TOKEN: z.string().optional(),

  /** GitHub App for Sentinel (optional — PAT works for manual PR review) */
  GITHUB_APP_ID: z.string().optional(),
  GITHUB_APP_PRIVATE_KEY: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),
  GITHUB_APP_SLUG: z.string().optional(),
  GITHUB_APP_CLIENT_ID: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function normalizeSupabaseUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  return raw.replace(/\/rest\/v1\/?$/i, "").replace(/\/$/, "");
}

/** Allow PEM keys stored with escaped newlines in env */
function normalizePem(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  return raw.replace(/\\n/g, "\n");
}

function loadEnv(): Env {
  const parsed = envSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    JOB_EXECUTION_MODE:
      process.env.JOB_EXECUTION_MODE ??
      (process.env.NODE_ENV === "production" ? "worker" : "inline"),
    WORKER_ID: process.env.WORKER_ID,
    WORKER_POLL_MS: process.env.WORKER_POLL_MS,
    WORKER_CONCURRENCY: process.env.WORKER_CONCURRENCY,
    JOB_STALE_AFTER_SECONDS: process.env.JOB_STALE_AFTER_SECONDS,
    RATE_LIMIT_READ_PER_MINUTE: process.env.RATE_LIMIT_READ_PER_MINUTE,
    RATE_LIMIT_WRITE_PER_MINUTE: process.env.RATE_LIMIT_WRITE_PER_MINUTE,
    UPLOAD_MAX_BYTES: process.env.UPLOAD_MAX_BYTES,
    ARTIFACT_RETENTION_DAYS: process.env.ARTIFACT_RETENTION_DAYS,
    SENTRY_DSN: process.env.SENTRY_DSN,
    SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT,
    KEEPALIVE_CRON_SECRET: process.env.KEEPALIVE_CRON_SECRET,
    ENABLE_GENERIC_JOB_API: process.env.ENABLE_GENERIC_JOB_API,
    APP_URL: process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL,
    CORS_ORIGINS: process.env.CORS_ORIGINS ?? process.env.NEXT_PUBLIC_APP_URL,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    CLERK_PUBLISHABLE_KEY:
      process.env.CLERK_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
    SUPABASE_URL: normalizeSupabaseUrl(
      process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    PADDLE_API_KEY: process.env.PADDLE_API_KEY,
    PADDLE_ENV: process.env.PADDLE_ENV,
    PADDLE_WEBHOOK_SECRET: process.env.PADDLE_WEBHOOK_SECRET,
    PADDLE_PRICE_PRO_MONTHLY: process.env.PADDLE_PRICE_PRO_MONTHLY,
    PADDLE_PRICE_PRO_YEARLY: process.env.PADDLE_PRICE_PRO_YEARLY,
    PADDLE_PRICE_TEAM_MONTHLY: process.env.PADDLE_PRICE_TEAM_MONTHLY,
    PADDLE_PRICE_TEAM_YEARLY: process.env.PADDLE_PRICE_TEAM_YEARLY,
    INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    DEEPSEEK_BASE_URL: process.env.DEEPSEEK_BASE_URL,
    DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL,
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET: process.env.R2_BUCKET,
    R2_S3_API_ENDPOINT: process.env.R2_S3_API_ENDPOINT,
    R2_PUBLIC_BASE_URL: process.env.R2_PUBLIC_BASE_URL,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? undefined,
    GITHUB_APP_ID: process.env.GITHUB_APP_ID,
    GITHUB_APP_PRIVATE_KEY: normalizePem(process.env.GITHUB_APP_PRIVATE_KEY),
    GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET,
    GITHUB_APP_SLUG: process.env.GITHUB_APP_SLUG,
    GITHUB_APP_CLIENT_ID: process.env.GITHUB_APP_CLIENT_ID,
  });

  if (!parsed.success) {
    console.error("Invalid environment:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid API gateway environment configuration");
  }

  return parsed.data;
}

export const env = loadEnv();
