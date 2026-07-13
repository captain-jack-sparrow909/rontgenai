"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  ClipboardCopy,
  Loader2,
  Plus,
} from "lucide-react";
import { AnalyzingPanel } from "@/components/blueprint/analyzing";
import { ReviewResult } from "@/components/blueprint/review-result";
import {
  BlueprintAtmosphere,
  FadeIn,
  GlassPanel,
  SectionLabel,
} from "@/components/blueprint/shell";
import { Button } from "@/components/ui/button";
import { getBlueprintReview } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function BlueprintReviewPage() {
  const params = useParams();
  const id = String(params.id ?? "");
  const { getToken } = useAuth();
  const [copied, setCopied] = useState(false);

  const query = useQuery({
    queryKey: ["blueprint-review", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Sign in required");
      return getBlueprintReview(token, id);
    },
    refetchInterval: (q) => {
      const status = q.state.data?.review.status;
      return status === "queued" || status === "running" ? 2000 : false;
    },
  });

  const review = query.data?.review;
  const payload = review?.result?.review;
  const pending =
    review?.status === "queued" || review?.status === "running";
  const title =
    (review?.input as { title?: string } | undefined)?.title ||
    "Architecture review";

  async function copyMarkdown() {
    if (!payload) return;
    await navigator.clipboard.writeText(toMarkdown(title, payload));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative mx-auto max-w-4xl">
      <BlueprintAtmosphere />

      <FadeIn>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-foreground/60 hover:text-white"
          >
            <Link href="/app/blueprint">
              <ArrowLeft className="h-4 w-4" />
              All scans
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            {payload ? (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void copyMarkdown()}
                  className="border border-white/10"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <ClipboardCopy className="h-3.5 w-3.5" />
                  )}
                  {copied ? "Copied" : "Markdown"}
                </Button>
                <Button asChild size="sm">
                  <Link href="/app/blueprint">
                    <Plus className="h-3.5 w-3.5" />
                    New scan
                  </Link>
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </FadeIn>

      {query.isLoading ? (
        <GlassPanel className="flex items-center justify-center gap-3 py-16">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
          <span className="text-sm text-foreground/50">
            Loading review session…
          </span>
        </GlassPanel>
      ) : query.isError ? (
        <GlassPanel className="border-red-500/20 p-6 text-center text-sm text-red-300">
          {query.error instanceof Error
            ? query.error.message
            : "Failed to load review"}
        </GlassPanel>
      ) : review ? (
        <div className="space-y-6">
          <FadeIn delay={0.05}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <StatusChip status={review.status} />
                  <span className="font-mono text-[10px] text-foreground/30">
                    {id.slice(0, 8)}…
                  </span>
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  {title}
                </h1>
                <p className="mt-1 text-xs text-foreground/40">
                  {new Date(review.createdAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>
            </div>
          </FadeIn>

          {(review.input?.description || review.input?.mermaid) && (
            <FadeIn delay={0.1}>
              <SectionLabel index="IN">Input package</SectionLabel>
              <GlassPanel className="overflow-hidden">
                {review.input.description ? (
                  <div className="border-b border-white/5 p-5">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/35">
                      Description
                    </p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/70">
                      {review.input.description}
                    </p>
                  </div>
                ) : null}
                {review.input.mermaid ? (
                  <div className="bg-[#05080f]">
                    <div className="flex items-center gap-1.5 border-b border-white/5 px-4 py-2">
                      <span className="h-2 w-2 rounded-full bg-red-400/70" />
                      <span className="h-2 w-2 rounded-full bg-amber-400/70" />
                      <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
                      <span className="ml-2 font-mono text-[10px] text-foreground/30">
                        architecture.mmd
                      </span>
                    </div>
                    <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-cyan-200/75">
                      {review.input.mermaid}
                    </pre>
                  </div>
                ) : null}
              </GlassPanel>
            </FadeIn>
          )}

          {pending ? (
            <FadeIn delay={0.12}>
              <AnalyzingPanel />
            </FadeIn>
          ) : null}

          {review.status === "failed" ? (
            <FadeIn>
              <GlassPanel className="border-red-500/30 p-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-red-400/80">
                  Scan failed
                </p>
                <p className="mt-2 text-sm text-foreground/70">
                  {review.error || "Unknown error"}
                </p>
                <Button asChild className="mt-4" variant="secondary">
                  <Link href="/app/blueprint">Retry with new session</Link>
                </Button>
              </GlassPanel>
            </FadeIn>
          ) : null}

          {payload ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <ReviewResult review={payload} meta={review.result?.meta} />
            </motion.div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
        status === "succeeded" &&
          "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
        status === "failed" && "border-red-400/30 bg-red-400/10 text-red-300",
        (status === "queued" || status === "running") &&
          "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
      )}
    >
      {(status === "queued" || status === "running") && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-70" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
        </span>
      )}
      {status}
    </span>
  );
}

function toMarkdown(
  title: string | null | undefined,
  review: NonNullable<
    Awaited<ReturnType<typeof getBlueprintReview>>["review"]["result"]
  >["review"],
): string {
  if (!review) return "";
  const lines = [
    `# Blueprint review${title ? `: ${title}` : ""}`,
    "",
    review.summary,
    "",
    `## Scores (overall ${review.scores.overall}/10)`,
    `- Scalability: ${review.scores.scalability}`,
    `- Reliability: ${review.scores.reliability}`,
    `- Security: ${review.scores.security}`,
    `- Cost efficiency: ${review.scores.cost_efficiency}`,
    "",
    "## Findings",
    ...review.findings.flatMap((f) => [
      `### [${f.severity}] ${f.title}`,
      f.detail,
      f.recommendation ? `**Recommendation:** ${f.recommendation}` : "",
      "",
    ]),
    "## Next steps",
    ...review.next_steps.map((s, i) => `${i + 1}. ${s}`),
  ];
  return lines.filter((l) => l !== undefined).join("\n");
}
