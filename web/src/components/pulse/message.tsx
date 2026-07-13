"use client";

import { Code2, Table2 } from "lucide-react";
import type { PulseChatMessage } from "@/lib/api";
import { PulseChart } from "./chart";
import { cn } from "@/lib/utils";

export function ChatBubble({ message }: { message: PulseChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[92%] space-y-3 rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-gradient-to-br from-emerald-500/25 to-teal-600/15 text-emerald-50 ring-1 ring-emerald-400/25"
            : "border border-white/8 bg-white/[0.04] text-foreground/80",
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>

        {message.sql ? (
          <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
            <div className="flex items-center gap-1.5 border-b border-white/5 px-3 py-1.5 text-[10px] text-foreground/40">
              <Code2 className="h-3 w-3" />
              SQL
            </div>
            <pre className="overflow-x-auto p-3 font-mono text-[11px] text-emerald-200/80">
              {message.sql}
            </pre>
          </div>
        ) : null}

        {message.chart ? <PulseChart chart={message.chart} /> : null}

        {message.table?.columns?.length ? (
          <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
            <div className="flex items-center gap-1.5 border-b border-white/5 px-3 py-1.5 text-[10px] text-foreground/40">
              <Table2 className="h-3 w-3" />
              Result table
            </div>
            <div className="max-h-48 overflow-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="sticky top-0 bg-[#0a1210]">
                  <tr>
                    {message.table.columns.map((c) => (
                      <th
                        key={c}
                        className="border-b border-white/5 px-3 py-2 font-medium text-emerald-300/70"
                      >
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {message.table.rows.map((row, i) => (
                    <tr key={i} className="border-b border-white/[0.04]">
                      {row.map((cell, j) => (
                        <td
                          key={j}
                          className="px-3 py-1.5 font-mono text-foreground/65"
                        >
                          {cell === null || cell === undefined
                            ? "—"
                            : String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
