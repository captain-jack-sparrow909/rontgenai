import { hostname } from "node:os";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { env } from "./env.js";
import { getSupabase } from "./lib/supabase.js";
import { processAtlasMap } from "./lib/atlas/process.js";
import { processBlueprintJob } from "./lib/blueprint/process.js";
import { processPulseSession } from "./lib/pulse/process.js";
import { processRadarInvestigation } from "./lib/radar/process.js";
import { processRelayJob } from "./lib/relay/process.js";
import { processSentinelReview } from "./lib/sentinel/process.js";
import {
  createInstallationOctokit,
  createUserTokenOctokit,
} from "./lib/sentinel/github.js";
import {
  processForgeImplement,
  processForgePlan,
} from "./lib/forge/process.js";
import {
  captureException,
  flushMonitoring,
  initMonitoring,
} from "./lib/monitoring.js";
import { purgeExpiredArtifacts } from "./lib/artifacts/retention.js";

type JobRecord = {
  id: string;
  product: string;
  type: string;
  status: string;
  input: Record<string, unknown> | null;
  attempt_count: number;
  max_attempts: number;
  request_id: string | null;
};

const workerId =
  env.WORKER_ID ?? `${hostname()}:${process.pid}:${randomUUID().slice(0, 8)}`;

function log(
  level: "info" | "warn" | "error",
  event: string,
  fields: Record<string, unknown> = {},
): void {
  const line = JSON.stringify({
    level,
    event,
    service: "rontgenai-worker",
    workerId,
    timestamp: new Date().toISOString(),
    ...fields,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

async function githubClient(input: Record<string, unknown>) {
  const installationId = Number(input.installationId);
  if (Number.isInteger(installationId) && installationId > 0) {
    return createInstallationOctokit(installationId);
  }
  return createUserTokenOctokit();
}

async function dispatch(job: JobRecord): Promise<void> {
  const input = job.input ?? {};
  switch (job.product) {
    case "blueprint":
      return processBlueprintJob(job.id);
    case "pulse":
      return processPulseSession(job.id);
    case "atlas":
      return processAtlasMap(job.id);
    case "radar":
      return processRadarInvestigation(job.id);
    case "relay":
      return processRelayJob(job.id);
    case "sentinel":
      return processSentinelReview(job.id, await githubClient(input));
    case "forge":
      if (input.stage === "planning") return processForgePlan(job.id);
      return processForgeImplement(job.id, await githubClient(input));
    default:
      throw new Error(`No worker registered for ${job.product}/${job.type}`);
  }
}

async function claimNextJob(): Promise<JobRecord | null> {
  const { data, error } = await getSupabase().rpc("claim_next_job", {
    p_worker_id: workerId,
    p_stale_after_seconds: env.JOB_STALE_AFTER_SECONDS,
  });
  if (error) throw new Error(`job claim failed: ${error.message}`);
  return ((data as JobRecord[] | null)?.[0] ?? null);
}

async function processClaim(job: JobRecord): Promise<void> {
  const startedAt = Date.now();
  log("info", "job.started", {
    jobId: job.id,
    product: job.product,
    type: job.type,
    attempt: job.attempt_count,
    requestId: job.request_id,
  });

  const heartbeatMs = Math.max(
    10_000,
    Math.floor((env.JOB_STALE_AFTER_SECONDS * 1000) / 3),
  );
  const heartbeat = setInterval(() => {
    void getSupabase()
      .from("jobs")
      .update({ last_heartbeat_at: new Date().toISOString() })
      .eq("id", job.id)
      .eq("locked_by", workerId);
  }, heartbeatMs);
  heartbeat.unref();

  try {
    await dispatch(job);
    const { data: current, error } = await getSupabase()
      .from("jobs")
      .select("status,error,attempt_count,max_attempts")
      .eq("id", job.id)
      .single();
    if (error) throw new Error(`job completion lookup failed: ${error.message}`);

    if (current.status === "failed") {
      captureException(new Error(current.error ?? "Job processor failed"), {
        jobId: job.id,
        product: job.product,
        requestId: job.request_id,
        attempt: current.attempt_count,
      });
      await getSupabase().rpc("retry_job", {
        p_job_id: job.id,
        p_error: current.error ?? "Job processor failed",
      });
      log(current.attempt_count >= current.max_attempts ? "error" : "warn", "job.failed", {
        jobId: job.id,
        product: job.product,
        attempt: current.attempt_count,
        maxAttempts: current.max_attempts,
        error: current.error,
        durationMs: Date.now() - startedAt,
      });
      return;
    }

    await getSupabase().rpc("complete_job_lease", { p_job_id: job.id });
    log("info", "job.completed", {
      jobId: job.id,
      product: job.product,
      status: current.status,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Worker failed";
    await getSupabase().rpc("retry_job", {
      p_job_id: job.id,
      p_error: message,
    });
    captureException(error, {
      jobId: job.id,
      product: job.product,
      requestId: job.request_id,
      attempt: job.attempt_count,
    });
    log("error", "job.crashed", {
      jobId: job.id,
      product: job.product,
      error: message,
      durationMs: Date.now() - startedAt,
    });
  } finally {
    clearInterval(heartbeat);
  }
}

async function main(): Promise<void> {
  initMonitoring("worker");
  let stopping = false;
  let claimFailureCount = 0;
  const active = new Set<Promise<void>>();

  const stop = () => {
    stopping = true;
    log("info", "worker.stopping", { activeJobs: active.size });
  };
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);

  log("info", "worker.started", {
    concurrency: env.WORKER_CONCURRENCY,
    pollMs: env.WORKER_POLL_MS,
  });

  const runRetention = async () => {
    try {
      const result = await purgeExpiredArtifacts();
      if (result.inspected) log("info", "artifacts.retention", result);
    } catch (error) {
      captureException(error, { operation: "artifact-retention" });
      log("error", "artifacts.retention_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };
  await runRetention();
  const retentionTimer = setInterval(() => void runRetention(), 60 * 60 * 1000);
  retentionTimer.unref();

  while (!stopping) {
    while (!stopping && active.size < env.WORKER_CONCURRENCY) {
      let job: JobRecord | null = null;
      try {
        job = await claimNextJob();
        claimFailureCount = 0;
      } catch (error) {
        claimFailureCount += 1;
        log("error", "worker.claim_failed", {
          error: error instanceof Error ? error.message : String(error),
          consecutiveFailures: claimFailureCount,
        });
        if (claimFailureCount >= 10) stopping = true;
        break;
      }
      if (!job) break;
      const task = processClaim(job).finally(() => active.delete(task));
      active.add(task);
    }

    if (!stopping) {
      await new Promise((resolve) => setTimeout(resolve, env.WORKER_POLL_MS));
    }
  }

  await Promise.allSettled(active);
  clearInterval(retentionTimer);
  await flushMonitoring();
  log(claimFailureCount >= 10 ? "error" : "info", "worker.stopped");
  if (claimFailureCount >= 10) process.exitCode = 1;
}

const entrypoint = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : null;
if (entrypoint === import.meta.url) {
  void main();
}
