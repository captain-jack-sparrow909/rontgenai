import { getSupabase } from "../supabase.js";
import { runRelayAnalysis } from "./analyze.js";
import { runInlineJob } from "../jobs/runtime.js";

export async function processRelayJob(jobId: string): Promise<void> {
  const sb = getSupabase();
  const { data: job, error } = await sb.from("jobs").select("*").eq("id", jobId).maybeSingle();
  if (error || !job) {
    console.error("relay job not found", jobId, error);
    return;
  }
  if (job.status === "succeeded" || job.status === "running") return;
  await sb.from("jobs").update({ status: "running", updated_at: new Date().toISOString() }).eq("id", jobId);
  try {
    const input = job.input as { title?: string; repository?: string; notes?: string; pipelineData?: string };
    if (!input.pipelineData?.trim()) throw new Error("Missing pipeline data");
    const { report, model, promptTokens, completionTokens } = await runRelayAnalysis({
      title: input.title,
      repository: input.repository,
      notes: input.notes,
      pipelineData: input.pipelineData,
    });
    await sb.from("jobs").update({
      status: "succeeded",
      result: { report, meta: { model, promptTokens, completionTokens, completedAt: new Date().toISOString() } },
      error: null,
      updated_at: new Date().toISOString(),
    }).eq("id", jobId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Relay analysis failed";
    console.error("relay job failed", jobId, message);
    await sb.from("jobs").update({ status: "failed", error: message, updated_at: new Date().toISOString() }).eq("id", jobId);
  }
}

export function enqueueRelayProcessing(jobId: string): void {
  runInlineJob(() => processRelayJob(jobId));
}
