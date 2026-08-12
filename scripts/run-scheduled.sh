#!/bin/sh
set -eu

if [ "$#" -ne 2 ]; then
  echo "usage: run-scheduled.sh <mergewarden-cli> <profile-config>" >&2
  exit 64
fi

exec node "$1" scan --config "$2" --apply
