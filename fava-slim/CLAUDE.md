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

## Licensing

MIT (see `LICENSE`), with dual copyright: Beancount.io and the upstream [Fava](https://github.com/beancount/fava) project this package derives from. Per-file third-party provenance is recorded in `NOTICE`. `fava/plugins/forecast.py` is an independent MIT reimplementation of Beancount v2's GPL forecast plugin (syntax-compatible, no GPL code) — its behaviour is pinned by `tests/test_forecast.py`; don't reintroduce upstream GPL code into it. When vendoring code from Fava or elsewhere, keep the original license headers and update `NOTICE`.

## Downstream Consumers

fava-slim is consumed by the `cli/` package in this repo. Any change to fava-slim may affect the cli. Run `check-all` in both packages to confirm nothing is broken after a change:

```bash
cd fava-slim && make check-all
cd cli && make check-all
```
