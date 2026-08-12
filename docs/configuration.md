# Configuration

Configuration is JSON and should be stored outside a public repository when it names private repositories.

## Fields

- `profile`: `personal` or `work`.
- `githubAccount`: exact login returned by `gh api user`.
- `gitEmail`: exact local repository email required for PR creation.
- `repositoryRoots`: parent directories containing allowlisted local checkouts.
- `repositoryAllowlist`: exact `owner/name` values MergeWarden may inspect or mutate.
- `candidateBranches`: explicit branches eligible for PR creation, keyed by repository.
- `verificationCommands`: executable plus argument arrays, keyed by repository. No shell is used.
- `autoOpenPullRequests`: allow configured PR creation.
- `autoMergeLowRisk`: permit merge policy to mark low-risk PRs eligible.
- `requireMergeApproval`: require invocation-scoped approval. Must be true for work profiles.
- `mergeMethod`: `merge`, `squash`, or `rebase`.
- `riskThreshold`: maximum deterministic score from 0 to 100.
- `requireReview`: require GitHub `APPROVED` review state.
- `scheduledApply`: allow the scheduled runner to mutate. Defaults to false.
- `deleteBranchAfterMerge`: request branch deletion after merge. Defaults to false.
- `auditLogPath`: local JSONL mutation audit path.

## Verification commands

Commands are arrays, not shell strings:

```json
"verificationCommands": {
  "owner/repo": [["pnpm", "test"], ["pnpm", "typecheck"]]
}
```

Commands run from the verified local checkout. A missing command, non-zero exit, remote mismatch, git-email mismatch, duplicate PR, empty diff, or possible secret blocks PR creation.
