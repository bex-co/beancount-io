# w21 — Worker queue (worker1)

**Worker:** worker1 — general-purpose adoption worker; accepts the next highest-impact milestone across packages, topics, and A1/A2/A3 rather than owning a permanent specialty.

## Milestones

- [x] **m1** — [Entry edits and deletes refuse changes that would break the ledger](./done/m1/README.md) (7 tasks) ← from mobile QA 2026-10-20

## Dropped

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
- [871](./blocked/871.md) — Mobile never attaches the scanned receipt image to the saved transaction (dashboard does) — **blocked:** needs an owner decision on how a scanned receipt is saved with its document (two-posting insertReceiptTransaction only, extend it, or write the document in the addEntries commit)
- [857](./blocked/857.md) — The ledger runs amortize_over/forecast on the server's UTC date, not the user's — **blocked:** needs an owner-approved optional client date/time-zone input on every plugin-running read across REST, GraphQL and MCP, with the cache-key policy
- [879](./blocked/879.md) — The receipt parse contract carries no currency, so a foreign receipt is always booked in the ledger's currency (split from w21/870) — **blocked:** needs an owner-approved `ReceiptParseResult` currency contract (parity, model prompt, both receipt forms) and an AI-quota evaluation
- [882](./blocked/882.md) — Chart axes use the app language's money format while the amounts beside them use English (9 languages) — **blocked:** needs an owner product decision on one number convention for money (app language everywhere vs English everywhere), reversing w21/177 or w3/189
- [895](./blocked/895.md) — Account detail's range chips filter only the chart, not the list below — **blocked:** owner picks a range-bounded list (backend date bound on all surfaces) or an "All entries" caption
- [902](./902.md) — A misspelled built-in plugin is reported as needing the python-plugins feature
- [903](./903.md) — Recent changes rows read only "Add 1 entry" or "Update entry"
- [904](./904.md) — A write during an in-flight refresh shows pre-write data (Apollo deduplicates the refetch)
- [905](./905.md) — Leaving the picker while Open Account saves lets its callback close the screen now on top
- [906](./906.md) — An ID-changing Edit flashes "changed or removed" and refetches the ledger twice
- [907](./907.md) — A stock buy dated after today makes account detail read "0 VOO"
- [908](./908.md) — Reports' Recent transactions lists entries dated after today that the charts leave out
- [909](./909.md) — Update Budget on a budget that hasn't started can't be dated before its start
- [910](./910.md) — Identical budget entries highlight two history rows as current, with duplicate keys
- [911](./911.md) — Two-word Transactions search finds nothing unless the words are adjacent in one field
- [912](./912.md) — Full-width and half-width Japanese text doesn't match in search
- [913](./913.md) — "Load more" skips a row after a deletion elsewhere, and repeats one after a reorder
- [914](./914.md) — CLF, UYW and UYI postings show different decimals from the headline
- [915](./915.md) — Symlinks in a ledger repo open as "too large to open on your phone"
- [916](./916.md) — Self-hosted Settings offers Invite Friends with a beancount.io link carrying the local user id
- [917](./917.md) — Merchants splits full-width and half-width payees, and search misses the full-width one
- [918](./918.md) — Merchant detail opened offline on a later day shows its load error instead of cached totals
- [919](./919.md) — Recent Transactions flashes "No transactions yet" while it checks for upcoming entries
- [920](./920.md) — Lakh ("1,00,000") and apostrophe-grouped ("1'234.50") amounts are refused
- [921](./921.md) — A payee's usual accounts don't fill when 50 newer entries contain its name
- [922](./922.md) — Changing to a payee with no history keeps the previous payee's accounts (owner's call)
- [923](./923.md) — A dirty New Transaction loses its link guard after Open Account is pushed over it
- [924](./924.md) — A deferred foreground refresh after Log out shows "Your session ended" and can break the next sign-in
- [925](./925.md) — Add Budget's empty Account row reads to VoiceOver as "Expenses:Groceries" and is nearly invisible in light mode
- [926](./926.md) — Green and red figures on Home and Budget cards are below 4.5:1 contrast in light mode
- [927](./927.md) — Persian or Arabic account paths read child first on four more screens
- [928](./928.md) — The account picker hides Create when the text appears inside another account ("car" in CreditCard)
- [929](./929.md) — Account picker search ignores accents and offers a look-alike Expenses:Cafe
- [930](./930.md) — A closed exact account name is explained only when the picker search has no other hits
- [931](./931.md) — The Cash flow chart's VoiceOver label reads float leftovers ("-$0.0000000000000018")
- [932](./932.md) — Reports chart summaries read "$222.6" for $222.58
- [933](./933.md) — Persian chart y-axis ticks use Latin digits under Persian x-axis labels
- [934](./934.md) — Offline, Home's budget panel claims "$0.00 · Below target" on a cache miss
- [935](./935.md) — Offline deletes say "didn't confirm the save", even when no delete was sent
- [936](./936.md) — "Try again" on "Failed to load" shows no progress, and offline nothing changes
- [937](./937.md) — A successful save can still land on "This transaction was changed or removed"
- [938](./938.md) — Edit's Reload can't find a changed entry on a day with more than 10 transactions
- [939](./939.md) — Edit's refusal line number is off when the draft starts with blank lines
- [940](./940.md) — Saving a file with `\r\r\n` line endings drops a CR on every line
- [941](./941.md) — Cmd-S on a hardware keyboard saves an unchanged file
- [942](./942.md) — Tapping the same editor error row again within 3 s doesn't jump
- [943](./943.md) — A same-day charge and reversal counts as a payment: Next moves, "~" appears, Overdue is lost
- [944](./944.md) — One off-schedule charge drops the recurrence day-of-month anchor, so Next runs late
- [945](./945.md) — Update Budget is refused for a closed parent whose children are still open
- [946](./946.md) — Add Budget saves a yen budget as USD for an account that only spends yen
- [947](./947.md) — Adding a budget for an already-budgeted account skips Update's safeguards
- [948](./948.md) — Changing the budget date doesn't recheck when the account opens
- [949](./949.md) — A ledger description over 2048 characters fails Create with a generic retry message
- [950](./950.md) — A pasted ledger name with a tab or line break shows the server's raw "Title" error on Review
- [951](./951.md) — Expense accounts are valued at market on Accounts and account detail, but at cost everywhere else
- [952](./952.md) — Merchant detail stops loading at a hidden page cap that shrinks after every edit
- [953](./953.md) — "Back to Files" stacks a second copy of the whole tab bar
- [954](./954.md) — w21/544 reopened: "View errors" still stacks a second Notifications screen
- [955](./955.md) — Receipt photos are uploaded at any size, so oversized ones always fail to parse
- [956](./956.md) — Receipt Try Again after a failed parse uploads the photo again
- [957](./957.md) — A failed shutter tap on iPad or with haptics off gives no feedback
