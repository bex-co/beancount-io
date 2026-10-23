# w6 · m2 — Preserve BQL expression types across projection aliases

**Worker:** worker1 **Goal:** Agents can trust query column types without interpreting identifiers as money or dates. **Status:** blocked (t001 found no engine type provenance)

**Severity:** minor. **Owner:** ledger, with backend-v2 adapter validation. **Estimate:** 3–4 hours across seven tasks; the current engine result has no cursor schema, so a general repair needs a type-provenance design rather than another alias allowlist.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Establish type provenance at the engine boundary — **BLOCKED** | 45m | — |
| t002 | Preserve expression types in shell projections | 60m | t001 |
| t003 | Verify all eligible API adapters preserve corrected types | 25m | t002 |
| t004 | Adoption surface | 20m | t003 |
| t005 | Simplify | 15m | t004 |
| t006 | Test coverage | 35m | t004, t005 |
| t007 | Closeout | 10m | t006 |

## Blocked

**Blocked 2026-10-15** — t001's triage found no type provenance at the engine boundary, and every later task depends on t001. Nothing was shipped; the baseline is unchanged `main`.

- **The engine erases expression types before the boundary.** Locally installed `@rustledger/wasm` 0.24.0 (the lockfile pin and the npm `latest` tag; the `1.0.0-rc.*` builds are older January 2026 artifacts) declares `QueryResult` as `{columns, rows, errors}` with an untagged `CellValue`. Upstream `main`'s `crates/rustledger-wasm/src/types.rs` is the same. A direct engine probe returns `SELECT '00123'` → `"00123"`, `SELECT 1.25` → `"1.25"`, `SELECT '2025-01-01'` → `"2025-01-01"`, and `SELECT 2026-01-01` → `"2026-01-01"`. String, Decimal and Date cells are identical JSON strings, and a zero-row result carries no cell at all. The only remaining signal is the output name, which is the accident this milestone removes.
- **No narrow existing facility substitutes.** The engine has no BQL type-of function (`TYPEOF`, `TYPE_OF`, `TYPENAME`, `TYPE` all fail with "no function matches"). `bqlCompletions` describes syntax, not result types. A per-column type would therefore need a second BQL parser, a name allowlist, or value guesses, all of which the repair boundary forbids.

