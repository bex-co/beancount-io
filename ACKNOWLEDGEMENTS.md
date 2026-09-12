# Acknowledgements

Beancount.io exists because of the plain-text accounting community. This page credits the projects we build on and records how we comply with each of their licenses.

Our code is [MIT licensed](./LICENSE) except where otherwise stated. The CLI ledger helper is distributed under [GPL-2.0-only](./cli/LICENSE.engine); the single CLI distribution lists its component licenses. Every upstream project below stays under its own license, and nothing here relicenses any of them.

## The Beancount ecosystem

| Project | License | How Beancount.io uses it |
| --- | --- | --- |
| [Beancount](https://github.com/beancount/beancount) | GPL-2.0-only | Unmodified PyPI dependency of [`cli/`](./cli) |
| [Fava](https://github.com/beancount/fava) | MIT | Vendored `fava` package inside [`cli/`](./cli) is a derivative work of its Python core |
| [beanquery](https://github.com/beancount/beanquery) | GPL-2.0 | Unmodified PyPI dependency for BQL queries and reports |
| [beangulp](https://github.com/beancount/beangulp) | GPL-2.0 | Importer framework targeted by [`skills/`](./skills); not bundled |
| [rustledger](https://github.com/rustledger/rustledger) | GPL-3.0-only | Powers the hosted ledger service; absent from this repo |

### Beancount

Martin Blais's double-entry bookkeeping language and engine is the foundation of everything here — the file format, the parser, the booking rules, and the semantics every other package in this monorepo assumes.

`bea` provisions pinned upstream Beancount into a managed environment; the bundled helper calls its public API in a child process. No Beancount source is copied, vendored, or modified in this repository, and installers get the package from PyPI under the GPL-2.0 terms Beancount ships with.

### Fava

Fava is the web interface for Beancount, and its Python layer is the best-tested implementation of ledger loading, account trees, filtering, and financial statements that exists.

The vendored `fava` package inside [`cli/src/fava`](./cli/src/fava) **is a derivative work of Fava**, reduced to that Python core with the web UI removed. This is the one place where upstream code lives in this repository, so [`cli/NOTICE.fava`](./cli/NOTICE.fava) retains the original Fava provenance alongside the root `LICENSE`, exactly as the MIT license requires:

```
Copyright (c) 2019-2026 Beancount.io
Copyright (c) 2015-2016 Dominik Aumayr <dominik@aumayr.name>
```

### beanquery

The BQL query engine behind `bea query`, the CLI's reports, and `fava`'s statement generation. Consumed as an unmodified PyPI dependency; no beanquery code ships in this repository.

### beangulp

The importer framework for pulling bank and broker exports into a ledger. The [`beancount-import` and `beancount-importer-author` skills](./skills) generate and test importers that run against Beangulp enabled through `bea engine enable beangulp`. The skills contain instructions and reference documentation about beangulp's API, not beangulp's code.

### rustledger

A Rust implementation of the Beancount engine, used server-side to power the hosted Beancount.io ledger API. It runs inside a standalone internal service built on the unmodified `@rustledger/wasm` package (0.21.0, `GPL-3.0-only`).

None of it is present in this repository or in the web and mobile clients, and the service image is never distributed. GPLv3 obligations attach to *conveying* copies of the software; running the engine to serve a hosted API conveys nothing, and rustledger is GPL-3.0-only rather than AGPL, so it carries no network-use clause. If Beancount.io ever ships a self-hosted or on-premises build that includes the ledger service, that would be a conveyance event and the arrangement gets re-evaluated before shipping.

## How the licenses fit together

- **Licenses follow components.** Frontend code remains MIT; the bundled CLI ledger helper is distributed under GPL-2.0-only, and Fava retains its MIT notice.
- **Upstream packages are downloaded separately.** Beancount, beanquery, and optional beangulp come from PyPI under their own terms. The CLI wheel bundles helper source and Fava source, with their license materials; its sdist also includes the build and installation scripts.
- **The one derivative work is labelled.** The vendored `cli/src/fava` derives from MIT-licensed Fava and carries upstream's copyright and permission notice in `cli/NOTICE.fava` and the root `LICENSE`.
- **rustledger stays out.** No rustledger code, and no `.wasm` artifact, is included in this repository or served to browsers.

This page is a description of our practice, not legal advice. If you believe something here is misattributed or a license is misapplied, please [open an issue](https://github.com/bex-co/beancount-io/issues) — we will fix it.

## The wider stack

Thanks as well to the open-source projects the packages in this monorepo are built with, each under its own license — React, React Native, Expo, TanStack, Apollo, Vite, TypeScript, Monaco, i18next, Typer, Pydantic, uv, Ruff, and many more, along with the maintainers of every transitive dependency in [`dashboard/`](./dashboard), [`mobile/`](./mobile), and [`cli/`](./cli).
