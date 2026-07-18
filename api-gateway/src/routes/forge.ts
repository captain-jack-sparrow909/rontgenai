import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { env } from "../env.js";
import {
  requireAuth,
  requireWorkspaceRole,
  workspaceScope,
} from "../plugins/auth.js";
import { getSupabase } from "../lib/supabase.js";
import type { PlanId } from "../lib/plans.js";
import { canUseProduct } from "../lib/plans.js";
import { recordUsage } from "../lib/usage.js";
import {
  createInstallationOctokit,
  createUserTokenOctokit,
  isGitHubAppConfigured,
} from "../lib/sentinel/github.js";
import { fetchIssueSnapshot, parseIssueUrl } from "../lib/forge/issue.js";
import {
  enqueueForgeImplement,
  enqueueForgePlan,
} from "../lib/forge/process.js";
import type { ForgePlan } from "../lib/forge/plan.js";
import type { IssueSnapshot } from "../lib/forge/issue.js";
import { discoverOpenSourceIssues } from "../lib/forge/discover.js";

const createSchema = z.object({
  issueUrl: z.string().min(10).max(500),
  installationId: z.number().int().positive().optional(),
});

const discoverSchema = z.object({
  query: z.string().trim().max(120).optional(),
  language: z.string().trim().max(40).optional(),
  organization: z.string().trim().max(80).optional(),
  labels: z.array(z.string().trim().min(1).max(50)).max(3).optional(),
  beginnerFriendly: z.boolean().default(true),
  unassignedOnly: z.boolean().default(true),
  limit: z.number().int().min(1).max(20).default(12),
});

function resolveOctokit(installationId?: number) {
  if (installationId && isGitHubAppConfigured()) {
    return createInstallationOctokit(installationId);
  }
  return Promise.resolve(createUserTokenOctokit());
}

