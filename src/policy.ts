import type { MergeDecision, ProfileConfig, PullRequestState } from "./types.js";

export function evaluateMerge(config: ProfileConfig, pr: PullRequestState): MergeDecision {
  const blockers: string[] = [];

  if (pr.isDraft) blockers.push("pull request is a draft");
  if (pr.hasConflicts) blockers.push("merge conflicts are present");
  if (!pr.checksKnown) blockers.push("required check status is unknown");
  else if (!pr.checksPass) blockers.push("required checks are not passing");
  if (!pr.reviewsSatisfied) blockers.push("required reviews are not satisfied");
  if (pr.unresolvedReviewBlockers) blockers.push("review blockers remain unresolved");
  if (!pr.riskKnown) blockers.push("risk is unknown");
  else if (pr.riskScore > config.riskThreshold) blockers.push("risk exceeds the configured threshold");
  if (!config.autoMergeLowRisk) blockers.push("automatic merge is disabled");
  if (config.requireMergeApproval && !pr.approvalProvided) blockers.push("explicit merge approval is required");

  return { eligible: blockers.length === 0, blockers };
}
