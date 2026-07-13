"use client";

import { useState } from "react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { joinWaitlist } from "@/lib/api";
import { comingSoonProducts } from "@/lib/products";

const emailSchema = z.string().email("Enter a valid email");

export function Waitlist() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setStatus("error");
      setMessage(parsed.error.issues[0]?.message ?? "Invalid email");
      return;
    }

    setStatus("loading");
    setMessage("");
    try {
      const res = await joinWaitlist(parsed.data, "general");
      setStatus("ok");
      setMessage(res.message || "You're on the list.");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setMessage(
        err instanceof Error
          ? err.message
          : "Could not join waitlist. Is the API running?",
      );
    }
  }

  return (
    <section id="waitlist" className="scroll-mt-20 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent p-8 text-center sm:p-12">
        <Badge variant="secondary" className="mb-4">
          Coming soon
        </Badge>
        <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Orbit · Aegis · Echo · Arena
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-foreground/60">
          Job search, support RAG, meeting copilot, and interview coach are on
          the roadmap. Join the waitlist for early access.
        </p>
        <p className="mt-4 text-xs text-foreground/40">
          {comingSoonProducts.map((p) => p.name).join(" · ")}
        </p>
        <form
          onSubmit={onSubmit}
          className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
        >
          <Input
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setStatus("idle");
            }}
            aria-label="Email for waitlist"
            disabled={status === "loading"}
          />
          <Button
            type="submit"
            className="shrink-0"
            disabled={status === "loading"}
          >
            {status === "loading" ? "Joining…" : "Join waitlist"}
          </Button>
        </form>
        {status === "ok" || status === "error" ? (
          <p
            className={`mt-3 text-sm ${
              status === "ok" ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
