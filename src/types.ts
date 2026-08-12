export type ProfileKind = "personal" | "work";

export interface ProfileConfig {
  profile: ProfileKind;
  githubAccount: string;
  gitEmail: string;
  repositoryRoots: string[];
  repositoryAllowlist: string[];
  candidateBranches: Record<string, string[]>;
  verificationCommands: Record<string, string[][]>;
  autoOpenPullRequests: boolean;
  autoMergeLowRisk: boolean;
  requireMergeApproval: boolean;
  mergeMethod: "merge" | "squash" | "rebase";
  riskThreshold: number;
  requireReview: boolean;
}

export interface PullRequestState {
  number: number;
  title: string;
  url: string;
  headOid: string;
  isDraft: boolean;
  hasConflicts: boolean;
  checksKnown: boolean;
  checksPass: boolean;
  reviewsSatisfied: boolean;
  unresolvedReviewBlockers: boolean;
  riskKnown: boolean;
  riskScore: number;
  approvalProvided: boolean;
}

export interface MergeDecision {
  eligible: boolean;
  blockers: string[];
}
