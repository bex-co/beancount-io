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
- [x] **m22** — Delete what's dead: four unreferenced surfaces, then lazy tabs (8 tasks) ← inbox `002` + `012` + `013` + `025`, promoted and shipped 2026-08-16
- [x] **m23** — One loading and feedback vocabulary across the app (7 tasks) ← inbox `015` + `016` + `017` + `018`, promoted in the same pass; sequence after m20
- [ ] **m24** — Controls you can see: fix the light neutral ramp, then share the primitives (8 tasks) ← inbox `010` + `011`, promoted in the same pass; `t004` waits on `m20/t011`

## Board triage — 2026-08-16

Every open milestone and note was checked against the working tree. Two milestones closed, one was deleted, three notes went away, three were corrected.

**Open work, in order:**

1. **m20** — `t011` (the indicator `t006` shipped renders beside the pills, not under them), then `t009`. `t008` was closed on 2026-08-16 on the owner's call without its device reduce-motion check; the risk is written down in the task's outcome note rather than left implied.
2. **m18** — untouched in code (no `frecency`, `accountUsageVar`, or recents anywhere), still valid, and now unblocked: m17 shipped the list it composes with.
3. **m23 / m24** — materialized 2026-08-16 from six inbox notes (see below). m23 waits on m20 closing; m24's `t004` waits on `m20/t011`.

**m22 shipped the same day it was created.** Seven files left the tree, tabs now mount on first focus instead of at launch, and one pre-existing defect was filed rather than fixed (`026` — an unmatched tabs route renders black instead of `+not-found`). Two follow-on effects to remember: `m23/t004`'s cost argument ("all five tabs are already mounted, so a spring on `focused` is free") is no longer true, and `m24/t002` should not expect `src/common/progress-bar.tsx` to still exist if `m23/t003` runs first.

**Promoted out of the inbox 2026-08-16:** ten notes became three milestones — `002`/`012`/`013`/`025` → **m22** (deletions plus the lazy-tab flip), `015`/`016`/`017`/`018` → **m23** (one loading and feedback vocabulary), `010`/`011` → **m24** (the light-mode control boundary, then the shared search bar / pills / picker helper). They were grouped by shared verification loop, not by theme alone: m22 is proved by grep plus `yarn test`, m23 by a light/dark walk with reduce-motion toggled, m24 by measured contrast.

**Deliberately left in the inbox:** `006`, `007`, `008`, `020` are parked on a named blocker (schema reachability, dependency approval, cost); `009` and `019` say in their own text that they need a sizing pass first; `022` is twelve languages of translation work; `023` is a device walkthrough, not code; `024` is sub-hour, which the sizing rule keeps out of a milestone.

**Unblocked by shipped work, still a note:** `009` — inline `open` from the picker; m16 and m17 both landed, so only its own sizing pass stands in the way.

**Removed:** `014` (its own instruction — `m20/t007` landed and all four skeleton heights now derive from shared constants) and `021` (folded into `m20/t011`, where the bug belongs).
