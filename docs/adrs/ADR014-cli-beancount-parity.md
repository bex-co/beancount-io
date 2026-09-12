# ADR 014: One beancount-io release with Beancount CLI parity

- Status: Accepted; corrected to one distribution at the user's direction.
- Decision owner: CLI (`cli/`)

## Decision

Publish only **`beancount-io`**, installing the `bea` command. Customers do not
install Beancount separately. No second project or PyPI publisher is required.

The wheel bundles the ledger helper and vendored Fava sources as internal
resources. `bea` starts a child interpreter with those resources on its module
search path. It automatically installs the pinned upstream Beancount/Beanquery
dependencies in a managed environment; Homebrew prepares that environment at
installation time. The frontend never loads these libraries in its own process.

A process boundary does not require a separate distribution. The earlier
separate-distribution implementation is superseded and its packaging and
publishing machinery are removed. Existing add/list/report/import/ask features
continue to use the bundled helper; optional AI dependencies stay frontend-only.

## Command parity

| Upstream | bea | Behavior |
| --- | --- | --- |
| `bean-check` | `bea check` | Native validation; explicit bea JSON extension. |
| `bean-format` | `bea format` | Native stdout default; `--in-place` explicitly rewrites. |
| `bean-query` | `bea query` | BQL argument/stdin/shell; `--source URI` for native sources; local-file JSON/strict/precision extensions. |
| `bean-doctor` | `bea doctor` | All eleven native operations, listed below. |
| `bean-example` | `bea example` | Native generator. |
| `treeify` | `bea treeify` | Native tree rendering. |
| Beangulp ingest script | `bea ingest` | Optional `bea engine enable beangulp`; identify/extract/archive. |
| `bean-price` | `bea price` | Optional `bea engine enable beanprice`; quote retrieval. |

## Packaging and verification

- One wheel and one sdist, both named `beancount_io-<version>`.
- Helper/Fava resources at `cli/_runtime`; no engine modules on the frontend's default import path.
- Upstream dependencies only in managed environments; three generated hash locks are tracked and shipped.
- Preserve the frontend MIT license, helper GPL text, and Fava MIT notice in the applicable artifacts.
- A split process is an architectural choice, not a legal certification. Retain each component's license and corresponding source materials.
- Product policy remains: do not separately audit upstream transitive dependency license combinations.
- Verify native operations, existing bea features, offline reuse, optional enablement, and frontend isolation through installed wheel/sdist and Homebrew tests on supported platforms.

## Individual command inventory

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
