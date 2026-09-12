#!/usr/bin/env bash
# Build and test the release sdist through a disposable tap. Never replace an
# existing bea installation; the test keg is unlinked and removed on exit.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
sdist="${1:?usage: test-homebrew.sh path/to/beancount_io-X.Y.Z.tar.gz}"
export HOMEBREW_NO_AUTO_UPDATE=1 HOMEBREW_NO_INSTALL_CLEANUP=1
export HOMEBREW_NO_INSTALLED_DEPENDENTS_CHECK=1 HOMEBREW_NO_ASK=1
export HOMEBREW_DEVELOPER=1
tap="bea-ci/smoke-$$"
formula_name="bea-rehearsal-$$"
cleanup() {
  brew uninstall --formula "$tap/$formula_name" >/dev/null 2>&1 || true
  brew untap "$tap" >/dev/null 2>&1 || true
}
trap cleanup EXIT
brew tap-new --no-git "$tap"
formula="$(brew --repository "$tap")/Formula/$formula_name.rb"
version="$(basename "$sdist" .tar.gz)"
version="${version#beancount_io-}"
sha="$(shasum -a 256 "$sdist" | cut -d' ' -f1)"
# The local rehearsal uses the same renderer with the exact local artifact.
source_url="$(python3 -c 'import sys; from pathlib import Path; print(Path(sys.argv[1]).resolve().as_uri())' "$sdist")"
bash "$here/render-formula.sh" "$version" "$sha" "$source_url" | sed "s/^class Bea < Formula$/class BeaRehearsal$$ < Formula/" > "$formula"
brew install --skip-link --build-from-source "$tap/$formula_name"
brew test --force "$tap/$formula_name"
