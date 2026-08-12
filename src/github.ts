import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ProfileConfig, PullRequestState } from "./types.js";

const execFileAsync = promisify(execFile);

interface GitHubCheck {
  conclusion?: string;
  status?: string;
}

interface GitHubFile {
  path: string;
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  url: string;
  headRefOid: string;
  isDraft: boolean;
  mergeStateStatus: string;
  reviewDecision: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  files: GitHubFile[];
  statusCheckRollup: GitHubCheck[];
}

export async function run(command: string, args: string[], cwd?: string): Promise<string> {
  const options = { encoding: "utf8" as const, maxBuffer: 10 * 1024 * 1024, ...(cwd ? { cwd } : {}) };
  const { stdout } = await execFileAsync(command, args, options);
  return stdout.trim();
}

export async function verifyGitHubIdentity(expectedAccount: string): Promise<void> {
  const actual = await run("gh", ["api", "user", "--jq", ".login"]);
  if (actual !== expectedAccount) {
    throw new Error(`GitHub identity mismatch: expected ${expectedAccount}, received ${actual || "unknown"}.`);
  }
}

export async function defaultBranch(repository: string): Promise<string> {
  return run("gh", ["repo", "view", repository, "--json", "defaultBranchRef", "--jq", ".defaultBranchRef.name"]);
}

export async function listOpenPullRequests(repository: string): Promise<GitHubPullRequest[]> {
  const fields = "number,title,url,headRefOid,isDraft,mergeStateStatus,reviewDecision,statusCheckRollup,additions,deletions,changedFiles,files";
  const output = await run("gh", ["pr", "list", "--repo", repository, "--state", "open", "--limit", "100", "--json", fields]);
  return JSON.parse(output) as GitHubPullRequest[];
}

export function toPullRequestState(config: ProfileConfig, pr: GitHubPullRequest): PullRequestState {
  const checks = pr.statusCheckRollup ?? [];
  const checksKnown = checks.length > 0;
  const checksPass = checksKnown && checks.every((check) => {
    if (check.conclusion) return ["SUCCESS", "NEUTRAL", "SKIPPED"].includes(check.conclusion);
    return check.status === "COMPLETED";
  });
  const sensitive = pr.files.some((file) => /(^|\/)(auth|security|migration|migrations|\.github)(\/|$)|\.env|lock$/i.test(file.path));
  const sizeRisk = Math.min(60, Math.ceil((pr.additions + pr.deletions) / 50) + pr.changedFiles * 2);
  const riskScore = Math.min(100, sizeRisk + (sensitive ? 30 : 0));

  return {
    number: pr.number,
    title: pr.title,
    url: pr.url,
    headOid: pr.headRefOid,
    isDraft: pr.isDraft,
    hasConflicts: pr.mergeStateStatus === "DIRTY",
    checksKnown,
    checksPass,
    reviewsSatisfied: config.requireReview ? pr.reviewDecision === "APPROVED" : pr.reviewDecision !== "CHANGES_REQUESTED",
    unresolvedReviewBlockers: pr.reviewDecision === "CHANGES_REQUESTED",
    riskKnown: true,
    riskScore,
    approvalProvided: false
  };
}

export async function mergePullRequest(repository: string, number: number, method: ProfileConfig["mergeMethod"]): Promise<void> {
  await run("gh", ["pr", "merge", String(number), "--repo", repository, `--${method}`, "--delete-branch"]);
}

export async function createPullRequest(repository: string, base: string, head: string, cwd: string): Promise<string> {
  return run("gh", ["pr", "create", "--repo", repository, "--base", base, "--head", head, "--fill"], cwd);
}
