# Releasing

MergeWarden uses semantic versions and GitHub releases.

## Checklist

1. Confirm the release branch and intentional diff.
2. Run `pnpm install --frozen-lockfile`.
3. Run `pnpm typecheck`, `pnpm test`, `pnpm validate`, and `pnpm pack:check`.
4. Run the official Codex skill and plugin validators when available.
5. Run secret and tracked-file scans.
6. Verify `mergewardenai --help` and `mergewardenai --version` from the built package.
7. Update `CHANGELOG.md` and all manifest versions.
8. Review the packed archive contents.
9. Commit and push the release candidate.
10. After explicit approval, tag `vX.Y.Z` and create the GitHub release.

Repository visibility changes are separate from tagging and require explicit maintainer approval.
