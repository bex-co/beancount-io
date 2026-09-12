# ADR 014: One bea installation with independent Beancount commands

- Status: Proposed
- Date: 2026-09-11
- Decision owners: CLI (`cli/`)
- Related: [ADR012 — optional Beangulp dependency](./ADR012-cli-beangulp-not-a-hard-dependency.md)

## Context

`bea` currently wraps selected Beancount library functions and supplies its own command handling. This covers everyday use, but misses some behavior already implemented in the native commands. Customers should install once and use `bea` for both native commands and existing bea features. The proposed frontend invokes independent command-line programs instead of loading Beancount in its own Python process.

The assessed baseline is commit `fc038fa08bcdb2e09fffb1c959c78209d1e193d3`, `beancount-io` 0.1.0, Beancount 3.2.3, and Beanquery 0.2.0. Current parity is partial. The command tables describe that baseline; implementation also requires moving existing engine-dependent features across the process boundary.

## Decision

- Keep one customer installation and one `bea` entrypoint. Automatically manage a separate engine environment containing Beancount and Beanquery, without requiring customers to install either package or configure their executable paths.
- Launch native Beancount and Beanquery executables as child processes, with minimal argument translation. Let upstream own their options, validation, query dispatch, and rendering. The bea frontend must not load these libraries directly or indirectly through Fava or shared utility modules.
- Preserve native inputs, defaults, output streams, exit status, and file effects for delegated commands. Make `bea` conveniences explicit extensions. For example, adopting native formatting defaults means migrating today's implicit in-place behavior to an explicit option.
- Preserve `bea` additions such as ledger editing, reports, CSV import review, and cloud management. Move their engine-dependent operations into a separately packaged command-line helper in the engine environment; keep user interaction, cloud clients, and AI SDKs in the frontend.
- Keep Beangulp and Beanprice adapters optional, consistent with ADR012. Assess them separately from the installed Beancount/Beanquery baseline.

This reduces duplicated CLI logic and makes upstream upgrades easier to follow. Adapters still need checks at the command boundary, especially where current `bea` behavior differs. This ADR proposes the change; it does not claim the wrappers already exist.

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

Sources: [directive reader](../../cli/src/cli/directives/reader.py), [directive writer](../../cli/src/cli/directives/writer.py), [ledger writes](../../cli/src/cli/ledger_write.py), [CSV mapping](../../cli/src/cli/csv_mapper.py), and [AI ledger operations](../../cli/src/cli/ask/agent.py).

## Licensing boundary

The design follows the [FSF distinction between ordinary communication among separate programs and tightly coupled components][gpl-aggregation]. Automatic installation and ordinary CLI invocation are permitted patterns; neither separate downloads nor subprocesses alone prove GPL compliance. Whether the actual components form a combined work still depends on their relationship and communication.

Retain the frontend's MIT license and each engine component's applicable license. Distribute the GPL-using helper and any engine combination in a GPL-compliant way. Preserve full license texts and copyright notices, including Fava's MIT notice, in the applicable wheel, sdist, and installed Homebrew contents. When redistributing GPL binaries, provide complete corresponding source through a route allowed by [GPLv2 sections 1–3][beancount-license], including relevant modifications and build/install scripts.

The audited Beancount 3.2.3 (`GPL-2.0-only`) / regex 2026.7.19 (includes Apache-2.0 code) dependency combination still needs a separate compatibility resolution. Process separation between bea and the engine does not change that internal dependency. Verify a compatible dependency combination or applicable additional permission before marking this item complete. Keep Apache-licensed AI SDKs on the frontend side. These are release-review items, not a finding that the current bea distributor has legally infringed.

Sources: [Beancount license declaration][beancount-license-declaration], [regex license][regex-license], and [Apache/GPL compatibility explanation][apache-gpl].

## Native command comparison

**Partial** means a command exists with missing or different behavior. **Missing** means its wrapper is absent. Names marked *proposed* are the intended mapping.

| Upstream command | bea command | Current coverage | Delegation work |
| --- | --- | --- | --- |
| `bean-check` | `bea check` | Partial | Use native validation, including extra data-type checks, auto-plugin mode, timing, and cache options. |
| `bean-format` | `bea format` | Partial | Expose native stdin/stdout, output-file, multiple-file, and alignment options; resolve the current in-place default. |
| `bean-query` | `bea query` | Partial | Use native dispatch for batch and interactive queries, including stdin, source URIs, export formats, output files, numberification, and error-display options. |
| `bean-doctor` | `bea doctor` (*proposed*) | Missing | Expose the existing diagnostic command group. |
| `bean-example` | `bea example` (*proposed*) | Missing | Delegate dated, seeded example-history generation. |
| `treeify` | `bea treeify` (*proposed*) | Missing | Delegate tree rendering of a column in arbitrary text. |

Two concrete gaps explain why delegation matters: `bea check` omits native `HARDCORE_VALIDATIONS`; one-shot `bea --file FILE query "PRINT"` emits a `ROW(*)` table instead of parseable directives. Both capabilities already exist upstream. Ordinary queries and the interactive shell already work; the latter inherits the commands listed below.

