import assert from "node:assert/strict";
import test from "node:test";
import { toPullRequestState, type GitHubPullRequest } from "../src/github.js";
import type { ProfileConfig } from "../src/types.js";

const config: ProfileConfig = {
  profile: "personal",
  githubAccount: "owner",
  gitEmail: "owner@example.com",
  repositoryRoots: [],
  repositoryAllowlist: [],
  candidateBranches: {},
  verificationCommands: {},
  autoOpenPullRequests: true,
  autoMergeLowRisk: true,
  requireMergeApproval: false,
  mergeMethod: "squash",
  riskThreshold: 30,
  requireReview: false
};

const pullRequest: GitHubPullRequest = {
  number: 1,
  title: "Change",
  url: "https://github.com/owner/repo/pull/1",
  headRefOid: "abc",
  isDraft: false,
  mergeStateStatus: "CLEAN",
  reviewDecision: "",
  additions: 10,
  deletions: 5,
  changedFiles: 1,
  files: [{ path: "src/index.ts" }],
  statusCheckRollup: [{ conclusion: "SUCCESS", status: "COMPLETED" }]
};

test("maps successful checks and low-risk files", () => {
  const state = toPullRequestState(config, pullRequest);
  assert.equal(state.checksKnown, true);
  assert.equal(state.checksPass, true);
  assert.ok(state.riskScore <= config.riskThreshold);
});

test("does not treat a completed failed check as passing", () => {
  const state = toPullRequestState(config, {
    ...pullRequest,
    statusCheckRollup: [{ conclusion: "FAILURE", status: "COMPLETED" }]
  });
  assert.equal(state.checksPass, false);
});

test("adds risk for sensitive paths", () => {
  const state = toPullRequestState(config, { ...pullRequest, files: [{ path: ".github/workflows/ci.yml" }] });
  assert.ok(state.riskScore > config.riskThreshold);
});
