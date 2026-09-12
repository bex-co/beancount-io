# ADR 014: One bea installation with independent Beancount commands

- Status: Accepted — m19 base verified in local installed-artifact rehearsals (t008); optional ecosystem (**m20**) and ledger-skills onboarding (**m21**) remain pending; publishing `beancount-io-engine` beside the frontend on PyPI is a release gate, not claimed by this ADR alone
- Date: 2026-09-11
- Decision owners: CLI (`cli/`)
- Related: [ADR012 — optional Beangulp dependency](./ADR012-cli-beangulp-not-a-hard-dependency.md)

## Context

Customers should install `bea` once and use it for both native Beancount commands and existing bea features. The frontend invokes independent command-line programs instead of loading Beancount in its own Python process.

The assessed **pre-migration** baseline is commit `fc038fa08bcdb2e09fffb1c959c78209d1e193d3`, `beancount-io` 0.1.0, Beancount 3.2.3, and Beanquery 0.2.0 (in-process library use). As of 2026-09-12, the m19 implementation lands the process boundary and one-install provisioning; see [Checklist](#checklist) and t008 evidence. Optional Beangulp/Beanprice coverage stays in **m20**; skills that still tell agents to `pip install beancount` stay in **m21**.

## Decision

- Keep one customer installation and one `bea` entrypoint. Automatically manage a separate engine environment containing Beancount and Beanquery, without requiring customers to install either package or configure their executable paths.
- Launch native Beancount and Beanquery executables as child processes, with minimal argument translation. Let upstream own their options, validation, query dispatch, and rendering. The bea frontend must not load these libraries directly or indirectly through Fava or shared utility modules.
- Preserve native inputs, defaults, output streams, exit status, and file effects for delegated commands. Make `bea` conveniences explicit extensions. Adopting native formatting defaults migrates the old implicit in-place rewrite to an explicit `--in-place` / `-i` option (`bea format` prints to stdout by default).
- Preserve `bea` additions such as ledger editing, reports, CSV import review, and cloud management. Move their engine-dependent operations into a separately packaged command-line helper in the engine environment; keep user interaction, cloud clients, and AI SDKs in the frontend.
- Keep Beangulp and Beanprice adapters optional, consistent with ADR012. Assess them separately from the installed Beancount/Beanquery baseline (**m20**).

This reduces duplicated CLI logic and makes upstream upgrades easier to follow. Adapters still need checks at the command boundary where bea behavior differs from upstream.

## Installation and execution

| Stage | Design |
| --- | --- |
| Install bea | Install the frontend and its dependencies, with AI dependencies remaining optional. Beancount, Beanquery, and the Fava reporting code belong to the engine distribution and environment. |
| Provision the engine | Download reviewed, version- and hash-pinned upstream artifacts and the helper automatically. Homebrew can provision during installation; the PyPI-installed frontend provisions on first engine use without a separate setup command. |
| Run a command | Resolve the executable in the managed engine environment and pass arguments as an argument array. Preserve the working directory, stdin, stdout, stderr, interactive terminal behavior, signals, and exit status. |
| Reuse and upgrade | Reuse the installed engine so subsequent local commands work offline. Upgrade the frontend and its compatible engine versions through the normal bea upgrade path, with no separate customer maintenance step. |

Changing installation order alone does not establish this boundary: the frontend dependency graph and runtime imports must change too. Use ordinary command arguments, ledger text, BQL, and documented result formats such as CSV or JSON. Do not exchange pickled Python objects, Beancount ASTs, or a remote mirror of its internal library API. JSON encoding alone does not establish program independence.

### Existing bea features

Native commands do not cover every existing feature. The engine helper must be independently invocable for complete ledger operations, with documented inputs and outputs. It owns parsing, validation, and engine-dependent writes and rendering; the frontend retains the customer-facing workflow.

| Existing features | Execution after migration |
| --- | --- |
| `bea add …`, `bea list …` | Invoke helper commands for directive validation, writing, and reading; preserve existing file effects and result formats. |
| `bea balance`, `bea report …` | Execute Beancount/Fava calculations and reporting in the helper, preserving numeric precision. |
| `bea init`, `bea import` | Keep setup and import review in the frontend; run engine-dependent formatting, importer execution, deduplication, validation, and writes in the engine environment. Preserve preview/apply behavior. |
| `bea ask` | Keep AI SDKs and conversation handling in the frontend. Execute queries, validation, and requested ledger writes through engine commands. |
| `bea cloud …`, `bea upgrade` | Keep cloud and package-management behavior in the frontend; upgrade also manages the engine installation. |

This migration includes shared directive readers/writers, ledger utilities, query rendering, and CSV mapping. Moving only `check`, `format`, and `query` would leave other paths loading Beancount in the frontend.

Sources: [directive reader](../../cli/src/bea_engine/ledger/reader.py), [directive writer](../../cli/src/bea_engine/ledger/writer.py), [ledger writes](../../cli/src/bea_engine/ledger/write.py), [CSV mapping](../../cli/src/bea_engine/csv_mapper.py), and [AI ledger operations](../../cli/src/cli/ask/agent.py).

## Licensing boundary

The design follows the [FSF distinction between ordinary communication among separate programs and tightly coupled components][gpl-aggregation]. Automatic installation and ordinary CLI invocation are permitted patterns; neither separate downloads nor subprocesses alone prove GPL compliance. Whether the actual components form a combined work still depends on their relationship and communication.

Retain the frontend's MIT license and each engine component's applicable license. Distribute the GPL-using helper and any engine combination in a GPL-compliant way. Preserve full license texts and copyright notices, including Fava's MIT notice, in the applicable wheel, sdist, and installed Homebrew contents. When redistributing GPL binaries, provide complete corresponding source through a route allowed by [GPLv2 sections 1–3][beancount-license], including relevant modifications and build/install scripts.

Keep Apache-licensed AI SDKs on the frontend side. These are release-review items, not a finding that the current bea distributor has legally infringed. **Installation order, managed venvs, and subprocess use are not a legal certification** of any combined-work theory.

**Product policy (2026-09-11):** bea's release bar is the **process boundary** — the frontend must not load Beancount, Beanquery, or Fava (directly or indirectly). We pin and provision the upstream Beancount/Beanquery engine combination for behavior, but we **do not audit or resolve transitive dependency license relationships** inside that upstream combination (for example Beancount's dependency on `regex`). Those relationships remain upstream's. w1/m19/t013 records this policy and closes the former “Beancount+regex compatibility” gate.

