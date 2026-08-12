# Safety model

MergeWarden follows four rules: explicit scope, deterministic evidence, dry-run first, and fail closed.

## Manual behavior

- `scan` is always read-only, even if `--apply` is supplied.
- `open` requires one repository and one configured candidate branch.
- `merge` requires one repository, one PR number, and `--apply`.
- Source branches are preserved unless `--delete-branch` or `deleteBranchAfterMerge` explicitly requests deletion.

## Scheduled behavior

The scheduler reads `scheduledApply` from the selected profile configuration. `false` runs an inventory only. `true` permits configured candidate PR creation and eligible personal-profile merges. Work merges remain blocked because scheduled runs never provide human approval.

Enable scheduled mutation only after several successful dry runs and with narrow allowlists. Keep it disabled for unfamiliar repositories.

## Merge blockers

- draft PR;
- reported conflicts;
- missing, pending, or failing checks;
- missing required approval or requested changes;
- unknown or excessive risk;
- disabled auto-merge policy;
- work approval not supplied;
- changed head SHA before mutation.

## Risk score

The current score is intentionally deterministic and conservative. It combines changed-line volume, changed-file count, and a penalty for authentication, security, migration, environment, lockfile, or GitHub configuration paths. It is not semantic code analysis and does not replace review.
