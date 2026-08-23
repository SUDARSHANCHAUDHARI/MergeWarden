<p align="center">
  <img src="assets/mergewarden-logo.png" alt="MergeWarden logo" width="180">
</p>

<h1 align="center">MergeWarden</h1>

<p align="center">
  Profile-aware GitHub pull-request housekeeping for Codex and Claude Code.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white" alt="Node.js 20 or newer">
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white" alt="TypeScript strict mode">
  <img src="https://img.shields.io/badge/version-0.1.0-6f42c1" alt="Version 0.1.0">
  <img src="https://img.shields.io/badge/tests-15%20passing-brightgreen" alt="15 tests passing">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT license">
</p>

MergeWarden inventories open pull requests, opens explicitly configured
candidate branches, and merges one specifically targeted PR only after
deterministic safety gates pass. It verifies the active GitHub identity before
every run, defaults to dry-run, preserves source branches unless deletion is
explicitly requested, and blocks mutation when required evidence is unknown.

## Table of Contents

- [Highlights](#highlights)
- [Commands](#commands)
- [Requirements](#requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Scheduled scans on macOS](#scheduled-scans-on-macos)
- [Development](#development)
- [Security and privacy](#security-and-privacy)
- [Releases](#releases)
- [Contributing](#contributing)
- [License](#license)
- [About](#about)

## Highlights

### Profile-aware repository control

- Separate personal and work profiles with isolated GitHub identities and policies
- Exact repository allowlists and local checkout roots
- GitHub account verification before every operation
- Git email and origin-remote verification before opening a pull request
- Invocation-only approval for work-profile merges
- Configuration stored locally with no GitHub token persistence

### Safe pull-request opening

- Candidate branches must be explicitly configured per repository
- Fresh comparison against the remote default branch
- Duplicate open-PR detection before creation
- Repository-specific verification commands executed without a shell
- Basic secret-pattern scan over the proposed diff
- Dry-run preview before any push or PR creation

### Guarded merging

- One repository and one PR number per manual merge command
- Draft, conflict, check, review, risk, and policy gates
- Head SHA revalidation immediately before merge
- Squash, merge-commit, and rebase strategies
- Source branch preservation by default
- Separate `--delete-branch` authorization when cleanup is desired
- Structured JSONL records for mutation decisions and outcomes

### Agent and automation workflow

- Shared CLI for Codex and Claude Code
- Codex skill and Claude Code `/housekeep` command adapters
- Read-only manual inventory across configured repositories
- Read-only macOS scheduled scans by default
- Explicit `scheduledApply` opt-in for scheduled personal-profile mutations
- Scheduled work merges remain blocked without human approval

## Commands

| Action | Command |
| --- | --- |
| Verify profile and identity | `mergewardenai status --config PATH` |
| Scan all allowlisted repositories | `mergewardenai scan --config PATH` |
| Inspect one repository | `mergewardenai scan --repo OWNER/REPO --config PATH` |
| Inspect one PR | `mergewardenai check --repo OWNER/REPO --pr 42 --config PATH` |
| Preview opening a PR | `mergewardenai open --repo OWNER/REPO --head BRANCH --config PATH` |
| Open a verified PR | `mergewardenai open --repo OWNER/REPO --head BRANCH --apply --config PATH` |
| Merge one eligible PR | `mergewardenai merge --repo OWNER/REPO --pr 42 --apply --config PATH` |
| Merge and request branch deletion | Add `--delete-branch` to the targeted merge command |
| Approve one work merge | Add `--approve-work-merge` to the targeted merge command |

Manual `scan` is always read-only. Mutations are available only through a
targeted `open` or `merge` command, or through a scheduler profile that has
explicitly enabled `scheduledApply`.

## Requirements

- Node.js 20 or newer
- pnpm 10 or newer
- Git
- GitHub CLI (`gh`)
- An authenticated GitHub account with access to the configured repositories

MergeWarden uses the active `gh` identity and the repository's existing Git
configuration. It does not ask for or store a GitHub token.

## Installation

### Build from source

```bash
git clone https://github.com/SUDARSHANCHAUDHARI/MergeWarden.git
cd MergeWarden
pnpm install --frozen-lockfile
pnpm build
pnpm link --global
```

Confirm the CLI is available:

```bash
mergewardenai --version
mergewardenai --help
```

### Install the agent adapters

Install into the active personal Codex and Claude Code profiles:

```bash
./scripts/install-agent-adapters.sh
```

Install into isolated work profiles:

```bash
CODEX_HOME="$HOME/.codex-work" \
CLAUDE_CONFIG_DIR="$HOME/.claude-work" \
./scripts/install-agent-adapters.sh
```

Start a new Codex or Claude Code session after installation so the new skill or
command is discovered.

## Configuration

Copy the profile that matches the GitHub identity you intend to use:

```bash
cp config/personal.example.json mergewarden.config.json
# or
cp config/work.example.json mergewarden.config.json
```

Configure:

1. GitHub account and Git email
2. Local repository roots
3. Exact `owner/repository` allowlist entries
4. Candidate branches eligible for PR creation
5. Verification commands for each repository
6. Review, risk, merge, scheduling, and branch-deletion policy
7. Local audit-log path

Verification commands are executable-and-argument arrays, not shell strings:

```json
{
  "verificationCommands": {
    "owner/repository": [
      ["pnpm", "test"],
      ["pnpm", "typecheck"]
    ]
  }
}
```

Keep operational configuration outside a public repository when it contains
private repository names. See [Configuration](docs/configuration.md) for every
field and validation rule.

## Scheduled scans on macOS

The included LaunchAgent installer creates a daily scan. With the default
`scheduledApply: false`, it only reports repository and PR state.

```bash
./scripts/install-launch-agent.sh \
  com.example.mergewarden.personal \
  9 \
  "$(pwd)/dist/src/cli.js" \
  "$HOME/.config/mergewarden/personal.json"
```

Enable scheduled mutation only after repeated successful dry runs and with a
narrow repository allowlist. Review the complete [Safety model](docs/safety.md)
first.

## Development

MergeWarden is a local TypeScript CLI using Node's standard library, Git, and
the GitHub CLI. It has no application runtime dependencies, server, database,
hosted control plane, or telemetry.

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm validate
pnpm pack:check
```

The current suite contains 15 tests covering argument safety, manual and
scheduled mutation boundaries, targeted merging, branch preservation and
deletion, GitHub check handling, merge-state uncertainty, sensitive-path risk,
work approval, CLI help, and version output.

The project deliberately has no GitHub Actions workflow. Release verification
is documented in [Releasing](docs/releasing.md).

## Security and privacy

MergeWarden runs locally. It sends commands only to the configured local Git
checkouts and GitHub through the authenticated `gh` client. It does not collect
telemetry, upload repository diffs to an AI service, or store GitHub tokens.

Audit logs contain repository names, PR or branch targets, decisions, reasons,
timestamps, and commit SHAs. They do not contain credentials or diff content.

Report security issues privately according to [SECURITY.md](SECURITY.md).

## Releases

MergeWarden follows semantic versioning. A release candidate must pass the
TypeScript checks, test suite, package validation, Codex validation, Claude Code
validation, dependency audit, secret scan, and release-archive inspection.

- [Changelog](CHANGELOG.md)
- [Release process](docs/releasing.md)
- [Architecture](docs/architecture.md)
- [Safety model](docs/safety.md)

## Contributing

Focused bug reports and pull requests are welcome. Changes to identity,
targeting, checks, risk, approval, scheduling, or branch behavior must include
regression coverage. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MergeWarden is available under the [MIT License](LICENSE).

Copyright © 2026 Sudarshan Chaudhari / SudarshanTechLabs.

---

## About

I'm Sudarshan Chaudhari, a Senior Quality Engineer, Test Automation specialist, and AI systems builder based in Bangkok, Thailand.

I have 13+ years of experience in software quality engineering, working across SaaS, fintech, gaming, web, mobile, cloud, and digital signage platforms. My background combines hands-on test automation with QA leadership, test strategy, CI/CD, release quality, production investigation, and cross-platform validation.

Alongside my professional QA career, I run [SudarshanTechLabs](https://sudarshantechlabs.com/), my independent engineering and product lab where I design, build, test, and ship software across Android, web, AI, cybersecurity, developer tooling, and cross-platform applications.

### What I work on

- ⚙️ **Quality Engineering & Test Automation** — Playwright, Selenium, Cypress, Appium, API testing, automation frameworks, end-to-end testing, CI/CD, release gates, GitHub Actions, risk-based testing, and production validation
- 🤖 **AI Systems & Automation** — AI agents, multi-agent orchestration, MCP servers, AI-assisted QA, prompt tooling, developer workflows, automation systems, and Claude Code plugins
- 📱 **Mobile & Cross-Platform Applications** — Android applications built with Kotlin and Jetpack Compose, Google Play releases, automated build and publishing pipelines, and cross-platform development spanning iOS, web, Windows, and macOS
- 🌐 **Web Applications & Platforms** — Full-stack applications using Next.js, TypeScript, Firebase, Cloudflare, REST APIs, and modern web infrastructure
- 🛠️ **Developer Tooling & CLI Engineering** — Rust, Python, TypeScript, CLI utilities, multi-repository tooling, build automation, release tooling, and engineering productivity systems
- 🛡️ **Cybersecurity & Observability** — Threat detection, log analysis, security auditing, vulnerability assessment, monitoring, and security-focused developer tools
- 📺 **Digital Signage & Device Platforms** — Content validation, playback testing, device compatibility, production investigation, monitoring, and QA across diverse hardware and operating-system environments

My work sits at the intersection of quality engineering, automation, AI, and software development. I approach products with a QA mindset from the beginning: understanding failure modes, designing for testability, automating repetitive work, and building release confidence into the engineering process.

Through SudarshanTechLabs, I also build products and tools from idea to production, covering architecture, development, testing, CI/CD, release automation, monitoring, and ongoing maintenance.

🌐 [sudarshantechlabs.com](https://sudarshantechlabs.com/) · 💼 [LinkedIn](https://linkedin.com/in/sudarshan-chaudhari) · 🐙 [GitHub](https://github.com/SUDARSHANCHAUDHARI) · ✉️ [sunny.sudarshan@gmail.com](mailto:sunny.sudarshan@gmail.com)
