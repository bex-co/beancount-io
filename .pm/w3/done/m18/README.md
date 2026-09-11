# w3 · m18 — Keep lot reductions from replacing current market prices

**Worker:** worker3 **Goal:** Holdings and BQL value the remaining assets using valid market quotes after a sale **Status:** abandoned (2026-09-10) — blocked on a corrected upstream engine artifact that does not exist

> **Abandoned, not fixed.** t002's prerequisite was checked against the npm
> registry on 2026-09-10: `@rustledger/wasm` 0.24.0 (2026-09-06) is the newest
> release and m18 already proved it fails, while the `1.0.0-rc.*` line is older
> (rc.18 published 2026-01-14) and npm-deprecated — not a corrected artifact.
> With no supported price-policy interface and this repo's ban on vendoring
> upstream bytes, no task here is actionable. The defect is real and unfixed;
> it is carried forward as inbox note [w3/113](../113.md), which points back to
> this directory for the full evidence. Re-promote when upstream ships a
> booking-aware implicit-price fix.

## Tasks (in order)

| id   | title                                                            | est | depends_on |
| ---- | ---------------------------------------------------------------- | --- | ---------- |
| t001 | Pin the lot-reduction valuation contract in live engine fixtures | 45m | —          |
| t002 | Identify a compatible corrected engine artifact                  | 45m | t001       |
| t003 | Integrate the verified price fix at the ledger engine boundary   | 55m | t002       |
| t004 | Adoption surface                                                 | 20m | t003       |
| t005 | Simplify                                                         | 20m | t004       |
| t006 | Test coverage                                                    | 50m | t004, t005 |
| t007 | Closeout                                                         | 15m | t006       |

Implementation and integration estimate: 145 minutes; total with closing tasks:
250 minutes. A compatible corrected engine artifact is a real prerequisite:
versions 0.21.0 and 0.24.0 both fail. Its availability is unverified; do not
claim that a routine version bump will fix this.

## Definition of done

- A cost-only reduction of an existing lot does not emit its historical cost as
  a new market quote. In the synthetic fixture, selling half the position leaves
  the latest quote at **98000 USD/BTC** and values the remaining **0.10 BTC** at
  **9800 USD**, instead of 4250 USD.
- Public crypto-example Holdings shows the January 15 Coinbase lot's current
  price as **98000**, market value **9800 USD**, and the corresponding gain,
  while retaining book value **4250 USD**. All BTC holdings total **0.327 BTC**
  and **32046 USD** at that quote. Source cost basis and quantities do not change.
- BQL GETPRICE, VALUE and conversion use the same corrected price semantics
  wherever they share the affected engine price database. JSON and text results
  preserve the correction through ledger service, GraphQL, REST and MCP.
- Actual price annotations, explicit Price directives, as-of dates, short
  positions and genuine new lots retain their intended semantics. A negative
  sign alone is not a reliable test for reducing a lot.
- The correction is adopted through the existing ledger package dependency or
  a supported engine interface. No upstream source/WASM bytes are vendored into
  this public repo, no browser package gains the engine dependency, and no stored
  ledger or query text is rewritten to hide the defect.
- Meaningful live-WASM and service checks pass, along with ledger lint,
  typecheck, build, tests and `yarn verify:rustledger`. Fresh desktop/narrow
  Holdings and eligible API adapter checks verify corrected values. Closing
  tasks finish through `/pm`; unavailable artifacts or skipped required checks
  keep the work open.

## Source + Goal linkage

- **Source:** repeated dashboard QA for w3 on 2026-09-08, public
  `open_ledger/crypto-example`; discovery only, no product implementation.
- **Goal linkage:** **A1 — Agent-native accounting** and **A3 — Community &
  distribution**. Agents and people can use BQL and public crypto examples
  without a routine sale silently repricing all remaining holdings at old cost.
- **Expected outcome:** a reader sees the same valid quote in price history,
  Holdings and a BQL valuation, and can export a correct remaining market value.
- **Why now:** a valid sample ledger already demonstrates a major valuation
  error shared by every BQL transport. The affected package has an existing
  live-engine verification entry point and contained dependency boundary.
- **Adoption surface:** included because Holdings, exported values and
  agent-facing BQL change visibly. No new endpoint or agent-specific workflow.

## Reproduction and controls

Severity: **major**. Owning package: **backend-cluster/ledger**, at its existing
rustledger query-engine boundary. Dashboard is the reproduced consumer.

