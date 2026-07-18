import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireAuth, workspaceScope } from "../plugins/auth.js";
import { getSupabase } from "../lib/supabase.js";
import { recordUsage } from "../lib/usage.js";
import type { PlanId } from "../lib/plans.js";
import { enqueueRelayProcessing } from "../lib/relay/process.js";

const createSchema = z.object({
  title: z.string().trim().max(200).optional(),
  repository: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(10000).optional(),
  pipelineData: z.string().trim().min(20).max(2_000_000),
  filename: z.string().trim().max(200).optional(),
});

export const relayRoutes: FastifyPluginAsync = async (app) => {
  app.post("/v1/relay/analyses", async (req, reply) => {
    try { await requireAuth(req); } catch (error) {
      const err = error as Error & { statusCode?: number };
      return reply.status(err.statusCode ?? 401).send({ error: err.message });
    }
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: "Invalid body", details: parsed.error.flatten() });
    const plan = (req.subscription!.plan ?? "free") as PlanId;
    const usage = await recordUsage({
      profileId: req.profile!.id,
      organizationId: req.organization?.id ?? null,
      clerkUserId: req.auth!.clerkUserId,
      product: "relay",
      plan,
      units: 1,
      metadata: { action: "pipeline_analysis" },
    });
    if (!usage.allowed) return reply.status(402).send({ error: "Usage limit reached", ...usage, upgradeUrl: "/app/billing" });
    const sb = getSupabase();
    const { data: job, error } = await sb.from("jobs").insert({
      profile_id: req.profile!.id,
      organization_id: req.organization?.id ?? null,
      request_id: req.id,
      product: "relay",
      type: "pipeline_analysis",
      status: "queued",
      input: { ...parsed.data, title: parsed.data.title ?? "CI pipeline analysis" },
    }).select("*").single();
    if (error || !job) return reply.status(500).send({ error: error?.message ?? "Failed to create Relay analysis" });
    enqueueRelayProcessing(job.id);
    return reply.status(201).send({
      ok: true,
      analysis: { id: job.id, status: job.status, title: parsed.data.title ?? "CI pipeline analysis", createdAt: job.created_at },
      usage,
    });
  });

  app.get("/v1/relay/analyses", async (req, reply) => {
    try { await requireAuth(req); } catch (error) {
      const err = error as Error & { statusCode?: number };
      return reply.status(err.statusCode ?? 401).send({ error: err.message });
    }
    const { data, error } = await getSupabase().from("jobs")
      .select("id, status, input, result, error, created_at, updated_at")
      .eq(...workspaceScope(req)).eq("product", "relay").eq("type", "pipeline_analysis")
      .order("created_at", { ascending: false }).limit(40);
    if (error) return reply.status(500).send({ error: error.message });
    return {
      analyses: (data ?? []).map((job) => {
        const input = job.input as { title?: string; repository?: string };
        const result = job.result as { report?: { summary?: string; pipeline_score?: number; findings?: unknown[] } } | null;
        return {
          id: job.id, status: job.status, title: input.title ?? "CI pipeline analysis", repository: input.repository ?? null,
          summary: result?.report?.summary ?? null, score: result?.report?.pipeline_score ?? null,
          findingCount: result?.report?.findings?.length ?? null, error: job.error,
          createdAt: job.created_at, updatedAt: job.updated_at,
        };
      }),
    };
  });

  app.get("/v1/relay/analyses/:id", async (req, reply) => {
    try { await requireAuth(req); } catch (error) {
      const err = error as Error & { statusCode?: number };
      return reply.status(err.statusCode ?? 401).send({ error: err.message });
    }
    const { id } = req.params as { id: string };
    const { data: job, error } = await getSupabase().from("jobs").select("*")
      .eq("id", id).eq(...workspaceScope(req)).eq("product", "relay").maybeSingle();
    if (error) return reply.status(500).send({ error: error.message });
    if (!job) return reply.status(404).send({ error: "Analysis not found" });
    const input = { ...(job.input as Record<string, unknown>) };
    delete input.pipelineData;
    return { analysis: { id: job.id, status: job.status, input, result: job.result, error: job.error, createdAt: job.created_at, updatedAt: job.updated_at } };
  });
};
