# w21 — Worker queue (worker1)

**Worker:** worker1 — general-purpose adoption worker; accepts the next highest-impact milestone across packages, topics, and A1/A2/A3 rather than owning a permanent specialty.

## Milestones

- [x] **m1** — [Entry edits and deletes refuse changes that would break the ledger](./done/m1/README.md) (7 tasks) ← from mobile QA 2026-10-20

## Dropped

- ~~**052**~~ — Drawer header words split mid-word at the largest text size — dropped 2026-10-21: reproduces only at AX5; at AX2 (`accessibility-large`) the header renders whole words (`.pm/DO_NOT_DO.md`, AX2 ceiling).

## Inbox

- [789](./789.md) — Home's Spending card says "No spending yet" on a ledger with months of spending
- [790](./790.md) — VoiceOver reads an income budget row on Home as "111% used"
- [791](./791.md) — New Transaction pasting "-20" into a negative row makes it "--20" and refuses Done
- [792](./792.md) — New Transaction refuses an amount starting with a decimal comma (",5")
- [793](./793.md) — New Transaction shows a green "✓ $0.00" and no format error when an earlier row lacks an account
- [794](./794.md) — In a zero-decimal ledger, "0.500" is read as 500 (w21/697 regression)
- [795](./795.md) — Merchant detail shows a pre-entered row as booked, with no "Upcoming" line
- [796](./796.md) — Merchant detail's total and count include pre-entered entries ("$6,000.00" when $4,500 paid)
- [797](./797.md) — Merchants' Recurring row keeps the old currency after a payee switches ("¥120,000" for $2,000 rent)
- [798](./798.md) — Merchants shows a steady $10.99 bill as "~$10.99" because another currency's charges vary
- [799](./799.md) — A biweekly series with one late payment reads "Twice a month"
- [800](./800.md) — Profile throws away edits on Back without asking
- [801](./801.md) — A ledger renamed on the web appears twice in the drawer; per-ledger state stays under the old id
- [802](./802.md) — With the ledger list failed or loading, the drawer shows only the current ledger, with no retry
- [803](./803.md) — One transient server error turns off profile photos until restart
- [804](./804.md) — A BTC budget reads green "On target" while showing 17% over (w21/290 regression)
- [805](./805.md) — A KWD budget is prorated to cents, so on-target spending reads "Above target"
- [806](./806.md) — Budgets on one account in two currencies cancel each other's status
- [807](./807.md) — VoiceOver's budget chart summary counts spending from before the budget existed
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
