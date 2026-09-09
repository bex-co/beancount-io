# beancount-io

`bea` is the command-line interface for [Beancount.io](https://beancount.io).
Create and edit plain-text Beancount ledgers, import bank exports, validate
accounts, run BQL queries, and generate financial reports. Local bookkeeping
needs no Beancount.io account. Optional AI assistance and hosted ledger
management use your Beancount.io credentials.

The Python distribution is **`beancount-io`**; its executable is **`bea`**.
Run `bea --version` and `bea COMMAND --help` to check the version and options
you have installed.

## Contents

- [Install](#install) · [Quick start](#quick-start) · [Command map](#command-map)
- [Exit codes](#exit-codes) · [Learn more](#learn-more)
- [Development](#development) · [Releases](#releases) · [License](#license)

## Install

```bash norun
# Installs software; needs Homebrew or uv plus network.
brew install bex-co/tap/bea      # macOS and Linuxbrew
uv tool install beancount-io     # anywhere with uv and Python 3.12+
```

The default installation omits AI dependencies. For `bea ask`, install the
extra (or run it without replacing your `bea`):

```bash norun
# Installs software; needs uv plus network.
uv tool install 'beancount-io[ask]'
uvx --from 'beancount-io[ask]' bea ask --help
```

## Quick start

```bash
bea --no-input init books --currency USD --date 2026-08-01 \
  --opening-balance "Assets:Checking 1000"
cd books
bea add transaction "Coffee" --date 2026-08-02 \
  --posting "Expenses:Dining 12.50" --posting "Assets:Checking"
bea check
bea list transaction --limit 10
bea report balance-sheet
```

The purchase leaves **987.50 USD** in checking: the currency comes from the
account and Beancount fills in the balancing posting. For a bank export, see
the [import guide](https://github.com/bex-co/beancount-io/blob/main/cli/docs/IMPORTING.md);
for your first month end to end, follow the
[tutorial](https://github.com/bex-co/beancount-io/blob/main/cli/docs/TUTORIAL.md).

## Command map

| Command | Purpose |
| --- | --- |
| `bea init [DIRECTORY]` | Create a local ledger with common accounts |
| `bea add TYPE` | Append one of eleven directive types |
| `bea import SOURCE` | Preview or apply a bank CSV (`--csv`) or importer (`--config`) |
| `bea list TYPE` | Inspect directives and filter transactions |
| `bea check` | Validate the complete ledger |
| `bea format [PATH]` | Format a file or recursively format a directory |
| `bea query [BQL]` | Run a query or start the interactive BQL shell |
| `bea report TYPE` | Overview, income statement, balance sheet, or trial balance |
| `bea balance [ACCOUNT…]` | Trial-balance subtrees for matching accounts |
| `bea ask [QUESTION]` | Ask about a local ledger through the hosted AI service |
| `bea cloud …` | Sign in and manage hosted ledgers |
| `bea upgrade [--check]` | Check for an update or invoke the owning package manager |

Global options come **before the command**; `--file` selects the root ledger:

```bash
bea --file main.bean check
bea --json list transaction --limit 100
```

Every flag, default, and help string is listed in the generated
[command reference](https://github.com/bex-co/beancount-io/blob/main/cli/docs/REFERENCE.md).

## Exit codes

| Code | Meaning |
| --- | --- |
| 0 | Success, including previews and intentional duplicate skips |
| 1 | Ledger, schema, formatting-check, or other runtime failure |
| 2 | Bad arguments, missing file or input, missing optional dependencies |
| 3 | Authentication or permission failure, including a read-only destination |
| 4 | Conflict: concurrent change, import review required, or uncertain remote write |

The [usage guide](https://github.com/bex-co/beancount-io/blob/main/cli/docs/USAGE.md#exit-codes)
documents the full contract: JSON error shape, cloud HTTP mapping, prompts,
and output exceptions.

## Learn more

- [Tutorial](https://github.com/bex-co/beancount-io/blob/main/cli/docs/TUTORIAL.md):
  your first month, from `init` to a month-end report.
- [Usage](https://github.com/bex-co/beancount-io/blob/main/cli/docs/USAGE.md):
  the contract — targets, JSON envelope, exit codes, prompts, environment.
- [Importing](https://github.com/bex-co/beancount-io/blob/main/cli/docs/IMPORTING.md):
  no-code CSV import, rules, and Python importers.
- [Reference](https://github.com/bex-co/beancount-io/blob/main/cli/docs/REFERENCE.md):
  every command's usage, arguments, and options, generated from the code.

## Development

```bash norun
# Clones the repo and syncs dependencies; needs git and network.
git clone https://github.com/bex-co/beancount-io.git
cd beancount-io/cli
uv sync --all-groups
uv run bea --help
make check-all
```

Python 3.12+, Typer, Beancount v3, Beanquery, Pydantic, and a vendored Fava
reporting subset (it does not start the Fava web interface). `src/cli/` holds
command UX; `src/fava/` the vendored library (retain `NOTICE.fava`
attribution); `tests/` the pytest suite; `docs/` the guides above;
`openapi/v1.json` the pinned contract for hosted commands. `make check-all`
is the handoff gate: lint, deadcode, format-check, typecheck, test,
spec-check, and docs-check. Do not hand-edit generated API clients, command
stubs, `docs/REFERENCE.md`, or lockfiles; keep scratch files under `tmp/`.
See the [package guide](https://github.com/bex-co/beancount-io/blob/main/cli/CLAUDE.md)
for architecture boundaries and contribution rules.

## Releases

Releases ship to PyPI and Homebrew from `cli-vX.Y.Z` tags; the
[release guide](https://github.com/bex-co/beancount-io/blob/main/cli/docs/RELEASING.md)
holds the tagging procedure and one-time credentials setup.

## License

[MIT](https://github.com/bex-co/beancount-io/blob/main/LICENSE) © Beancount.io.
Vendored Fava attribution is preserved in
[NOTICE.fava](https://github.com/bex-co/beancount-io/blob/main/cli/NOTICE.fava).
