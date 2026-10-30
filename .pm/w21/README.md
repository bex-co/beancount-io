# w21 — Worker queue (worker1)

**Worker:** worker1 — general-purpose adoption worker; accepts the next highest-impact milestone across packages, topics, and A1/A2/A3 rather than owning a permanent specialty.

## Milestones

- [x] **m1** — [Entry edits and deletes refuse changes that would break the ledger](./done/m1/README.md) (7 tasks) ← from mobile QA 2026-10-20
- [x] **m2** — [Readable-width caps for the remaining bespoke screens](./done/m2/README.md) (7 tasks) ← promoted from w21/1007, follow-up to w21/1005
- [x] **m3** — [BQL cookbook: tested query recipes for humans and agents](./done/m3/README.md) (8 tasks) ← `/pm-brainstorm for w21` 2026-10-25, candidate 2
- [x] **m4** — [`bea report cash-flow`: where the money went, by period](./done/m4/README.md) (8 tasks) ← `/pm-brainstorm for w21` 2026-10-25, candidate 3

## Dropped

- ~~**895**~~ — Account detail's range chips filter only the chart, not the list below — dropped 2026-10-30: owner decision, the chart and the list are independent panels, so a range that slices only the chart is the intended design.
- ~~**052**~~ — Drawer header words split mid-word at the largest text size — dropped 2026-10-21: reproduces only at AX5; at AX2 (`accessibility-large`) the header renders whole words (`.pm/DO_NOT_DO.md`, AX2 ceiling).

## Inbox

