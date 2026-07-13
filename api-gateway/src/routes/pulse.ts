import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireAuth } from "../plugins/auth.js";
import { getSupabase } from "../lib/supabase.js";
import type { PlanId } from "../lib/plans.js";
import { recordUsage } from "../lib/usage.js";
import { isR2Configured, putObject, pulseObjectKey } from "../lib/r2.js";
import {
  parseBase64File,
  parseSpreadsheetBuffer,
  type DatasetProfile,
} from "../lib/pulse/parse.js";
import { enqueuePulseProcessing } from "../lib/pulse/process.js";
import {
  answerPulseQuestion,
  type PulseChatMessage,
} from "../lib/pulse/analyze.js";

const createSchema = z.object({
  title: z.string().max(200).optional(),
  filename: z.string().max(200),
  fileBase64: z.string().min(1).max(15_000_000),
  contentType: z.string().max(120).optional(),
});

const chatSchema = z.object({
  message: z.string().min(1).max(4000),
});

export const pulseRoutes: FastifyPluginAsync = async (app) => {
  /** Upload spreadsheet → create analysis session */
  app.post("/v1/pulse/sessions", async (req, reply) => {
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
      clerkUserId: req.auth!.clerkUserId,
      product: "pulse",
      plan,
      units: 1,
      metadata: { action: "session_create" },
    });

    if (!usage.allowed) {
      return reply.status(402).send({
        error: "Usage limit reached",
        ...usage,
        upgradeUrl: "/app/billing",
      });
    }

    let profile: DatasetProfile;
    let r2Key: string | null = null;
    try {
      const { buffer, contentType } = parseBase64File(parsed.data.fileBase64);
      profile = parseSpreadsheetBuffer(
        buffer,
        parsed.data.filename,
        parsed.data.contentType ?? contentType,
      );

      if (isR2Configured()) {
        const key = pulseObjectKey(req.profile!.id, parsed.data.filename);
        await putObject({
          key,
          body: buffer,
          contentType: parsed.data.contentType ?? contentType,
        });
        r2Key = key;
        await getSupabase().from("artifacts").insert({
          profile_id: req.profile!.id,
          product: "pulse",
          r2_key: key,
          content_type: parsed.data.contentType ?? contentType,
          size_bytes: buffer.length,
          metadata: { filename: parsed.data.filename },
        });
      }
    } catch (e) {
      return reply.status(400).send({
        error: e instanceof Error ? e.message : "Failed to parse spreadsheet",
      });
    }

    // Don't store huge retained rows forever in result — keep in input for chat
    const sb = getSupabase();
    const { data: job, error } = await sb
      .from("jobs")
      .insert({
        profile_id: req.profile!.id,
        product: "pulse",
        type: "dataset_session",
        status: "queued",
        input: {
          title: parsed.data.title ?? parsed.data.filename,
          filename: parsed.data.filename,
          r2_key: r2Key,
          profile,
        },
      })
      .select("*")
      .single();

    if (error || !job) {
      return reply.status(500).send({
        error: error?.message ?? "Failed to create session",
      });
    }

    enqueuePulseProcessing(job.id);

    return reply.status(201).send({
      ok: true,
      session: {
        id: job.id,
        status: job.status,
        title: parsed.data.title ?? parsed.data.filename,
        filename: parsed.data.filename,
        rowCount: profile.rowCount,
        columnCount: profile.columnCount,
        createdAt: job.created_at,
      },
      usage,
    });
  });

  app.get("/v1/pulse/sessions", async (req, reply) => {
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
      .eq("product", "pulse")
      .eq("type", "dataset_session")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    const sessions = (data ?? []).map((j) => {
      const input = j.input as {
        title?: string;
        filename?: string;
        profile?: { rowCount?: number; columnCount?: number };
      };
      return {
        id: j.id,
        status: j.status,
        title: input.title ?? input.filename ?? "Dataset",
        filename: input.filename ?? null,
        rowCount: input.profile?.rowCount ?? null,
        columnCount: input.profile?.columnCount ?? null,
        summary:
          (j.result as { bootstrap?: { summary?: string } } | null)?.bootstrap
            ?.summary ?? null,
        error: j.error,
        createdAt: j.created_at,
        updatedAt: j.updated_at,
      };
    });

    return { sessions };
  });

  app.get("/v1/pulse/sessions/:id", async (req, reply) => {
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
      .eq("product", "pulse")
      .maybeSingle();

    if (error) return reply.status(500).send({ error: error.message });
    if (!job) return reply.status(404).send({ error: "Session not found" });

    const input = job.input as {
      title?: string;
      filename?: string;
      profile?: DatasetProfile;
    };
    const result = job.result as {
      bootstrap?: unknown;
      messages?: PulseChatMessage[];
      meta?: unknown;
    } | null;

    // Strip retainedRows from profile in response (keep sample + columns)
    const profile = input.profile
      ? {
          ...input.profile,
          retainedRows: undefined,
          sampleRows: input.profile.sampleRows?.slice(0, 15) ?? [],
        }
      : null;

    return {
      session: {
        id: job.id,
        status: job.status,
        title: input.title ?? input.filename ?? "Dataset",
        filename: input.filename,
        profile,
        bootstrap: result?.bootstrap ?? null,
        messages: result?.messages ?? [],
        meta: result?.meta ?? null,
        error: job.error,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
      },
    };
  });

  /** Chat with a dataset session */
  app.post("/v1/pulse/sessions/:id/chat", async (req, reply) => {
    try {
      await requireAuth(req);
    } catch (e) {
      const err = e as Error & { statusCode?: number };
      return reply.status(err.statusCode ?? 401).send({ error: err.message });
    }

    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid body",
        details: parsed.error.flatten(),
      });
    }

    const plan = (req.subscription!.plan ?? "free") as PlanId;
    const usage = await recordUsage({
      profileId: req.profile!.id,
      clerkUserId: req.auth!.clerkUserId,
      product: "pulse",
      plan,
      units: 1,
      metadata: { action: "chat" },
    });

    if (!usage.allowed) {
      return reply.status(402).send({
        error: "Usage limit reached",
        ...usage,
        upgradeUrl: "/app/billing",
      });
    }

    const { id } = req.params as { id: string };
    const sb = getSupabase();
    const { data: job, error } = await sb
      .from("jobs")
      .select("*")
      .eq("id", id)
      .eq("profile_id", req.profile!.id)
      .eq("product", "pulse")
      .maybeSingle();

    if (error) return reply.status(500).send({ error: error.message });
    if (!job) return reply.status(404).send({ error: "Session not found" });
    if (job.status !== "succeeded") {
      return reply.status(409).send({
        error: "Session is not ready yet",
        status: job.status,
      });
    }

    const input = job.input as { profile?: DatasetProfile };
    if (!input.profile) {
      return reply.status(500).send({ error: "Session missing dataset profile" });
    }

    const result = (job.result ?? {}) as {
      bootstrap?: unknown;
      messages?: PulseChatMessage[];
      meta?: unknown;
    };

    const userMsg: PulseChatMessage = {
      role: "user",
      content: parsed.data.message,
      createdAt: new Date().toISOString(),
    };

    const history = result.messages ?? [];

    try {
      const { message: assistant, model, promptTokens, completionTokens } =
        await answerPulseQuestion({
          profile: input.profile,
          history,
          question: parsed.data.message,
        });

      const messages = [...history, userMsg, assistant];
      await sb
        .from("jobs")
        .update({
          result: {
            ...result,
            messages,
            meta: {
              ...(typeof result.meta === "object" && result.meta
                ? result.meta
                : {}),
              lastModel: model,
              lastPromptTokens: promptTokens,
              lastCompletionTokens: completionTokens,
              lastChatAt: new Date().toISOString(),
            },
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      return {
        ok: true,
        message: assistant,
        usage,
      };
    } catch (e) {
      return reply.status(500).send({
        error: e instanceof Error ? e.message : "Chat failed",
      });
    }
  });
};