export const forgeRoutes: FastifyPluginAsync = async (app) => {
  app.get("/v1/forge/status", async (req, reply) => {
    try {
      await requireAuth(req);
    } catch (e) {
      const err = e as Error & { statusCode?: number };
      return reply.status(err.statusCode ?? 401).send({ error: err.message });
    }

    const plan = (req.subscription!.plan ?? "free") as PlanId;
    return {
      githubAppConfigured: isGitHubAppConfigured(),
      githubTokenConfigured: Boolean(env.GITHUB_TOKEN),
      planAllows: canUseProduct(plan, "forge"),
      plan,
    };
  });

  app.post("/v1/forge/issues/discover", async (req, reply) => {
    try {
      await requireAuth(req);
    } catch (e) {
      const err = e as Error & { statusCode?: number };
      return reply.status(err.statusCode ?? 401).send({ error: err.message });
    }

    const plan = (req.subscription!.plan ?? "free") as PlanId;
    if (!canUseProduct(plan, "forge")) {
      return reply.status(402).send({
        error: "Forge issue discovery requires Pro or Team plan",
        upgradeUrl: "/app/billing",
      });
    }

    const parsed = discoverSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid body",
        details: parsed.error.flatten(),
      });
    }

    try {
      const octokit = await resolveOctokit();
      return await discoverOpenSourceIssues(octokit, parsed.data);
    } catch (e) {
      return reply.status(503).send({
        error: e instanceof Error ? e.message : "GitHub issue discovery unavailable",
      });
    }
  });

  /** Start Forge: fetch issue + generate plan (awaiting approval) */
  app.post("/v1/forge/jobs", async (req, reply) => {
    try {
      await requireAuth(req);
    } catch (e) {
      const err = e as Error & { statusCode?: number };
      return reply.status(err.statusCode ?? 401).send({ error: err.message });
    }

    const plan = (req.subscription!.plan ?? "free") as PlanId;
    if (!canUseProduct(plan, "forge")) {
      return reply.status(402).send({
        error: "Forge requires Pro or Team plan",
        upgradeUrl: "/app/billing",
      });
    }

    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid body",
        details: parsed.error.flatten(),
      });
    }

    const usage = await recordUsage({
      profileId: req.profile!.id,
      organizationId: req.organization?.id ?? null,
      clerkUserId: req.auth!.clerkUserId,
      product: "forge",
      plan,
      units: 1,
      metadata: { action: "plan" },
    });

    if (!usage.allowed) {
      return reply.status(402).send({
        error: "Usage limit reached",
        ...usage,
        upgradeUrl: "/app/billing",
      });
    }

    let issueRef;
    try {
      issueRef = parseIssueUrl(parsed.data.issueUrl);
    } catch (e) {
      return reply.status(400).send({
        error: e instanceof Error ? e.message : "Invalid issue URL",
      });
    }

    let octokit;
    try {
      octokit = await resolveOctokit(parsed.data.installationId);
    } catch (e) {
      return reply.status(503).send({
        error: e instanceof Error ? e.message : "GitHub auth not configured",
      });
    }

    let issue: IssueSnapshot;
    try {
      issue = await fetchIssueSnapshot(octokit, issueRef);
    } catch (e) {
      return reply.status(400).send({
        error: e instanceof Error ? e.message : "Failed to fetch issue",
      });
    }

    const sb = getSupabase();
    const { data: job, error } = await sb
      .from("jobs")
      .insert({
        profile_id: req.profile!.id,
        organization_id: req.organization?.id ?? null,
        request_id: req.id,
        product: "forge",
        type: "issue_solve",
        status: "queued",
        input: {
          stage: "planning",
          issueUrl: issueRef.url,
          issueRef,
          issueTitle: issue.title,
          installationId: parsed.data.installationId ?? null,
          issue,
        },
      })
      .select("*")
      .single();

    if (error || !job) {
      return reply.status(500).send({
        error: error?.message ?? "Failed to create job",
      });
    }

    enqueueForgePlan(job.id, octokit);

    return reply.status(201).send({
      ok: true,
      job: {
        id: job.id,
        status: job.status,
        stage: "planning",
        issueUrl: issueRef.url,
        title: issue.title,
        createdAt: job.created_at,
      },
      usage,
    });
  });

  app.get("/v1/forge/jobs", async (req, reply) => {
    try {
      await requireAuth(req);
    } catch (e) {
      const err = e as Error & { statusCode?: number };
      return reply.status(err.statusCode ?? 401).send({ error: err.message });
    }

    const sb = getSupabase();
    const { data, error } = await sb
      .from("jobs")
      .select("id, status, input, result, error, created_at, updated_at")
      .eq(...workspaceScope(req))
      .eq("product", "forge")
      .eq("type", "issue_solve")
      .order("created_at", { ascending: false })
      .limit(40);

    if (error) return reply.status(500).send({ error: error.message });

    const jobs = (data ?? []).map((j) => {
      const input = j.input as {
        issueUrl?: string;
        issueTitle?: string;
        stage?: string;
      };
      const result = j.result as {
        stage?: string;
        plan?: { complexity?: string; summary?: string };
        pr?: { htmlUrl?: string; number?: number };
      } | null;
      return {
        id: j.id,
        status: j.status,
        stage: result?.stage ?? input.stage ?? "unknown",
        issueUrl: input.issueUrl ?? null,
        title: input.issueTitle ?? null,
        planSummary: result?.plan?.summary ?? null,
        complexity: result?.plan?.complexity ?? null,
        prUrl: result?.pr?.htmlUrl ?? null,
        prNumber: result?.pr?.number ?? null,
        error: j.error,
        createdAt: j.created_at,
        updatedAt: j.updated_at,
      };
    });

    return { jobs };
  });

  app.get("/v1/forge/jobs/:id", async (req, reply) => {
    try {
      await requireAuth(req);
    } catch (e) {
      const err = e as Error & { statusCode?: number };
      return reply.status(err.statusCode ?? 401).send({ error: err.message });
    }

    const { id } = req.params as { id: string };
    const sb = getSupabase();
    const { data: job, error } = await sb
      .from("jobs")
      .select("*")
      .eq("id", id)
      .eq(...workspaceScope(req))
      .eq("product", "forge")
      .maybeSingle();

    if (error) return reply.status(500).send({ error: error.message });
    if (!job) return reply.status(404).send({ error: "Job not found" });

    const input = job.input as {
      issueUrl?: string;
      issueTitle?: string;
      issueRef?: unknown;
      stage?: string;
      issue?: IssueSnapshot;
      installationId?: number | null;
    };

    // Slim issue for response (drop huge file bodies)
    const issueSlim = input.issue
      ? {
          ref: input.issue.ref,
          title: input.issue.title,
          body: input.issue.body,
          author: input.issue.author,
          labels: input.issue.labels,
          state: input.issue.state,
          defaultBranch: input.issue.defaultBranch,
          topLevel: input.issue.topLevel,
          languages: input.issue.languages,
          contextFilePaths: input.issue.contextFiles.map((f) => f.path),
          comments: input.issue.comments,
        }
      : null;

    return {
      job: {
        id: job.id,
        status: job.status,
        stage:
          (job.result as { stage?: string } | null)?.stage ??
          input.stage ??
          "unknown",
        issueUrl: input.issueUrl,
        issue: issueSlim,
        result: job.result,
        error: job.error,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
      },
    };
  });

  /** Approve plan → generate code + open PR */
  app.post("/v1/forge/jobs/:id/approve", async (req, reply) => {
    try {
      await requireAuth(req);
      requireWorkspaceRole(req, ["owner", "admin"]);
    } catch (e) {
      const err = e as Error & { statusCode?: number };
      return reply.status(err.statusCode ?? 401).send({ error: err.message });
    }

    const plan = (req.subscription!.plan ?? "free") as PlanId;
    if (!canUseProduct(plan, "forge")) {
      return reply.status(402).send({
        error: "Forge requires Pro or Team plan",
        upgradeUrl: "/app/billing",
      });
    }

    const { id } = req.params as { id: string };
    const sb = getSupabase();
    const { data: job, error } = await sb
      .from("jobs")
      .select("*")
      .eq("id", id)
      .eq(...workspaceScope(req))
      .eq("product", "forge")
      .maybeSingle();

    if (error) return reply.status(500).send({ error: error.message });
    if (!job) return reply.status(404).send({ error: "Job not found" });

    const result = job.result as {
      stage?: string;
      plan?: ForgePlan;
    } | null;
    const input = job.input as {
      stage?: string;
      installationId?: number | null;
    };

    if (result?.stage !== "awaiting_approval" || !result.plan) {
      return reply.status(409).send({
        error: "Job is not awaiting plan approval",
        stage: result?.stage ?? input.stage,
      });
    }

    // Meter implement as another unit
    const usage = await recordUsage({
      profileId: req.profile!.id,
      organizationId: req.organization?.id ?? null,
      clerkUserId: req.auth!.clerkUserId,
      product: "forge",
      plan,
      units: 1,
      metadata: { action: "implement", jobId: id },
    });

    if (!usage.allowed) {
      return reply.status(402).send({
        error: "Usage limit reached",
        ...usage,
        upgradeUrl: "/app/billing",
      });
    }

    let octokit;
    try {
      octokit = await resolveOctokit(input.installationId ?? undefined);
    } catch (e) {
      return reply.status(503).send({
        error: e instanceof Error ? e.message : "GitHub auth not configured",
      });
    }

    const { error: queueError } = await sb
      .from("jobs")
      .update({
        status: "queued",
        input: { ...input, stage: "implementation_queued" },
        result: { ...result, stage: "implementation_queued" },
        error: null,
        attempt_count: 0,
        available_at: new Date().toISOString(),
        locked_at: null,
        locked_by: null,
        last_heartbeat_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (queueError) {
      return reply.status(500).send({ error: queueError.message });
    }

    enqueueForgeImplement(id, octokit);

    return {
      ok: true,
      message: "Implementation started",
      usage,
    };
  });

  app.post("/v1/forge/jobs/:id/reject", async (req, reply) => {
    try {
      await requireAuth(req);
      requireWorkspaceRole(req, ["owner", "admin"]);
    } catch (e) {
      const err = e as Error & { statusCode?: number };
      return reply.status(err.statusCode ?? 401).send({ error: err.message });
    }

    const { id } = req.params as { id: string };
    const sb = getSupabase();
    const { data: job, error } = await sb
      .from("jobs")
      .select("*")
      .eq("id", id)
      .eq(...workspaceScope(req))
      .eq("product", "forge")
      .maybeSingle();

    if (error) return reply.status(500).send({ error: error.message });
    if (!job) return reply.status(404).send({ error: "Job not found" });

    const result = (job.result ?? {}) as Record<string, unknown>;
    const input = (job.input ?? {}) as Record<string, unknown>;

    if (result.stage !== "awaiting_approval") {
      return reply.status(409).send({
        error: "Only plans awaiting approval can be rejected",
        stage: result.stage,
      });
    }

    await sb
      .from("jobs")
      .update({
        status: "canceled",
        input: { ...input, stage: "rejected" },
        result: { ...result, stage: "rejected" },
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    return { ok: true, stage: "rejected" };
  });
};
