import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";

const cli = resolve("dist/src/cli.js");

function runCli(args: string[], env: NodeJS.ProcessEnv): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, [cli, ...args], { env });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (code) => resolveRun({ code, stdout, stderr }));
  });
}

async function fixture(options: { scheduledApply?: boolean; deleteBranchAfterMerge?: boolean } = {}) {
  const root = await mkdtemp(join(tmpdir(), "mergewarden-test-"));
  const bin = join(root, "bin");
  const log = join(root, "gh.log");
  const config = join(root, "config.json");
  await import("node:fs/promises").then(({ mkdir }) => mkdir(bin));
  const gh = join(bin, "gh");
  await writeFile(gh, `#!/bin/sh
if [ "$1" = "api" ]; then printf 'owner\\n'; exit 0; fi
if [ "$1" = "pr" ] && [ "$2" = "view" ]; then
  printf '%s\\n' '{"number":7,"title":"Safe","url":"https://github.com/owner/repo/pull/7","headRefOid":"abc123","isDraft":false,"mergeStateStatus":"CLEAN","reviewDecision":"","additions":5,"deletions":2,"changedFiles":1,"files":[{"path":"src/a.ts"}],"statusCheckRollup":[{"conclusion":"SUCCESS","status":"COMPLETED"}],"state":"OPEN"}'
  exit 0
fi
if [ "$1" = "pr" ] && [ "$2" = "list" ]; then
  printf '%s\\n' '[{"number":7,"title":"Safe","url":"https://github.com/owner/repo/pull/7","headRefOid":"abc123","isDraft":false,"mergeStateStatus":"CLEAN","reviewDecision":"","additions":5,"deletions":2,"changedFiles":1,"files":[{"path":"src/a.ts"}],"statusCheckRollup":[{"conclusion":"SUCCESS","status":"COMPLETED"}]}]'
  exit 0
fi
if [ "$1" = "pr" ] && [ "$2" = "merge" ]; then printf '%s\\n' "$*" >> "$GH_LOG"; exit 0; fi
printf 'unexpected gh call: %s\\n' "$*" >&2
exit 2
`);
  await chmod(gh, 0o755);
  await writeFile(config, JSON.stringify({
    profile: "personal",
    githubAccount: "owner",
    gitEmail: "owner@example.com",
    repositoryRoots: [],
    repositoryAllowlist: ["owner/repo"],
    candidateBranches: { "owner/repo": [] },
    verificationCommands: { "owner/repo": [["true"]] },
    autoOpenPullRequests: false,
    autoMergeLowRisk: true,
    requireMergeApproval: false,
    mergeMethod: "squash",
    riskThreshold: 30,
    requireReview: false,
    scheduledApply: options.scheduledApply ?? false,
    deleteBranchAfterMerge: options.deleteBranchAfterMerge ?? false,
    auditLogPath: join(root, "audit.jsonl")
  }));
  return { root, config, log, env: { ...process.env, PATH: `${bin}:${process.env.PATH ?? ""}`, GH_LOG: log } };
}

test("manual bulk scan refuses apply mode", async () => {
  const testFixture = await fixture();
  const result = await runCli(["scan", "--config", testFixture.config, "--apply"], testFixture.env);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /manual scan is read-only/);
});

test("scheduled apply is disabled by default", async () => {
  const testFixture = await fixture();
  const result = await runCli(["scan", "--scheduled", "--config", testFixture.config, "--apply"], testFixture.env);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /scheduled apply is disabled/);
});

test("targeted merge preserves the branch by default", async () => {
  const testFixture = await fixture();
  const result = await runCli(["merge", "--repo", "owner/repo", "--pr", "7", "--apply", "--config", testFixture.config], testFixture.env);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /owner\/repo#7: merged/);
  const log = await readFile(testFixture.log, "utf8");
  assert.match(log, /^pr merge 7 --repo owner\/repo --squash/m);
  assert.doesNotMatch(log, /--delete-branch/);
});

test("branch deletion requires an explicit flag", async () => {
  const testFixture = await fixture();
  const result = await runCli(["merge", "--repo", "owner/repo", "--pr", "7", "--apply", "--delete-branch", "--config", testFixture.config], testFixture.env);
  assert.equal(result.code, 0, result.stderr);
  const log = await readFile(testFixture.log, "utf8");
  assert.match(log, /--delete-branch/);
});

test("targeted open respects disabled configuration", async () => {
  const testFixture = await fixture();
  const result = await runCli(["open", "--repo", "owner/repo", "--head", "feature/example", "--apply", "--config", testFixture.config], testFixture.env);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /pull request creation is disabled/);
});

test("help and version do not require GitHub access", async () => {
  const help = await runCli(["--help"], process.env);
  const version = await runCli(["--version"], process.env);
  assert.equal(help.code, 0);
  assert.match(help.stdout, /Manual scan never mutates/);
  assert.equal(version.stdout.trim(), "0.1.0");
});
