#!/usr/bin/env bash
# Tests for render-formula.sh and release-check.sh, the two shell steps the
# release workflow trusts. Run directly, or through `make test` — tests/test_release.py
# invokes this file so CI covers it with everything else.
#
#   bash scripts/render-formula.test.sh
set -uo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
render="$here/render-formula.sh"
release_check="$here/release-check.sh"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

SHA="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
failures=0

fail() {
  echo "FAIL: $1" >&2
  failures=$((failures + 1))
}

pass() { echo "ok - $1"; }

expect_contains() {
  if grep -q -- "$2" "$formula"; then pass "$1"; else fail "$1"; fi
}

expect_rejects() {
  local what="$1" out status
  shift
  out="$("$@" 2>/dev/null)"
  status=$?
  if [ "$status" -eq 0 ]; then
    fail "$what: expected a non-zero exit"
  elif [ -n "$out" ]; then
    fail "$what: rejected but still wrote $(printf '%s' "$out" | wc -l) lines to stdout"
  else
    pass "$what"
  fi
}

# --- render-formula.sh -------------------------------------------------------

formula="$work/bea.rb"
if bash "$render" 1.2.3 "$SHA" >"$formula" 2>"$work/err"; then
  pass "renders a formula for a valid version and sha"
else
  fail "renders a formula for a valid version and sha: $(cat "$work/err")"
fi

expect_contains "the formula defines class Bea" 'class Bea < Formula'
expect_contains "the url names the released sdist" 'beancount_io-1.2.3.tar.gz'
expect_contains "the install step uses the hashed lock" 'requirements.lock'
expect_contains "the install step requires hashes" '--require-hashes'
expect_contains "the dependency install has its own post_install hook" 'def post_install'

# Homebrew rewrites the dylib ID of every Mach-O file in the keg *before* it
# runs post_install, and it cannot lengthen the install name inside a prebuilt
# wheel — pydantic-core's extension fails that rewrite, and the failure is fatal
# to `brew install` (exit 1, after the beer emoji). Moving the wheels behind
# post_install is the whole reason `brew install bex-co/tap/bea` succeeds, and
# nothing else in the formula makes that ordering obvious.
# Comments are skipped: the reason for this ordering is itself written above
# post_install, and it mentions the flag.
post_install_at="$(awk '/def post_install/ { print NR; exit }' "$formula")"
hashed_install_at="$(awk '!/^[[:space:]]*#/ && /--require-hashes/ { print NR; exit }' "$formula")"
if [ -n "$post_install_at" ] && [ -n "$hashed_install_at" ] && [ "$hashed_install_at" -gt "$post_install_at" ]; then
  pass "the wheels are installed after Homebrew's relocation pass, not before"
else
  fail "the wheels must be installed inside post_install (line $hashed_install_at vs post_install at $post_install_at)"
fi

occurrences="$(grep -c "$SHA" "$formula")"
if [ "$occurrences" = "1" ]; then
  pass "the sha256 appears exactly once"
else
  fail "the sha256 appears $occurrences times, expected once"
fi

# A formula that does not parse is worse than no formula: it breaks every
# `brew install` from the tap, not just this one release.
if command -v ruby >/dev/null 2>&1; then
  if ruby -c "$formula" >/dev/null 2>"$work/ruby-err"; then
    pass "the rendered formula is valid Ruby"
  else
    fail "the rendered formula is valid Ruby: $(cat "$work/ruby-err")"
  fi
else
  echo "skip - ruby is not installed, cannot syntax-check the formula"
fi

expect_rejects "rejects a non-semver version" bash "$render" 1.2 "$SHA"
expect_rejects "rejects a version with a pre-release suffix" bash "$render" 1.2.3-rc1 "$SHA"
expect_rejects "rejects a version with a leading zero" bash "$render" 01.2.3 "$SHA"
expect_rejects "rejects a truncated sha256" bash "$render" 1.2.3 "${SHA:0:63}"
expect_rejects "rejects an uppercase sha256" bash "$render" 1.2.3 "$(printf '%s' "$SHA" | tr 'a-f' 'A-F')"
expect_rejects "rejects a missing sha256" bash "$render" 1.2.3

# --- release-check.sh --------------------------------------------------------

printf '[project]\nname = "beancount-io"\nversion = "1.2.3"\n' >"$work/pyproject.toml"
export PYPROJECT="$work/pyproject.toml"

printed="$(bash "$release_check" cli-v1.2.3 2>"$work/err")"
if [ "$printed" = "1.2.3" ]; then
  pass "a matching tag prints the version"
else
  fail "a matching tag prints the version: got '$printed' $(cat "$work/err")"
fi

printed="$(bash "$release_check" 2>"$work/err")"
if [ "$printed" = "1.2.3" ]; then
  pass "with no tag it checks the tag the version needs"
else
  fail "with no tag it checks the tag the version needs: got '$printed' $(cat "$work/err")"
fi

expect_rejects "rejects a tag ahead of pyproject.toml" bash "$release_check" cli-v1.2.4
expect_rejects "rejects a tag behind pyproject.toml" bash "$release_check" cli-v1.2.2
expect_rejects "rejects a tag outside the cli namespace" bash "$release_check" v1.2.3
expect_rejects "rejects a pre-release tag" bash "$release_check" cli-v1.2.3-rc1

if [ "$failures" -eq 0 ]; then
  echo "all release script tests passed"
  exit 0
fi
echo "$failures release script test(s) failed" >&2
exit 1
