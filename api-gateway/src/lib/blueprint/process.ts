import { getSupabase } from "../supabase.js";
import { getSignedGetUrl, isR2Configured } from "../r2.js";
import { runBlueprintReview } from "./review.js";
import { runInlineJob } from "../jobs/runtime.js";

/**
 * Process a blueprint job in-process (Phase 2).
 * Later: move to dedicated ai-worker / Inngest function.
 */
export async function processBlueprintJob(jobId: string): Promise<void> {
  const sb = getSupabase();

  const { data: job, error } = await sb
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (error || !job) {
    console.error("blueprint job not found", jobId, error);
    return;
  }

  if (job.status === "succeeded" || job.status === "running") {
    return;
  }

  await sb
    .from("jobs")
    .update({ status: "running", updated_at: new Date().toISOString() })
    .eq("id", jobId);

  try {
    const input = (job.input ?? {}) as {
      title?: string;
      description?: string;
      mermaid?: string;
      r2_key?: string;
      content_type?: string;
      image_data_url?: string;
      reviewMode?: "architecture" | "cost";
      cloudInventory?: string;
      billingSummary?: string;
      optimizationConstraints?: string;
    };

    let imageUrl: string | undefined = input.image_data_url;

    if (!imageUrl && input.r2_key && isR2Configured()) {
      // Prefer data URL for models that need inline image; signed URL as fallback
      try {
        imageUrl = await getSignedGetUrl(input.r2_key, 3600);
      } catch (e) {
        console.warn("signed url failed", e);
      }
    }

    const description = (input.description ?? "").trim();
    if (!description && !input.mermaid && !imageUrl && !input.cloudInventory && !input.billingSummary) {
      throw new Error("No architecture description, Mermaid, or diagram provided");
    }

    const { review, model, promptTokens, completionTokens } =
      await runBlueprintReview({
        title: input.title,
        description:
          description ||
          "See attached diagram / Mermaid. Infer architecture from available inputs.",
        mermaid: input.mermaid,
        imageUrl,
        reviewMode: input.reviewMode,
        cloudInventory: input.cloudInventory,
        billingSummary: input.billingSummary,
        optimizationConstraints: input.optimizationConstraints,
      });

    await sb
      .from("jobs")
      .update({
        status: "succeeded",
        result: {
          review,
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
    const message = e instanceof Error ? e.message : "Blueprint review failed";
    console.error("blueprint job failed", jobId, message);
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

/** Fire-and-forget without blocking the HTTP response. */
export function enqueueBlueprintProcessing(jobId: string): void {
  runInlineJob(() => processBlueprintJob(jobId));
}
