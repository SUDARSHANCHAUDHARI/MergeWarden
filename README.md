# MergeWarden

Profile-aware GitHub pull-request housekeeping for Codex and Claude Code.

MergeWarden verifies the active GitHub identity before inspecting configured repositories. It is dry-run by default and fails closed when checks, reviews, conflicts, risk, or approval cannot be verified.

## Current status

The implementation provides profile validation, GitHub identity verification, explicit repository and candidate-branch allowlists, verified PR creation, deterministic merge policy evaluation, guarded merge execution, daily launch-agent templates, and Codex/Claude adapters.

## Development

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm validate:skill
pnpm validate:plugin
```

Copy the appropriate example configuration and explicitly add repositories to its allowlist:

```bash
cp config/personal.example.json mergewarden.config.json
pnpm build
node dist/src/cli.js status --config mergewarden.config.json
node dist/src/cli.js scan --config mergewarden.config.json
```

Add `--apply` only when the proposed actions have been reviewed. Work merges additionally require `--approve-work-merge`; this flag represents approval for that invocation and is never stored.

Candidate branches are opt-in. Add commands as argument arrays so they execute without a shell:

```json
{
  "repositoryAllowlist": ["SUDARSHANCHAUDHARI/example"],
  "candidateBranches": { "SUDARSHANCHAUDHARI/example": ["feature/example"] },
  "verificationCommands": { "SUDARSHANCHAUDHARI/example": [["pnpm", "test"]] }
}
```

Do not commit a profile configuration if it contains private repository names or local operational policy.
