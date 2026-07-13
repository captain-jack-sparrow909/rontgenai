import type { Octokit } from "@octokit/rest";
import { getSupabase } from "../supabase.js";
import {
  fetchPullRequest,
  submitPullRequestReview,
  type PrRef,
  type PrSnapshot,
} from "./github.js";
import {
  reviewBodyMarkdown,
  runSentinelReview,
  toGithubEvent,
  type SentinelReviewResult,
} from "./review.js";

export async function processSentinelReview(
  jobId: string,
  octokit: Octokit,
): Promise<void> {
  const sb = getSupabase();
  const { data: job, error } = await sb
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (error || !job) {
    console.error("sentinel job not found", jobId, error);
    return;
  }
  if (job.status === "succeeded" || job.status === "running") return;

  await sb
    .from("jobs")
    .update({ status: "running", updated_at: new Date().toISOString() })
    .eq("id", jobId);

  try {
    const input = job.input as {
      prRef?: PrRef;
      snapshot?: PrSnapshot;
      postToGithub?: boolean;
      autoApprove?: boolean;
    };

    let snapshot = input.snapshot;
    if (!snapshot && input.prRef) {
      snapshot = await fetchPullRequest(octokit, input.prRef);
    }
    if (!snapshot) throw new Error("Missing PR snapshot");

    const { review, model, promptTokens, completionTokens } =
      await runSentinelReview(snapshot);

    let githubReview: { reviewId: number; htmlUrl?: string } | null = null;
    let postError: string | null = null;

    if (input.postToGithub !== false) {
      try {
        const event = toGithubEvent(review.verdict, Boolean(input.autoApprove));
        githubReview = await submitPullRequestReview(octokit, snapshot.ref, {
          event,
          body: reviewBodyMarkdown(review, {
            autoApprove: Boolean(input.autoApprove),
          }),
          comments: review.findings
            .filter((f) => f.path && f.line)
            .map((f) => ({
              path: f.path,
              line: f.line as number,
              body: `**${f.severity.toUpperCase()}: ${f.title}**\n\n${f.body}${
                f.suggestion ? `\n\n💡 _Suggestion:_ ${f.suggestion}` : ""
              }`,
            })),
        });
      } catch (e) {
        postError = e instanceof Error ? e.message : "Failed to post to GitHub";
        console.warn("sentinel github post failed", postError);
      }
    }

    await sb
      .from("jobs")
      .update({
        status: "succeeded",
        result: {
          review,
          github: githubReview,
          postError,
          meta: {
            model,
            promptTokens,
            completionTokens,
            completedAt: new Date().toISOString(),
            filesReviewed: snapshot.files.length,
          },
        },
        // keep snapshot slim in input already
        error: postError && !githubReview ? postError : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sentinel review failed";
    console.error("sentinel job failed", jobId, message);
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

export function enqueueSentinelReview(
  jobId: string,
  octokit: Octokit,
): void {
  setImmediate(() => {
    void processSentinelReview(jobId, octokit);
  });
}

export type { SentinelReviewResult };
