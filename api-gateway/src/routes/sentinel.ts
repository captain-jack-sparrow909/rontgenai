import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { env } from "../env.js";
import { requireAuth } from "../plugins/auth.js";
import { getSupabase } from "../lib/supabase.js";
import type { PlanId } from "../lib/plans.js";
import { canUseProduct } from "../lib/plans.js";
import { recordUsage } from "../lib/usage.js";
import {
  createInstallationOctokit,
  createUserTokenOctokit,
  fetchPullRequest,
  isGitHubAppConfigured,
  parsePrUrl,
} from "../lib/sentinel/github.js";
import { enqueueSentinelReview } from "../lib/sentinel/process.js";

const createSchema = z.object({
  prUrl: z.string().min(10).max(500),
  postToGithub: z.boolean().optional().default(true),
  autoApprove: z.boolean().optional().default(false),
  installationId: z.number().int().positive().optional(),
});

const claimSchema = z.object({
  installationId: z.number().int().positive(),
  accountLogin: z.string().max(200).optional(),
  accountType: z.string().max(50).optional(),
});

const settingsSchema = z.object({
  installationId: z.number().int().positive(),
  autoApprove: z.boolean().optional(),
  enabled: z.boolean().optional(),
  pathAllowlist: z.array(z.string()).optional(),
});

