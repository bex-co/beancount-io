# beancount-cli

Command-line interface for [Beancount.io](https://beancount.io) — authenticate, manage ledgers, write beancount directives, run reports, and chat with an AI assistant against your local `.bean` files.

## Installation

Requires [uv](https://docs.astral.sh/uv/).

```bash
uv tool install git+https://github.com/bex-co/beancount-io#subdirectory=cli
```

Or from a local clone of this repo:

```bash
git clone https://github.com/bex-co/beancount-io.git
cd beancount-io
uv tool install ./cli
```

The `beancount-cli` command is now on your `PATH`:

```bash
beancount-cli --help
```

To upgrade:

```bash
uv tool install --reinstall git+https://github.com/bex-co/beancount-io#subdirectory=cli
```

To uninstall:

```bash
uv tool uninstall beancount-cli
```

## Development

```bash
git clone https://github.com/bex-co/beancount-io.git
cd beancount-io/cli
uv sync --all-groups      # install dependencies + dev extras
uv run beancount-cli --help
```

Useful dev commands (via `make`):

```bash
make lint          # ruff check
make format-check  # ruff format --check
make typecheck     # mypy
make test          # pytest
make check-all     # lint + format-check + typecheck + test
make codegen       # re-fetch GraphQL schema and regenerate client
```

For the full command reference see [docs/USAGE.md](docs/USAGE.md).

## License

[MIT](../LICENSE) © Beancount.io
