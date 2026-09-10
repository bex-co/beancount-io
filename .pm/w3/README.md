# w3 — General adoption worker queue (worker3)

**Worker:** worker3 — general-purpose adoption worker; accepts the next highest-impact milestone across packages, topics, and A1/A2/A3 rather than owning a permanent specialty. Existing milestones retain their historical order and source.

## Milestones

- [ ] **m1** — Budget read-only: Home panel + /budget page (13 tasks) ← from budget-on-mobile PM spec 2026-08-09
- [ ] **m2** — Budget management: add, update, delete from mobile (9 tasks) ← from budget-on-mobile PM spec 2026-08-09 — sequenced after m1
- [x] **m3** — Budget localization & analytics-driven iteration (7 tasks) ← from budget-on-mobile PM spec 2026-08-09 — sequenced after m2
- [x] **m4** — Beancount MCP endpoint: make it connectable and keep it conformant (7 tasks) ← from `backend-cluster/backend-v2/docs/ADR0007-mcp-surface.md`
- [x] **m5** — Surface parity groundwork: honest counts and the MCP resource layer (8 tasks) ← from `backend-cluster/backend-v2/docs/ADR0008-surface-parity.md`
- [x] **m6** — Port the ledger vocabulary reads to REST and MCP together (7 tasks) ← from `backend-cluster/backend-v2/docs/ADR0008-surface-parity.md`
- [x] **m7** — Port the report and journal reads to REST and MCP (8 tasks) ← from `backend-cluster/backend-v2/docs/ADR0008-surface-parity.md`
- [x] **m8** — Port the bank-import family to REST and MCP (8 tasks) ← from `backend-cluster/backend-v2/docs/ADR0008-surface-parity.md`
- [x] **m9** — Restore defense in depth on the Plaid services (5 tasks) ← prerequisite of m8, found in w3/m8/t001
- [x] **m10** — Dashboard personal access tokens: create, verify, and document the API-key path (7 tasks) ← direct user request, 2026-08-29
- [x] **m11** — Reliable entry context for public-ledger readers (7 tasks) ← dashboard QA, 2026-09-07
- [x] **m12** — Execute and restore the BQL query shown in the editor (6 tasks) ← dashboard QA, 2026-09-07
- [x] **m13** — Make account journal filters affect the returned entries (8 tasks) ← repeated dashboard QA, 2026-09-07
- [x] **m14** — Make Statistics postings counts honor the active filters (8 tasks) ← repeated dashboard QA, 2026-09-08
- [x] **m15** — Keep ledger filters consistent with navigation and history (7 tasks) ← repeated dashboard QA, 2026-09-08
- [x] **m16** — Preserve parent-account postings in Cash Flow (6 tasks) ← repeated dashboard QA, 2026-09-08
- [x] **m17** — Make commit file links reach deferred and virtualized diffs (6 tasks) ← repeated dashboard QA, 2026-09-08
- [ ] **m18** — Keep lot reductions from replacing current market prices (7 tasks) ← repeated dashboard QA, 2026-09-08
- [x] **m19** — Keep import values valid from parsing through configuration (8 tasks) ← promoted038 and repeated dashboard QA, 2026-09-08
- [x] **m20** — Expose reporting filters on Cash Flow and narrow layouts (7 tasks) ← promoted004 and repeated dashboard QA, 2026-09-08
- [x] **m21** — Continue profile social lists beyond the first page (7 tasks) ← repeated dashboard QA, 2026-09-08
- [x] **m22** — Localize relative timestamps and date calendars (8 tasks) ← repeated dashboard QA, 2026-09-08
- [x] **m23** — Restore focus after Journal, Budget and Account dialogs (8 tasks) ← promoted050 and repeated dashboard QA, 2026-09-08
- [x] **m24** — Keep typed dates consistent with submitted entries (6 tasks) ← repeated dashboard QA, 2026-09-08
- [x] **m25** — Preserve table structure while keeping row actions accessible (6 tasks) ← repeated dashboard QA, 2026-09-08
- [x] **m26** — Prepare complete transaction amounts from eligible postings (6 tasks) ← promoted067 and repeated dashboard QA, 2026-09-08
- [x] **m27** — Preserve explicit amounts when a posting omits currency (6 tasks) ← repeated dashboard QA and verified upstream fix, 2026-09-08
- [x] **m28** — Keep BQL values connected to their columns (6 tasks) ← promoted028 and repeated dashboard QA, 2026-09-08
- [x] **m29** — Protect file drafts during navigation and cancellation (6 tasks) ← promoted041 and repeated dashboard QA, 2026-09-08

## Inbox

