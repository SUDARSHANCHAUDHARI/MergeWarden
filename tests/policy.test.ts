import assert from "node:assert/strict";
import test from "node:test";
import { evaluateMerge } from "../src/policy.js";
import type { ProfileConfig, PullRequestState } from "../src/types.js";

const personal: ProfileConfig = {
  profile: "personal",
  githubAccount: "SUDARSHANCHAUDHARI",
  gitEmail: "sunny.sudarshan@gmail.com",
  repositoryRoots: [],
  repositoryAllowlist: [],
  candidateBranches: {},
  verificationCommands: {},
  autoOpenPullRequests: true,
  autoMergeLowRisk: true,
  requireMergeApproval: false,
  mergeMethod: "squash",
  riskThreshold: 30,
  requireReview: false,
  scheduledApply: false,
  deleteBranchAfterMerge: false,
  auditLogPath: ".mergewarden/audit.jsonl"
};

const safePullRequest: PullRequestState = {
  number: 1,
  title: "Safe change",
  url: "https://github.com/example/repo/pull/1",
  headOid: "abc123",
  isDraft: false,
  hasConflicts: false,
  mergeStateKnown: true,
  checksKnown: true,
  checksPass: true,
  reviewsSatisfied: true,
  unresolvedReviewBlockers: false,
  riskKnown: true,
  riskScore: 10,
  approvalProvided: false
};

test("allows a verified low-risk personal pull request", () => {
  assert.deepEqual(evaluateMerge(personal, safePullRequest), { eligible: true, blockers: [] });
});

test("fails closed when required check status is unknown", () => {
  const result = evaluateMerge(personal, { ...safePullRequest, checksKnown: false });
  assert.equal(result.eligible, false);
  assert.ok(result.blockers.includes("required check status is unknown"));
});

test("requires explicit approval for work merges", () => {
  const work: ProfileConfig = { ...personal, profile: "work", autoMergeLowRisk: true, requireMergeApproval: true };
  const result = evaluateMerge(work, safePullRequest);
  assert.equal(result.eligible, false);
  assert.ok(result.blockers.includes("explicit merge approval is required"));
});

test("fails closed when merge state is unknown", () => {
  const result = evaluateMerge(personal, { ...safePullRequest, mergeStateKnown: false });
  assert.equal(result.eligible, false);
  assert.ok(result.blockers.includes("merge state is unknown"));
});
