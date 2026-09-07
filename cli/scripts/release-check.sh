#!/usr/bin/env bash
# Validate a `cli-vX.Y.Z` release tag against cli/pyproject.toml, and print the
# version it names.
#
#   bash scripts/release-check.sh              # check the tag this version needs
#   bash scripts/release-check.sh cli-v1.2.3   # check a specific tag
#
# `make release-check` runs the first form; the release workflow runs the second
# with the pushed tag, so exactly one definition of "a valid release" exists.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
pyproject="${PYPROJECT:-$root/pyproject.toml}"

version="$(python3 -c 'import sys, tomllib; print(tomllib.load(open(sys.argv[1], "rb"))["project"]["version"])' \
  "$pyproject")"
tag="${1:-cli-v$version}"

# The tag decides what gets published, so it is checked before it is trusted.
# Canonical X.Y.Z only: no leading zeros, no `v` drift, no pre-release suffix —
# the update notifier compares canonical releases and would silently ignore
# anything else, leaving users on an old version with no notice.
if [[ ! "$tag" =~ ^cli-v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]]; then
  echo "error: release tag '$tag' is not a canonical cli-vX.Y.Z" >&2
  exit 1
fi

if [[ "$tag" != "cli-v$version" ]]; then
  echo "error: tag '$tag' does not match the cli/pyproject.toml version '$version'" >&2
  echo "       bump the version, or tag cli-v$version" >&2
  exit 1
fi

printf '%s\n' "$version"