- [064](./blocked/064.md) — A token refresh whose response is lost signs the user out on the next refresh (rotated token replayed → grant revoked) — **blocked:** needs an owner decision (ADR) on a refresh-token reuse grace window
- [065](./blocked/065.md) — One early-year entry (e.g. 0050) makes the balance sheet 23,718 monthly points (3 MB) and the app stalls — **blocked:** needs an approach decision (per-pill fetch vs server downsample) and a simulator profile of the stall
- [180](./blocked/180.md) — Budget actuals use raw prefix match (`Transport` counts `Transportation`), unlike Reports — **blocked:** needs an owner decision between component matching on the server (a Fava break) and a per-account breakdown for the client
- [201](./blocked/201.md) — Missing file: GraphQL returns null, REST/MCP NOT_FOUND; directory path differs too — **blocked:** needs an owner decision on the file-read contract (null vs NOT_FOUND), which the dashboard's README reads and shipped mobile builds rely on
- [206](./blocked/206.md) — Refund/return receipts are always prefilled as a purchase — **blocked:** needs an owner-approved AI-quota evaluation and a parse-contract decision (`isRefund` vs signed amount)
- [210](./blocked/210.md) — Holdings sheet labels a user-typed price "Live price" and applies the feed's staleness rule — **blocked:** needs an owner decision on exposing the feed's effective price dates (cross-package contract) and a deploy before mobile can read it
- [228](./blocked/228.md) — New Transaction stamps the first operating currency on every posting; no currency or price control — **blocked:** needs account-constraint currencies on the client, a price path (legacy field or typed mutation, deploy first) and an owner-approved form design
- [304](./blocked/304.md) — Budgets on Liabilities/Assets get favourability backwards (owner decision) — **blocked:** needs an owner decision between deriving direction from the account root and limiting the picker to Income and Expenses, which reverses w1/023's "every root" rule
- [453](./blocked/453.md) — addEntries/bulkEntries have no idempotency key: a retry after a lost response can duplicate the entry (split from 351) — **blocked:** needs an owner-approved contract (field, bounds, retention) across REST/GraphQL/MCP and a backend-v2 deploy
- [549](./blocked/549.md) — Create Ledger's "Amount owed" can't express a card in credit, and Review shows the opposite sign to the file — **blocked:** needs an owner decision on whether the setup API keeps "explicit negative = ledger sign" or changes its contract for REST, GraphQL and MCP
- [554](./blocked/554.md) — A holding that is also another lot's cost currency drops out of the holdings sheet, so BTC's stale price is never flagged — **blocked:** needs a per-commodity cost-less balance the valuation reads do not carry (cross-package read contract and deploy)
- [556](./blocked/556.md) — A holding priced only in an unrelated currency the account holds is labelled priced, though the ledger values it at cost — **blocked:** shares w21/554's blocker — a cost currency cannot be told from a cost-less holding of the same currency with the current reads
- [586](./blocked/586.md) — The Android build declares the advertising-ID permission (`AD_ID`) though nothing uses it — **blocked:** needs the store owner to confirm why it was added and to change Play's advertising-ID declaration (Play Console access)
- [587](./blocked/587.md) — Deleting a file that `main.bean` includes just says "Deleted": the ledger breaks or silently loses the file's entries — **blocked:** needs an owner decision on the delete contract for REST, GraphQL and MCP (refuse, preview, or warn after)
- [588](./blocked/588.md) — New File creates a file nothing includes, so its entries never count, and Files doesn't show which files are read — **blocked:** needs an owner product decision on including new files (app only or every surface) and on marking files the ledger does not read
- [600](./blocked/600.md) — Latest Updates never shows the commit you just made (not invalidated on write, and cached for 5 minutes server-side) — **blocked:** needs an owner decision on how the server drops its five-minute activity cache when the user commits (shared write hook vs shorter TTL)
- [602](./blocked/602.md) — Money flow doesn't pad a real currency held at cost ("+$100.5" under "+$100.50") (w21/506 over-reach) — **blocked:** a currency lot cannot be told from a fund ticker that is also an ISO code (BND) without declared-commodity data or an owner-approved heuristic
- [608](./blocked/608.md) — Android: fields near the bottom stay under the keyboard (iOS-only keyboard avoidance under edge-to-edge) — **blocked:** needs an Android device check of the keyboard behavior
- [315](./blocked/315.md) — In-app commits signed with Gitea username and real email (no full_name, no noreply) — **blocked:** needs the owner's noreply-address and published-history decisions, and a production backfill of existing Gitea users that can't be verified here
- [674](./blocked/674.md) — Since w21/641, Home's net worth leaves out next month's entries while the Accounts tab includes them — **blocked:** needs an owner decision on whether balance surfaces cap at today (Accounts tab + as-of read) or Home's headline includes future entries again
- [678](./blocked/678.md) — A sale whose lot doesn't match is still counted in every balance, so the books don't balance — **blocked:** needs an owner decision on whether an entry that failed booking is dropped from reports and the journal (as Beancount does) or kept listed with a flag and excluded from balances
- [871](./blocked/871.md) — Mobile never attaches the scanned receipt image to the saved transaction (dashboard does) — **blocked:** needs an owner decision on how a scanned receipt is saved with its document (two-posting insertReceiptTransaction only, extend it, or write the document in the addEntries commit)
- [857](./blocked/857.md) — The ledger runs amortize_over/forecast on the server's UTC date, not the user's — **blocked:** needs an owner-approved optional client date/time-zone input on every plugin-running read across REST, GraphQL and MCP, with the cache-key policy
- [879](./blocked/879.md) — The receipt parse contract carries no currency, so a foreign receipt is always booked in the ledger's currency (split from w21/870) — **blocked:** needs an owner-approved `ReceiptParseResult` currency contract (parity, model prompt, both receipt forms) and an AI-quota evaluation
- [951](./blocked/951.md) — Expense accounts are valued at market on Accounts and account detail, but at cost everywhere else — **blocked:** owner confirms flows-at-cost covers Income/Expenses balances; needs a native priced-lot check
- [977](./blocked/977.md) — LedgerPrices pulls every price date for every pair, and Apollo writes and reads them all on each mount — **blocked:** owner picks the API shape for bounding price dates across REST/GraphQL/MCP
- [994](./994.md) — Budget: mobile prorates the current period to today, the dashboard does not, so verdicts differ (product call)