Sources: [Beancount license declaration][beancount-license-declaration]; Fava notice in `cli/NOTICE.fava`; [FSF aggregation FAQ][gpl-aggregation].

### Component and distribution matrix (w1/m19/t001)

Audited against the ADR014 baseline (`beancount-io` 0.1.0 layout, Beancount 3.2.3, Beanquery 0.2.0) and the proposed independent-program layout. “Redistribute” means we ship or install the artifact for customers; “upstream download” means the customer or provisioner fetches upstream packages by hash.

| Component | Role after migration | Declared license (audited) | How it reaches the customer | Materials we ship or retain | Owner / task |
| --- | --- | --- | --- | --- | --- |
| `beancount-io` frontend (`src/cli` without engine imports) | Customer `bea` entrypoint; cloud; upgrade; optional AI | MIT (package declaration) | PyPI wheel/sdist; Homebrew formula installs frontend venv | MIT text; project README | Release (`cli/`); verified in t023/t008 |
| Optional AI extras (`openai`, `pydantic-ai`, …) | `bea ask` only; never in engine | Apache-2.0 / MIT (as declared by each package) | Optional `[ask]` extra on frontend only | Preserve upstream notices in the frontend environment | Frontend packaging (t015/t022) |
| Frontend runtime (Typer, httpx, Pydantic, …) | UX, HTTP, settings | Permissive (MIT/BSD-family as declared) | Frontend dependency graph | Upstream package metadata in installed env | Frontend packaging |
| Engine helper (`bea-engine` / equivalent CLI) | Independently invocable ledger ops (add/list/report/init/import/ask ledger side) | Distributed with the engine (uses Beancount) | Packaged with the engine env; not imported by frontend | Helper source in the engine artifact; `NOTICE.fava` where applicable | t014, verified t023 |
| Vendored Fava subset (`src/fava`, `NOTICE.fava`) | Reporting inside the helper | MIT (Fava provenance; `forecast.py` is independent MIT) | Engine/helper artifact only after migration | `NOTICE.fava` + MIT notice in engine materials | t014/t020, verified t023 |
| Beancount 3.2.3 + scripts (`bean-check`, `bean-format`, `bean-doctor`, `bean-example`, `treeify`) | Native child processes | `GPL-2.0-only` (upstream) | Hash-pinned engine provision (Homebrew install-time; PyPI first use) | Upstream license metadata as shipped by the packages we pin | t015/t016; notices t023 |
| Beanquery 0.2.0 (`bean-query`) | Native query child process | GPLv2 (upstream LICENSE) | Same engine env | Upstream license metadata | t015/t005 |
| Engine transitive deps (including `regex`, `click`, …) | Support Beancount/Beanquery inside the engine process | As declared by each upstream package | Pulled with the pinned engine lockfile | Not separately reviewed for inter-package compatibility | Policy: out of scope (t013) |
| Optional Beangulp / Beanprice | Ecosystem adapters | Assess separately (ADR012); not in m19 baseline | Optional engine extras (m20) | Own review when enabled | **m20** (explicitly pending) |

