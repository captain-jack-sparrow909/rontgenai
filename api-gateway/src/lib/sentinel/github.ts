import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";
import { env } from "../../env.js";

export type PrRef = {
  owner: string;
  repo: string;
  number: number;
  url: string;
};

export type PrFile = {
  path: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
};

export type PrSnapshot = {
  ref: PrRef;
  title: string;
  body: string | null;
  author: string | null;
  base: string;
  head: string;
  draft: boolean;
  files: PrFile[];
  htmlUrl: string;
};

export function parsePrUrl(input: string): PrRef {
  const s = input.trim().replace(/\/$/, "");
  const m = s.match(
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/pull\/(\d+)/i,
  );
  if (!m) {
    throw new Error(
      "Invalid PR URL. Use https://github.com/owner/repo/pull/123",
    );
  }
  return {
    owner: m[1],
    repo: m[2],
    number: Number(m[3]),
    url: `https://github.com/${m[1]}/${m[2]}/pull/${m[3]}`,
  };
}

export function isGitHubAppConfigured(): boolean {
  return Boolean(env.GITHUB_APP_ID && env.GITHUB_APP_PRIVATE_KEY);
}

export function createTokenOctokit(token: string): Octokit {
  return new Octokit({ auth: token, userAgent: "rontgenai-sentinel" });
}

export async function createInstallationOctokit(
  installationId: number,
): Promise<Octokit> {
  if (!isGitHubAppConfigured()) {
    throw new Error("GitHub App is not configured");
  }
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: env.GITHUB_APP_ID!,
      privateKey: env.GITHUB_APP_PRIVATE_KEY!,
      installationId,
    },
    userAgent: "rontgenai-sentinel",
  });
}

export function createUserTokenOctokit(): Octokit {
  if (!env.GITHUB_TOKEN) {
    throw new Error(
      "GITHUB_TOKEN is not configured. Set a fine-grained PAT or classic token with pull request read/write.",
    );
  }
  return createTokenOctokit(env.GITHUB_TOKEN);
}

export async function fetchPullRequest(
  octokit: Octokit,
  ref: PrRef,
): Promise<PrSnapshot> {
  const { data: pr } = await octokit.pulls.get({
    owner: ref.owner,
    repo: ref.repo,
    pull_number: ref.number,
  });

  const files: PrFile[] = [];
  let page = 1;
  while (page <= 5) {
    const { data } = await octokit.pulls.listFiles({
      owner: ref.owner,
      repo: ref.repo,
      pull_number: ref.number,
      per_page: 50,
      page,
    });
    if (!data.length) break;
    for (const f of data) {
      let patch = f.patch;
      if (patch && patch.length > 8000) {
        patch = patch.slice(0, 8000) + "\n… [truncated]";
      }
      // skip huge generated files without useful patch
      if (!patch && (f.additions > 200 || f.deletions > 200)) continue;
      files.push({
        path: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        patch: patch ?? undefined,
      });
    }
    if (data.length < 50) break;
    page++;
  }

  // Cap files for AI context
  const capped = files
    .filter((f) => f.patch)
    .slice(0, 25);

  return {
    ref,
    title: pr.title,
    body: pr.body,
    author: pr.user?.login ?? null,
    base: pr.base.ref,
    head: pr.head.ref,
    draft: pr.draft ?? false,
    files: capped,
    htmlUrl: pr.html_url,
  };
}

export type ReviewCommentInput = {
  path: string;
  line: number;
  body: string;
  side?: "RIGHT" | "LEFT";
};

export async function submitPullRequestReview(
  octokit: Octokit,
  ref: PrRef,
  opts: {
    event: "COMMENT" | "APPROVE" | "REQUEST_CHANGES";
    body: string;
    comments: ReviewCommentInput[];
  },
): Promise<{ reviewId: number; htmlUrl?: string }> {
  // GitHub allows max 30 comments per review request typically; cap to 20
  const comments = opts.comments
    .filter((c) => c.path && c.line > 0 && c.body)
    .slice(0, 20)
    .map((c) => ({
      path: c.path,
      line: c.line,
      side: c.side ?? ("RIGHT" as const),
      body: c.body,
    }));

  try {
    const { data } = await octokit.pulls.createReview({
      owner: ref.owner,
      repo: ref.repo,
      pull_number: ref.number,
      event: opts.event,
      body: opts.body,
      comments: comments.length ? comments : undefined,
    });
    return { reviewId: data.id, htmlUrl: data.html_url ?? undefined };
  } catch (e) {
    // Fallback: body-only review if line comments fail (outdated lines, etc.)
    const msg = e instanceof Error ? e.message : String(e);
    if (comments.length) {
      const { data } = await octokit.pulls.createReview({
        owner: ref.owner,
        repo: ref.repo,
        pull_number: ref.number,
        event: opts.event,
        body:
          opts.body +
          "\n\n---\n### Inline findings (could not attach to lines)\n" +
          comments
            .map((c) => `- **${c.path}:${c.line}** — ${c.body}`)
            .join("\n"),
      });
      return {
        reviewId: data.id,
        htmlUrl: data.html_url ?? undefined,
      };
    }
    throw new Error(`Failed to post GitHub review: ${msg}`);
  }
}