Production `https://beancount.io`, Chrome 152, English, System/light,
authenticated QA reader; public ledger with no write permission. Desktop
1440×1000 and a fresh 390×844 repeat. Deployed SHA unverified; local
`a315c273` and fetched `origin/main cc3f4c2f` have unchanged implicated files.

1. Open `/ledger/open_ledger/crypto-example/holdings?lang=en`, default Holdings.
   The `Assets:Crypto:Coinbase:BTC` lot acquired **2024-01-15** has **0.10 BTC**,
   cost **42500**, price **42500**, book/market value **4250 USD**, gain **0**.
   Fresh narrow and desktop reloads agree. The downloaded default Holdings CSV
   also retains the incorrect market value; this is not display rounding.
2. Open the ledger's Commodities page and inspect BTC/USD's last point:
   **2025-02-01 / 98000.00**. Earlier working tooltips show Dec31 / 93500 and
   Nov1 / 75000. GetLedgerCommodities returns the same dated quotes with HTTP200.
3. The public downloaded source has **2025-02-01 price BTC 98000.00 USD**.
   `transactions/trading.bean` subsequently sells **0.10 BTC** on Feb10,
   referring to the original **42500 USD** cost and **2024-01-15** acquisition
   date. It credits 9800 USD cash and records 5550 USD gain. There is no Feb10
   Price directive or posting-price annotation; historical lot cost is not a
   new market quote. The only declared plugin is `auto_accounts`.
4. REST BQL with three date controls returns HTTP200:
   `SELECT getprice('BTC','USD',2025-02-09) as before_sale, getprice('BTC','USD',2025-02-10) as on_sale, getprice('BTC','USD') as current LIMIT 1`
   produces **98000, 42500, 42500**. Accepting `text/plain` returns the same
   wrong values; accepting JSON returns correct Decimal types around them.
5. A grouped REST query returns **0.327 BTC**, price **42500**, market value
   **13897.50000 USD**. At the existing 98000 quote its market value is
   **32046 USD**. The default Holdings GraphQL request and REST query agree
   with each other on the incorrect engine output.

Working controls: SOL's current **220 USD** quote and the 20 SOL lot's
**4400 USD** market value agree across Holdings and Commodities; ETH uses its
latest explicit 3200 quote. Explicit-date BTC reads on Feb1 and Feb9 return 98000. No console errors were captured on the repeated Holdings UI.

### Reduced local fixture

`probe-reduction-prices.mjs` creates a valid synthetic ledger: open a 0.20 BTC
lot at 42500, add a later 98000 Price, then sell half at historical cost with a
separate realized gain. Both actual WASM 0.21.0 and 0.24.0 report zero validation
errors and return:

| Case                                  | Latest BTC price |    Remaining market value |
| ------------------------------------- | ---------------: | ------------------------: |
| Before sale                           |            98000 |    19600 USD for 0.20 BTC |
| Cost-only reduction                   |        **42500** | **4250 USD for 0.10 BTC** |
| Same sale with explicit `@ 98000 USD` |            98000 |     9800 USD for 0.10 BTC |

The last row is a local working control, not a proposed stored-ledger edit.
Python Beancount **3.2.3** retains the 98000 quote for all three fixtures, both
with its ordinary explicit price map and when its real `implicit_prices`
plugin is applied. Its plugin tracks inventory booking and excludes cost-only
`MatchResult.REDUCED` postings from inferred quotes.

Loading the complete downloaded public file map into both WASM versions also
reproduces 42500 and 13897.5. An earlier simple two-price fixture without a later
sale works regardless of source ordering; do not misdiagnose chronological
sorting or the included-file order.

## Producer, serializer and caller trace

Ledger `src/features/ledger/service/ledger-shell-service.ts:85–105` passes both
structured and text queries to `queryLedgerFilesResult`. At
`src/foundation/rustledger/engine.ts:638–701`, the sanitized file map reaches
the cached live `Ledger.fromFiles(...).query(query)` in the worker path. This
ledger uses a WASM-native plugin, so the TS-plugin materialization branch is
not responsible. The live WASM already returns the incorrect price and amount.

