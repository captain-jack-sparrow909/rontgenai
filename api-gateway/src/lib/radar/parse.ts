export type LogLevel = "error" | "warn" | "info" | "debug" | "unknown";

export type ParsedLogLine = {
  raw: string;
  timestamp: string | null;
  level: LogLevel;
  service: string | null;
  message: string;
  attrs: Record<string, string>;
};

export type LogSignalSummary = {
  totalLines: number;
  errorCount: number;
  warnCount: number;
  infoCount: number;
  levels: Record<string, number>;
  topServices: { name: string; count: number }[];
  topErrorSignatures: { signature: string; count: number }[];
  timeRange: { first: string | null; last: string | null };
  sampleErrors: ParsedLogLine[];
  sampleLines: ParsedLogLine[];
};

const TS_PATTERNS = [
  /\b(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\b/,
  /\b([A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\b/,
  /\b(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})\b/,
];

function detectLevel(line: string): LogLevel {
  if (/\b(ERROR|ERR|FATAL|CRITICAL|SEVERE)\b/i.test(line)) return "error";
  if (/\b(WARN|WARNING)\b/i.test(line)) return "warn";
  if (/\b(INFO|INFORMATION|NOTICE)\b/i.test(line)) return "info";
  if (/\b(DEBUG|TRACE|VERBOSE)\b/i.test(line)) return "debug";
  return "unknown";
}

function detectTimestamp(line: string): string | null {
  for (const re of TS_PATTERNS) {
    const m = line.match(re);
    if (m) return m[1];
  }
  return null;
}

function detectService(line: string): string | null {
  const patterns = [
    /\bservice[=:]["']?([a-zA-Z0-9_.-]+)/i,
    /\bapp[=:]["']?([a-zA-Z0-9_.-]+)/i,
    /\[([a-zA-Z0-9_.-]{2,40})\]/,
    /\b([a-z][a-z0-9-]{2,30})(?:-service|svc)\b/i,
  ];
  for (const re of patterns) {
    const m = line.match(re);
    if (m?.[1] && !/error|warn|info|debug|http|null/i.test(m[1])) {
      return m[1];
    }
  }
  return null;
}

function extractAttrs(line: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const kv = line.matchAll(/\b([a-zA-Z_][a-zA-Z0-9_]{1,24})[=:]("?)([^"\s,]{1,80})\2/g);
  for (const m of kv) {
    const key = m[1].toLowerCase();
    if (["error", "msg", "message", "level", "time", "ts"].includes(key)) continue;
    if (Object.keys(attrs).length >= 8) break;
    attrs[key] = m[3].slice(0, 80);
  }
  // JSON-ish
  if (line.trim().startsWith("{")) {
    try {
      const obj = JSON.parse(line) as Record<string, unknown>;
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === "string" || typeof v === "number") {
          attrs[k] = String(v).slice(0, 80);
        }
      }
    } catch {
      /* not json */
    }
  }
  return attrs;
}

function normalizeSignature(message: string): string {
  return message
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "<uuid>")
    .replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, "<ip>")
    .replace(/\b\d{4,}\b/g, "<n>")
    .replace(/0x[0-9a-f]+/gi, "<hex>")
    .slice(0, 160);
}

export function parseLogText(raw: string): {
  lines: ParsedLogLine[];
  summary: LogSignalSummary;
} {
  const text = raw.replace(/\r\n/g, "\n").trim();
  if (!text) throw new Error("Log content is empty");
  if (text.length > 2_000_000) {
    throw new Error("Log payload too large (max ~2MB text)");
  }

  const rawLines = text.split("\n").filter((l) => l.trim().length > 0);
  // Cap processing
  const capped = rawLines.slice(0, 5000);

  const lines: ParsedLogLine[] = capped.map((line) => {
    const level = detectLevel(line);
    const timestamp = detectTimestamp(line);
    const service = detectService(line);
    let message = line;
    // strip leading timestamp-ish
    message = message.replace(TS_PATTERNS[0], "").trim();
    return {
      raw: line.slice(0, 2000),
      timestamp,
      level,
      service,
      message: message.slice(0, 500),
      attrs: extractAttrs(line),
    };
  });

  const levels: Record<string, number> = {};
  const serviceCounts: Record<string, number> = {};
  const sigCounts: Record<string, number> = {};
  let first: string | null = null;
  let last: string | null = null;

  for (const l of lines) {
    levels[l.level] = (levels[l.level] ?? 0) + 1;
    if (l.service) {
      serviceCounts[l.service] = (serviceCounts[l.service] ?? 0) + 1;
    }
    if (l.timestamp) {
      if (!first) first = l.timestamp;
      last = l.timestamp;
    }
    if (l.level === "error" || l.level === "warn") {
      const sig = normalizeSignature(l.message);
      sigCounts[sig] = (sigCounts[sig] ?? 0) + 1;
    }
  }

  const topServices = Object.entries(serviceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  const topErrorSignatures = Object.entries(sigCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([signature, count]) => ({ signature, count }));

  const sampleErrors = lines
    .filter((l) => l.level === "error")
    .slice(0, 30);

  const summary: LogSignalSummary = {
    totalLines: rawLines.length,
    errorCount: levels.error ?? 0,
    warnCount: levels.warn ?? 0,
    infoCount: levels.info ?? 0,
    levels,
    topServices,
    topErrorSignatures,
    timeRange: { first, last },
    sampleErrors,
    sampleLines: lines.slice(0, 40),
  };

  return { lines, summary };
}

export function parseBase64Log(input: string): string {
  let b64 = input;
  const m = /^data:([^;]+);base64,(.+)$/s.exec(input);
  if (m) b64 = m[2];
  const buf = Buffer.from(b64, "base64");
  if (!buf.length) throw new Error("Invalid log file data");
  if (buf.length > 2_500_000) throw new Error("Log file too large (max ~2.5MB)");
  return buf.toString("utf8");
}
