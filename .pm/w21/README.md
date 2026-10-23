# w21 — Worker queue (worker1)

**Worker:** worker1 — general-purpose adoption worker; accepts the next highest-impact milestone across packages, topics, and A1/A2/A3 rather than owning a permanent specialty.

## Milestones

- [x] **m1** — [Entry edits and deletes refuse changes that would break the ledger](./done/m1/README.md) (7 tasks) ← from mobile QA 2026-10-20

## Dropped

- ~~**052**~~ — Drawer header words split mid-word at the largest text size — dropped 2026-10-21: reproduces only at AX5; at AX2 (`accessibility-large`) the header renders whole words (`.pm/DO_NOT_DO.md`, AX2 ceiling).

## Inbox

- [874](./874.md) — The dashboard's entry page offers Save and Delete on a plugin copy, and Delete removes the whole series (dashboard half of w21/840)
- [064](./blocked/064.md) — A token refresh whose response is lost signs the user out on the next refresh (rotated token replayed → grant revoked) — **blocked:** needs an owner decision (ADR) on a refresh-token reuse grace window
- [065](./blocked/065.md) — One early-year entry (e.g. 0050) makes the balance sheet 23,718 monthly points (3 MB) and the app stalls — **blocked:** needs an approach decision (per-pill fetch vs server downsample) and a simulator profile of the stall
- [180](./blocked/180.md) — Budget actuals use raw prefix match (`Transport` counts `Transportation`), unlike Reports — **blocked:** needs an owner decision between component matching on the server (a Fava break) and a per-account breakdown for the client
- [201](./blocked/201.md) — Missing file: GraphQL returns null, REST/MCP NOT_FOUND; directory path differs too — **blocked:** needs an owner decision on the file-read contract (null vs NOT_FOUND), which the dashboard's README reads and shipped mobile builds rely on
- [206](./blocked/206.md) — Refund/return receipts are always prefilled as a purchase — **blocked:** needs an owner-approved AI-quota evaluation and a parse-contract decision (`isRefund` vs signed amount)
- [210](./blocked/210.md) — Holdings sheet labels a user-typed price "Live price" and applies the feed's staleness rule — **blocked:** needs an owner decision on exposing the feed's effective price dates (cross-package contract) and a deploy before mobile can read it
- [228](./blocked/228.md) — New Transaction stamps the first operating currency on every posting; no currency or price control — **blocked:** needs account-constraint currencies on the client, a price path (legacy field or typed mutation, deploy first) and an owner-approved form design
- [304](./blocked/304.md) — Budgets on Liabilities/Assets get favourability backwards (owner decision) — **blocked:** needs an owner decision between deriving direction from the account root and limiting the picker to Income and Expenses, which reverses w1/023's "every root" rule
- [453](./blocked/453.md) — addEntries/bulkEntries have no idempotency key: a retry after a lost response can duplicate the entry (split from 351) — **blocked:** needs an owner-approved contract (field, bounds, retention) across REST/GraphQL/MCP and a backend-v2 deploy
- [518](./blocked/518.md) — New Transaction books a plain first-row amount as money *into* the bank (Checking +4.50, Groceries −4.50) — **blocked:** needs an owner product decision on the default row signs (negative source row vs From/To labels)
- [526](./blocked/526.md) — Transactions, Account and Merchant detail drop back to the newest 20 rows after a return to the app or any write; a stale "Couldn't load more" footer stays — **blocked:** needs an owner decision on how to keep loaded pages through a refresh (field policy vs refetch to depth vs accept page 1)
- [542](./blocked/542.md) — The balance chart's dashed start line and VoiceOver's "From" use the first point, while the change row uses the opening balance — **blocked:** needs an owner design decision on where the balance chart measures its change from (opening balance with a widened y-domain vs first plotted point)
- [549](./blocked/549.md) — Create Ledger's "Amount owed" can't express a card in credit, and Review shows the opposite sign to the file — **blocked:** needs an owner decision on whether the setup API keeps "explicit negative = ledger sign" or changes its contract for REST, GraphQL and MCP
- [554](./blocked/554.md) — A holding that is also another lot's cost currency drops out of the holdings sheet, so BTC's stale price is never flagged — **blocked:** needs a per-commodity cost-less balance the valuation reads do not carry (cross-package read contract and deploy)
- [556](./blocked/556.md) — A holding priced only in an unrelated currency the account holds is labelled priced, though the ledger values it at cost — **blocked:** shares w21/554's blocker — a cost currency cannot be told from a cost-less holding of the same currency with the current reads
- [586](./blocked/586.md) — The Android build declares the advertising-ID permission (`AD_ID`) though nothing uses it — **blocked:** needs the store owner to confirm why it was added and to change Play's advertising-ID declaration (Play Console access)
- [587](./blocked/587.md) — Deleting a file that `main.bean` includes just says "Deleted": the ledger breaks or silently loses the file's entries — **blocked:** needs an owner decision on the delete contract for REST, GraphQL and MCP (refuse, preview, or warn after)
- [588](./blocked/588.md) — New File creates a file nothing includes, so its entries never count, and Files doesn't show which files are read — **blocked:** needs an owner product decision on including new files (app only or every surface) and on marking files the ledger does not read
- [600](./blocked/600.md) — Latest Updates never shows the commit you just made (not invalidated on write, and cached for 5 minutes server-side) — **blocked:** needs an owner decision on how the server drops its five-minute activity cache when the user commits (shared write hook vs shorter TTL)
- [602](./blocked/602.md) — Money flow doesn't pad a real currency held at cost ("+$100.5" under "+$100.50") (w21/506 over-reach) — **blocked:** a currency lot cannot be told from a fund ticker that is also an ISO code (BND) without declared-commodity data or an owner-approved heuristic
- [608](./blocked/608.md) — Android: fields near the bottom stay under the keyboard (iOS-only keyboard avoidance under edge-to-edge) — **blocked:** needs an Android device check of the keyboard behavior
- [646](./blocked/646.md) — The same "1M"/"3M" pills mean a rolling window on Transactions but calendar months on Reports (Food $60 vs $100) — **blocked:** needs an owner product decision on what a 1M/3M/1Y pill means (calendar months everywhere vs relabelled rolling windows on Transactions and Budget)
- [315](./blocked/315.md) — In-app commits signed with Gitea username and real email (no full_name, no noreply) — **blocked:** needs the owner's noreply-address and published-history decisions, and a production backfill of existing Gitea users that can't be verified here
- [674](./blocked/674.md) — Since w21/641, Home's net worth leaves out next month's entries while the Accounts tab includes them — **blocked:** needs an owner decision on whether balance surfaces cap at today (Accounts tab + as-of read) or Home's headline includes future entries again
- [678](./blocked/678.md) — A sale whose lot doesn't match is still counted in every balance, so the books don't balance — **blocked:** needs an owner decision on whether an entry that failed booking is dropped from reports and the journal (as Beancount does) or kept listed with a flag and excluded from balances
- [693](./blocked/693.md) — Edit Transaction's Reload after a conflict opens the other twin's text, so the next Save overwrites it — **blocked:** its acceptance contradicts itself (a twin moved onto the ID and a metadata-only change look the same after a conflict); needs an owner decision between always refusing Reload on a changed slice and keeping it
- [694](./blocked/694.md) — Since w21/672, Delete after a metadata-only change elsewhere dead-ends on "changed or removed" (w21/250 regression) — **blocked:** its two acceptance cases cannot both hold (a metadata-only change and a twin swap look the same); same owner decision as w21/693
- [844](./844.md) — A non-included .bean file in the repo brings back w21/134's "+100 → 500"
- [845](./845.md) — Entry Context's balance before for a parent-account assertion leaves out its subaccounts
- [846](./846.md) — sellgains never flags a price that disagrees with proceeds (bean-check does)
- [847](./847.md) — noduplicates only catches duplicate transactions, not balance/note/event
- [848](./848.md) — Decorative icon glyphs are still VoiceOver stops on several screens; stale-data banner and loading labels never read
- [849](./849.md) — New Transaction's Done is drawn dimmed on an invalid draft but VoiceOver doesn't say "dimmed"
- [850](./850.md) — The valuation caption's hint promises price dates for holdings with no price
- [851](./851.md) — A Latest Updates row with no action is announced as "dimmed"
- [852](./852.md) — Since w21/823, Reload can adopt a different transaction after the edited one is deleted elsewhere
- [853](./853.md) — Since w21/799, a 1st/16th or 15th/30th bill reads "Every 2 weeks" with the wrong next date
- [854](./854.md) — Since w21/804, a "1 BTC" budget reads "Above target" while under its prorated budget
- [855](./855.md) — Pasting " 20" into a negative row turns it unreadable (left open by w21/791)
- [856](./856.md) — Ask AI is never told today's date, and an undated receipt is saved under the server's UTC date
- [857](./857.md) — The ledger runs amortize_over/forecast on the server's UTC date, not the user's
- [858](./858.md) — A save that times out on the server's internal hop says "Failed to save" though it may have committed
- [859](./859.md) — A ledger with no main.bean is reported "deleted, renamed or unshared" and every tab is blocked
- [860](./860.md) — Notifications says "Ledger is healthy" after a failed refresh; Merchants keeps cached rows; no stale banner
- [861](./861.md) — New Transaction and its account picker treat a failed metadata read as an empty ledger
- [862](./862.md) — Budget's first-load failure has no Retry and hides the range pills
- [863](./863.md) — Entry Context's balance rows drop the account name when it holds a lot (default text size)
- [864](./864.md) — Entry Context's location label draws a Persian/Arabic file path wrongly (gap in w21/824)
- [865](./865.md) — Entry Context's Source Code draws Persian/Arabic lines in the wrong order (gap in w21/780)
- [866](./866.md) — Entry Context's Source Code splits a line at a lone carriage return (gap in w21/827)
- [867](./867.md) — Guests can't load Entry Context: GetLedgerTransactionContext isn't in the guest allowlist (w21/635 class)
- [868](./868.md) — A signed-in reader is told to "Set a spending target" on Home and Budget, which they can't do
- [869](./869.md) — Scan Receipt offers a Try Again that can never work for permanent server refusals
- [870](./870.md) — Scan Receipt's reveal shows a rounded total while the form saves the exact value
- [871](./871.md) — Mobile never attaches the scanned receipt image to the saved transaction (dashboard does)
- [872](./872.md) — A guard inside Scan Receipt's full-screen modal has no way back
- [873](./873.md) — Scan Receipt's shutter swallows capture failures
