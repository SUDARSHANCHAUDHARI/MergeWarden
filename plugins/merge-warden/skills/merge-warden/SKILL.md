---
name: merge-warden
description: Scan profile-specific GitHub repositories, find branches needing pull requests, assess open PR readiness, open verified PRs, report blockers, and merge eligible PRs under personal or work safety policy. Use for repository housekeeping, PR inventory, PR creation, merge-readiness checks, scheduled maintenance, or guarded PR merges.
---

# MergeWarden

Run MergeWarden as a fail-closed GitHub housekeeping workflow. Treat reasoning and mutation as separate stages.

## Workflow

1. Resolve whether the active environment is the personal or work profile.
2. Load its MergeWarden configuration.
3. Verify the authenticated GitHub login, configured git email, repository remote, and repository allowlist.
4. Run `mergewarden scan` without `--apply` and present the proposed actions and blockers.
5. For PR creation, confirm the branch has unmerged commits, no equivalent open PR, a known base, passing configured verification, and no detected secrets.
6. For merging, require a non-draft PR, passing known checks, satisfied reviews, no conflicts, no unresolved review blockers, a known acceptable risk score, and an unchanged head SHA.
7. Require explicit approval for every work-profile merge. Permit personal-profile automatic merge only when configuration enables it and every gate passes.
8. Re-evaluate immediately before mutation. Use `--apply` only after the applicable approval policy is satisfied.
9. Report actions and exact blockers without exposing credentials.

## Safety rules

- Block on unknown identity, ownership, checks, reviews, conflicts, risk, or head SHA.
- Never override branch protection, auto-approve a review, resolve conflicts automatically, or modify GitHub Actions.
- Never act outside configured roots and repository allowlists.
- Keep scheduled runs idempotent and dry-run unless the profile policy explicitly authorizes mutations.
- Do not infer readiness from branch names, labels, or PR titles.

## Commands

Use the repository CLI with an explicit profile configuration:

```bash
mergewarden status --config /path/to/mergewarden.config.json
mergewarden scan --config /path/to/mergewarden.config.json
mergewarden scan --config /path/to/mergewarden.config.json --apply
```

Start with `status` when identity or profile selection is uncertain. Never add `--apply` merely because the user asked for a report.