Sources: [check implementation](../../cli/src/cli/commands/check.py), [loader](../../cli/src/fava/beans/load.py), [query dispatch](../../cli/src/cli/commands/query.py), [shell adapter](../../cli/src/cli/query_render.py), [formatter](../../cli/src/cli/commands/format.py), [upstream core commands][upstream-scripts], and [upstream query CLI][upstream-query].

### Optional ecosystem commands

`ingest.py` denotes the user's Beangulp ingest script. These packages were inspected in source but were not installed or exercised locally.

| Upstream command | Current bea counterpart | Remaining work |
| --- | --- | --- |
| `python ingest.py identify` | Importer selection within `bea import` | Optional adapter for standalone batch identification. |
| `python ingest.py extract` | `bea import --config CONFIG` | Optional adapter for raw batch extraction and upstream lifecycle hooks; retain bea's preview/apply workflow. |
| `python ingest.py archive` | None | Optional adapter for upstream document archival. |
| `bean-price` | None; `bea add price` records a supplied quote | Optional adapter for current/historical quote fetching and provider options. |

Sources: [bea import](../../cli/src/cli/commands/import_.py), [Beangulp][upstream-ingest], and [Beanprice][upstream-prices].

## Checklist

- [x] Inventory the installed native commands and current `bea` coverage.
- [ ] Provide automatic engine provisioning, reuse, and upgrades for Homebrew and PyPI installations; require no separate customer install/setup command.
- [ ] Remove direct and indirect Beancount/Beanquery/Fava runtime loading from the frontend; verify the boundary across startup and all local command paths.
- [ ] Delegate `check`, `format`, and `query` to native executables in child processes; document migration of conflicting defaults and explicit `bea` extensions.
- [ ] Expose `doctor`, `example`, and `treeify` through the same process delegation.
- [ ] Move engine-dependent add/list, balance/report, init/import, and ask operations into the independently invocable helper; preserve their existing workflows and file effects.
- [ ] Compare wrappers against the recorded upstream versions: inputs/options, results, stdout/stderr, exit status, and file effects. Include invalid plugin output, parseable `PRINT`, CSV/stdin queries, precision, formatting destinations, paths with spaces, terminal behavior, and interruption; smoke-test each doctor command and the upstream interactive shell.
- [ ] Resolve the audited engine dependency compatibility issue and verify licenses, notices, and applicable corresponding-source delivery in actual release artifacts and installations.
- [ ] Run CLI checks and clean installed-artifact smoke tests for both channels without preinstalled Beancount. Verify frontend isolation and offline engine reuse; rerun affected comparisons when upstream versions change.
- [ ] Separately add and verify optional Beangulp and Beanprice adapters for full ecosystem coverage.

Native parity covers the six commands in the native comparison table. The installation and process-boundary requirements also cover existing local bea features. Optional integrations have their own completion status.

## Individual command inventory

The main tables cover `check`, `format`, `query`, and `import`. The following tables list every doctor operation, query-shell handler, and remaining `bea` command individually. Existing implementation or inherited code is not an assertion that every behavior was tested.

### Doctor operations

All eleven operations are missing from `bea` today. One delegated `bea doctor` group should expose them. `dump-lexer` is an alias of `lex`.

| Upstream command | Proposed bea command | Purpose |
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

These commands run inside `bea query`. **Inherited** describes the baseline's in-process reuse of upstream handlers, with individual conformance still to verify. The proposed implementation launches the upstream interactive shell as a child process and verifies the same operations. The one-shot `PRINT` problem above is separate from the interactive handler.

| Upstream shell command | Inside bea's shell | Baseline implementation |
| --- | --- | --- |
| `.clear` | `.clear` | Inherited. |
| `.describe NAME` | `.describe NAME` | Inherited. |
| `.errors` | `.errors` | Inherited. |
| `.exit` | `.exit` | Inherited. |
| `.explain BQL` | `.explain BQL` | Inherited. |
| `.format FORMAT` | `.format FORMAT` | Inherited; text, CSV, and Beancount output. |
| `.help [COMMAND]` | `.help [COMMAND]` | Inherited. |
| `.history` | `.history` | Inherited. |
| `.output [FILE]` | `.output [FILE]` | Inherited. |
| `.parse BQL` | `.parse BQL` | Inherited. |
| `.quit` | `.quit` | Inherited. |
| `.reload` | `.reload` | bea override preserves exact ledger paths. |
| `.run [NAME]` | `.run [NAME]` | Inherited; stored queries. |
| `.set [NAME VALUE]` | `.set [NAME VALUE]` | Inherited; includes numberification settings. |
| `.tables` | `.tables` | Inherited. |
| `EOF` | `EOF` | Inherited. |

Sources: [shell adapter](../../cli/src/cli/query_render.py) and [upstream shell][upstream-query].

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
[regex-license]: https://github.com/mrabarnett/mrab-regex/blob/2026.7.19/LICENSE.txt
[apache-gpl]: https://www.apache.org/licenses/GPL-compatibility.html
