# beancount-io

Command-line interface for [Beancount.io](https://beancount.io) — validate, query, report on, and edit
beancount ledgers from a terminal, a script, or a coding agent. The package is `beancount-io`; the
command it installs is `bea`.

## Installation

Requires [uv](https://docs.astral.sh/uv/).

```bash
uv tool install 'git+https://github.com/bex-co/beancount-io#subdirectory=cli'
```

Or from a local clone of this repo:

```bash
git clone https://github.com/bex-co/beancount-io.git
cd beancount-io
uv tool install ./cli
```

The `bea` command is now on your `PATH`:

```bash
bea --help
```

To upgrade:

```bash
uv tool install --reinstall 'git+https://github.com/bex-co/beancount-io#subdirectory=cli'
```

To uninstall:

```bash
uv tool uninstall beancount-io
```

## Quickstart

No account and no AI dependencies are needed for local work:

```bash
cd ~/my-books          # a directory containing main.bean
bea check              # parse and validate the ledger
bea list transaction --limit 10
bea report balance-sheet
bea query "SELECT account, sum(position) GROUP BY account"
```

Point at any ledger with `--file`, or set `BEA_FILE`:

```bash
bea --file ~/other-books/main.bean check
```

Ask questions in natural language with the optional `ask` extra (needs a Beancount.io account):

```bash
uv tool install 'beancount-io[ask] @ git+https://github.com/bex-co/beancount-io#subdirectory=cli'
bea auth login
bea ask "what did I spend on groceries last month?"
```

For scripts and agents, every read-side command speaks JSON and every failure has a documented exit code:

```bash
bea --json --no-input list transaction --limit 100 | jq '.data[0]'
```

See [docs/USAGE.md](docs/USAGE.md) for the full command reference, the exit-code table, and the JSON envelope.

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
make codegen       # re-fetch GraphQL schema and regenerate client
```

## License

[MIT](../LICENSE) © Beancount.io
