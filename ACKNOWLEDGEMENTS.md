# Acknowledgements

Beancount.io exists because of the plain-text accounting community. This page credits the projects we build on and records how we comply with each of their licenses.

This repository is [MIT licensed](./LICENSE). That license covers only the code that lives here. Every upstream project below stays under its own license, and nothing here relicenses any of them.

## The Beancount ecosystem

| Project | License | How Beancount.io uses it |
| --- | --- | --- |
| [Beancount](https://github.com/beancount/beancount) | GPL-2.0-only | Unmodified PyPI dependency of [`cli/`](./cli) and [`fava-slim/`](./fava-slim) |
| [Fava](https://github.com/beancount/fava) | MIT | [`fava-slim/`](./fava-slim) is a derivative work of its Python core |
| [beanquery](https://github.com/beancount/beanquery) | GPL-2.0 | Unmodified PyPI dependency for BQL queries and reports |
| [beangulp](https://github.com/beancount/beangulp) | GPL-2.0 | Importer framework targeted by [`skills/`](./skills); not bundled |
| [rustledger](https://github.com/rustledger/rustledger) | GPL-3.0-only | Powers the hosted ledger service; absent from this repo |

### Beancount

Martin Blais's double-entry bookkeeping language and engine is the foundation of everything here — the file format, the parser, the booking rules, and the semantics every other package in this monorepo assumes.

`cli/` and `fava-slim/` declare `beancount>=3.2` as a dependency and call its public API. No Beancount source is copied, vendored, or modified in this repository, and installers get the package from PyPI under the GPL-2.0 terms Beancount ships with.

### Fava

Fava is the web interface for Beancount, and its Python layer is the best-tested implementation of ledger loading, account trees, filtering, and financial statements that exists.

[`fava-slim/`](./fava-slim) **is a derivative work of Fava**, reduced to that Python core with the web UI removed. This is the one place where upstream code lives in this repository, so [`fava-slim/LICENSE`](./fava-slim/LICENSE) retains the original Fava copyright and permission notice alongside ours, exactly as the MIT license requires:

```
Copyright (c) 2019-2026 Beancount.io
Copyright (c) 2015-2016 Dominik Aumayr <dominik@aumayr.name>
```

### beanquery

The BQL query engine behind `beancount-cli query`, the CLI's reports, and `fava-slim`'s statement generation. Consumed as an unmodified PyPI dependency; no beanquery code ships in this repository.

### beangulp

The importer framework for pulling bank and broker exports into a ledger. The [`beancount-import` and `beancount-importer-author` skills](./skills) generate and test importers that run against the beangulp you install yourself. The skills contain instructions and reference documentation about beangulp's API, not beangulp's code.

### rustledger

A Rust implementation of the Beancount engine, used server-side to power the hosted Beancount.io ledger API. It runs inside a standalone internal service built on the unmodified `@rustledger/wasm` package (0.21.0, `GPL-3.0-only`).

None of it is present in this repository or in the web and mobile clients, and the service image is never distributed. GPLv3 obligations attach to *conveying* copies of the software; running the engine to serve a hosted API conveys nothing, and rustledger is GPL-3.0-only rather than AGPL, so it carries no network-use clause. If Beancount.io ever ships a self-hosted or on-premises build that includes the ledger service, that would be a conveyance event and the arrangement gets re-evaluated before shipping.

## How the licenses fit together

- **The MIT boundary is this repository.** Clients, CLI, library, and skills here are MIT. Upstream projects are not.
- **GPL dependencies are consumed, not incorporated.** Beancount, beanquery, and beangulp are unmodified upstream packages that users install from PyPI under their own terms. Nothing in this repository is a modified version of them, and no GPL source is redistributed here.
- **The one derivative work is labelled.** `fava-slim/` derives from MIT-licensed Fava and carries upstream's copyright and permission notice in its own LICENSE file.
- **rustledger stays out.** No rustledger code, and no `.wasm` artifact, is included in this repository or served to browsers.

This page is a description of our practice, not legal advice. If you believe something here is misattributed or a license is misapplied, please [open an issue](https://github.com/bex-co/beancount-io/issues) — we will fix it.

## The wider stack

Thanks as well to the open-source projects the packages in this monorepo are built with, each under its own license — React, React Native, Expo, TanStack, Apollo, Vite, TypeScript, Monaco, i18next, Typer, Pydantic, uv, Ruff, and many more, along with the maintainers of every transitive dependency in [`dashboard/`](./dashboard), [`mobile/`](./mobile), [`cli/`](./cli), and [`fava-slim/`](./fava-slim).
