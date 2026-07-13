import type { Octokit } from "@octokit/rest";
import { getSupabase } from "../supabase.js";
import type { IssueSnapshot } from "./issue.js";
import {
  generateForgeChanges,
  generateForgePlan,
  type ForgePlan,
} from "./plan.js";
import { createBranchAndPr } from "./pr.js";

export async function processForgePlan(
  jobId: string,
  _octokit: Octokit,
): Promise<void> {
  const sb = getSupabase();
  const { data: job, error } = await sb
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (error || !job) {
    console.error("forge job not found", jobId, error);
    return;
  }

  const input = job.input as { issue?: IssueSnapshot; stage?: string };
  if (input.stage && input.stage !== "planning") return;

  await sb
    .from("jobs")
    .update({ status: "running", updated_at: new Date().toISOString() })
    .eq("id", jobId);

  try {
    if (!input.issue) throw new Error("Missing issue snapshot");

    const { plan, model, promptTokens, completionTokens } =
      await generateForgePlan(input.issue);

    await sb
      .from("jobs")
      .update({
        status: "succeeded",
        input: {
          ...input,
          stage: "awaiting_approval",
        },
        result: {
          stage: "awaiting_approval",
          plan,
          meta: {
            planModel: model,
            planPromptTokens: promptTokens,
            planCompletionTokens: completionTokens,
            plannedAt: new Date().toISOString(),
          },
        },
        error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Planning failed";
    console.error("forge plan failed", jobId, message);
    await sb
      .from("jobs")
      .update({
        status: "failed",
        error: message,
        result: { stage: "failed" },
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  }
}

export async function processForgeImplement(
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
    console.error("forge job not found", jobId, error);
    return;
  }

  const input = job.input as {
    issue?: IssueSnapshot;
    stage?: string;
  };
  const result = (job.result ?? {}) as {
    plan?: ForgePlan;
    meta?: Record<string, unknown>;
  };

  if (!input.issue || !result.plan) {
    await sb
      .from("jobs")
      .update({
        status: "failed",
        error: "Missing plan or issue for implementation",
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    return;
  }

  await sb
    .from("jobs")
    .update({
      status: "running",
      input: { ...input, stage: "implementing" },
      result: { ...result, stage: "implementing" },
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  try {
    // Ensure planned files are in context (may not have been in the initial sample)
    const issue = { ...input.issue };
    const have = new Set(issue.contextFiles.map((f) => f.path));
    for (const f of result.plan.files_to_touch) {
      if (f.action === "create" || have.has(f.path)) continue;
      try {
        const { data } = await octokit.repos.getContent({
          owner: issue.ref.owner,
          repo: issue.ref.repo,
          path: f.path,
          ref: issue.defaultBranch,
        });
        if (!Array.isArray(data) && data.type === "file" && "content" in data) {
          const text = Buffer.from(data.content, "base64")
            .toString("utf8")
            .slice(0, 12_000);
          issue.contextFiles.push({ path: f.path, content: text });
          have.add(f.path);
        }
      } catch {
        /* new file or missing */
      }
    }

    const {
      changes,
      prTitle,
      prBody,
      model,
      promptTokens,
      completionTokens,
    } = await generateForgeChanges({
      issue,
      plan: result.plan,
    });

    const pr = await createBranchAndPr(octokit, {
      issue: input.issue.ref,
      defaultBranch: input.issue.defaultBranch,
      changes,
      prTitle,
      prBody,
    });

    await sb
      .from("jobs")
      .update({
        status: "succeeded",
        input: { ...input, stage: "done" },
        result: {
          stage: "done",
          plan: result.plan,
          changes: changes.map((c) => ({
            path: c.path,
            action: c.action,
            note: c.note,
            // omit full content from stored result size if huge — keep short preview
            contentPreview: c.content?.slice(0, 500) ?? null,
            bytes: c.content?.length ?? 0,
          })),
          pr,
          meta: {
            ...(result.meta ?? {}),
            implementModel: model,
            implementPromptTokens: promptTokens,
            implementCompletionTokens: completionTokens,
            completedAt: new Date().toISOString(),
          },
        },
        error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Implementation failed";
    console.error("forge implement failed", jobId, message);
    await sb
      .from("jobs")
      .update({
        status: "failed",
        error: message,
        result: {
          ...result,
          stage: "failed",
        },
        input: { ...input, stage: "failed" },
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  }
}

export function enqueueForgePlan(jobId: string, octokit: Octokit): void {
  setImmediate(() => {
    void processForgePlan(jobId, octokit);
  });
}

export function enqueueForgeImplement(jobId: string, octokit: Octokit): void {
  setImmediate(() => {
    void processForgeImplement(jobId, octokit);
  });
}
