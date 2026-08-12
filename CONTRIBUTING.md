# Contributing

Contributions are welcome through focused pull requests.

## Development setup

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm validate
```

## Guidelines

- Preserve dry-run defaults and fail-closed behavior.
- Keep mutations repository- and PR-specific.
- Add regression tests for changes to identity, targeting, checks, risk, approval, or branch handling.
- Do not add GitHub Actions, telemetry, hosted services, or new network integrations without prior maintainer agreement.
- Never commit tokens, private profile configurations, repository data, `.env` files, or audit logs.

Use conventional commit messages and keep each change independently reviewable.
