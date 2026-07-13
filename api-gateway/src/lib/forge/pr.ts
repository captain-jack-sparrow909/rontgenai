import type { Octokit } from "@octokit/rest";
import type { ForgeFileChange } from "./plan.js";
import type { IssueRef } from "./issue.js";

export type CreatedPr = {
  number: number;
  htmlUrl: string;
  branch: string;
};

function branchName(issueNumber: number): string {
  const stamp = Date.now().toString(36).slice(-5);
  return `forge/issue-${issueNumber}-${stamp}`;
}

async function getFileSha(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  ref: string,
): Promise<string | undefined> {
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });
    if (!Array.isArray(data) && data.type === "file") return data.sha;
  } catch {
    /* missing */
  }
  return undefined;
}

/**
 * Create branch from default, apply file changes, open PR linked to issue.
 */
export async function createBranchAndPr(
  octokit: Octokit,
  opts: {
    issue: IssueRef;
    defaultBranch: string;
    changes: ForgeFileChange[];
    prTitle: string;
    prBody: string;
  },
): Promise<CreatedPr> {
  const { owner, repo, number: issueNumber } = opts.issue;
  const branch = branchName(issueNumber);

  const { data: refData } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${opts.defaultBranch}`,
  });
  const baseSha = refData.object.sha;

  try {
    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branch}`,
      sha: baseSha,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to create branch: ${msg}`);
  }

  for (const change of opts.changes) {
    if (change.action === "delete") {
      const sha = await getFileSha(
        octokit,
        owner,
        repo,
        change.path,
        branch,
      );
      if (!sha) continue;
      await octokit.repos.deleteFile({
        owner,
        repo,
        path: change.path,
        message: `forge: delete ${change.path} (issue #${issueNumber})`,
        sha,
        branch,
      });
      continue;
    }

    const content = change.content ?? "";
    if (content.length > 400_000) {
      throw new Error(`File too large to commit: ${change.path}`);
    }

    const sha = await getFileSha(octokit, owner, repo, change.path, branch);
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: change.path,
      message: `forge: ${change.action} ${change.path} (issue #${issueNumber})`,
      content: Buffer.from(content, "utf8").toString("base64"),
      branch,
      ...(sha ? { sha } : {}),
    });
  }

  const body = [
    opts.prBody,
    "",
    "---",
    `Closes #${issueNumber}`,
    "",
    "_Opened by [Röntgen AI · Forge](https://rontgenai.dev)_",
  ].join("\n");

  const { data: pr } = await octokit.pulls.create({
    owner,
    repo,
    title: opts.prTitle.slice(0, 120),
    head: branch,
    base: opts.defaultBranch,
    body,
  });

  return {
    number: pr.number,
    htmlUrl: pr.html_url,
    branch,
  };
}
