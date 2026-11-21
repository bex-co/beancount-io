#!/usr/bin/env bash
# Render the GitHub Release body for a `bea` release to stdout.
#
#   bash scripts/render-release-notes.sh <version> [repo] > notes.md
#
# The release workflow runs this on the release commit and publishes stdout as
# the release body, so a release never ships GitHub's auto-generated PR list —
# which mixes board bookkeeping and other packages' work into `bea`'s notes.
# Run it from anywhere to preview exactly what a version's release would say.
#
# "Meaningful and rightful" is defined here as: only `feat`/`fix` commits
# whose scope names `cli`, and only those the previous `cli-v*` tag has not
# shipped yet. Everything else (chore, docs, other packages, backend-only
# scopes) stays out, and an empty range says so instead of inventing changes.
# Trailing board refs (` (w1/330)`) are internal tracker jargon and are
# stripped; public PR refs (` (#212)`) stay as provenance.
set -euo pipefail

version="${1:?usage: render-release-notes.sh <version> [repo]}"
repo="${2:-$PWD}"

# Inputs are interpolated into Markdown. They are validated up front, and
# nothing is printed until they pass, so a bad input can never leave a
# half-rendered body for the workflow to publish.
if [[ ! "$version" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]]; then
  echo "error: version '$version' is not a canonical X.Y.Z" >&2
  exit 1
fi
if ! git -C "$repo" rev-parse --show-toplevel >/dev/null 2>&1; then
  echo "error: '$repo' is not inside a git repository" >&2
  exit 1
fi

tag="cli-v$version"

# The highest cli-v tag below this version bounds the release. The release
# tag itself already exists when the workflow runs on a tag push, and a re-run
# of an older release can find newer tags, so neither is a bound; without any
# earlier tag this is a first release over the whole history.
prev="$(git -C "$repo" tag --list 'cli-v*' | sed 's/^cli-v//' |
  { printf '%s\n' "$version"; cat; } | sort -V -u |
  awk -v version="$version" '$0 == version { print previous; exit } { previous = $0 }')"
[[ -z "$prev" ]] || prev="cli-v$prev"

if [[ -n "$prev" ]]; then
  range="$prev..HEAD"
  compared_from="$prev"
else
  range="HEAD"
  compared_from=""
fi

new_entries=()
fix_entries=()
while IFS= read -r subject; do
  [[ -n "$subject" ]] || continue
  # type(scope): sentence — keep feat/fix whose scope list names cli.
  if [[ "$subject" =~ ^(feat|fix)\(([^\)]*)\)\:[[:space:]]*(.*)$ ]]; then
    kind="${BASH_REMATCH[1]}"
    scope="${BASH_REMATCH[2]}"
    sentence="${BASH_REMATCH[3]}"
    if [[ ",$scope," == *",cli,"* ]]; then
      # Strip one trailing board ref: internal tracker jargon, meaningless
      # to users. Public PR refs stay.
      sentence="$(printf '%s' "$sentence" | sed -E 's/ \([a-z][0-9]*\/[a-z0-9\/_-]+\)$//')"
      # A polished sentence starts with a capital. (BSD sed has no \U, and
      # macOS's bash 3.2 has no ${var^}.)
      sentence="$(printf '%s' "${sentence:0:1}" | tr '[:lower:]' '[:upper:]')${sentence:1}"
      if [[ "$kind" == "feat" ]]; then
        new_entries+=("$sentence")
      else
        fix_entries+=("$sentence")
      fi
    fi
  fi
done < <(git -C "$repo" log --reverse --format='%s' "$range" 2>/dev/null || true)

new_count="${#new_entries[@]}"
fix_count="${#fix_entries[@]}"

plural() {
  if [[ "$1" == "1" ]]; then printf '%s' "$2"; else printf '%s' "$3"; fi
}

if [[ "$new_count" -gt 0 && "$fix_count" -gt 0 ]]; then
  lead="\`bea\` $version adds $new_count $(plural "$new_count" "feature" "features") and ships $fix_count $(plural "$fix_count" "fix" "fixes")."
elif [[ "$new_count" -gt 0 ]]; then
  lead="\`bea\` $version adds $new_count $(plural "$new_count" "feature" "features")."
elif [[ "$fix_count" -gt 0 ]]; then
  lead="\`bea\` $version ships $fix_count $(plural "$fix_count" "fix" "fixes")."
elif [[ -n "$prev" ]]; then
  lead="\`bea\` $version has no user-facing changes since $prev."
else
  lead="\`bea\` $version is the first CLI release."
fi

printf '%s\n' "$lead"
printf '\n'

if [[ "$new_count" -gt 0 ]]; then
  printf 'New:\n\n'
  for entry in "${new_entries[@]}"; do
    printf -- '- %s\n' "$entry"
  done
  printf '\n'
fi

if [[ "$fix_count" -gt 0 ]]; then
  printf 'Fixes:\n\n'
  for entry in "${fix_entries[@]}"; do
    printf -- '- %s\n' "$entry"
  done
  printf '\n'
fi

cat <<EOF
The first \`bea\` command after a uv or pip upgrade provisions the $version engine
once; Homebrew installs it with the formula. Upgrade with
\`brew upgrade bex-co/tap/bea\` or \`uv tool upgrade beancount-io\`, or install with
\`uv tool install beancount-io==$version\`.
EOF
printf '\n'
if [[ -n "$compared_from" ]]; then
  printf '**Full changelog:** https://github.com/bex-co/beancount-io/compare/%s...%s\n' "$compared_from" "$tag"
else
  printf '**Full changelog:** https://github.com/bex-co/beancount-io/releases/tag/%s\n' "$tag"
fi
