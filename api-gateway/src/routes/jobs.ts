import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { env } from "../env.js";
import { requireAuth, workspaceScope } from "../plugins/auth.js";
import { getSupabase } from "../lib/supabase.js";
import type { PlanId, ProductId } from "../lib/plans.js";
import { recordUsage } from "../lib/usage.js";

const enqueueSchema = z.object({
  product: z.enum([
    "blueprint",
    "pulse",
    "atlas",
    "sentinel",
    "forge",
    "radar",
    "relay",
  ]),
  type: z.string().min(1).max(64),
  input: z.record(z.string(), z.unknown()).default({}),
});

/**
 * Job enqueue stub. Persists to `jobs` table and optionally emits Inngest event.
 * AI workers pick these up in later phases.
 */
export const jobRoutes: FastifyPluginAsync = async (app) => {
  app.post("/v1/jobs", async (req, reply) => {
    if (!env.ENABLE_GENERIC_JOB_API) {
      return reply.status(404).send({ error: "Not found" });
    }
    try {
      await requireAuth(req);
    } catch (e) {
      const err = e as Error & { statusCode?: number };
      return reply.status(err.statusCode ?? 401).send({ error: err.message });
    }

    const parsed = enqueueSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid body",
        details: parsed.error.flatten(),
      });
    }

    const plan = (req.subscription!.plan ?? "free") as PlanId;
    const product = parsed.data.product as ProductId;

    const usage = await recordUsage({
      profileId: req.profile!.id,
      organizationId: req.organization?.id ?? null,
      clerkUserId: req.auth!.clerkUserId,
      product,
      plan,
      units: 1,
      metadata: { jobType: parsed.data.type },
    });

    if (!usage.allowed) {
      return reply.status(402).send({
        error: "Usage limit reached",
        ...usage,
        upgradeUrl: "/app/billing",
      });
    }

    const sb = getSupabase();
    const { data: job, error } = await sb
      .from("jobs")
      .insert({
        profile_id: req.profile!.id,
        organization_id: req.organization?.id ?? null,
        request_id: req.id,
        product,
        type: parsed.data.type,
        status: "queued",
        input: parsed.data.input,
      })
      .select("*")
      .single();

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    let inngestRunId: string | null = null;
    if (env.INNGEST_EVENT_KEY) {
      try {
        const res = await fetch("https://inn.gs/e/" + env.INNGEST_EVENT_KEY, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `rontgen/${product}.job`,
            data: {
              jobId: job.id,
              product,
              type: parsed.data.type,
              profileId: req.profile!.id,
            },
          }),
        });
        if (res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            ids?: string[];
          };
          inngestRunId = body.ids?.[0] ?? null;
          if (inngestRunId) {
            await sb
              .from("jobs")
              .update({ inngest_run_id: inngestRunId })
              .eq("id", job.id);
          }
        }
      } catch (e) {
        console.warn("inngest emit failed", e);
      }
    }

    return reply.status(201).send({
      ok: true,
      job: {
        id: job.id,
        status: job.status,
        product: job.product,
        type: job.type,
        inngestRunId,
      },
      usage,
    });
  });

  app.get("/v1/jobs/:id", async (req, reply) => {
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
      .maybeSingle();

    if (error) {
      return reply.status(500).send({ error: error.message });
    }
    if (!job) {
      return reply.status(404).send({ error: "Job not found" });
    }

    return { job };
  });
};
