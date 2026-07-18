import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { env } from "../env.js";
import { requireAuth, workspaceScope } from "../plugins/auth.js";
import {
  deleteObject,
  getSignedPutUrl,
  inspectObject,
  isR2Configured,
  uploadObjectKey,
} from "../lib/r2.js";
import { getSupabase } from "../lib/supabase.js";

const CONTENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/svg+xml",
  "application/pdf",
  "text/csv",
  "text/plain",
  "text/yaml",
  "application/yaml",
  "application/json",
  "application/octet-stream",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

const presignSchema = z.object({
  product: z.enum([
    "blueprint",
    "pulse",
    "atlas",
    "sentinel",
    "forge",
    "radar",
    "relay",
  ]),
  filename: z.string().trim().min(1).max(200),
  contentType: z.enum(CONTENT_TYPES),
  sizeBytes: z.number().int().positive(),
});

export const uploadRoutes: FastifyPluginAsync = async (app) => {
  app.post("/v1/uploads/presign", async (request, reply) => {
    try {
      await requireAuth(request);
    } catch (error) {
      const typed = error as Error & { statusCode?: number };
      return reply.status(typed.statusCode ?? 401).send({ error: typed.message });
    }
    const parsed = presignSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid upload request",
        details: parsed.error.flatten(),
      });
    }
    if (parsed.data.sizeBytes > env.UPLOAD_MAX_BYTES) {
      return reply.status(413).send({
        error: `File exceeds the ${env.UPLOAD_MAX_BYTES} byte upload limit`,
      });
    }
    if (!isR2Configured()) {
      return reply.status(503).send({ error: "Object storage is not configured" });
    }

    const key = uploadObjectKey(
      request.profile!.id,
      parsed.data.product,
      parsed.data.filename,
    );
    const expiresAt = new Date(
      Date.now() + env.ARTIFACT_RETENTION_DAYS * 86_400_000,
    ).toISOString();
    const { data: artifact, error } = await getSupabase()
      .from("artifacts")
      .insert({
        profile_id: request.profile!.id,
        organization_id: request.organization?.id ?? null,
        product: parsed.data.product,
        r2_key: key,
        content_type: parsed.data.contentType,
        size_bytes: parsed.data.sizeBytes,
        expires_at: expiresAt,
        metadata: {
          filename: parsed.data.filename,
          state: "pending",
          requestId: request.id,
        },
      })
      .select("id")
      .single();
    if (error || !artifact) {
      return reply.status(500).send({ error: error?.message ?? "Could not create artifact" });
    }

    const uploadUrl = await getSignedPutUrl({
      key,
      contentType: parsed.data.contentType,
      expiresInSeconds: 600,
    });
    return reply.status(201).send({
      artifactId: artifact.id,
      uploadUrl,
      method: "PUT",
      headers: { "Content-Type": parsed.data.contentType },
      expiresInSeconds: 600,
      retentionExpiresAt: expiresAt,
    });
  });

  app.post("/v1/uploads/:id/confirm", async (request, reply) => {
    try {
      await requireAuth(request);
    } catch (error) {
      const typed = error as Error & { statusCode?: number };
      return reply.status(typed.statusCode ?? 401).send({ error: typed.message });
    }
    const { id } = request.params as { id: string };
    const sb = getSupabase();
    const { data: artifact, error } = await sb
      .from("artifacts")
      .select("*")
      .eq("id", id)
      .eq(...workspaceScope(request))
      .is("deleted_at", null)
      .maybeSingle();
    if (error) return reply.status(500).send({ error: error.message });
    if (!artifact) return reply.status(404).send({ error: "Artifact not found" });

    try {
      const object = await inspectObject(artifact.r2_key);
      if (object.sizeBytes <= 0 || object.sizeBytes > env.UPLOAD_MAX_BYTES) {
        await deleteObject(artifact.r2_key);
        await sb.from("artifacts").update({
          deleted_at: new Date().toISOString(),
          metadata: { ...(artifact.metadata as object), state: "rejected" },
        }).eq("id", id);
        return reply.status(413).send({ error: "Uploaded object has an invalid size" });
      }
      const expectedSize = Number(artifact.size_bytes);
      if (expectedSize && object.sizeBytes !== expectedSize) {
        return reply.status(409).send({
          error: "Uploaded object size does not match the presigned request",
        });
      }
      const metadata = {
        ...(artifact.metadata as object),
        state: "ready",
        confirmedAt: new Date().toISOString(),
      };
      await sb.from("artifacts").update({
        size_bytes: object.sizeBytes,
        content_type: object.contentType ?? artifact.content_type,
        metadata,
      }).eq("id", id);
      return { ok: true, artifact: { id, sizeBytes: object.sizeBytes, expiresAt: artifact.expires_at } };
    } catch (caught) {
      return reply.status(409).send({
        error: caught instanceof Error ? caught.message : "Upload is not available",
      });
    }
  });

  app.delete("/v1/uploads/:id", async (request, reply) => {
    try {
      await requireAuth(request);
    } catch (error) {
      const typed = error as Error & { statusCode?: number };
      return reply.status(typed.statusCode ?? 401).send({ error: typed.message });
    }
    const { id } = request.params as { id: string };
    const sb = getSupabase();
    const { data: artifact } = await sb.from("artifacts").select("*")
      .eq("id", id).eq(...workspaceScope(request)).is("deleted_at", null).maybeSingle();
    if (!artifact) return reply.status(404).send({ error: "Artifact not found" });
    await deleteObject(artifact.r2_key);
    await sb.from("artifacts").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    return reply.status(204).send();
  });
};
