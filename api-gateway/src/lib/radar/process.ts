import { getSupabase } from "../supabase.js";
import {
  runRadarInvestigation,
  type RadarOperationsContext,
} from "./investigate.js";
import type { LogSignalSummary } from "./parse.js";
import { runInlineJob } from "../jobs/runtime.js";

export async function processRadarInvestigation(jobId: string): Promise<void> {
  const sb = getSupabase();
  const { data: job, error } = await sb
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (error || !job) {
    console.error("radar job not found", jobId, error);
    return;
  }
  if (job.status === "succeeded" || job.status === "running") return;

  await sb
    .from("jobs")
    .update({ status: "running", updated_at: new Date().toISOString() })
    .eq("id", jobId);

  try {
    const input = job.input as {
      title?: string;
      description?: string;
      metricsNotes?: string;
      summary?: LogSignalSummary;
      operationsContext?: RadarOperationsContext;
    };

    if (!input.summary) throw new Error("Missing log signal summary");

    const { report, model, promptTokens, completionTokens } =
      await runRadarInvestigation({
        title: input.title,
        description: input.description,
        metricsNotes: input.metricsNotes,
        operationsContext: input.operationsContext,
        summary: input.summary,
      });

    await sb
      .from("jobs")
      .update({
        status: "succeeded",
        result: {
          report,
          meta: {
            model,
            promptTokens,
            completionTokens,
            completedAt: new Date().toISOString(),
            signals: {
              totalLines: input.summary.totalLines,
              errorCount: input.summary.errorCount,
              warnCount: input.summary.warnCount,
            },
          },
        },
        error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Radar investigation failed";
    console.error("radar job failed", jobId, message);
    await sb
      .from("jobs")
      .update({
        status: "failed",
        error: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  }
}

export function enqueueRadarInvestigation(jobId: string): void {
  runInlineJob(() => processRadarInvestigation(jobId));
}