**Child programs** (all engine-side; frontend launches argv arrays only): `bean-check`, `bean-format`, `bean-query`, `bean-doctor` (and its eleven operations), `bean-example`, `treeify`, plus the helper’s documented business-level commands for directive read/write, balances/reports, and init/import accounting ops.

**Pre-migration baseline (audit start):** one MIT-labeled wheel depended on and could load Beancount/Beanquery/Fava in-process. **Post-migration (t023/t008):** the customer frontend wheel packages only `cli/`; Beancount/Beanquery/Fava/`bea_engine` load only in the managed engine environment.

### Release obligations checklist

| Obligation | Evidence required | Owner / task | Status |
| --- | --- | --- | --- |
| Frontend dependency graph has no Beancount, Beanquery, or Fava | Installed frontend `METADATA` / import probe on startup and local paths | t023, t008 | Verified in t023 packaging tests + t008 installed-wheel/sdist smoke (`cli/tmp/t008-installed-artifact-evidence.md`) |
| Engine env is separate and hash-pinned | Manifest + provisioner logs; offline reuse | t015, t016, t017 | Verified offline reuse in t008 installed smoke; Homebrew clean-env still CI-gated |
| Frontend MIT + Fava MIT notice retained where we ship those materials | Artifact listing / `NOTICE.fava` in engine materials | t023, t008 | Verified in packaging tests; t008 smoke asserts engine `NOTICE.fava` after provision |
| AI SDKs stay frontend-only | Engine lockfile excludes them | t022 | Done for engine pyproject; lock verification continues in release |
| Optional ecosystem packages reviewed separately | m20 milestone | m20 | Explicitly out of m19 |
| Transitive engine-dep license compatibility (e.g. Beancount+regex) | — | **Out of scope** (t013 policy) | Closed / waived |

### Closed policy item (w1/m19/t013)

**Decision:** Do not treat Beancount's transitive dependencies (including `regex`) as a bea release gate. bea cares that the **frontend does not import or otherwise load** Beancount, Beanquery, or Fava; the engine provisions the reviewed upstream Beancount/Beanquery versions for behavior. Inter-package license compatibility among upstream engine dependencies is not analyzed or certified here.

### Remaining open conditions

1. Combined-work assessment for frontend↔engine communication remains factual (ordinary CLI vs tightly coupled). Owner: release review after t023/t008 evidence; not certified by this matrix alone.
2. Optional Beangulp/Beanprice license and distribution review is deferred to **m20** (pending).
3. Customer-facing ledger skills still instruct `pip install beancount` as a no-`bea` fallback; aligning them with one-install bea is **m21** (pending) — do not treat skills as updated by m19 adoption docs alone.
4. Production PyPI first-use requires publishing `beancount-io-engine` next to `beancount-io` (built in `make release-artifacts`; not claimed published by local t008 rehearsal). Homebrew clean-env install remains CI-gated when a host already has `brew` `bea`.

Sources for the matrix pins: installed package metadata in the `cli/` uv environment on 2026-09-11; [Beancount COPYING][beancount-license]; `cli/NOTICE.fava`; `cli/pyproject.toml`; `cli/scripts/render-formula.sh`.

## Native command comparison

Coverage below is the **post-migration** state verified by package tests and t008 installed smoke (PyPI wheel/sdist). Optional ecosystem rows remain pending (**m20**).

