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

## Authenticated live-price acceptance

The installed smoke includes synthetic saved-login and BEA_TOKEN requests,
cached service failure, offline valuation and portable export. It uses no
production credential. For explicit production verification, use a protected
test token or an authorized cloud login and run:

```bash norun
make live-prices
python3 scripts/live_prices.py --bea /absolute/path/to/installed/bea
```

Only a successful full journey updates `tests/managed_prices_live_status.json`.
This is an explicit network gate, separate from the deterministic unit suite.
`BEA_LIVE_PRICE_TESTS=1` additionally opts into the anonymous login-boundary test.

## 0.5.0 release notes

This section is the GitHub Release body for `cli-v0.5.0`; apply it with
`gh release edit cli-v0.5.0 --notes-file <this section>` after the workflow
creates the release. The 0.4.1 notes are on the `cli-v0.4.1` release.

`bea` 0.5.0 adds Git sign-in for self-hosted servers and one option, and fixes
reports, queries and write refusals. It needs no ledger changes.

New:

- **`bea cloud git setup` (self-hosted servers).** After `bea cloud login`,
  run it once per machine and plain `git clone`, `git pull` and `git push`
  over HTTPS sign in through `bea`: no prompt and no token to paste. Git's
  password is a personal access token `bea` mints for itself (`ledger.read`
  and `ledger.write`, 90 days, listed under Settings → Personal access
  tokens). `bea cloud git setup --undo` removes it, and `bea cloud logout`
  revokes it. The managed service is refused: there Git uses an SSH key and
  `bea cloud ledger clone`, as before.
- **`bea add open --meta 'key:value'`** writes metadata on the `open`
  directive, so a cash-flow role is declared through `bea`. A role the
  cash-flow report would ignore is refused.

Reports:

- **Trial balance and balance sheet.** A valued (`-t`) trial balance nets
  through a valuation adjustment line, accepted rounding is its own line, and
  a period opens at the ledger's own equity.
- **Capital gains.** A sale written without a price, or one that names a cost
  but no lot date, is listed under `unpriced_reductions` instead of dropped.
- **Holdings.** A commodity whose lots were costed in two currencies is listed
  once, and unquoted lot-less shares keep their own row.
- **Budget.** An account covered by an ancestor's budget stays in the report
  (`covered`, with `covered_by`); a budget line `bea` ignores is named with
  its file, line, account and value instead of stopping the report.
- **Cash flow** explains an empty cash set instead of reporting a quiet
  period. A managed price feed no longer starts the report period.
- **Register.** A balance assertion moves nothing, and a period register lists
  only the summarized account's own legs.

Queries:

- Text tables show the ledger's precision instead of division noise, keep
  sub-cent lot digits in per-unit cost columns, and size each column by its
  own amounts. The shell's `.output` reads `-`, quotes and `~` as `-o` does.

Writes and imports:

- `bea add` refuses an amount, cost or price whose arithmetic does not
  terminate, a posting costed or priced in its own commodity, and a negative
  or self-quoting price; `add close` names every funded account it would
  close; `add commodity` names the existing declaration on a repeat.
- Write refusals blame the ledger, not the write, for a problem the ledger
  already had, and fold errors only when they share a remedy.
- A whole-yen ledger stays in whole yen, a same-day sale follows the transfer
  that supplies it in bulk add, and a multiline payee or narration keeps its
  spaces in exports.
- `bea init --existing` locates a broken include at its include line.

The first `bea` command after a uv or pip upgrade provisions the 0.5.0 engine
once; Homebrew installs it with the formula. Upgrade with
`brew upgrade bex-co/tap/bea` or `uv tool upgrade beancount-io`, or install with
`uv tool install beancount-io==0.5.0`.

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
