# Architecture

MergeWarden is a local TypeScript CLI. It has no server, database, telemetry, or hosted control plane.

## Components

- `src/cli.ts` parses commands, selects one profile, and keeps inspection separate from mutation.
- `src/config.ts` validates trusted local JSON configuration.
- `src/github.ts` invokes `gh` with argument arrays and normalizes PR evidence.
- `src/open.ts` verifies a local checkout, profile email, remote, candidate branch, test commands, and diff secret patterns before opening a PR.
- `src/policy.ts` produces deterministic merge blockers.
- `src/audit.ts` appends structured mutation outcomes to a local JSONL file.
- `plugins/merge-warden/` provides Codex and Claude Code adapters over the same CLI.

## Trust boundaries

The local profile configuration is trusted. Repository contents, branch names, PR metadata, and command output are untrusted evidence. External commands are executed directly without a shell. GitHub remains authoritative for branch protection and the final merge transaction.

## Mutation flow

1. Validate configuration and active GitHub identity.
2. Require an allowlisted repository and explicit branch or PR target.
3. Collect current evidence.
4. Produce deterministic blockers.
5. Re-check identity and head SHA immediately before mutation.
6. Invoke one `gh` mutation.
7. Append an audit outcome.
