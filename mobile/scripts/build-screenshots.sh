#!/bin/zsh
# Build the canonical Apple screenshot and Google Play artwork matrices.
# Set LOCALE or DISPLAY_TYPE to render a focused subset during iteration.
set -eu

HERE=${0:A:h}
cd "$HERE/.."
npx tsx ./src/scripts/build-screenshots.ts
