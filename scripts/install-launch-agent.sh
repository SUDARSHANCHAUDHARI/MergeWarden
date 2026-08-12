#!/bin/sh
set -eu

if [ "$#" -ne 4 ]; then
  echo "usage: install-launch-agent.sh <label> <hour> <cli-path> <config-path>" >&2
  exit 64
fi

label=$1
hour=$2
cli_path=$3
config_path=$4
project_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
plist="$HOME/Library/LaunchAgents/$label.plist"
log_dir="$HOME/Library/Logs/MergeWarden"
mkdir -p "$HOME/Library/LaunchAgents" "$log_dir"

sed \
  -e "s|__LABEL__|$label|g" \
  -e "s|__HOUR__|$hour|g" \
  -e "s|__RUNNER__|$project_root/scripts/run-scheduled.sh|g" \
  -e "s|__CLI__|$cli_path|g" \
  -e "s|__CONFIG__|$config_path|g" \
  -e "s|__LOG_DIR__|$log_dir|g" \
  "$project_root/scheduler/com.sudarshantechlabs.mergewarden.plist.template" > "$plist"

launchctl bootout "gui/$(id -u)/$label" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$plist"
echo "Installed $label"
