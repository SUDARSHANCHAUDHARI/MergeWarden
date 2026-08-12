#!/usr/bin/env node
import { resolve } from "node:path";
import { writeAudit } from "./audit.js";
import { loadConfig } from "./config.js";
import {
  getOpenPullRequest,
  listOpenPullRequests,
  mergePullRequest,
  toPullRequestState,
  verifyGitHubIdentity
} from "./github.js";
import { openCandidatePullRequests } from "./open.js";
import { evaluateMerge } from "./policy.js";
import type { AuditRecord, ProfileConfig } from "./types.js";

const VERSION = "0.1.0";

interface Options {
  command: "status" | "scan" | "open" | "check" | "merge";
  configPath: string;
  repository?: string;
  pullRequest?: number;
  head?: string;
  apply: boolean;
  scheduled: boolean;
  approveWorkMerge: boolean;
  deleteBranch: boolean;
}

const HELP = `MergeWarden ${VERSION}

Usage:
  mergewarden status [--config PATH]
  mergewarden scan [--repo OWNER/NAME] [--pr NUMBER] [--config PATH]
  mergewarden open --repo OWNER/NAME --head BRANCH [--apply] [--config PATH]
  mergewarden check --repo OWNER/NAME --pr NUMBER [--config PATH]
  mergewarden merge --repo OWNER/NAME --pr NUMBER --apply [--delete-branch] [--approve-work-merge] [--config PATH]

Scheduled use:
  mergewarden scan --scheduled [--apply] --config PATH

Safety:
  Dry-run is the default. Manual scan never mutates. Scheduled apply requires scheduledApply=true.
`;

function flagValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value.`);
  return value;
}

export function parseArgs(args: string[]): Options | "help" | "version" {
  if (args.includes("--help") || args.includes("-h")) return "help";
  if (args.includes("--version") || args.includes("-v")) return "version";
  const rawCommand = args[0] ?? "status";
  if (!["status", "scan", "open", "check", "merge"].includes(rawCommand)) {
    throw new Error(`Unsupported command: ${rawCommand}`);
  }
  const pullRequestValue = flagValue(args, "--pr");
  const pullRequest = pullRequestValue === undefined ? undefined : Number(pullRequestValue);
  if (pullRequest !== undefined && (!Number.isSafeInteger(pullRequest) || pullRequest <= 0)) {
    throw new Error("--pr must be a positive integer.");
  }
  const result: Options = {
    command: rawCommand as Options["command"],
    configPath: resolve(flagValue(args, "--config") ?? "mergewarden.config.json"),
    apply: args.includes("--apply"),
    scheduled: args.includes("--scheduled"),
    approveWorkMerge: args.includes("--approve-work-merge"),
    deleteBranch: args.includes("--delete-branch")
  };
  const repository = flagValue(args, "--repo");
  const head = flagValue(args, "--head");
  if (repository !== undefined) result.repository = repository;
  if (pullRequest !== undefined) result.pullRequest = pullRequest;
  if (head !== undefined) result.head = head;
  return result;
}

function requireAllowedRepository(config: ProfileConfig, repository: string | undefined): string {
  if (!repository) throw new Error("--repo is required.");
  if (!config.repositoryAllowlist.includes(repository)) throw new Error(`${repository} is not allowlisted.`);
  return repository;
}

function selectedRepositories(config: ProfileConfig, repository?: string): string[] {
  if (!repository) return config.repositoryAllowlist;
  return [requireAllowedRepository(config, repository)];
}

function auditRecord(config: ProfileConfig, values: Omit<AuditRecord, "timestamp" | "profile">): AuditRecord {
  return { timestamp: new Date().toISOString(), profile: config.profile, ...values };
}

async function inspectPullRequest(config: ProfileConfig, repository: string, number: number, approval: boolean) {
  const pullRequest = await getOpenPullRequest(repository, number);
  if (!pullRequest) throw new Error(`${repository}#${number} is not an open pull request.`);
  const state = toPullRequestState(config, pullRequest);
  state.approvalProvided = approval;
  return { pullRequest, state, decision: evaluateMerge(config, state) };
}

