# w1 — Home dashboard (worker1)

**Worker:** worker1 — front-door track: evolve the home tab from a flat list of numbers into a Monarch-style analytics dashboard, now extended to Monarch-style Accounts and Reports tabs. Sequenced m2 → m3: Reports reuses m2's GraphQL plumbing and account-detail screen.

## Milestones

- [x] **m1** — Monarch-style dashboard home (8 tasks) ← from `/pm` request + Monarch screenshots (IMG_0730, IMG_0732)
- [x] **m2** — Monarch-style Accounts tab (8 tasks) ← from `/pm-brainstorm` 2026-07-06 ("add accounts tab like monarch")
- [ ] **m3** — Monarch-style Reports tab (10 tasks) ← from `/pm-brainstorm` 2026-07-06 ("add a reports tab like monarch app")
- [x] **m4** — Account detail polish (5 tasks) ← from `/pm` request 2026-07-08 (missing back arrow; Journal-style transactions list)
- [x] **m5** — Settings in the ledger drawer, drop the Settings tab (6 tasks) ← from `/pm` request 2026-07-08 ("learn from monarch, move settings into the left sidebar and then remove the settings tab")
- [ ] **m7** — Dashboard cards tap through to Reports and Accounts (6 tasks) ← from `/pm-brainstorm` 2026-07-08 ("for w1")
- [x] **m8** — Multi-leg transaction entry from Home (8 tasks) ← from `/pm-brainstorm` 2026-07-09 ("multi-legging transaction from Home dropdown")
- [x] **m9** — Edit & delete transactions from transaction detail (7 tasks) ← from `/pm-brainstorm` 2026-07-09 (platform-aware pass; web ledger-editor parity)
- [x] **m10** — AI receipt capture from the Quick Add menu (7 tasks) ← from `/pm-brainstorm` 2026-07-09 (platform-aware pass; web receipt parity)
- [x] **m11** — Smart account suggestions in the add flow (6 tasks) ← from `/pm-brainstorm` 2026-07-09 (platform-aware pass; unused suggestion ops)
- [x] **m12** — Typography polish: unified fonts, sizes, legibility (8 tasks) ← from `/pm` request 2026-07-10 ("polish and unify text font, size, and legibility")
- [x] **m13** — Brand logos for transaction avatars (7 tasks) ← from `/pm` request 2026-07-13 ("use real-world brand logos for transaction avatars if recognized")
- [x] **m14** — Ledger trust: bell notifications for errors & change history (7 tasks) ← from `/pm-brainstorm` 2026-07-13 (inbox 004+005 merged) + `/pm` request 2026-07-14 (bell-icon entry)
- [x] **m15** — Beancount code editor in the Ledger tab (11 tasks) ← from `/pm` request 2026-07-14 ("replace the webview editor in ledger tab; keyboard is key") + editor research; owner decision 2026-07-14: CodeMirror 6 DOM component (real code editor) over live-markdown decoration
- [ ] **m16** — Open a new account from the Accounts tab (7 tasks) ← from `/pm` request 2026-07-27 ("add open-account to the Accounts tab") + `beancount-dashboard` open-account-dialog reference
- [x] **m17** — Account picker: fuzzy search + instant open (9 tasks) ← from `/pm-brainstorm` 2026-08-14 ("polish the account picker"; moved from the monorepo root board)
- [ ] **m18** — Account picker: recents & frecency ranking (8 tasks) ← from `/pm-brainstorm` 2026-08-14 — sequenced after m17
- [x] **m19** — Cascading refetch after ledger writes (9 tasks) ← from `/pm` research request 2026-08-14 ("when files are saved in the Files tab, should we update relevant queries to refetch?"); the m15 editor writes the ledger and invalidates nothing
- [ ] **m20** — Charts that animate: motion tokens, draw-in, and range morphs (10 tasks) ← from `/pm-brainstorm` 2026-08-14 ("learn from monarch app's animation, e.g. chart rendering animation"); no chart file imports an animation API today
- [ ] **m21** — Moments that land: haptics, save confirmation, receipt payoff (8 tasks) ← from `/pm-brainstorm` 2026-08-14 (same pass); two save paths stall 2s by design and the receipt parse lands silently
