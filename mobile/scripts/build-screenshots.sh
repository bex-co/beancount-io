#!/bin/zsh
# Deterministically build the 14-locale × 2-device × 3-story screenshot matrix.
# Set LOCALE or DISPLAY_TYPE to render a focused subset during iteration.
set -eu

HERE=${0:A:h}
cd "$HERE/.."
npx tsx ./src/scripts/build-screenshots.ts