| Upstream command | bea command | Coverage | Notes |
| --- | --- | --- | --- |
| `bean-check` | `bea check` | Delegated | Native child process; frontend does not load Beancount. |
| `bean-format` | `bea format` | Delegated | Native defaults: stdout unless `--in-place` / `-i` or `-o`; documented migration from old in-place rewrite. |
| `bean-query` | `bea query` | Delegated | Native batch and interactive shell; `PRINT` yields parseable directives. |
| `bean-doctor` | `bea doctor` | Delegated | Full eleven-operation group exposed. |
| `bean-example` | `bea example` | Delegated | Seeded example-history generation. |
| `treeify` | `bea treeify` | Delegated | Tree rendering of a column in arbitrary text. |

Sources: [check](../../cli/src/cli/commands/check.py), [format](../../cli/src/cli/commands/format.py), [query](../../cli/src/cli/commands/query.py), [doctor](../../cli/src/cli/commands/doctor.py), [example](../../cli/src/cli/commands/example.py), [treeify](../../cli/src/cli/commands/treeify.py), [upstream core commands][upstream-scripts], and [upstream query CLI][upstream-query].

### Optional ecosystem commands (**m20** — pending)

`ingest.py` denotes the user's Beangulp ingest script. These packages were inspected in source but were not installed or exercised as part of m19.

| Upstream command | Current bea counterpart | Remaining work (m20) |
| --- | --- | --- |
| `python ingest.py identify` | Importer selection within `bea import` | Optional adapter for standalone batch identification. |
| `python ingest.py extract` | `bea import --config CONFIG` | Optional adapter for raw batch extraction and upstream lifecycle hooks; retain bea's preview/apply workflow. |
| `python ingest.py archive` | None | Optional adapter for upstream document archival. |
| `bean-price` | None; `bea add price` records a supplied quote | Optional adapter for current/historical quote fetching and provider options. |

Sources: [bea import](../../cli/src/cli/commands/import_.py), [Beangulp][upstream-ingest], and [Beanprice][upstream-prices].

## Checklist

- [x] Inventory the installed native commands and current `bea` coverage.
- [x] Provide automatic engine provisioning, reuse, and upgrades for Homebrew and PyPI installations; require no separate customer install/setup command. (t015/t016/t017; customer docs in `cli/README.md` / `cli/docs/USAGE.md`)
- [x] Remove direct and indirect Beancount/Beanquery/Fava runtime loading from the frontend; verify the boundary across startup and all local command paths (t023 packaging + isolation tests; clean-install evidence remains t008).
- [x] Delegate `check`, `format`, and `query` to native executables in child processes; document migration of conflicting defaults and explicit `bea` extensions. (t003/t004/t005; format `--in-place` migration documented)
- [x] Expose `doctor`, `example`, and `treeify` through the same process delegation. (t006/t007)
- [x] Move engine-dependent add/list, balance/report, init/import, and ask operations into the independently invocable helper; preserve their existing workflows and file effects. (t018–t022)
- [x] Compare wrappers against the recorded upstream versions via installed smoke and package tests (t008 `scripts/smoke-installed.py`: native + existing commands, PATH isolation, offline reuse). Rerun when upstream pins change.
- [x] Record product policy: no transitive engine-dep license gate (Beancount+regex out of scope); verify frontend/engine notices we ship (`NOTICE.fava`, package licenses) in release artifacts (t013).
- [x] Run CLI checks and clean installed-artifact smoke tests for both channels without preinstalled Beancount. Verify frontend isolation and offline engine reuse; rerun affected comparisons when upstream versions change. (t008: PyPI wheel+sdist local rehearsal green; Homebrew formula suite green; clean `brew` install blocked on this host by an existing tap install — see `cli/tmp/t008-installed-artifact-evidence.md`.)
- [ ] Separately add and verify optional Beangulp and Beanprice adapters for full ecosystem coverage. (**m20** — pending)
- [ ] Align ledger skills with one-install bea (stop redundant Beancount installs for agents that already have `bea`). (**m21** — pending)

Native parity covers the six commands in the native comparison table. The installation and process-boundary requirements also cover existing local bea features. Optional integrations and skills onboarding have their own milestones.

