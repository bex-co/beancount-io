# w2 · m31 — Include Live Price: managed price includes in the ledger service

**Worker:** worker2 **Goal:** a ledger that contains `include "https://beancount.io/prices/BTC-USD"` loads in the hosted ledger service with validated, read-only managed `price` directives, refreshes them on a bounded schedule without touching Git, keeps the last good prices through provider failures, lets ledger-authored prices win, and reports per-source freshness to callers **Status:** done

## Tasks (in order)

| id   | title                                                                        | est | depends_on |
| ---- | ---------------------------------------------------------------------------- | --- | ---------- |
| t001 | ADR 015 and the live engine include-key probe                                | 30m | — — **DONE** |
| t002 | Managed price URL policy and configuration                                   | 45m | t001 — **DONE** |
| t003 | Bounded feed fetch and price-only validation                                 | 60m | t002 — **DONE** |
| t004 | Feed cache: immutable revision, mutable head, refresh, backoff, coalescing   | 60m | t003 — **DONE** |
| t005 | Overlay virtual files after the SHA cache with precedence and status          | 60m | t004 — **DONE** |
| t006 | Read-only and accounting boundaries for virtual price files                  | 45m | t005 — **DONE** |
| t007 | Verify on the dev-sandbox stack with a BTC ledger                            | 45m | t006 — **DONE** |
| t008 | Adoption surface: env docs, README, deploy examples, package guidance        | 30m | t007 — **DONE** |
| t009 | Simplify: run /simplify over the changed code                                | 30m | t008 — **DONE** |
| t010 | Test coverage: meaningful tests for shipped behavior                         | 45m | t008 — **DONE** |
| t011 | Closeout                                                                     | 15m | t009, t010 — **DONE** |

## Definition of done

- A ledger whose entry point includes the BTC-USD feed URL parses with `valid: true`, its balance sheet values a BTC holding in USD at the feed's latest price, and `GET /reports/{owner}/{repo}/errors` returns no include error.
- `LoadedLedger.managedPrices` reports url, alias, commodity, quote, source, revision, ETag, observed-at, fetched-at, and a `recent` / `stale` / `unavailable` freshness computed at read time.
- A second load inside the refresh window performs no feed fetch; a load after the window performs one conditional GET, and parallel loads share it.
- A timeout, 429, 404, empty body, non-price directive, wrong commodity pair, or invalid decimal leaves the previous validated revision serving with the error recorded in the status; with no prior revision the include error names the real cause and the rest of the ledger still loads.
- A same-date ledger-authored BTC/USD (or USD/BTC) price wins regardless of include order; including the same URL from two files does not duplicate entries.
- Managed price entries are excluded from the directive-limit count and from `sourceFiles`; editing or deleting one through the source-slice API fails with `OPERATION_NOT_ALLOWED` naming the managed source; no Git commit is created by any refresh.
- A URL outside `MANAGED_PRICE_ORIGINS`, with a path other than `/prices/<ALIAS>`, or carrying a query string is rejected with a distinct error, and an empty `MANAGED_PRICE_ORIGINS` disables the feature.
- All of the above hold in `yarn test`, and the dev-sandbox dashboard shows the valued BTC holding on a ledger that was never edited by the service.

## Source + Goal linkage

- **Source:** `docs/prfaqs/PRFAQ002-include-live-price.md` (FAQ 12, 15, 16, 18) and `docs/adrs/ADR015-ledger-managed-price-includes.md`; user request 2026-09-15 to design, board, and implement the ledger-layer scope and verify it on the dev-sandbox stack.
- **Goal linkage:** A2 — a newcomer who holds crypto goes from an empty ledger to a market-valued balance sheet with one include line and no price-fetching script; secondary A1 — a coding agent maintaining a ledger can add the same line through MCP or the CLI and get correct valuations without running `bean-price`.
- **Expected outcome:** hosted ledgers can adopt the published BTC-USD and ETHUSD feeds today; unchanged books keep their prices fresh within five minutes; provider outages degrade visibly instead of breaking the books; the status contract exists for backend-v2, the dashboard, and the CLI to build the freshness labels and parity surfaces on.
- **Why now:** the live feed shipped this week with the exact contract the PRFAQ asked for, and the hosted loader is the one place where URL includes currently fail. Landing resolution, caching, and precedence in the ledger service unblocks every client surface at once. Adoption surface task included: the feature adds environment variables and a user-visible include behavior that the package README and deploy examples must describe.
