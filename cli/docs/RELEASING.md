# Releasing the CLI

The [Release (cli) workflow](https://github.com/bex-co/beancount-io/blob/main/.github/workflows/release-cli.yml)
runs on `cli-vX.Y.Z` tags. The version must use canonical numeric components,
match `pyproject.toml`, and tag a commit on `main`. Prerelease suffixes are
not accepted by the current release tooling.

The workflow validates the tag, runs `make check-all`, exports a hash-pinned
`requirements.lock`, builds the source distribution and wheel, and tests that
exact source distribution through a temporary Homebrew tap on macOS. After
the checks pass, it publishes to PyPI using trusted publishing, creates the
GitHub Release, and pushes `Formula/bea.rb` to `bex-co/homebrew-tap`.
Publication is sequential across these services; a downstream failure may
require rerunning the workflow to finish distributing an already-published
version.

## Prepare and tag

After choosing the release version, update `pyproject.toml` and regenerate
the lock with `uv lock`. From `cli/`, validate and test the installation:

```bash norun
# Needs Homebrew with no installed bea, plus network for the tap test.
make check-all
make release-lock
release_version=$(make -s release-check)
uv build --out-dir tmp/release
bash scripts/test-homebrew.sh "tmp/release/beancount_io-${release_version}.tar.gz"
```

The local Homebrew test requires that `bea` is not already installed through
Homebrew. It installs an unlinked keg and cleans up that keg and its temporary
tap on exit. Python and uv prerequisites installed by Homebrew may remain.

Commit the version change and land it on `main` before tagging that commit:

```bash norun
# Tags and pushes a release; needs write access to the repository.
release_version=$(make -s release-check)
git tag "cli-v${release_version}"
git push origin "cli-v${release_version}"
```

## Publishing setup and rehearsal

Configure these once outside the repository:

- **PyPI trusted publishing:** register project `beancount-io` with owner
  `bex-co`, repository `beancount-io`, workflow `release-cli.yml`, and
  environment `production`. Configure TestPyPI likewise for rehearsals;
  publishing uses no stored PyPI API token.
- **`BEA_TAP_PUSH_KEY`:** a write deploy key for `bex-co/homebrew-tap`, stored
  as a repository or `production` environment secret. A tag release checks
  for this key before either channel publishes.

Manual `workflow_dispatch` runs the build and installation checks. With
`test: true` (the default), it also publishes to **TestPyPI**, without creating
a GitHub Release or updating the tap. With `test: false`, a manual run performs
validation only. Neither manual mode requires the tap key.