**Helper package landed (t014, with the t015/t002 foundation).** The engine distribution exists: `beancount-io-engine` (`cli/engine/pyproject.toml`) packages the independently invocable `bea-engine` helper (`cli/src/bea_engine/`) together with the vendored Fava subset and Fava's notice, and declares Beancount and Beanquery without any AI SDK. Its command protocol — argv and ledger paths in, one JSON envelope on stdout, `cli.errors` exit codes — is documented in [`cli/src/bea_engine/README.md`](../../cli/src/bea_engine/README.md). The frontend reaches it through `cli/src/cli/engine/`: `paths` resolves a versioned environment under `$XDG_DATA_HOME/bea/engine/<version>`, `provision` installs the pinned combination in `cli/src/cli/engine/manifest.json` atomically on first use (Homebrew installs the engine venv at formula time via `BEA_ENGINE_DIR`), and `launch` runs it as a child process with an argv array. Frontend isolation (t023) removes Beancount/Beanquery/Fava/`bea_engine` from the customer `beancount-io` wheel and runtime dependency graph; `cli/tests/test_engine_launch.py` proves customer command paths load none of those modules in the frontend process. t008 recorded installed-artifact smoke for PyPI wheel and sdist (hash-pinned first-use provision, native+existing commands, PATH isolation, offline reuse, engine `NOTICE.fava`); evidence: `cli/tmp/t008-installed-artifact-evidence.md`. Remaining checklist items: **m20** (optional ecosystem) and **m21** (skills).

## Individual command inventory

The main tables cover `check`, `format`, `query`, and `import`. The following tables list every doctor operation, query-shell handler, and remaining `bea` command individually. Existing implementation or inherited code is not an assertion that every behavior was tested.

### Doctor operations

All eleven operations are exposed through `bea doctor` (delegated to `bean-doctor`). `dump-lexer` is an alias of `lex`.

| Upstream command | bea command | Purpose |
| --- | --- | --- |
| `bean-doctor lex` | `bea doctor lex` | Inspect lexer tokens. |
| `bean-doctor parse` | `bea doctor parse` | Debug parsing. |
| `bean-doctor roundtrip` | `bea doctor roundtrip` | Compare parse/print/reparse results. |
| `bean-doctor directories` | `bea doctor directories` | Check document-directory account names. |
| `bean-doctor list-options` | `bea doctor list-options` | List supported ledger options. |
| `bean-doctor print-options` | `bea doctor print-options` | Show effective ledger options. |
| `bean-doctor context` | `bea doctor context` | Inspect transaction booking and inventories. |
| `bean-doctor linked` | `bea doctor linked` | Inspect related transactions. |
| `bean-doctor region` | `bea doctor region` | Inspect transactions and balances in a source region. |
| `bean-doctor missing-open` | `bea doctor missing-open` | Generate missing account opens. |
| `bean-doctor display-context` | `bea doctor display-context` | Inspect inferred numeric precision. |

Source: [upstream doctor][upstream-doctor].

### Interactive query commands

These commands run inside `bea query`. The interactive shell is the upstream shell launched as a child process; the frontend does not reimplement each handler.

| Upstream shell command | Inside bea's shell | Implementation |
| --- | --- | --- |
| `.clear` | `.clear` | Upstream shell. |
| `.describe NAME` | `.describe NAME` | Upstream shell. |
| `.errors` | `.errors` | Upstream shell. |
| `.exit` | `.exit` | Upstream shell. |
| `.explain BQL` | `.explain BQL` | Upstream shell. |
| `.format FORMAT` | `.format FORMAT` | Upstream shell; text, CSV, and Beancount output. |
| `.help [COMMAND]` | `.help [COMMAND]` | Upstream shell. |
| `.history` | `.history` | Upstream shell. |
| `.output [FILE]` | `.output [FILE]` | Upstream shell. |
| `.parse BQL` | `.parse BQL` | Upstream shell. |
| `.quit` | `.quit` | Upstream shell. |
| `.reload` | `.reload` | Upstream shell (ledger paths come from the invoking bea command). |
| `.run [NAME]` | `.run [NAME]` | Upstream shell; stored queries. |
| `.set [NAME VALUE]` | `.set [NAME VALUE]` | Upstream shell; includes numberification settings. |
| `.tables` | `.tables` | Upstream shell. |
| `EOF` | `EOF` | Upstream shell. |

