#!/usr/bin/env bash
# Build and test the release sdist through a disposable tap. Never replace an
# existing bea installation; the test keg is unlinked and removed on exit.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
sdist="${1:?usage: test-homebrew.sh path/to/beancount_io-X.Y.Z.tar.gz}"
export HOMEBREW_NO_AUTO_UPDATE=1 HOMEBREW_NO_INSTALL_CLEANUP=1
export HOMEBREW_NO_INSTALLED_DEPENDENTS_CHECK=1 HOMEBREW_NO_ASK=1
export HOMEBREW_DEVELOPER=1
if brew list --formula | grep -qx bea; then
  echo "error: bea is already installed; run this test in a clean Homebrew environment" >&2
  exit 1
fi
tap="bea-ci/smoke-$$"
cleanup() {
  brew uninstall --formula "$tap/bea" >/dev/null 2>&1 || true
  brew untap "$tap" >/dev/null 2>&1 || true
}
trap cleanup EXIT
brew tap-new --no-git "$tap"
formula="$(brew --repository "$tap")/Formula/bea.rb"
version="$(basename "$sdist" .tar.gz)"
version="${version#beancount_io-}"
sha="$(shasum -a 256 "$sdist" | cut -d' ' -f1)"
# The local rehearsal uses the same renderer with the exact local artifact.
source_url="$(python3 -c 'import sys; from pathlib import Path; print(Path(sys.argv[1]).resolve().as_uri())' "$sdist")"
bash "$here/render-formula.sh" "$version" "$sha" "$source_url" > "$formula"
brew install --skip-link --build-from-source "$tap/bea"
brew test --force "$tap/bea"
