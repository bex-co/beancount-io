#!/bin/sh
# pre-commit entry for `bea check`: the root file is a global option and must
# precede the subcommand, so the hook's file argument is reordered here.
# Extra arguments pass through to `bea check` after the subcommand.
if [ $# -eq 0 ]; then
  set -- main.bean
fi
ledger="$1"
shift
exec bea --no-input --file "$ledger" check "$@"
