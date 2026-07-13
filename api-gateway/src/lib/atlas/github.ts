import { env } from "../../env.js";

export type RepoRef = {
  owner: string;
  repo: string;
  fullName: string;
  url: string;
};

export type RepoMeta = {
  name: string;
  fullName: string;
  description: string | null;
  defaultBranch: string;
  language: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  license: string | null;
  topics: string[];
  homepage: string | null;
  pushedAt: string | null;
  sizeKb: number;
  private: boolean;
};

export type TreeSummary = {
  totalFiles: number;
  totalDirs: number;
  topLevel: string[];
  extensions: Record<string, number>;
  importantPaths: string[];
  directories: string[];
};

export type KeyFile = {
  path: string;
  content: string;
  truncated: boolean;
};

export type RepoSnapshot = {
  ref: RepoRef;
  meta: RepoMeta;
  tree: TreeSummary;
  readme: string | null;
  keyFiles: KeyFile[];
};

const IMPORTANT_NAMES = new Set([
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "cargo.toml",
  "go.mod",
  "go.sum",
  "pyproject.toml",
  "requirements.txt",
  "pipfile",
  "gemfile",
  "composer.json",
  "build.gradle",
  "pom.xml",
  "dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
  "makefile",
  "tsconfig.json",
  "next.config.js",
  "next.config.ts",
  "next.config.mjs",
  "vite.config.ts",
  "vite.config.js",
  "cargo.lock",
  "readme.md",
  "readme",
  "contributing.md",
  "license",
  "license.md",
  "main.go",
  "main.py",
  "main.ts",
  "main.rs",
  "index.ts",
  "index.js",
  "app.py",
  "server.ts",
  "server.js",
]);

const SKIP_DIR_PREFIXES = [
  "node_modules/",
  ".git/",
  "dist/",
  "build/",
  ".next/",
  "vendor/",
  "target/",
  "coverage/",
  "__pycache__/",
  ".turbo/",
];

export function parseGithubUrl(input: string): RepoRef {
  let s = input.trim();
  s = s.replace(/\.git$/i, "");
  s = s.replace(/\/$/, "");

  // owner/repo
  if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(s)) {
    const [owner, repo] = s.split("/");
    return {
      owner,
      repo,
      fullName: `${owner}/${repo}`,
      url: `https://github.com/${owner}/${repo}`,
    };
  }

  // https://github.com/owner/repo[/...]
  const m = s.match(
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/i,
  );
  if (m) {
    const owner = m[1];
    const repo = m[2];
    return {
      owner,
      repo,
      fullName: `${owner}/${repo}`,
      url: `https://github.com/${owner}/${repo}`,
    };
  }

  throw new Error(
    "Invalid GitHub URL. Use https://github.com/owner/repo or owner/repo",
  );
}

function ghHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "rontgenai-atlas",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (env.GITHUB_TOKEN) {
    h.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  }
  return h;
}

