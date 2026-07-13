import { getSupabase } from "../supabase.js";
import { generateAtlasReport, type AtlasChatMessage } from "./analyze.js";
import type { RepoSnapshot } from "./github.js";

export async function processAtlasMap(jobId: string): Promise<void> {
  const sb = getSupabase();
  const { data: job, error } = await sb
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (error || !job) {
    console.error("atlas job not found", jobId, error);
    return;
  }
  if (job.status === "succeeded" || job.status === "running") return;

  await sb
    .from("jobs")
    .update({ status: "running", updated_at: new Date().toISOString() })
    .eq("id", jobId);

  try {
    const input = job.input as { snapshot?: RepoSnapshot };
    if (!input.snapshot) throw new Error("Missing repository snapshot");

    const { report, model, promptTokens, completionTokens } =
      await generateAtlasReport(input.snapshot);

    const welcome: AtlasChatMessage = {
      role: "assistant",
      content: report.summary,
      createdAt: new Date().toISOString(),
    };

    await sb
      .from("jobs")
      .update({
        status: "succeeded",
        result: {
          report,
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
    const message = e instanceof Error ? e.message : "Atlas mapping failed";
    console.error("atlas job failed", jobId, message);
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

export function enqueueAtlasProcessing(jobId: string): void {
  setImmediate(() => {
    void processAtlasMap(jobId);
  });
}