The pinned upstream source is commit
[`23b9068958afb35dbec542a6acc7953a804b18cc`](https://github.com/rustledger/rustledger/tree/23b9068958afb35dbec542a6acc7953a804b18cc)
(tag v0.21.0):

- [Query price database](https://github.com/rustledger/rustledger/blob/23b9068958afb35dbec542a6acc7953a804b18cc/crates/rustledger-query/src/price.rs):
  `from_directives` at95–119 adds explicit quotes, then automatically derives
  implicit prices from every transaction. At192–236 it passes posting costs
  into the shared extraction helper and inserts the returned quote at the
  transaction date. It has no lot-reduction/booking gate. An explicit quote
  suppresses inference only for the same base/quote/date, so Feb1 cannot prevent
  a fabricated Feb10 quote.
- [Shared extraction helper](https://github.com/rustledger/rustledger/blob/23b9068958afb35dbec542a6acc7953a804b18cc/crates/rustledger-core/src/implicit_prices.rs):
  `extract_per_unit_price` at73–127 returns a cost fallback without knowing
  whether that posting reduces an existing position. The posting's sign is
  treated as irrelevant to per-unit extraction.
- The source-aware executor constructor repeats the same price-building
  protocol. GETPRICE delegates to that database, and VALUE/CONVERT reach its
  valuation/conversion paths. Correct this shared producer rather than a
  single dashboard query.

`ledger-shell-mappers.ts:164–200` preserves the incorrect raw values as typed
decimal strings/maps. Backend-v2 LedgerShellService copies them into QueryShell;
the actual GraphQL resolver and REST query-handler use that service. MCP
runBqlQuery uses it in source; live MCP was not exercised. Text output shares
the same engine query and is independently reproduced.

Dashboard's four `holdings-statement.ts` queries use GETPRICE/VALUE; DatasetTable
and export simply consume these results. General BQL results, history reopening
and any query using the same affected valuation functions are also exposed.
Do not claim the TS report builders are broken: their separate
`price-map.ts` and Commodities directive walker use explicit Price directives,
and those were source-traced as different implementations.

## Repair boundary and prerequisites

Adopt an actual engine fix that distinguishes historical lot reductions from
new quote information. Preserve explicit `@`/`@@` sale quotes, explicit Price
precedence, date lookup, genuine new positions and short-position reductions.
Do not substitute a blanket `units < 0` filter. Verify the existing query
constructor variants and any shared native implicit-price plugin remain
consistent with the intended contract.

The current WASM query interface does not expose a price-policy option.
A corrected supported release/interface is therefore a prerequisite to
integration; t002 must identify and verify it. If none is available, record the
specific dependency blocker and leave t003 open. This QA run did not publish an
upstream issue, patch or release. Scope the public-monorepo work to original
fixtures, integration and a normal pinned dependency update. Follow ledger
CLAUDE.md's prohibition on vendoring upstream source/WASM bytes; regenerate the
lockfile with its owning package manager. No new dependency is authorized here.

Do not rewrite user ledgers, add fabricated Price directives, inject dates into
arbitrary queries, post-process totals using a parallel query engine, or hide
the loss behind client formatting. Those approaches leave another public BQL
surface incorrect or change the user's accounting meaning. Keep API envelopes,
precision, authorization, plugin/source handling and cache behavior intact.

## Dedupe, history and limits

Searched all open/completed `.pm` for latest/implicit prices, valuation, Holdings,
BQL and lot reductions. Read completed w1/m10's full DoD: transport/operation
parity is not evidence of correct underlying engine valuation. Existing
w3/007 concerns COST aggregation of mixed units; w3/035 is client precision
loss; w3/012 and w3/034 are chart formatting/decoding. No duplicate covers this
producer error.

The engine dependency traces to ledger import `9f7a58bf` and path move
`ca9a50d2`; later worker/padding changes do not repair price inference. Fetched
main has no changed engine dependency or adapter for this issue. A previously
working deployed state is unverified; do not call this a proven regression.

Ignored evidence:

- Under `dashboard/tmp/qa-20260907-w3-loop/`:
  `holdings-reduction-price-evidence.json`, `holdings-stale-btc-price-1440.png`,
  `holdings-stale-btc-price-390.png`, `btc-latest-price-1440.png`,
  `holdings-small-units.csv`, `crypto-example-price-control.zip` and
  `crypto-example-file-map.json`.
- Under `backend-cluster/ledger/tmp/qa-20260907-holdings/`:
  `probe-reduction-prices.mjs`, `reduction-price-0.21.0.json`,
  `reduction-price-0.24.0.json` and `probe-crypto-prices.mjs`.
- Python control: `cli/tmp/qa-reduction-price-python-control.json`.

Unverified: corrected engine availability/behavior, live MCP, other browsers
and locales, private ledgers, short-position and transfer edge cases. These
belong in acceptance coverage, not additional reproduced claims. Initial
download locators assumed ZIP was visible; the actual Git Clone popover
download works. One web-source lookup timed out; pinned primary source was
then read directly. No production data changed.