async function runMerge(config: ProfileConfig, options: Options): Promise<void> {
  const repository = requireAllowedRepository(config, options.repository);
  if (!options.pullRequest) throw new Error("--pr is required.");
  if (!options.apply) throw new Error("merge requires --apply after a dry check.");
  const inspected = await inspectPullRequest(config, repository, options.pullRequest, options.approveWorkMerge);
  if (!inspected.decision.eligible) {
    await writeAudit(config.auditLogPath, auditRecord(config, {
      action: "merge", repository, target: `#${options.pullRequest}`, mode: "apply", decision: "blocked",
      reasons: inspected.decision.blockers, headOid: inspected.state.headOid
    }));
    throw new Error(`${repository}#${options.pullRequest}: ${inspected.decision.blockers.join("; ")}`);
  }
  await verifyGitHubIdentity(config.githubAccount);
  const current = await getOpenPullRequest(repository, options.pullRequest);
  if (!current || current.headRefOid !== inspected.state.headOid) throw new Error(`${repository}#${options.pullRequest}: head changed before merge.`);
  const deleteBranch = options.deleteBranch || config.deleteBranchAfterMerge;
  try {
    await mergePullRequest(repository, options.pullRequest, config.mergeMethod, deleteBranch);
    await writeAudit(config.auditLogPath, auditRecord(config, {
      action: "merge", repository, target: `#${options.pullRequest}`, mode: "apply", decision: "completed",
      reasons: [deleteBranch ? "merged; branch deletion requested" : "merged; branch preserved"], headOid: inspected.state.headOid
    }));
    process.stdout.write(`${repository}#${options.pullRequest}: merged at ${inspected.state.headOid}; branch ${deleteBranch ? "deletion requested" : "preserved"}\n`);
  } catch (error) {
    await writeAudit(config.auditLogPath, auditRecord(config, {
      action: "merge", repository, target: `#${options.pullRequest}`, mode: "apply", decision: "failed",
      reasons: [error instanceof Error ? error.message : "unknown merge error"], headOid: inspected.state.headOid
    }));
    throw error;
  }
}

async function runCheck(config: ProfileConfig, options: Options): Promise<void> {
  const repository = requireAllowedRepository(config, options.repository);
  if (!options.pullRequest) throw new Error("--pr is required.");
  const inspected = await inspectPullRequest(config, repository, options.pullRequest, options.approveWorkMerge);
  if (inspected.decision.eligible) process.stdout.write(`${repository}#${options.pullRequest}: eligible at ${inspected.state.headOid}\n`);
  else process.stdout.write(`${repository}#${options.pullRequest}: blocked — ${inspected.decision.blockers.join("; ")}\n`);
}

async function runOpen(config: ProfileConfig, options: Options): Promise<void> {
  const repository = requireAllowedRepository(config, options.repository);
  if (!config.autoOpenPullRequests) throw new Error("pull request creation is disabled by configuration.");
  if (!options.head) throw new Error("--head is required.");
  if (!(config.candidateBranches[repository] ?? []).includes(options.head)) throw new Error(`${repository}:${options.head} is not a configured candidate branch.`);
  const scopedConfig = { ...config, candidateBranches: { [repository]: [options.head] } };
  for (const message of await openCandidatePullRequests(scopedConfig, repository, options.apply)) {
    process.stdout.write(`${message}\n`);
    await writeAudit(config.auditLogPath, auditRecord(config, {
      action: "open",
      repository,
      target: options.head,
      mode: options.apply ? "apply" : "dry-run",
      decision: message.includes(": opened ") ? "completed" : message.includes(": would open ") ? "allowed" : "blocked",
      reasons: [message]
    }));
  }
}

async function runScan(config: ProfileConfig, options: Options): Promise<void> {
  if (options.apply && !options.scheduled) throw new Error("manual scan is read-only; use targeted open or merge commands.");
  if (options.apply && !config.scheduledApply) throw new Error("scheduled apply is disabled by configuration.");
  if (options.pullRequest !== undefined && !options.repository) throw new Error("--pr requires --repo.");
  for (const repository of selectedRepositories(config, options.repository)) {
    if (options.apply && config.autoOpenPullRequests) {
      for (const head of config.candidateBranches[repository] ?? []) {
        await runOpen(config, { ...options, command: "open", repository, head, apply: true });
      }
    }
    const pullRequests = await listOpenPullRequests(repository);
    const selected = options.pullRequest === undefined ? pullRequests : pullRequests.filter((pr) => pr.number === options.pullRequest);
    process.stdout.write(`${repository}: ${selected.length} selected open pull request(s)\n`);
    for (const pullRequest of selected) {
      const state = toPullRequestState(config, pullRequest);
      state.approvalProvided = false;
      const decision = evaluateMerge(config, state);
      if (!decision.eligible) {
        process.stdout.write(`  #${state.number}: blocked — ${decision.blockers.join("; ")}\n`);
        continue;
      }
      if (!options.apply) {
        process.stdout.write(`  #${state.number}: eligible at ${state.headOid}\n`);
        continue;
      }
      await runMerge(config, {
        ...options,
        command: "merge",
        repository,
        pullRequest: state.number,
        approveWorkMerge: false
      });
    }
  }
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed === "help") return void process.stdout.write(HELP);
  if (parsed === "version") return void process.stdout.write(`${VERSION}\n`);
  const config = await loadConfig(parsed.configPath);
  await verifyGitHubIdentity(config.githubAccount);
  process.stdout.write(`MergeWarden ${VERSION} | profile=${config.profile} | identity=${config.githubAccount} | mode=${parsed.apply ? "apply" : "dry-run"}\n`);
  if (parsed.command === "status") return;
  if (parsed.command === "scan") return runScan(config, parsed);
  if (parsed.command === "open") return runOpen(config, parsed);
  if (parsed.command === "check") return runCheck(config, parsed);
  return runMerge(config, parsed);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`MergeWarden blocked: ${message}\n`);
  process.exitCode = 1;
});