- [003](./003.md) — Bulk entry writes are not retry-safe after a false timeout
- [022](./022.md) — Global statement print CSS blanks Journal and Accounts printing
- [023](./023.md) — Journal export dialog overstates which filters apply
- [024](./024.md) — Journal mistakes invalid filter input for a server outage
- [025](./025.md) — Narrow statement tables split digits across lines
- [026](./026.md) — Statement account expanders expose no accessible name or state
- [027](./027.md) — A language parameter makes the manual language selector ineffective
- [029](./029.md) — Settings sign-in redirects discard the requested subpage
- [030](./030.md) — Password visibility buttons are skipped by keyboard navigation
- [031](./031.md) — Budget cards hide actual and variance for zero-activity intervals
- [032](./032.md) — Missing commits are reported as a server outage
- [033](./033.md) — Related Files links navigate to a missing route
- [034](./034.md) — BQL charts replace valid Decimal and Inventory values with invented numbers
- [035](./035.md) — Holdings rounds real crypto quantities to zero in the table and CSV
- [036](./036.md) — Holdings by Currency keeps unnamed rows for fully sold assets
- [037](./037.md) — Import preview shows different transactions from its data after deleting a row
- [039](./039.md) — Smart Import reverses the bank movement when preparing expense and income postings
- [040](./040.md) — File edit shortcuts and URLs expose an editable draft to public readers
- [042](./042.md) — Escape in file Find cancels edit mode instead of closing Find
- [043](./043.md) — Forced-open postings still advertise enabled row toggles
- [044](./044.md) — Narrow account reports hide interval and valuation selectors
- [045](./045.md) — Smart Import silently treats a real first transaction as a CSV header
- [046](./046.md) — Missing files are presented as failed requests with only a retry action
- [047](./047.md) — Import cell buttons ignore Space and lose focus when editing ends
- [048](./048.md) — An empty Overview filter result claims the whole ledger has no activity
- [049](./049.md) — Import row selection removes the focused checkbox
- [051](./051.md) — Commodity price history cannot be read with the keyboard
- [052](./052.md) — Keyboard filter selection is replaced by the partial search text
- [053](./053.md) — Import's CSV example download has no accessible name
- [054](./054.md) — Import configuration rounds real BTC amounts to zero
- [055](./055.md) — Switching ledgers keeps the previous ledger's BQL results and CSV
- [056](./056.md) — Statistics account destinations cannot be reached with the keyboard
- [057](./057.md) — Signup leaves focus on Create account when the username is invalid
- [058](./058.md) — Returning from Forgot Password loses the intended login destination
- [059](./059.md) — Switching ledgers leaves the narrow sidebar over the destination
- [060](./060.md) — A fresh guest is incorrectly told their session has expired
- [061](./061.md) — Public file titles lose the file path after rendering
- [062](./062.md) — The AI composer's send button has no accessible name
- [063](./063.md) — Confirming composed text submits an unfinished AI question
- [064](./064.md) — Enter rejects precise amounts that a mouse submission accepts
- [065](./065.md) — Budget selectors discard their form labels and descriptions
- [066](./066.md) — New Transaction leaves status and posting actions unnamed
- [068](./068.md) — Removing an earlier AI attachment leaves a later upload stuck
- [069](./069.md) — The date calendar cannot reach a valid next-year date
- [070](./070.md) — File-upload removal buttons have no accessible names
- [071](./071.md) — A removed upload file cannot be selected again
- [072](./072.md) — Account search calls loading and failed reads an empty ledger
- [073](./073.md) — Narrow account search clips the start of account names
- [074](./074.md) — Account and ledger search inputs have empty accessible names
- [075](./075.md) — Token permission errors lack focus and field associations
- [076](./076.md) — Cancel retains drafts in SSH setup and Open Account
- [077](./077.md) — Opening another BQL history query cancels the first
- [078](./078.md) — SSH setup describes the key as an API credential
- [079](./079.md) — Gallery’s Back logo cannot be reached with the keyboard
- [080](./080.md) — Ask has no control to stop a pending request
- [081](./081.md) — Ask network failures offer no retry of the submitted question
- [082](./082.md) — Ask sign-in can discard the question and selected mode
- [083](./083.md) — A background quota read redirects guests from the empty Ask page
- [084](./084.md) — Open Account validation remains English in localized forms
- [085](./085.md) — New Entry squeezes its heading into letters on narrow screens
- [086](./086.md) — Compact date fields clip the year before editing
- [087](./087.md) — Direct ledger loads lose their structured access errors
- [088](./088.md) — Try Again does not retry the failed ledger read
- [089](./089.md) — Small Journal amounts become invalid Beancount scientific notation
- [090](./090.md) — Currency fields clip MUSD, USDT and longer commodity symbols
- [091](./091.md) — Open Account accepts names that are not complete account tokens
- [092](./092.md) — Keyboard Save bypasses the file editor's pending-write protection

- [093](./093.md) — Mobile transaction search rejects punctuation in existing merchant names

- [094](./094.md) — Mobile transaction postings round recorded commodity quantities to two decimals

- [095](./095.md) — Mobile account journal drops the sign of negative running balances

- [096](./096.md) — Download adds .txt to extensionless repository files

- [097](./097.md) — Shared mobile commit links stack the destination twice

- [098](./098.md) — BQL completion keeps the typed prefix before the suggested query

- [099](./099.md) — BQL suggestions accumulate duplicates after returning to Query

- [100](./100.md) — Mobile file editor retains the previous ledger document after a link switch

- [101](./101.md) — Mobile picker confirms the first option instead of its displayed initial selection

- [102](./102.md) — Valid BQL block comments fail in hosted queries

- [103](./103.md) — Loading buttons lose their accessible names

- [104](./104.md) — Guest Star and Follow discard the sign-in return destination
