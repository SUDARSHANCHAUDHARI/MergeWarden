#!/bin/sh
set -eu

project_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
codex_home=${CODEX_HOME:-"$HOME/.codex"}
claude_home=${CLAUDE_CONFIG_DIR:-"$HOME/.claude"}
skill_source="$project_root/plugins/merge-warden/skills/merge-warden"
command_source="$project_root/plugins/merge-warden/commands/housekeep.md"

mkdir -p "$codex_home/skills/merge-warden" "$claude_home/skills/merge-warden" "$claude_home/commands"
cp -R "$skill_source/." "$codex_home/skills/merge-warden/"
cp -R "$skill_source/." "$claude_home/skills/merge-warden/"
cp "$command_source" "$claude_home/commands/housekeep.md"

echo "Installed MergeWarden adapters into:"
echo "  Codex: $codex_home"
echo "  Claude Code: $claude_home"
