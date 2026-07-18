import { getSupabase } from "../supabase.js";
import { bootstrapDataset, type PulseChatMessage } from "./analyze.js";
import type { DatasetProfile } from "./parse.js";
import { runInlineJob } from "../jobs/runtime.js";

export async function processPulseSession(jobId: string): Promise<void> {
  const sb = getSupabase();
  const { data: job, error } = await sb
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (error || !job) {
    console.error("pulse session not found", jobId, error);
    return;
  }
  if (job.status === "succeeded" || job.status === "running") return;

  await sb
    .from("jobs")
    .update({ status: "running", updated_at: new Date().toISOString() })
    .eq("id", jobId);

  try {
    const input = job.input as {
      profile?: DatasetProfile;
      title?: string;
    };

    if (!input.profile) {
      throw new Error("Missing dataset profile");
    }

    const { bootstrap, model, promptTokens, completionTokens } =
      await bootstrapDataset(input.profile);

    const welcome: PulseChatMessage = {
      role: "assistant",
      content: bootstrap.summary,
      chart: bootstrap.chart ?? null,
      createdAt: new Date().toISOString(),
    };

    await sb
      .from("jobs")
      .update({
        status: "succeeded",
        result: {
          bootstrap,
          messages: [welcome],
          meta: {
            model,
            promptTokens,
            completionTokens,
            completedAt: new Date().toISOString(),
          },
        },
        error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Pulse analysis failed";
    console.error("pulse session failed", jobId, message);
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

export function enqueuePulseProcessing(jobId: string): void {
  runInlineJob(() => processPulseSession(jobId));
}
