"use client";

import { useEffect, useId, useState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";

let initialized = false;

export function MermaidDiagram({
  code,
  label,
}: {
  code: string;
  label: string;
}) {
  const reactId = useId();
  const renderId = `atlas-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [svg, setSvg] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;

    void import("mermaid")
      .then(async ({ default: mermaid }) => {
        if (!initialized) {
          mermaid.initialize({
            startOnLoad: false,
            securityLevel: "strict",
            theme: "dark",
            suppressErrorRendering: true,
            flowchart: {
              htmlLabels: false,
              useMaxWidth: true,
            },
            sequence: {
              useMaxWidth: true,
            },
            themeVariables: {
              background: "#08060f",
              primaryColor: "#17122b",
              primaryTextColor: "#ede9fe",
              primaryBorderColor: "#8b5cf6",
              lineColor: "#7c3aed",
              secondaryColor: "#111827",
              tertiaryColor: "#0b1020",
              fontFamily: "var(--font-geist-sans), sans-serif",
            },
          });
          initialized = true;
        }

        const result = await mermaid.render(renderId, code);
        if (canceled) return;
        setSvg(result.svg);
      })
      .catch((error: unknown) => {
        if (canceled) return;
        setRenderError(
          error instanceof Error ? error.message : "Diagram could not render",
        );
      });

    return () => {
      canceled = true;
    };
  }, [code, renderId]);

  if (renderError) {
    return (
      <div className="space-y-3 p-4">
        <div className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-200/80">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            The generated Mermaid source could not be rendered. You can still
            inspect or copy it below.
          </span>
        </div>
        <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-violet-100/80">
          {code}
        </pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="flex min-h-72 items-center justify-center gap-2 text-xs text-violet-200/60">
        <Loader2 className="h-4 w-4 animate-spin" />
        Rendering architecture…
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={label}
      className="overflow-auto p-4 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-h-[680px] [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
