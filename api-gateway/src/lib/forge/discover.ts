import type { Octokit } from "@octokit/rest";

export type ForgeIssueDiscoveryFilters = {
  query?: string;
  language?: string;
  organization?: string;
  labels?: string[];
  beginnerFriendly?: boolean;
  unassignedOnly?: boolean;
  limit?: number;
};

export type ForgeIssueCandidate = {
  id: number;
  url: string;
  repository: string;
  number: number;
  title: string;
  bodyPreview: string | null;
  labels: string[];
  author: string | null;
  assignees: string[];
  comments: number;
  createdAt: string;
  updatedAt: string;
  score: number;
  reasons: string[];
};

function quoted(value: string): string {
  return `"${value.replace(/["\\\r\n]/g, " ").trim().slice(0, 120)}"`;
}

export function buildIssueDiscoveryQuery(
  filters: ForgeIssueDiscoveryFilters,
): string {
  const parts = ["is:issue", "is:open", "archived:false"];
  if (filters.query?.trim()) parts.push(quoted(filters.query));
  if (filters.language?.trim()) {
    parts.push(`language:${quoted(filters.language)}`);
  }
  if (filters.organization?.trim()) {
    parts.push(`org:${quoted(filters.organization)}`);
  }
  for (const label of filters.labels?.slice(0, 3) ?? []) {
    if (label.trim()) parts.push(`label:${quoted(label)}`);
  }
  if (filters.beginnerFriendly !== false) {
    parts.push(`label:${quoted("good first issue")}`);
  }
  if (filters.unassignedOnly !== false) parts.push("no:assignee");
  return parts.join(" ");
}

type SearchIssueItem = {
  id: number;
  html_url: string;
  repository_url: string;
  number: number;
  title: string;
  body?: string | null;
  labels: ({ name?: string } | string)[];
  user?: { login?: string } | null;
  assignees?: { login?: string }[] | null;
  comments: number;
  created_at: string;
  updated_at: string;
  pull_request?: unknown;
};

function scoreCandidate(item: SearchIssueItem, labels: string[]) {
  let score = 20;
  const reasons: string[] = [];
  const normalized = labels.map((label) => label.toLowerCase());
  if (normalized.includes("good first issue")) {
    score += 30;
    reasons.push("Marked good first issue");
  }
  if (normalized.includes("help wanted")) {
    score += 15;
    reasons.push("Maintainers want help");
  }
  if (!item.assignees?.length) {
    score += 15;
    reasons.push("Currently unassigned");
  }
  if ((item.body?.trim().length ?? 0) >= 180) {
    score += 10;
    reasons.push("Has useful problem context");
  }
  if (item.comments <= 5) {
    score += 5;
    reasons.push("Low discussion overhead");
  }
  const ageDays = (Date.now() - Date.parse(item.updated_at)) / 86_400_000;
  if (ageDays <= 30) {
    score += 10;
    reasons.push("Recently active");
  }
  return { score: Math.min(100, score), reasons };
}

export async function discoverOpenSourceIssues(
  octokit: Octokit,
  filters: ForgeIssueDiscoveryFilters,
): Promise<{ query: string; issues: ForgeIssueCandidate[] }> {
  const query = buildIssueDiscoveryQuery(filters);
  const limit = Math.max(1, Math.min(filters.limit ?? 12, 20));
  const response = await octokit.search.issuesAndPullRequests({
    q: query,
    sort: "updated",
    order: "desc",
    per_page: Math.min(50, limit * 2),
  });

  const issues = (response.data.items as SearchIssueItem[])
    .filter((item) => !item.pull_request)
    .map((item): ForgeIssueCandidate => {
      const labels = item.labels
        .map((label) => (typeof label === "string" ? label : label.name ?? ""))
        .filter(Boolean);
      const { score, reasons } = scoreCandidate(item, labels);
      const repository = item.repository_url.split("/repos/")[1] ?? "unknown/repository";
      return {
        id: item.id,
        url: item.html_url,
        repository,
        number: item.number,
        title: item.title,
        bodyPreview: item.body?.trim().slice(0, 500) || null,
        labels,
        author: item.user?.login ?? null,
        assignees: (item.assignees ?? []).map((assignee) => assignee.login ?? "").filter(Boolean),
        comments: item.comments,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        score,
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score || Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, limit);

  return { query, issues };
}
