import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { getSupabase } from "../lib/supabase.js";

const bodySchema = z.object({
  email: z.string().email(),
  product: z
    .enum(["orbit", "aegis", "echo", "arena", "general"])
    .optional()
    .default("general"),
});

export const waitlistRoutes: FastifyPluginAsync = async (app) => {
  app.post("/v1/waitlist", async (req, reply) => {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid body",
        details: parsed.error.flatten(),
      });
    }

    const { email, product } = parsed.data;
    const sb = getSupabase();

    const { error } = await sb.from("waitlist").upsert(
      {
        email: email.toLowerCase().trim(),
        product,
      },
      { onConflict: "email,product", ignoreDuplicates: true },
    );

    if (error) {
      console.error("waitlist insert", error);
      const missing = error.code === "PGRST205" || /waitlist/i.test(error.message);
      return reply.status(500).send({
        error: missing
          ? "Database not migrated yet. Apply supabase/APPLY_IN_DASHBOARD.sql in Supabase SQL Editor."
          : "Failed to save waitlist entry",
        code: error.code,
      });
    }

    return reply.status(201).send({
      ok: true,
      message: "You're on the list.",
    });
  });
};
