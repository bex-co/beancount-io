# Releasing the CLI

The [Release (cli) workflow](https://github.com/bex-co/beancount-io/blob/main/.github/workflows/release-cli.yml)
runs on `cli-vX.Y.Z` tags. The version must use canonical numeric components,
match `pyproject.toml`, and tag a commit on `main`. Prerelease suffixes are
not accepted by the current release tooling.

The workflow validates the tag, runs `make check-all`, exports a hash-pinned
`requirements.lock`, builds the source distribution and wheel, and tests that
exact artifacts through clean uv-tool (wheel) and pip (sdist) installations on
Linux, macOS, and Windows with Python 3.12 and 3.14. The same reusable
`cli-install.yml` gate runs on ordinary CLI pull requests and main pushes,
including the optional AI dependencies and temporary Homebrew taps on macOS
and Linux. After
the checks pass, it publishes to PyPI using trusted publishing, creates the
GitHub Release, and pushes `Formula/bea.rb` to `bex-co/homebrew-tap`.
Publication is sequential across these services; a downstream failure may
require rerunning the workflow to finish distributing an already-published
version. Post-publication jobs install the pinned version from real PyPI and
the public Homebrew tap and run the same customer smoke tests. A failed
post-publication check means the release needs attention; publication is not
rolled back automatically.

## Prepare and tag

After choosing the release version, update `pyproject.toml`,
`src/cli/engine/manifest.json` (runtime version), and
`src/bea_engine/__init__.py` (`FALLBACK_VERSION`). Regenerate locks with
`uv lock` and `make release-lock`. From `cli/`, validate and test the installation:

```bash norun
# Needs Homebrew and network for the tap test.
make check-all
make release-artifacts
release_version=$(make -s release-check)
python3 scripts/test-install.py "dist/beancount_io-${release_version}-py3-none-any.whl"
python3 scripts/test-install.py "dist/beancount_io-${release_version}.tar.gz" --installer pip
bash scripts/test-homebrew.sh "dist/beancount_io-${release_version}.tar.gz"
```

The local Homebrew test uses a uniquely named formula with the same install
and test methods, so an existing `bea` can remain installed. It installs an
unlinked keg and cleans up that keg and its temporary tap on exit. Python and uv prerequisites installed by Homebrew may remain.

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

For the first release, create a **pending publisher** on each registry's account
Publishing page (the project need not exist yet):

- PyPI: https://pypi.org/manage/account/publishing/
- TestPyPI: https://test.pypi.org/manage/account/publishing/

Use project name `beancount-io`, with owner `bex-co`, repository `beancount-io`,
workflow filename `release-cli.yml`, and environment `production` on both.
See [PyPI's pending-publisher guide](https://docs.pypi.org/trusted-publishers/creating-a-project-through-oidc/).
A successful upload creates the project. A missing publisher fails the upload;
GitHub cannot configure this trust on behalf of a registry account.

To rehearse from the current main branch:

```bash norun
# Runs remote CI; test=true uploads to TestPyPI and requires its publisher setup.
gh workflow run release-cli.yml --ref main -f test=false
gh workflow run release-cli.yml --ref main -f test=true
```

Keep the distribution name `beancount-io` and executable `bea`. A normal main
push validates the CLI but does not publish it. Only `cli-vX.Y.Z` tags publish
to production. Preserve the version and artifacts when retrying a partially
published release; publish fixes under a new version.

## 0.2.0 migration

Install `bea` once. Its helper sources ship in the same package; upstream
Beancount/Beanquery dependencies are provisioned automatically into a separate environment.
`bea format FILE` now prints formatted text; use `--in-place` to rewrite the file.
`bea query` accepts BQL on stdin, and `--source URI` exposes native Beanquery
sources and streaming output. Use local `--file` mode for bea's JSON envelope,
strict validation, exact filename handling and result precision fixes.

Only `beancount-io` is built and uploaded. Its wheel and sdist include the MIT
license, the bundled helper's GPL license (`LICENSE.engine`), and Fava's full
MIT notice. The sdist contains all helper/Fava sources and build/install scripts.
Upstream Beancount and Beanquery are downloaded directly from PyPI using the
tracked, generated runtime locks; their binaries are not embedded in the wheel.
The frontend code retains MIT licensing; bundled components retain their own
licenses. The distribution metadata lists both license families.
