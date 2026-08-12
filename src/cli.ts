#!/usr/bin/env node
import { resolve } from "node:path";
import { loadConfig } from "./config.js";
import { listOpenPullRequests, mergePullRequest, toPullRequestState, verifyGitHubIdentity } from "./github.js";
import { openCandidatePullRequests } from "./open.js";
import { evaluateMerge } from "./policy.js";

function valueAfter(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] ?? "status";
  const configPath = resolve(valueAfter(args, "--config") ?? "mergewarden.config.json");
  const apply = args.includes("--apply");
  const approval = args.includes("--approve-work-merge");
  const config = await loadConfig(configPath);

  await verifyGitHubIdentity(config.githubAccount);
  process.stdout.write(`MergeWarden profile: ${config.profile}\nGitHub identity: ${config.githubAccount} (verified)\nMode: ${apply ? "apply" : "dry-run"}\n`);
  if (command === "status") return;
  if (command !== "scan") throw new Error(`Unsupported command: ${command}`);

  for (const repository of config.repositoryAllowlist) {
    if (config.autoOpenPullRequests) {
      for (const message of await openCandidatePullRequests(config, repository, apply)) process.stdout.write(`${message}\n`);
    }
    const pullRequests = await listOpenPullRequests(repository);
    process.stdout.write(`${repository}: ${pullRequests.length} open pull request(s)\n`);
    for (const pullRequest of pullRequests) {
      const state = toPullRequestState(config, pullRequest);
      state.approvalProvided = approval;
      const decision = evaluateMerge(config, state);
      if (!decision.eligible) {
        process.stdout.write(`  #${state.number}: blocked — ${decision.blockers.join("; ")}\n`);
        continue;
      }
      if (!apply) {
        process.stdout.write(`  #${state.number}: would merge at ${state.headOid}\n`);
        continue;
      }
      await verifyGitHubIdentity(config.githubAccount);
      const current = (await listOpenPullRequests(repository)).find((pr) => pr.number === state.number);
      if (!current || current.headRefOid !== state.headOid) throw new Error(`${repository}#${state.number}: head changed before merge.`);
      await mergePullRequest(repository, state.number, config.mergeMethod);
      process.stdout.write(`  #${state.number}: merged\n`);
    }
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`MergeWarden blocked: ${message}\n`);
  process.exitCode = 1;
});
