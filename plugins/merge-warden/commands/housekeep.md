---
description: Scan repositories or run one targeted, guarded PR housekeeping action
argument-hint: "[status|scan|open|check|merge] [options]"
---

Use the `merge-warden` skill. Run the requested command through the MergeWarden CLI. Default to `scan` and dry-run when arguments are omitted. Before any action, verify the active Claude Code profile and GitHub identity. Require explicit repository and branch/PR targets for mutations. Work-profile merges always require explicit human approval. Preserve source branches unless deletion is separately requested.

Arguments: $ARGUMENTS
