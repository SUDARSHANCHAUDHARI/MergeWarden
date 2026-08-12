# MergeWarden project instructions

- Keep GitHub mutations dry-run unless the user explicitly supplies `--apply`.
- Verify the active profile, GitHub account, repository remote, and evaluated head SHA before any mutation.
- Work profiles always require explicit human approval before merge.
- Never override branch protection, approve reviews, resolve conflicts automatically, or modify GitHub Actions without explicit approval.
- Treat unknown checks, reviews, conflicts, risk, identity, or repository ownership as blockers.
