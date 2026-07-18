import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireAuth, workspaceScope } from "../plugins/auth.js";
import { getSupabase } from "../lib/supabase.js";
import type { PlanId } from "../lib/plans.js";
import { recordUsage } from "../lib/usage.js";
import { artifactExpiresAt, isR2Configured, putObject } from "../lib/r2.js";
import { randomUUID } from "node:crypto";
import {
  emptyLogSignalSummary,
  parseBase64Log,
  parseLogText,
} from "../lib/radar/parse.js";
import { enqueueRadarInvestigation } from "../lib/radar/process.js";

const createSchema = z
  .object({
    title: z.string().max(200).optional(),
    description: z.string().max(10000).optional(),
    metricsNotes: z.string().max(10000).optional(),
    /** Raw log text */
    logs: z.string().max(2_000_000).optional(),
    /** Base64 or data URL log file */
    logBase64: z.string().max(3_500_000).optional(),
    filename: z.string().max(200).optional(),
    operationsContext: z
      .object({
        deployment: z.string().trim().max(8000).optional(),
        infrastructureChanges: z.string().trim().max(8000).optional(),
        alerts: z.string().trim().max(8000).optional(),
        serviceTopology: z.string().trim().max(8000).optional(),
      })
      .optional(),
  })
  .refine((v) => {
    const operations = v.operationsContext;
    return (
      Boolean(v.logs?.trim()) ||
      Boolean(v.logBase64) ||
      Boolean(
        operations &&
          Object.values(operations).some((value) => value?.trim()),
      )
    );
  }, {
    message: "Provide logs or operational context",
  });

export const radarRoutes: FastifyPluginAsync = async (app) => {
  app.post("/v1/radar/investigations", async (req, reply) => {
    try {
      await requireAuth(req);
    } catch (e) {
      const err = e as Error & { statusCode?: number };
      return reply.status(err.statusCode ?? 401).send({ error: err.message });
    }

    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid body",
        details: parsed.error.flatten(),
      });
    }

    const plan = (req.subscription!.plan ?? "free") as PlanId;
    const usage = await recordUsage({
      profileId: req.profile!.id,
      organizationId: req.organization?.id ?? null,
      clerkUserId: req.auth!.clerkUserId,
      product: "radar",
      plan,
      units: 1,
      metadata: { action: "investigate" },
    });

    if (!usage.allowed) {
      return reply.status(402).send({
        error: "Usage limit reached",
        ...usage,
        upgradeUrl: "/app/billing",
      });
    }

    let logText: string;
    try {
      if (parsed.data.logBase64) {
        logText = parseBase64Log(parsed.data.logBase64);
      } else {
        logText = parsed.data.logs ?? "";
      }
      const summary = logText.trim()
        ? parseLogText(logText).summary
        : emptyLogSignalSummary();

      let r2Key: string | null = null;
      if (isR2Configured() && logText.length > 0) {
        const key = `radar/${req.profile!.id}/${Date.now()}-${randomUUID().slice(0, 8)}.log`;
        await putObject({
          key,
          body: Buffer.from(logText, "utf8"),
          contentType: "text/plain",
        });
        r2Key = key;
        await getSupabase().from("artifacts").insert({
          profile_id: req.profile!.id,
          organization_id: req.organization?.id ?? null,
          product: "radar",
          r2_key: key,
          content_type: "text/plain",
          size_bytes: Buffer.byteLength(logText, "utf8"),
          expires_at: artifactExpiresAt(),
          metadata: { filename: parsed.data.filename ?? "incident.log" },
        });
      }

      const sb = getSupabase();
      const { data: job, error } = await sb
        .from("jobs")
        .insert({
          profile_id: req.profile!.id,
          organization_id: req.organization?.id ?? null,
          request_id: req.id,
          product: "radar",
          type: "incident_investigation",
          status: "queued",
          input: {
            title: parsed.data.title ?? "Incident investigation",
            description: parsed.data.description ?? null,
            metricsNotes: parsed.data.metricsNotes ?? null,
            operationsContext: parsed.data.operationsContext ?? null,
            r2_key: r2Key,
            filename: parsed.data.filename ?? null,
            summary,
            // keep a small raw excerpt for UI, not full dump
            logExcerpt: logText.slice(0, 4000),
          },
        })
        .select("*")
        .single();

      if (error || !job) {
        return reply.status(500).send({
          error: error?.message ?? "Failed to create investigation",
        });
      }

      enqueueRadarInvestigation(job.id);

      return reply.status(201).send({
        ok: true,
        investigation: {
          id: job.id,
          status: job.status,
          title: parsed.data.title ?? "Incident investigation",
          errorCount: summary.errorCount,
          warnCount: summary.warnCount,
          totalLines: summary.totalLines,
          createdAt: job.created_at,
        },
        usage,
      });
    } catch (e) {
      return reply.status(400).send({
        error: e instanceof Error ? e.message : "Failed to parse logs",
      });
    }
  });

  app.get("/v1/radar/investigations", async (req, reply) => {
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
      .eq("product", "radar")
      .eq("type", "incident_investigation")
      .order("created_at", { ascending: false })
      .limit(40);

    if (error) return reply.status(500).send({ error: error.message });

    const investigations = (data ?? []).map((j) => {
      const input = j.input as {
        title?: string;
        summary?: { errorCount?: number; totalLines?: number };
      };
      const result = j.result as {
        report?: { severity?: string; incident_summary?: string };
      } | null;
      return {
        id: j.id,
        status: j.status,
        title: input.title ?? "Investigation",
        severity: result?.report?.severity ?? null,
        summary: result?.report?.incident_summary ?? null,
        errorCount: input.summary?.errorCount ?? null,
        totalLines: input.summary?.totalLines ?? null,
        error: j.error,
        createdAt: j.created_at,
        updatedAt: j.updated_at,
      };
    });

    return { investigations };
  });

  app.get("/v1/radar/investigations/:id", async (req, reply) => {
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
      .eq("product", "radar")
      .maybeSingle();

    if (error) return reply.status(500).send({ error: error.message });
    if (!job) {
      return reply.status(404).send({ error: "Investigation not found" });
    }

    const input = job.input as Record<string, unknown>;
    // Drop heavy sample lines from summary for response if needed
    const summary = input.summary as
      | {
          totalLines?: number;
          errorCount?: number;
          warnCount?: number;
          levels?: Record<string, number>;
          topServices?: unknown;
          topErrorSignatures?: unknown;
          timeRange?: unknown;
        }
      | undefined;

    return {
      investigation: {
        id: job.id,
        status: job.status,
        title: input.title,
        description: input.description,
        metricsNotes: input.metricsNotes,
        operationsContext: input.operationsContext,
        logExcerpt: input.logExcerpt,
        signals: summary
          ? {
              totalLines: summary.totalLines,
              errorCount: summary.errorCount,
              warnCount: summary.warnCount,
              levels: summary.levels,
              topServices: summary.topServices,
              topErrorSignatures: summary.topErrorSignatures,
              timeRange: summary.timeRange,
            }
          : null,
        result: job.result,
        error: job.error,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
      },
    };
  });
};
