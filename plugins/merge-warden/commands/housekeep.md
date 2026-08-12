---
description: Scan configured repositories and report or apply safe PR housekeeping actions
argument-hint: [status|scan] [--config PATH] [--apply]
---

Use the `merge-warden` skill. Run the requested command through the MergeWarden CLI. Default to `scan` and dry-run when arguments are omitted. Before any action, verify the active Claude Code profile and GitHub identity. Work-profile merges always require explicit human approval.

Arguments: $ARGUMENTS