export const sentinelRoutes: FastifyPluginAsync = async (app) => {
  app.get("/v1/sentinel/status", async (req, reply) => {
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
      appSlug: env.GITHUB_APP_SLUG ?? null,
      installUrl: env.GITHUB_APP_SLUG
        ? `https://github.com/apps/${env.GITHUB_APP_SLUG}/installations/new`
        : null,
      planAllows: canUseProduct(plan, "sentinel"),
      plan,
    };
  });

  /** Link a GitHub App installation to the current user */
  app.post("/v1/sentinel/installations", async (req, reply) => {
    try {
      await requireAuth(req);
    } catch (e) {
      const err = e as Error & { statusCode?: number };
      return reply.status(err.statusCode ?? 401).send({ error: err.message });
    }

    const parsed = claimSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid body",
        details: parsed.error.flatten(),
      });
    }

    const sb = getSupabase();
    const { data, error } = await sb
      .from("github_installations")
      .upsert(
        {
          installation_id: parsed.data.installationId,
          profile_id: req.profile!.id,
          account_login: parsed.data.accountLogin ?? null,
          account_type: parsed.data.accountType ?? null,
          metadata: {
            autoApprove: false,
            enabled: true,
            claimedAt: new Date().toISOString(),
          },
        },
        { onConflict: "installation_id" },
      )
      .select("*")
      .single();

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    return { ok: true, installation: data };
  });

  app.get("/v1/sentinel/installations", async (req, reply) => {
    try {
      await requireAuth(req);
    } catch (e) {
      const err = e as Error & { statusCode?: number };
      return reply.status(err.statusCode ?? 401).send({ error: err.message });
    }

    const sb = getSupabase();
    const { data, error } = await sb
      .from("github_installations")
      .select("*")
      .eq("profile_id", req.profile!.id)
      .order("created_at", { ascending: false });

    if (error) return reply.status(500).send({ error: error.message });
    return { installations: data ?? [] };
  });

  app.patch("/v1/sentinel/installations/settings", async (req, reply) => {
    try {
      await requireAuth(req);
    } catch (e) {
      const err = e as Error & { statusCode?: number };
      return reply.status(err.statusCode ?? 401).send({ error: err.message });
    }

    const parsed = settingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid body",
        details: parsed.error.flatten(),
      });
    }

    const sb = getSupabase();
    const { data: existing, error: findErr } = await sb
      .from("github_installations")
      .select("*")
      .eq("installation_id", parsed.data.installationId)
      .eq("profile_id", req.profile!.id)
      .maybeSingle();

    if (findErr) return reply.status(500).send({ error: findErr.message });
    if (!existing) {
      return reply.status(404).send({ error: "Installation not found" });
    }

    const metadata = {
      ...(typeof existing.metadata === "object" && existing.metadata
        ? (existing.metadata as object)
        : {}),
      ...(parsed.data.autoApprove !== undefined
        ? { autoApprove: parsed.data.autoApprove }
        : {}),
      ...(parsed.data.enabled !== undefined
        ? { enabled: parsed.data.enabled }
        : {}),
      ...(parsed.data.pathAllowlist !== undefined
        ? { pathAllowlist: parsed.data.pathAllowlist }
        : {}),
    };

    const { data, error } = await sb
      .from("github_installations")
      .update({ metadata })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) return reply.status(500).send({ error: error.message });
    return { ok: true, installation: data };
  });

  /** Manually review a PR by URL */
  app.post("/v1/sentinel/reviews", async (req, reply) => {
    try {
      await requireAuth(req);
    } catch (e) {
      const err = e as Error & { statusCode?: number };
      return reply.status(err.statusCode ?? 401).send({ error: err.message });
    }

    const plan = (req.subscription!.plan ?? "free") as PlanId;
    if (!canUseProduct(plan, "sentinel")) {
      return reply.status(402).send({
        error: "Sentinel requires Pro or Team plan",
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
      clerkUserId: req.auth!.clerkUserId,
      product: "sentinel",
      plan,
      units: 1,
      metadata: { action: "manual_review" },
    });

    if (!usage.allowed) {
      return reply.status(402).send({
        error: "Usage limit reached",
        ...usage,
        upgradeUrl: "/app/billing",
      });
    }

    let prRef;
    try {
      prRef = parsePrUrl(parsed.data.prUrl);
    } catch (e) {
      return reply.status(400).send({
        error: e instanceof Error ? e.message : "Invalid PR URL",
      });
    }

    let octokit;
    try {
      if (parsed.data.installationId && isGitHubAppConfigured()) {
        octokit = await createInstallationOctokit(parsed.data.installationId);
      } else {
        octokit = createUserTokenOctokit();
      }
    } catch (e) {
      return reply.status(503).send({
        error: e instanceof Error ? e.message : "GitHub auth not configured",
      });
    }

    let snapshot;
    try {
      snapshot = await fetchPullRequest(octokit, prRef);
    } catch (e) {
      return reply.status(400).send({
        error: e instanceof Error ? e.message : "Failed to fetch PR",
      });
    }

    const sb = getSupabase();
    const { data: job, error } = await sb
      .from("jobs")
      .insert({
        profile_id: req.profile!.id,
        product: "sentinel",
        type: "pr_review",
        status: "queued",
        input: {
          prRef,
          prUrl: prRef.url,
          title: snapshot.title,
          author: snapshot.author,
          postToGithub: parsed.data.postToGithub,
          autoApprove: parsed.data.autoApprove,
          // store slim snapshot for processing
          snapshot: {
            ...snapshot,
            files: snapshot.files,
          },
          installationId: parsed.data.installationId ?? null,
        },
      })
      .select("*")
      .single();

    if (error || !job) {
      return reply.status(500).send({
        error: error?.message ?? "Failed to create review job",
      });
    }

    enqueueSentinelReview(job.id, octokit);

    return reply.status(201).send({
      ok: true,
      review: {
        id: job.id,
        status: job.status,
        prUrl: prRef.url,
        title: snapshot.title,
        createdAt: job.created_at,
      },
      usage,
    });
  });

  app.get("/v1/sentinel/reviews", async (req, reply) => {
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
      .eq("profile_id", req.profile!.id)
      .eq("product", "sentinel")
      .eq("type", "pr_review")
      .order("created_at", { ascending: false })
      .limit(40);

    if (error) return reply.status(500).send({ error: error.message });

    const reviews = (data ?? []).map((j) => {
      const input = j.input as {
        prUrl?: string;
        title?: string;
        author?: string;
      };
      const result = j.result as {
        review?: { verdict?: string; findings?: unknown[] };
        github?: { htmlUrl?: string };
      } | null;
      return {
        id: j.id,
        status: j.status,
        prUrl: input.prUrl ?? null,
        title: input.title ?? null,
        author: input.author ?? null,
        verdict: result?.review?.verdict ?? null,
        findingCount: result?.review?.findings?.length ?? null,
        githubReviewUrl: result?.github?.htmlUrl ?? null,
        error: j.error,
        createdAt: j.created_at,
        updatedAt: j.updated_at,
      };
    });

    return { reviews };
  });

  app.get("/v1/sentinel/reviews/:id", async (req, reply) => {
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
      .eq("profile_id", req.profile!.id)
      .eq("product", "sentinel")
      .maybeSingle();

    if (error) return reply.status(500).send({ error: error.message });
    if (!job) return reply.status(404).send({ error: "Review not found" });

    const input = job.input as Record<string, unknown>;
    // don't return full patches in detail if huge — keep metadata
    const snapshot = input.snapshot as
      | { files?: { path: string; status: string; additions: number; deletions: number }[] }
      | undefined;

    return {
      review: {
        id: job.id,
        status: job.status,
        prUrl: input.prUrl,
        title: input.title,
        author: input.author,
        postToGithub: input.postToGithub,
        autoApprove: input.autoApprove,
        files:
          snapshot?.files?.map((f) => ({
            path: f.path,
            status: f.status,
            additions: f.additions,
            deletions: f.deletions,
          })) ?? [],
        result: job.result,
        error: job.error,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
      },
    };
  });
};
