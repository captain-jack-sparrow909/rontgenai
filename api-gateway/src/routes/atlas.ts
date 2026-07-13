import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireAuth } from "../plugins/auth.js";
import { getSupabase } from "../lib/supabase.js";
import type { PlanId } from "../lib/plans.js";
import { recordUsage } from "../lib/usage.js";
import { fetchPublicRepoSnapshot, type RepoSnapshot } from "../lib/atlas/github.js";
import { enqueueAtlasProcessing } from "../lib/atlas/process.js";
import {
  answerAtlasQuestion,
  type AtlasChatMessage,
  type AtlasReport,
} from "../lib/atlas/analyze.js";

const createSchema = z.object({
  repoUrl: z.string().min(3).max(500),
});

const chatSchema = z.object({
  message: z.string().min(1).max(4000),
});

/** Strip large key file bodies from API responses */
function slimSnapshot(snap: RepoSnapshot) {
  return {
    ref: snap.ref,
    meta: snap.meta,
    tree: {
      totalFiles: snap.tree.totalFiles,
      totalDirs: snap.tree.totalDirs,
      topLevel: snap.tree.topLevel,
      extensions: snap.tree.extensions,
      directories: snap.tree.directories.slice(0, 40),
      importantPaths: snap.tree.importantPaths.slice(0, 40),
    },
    readmePreview: snap.readme?.slice(0, 2000) ?? null,
    keyFilePaths: snap.keyFiles.map((f) => f.path),
  };
}

export const atlasRoutes: FastifyPluginAsync = async (app) => {
  app.post("/v1/atlas/maps", async (req, reply) => {
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
      product: "atlas",
      plan,
      units: 1,
      metadata: { action: "map_create" },
    });

    if (!usage.allowed) {
      return reply.status(402).send({
        error: "Usage limit reached",
        ...usage,
        upgradeUrl: "/app/billing",
      });
    }

    let snapshot: RepoSnapshot;
    try {
      snapshot = await fetchPublicRepoSnapshot(parsed.data.repoUrl);
    } catch (e) {
      return reply.status(400).send({
        error: e instanceof Error ? e.message : "Failed to fetch repository",
      });
    }

    const sb = getSupabase();
    const { data: job, error } = await sb
      .from("jobs")
      .insert({
        profile_id: req.profile!.id,
        product: "atlas",
        type: "repo_map",
        status: "queued",
        input: {
          repoUrl: snapshot.ref.url,
          fullName: snapshot.ref.fullName,
          snapshot,
        },
      })
      .select("*")
      .single();

    if (error || !job) {
      return reply.status(500).send({
        error: error?.message ?? "Failed to create map job",
      });
    }

    enqueueAtlasProcessing(job.id);

    return reply.status(201).send({
      ok: true,
      map: {
        id: job.id,
        status: job.status,
        fullName: snapshot.ref.fullName,
        url: snapshot.ref.url,
        stars: snapshot.meta.stars,
        language: snapshot.meta.language,
        createdAt: job.created_at,
      },
      usage,
    });
  });

  app.get("/v1/atlas/maps", async (req, reply) => {
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
      .eq("product", "atlas")
      .eq("type", "repo_map")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) return reply.status(500).send({ error: error.message });

    const maps = (data ?? []).map((j) => {
      const input = j.input as {
        fullName?: string;
        repoUrl?: string;
        snapshot?: { meta?: { stars?: number; language?: string | null } };
      };
      return {
        id: j.id,
        status: j.status,
        fullName: input.fullName ?? "repo",
        url: input.repoUrl ?? null,
        stars: input.snapshot?.meta?.stars ?? null,
        language: input.snapshot?.meta?.language ?? null,
        summary:
          (j.result as { report?: { summary?: string } } | null)?.report
            ?.summary ?? null,
        error: j.error,
        createdAt: j.created_at,
        updatedAt: j.updated_at,
      };
    });

    return { maps };
  });

  app.get("/v1/atlas/maps/:id", async (req, reply) => {
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
      .eq("product", "atlas")
      .maybeSingle();

    if (error) return reply.status(500).send({ error: error.message });
    if (!job) return reply.status(404).send({ error: "Map not found" });

    const input = job.input as {
      fullName?: string;
      repoUrl?: string;
      snapshot?: RepoSnapshot;
    };
    const result = job.result as {
      report?: AtlasReport;
      messages?: AtlasChatMessage[];
      meta?: unknown;
    } | null;

    return {
      map: {
        id: job.id,
        status: job.status,
        fullName: input.fullName,
        url: input.repoUrl,
        snapshot: input.snapshot ? slimSnapshot(input.snapshot) : null,
        report: result?.report ?? null,
        messages: result?.messages ?? [],
        meta: result?.meta ?? null,
        error: job.error,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
      },
    };
  });

  app.post("/v1/atlas/maps/:id/chat", async (req, reply) => {
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
      product: "atlas",
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
      .eq("product", "atlas")
      .maybeSingle();

    if (error) return reply.status(500).send({ error: error.message });
    if (!job) return reply.status(404).send({ error: "Map not found" });
    if (job.status !== "succeeded") {
      return reply.status(409).send({
        error: "Map is not ready yet",
        status: job.status,
      });
    }

    const input = job.input as { snapshot?: RepoSnapshot };
    const result = (job.result ?? {}) as {
      report?: AtlasReport;
      messages?: AtlasChatMessage[];
      meta?: unknown;
    };

    if (!input.snapshot || !result.report) {
      return reply.status(500).send({ error: "Map data incomplete" });
    }

    const userMsg: AtlasChatMessage = {
      role: "user",
      content: parsed.data.message,
      createdAt: new Date().toISOString(),
    };
    const history = result.messages ?? [];

    try {
      const { message: assistant, model, promptTokens, completionTokens } =
        await answerAtlasQuestion({
          snap: input.snapshot,
          report: result.report,
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
                ? (result.meta as object)
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

      return { ok: true, message: assistant, usage };
    } catch (e) {
      return reply.status(500).send({
        error: e instanceof Error ? e.message : "Chat failed",
      });
    }
  });
};
