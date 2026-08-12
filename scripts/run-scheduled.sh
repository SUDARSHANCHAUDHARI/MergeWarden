#!/bin/sh
set -eu

if [ "$#" -ne 2 ]; then
  echo "usage: run-scheduled.sh <mergewarden-cli> <profile-config>" >&2
  exit 64
fi

scheduled_apply=$(node -e "const c=require(process.argv[1]); process.stdout.write(c.scheduledApply === true ? 'true' : 'false')" "$2")
if [ "$scheduled_apply" = "true" ]; then
  exec node "$1" scan --scheduled --apply --config "$2"
fi
exec node "$1" scan --scheduled --config "$2"
