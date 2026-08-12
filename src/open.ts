import { access } from "node:fs/promises";
import { join } from "node:path";
import type { ProfileConfig } from "./types.js";
import { createPullRequest, defaultBranch, run } from "./github.js";

const secretPattern = /(gh[pousr]_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----)/;

async function repositoryPath(config: ProfileConfig, repository: string): Promise<string> {
  const name = repository.split("/").at(-1);
  if (!name) throw new Error(`Invalid repository name: ${repository}`);
  for (const root of config.repositoryRoots) {
    const candidate = join(root, name);
    try {
      await access(join(candidate, ".git"));
      return candidate;
    } catch {
      // Continue to the next configured root.
    }
  }
  throw new Error(`No local checkout found for ${repository}.`);
}

function repositoryFromRemote(remote: string): string | undefined {
  const normalized = remote.trim().replace(/\.git$/, "");
  const match = normalized.match(/github\.com[/:]([^/]+\/[^/]+)$/i);
  return match?.[1];
}

export async function openCandidatePullRequests(config: ProfileConfig, repository: string, apply: boolean): Promise<string[]> {
  const messages: string[] = [];
  const branches = config.candidateBranches[repository] ?? [];
  if (branches.length === 0) return messages;
  const cwd = await repositoryPath(config, repository);
  const remote = await run("git", ["remote", "get-url", "origin"], cwd);
  if (repositoryFromRemote(remote)?.toLowerCase() !== repository.toLowerCase()) throw new Error(`${repository}: origin remote does not match.`);
  const gitEmail = await run("git", ["config", "user.email"], cwd);
  if (gitEmail !== config.gitEmail) throw new Error(`${repository}: git email does not match the active profile.`);
  const base = await defaultBranch(repository);

  for (const branch of branches) {
    await run("git", ["fetch", "--quiet", "origin", base], cwd);
    const remoteBase = `origin/${base}`;
    const ahead = Number(await run("git", ["rev-list", "--count", `${remoteBase}..${branch}`], cwd));
    if (!Number.isFinite(ahead) || ahead <= 0) {
      messages.push(`${repository}:${branch}: blocked (no commits ahead of ${base})`);
      continue;
    }
    const existing = await run("gh", ["pr", "list", "--repo", repository, "--head", branch, "--state", "open", "--json", "number", "--jq", "length"]);
    if (Number(existing) > 0) {
      messages.push(`${repository}:${branch}: skipped (open PR already exists)`);
      continue;
    }
    const commands = config.verificationCommands[repository] ?? [];
    if (commands.length === 0) {
      messages.push(`${repository}:${branch}: blocked (no verification commands configured)`);
      continue;
    }
    for (const [command, ...args] of commands) {
      if (!command) throw new Error(`${repository}: verification command cannot be empty.`);
      await run(command, args, cwd);
    }
    const diff = await run("git", ["diff", `${remoteBase}...${branch}`], cwd);
    if (secretPattern.test(diff)) {
      messages.push(`${repository}:${branch}: blocked (possible secret in diff)`);
      continue;
    }
    if (!apply) {
      messages.push(`${repository}:${branch}: would open PR (${ahead} commit(s) ahead)`);
      continue;
    }
    await run("git", ["push", "--set-upstream", "origin", branch], cwd);
    const url = await createPullRequest(repository, base, branch, cwd);
    messages.push(`${repository}:${branch}: opened ${url}`);
  }
  return messages;
}
