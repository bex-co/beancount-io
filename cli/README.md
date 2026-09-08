# beancount-io

Command-line interface for [Beancount.io](https://beancount.io) — validate, query, report on, and edit
beancount ledgers from a terminal, a script, or a coding agent. The package is `beancount-io`; the
command it installs is `bea`.

## Installation

Install with Homebrew on macOS or Linuxbrew:

```bash
brew install bex-co/tap/bea          # macOS and Linuxbrew
bea --version
```

Homebrew builds a managed virtualenv from the release's hash-pinned lock, so an
install uses the dependencies tested for that release. Each release must pass
an installation and customer workflow test through Homebrew before publishing.
For other environments, use [uv](https://docs.astral.sh/uv/) with Python 3.12 or newer:

```bash
uv tool install beancount-io
```

`bea ask` needs the optional AI dependencies, which the default install and the
Homebrew formula both leave out:

```bash
uv tool install 'beancount-io[ask]'
```

## Updating

```bash
bea upgrade          # runs the upgrade command of whichever manager installed bea
bea upgrade --check  # report the installed and latest versions, and run nothing
```

`bea upgrade` never rewrites its own installed files — it dispatches to the
owning package manager, which is `brew upgrade bea`, `uv tool upgrade
beancount-io`, or `pipx upgrade beancount-io`. Run those directly if you prefer.

In a terminal, `bea` checks for a newer release at most once a day and prints a
one-line notice. It is silent under `--json`, `--no-input`, `CI`, and
`BEA_NO_UPDATE_NOTIFIER=1`, and silent on any failure — no script is ever
delayed or interrupted by it.

To uninstall:

```bash
brew uninstall bea
uv tool uninstall beancount-io
```

## Quickstart

No account and no AI dependencies are needed for local work:

```bash
bea --no-input init ~/my-books --currency USD --date 2026-08-01 \
  --opening-balance "Assets:Checking 1000"
cd ~/my-books
bea add transaction --date 2026-08-02 --narration "Coffee" \
  --posting "Expenses:Dining 12.50 USD" --posting "Assets:Checking -12.50 USD"
bea check
bea list transaction --sort newest --details --limit 10
bea report balance-sheet
bea query "SELECT account, sum(position) GROUP BY account"
```

`bea init` also works interactively. It creates common accounts, asks for your
currency and checking balance, and never overwrites an existing ledger. All
`add` commands validate the complete ledger, including relative includes and
cost-lot booking, before atomically writing. Invalid changes leave the original
bytes intact. Use `--allow-errors` explicitly when staging a semantic error.

Preview bank exports with a configured importer, then apply the reviewed result:

```bash
bea import bank.csv --config importers.py
bea import bank.csv --config importers.py --apply
```

See [the import guide](https://github.com/bex-co/beancount-io/blob/main/cli/docs/IMPORTING.md) for Beangulp integration, categorization,
duplicate decisions, and a runnable CSV example.

Point at any ledger with `--file`, or set `BEA_FILE`:

```bash
bea --file ~/other-books/main.bean check
```

Ask questions in natural language with the optional `ask` extra (needs a Beancount.io account):

```bash
uv tool install 'beancount-io[ask]'
bea cloud login
bea ask "what did I spend on groceries last month?"
```

For scripts and agents, every read-side command speaks JSON and every failure has a documented exit code:

```bash
bea --json --no-input list transaction --limit 100 | jq '.data[0]'
```

See [docs/USAGE.md](https://github.com/bex-co/beancount-io/blob/main/cli/docs/USAGE.md) for the full command reference, the exit-code table, and the JSON envelope.

## Development

```bash
git clone https://github.com/bex-co/beancount-io.git
cd beancount-io/cli
uv sync --all-groups      # install dependencies, dev extras, and the ask extra
uv run bea --help
```

Useful dev commands (via `make`):

```bash
make lint          # ruff check
make deadcode      # vulture
make format-check  # ruff format --check
make typecheck     # mypy
make test          # pytest
make check-all     # lint + deadcode + format-check + typecheck + test
make codegen       # regenerate the REST client from the pinned OpenAPI spec
```

## Releasing (maintainers)

A release is a tag. `.github/workflows/release-cli.yml` runs on `cli-v<version>`
tags: it validates the tag, runs `make check-all`, exports a hash-pinned
`requirements.lock`, and builds the sdist and wheel. A clean macOS job installs
that exact sdist through a temporary Homebrew tap and tests ledger creation,
check, writes, BQL, reports, error handling, and missing prices. Only then does
the publish job upload those artifacts to PyPI through trusted publishing,
create the GitHub Release, and push `Formula/bea.rb` to the tap.

Run the same installation check locally when `bea` is not already installed by Homebrew:

```bash
make release-lock
uv build --out-dir tmp/release
bash scripts/test-homebrew.sh tmp/release/beancount_io-0.1.0.tar.gz
```

The test installs an unlinked keg and removes that keg and its temporary tap
on exit. Homebrew may install the formula's Python and uv prerequisites.

```zsh
# 1. Bump `version` in pyproject.toml, then confirm the tag it needs:
make release-check

# 2. Merge to main, then tag that commit:
git tag cli-v1.2.3 && git push origin cli-v1.2.3
```

The tag must match `pyproject.toml` and point at a commit on `main`; the
workflow refuses anything else before it builds. To rehearse without
publishing, run the workflow manually — `workflow_dispatch` with `test` runs
every check and uploads to TestPyPI, and never creates a release or touches the
tap.

Two things live outside the repository and are set up once:

- **PyPI trusted publishing.** Register a pending publisher on
  [PyPI](https://pypi.org/manage/account/publishing/) (and TestPyPI, for the
  rehearsal) for project `beancount-io`, owner `bex-co`, repository
  `beancount-io`, workflow `release-cli.yml`, environment `production`. No API
  token is stored anywhere.
- **`BEA_TAP_PUSH_KEY`.** A write deploy key for `bex-co/homebrew-tap`, held as
  a repository or production environment secret. A tag release fails before
  either channel publishes if the key is missing. Rehearsals do not require it.

## License

[MIT](https://github.com/bex-co/beancount-io/blob/main/LICENSE) © Beancount.io