**Unblock:** a published `@rustledger/wasm` release whose query result carries per-column types, or tagged cells that distinguish String from Number/Date, including for zero-row results. Upstream already derives column datatypes from its tagged `Value` for the FFI (rustledger#1703), so the request is to expose the same metadata through the WASM `QueryResult`. Raising that request upstream is an outward-facing action left to the user. Once a release carries it, unblock, update the existing ledger dependency through its package manager, and resume at t001 to verify the producer contract before t002. New dependencies still require user approval; updating this existing dependency does not add one. **Who can clear it:** the user (to file or explicitly authorize the upstream request) and the rustledger maintainers (to implement and release it).

**Rechecked 2026-10-18:** npm `latest` and GitHub latest release remain 0.24.0. At upstream main [`13ddd438`](https://github.com/rustledger/rustledger/blob/13ddd438fcc4d185aef72951fa3a97b5e4ccf28a/crates/rustledger-wasm/src/types.rs), `QueryResult` still contains only `columns`, `rows`, and `errors`, and `CellValue` remains untagged. Searches for column-type and WASM query metadata work identified no matching fix. Keep blocked; an upstream engine release containing unrelated BQL fixes cannot supply this missing contract. The concrete request is per-column expression schema independent of aliases, available for empty results and null-first rows, preserving string/decimal/date distinctions and decimal precision. No upstream issue or message was posted.

## Live finding

**Independent adoption work, 2026-10-21:** t004 now documents the current
inferred dtype boundary in `backend-cluster/ledger/README.md` and the public
MCP guide, including aliases, empty/all-null columns and preserving identifier
text. The pinned package
remains 0.24.0; upstream main at `51cf2326e7d6d61cb4e38dd00b9a0007b9bc851d`
still has no expression schema in its WASM query result. This documentation
substep does not satisfy the missing producer contract or close any task.

Production `https://beancount.io`, 2026-10-14; local main `f2b01a4f`. MCP `beancount-mcp` 1.0.0, protocol `2025-11-25`; deployed SHA unavailable. Existing designated unpinned QA API key, scopes `ledger.read ledger.write ledger.admin`. Only public synthetic `open_ledger/example` was read.

Call `runBqlQueryStructured` with the ledger above and each query:

| Query | Actual dtype | Actual cell |
| --- | --- | --- |
| `SELECT '00123' AS reference LIMIT 1` | `Decimal` | `"00123"` |
| `SELECT '00123' AS account LIMIT 1` | `str` | `"00123"` |
| `SELECT '2025-01-01' AS reference LIMIT 1` | `date` | `"2025-01-01"` |
| `SELECT 'hello' AS reference LIMIT 1` | `str` | `"hello"` |

Every call succeeds. The first query repeated fresh produces the same result. REST `POST /api-gateway/v1/ledgers/open_ledger/example/query` with `{query: <same query>}` has the identical table for all four controls. GraphQL `queryShell(ledgerId: "open_ledger/example", query: "SELECT '00123' AS reference LIMIT 1")` also declares `Decimal` and returns the same string without errors.

Additional empty-result controls reproduce the same root cause without any cell values to inspect. MCP and REST both return zero rows for all four queries:

| Query | Actual dtype |
| --- | --- |
| `SELECT COUNT(*) AS count WHERE date = 2030-01-01 GROUP BY payee` | `int` |
| `SELECT COUNT(*) AS reference WHERE date = 2030-01-01 GROUP BY payee` | `str` |
| `SELECT date WHERE date = 2030-01-01` | `date` |
| `SELECT date AS reference WHERE date = 2030-01-01` | `str` |

The selected expressions remain COUNT and date; only their labels change. This directly exercises the mapper's column-name fallback. Evidence: `oct14-empty-type-{count-canonical,count-alias,date-canonical,date-alias}.json` and all four REST counterparts in the same ignored evidence directory. Empty-result GraphQL controls were not repeated separately.

The inverse misclassification also occurs: MCP `SELECT 1.25 AS account LIMIT 1` returns dtype `str`, while `SELECT 1.25 AS amount LIMIT 1` returns `Decimal`; both rows contain `"1.25"`. These additional MCP controls are `oct14-bql-alias-decimal-{account,amount}.json`; REST/GraphQL were not repeated for this pair. Protecting every aliased value as text would therefore leave real decimal expressions mistyped.

These expressions are string literals: the live control `SELECT length('00123') AS chars, '00123' = 123 AS numeric_equal, '00123' = '00123' AS text_equal LIMIT 1` returns `[5, false, true]` with types int/bool/bool. An output label changes metadata for the same value and expression. The row text and leading zeros are preserved; actual numeric coercion by an agent or UI was not measured and is not claimed.

Helper pattern: `node .agents/skills/qa-shared/scripts/qa-mcp.mjs --credentials-file .env call runBqlQueryStructured '{"ledger":"open_ledger/example","query":"SELECT ..."}'`.

## Root cause and repair boundary

`backend-cluster/ledger/src/features/ledger/service/ledger-shell-mappers.ts`, `classifyColumnDtype`, classifies date-looking strings as dates and numeric-looking strings as Decimal, except numeric strings whose output name belongs to `STRING_COLUMNS`. A renamed column loses that exception. `LedgerShellService.queryShell` supplies only the resulting column names and cells to this mapper. The installed engine's `QueryResult` declaration contains columns, rows and errors, without cursor types; therefore this is an adapter inference problem, not evidence that the engine evaluates string literals as numbers.

Repair type provenance at the shared ledger query boundary. Do not fix only the word `reference`, expand the canonical-name allowlist indefinitely, treat all decimal strings as ordinary text, rewrite values, or introduce a second BQL parser. Evaluate supported engine metadata or a narrow existing expression-provenance facility first. Keep any engine work upstream and public, respect GPL containment, and do not vendor engine bytes. Adding dependencies still requires the repository's ordinary user approval. If a correct producer contract requires an unavailable upstream change, record that exact dependency and unblock condition with `/pm block` rather than inventing a cursor schema from result values.

Preserve existing decimal precision, Inventory/Amount/Position formatting, null-to-blank compatibility, text values and canonical row counts. REST, GraphQL and MCP must consume the same corrected producer metadata; do not add per-protocol type guesses or parity exemptions. This milestone does not promise to recover every empty-result expression type by heuristics; t001 must explicitly resolve the no-row and alias cases using the chosen producer contract.

## Definition of done

The three string-literal probes declare `str` independently of aliases. Ordinary string, Decimal, date, boolean and integer expressions retain their actual types, including aliases and null-first rows. Empty-result type behavior follows an explicit producer contract instead of an output-name accident. Existing values, leading zeros, precision, inventory shapes, null rendering and row counts stay intact. Real adapter checks demonstrate the same metadata through REST, GraphQL and MCP. Documentation describes supported type metadata and any genuine engine limitations; native owning-package checks and the zero-debt parity gate pass.

## Source + Goal linkage

- **Source:** live functional MCP QA; sanitized artifacts in ignored `.tmp/qa-2026-10-11/mcp-loop/`: `oct14-bql-alias-{leading-zero-label,leading-zero-account,date-label,string-label,leading-zero-repeat,string-semantics}.json`, their available REST controls, and `graphql-oct14-alias-type.json`.
- **Goal linkage:** A1 — Agent-native accounting. Type metadata should distinguish a zero-prefixed reference from a decimal amount without relying on its display name.
- **Expected outcome:** tool and API consumers can interpret typed query output consistently when projections are renamed.
- **Why now:** this is reproduced in current production on all three eligible protocols, independently of the already-fixed MCP row-count issue.

## Dedupe and limits

Searched all board states for dtype inference, numeric strings, aliased types, leading-zero query values and `ledger-shell-mappers`. Completed w3/m37 repairs dashboard rendering of correctly typed Inventory/Amount cells; w6/done/m1 repairs canonical row counts. Neither repairs expression typing. The mapper history still contains this inference in current main; no overlapping repair was found. Null-to-empty-string serialization is explicitly preserved compatibility and is not this finding.

Unverified: complete type behavior for arbitrary expressions beyond these probes, downstream identifier coercion beyond the dashboard case documented below, the available upstream metadata solution, and a deployed fix. No ledger/account data changed; no product fix implemented.

## Dashboard confirmation, 2026-10-22

The same existing type-provenance gap has a verified dashboard manifestation. On production `https://beancount.io`, isolated owned anonymous Chromium155.0.8059.85, English/light/UTC, fresh390px and1440px contexts ran these actual read-only queries on `open_ledger/example`:

| Query | Actual GraphQL second-column dtype | Dashboard outcome |
| --- | --- | --- |
| `SELECT date, '00123' AS reference LIMIT 3` | `Decimal` | Native390 result adds an automatic chart with values123,123,123. |
| `SELECT date, '00123' AS narration LIMIT 3` | `str` | Fresh1440 result has the same three text values and no chart. |

Both independent GraphQL reads return HTTP200 without errors and three identical `2015-01-01 / "00123"` rows. Both native tables retain every leading zero. The two real CSV downloads also preserve all six `00123` cells exactly. The new confirmed coercion is the automatic plot's numeric interpretation, not table/CSV data loss. The reference card screenshot was visually inspected and shows the numeric chart above its literal-text table.

Current dashboard `features/bql/lib/chart-utils.ts` deliberately gates automatic plotting on the declared numeric dtype, then converts Decimal cells into plotting numbers; the narration control proves that the correct text type suppresses the chart. This is a downstream consequence of the producer problem already owned by this milestone, rather than another dashboard implementation task. Correct producer metadata should repair this path without an alias allowlist or a client chart workaround.

The inspected **installed** `@rustledger/wasm`0.24.0 declaration still exposes QueryResult columns/rows/errors without expression types. No latest-release lookup, dependency upgrade or reassessment of the upstream unblock condition was performed in this dashboard supplement. The existing blocked state and type-provenance repair boundary remain unchanged; no additional finding group is counted.

Ignored evidence in `dashboard/tmp/qa-20261020/dashboard-loop/`: `bql-numeric-text-dashboard-complete-controls.json` contains both native cases, actual independent API types/rows, CSV checks and readonly chart options; `bql-numeric-text-reference-390.png` is the inspected element screenshot. Both contexts closed; original owned context only remains. Zero hosted writes, mutation attempts, route errors or page exceptions. An initial generic chart reader also matched Monaco canvases; final readback scopes `canvas[data-zr-dom-id]`, without a product-state override or chart dispatchAction. Other downstream identifier coercion and repaired behavior remain unverified. This extends the existing record and creates no duplicate W4 issue.
