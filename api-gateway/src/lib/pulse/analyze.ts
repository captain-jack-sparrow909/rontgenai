import { completeChat } from "../llm.js";
import type { DatasetProfile } from "./parse.js";

export type PulseChartSpec = {
  type: "bar" | "line" | "area" | "pie";
  title: string;
  xKey: string;
  yKey: string;
  data: Record<string, string | number>[];
};

export type PulseTableSpec = {
  columns: string[];
  rows: (string | number | null)[][];
};

export type PulseChatMessage = {
  role: "user" | "assistant";
  content: string;
  sql?: string | null;
  chart?: PulseChartSpec | null;
  table?: PulseTableSpec | null;
  createdAt: string;
};

export type PulseBootstrap = {
  summary: string;
  key_insights: string[];
  suggested_questions: string[];
  chart?: PulseChartSpec | null;
};

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Model did not return valid JSON");
  }
}

function profileForPrompt(profile: DatasetProfile) {
  return {
    filename: profile.filename,
    rowCount: profile.rowCount,
    columnCount: profile.columnCount,
    columns: profile.columns.map((c) => ({
      name: c.name,
      type: c.type,
      nullCount: c.nullCount,
      uniqueApprox: c.uniqueApprox,
      sampleValues: c.sampleValues,
      min: c.min,
      max: c.max,
      mean: c.mean,
    })),
    sampleRows: profile.sampleRows.slice(0, 25),
  };
}

export async function bootstrapDataset(profile: DatasetProfile): Promise<{
  bootstrap: PulseBootstrap;
  model: string;
  promptTokens: number;
  completionTokens: number;
}> {
  const system = `You are Pulse, an expert data analyst at Röntgen AI.
Given a dataset profile and sample rows, produce an executive briefing.

Return ONLY JSON:
{
  "summary": "2-4 sentences about what the dataset contains",
  "key_insights": ["3-6 concrete insights grounded in the sample"],
  "suggested_questions": ["4-6 natural language questions a user might ask"],
  "chart": {
    "type": "bar|line|area|pie",
    "title": "short title",
    "xKey": "field",
    "yKey": "field",
    "data": [{"field": "…", "…": 0}]
  } | null
}

Rules:
- Insights must be specific (numbers, categories) not generic.
- Chart data must be computed-looking values derived from the sample (max 12 points).
- Prefer bar charts for categories.`;

  const result = await completeChat({
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: JSON.stringify(profileForPrompt(profile), null, 2),
      },
    ],
    temperature: 0.25,
    maxTokens: 2500,
    jsonMode: true,
  });

  const raw = extractJson(result.content) as Record<string, unknown>;
  const bootstrap: PulseBootstrap = {
    summary: String(raw.summary ?? "Dataset loaded."),
    key_insights: Array.isArray(raw.key_insights)
      ? raw.key_insights.map(String)
      : [],
    suggested_questions: Array.isArray(raw.suggested_questions)
      ? raw.suggested_questions.map(String)
      : [],
    chart: (raw.chart as PulseChartSpec) ?? null,
  };

  return {
    bootstrap,
    model: result.model,
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
  };
}

export async function answerPulseQuestion(opts: {
  profile: DatasetProfile;
  history: PulseChatMessage[];
  question: string;
}): Promise<{
  message: PulseChatMessage;
  model: string;
  promptTokens: number;
  completionTokens: number;
}> {
  const system = `You are Pulse, an expert data analyst. Answer questions about the user's spreadsheet.
You have a schema profile and sample rows only — treat sample as representative when needed.
You may propose SQL (read-only SELECT) as if the data were a table named "data".

Return ONLY JSON:
{
  "answer": "clear markdown-friendly answer",
  "sql": "SELECT … FROM data …" | null,
  "chart": {
    "type": "bar|line|area|pie",
    "title": "…",
    "xKey": "…",
    "yKey": "…",
    "data": [ {…} ]
  } | null,
  "table": {
    "columns": ["…"],
    "rows": [["…", 1]]
  } | null
}

Rules:
- Never invent columns not in the schema.
- SQL must be SELECT only (no INSERT/UPDATE/DELETE/DROP).
- Chart data max 12 points; table max 20 rows.
- Be quantitative when possible.`;

  const historyText = opts.history
    .slice(-8)
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  const result = await completeChat({
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: JSON.stringify(
          {
            schema: profileForPrompt(opts.profile),
            conversation: historyText,
            question: opts.question,
          },
          null,
          2,
        ),
      },
    ],
    temperature: 0.2,
    maxTokens: 3000,
    jsonMode: true,
  });

  const raw = extractJson(result.content) as Record<string, unknown>;
  const sql = raw.sql ? String(raw.sql) : null;
  if (sql && !/^\s*select\b/i.test(sql)) {
    // refuse non-select
    raw.sql = null;
  }

  const message: PulseChatMessage = {
    role: "assistant",
    content: String(raw.answer ?? "I couldn't generate an answer."),
    sql: raw.sql ? String(raw.sql) : null,
    chart: (raw.chart as PulseChartSpec) ?? null,
    table: (raw.table as PulseTableSpec) ?? null,
    createdAt: new Date().toISOString(),
  };

  return {
    message,
    model: result.model,
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
  };
}
