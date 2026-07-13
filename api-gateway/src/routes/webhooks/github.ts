import type { FastifyPluginAsync } from "fastify";
import { verify } from "@octokit/webhooks-methods";
import { env } from "../../env.js";
import { getSupabase } from "../../lib/supabase.js";
import type { PlanId } from "../../lib/plans.js";
import { canUseProduct } from "../../lib/plans.js";
import { recordUsage } from "../../lib/usage.js";
import {
  createInstallationOctokit,
  fetchPullRequest,
  isGitHubAppConfigured,
  type PrRef,
} from "../../lib/sentinel/github.js";
import { enqueueSentinelReview } from "../../lib/sentinel/process.js";

type GhPullPayload = {
  action?: string;
  installation?: { id?: number };
  pull_request?: {
    number?: number;
    title?: string;
    user?: { login?: string };
    draft?: boolean;
    html_url?: string;
  };
  repository?: {
    name?: string;
    owner?: { login?: string };
    full_name?: string;
  };
};

/**
 * GitHub App webhook for Sentinel.
 * Configure: pull_request [opened, synchronize, reopened, ready_for_review]
 */
export const githubWebhookRoutes: FastifyPluginAsync = async (app) => {
  app.post("/v1/webhooks/github", async (req, reply) => {
    const rawBody =
      req.rawBody ??
      (typeof req.body === "string"
        ? req.body
        : JSON.stringify(req.body ?? {}));

    const signature = req.headers["x-hub-signature-256"] as string | undefined;
    const event = req.headers["x-github-event"] as string | undefined;

    if (env.GITHUB_WEBHOOK_SECRET) {
      if (!signature) {
        return reply.status(401).send({ error: "Missing signature" });
      }
      const ok = await verify(env.GITHUB_WEBHOOK_SECRET, rawBody, signature);
      if (!ok) {
        return reply.status(401).send({ error: "Invalid signature" });
      }
    } else if (env.NODE_ENV === "production") {
      return reply.status(500).send({ error: "GITHUB_WEBHOOK_SECRET not set" });
    }

    if (event === "ping") {
      return { ok: true, pong: true };
    }

    if (event === "installation") {
      return { ok: true, ignored: "installation" };
    }

    if (event !== "pull_request") {
      return { ok: true, ignored: event };
    }

    const payload = (
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.rawBody
          ? JSON.parse(req.rawBody)
          : req.body
    ) as GhPullPayload;

    const action = payload.action;
    if (
      !action ||
      !["opened", "synchronize", "reopened", "ready_for_review"].includes(action)
    ) {
      return { ok: true, ignored: action };
    }

    if (payload.pull_request?.draft && action !== "ready_for_review") {
      return { ok: true, ignored: "draft" };
    }

    const installationId = payload.installation?.id;
    const owner = payload.repository?.owner?.login;
    const repo = payload.repository?.name;
    const number = payload.pull_request?.number;

    if (!installationId || !owner || !repo || !number) {
      return reply.status(400).send({ error: "Incomplete PR payload" });
    }

    if (!isGitHubAppConfigured()) {
      return reply.status(503).send({ error: "GitHub App not configured" });
    }

    const sb = getSupabase();
    const { data: installation } = await sb
      .from("github_installations")
      .select("*")
      .eq("installation_id", installationId)
      .maybeSingle();

    const metadata = (installation?.metadata ?? {}) as {
      enabled?: boolean;
      autoApprove?: boolean;
    };

    if (installation && metadata.enabled === false) {
      return { ok: true, ignored: "disabled" };
    }

    // Need a profile for metering; if unclaimed, still review if token works but skip usage account
    let profileId = installation?.profile_id as string | null;
    let clerkUserId: string | null = null;
    let plan: PlanId = "free";

    if (profileId) {
      const { data: profile } = await sb
        .from("profiles")
        .select("id, clerk_user_id")
        .eq("id", profileId)
        .maybeSingle();
      clerkUserId = profile?.clerk_user_id ?? null;

      const { data: sub } = await sb
        .from("subscriptions")
        .select("plan")
        .eq("profile_id", profileId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      plan = (sub?.plan as PlanId) ?? "free";

      if (!canUseProduct(plan, "sentinel")) {
        return {
          ok: true,
          ignored: "plan_blocks_sentinel",
          plan,
        };
      }

      if (clerkUserId) {
        const usage = await recordUsage({
          profileId,
          clerkUserId,
          product: "sentinel",
          plan,
          units: 1,
          metadata: {
            action: "webhook_pr",
            pr: `${owner}/${repo}#${number}`,
          },
        });
        if (!usage.allowed) {
          return { ok: true, ignored: "usage_limit", usage };
        }
      }
    }

    const prRef: PrRef = {
      owner,
      repo,
      number,
      url:
        payload.pull_request?.html_url ??
        `https://github.com/${owner}/${repo}/pull/${number}`,
    };

    let octokit;
    try {
      octokit = await createInstallationOctokit(installationId);
    } catch (e) {
      return reply.status(500).send({
        error: e instanceof Error ? e.message : "Installation auth failed",
      });
    }

    let snapshot;
    try {
      snapshot = await fetchPullRequest(octokit, prRef);
    } catch (e) {
      return reply.status(500).send({
        error: e instanceof Error ? e.message : "Failed to fetch PR",
      });
    }

    const { data: job, error } = await sb
      .from("jobs")
      .insert({
        profile_id: profileId,
        product: "sentinel",
        type: "pr_review",
        status: "queued",
        input: {
          prRef,
          prUrl: prRef.url,
          title: snapshot.title,
          author: snapshot.author,
          postToGithub: true,
          autoApprove: Boolean(metadata.autoApprove),
          snapshot,
          installationId,
          source: "webhook",
          action,
        },
      })
      .select("id")
      .single();

    if (error || !job) {
      return reply.status(500).send({
        error: error?.message ?? "Failed to enqueue review",
      });
    }

    enqueueSentinelReview(job.id, octokit);

    return {
      ok: true,
      jobId: job.id,
      pr: prRef.url,
    };
  });
};