async function ghJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: ghHeaders() });
  if (res.status === 404) {
    throw new Error("Repository not found (or private — Atlas v1 is public-only)");
  }
  if (res.status === 403) {
    const remaining = res.headers.get("x-ratelimit-remaining");
    throw new Error(
      remaining === "0"
        ? "GitHub API rate limit exceeded. Set GITHUB_TOKEN on the API for higher limits."
        : "GitHub API forbidden — check token permissions or rate limits.",
    );
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

function shouldSkipPath(path: string): boolean {
  const p = path.replace(/^\.\//, "");
  return SKIP_DIR_PREFIXES.some(
    (pre) => p === pre.slice(0, -1) || p.startsWith(pre),
  );
}

function summarizeTree(
  paths: { path: string; type: string }[],
): TreeSummary {
  const files = paths.filter((p) => p.type === "blob" && !shouldSkipPath(p.path));
  const dirs = paths.filter((p) => p.type === "tree" && !shouldSkipPath(p.path));

  const extensions: Record<string, number> = {};
  for (const f of files) {
    const base = f.path.split("/").pop() ?? f.path;
    const dot = base.lastIndexOf(".");
    const ext = dot > 0 ? base.slice(dot).toLowerCase() : "(none)";
    extensions[ext] = (extensions[ext] ?? 0) + 1;
  }

  const topLevel = [
    ...new Set(
      paths
        .filter((p) => !p.path.includes("/"))
        .map((p) => p.path)
        .filter((p) => !shouldSkipPath(p)),
    ),
  ].slice(0, 40);

  const importantPaths = files
    .map((f) => f.path)
    .filter((p) => {
      const base = (p.split("/").pop() ?? p).toLowerCase();
      return IMPORTANT_NAMES.has(base) || /^(src|app|lib|cmd|pkg|internal)\//i.test(p);
    })
    .slice(0, 80);

  const directories = dirs
    .map((d) => d.path)
    .filter((p) => p.split("/").length <= 3)
    .slice(0, 60);

  return {
    totalFiles: files.length,
    totalDirs: dirs.length,
    topLevel,
    extensions,
    importantPaths,
    directories,
  };
}

async function fetchKeyFiles(
  owner: string,
  repo: string,
  branch: string,
  candidates: string[],
): Promise<KeyFile[]> {
  const unique = [...new Set(candidates)].slice(0, 18);
  const results: KeyFile[] = [];

  await Promise.all(
    unique.map(async (path) => {
      try {
        const encodedPath = path
          .split("/")
          .map((s) => encodeURIComponent(s))
          .join("/");
        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`;
        // contents API returns base64 JSON for files
        const data = await ghJson<{
          type?: string;
          content?: string;
          encoding?: string;
          size?: number;
        }>(url);
        if (data.type !== "file" || !data.content) return;
        let text = Buffer.from(data.content, "base64").toString("utf8");
        let truncated = false;
        if (text.length > 12_000) {
          text = text.slice(0, 12_000);
          truncated = true;
        }
        // skip binary-ish
        if (text.includes("\u0000")) return;
        results.push({ path, content: text, truncated });
      } catch {
        /* skip missing */
      }
    }),
  );

  return results.sort((a, b) => a.path.localeCompare(b.path));
}

export async function fetchPublicRepoSnapshot(inputUrl: string): Promise<RepoSnapshot> {
  const ref = parseGithubUrl(inputUrl);

  type GhRepo = {
    name: string;
    full_name: string;
    description: string | null;
    default_branch: string;
    language: string | null;
    stargazers_count: number;
    forks_count: number;
    open_issues_count: number;
    license: { spdx_id?: string } | null;
    topics?: string[];
    homepage: string | null;
    pushed_at: string | null;
    size: number;
    private: boolean;
  };

  const repo = await ghJson<GhRepo>(
    `https://api.github.com/repos/${ref.owner}/${ref.repo}`,
  );

  if (repo.private) {
    throw new Error("Private repositories are not supported in Atlas v1");
  }

  const meta: RepoMeta = {
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description,
    defaultBranch: repo.default_branch,
    language: repo.language,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    openIssues: repo.open_issues_count,
    license: repo.license?.spdx_id ?? null,
    topics: repo.topics ?? [],
    homepage: repo.homepage,
    pushedAt: repo.pushed_at,
    sizeKb: repo.size,
    private: repo.private,
  };

  type GhTree = {
    tree: { path: string; type: string; size?: number }[];
    truncated?: boolean;
  };

  const treeData = await ghJson<GhTree>(
    `https://api.github.com/repos/${ref.owner}/${ref.repo}/git/trees/${encodeURIComponent(meta.defaultBranch)}?recursive=1`,
  );

  const tree = summarizeTree(treeData.tree ?? []);

  // README via dedicated endpoint (handles nested names)
  let readme: string | null = null;
  try {
    const readmeRes = await fetch(
      `https://api.github.com/repos/${ref.owner}/${ref.repo}/readme`,
      {
        headers: {
          ...ghHeaders(),
          Accept: "application/vnd.github.raw",
        },
      },
    );
    if (readmeRes.ok) {
      readme = (await readmeRes.text()).slice(0, 20_000);
    }
  } catch {
    readme = null;
  }

  const priorityPaths = [
    "package.json",
    "pyproject.toml",
    "requirements.txt",
    "Cargo.toml",
    "go.mod",
    "Dockerfile",
    "docker-compose.yml",
    "Makefile",
    "tsconfig.json",
    "next.config.ts",
    "next.config.js",
    "vite.config.ts",
    "CONTRIBUTING.md",
    ...tree.importantPaths.filter(
      (p) =>
        /^(src|app|lib|cmd|pkg)\/[^/]+(\.(ts|tsx|js|jsx|py|go|rs))?$/i.test(p) ||
        IMPORTANT_NAMES.has((p.split("/").pop() ?? "").toLowerCase()),
    ),
  ];

  const keyFiles = await fetchKeyFiles(
    ref.owner,
    ref.repo,
    meta.defaultBranch,
    priorityPaths,
  );

  return { ref, meta, tree, readme, keyFiles };
}
