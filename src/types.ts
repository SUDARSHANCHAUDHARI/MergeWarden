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
  scheduledApply: boolean;
  deleteBranchAfterMerge: boolean;
  auditLogPath: string;
}

export interface PullRequestState {
  number: number;
  title: string;
  url: string;
  headOid: string;
  isDraft: boolean;
  hasConflicts: boolean;
  mergeStateKnown: boolean;
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

export type AuditAction = "open" | "merge" | "scan";

export interface AuditRecord {
  timestamp: string;
  profile: ProfileKind;
  action: AuditAction;
  repository: string;
  target: string;
  mode: "dry-run" | "apply";
  decision: "allowed" | "blocked" | "completed" | "failed";
  reasons: string[];
  headOid?: string;
}