Sources: [query command](../../cli/src/cli/commands/query.py) and [upstream shell][upstream-query].

### Additional bea commands

All commands below exist. “Related BQL” indicates an overlapping query capability, not an equivalent dedicated upstream command. Current Beancount has no `bean-report` executable.

| bea command | Upstream relationship | Purpose |
| --- | --- | --- |
| `bea balance` | Related BQL balances | Show account-subtree balances. |
| `bea init` | No equivalent; `bean-example` generates history | Create a starter ledger. |
| `bea ask` | No counterpart | Ask questions about a local ledger. |
| `bea upgrade` | Package-management operation | Upgrade bea. |
| `bea add transaction` | No dedicated append command | Append a transaction. |
| `bea add transactions` | No dedicated append command | Append a JSON transaction batch. |
| `bea add open` | `missing-open` only generates suggestions | Open a named account. |
| `bea add close` | No dedicated append command | Close an account. |
| `bea add balance` | No dedicated append command | Append a balance assertion. |
| `bea add pad` | No dedicated append command | Append a pad directive. |
| `bea add note` | No dedicated append command | Append a note. |
| `bea add event` | No dedicated append command | Append an event. |
| `bea add price` | `bean-price` fetches quotes | Record a supplied quote. |
| `bea add commodity` | No dedicated append command | Declare a commodity. |
| `bea add document` | No dedicated append command | Append a document reference. |
| `bea add custom` | No dedicated append command | Append a custom directive. |
| `bea list transaction` | Related BQL | List transactions. |
| `bea list open` | Related BQL | List account opens. |
| `bea list close` | Related BQL | List account closes. |
| `bea list balance` | Related BQL | List balance assertions. |
| `bea list pad` | Related BQL | List pads. |
| `bea list note` | Related BQL | List notes. |
| `bea list event` | Related BQL | List events. |
| `bea list price` | Related BQL | List prices. |
| `bea list commodity` | Related BQL | List commodities. |
| `bea list document` | Related BQL | List document references. |
| `bea list custom` | Related BQL | List custom directives. |
| `bea report overview` | Related BQL aggregations | Show a financial summary. |
| `bea report income-statement` | Related BQL aggregations | Report income, expenses, and profit. |
| `bea report balance-sheet` | Related BQL aggregations | Report assets, liabilities, and equity. |
| `bea report trial-balance` | Related BQL aggregations | Report signed account balances. |
| `bea cloud login` | No counterpart | Authenticate with Beancount.io. |
| `bea cloud logout` | No counterpart | Sign out. |
| `bea cloud status` | No counterpart | Show authentication status. |
| `bea cloud ledger list` | No counterpart | List hosted ledgers. |
| `bea cloud ledger show` | No counterpart | Inspect a hosted ledger. |
| `bea cloud ledger create` | No counterpart | Create a hosted ledger. |
| `bea cloud ledger clone` | Git operation | Clone a hosted ledger. |
| `bea cloud ledger delete` | No counterpart | Delete a hosted ledger. |

Sources: [registration](../../cli/src/cli/main.py), [add](../../cli/src/cli/commands/add.py), [list](../../cli/src/cli/commands/list.py), [reports](../../cli/src/cli/commands/report.py), and [cloud](../../cli/src/cli/commands/cloud/app.py).

[upstream-scripts]: https://github.com/beancount/beancount/tree/3.2.3/beancount/scripts
[upstream-query]: https://github.com/beancount/beanquery/blob/v0.2.0/beanquery/shell.py
[upstream-doctor]: https://github.com/beancount/beancount/blob/3.2.3/beancount/scripts/doctor.py
[upstream-ingest]: https://github.com/beancount/beangulp/blob/d5672c9dbb317842e0f24f1ed7f4b57fa53fa1c6/beangulp/__init__.py
[upstream-prices]: https://github.com/beancount/beanprice/blob/ab9e0cc2f03029d5af59f5bfcea38f03e271fb3d/beanprice/price.py
[gpl-aggregation]: https://www.gnu.org/licenses/gpl-faq.en.html#MereAggregation
[beancount-license]: https://github.com/beancount/beancount/blob/3.2.3/COPYING
[beancount-license-declaration]: https://github.com/beancount/beancount/blob/3.2.3/README.rst#copyright-and-license
