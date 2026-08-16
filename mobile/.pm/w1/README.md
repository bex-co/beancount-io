# w1 — Home dashboard (worker1)

**Worker:** worker1 — front-door track: evolve the home tab from a flat list of numbers into a Monarch-style analytics dashboard, now extended to Monarch-style Accounts and Reports tabs. Sequenced m2 → m3: Reports reuses m2's GraphQL plumbing and account-detail screen.

## Milestones

- [x] **m1** — Monarch-style dashboard home (8 tasks) ← from `/pm` request + Monarch screenshots (IMG_0730, IMG_0732)
- [x] **m2** — Monarch-style Accounts tab (8 tasks) ← from `/pm-brainstorm` 2026-07-06 ("add accounts tab like monarch")
- [x] **m3** — Monarch-style Reports tab (10 tasks) ← from `/pm-brainstorm` 2026-07-06 ("add a reports tab like monarch app"); shipped 2026-07-23 as a combined dashboard (`0bf3e11`), not the four-segment switcher — see `done/m3/README.md`
- [x] **m4** — Account detail polish (5 tasks) ← from `/pm` request 2026-07-08 (missing back arrow; Journal-style transactions list)
- [x] **m5** — Settings in the ledger drawer, drop the Settings tab (6 tasks) ← from `/pm` request 2026-07-08 ("learn from monarch, move settings into the left sidebar and then remove the settings tab")
- ~~**m7** — Dashboard cards tap through to Reports and Accounts~~ — **deleted 2026-08-16**: built on the Reports segment switcher that `0bf3e11` removed. What survives is inbox note `024`.
- [x] **m8** — Multi-leg transaction entry from Home (8 tasks) ← from `/pm-brainstorm` 2026-07-09 ("multi-legging transaction from Home dropdown")
- [x] **m9** — Edit & delete transactions from transaction detail (7 tasks) ← from `/pm-brainstorm` 2026-07-09 (platform-aware pass; web ledger-editor parity)
- [x] **m10** — AI receipt capture from the Quick Add menu (7 tasks) ← from `/pm-brainstorm` 2026-07-09 (platform-aware pass; web receipt parity)
- [x] **m11** — Smart account suggestions in the add flow (6 tasks) ← from `/pm-brainstorm` 2026-07-09 (platform-aware pass; unused suggestion ops)
- [x] **m12** — Typography polish: unified fonts, sizes, legibility (8 tasks) ← from `/pm` request 2026-07-10 ("polish and unify text font, size, and legibility")
- [x] **m13** — Brand logos for transaction avatars (7 tasks) ← from `/pm` request 2026-07-13 ("use real-world brand logos for transaction avatars if recognized")
- [x] **m14** — Ledger trust: bell notifications for errors & change history (7 tasks) ← from `/pm-brainstorm` 2026-07-13 (inbox 004+005 merged) + `/pm` request 2026-07-14 (bell-icon entry)
- [x] **m15** — Beancount code editor in the Ledger tab (11 tasks) ← from `/pm` request 2026-07-14 ("replace the webview editor in ledger tab; keyboard is key") + editor research; owner decision 2026-07-14: CodeMirror 6 DOM component (real code editor) over live-markdown decoration
- [x] **m16** — Open a new account from the Accounts tab (7 tasks) ← from `/pm` request 2026-07-27 ("add open-account to the Accounts tab") + `beancount-dashboard` open-account-dialog reference; shipped `6dda674`, board closed retroactively 2026-08-16
- [x] **m17** — Account picker: fuzzy search + instant open (9 tasks) ← from `/pm-brainstorm` 2026-08-14 ("polish the account picker"; moved from the monorepo root board)
- [ ] **m18** — Account picker: recents & frecency ranking (8 tasks) ← from `/pm-brainstorm` 2026-08-14 — sequenced after m17
- [x] **m19** — Cascading refetch after ledger writes (9 tasks) ← from `/pm` research request 2026-08-14 ("when files are saved in the Files tab, should we update relevant queries to refetch?"); the m15 editor writes the ledger and invalidates nothing
- [ ] **m20** — Charts that animate: motion tokens, draw-in, and range morphs (11 tasks) ← from `/pm-brainstorm` 2026-08-14 ("learn from monarch app's animation, e.g. chart rendering animation"); no chart file imports an animation API today
- [x] **m21** — Moments that land: haptics, save confirmation, receipt payoff (8 tasks) ← from `/pm-brainstorm` 2026-08-14 (same pass); two save paths stall 2s by design and the receipt parse lands silently

## Board triage — 2026-08-16

Every open milestone and note was checked against the working tree. Two milestones closed, one was deleted, three notes went away, three were corrected.

**Open work, in order:**

1. **m20** — `t011` (the indicator `t006` shipped renders beside the pills, not under them), then `t009`. `t008` was closed on 2026-08-16 on the owner's call without its device reduce-motion check; the risk is written down in the task's outcome note rather than left implied.
2. **m18** — untouched in code (no `frecency`, `accountUsageVar`, or recents anywhere), still valid, and now unblocked: m17 shipped the list it composes with.

**Notes now unblocked by shipped work:** `009` (inline `open` from the picker — m16 and m17 both landed), `017` (crossfade sweep — `m20/t007` established the pattern), `018` (tab icons — `m21/t005` landed `PressableScale`).

**Notes still parked on a named blocker, deliberately:** `006` (schema reachability), `007` and `020` (new dependency, needs user approval), `008` (12–19 person-days).

**Verified-still-true cleanups:** `002` (`lazy: false` at `_layout.tsx:49`), `010`, `011`, `012` (`homeCharts.graphql` orphaned; only a comment in `invalidate-ledger.ts` mentions it), `013`, `015`, `016`, `022`, `023` (a device walkthrough, like `m20/t008`), plus new `024` and `025`.

**Removed:** `014` (its own instruction — `m20/t007` landed and all four skeleton heights now derive from shared constants) and `021` (folded into `m20/t011`, where the bug belongs).
