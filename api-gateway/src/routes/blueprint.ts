import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireAuth, workspaceScope } from "../plugins/auth.js";
import { getSupabase } from "../lib/supabase.js";
import type { PlanId } from "../lib/plans.js";
import { recordUsage } from "../lib/usage.js";
import {
  blueprintObjectKey,
  artifactExpiresAt,
  isR2Configured,
  putObject,
} from "../lib/r2.js";
import { enqueueBlueprintProcessing } from "../lib/blueprint/process.js";

const createSchema = z
  .object({
    title: z.string().max(200).optional(),
    description: z.string().max(20000).optional().default(""),
    mermaid: z.string().max(50000).optional(),
    /** Base64 without data: prefix, or full data URL */
    imageBase64: z.string().max(12_000_000).optional(),
    imageContentType: z
      .enum(["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"])
      .optional(),
    filename: z.string().max(200).optional(),
    reviewMode: z.enum(["architecture", "cost"]).default("architecture"),
    cloudInventory: z.string().max(1_000_000).optional(),
    billingSummary: z.string().max(1_000_000).optional(),
    optimizationConstraints: z.string().max(10000).optional(),
  })
  .refine(
    (v) =>
      Boolean(v.description?.trim()) ||
      Boolean(v.mermaid?.trim()) ||
      Boolean(v.imageBase64) ||
      (v.reviewMode === "cost" && (Boolean(v.cloudInventory?.trim()) || Boolean(v.billingSummary?.trim()))),
    { message: "Provide architecture or cloud inventory/billing evidence" },
  );

function parseBase64Image(input: string): {
  buffer: Buffer;
  contentType: string;
  dataUrl: string;
} {
  let contentType = "image/png";
  let b64 = input;
  const dataUrlMatch = /^data:([^;]+);base64,(.+)$/s.exec(input);
  if (dataUrlMatch) {
    contentType = dataUrlMatch[1];
    b64 = dataUrlMatch[2];
  }
  const buffer = Buffer.from(b64, "base64");
  if (buffer.length === 0) {
    throw new Error("Invalid image data");
  }
  if (buffer.length > 8 * 1024 * 1024) {
    throw new Error("Image too large (max 8MB)");
  }
  const dataUrl = dataUrlMatch
    ? input
    : `data:${contentType};base64,${b64}`;
  return { buffer, contentType, dataUrl };
}

export const blueprintRoutes: FastifyPluginAsync = async (app) => {
  /** Create a Blueprint architecture review */
  app.post("/v1/blueprint/reviews", async (req, reply) => {
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
      product: "blueprint",
      plan,
      units: 1,
      metadata: { action: parsed.data.reviewMode === "cost" ? "cloud_cost_review" : "review" },
    });

    if (!usage.allowed) {
      return reply.status(402).send({
        error: "Usage limit reached",
        ...usage,
        upgradeUrl: "/app/billing",
      });
    }

    const body = parsed.data;
    let r2Key: string | undefined;
    let contentType: string | undefined;
    let imageDataUrl: string | undefined;
    let artifactId: string | undefined;

    if (body.imageBase64) {
      try {
        const img = parseBase64Image(body.imageBase64);
        contentType = body.imageContentType ?? img.contentType;
        imageDataUrl = img.dataUrl;

        if (isR2Configured()) {
          const key = blueprintObjectKey(
            req.profile!.id,
            body.filename ?? `diagram.${contentType.split("/")[1] ?? "png"}`,
          );
          await putObject({
            key,
            body: img.buffer,
            contentType,
          });
          r2Key = key;

          const sb = getSupabase();
          const { data: art } = await sb
            .from("artifacts")
            .insert({
              profile_id: req.profile!.id,
              organization_id: req.organization?.id ?? null,
              product: "blueprint",
              r2_key: key,
              content_type: contentType,
              size_bytes: img.buffer.length,
              expires_at: artifactExpiresAt(),
              metadata: { filename: body.filename ?? null },
            })
            .select("id")
            .single();
          artifactId = art?.id;
        }
      } catch (e) {
        return reply.status(400).send({
          error: e instanceof Error ? e.message : "Invalid image",
        });
      }
    }

    const sb = getSupabase();
    const { data: job, error } = await sb
      .from("jobs")
      .insert({
        profile_id: req.profile!.id,
        organization_id: req.organization?.id ?? null,
        request_id: req.id,
        product: "blueprint",
        type: body.reviewMode === "cost" ? "cloud_cost_review" : "architecture_review",
        status: "queued",
        input: {
          title: body.title ?? null,
          reviewMode: body.reviewMode,
          description: body.description ?? "",
          mermaid: body.mermaid ?? null,
          cloudInventory: body.cloudInventory ?? null,
          billingSummary: body.billingSummary ?? null,
          optimizationConstraints: body.optimizationConstraints ?? null,
          r2_key: r2Key ?? null,
          content_type: contentType ?? null,
          artifact_id: artifactId ?? null,
          // Keep small diagrams inline for processing if R2 unavailable
          image_data_url:
            !r2Key && imageDataUrl && imageDataUrl.length < 1_500_000
              ? imageDataUrl
              : null,
          // If R2 stored, process will use signed URL; also pass data URL if small enough for vision
          ...(r2Key && imageDataUrl && imageDataUrl.length < 1_500_000
            ? { image_data_url: imageDataUrl }
            : {}),
        },
      })
      .select("*")
      .single();

    if (error || !job) {
      return reply.status(500).send({
        error: error?.message ?? "Failed to create review job",
      });
    }

    enqueueBlueprintProcessing(job.id);

    return reply.status(201).send({
      ok: true,
      review: {
        id: job.id,
        status: job.status,
        product: job.product,
        type: job.type,
        createdAt: job.created_at,
      },
      usage,
    });
  });

  /** List recent Blueprint reviews */
  app.get("/v1/blueprint/reviews", async (req, reply) => {
    try {
      await requireAuth(req);
    } catch (e) {
      const err = e as Error & { statusCode?: number };
      return reply.status(err.statusCode ?? 401).send({ error: err.message });
    }

    const sb = getSupabase();
    const { data, error } = await sb
      .from("jobs")
      .select("id, status, type, product, input, result, error, created_at, updated_at")
      .eq(...workspaceScope(req))
      .eq("product", "blueprint")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    const reviews = (data ?? []).map((j) => ({
      id: j.id,
      status: j.status,
      title: (j.input as { title?: string } | null)?.title ?? null,
      reviewMode: (j.input as { reviewMode?: string } | null)?.reviewMode ?? "architecture",
      descriptionPreview: String(
        (j.input as { description?: string } | null)?.description ?? "",
      ).slice(0, 160),
      scores: (j.result as { review?: { scores?: unknown } } | null)?.review
        ?.scores,
      error: j.error,
      createdAt: j.created_at,
      updatedAt: j.updated_at,
    }));

    return { reviews };
  });

  /** Get one review (job) */
  app.get("/v1/blueprint/reviews/:id", async (req, reply) => {
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
      .eq("product", "blueprint")
      .maybeSingle();

    if (error) {
      return reply.status(500).send({ error: error.message });
    }
    if (!job) {
      return reply.status(404).send({ error: "Review not found" });
    }

    // Strip heavy image payload from response
    const input = { ...(job.input as Record<string, unknown>) };
    delete input.image_data_url;

    return {
      review: {
        id: job.id,
        status: job.status,
        type: job.type,
        input,
        result: job.result,
        error: job.error,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
      },
    };
  });
};
