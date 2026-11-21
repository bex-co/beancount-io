#!/usr/bin/env bash
# Tests for render-release-notes.sh, the step that writes the GitHub Release
# body. Run directly, or through `make test` — tests/test_release.py invokes
# this file so CI covers it with everything else.
#
#   bash scripts/render-release-notes.test.sh
set -uo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
render="$here/render-release-notes.sh"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

failures=0

fail() {
  echo "FAIL: $1" >&2
  failures=$((failures + 1))
}

pass() { echo "ok - $1"; }

expect_contains() {
  local what="$1" file="$2" pattern="$3"
  if grep -q -- "$pattern" "$file"; then pass "$what"; else fail "$what"; fi
}

expect_missing() {
  local what="$1" file="$2" pattern="$3"
  if grep -q -- "$pattern" "$file"; then fail "$what"; else pass "$what"; fi
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

# A fixture repo: two user-facing CLI changes on top of cli-v0.4.1, plus the
# noise a polished note must leave out (board bookkeeping, other packages,
# backend-only scopes, and history that an older release already shipped).
make_fixture() {
  local repo="$1"
  mkdir -p "$repo"
  git -C "$repo" init -q -b main
  git -C "$repo" config user.email "test@example.com"
  git -C "$repo" config user.name "Test"
  git -C "$repo" commit -q --allow-empty -m "fix(cli): an old fix the 0.4.1 notes already shipped"
  git -C "$repo" tag cli-v0.4.1
  git -C "$repo" commit -q --allow-empty -m "chore(pm): add w1/999 — a board filing, not a user change"
  git -C "$repo" commit -q --allow-empty -m "feat(cli): accept --meta on add open, so a cash-flow role is declared through bea (w1/320)"
  git -C "$repo" commit -q --allow-empty -m "fix(cli,backend-v2): holdings list a commodity once when its lots were costed in two currencies (w1/288)"
  git -C "$repo" commit -q --allow-empty -m "fix(backend-v2): hosted holdings value a zero quote (w1/290)"
  git -C "$repo" commit -q --allow-empty -m "feat(dashboard): budget page summary (#235)"
  git -C "$repo" commit -q --allow-empty -m "docs(skills): a twin that agrees today still gets its drift guard"
  git -C "$repo" commit -q --allow-empty -m "fix(cli): the query shell reads - as -o does (#212)"
}

# --- the polished body -------------------------------------------------------

fixture="$work/fixture"
make_fixture "$fixture"
notes="$work/notes.md"
if bash "$render" 0.5.1 "$fixture" >"$notes" 2>"$work/err"; then
  pass "renders notes for a valid version"
else
  fail "renders notes for a valid version: $(cat "$work/err")"
fi

expect_contains "the lead names the released version" "$notes" 'bea. 0\.5\.1'
expect_contains "the lead counts features and fixes" "$notes" 'adds 1 feature and ships 2 fixes'
expect_contains "a feature lands under a New section" "$notes" '^New:$'
expect_contains "a fix lands under a Fixes section" "$notes" '^Fixes:$'
expect_contains "the feature sentence is listed" "$notes" 'Accept --meta on add open'
expect_contains "a multi-scope cli fix is listed" "$notes" 'Holdings list a commodity once'
expect_contains "the install footer names the version" "$notes" 'beancount-io==0\.5\.1'
expect_contains "the compare link bounds the release" "$notes" 'cli-v0\.4\.1\.\.\.cli-v0\.5\.1'
expect_missing "board bookkeeping is not a change" "$notes" 'w1/999'
expect_missing "internal board refs are stripped" "$notes" 'w1/320'
expect_missing "internal board refs are stripped from fixes" "$notes" 'w1/288'
expect_missing "backend-only fixes stay out" "$notes" 'zero quote'
expect_missing "dashboard features stay out" "$notes" 'Budget page summary'
expect_missing "docs churn stays out" "$notes" 'drift guard'
expect_missing "the previous release stays shipped" "$notes" 'already shipped'
expect_contains "public PR refs survive as provenance" "$notes" '(#212)'

# The current tag already exists when the workflow runs on a tag push: the
# release still covers only what landed since the previous tag.
git -C "$fixture" tag cli-v0.5.1
if bash "$render" 0.5.1 "$fixture" >"$notes" 2>"$work/err"; then
  pass "renders notes when the release tag already exists"
else
  fail "renders notes when the release tag already exists: $(cat "$work/err")"
fi
expect_contains "the bound still excludes older history with the tag present" "$notes" 'cli-v0\.4\.1\.\.\.cli-v0\.5\.1'
expect_missing "the previous release stays shipped with the tag present" "$notes" 'already shipped'

# --- singular counts stay grammatical ------------------------------------------

single="$work/single"
mkdir -p "$single"
git -C "$single" init -q -b main
git -C "$single" config user.email "test@example.com"
git -C "$single" config user.name "Test"
git -C "$single" commit -q --allow-empty -m "fix(cli): one lonely fix"
if bash "$render" 0.1.0 "$single" >"$notes" 2>"$work/err"; then
  pass "a single fix renders"
else
  fail "a single fix renders: $(cat "$work/err")"
fi
expect_contains "a single fix is not pluralized" "$notes" 'ships 1 fix\.'

# --- an empty range stays honest ----------------------------------------------

quiet="$work/quiet"
mkdir -p "$quiet"
git -C "$quiet" init -q -b main
git -C "$quiet" config user.email "test@example.com"
git -C "$quiet" config user.name "Test"
git -C "$quiet" commit -q --allow-empty -m "chore(pm): add w1/999 — a board filing, not a user change"
git -C "$quiet" tag cli-v0.4.1
git -C "$quiet" commit -q --allow-empty -m "chore(cli): prepare 0.5.1"
if bash "$render" 0.5.1 "$quiet" >"$notes" 2>"$work/err"; then
  pass "an empty range still renders a body"
else
  fail "an empty range still renders a body: $(cat "$work/err")"
fi
expect_contains "an empty range says so instead of inventing changes" "$notes" 'no user-facing changes'
expect_missing "an empty range lists no New section" "$notes" '^New:$'
expect_missing "an empty range lists no Fixes section" "$notes" '^Fixes:$'
expect_contains "an empty range still tells users how to upgrade" "$notes" 'beancount-io==0\.5\.1'

# --- a first release covers its whole history ----------------------------------

first="$work/first"
mkdir -p "$first"
git -C "$first" init -q -b main
git -C "$first" config user.email "test@example.com"
git -C "$first" config user.name "Test"
git -C "$first" commit -q --allow-empty -m "feat(cli): first feature, no earlier tag to bound it"
if bash "$render" 0.1.0 "$first" >"$notes" 2>"$work/err"; then
  pass "a first release renders without a previous tag"
else
  fail "a first release renders without a previous tag: $(cat "$work/err")"
fi
expect_contains "a first release lists its history" "$notes" 'First feature'

# --- invalid input is rejected before anything is printed ----------------------

expect_rejects "rejects a non-semver version" bash "$render" 1.2 "$fixture"
expect_rejects "rejects a version with a pre-release suffix" bash "$render" 1.2.3-rc1 "$fixture"
expect_rejects "rejects a version with a leading zero" bash "$render" 01.2.3 "$fixture"
expect_rejects "rejects a missing version" bash "$render"
expect_rejects "rejects a directory that is not a git repo" bash "$render" 0.5.1 "$work"

if [ "$failures" -eq 0 ]; then
  echo "all release-notes tests passed"
  exit 0
fi
echo "$failures release-notes test(s) failed" >&2
exit 1
