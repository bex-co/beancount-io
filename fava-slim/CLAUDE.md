# fava-slim

Lightweight Beancount parsing and financial reporting library, extracted from the [Fava](https://github.com/beancount/fava) project. Provides Python APIs for loading ledger files, building account trees, and generating financial statements.

## Dev Commands

```bash
make lint        # Ruff linting (auto-fix)
make format      # Ruff formatting
make typecheck   # Mypy strict type checking
make test        # pytest
make check-all   # lint + format-check + typecheck + test
```

## Downstream Consumers

fava-slim is consumed by the `cli/` package in this repo. Any change to fava-slim may affect the cli. Run `check-all` in both packages to confirm nothing is broken after a change:

```bash
cd fava-slim && make check-all
cd cli && make check-all
```
