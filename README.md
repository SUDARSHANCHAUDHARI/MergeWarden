# MergeWarden

Profile-aware GitHub pull-request housekeeping for Codex and Claude Code.

MergeWarden inventories open PRs, opens explicitly configured candidate branches, and merges one specifically targeted PR only after deterministic safety gates pass. It verifies the active GitHub identity before every run, defaults to dry-run, preserves source branches unless deletion is explicitly requested, and fails closed when required evidence is unknown.

## Why MergeWarden

Repository housekeeping is easy to postpone and risky to over-automate. MergeWarden separates inspection from mutation:

- `scan` inventories repositories and reports blockers; manual scans never mutate.
- `open` handles one allowlisted repository and candidate branch.
- `check` evaluates one pull request.
- `merge` handles one repository and PR number after a dry check.
- Scheduled mutations are disabled by default and require `scheduledApply: true`.

## Safety model

Before merge, MergeWarden requires:

- the configured GitHub identity;
- an allowlisted repository;
- a non-draft PR with an unchanged head SHA;
- known passing checks;
- satisfied review policy and no requested changes;
- no reported merge conflict;
- a known deterministic risk score within policy;
- explicit approval for work-profile merges.

Unknown state blocks mutation. MergeWarden does not bypass branch protection, approve reviews, resolve conflicts, or modify GitHub Actions.

## Requirements

- Node.js 20+
- pnpm 10+
- Git
- GitHub CLI (`gh`), already authenticated for the configured account

## Install

```bash
git clone https://github.com/SUDARSHANCHAUDHARI/MergeWarden.git
cd MergeWarden
pnpm install --frozen-lockfile
pnpm build
pnpm link --global
```

Install the Codex and Claude Code adapters into their active profile homes:

```bash
./scripts/install-agent-adapters.sh

# Work profiles or other isolated homes:
CODEX_HOME="$HOME/.codex-work" \
CLAUDE_CONFIG_DIR="$HOME/.claude-work" \
./scripts/install-agent-adapters.sh
```

## Configure

```bash
cp config/personal.example.json mergewarden.config.json
```

Edit the account, email, repository roots, allowlist, candidate branches, and verification commands. Keep operational configuration outside public repositories when it names private repositories.

See [Configuration](docs/configuration.md) and [Safety](docs/safety.md) for the complete policy.

## Use

```bash
# Verify profile and GitHub identity
mergewarden status --config mergewarden.config.json

# Read-only inventory
mergewarden scan --config mergewarden.config.json
mergewarden scan --repo owner/repo --pr 42 --config mergewarden.config.json

# One candidate branch: dry-run, then apply
mergewarden open --repo owner/repo --head feature/example --config mergewarden.config.json
mergewarden open --repo owner/repo --head feature/example --apply --config mergewarden.config.json

# One PR: check, then merge
mergewarden check --repo owner/repo --pr 42 --config mergewarden.config.json
mergewarden merge --repo owner/repo --pr 42 --apply --config mergewarden.config.json

# Branch deletion is separately explicit
mergewarden merge --repo owner/repo --pr 42 --apply --delete-branch --config mergewarden.config.json
```

Work-profile merges also require `--approve-work-merge` for that invocation. Approval is never stored.

## Scheduling on macOS

The supplied LaunchAgent runs daily and is read-only while `scheduledApply` is `false`:

```bash
./scripts/install-launch-agent.sh \
  com.example.mergewarden.personal \
  9 \
  "$(pwd)/dist/src/cli.js" \
  "$HOME/.config/mergewarden/personal.json"
```

Review [Safety](docs/safety.md) before enabling scheduled mutations.

## Development

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm validate
pnpm pack:check
```

The project deliberately has no GitHub Actions workflow. Release verification is documented in [Releasing](docs/releasing.md).

## Documentation

- [Architecture](docs/architecture.md)
- [Configuration](docs/configuration.md)
- [Safety model](docs/safety.md)
- [Release process](docs/releasing.md)
- [Security policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md)

## License

MIT © 2026 Sudarshan Chaudhari / SudarshanTechLabs. See [LICENSE](LICENSE).
