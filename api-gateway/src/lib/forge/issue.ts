import type { Octokit } from "@octokit/rest";

export type IssueRef = {
  owner: string;
  repo: string;
  number: number;
  url: string;
};

export type IssueSnapshot = {
  ref: IssueRef;
  title: string;
  body: string | null;
  author: string | null;
  labels: string[];
  state: string;
  defaultBranch: string;
  comments: { author: string | null; body: string }[];
  /** Small set of repo files for planning context */
  contextFiles: { path: string; content: string }[];
  topLevel: string[];
  languages: Record<string, number> | null;
};

export function parseIssueUrl(input: string): IssueRef {
  const s = input.trim().replace(/\/$/, "");
  const m = s.match(
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/issues\/(\d+)/i,
  );
  if (!m) {
    throw new Error(
      "Invalid issue URL. Use https://github.com/owner/repo/issues/123",
    );
  }
  return {
    owner: m[1],
    repo: m[2],
    number: Number(m[3]),
    url: `https://github.com/${m[1]}/${m[2]}/issues/${m[3]}`,
  };
}

async function fetchFileContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  ref: string,
): Promise<string | null> {
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });
    if (Array.isArray(data) || data.type !== "file" || !("content" in data)) {
      return null;
    }
    const text = Buffer.from(data.content, "base64").toString("utf8");
    if (text.includes("\u0000")) return null;
    return text.slice(0, 10_000);
  } catch {
    return null;
  }
}

export async function fetchIssueSnapshot(
  octokit: Octokit,
  ref: IssueRef,
): Promise<IssueSnapshot> {
  const { data: issue } = await octokit.issues.get({
    owner: ref.owner,
    repo: ref.repo,
    issue_number: ref.number,
  });

  if (issue.pull_request) {
    throw new Error("URL is a pull request, not an issue. Use Sentinel for PRs.");
  }

  const { data: repo } = await octokit.repos.get({
    owner: ref.owner,
    repo: ref.repo,
  });

  const { data: comments } = await octokit.issues.listComments({
    owner: ref.owner,
    repo: ref.repo,
    issue_number: ref.number,
    per_page: 15,
  });

  // Tree for top-level + discover candidates
  let topLevel: string[] = [];
  let treePaths: string[] = [];
  try {
    const { data: tree } = await octokit.git.getTree({
      owner: ref.owner,
      repo: ref.repo,
      tree_sha: repo.default_branch,
      recursive: "true",
    });
    treePaths = (tree.tree ?? [])
      .filter((t) => t.type === "blob" && t.path)
      .map((t) => t.path as string)
      .filter(
        (p) =>
          !p.startsWith("node_modules/") &&
          !p.startsWith("dist/") &&
          !p.startsWith(".git/"),
      );
    topLevel = [
      ...new Set(
        (tree.tree ?? [])
          .map((t) => t.path)
          .filter((p): p is string => Boolean(p) && !p.includes("/")),
      ),
    ].slice(0, 40);
  } catch {
    topLevel = [];
  }

  const priority = [
    "README.md",
    "package.json",
    "pyproject.toml",
    "Cargo.toml",
    "go.mod",
    "tsconfig.json",
    "src/index.ts",
    "src/main.ts",
    "src/main.py",
    "app/page.tsx",
    "app/layout.tsx",
  ];

  // Keyword-ish paths from issue title/body
  const text = `${issue.title} ${issue.body ?? ""}`.toLowerCase();
  const hinted = treePaths
    .filter((p) => {
      const base = p.split("/").pop()?.toLowerCase() ?? "";
      const stem = base.replace(/\.[^.]+$/, "");
      return (
        stem.length > 3 &&
        text.includes(stem) &&
        /\.(ts|tsx|js|jsx|py|go|rs|md)$/i.test(p)
      );
    })
    .slice(0, 8);

  const candidates = [
    ...new Set([...priority, ...hinted, ...treePaths.slice(0, 20)]),
  ].slice(0, 16);

  const contextFiles: { path: string; content: string }[] = [];
  for (const path of candidates) {
    const content = await fetchFileContent(
      octokit,
      ref.owner,
      ref.repo,
      path,
      repo.default_branch,
    );
    if (content) contextFiles.push({ path, content });
    if (contextFiles.length >= 12) break;
  }

  let languages: Record<string, number> | null = null;
  try {
    const { data } = await octokit.repos.listLanguages({
      owner: ref.owner,
      repo: ref.repo,
    });
    languages = data as Record<string, number>;
  } catch {
    languages = null;
  }

  return {
    ref,
    title: issue.title,
    body: issue.body ?? null,
    author: issue.user?.login ?? null,
    labels: (issue.labels ?? []).map((l) =>
      typeof l === "string" ? l : (l.name ?? ""),
    ).filter((n): n is string => Boolean(n)),
    state: issue.state,
    defaultBranch: repo.default_branch,
    comments: comments.map((c) => ({
      author: c.user?.login ?? null,
      body: (c.body ?? "").slice(0, 2000),
    })),
    contextFiles,
    topLevel,
    languages,
  };
}
