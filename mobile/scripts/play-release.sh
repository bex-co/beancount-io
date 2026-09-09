#!/bin/zsh
set -eu
HERE=${0:A:h}
cd "$HERE/.."
npx tsx ./src/scripts/play-release.ts "$@"
