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
- [x] **m18** — Account picker: recents & frecency ranking (8 tasks) ← from `/pm-brainstorm` 2026-08-14 — sequenced after m17; shipped 2026-08-17
- [x] **m19** — Cascading refetch after ledger writes (9 tasks) ← from `/pm` research request 2026-08-14 ("when files are saved in the Files tab, should we update relevant queries to refetch?"); the m15 editor writes the ledger and invalidates nothing
- [x] **m20** — Charts that animate: motion tokens, draw-in, and range morphs (11 tasks) ← from `/pm-brainstorm` 2026-08-14 ("learn from monarch app's animation, e.g. chart rendering animation"); no chart file imports an animation API today
- [x] **m21** — Moments that land: haptics, save confirmation, receipt payoff (8 tasks) ← from `/pm-brainstorm` 2026-08-14 (same pass); two save paths stall 2s by design and the receipt parse lands silently
- [x] **m22** — Delete what's dead: four unreferenced surfaces, then lazy tabs (8 tasks) ← inbox `002` + `012` + `013` + `025`, promoted and shipped 2026-08-16
- [x] **m23** — One loading and feedback vocabulary across the app (7 tasks) ← inbox `015` + `016` + `017` + `018`, promoted in the same pass; sequence after m20
- [x] **m24** — Controls you can see: fix the light neutral ramp, then share the primitives (8 tasks) ← inbox `010` + `011`, promoted in the same pass; shipped 2026-08-17 on top of `m20/t011`
- [x] **m25** — Inline `open`-directive creation from the account picker (7 tasks) ← inbox `009`, promoted 2026-08-17 — m16 + m17 shipped both prerequisites
- [x] **m26** — UI-thread scrubbing for the interactive line chart (7 tasks) ← inbox `019`, promoted 2026-08-17 — sequenced after `m20/t009`, same file
- ~~**m27** — Localize the AI receipt capture flow~~ — **deleted 2026-08-17**: strictly subsumed by **m29**. Its ~21 receipt keys are part of the 148 keys missing in _all twelve_ locales, so every m27 task is a subset of an m29 locale task; its receipt-flow UX walk survives as a named step in `m29/t009`. Its research is preserved in git history at this path.
- [x] **m28** — Home cards tap through; bad routes fall back (8 tasks) ← inbox `024` + `026`, promoted 2026-08-17 — bundled by their shared tap/deep-link verification loop
- [x] **m29** — Translation integrity gate, then the six largest locales (11 tasks) ← from `/pm` request 2026-08-17 ("add tests to check translation integrity, en as the source … no missing, no extra, and then translate missing items"); supersedes m27; shipped 2026-08-17
- [x] **m30** — The last six locales, and the gate goes unconditional (10 tasks) ← same request, split off by size — twelve locales at ~170 keys each is roughly ten hours; shipped 2026-08-17 — all thirteen locales now declare the same 329 keys, and the gate is unconditional
- [x] **m31** — Right-to-left layout for Persian (10 tasks) ← from the `m30` outcome note, which names this gap and rules it out of scope in the same sentence; shipped 2026-08-17 — Persian now lays out right-to-left, English is unchanged, and two React Native RTL defaults that fight each other are written down in the milestone's outcome note
- ~~**008** — v2 native code-editor module (Runestone + sora-editor)~~ — **deleted 2026-08-17**: 12–19 person-days plus permanent maintenance of two native deps, gated on a product signal ("only if requirements outgrow the 7-color approach") that has not appeared since m15 shipped. The research survives in git history at this note's path.
- [x] **m32** — Ask Beancount.io on mobile: core agent chat (10 tasks) ← inbox `006`, promoted 2026-08-18 after its blocker dissolved; scoped by `docs/ADR002-mobile-ai-assistant.md` (P0 + P1); shipped 2026-08-19 — the app's first AI surface, on the dashboard's own agent route with no backend change
- [x] **m33** — Cash-flow Sankey on Reports (10 tasks) ← inbox `020`, promoted 2026-08-19 — its two blockers (the `d3-sankey` decision, a phone-width design pass) are the milestone's first two tasks; with the agent-chat track closed by anti-goal the same day, this is the largest open analytics parity gap, and the web ships the tested data transformer in-repo; shipped 2026-08-19
- [x] **m34** — Offline-tolerant cold start: persist the Apollo cache (8 tasks) ← from `/pm-brainstorm` 2026-08-19, materialized in the same hand-off; sequenced after m33 — feature before infrastructure
- [x] **m35** — Merchants directory in the drawer (9 tasks) ← from `/pm` hand-off 2026-08-19 (Monarch Merchants parity research: Mobbin iOS captures + help.monarch.com + monarchmoney GraphQL clients)
- [x] **m36** — Merchant view: stats and transaction history (8 tasks) ← same hand-off; sequenced after m35 — navigates from its list, reuses its `queryShell` plumbing
- [x] **m37** — Recurring merchants: detection and grouping (9 tasks) ← same hand-off; sequenced after m35 + m36 — the directory is its surface, the merchant view hosts its toggle
- [ ] **m38** — Localize and optimize the App Store product page (15 tasks) ← from `/pm-brainstorm` 2026-08-24; moved from the monorepo root board

## Merchants hand-off — 2026-08-19

Owner request: "learn from monarch mobile and introduce a feature 'Merchants'
from the left sidebar bottom for viewing merchants and group recurring ones."
Research ran first (Mobbin captures of Monarch iOS v2.0.37, help.monarch.com,
the reverse-engineered monarchmoney GraphQL clients, and a full sweep of our
own payee/navigation surface); the hand-off materialized its three phases as
m35 → m36 → m37 and parked the rest as inbox `032`.

What the research settled, worth keeping past the milestones:

- **The payee is already the merchant entity.** Monarch's hardest problem —
  cleaning statement text into names — doesn't exist here; payees are typed by
  the user. m13's brand-matcher gives the directory logos for free.
- **No payee aggregate exists server-side.** All 73 query roots checked:
  names only (`getLedgerPayees`), and `getLedgerPayeeTransactions` is typed as
  returning a _singular_ `Transaction!` — an apparent server schema bug, unused
  by any client. The aggregation path is `queryShell` with **fixed
  app-authored BQL** — reconciled against the 2026-07-14 anti-goal in m35's
  README: that decision bans a user-facing query surface ("typing queries on a
  phone"), not internal plumbing; no screen will accept or display BQL.
- **Recurring is greenfield.** Nothing recurring-shaped exists in schema or
  client. Detection is a pure selector (cadence bands over date gaps, amount
  stability); manual overrides are device-local preferences, with the
  ledger-native `custom` directive alternative recorded in `032` as an owner
  decision, deliberately not assumed.
- **Deliberately not planned:** rename/merge (a ledger-source rewrite),
  Monarch's review queue and pre-charge notifications, logo upload, bill sync
  — see `032` for what's parked and on which blocker.

## Ask Beancount.io shipped on mobile — 2026-08-19

**m32** landed the same day it started. The app has an AI surface for the first
time: ask a question about the selected ledger, watch the answer stream in, stop
it, start over. It is a second client of the route the dashboard already uses —
same UIMessage stream, **no backend change** — and it authenticates with the
Bearer token already in the keychain.

Three things are worth remembering past this milestone:

- **`expo/fetch` shares the native cookie store.** The smoke's negative control
  (no `Authorization` header) returned 200 and streamed a real answer, because
  the app holds a session cookie for the same origin and the route tries the
  header first, the cookie second. The transport sets `credentials: "omit"` so
  the token is the only credential — otherwise a client that lost its header
  keeps working until the cookie expires somewhere else, later.
- **The model announces writes it has not made.** Asked to append a
  transaction it said "Proceeding with this operation" and nothing happened, the
  edit tool being approval-gated server-side and this client never answering the
  request. Git history identical before and after. What the model says and what
  the tool does are separate facts.
- **A turn can finish having said nothing** — ten server-side steps spent
  reading files, no text. That silence was a dead end until it got its own
  notice; it was found only because the first attempt to reach an approval
  failed to reach one.

The UX pass found six defects, every one by looking at a real answer rather than
at the diff: raw `**asterisks**` beside the user's money, LaTeX where the model
showed its arithmetic, backticks around account names, steps running together,
the silent turn, and — visible only in Persian — a bullet glued to its word,
because the gap lived in a `"• "` string and a trailing space collapses when the
row mirrors. Same class of bug m31 wrote up: spacing that is really layout
belongs in the layout.

**Deliberately not built:** approval cards with a real diff (ADR002 P2 — every
write is still a trip to the web), attachments through chat (P3), and durable
history (backend-owned). **Not verified:** Android, haptics, analytics, and
hand-typed input — the automation taps but cannot type, so every message sent
came from a preset chip or a `?q=` prefill.

## Ask-AI unblocked, promoted — 2026-08-18

`006` sat parked on "no agent/chat operations in the mobile schema" — a correct
observation at the wrong layer. The agent surface is not GraphQL: it is
`POST /api-gateway/agent`, REST + SSE speaking the AI SDK UIMessage stream, and
its auth resolves `Authorization: Bearer` **first** — a header path that exists
expressly for API clients and the mobile app. Which is why enumerating the
GraphQL roots (74/60/9) could never find it.

The full design landed the same day as `docs/ADR002-mobile-ai-assistant.md`:
protocol notes, the two-dependency decision (`ai` + `@ai-sdk/react`,
dashboard-matched), phasing P0–P4, and the security posture from its review —
deep links **prefill, never auto-submit**, and write tools are refused with a
"continue on the web" notice until approval cards can render the real diff (P2).
Entry design (2026-08-18 owner discussion): no sixth tab — a Home ask card with
preset chips is the primary entry, a Home header icon the persistent one.

`006` → **m32**, scoped to ADR P0 + P1: a thirty-minute Bearer/streaming smoke
gates everything, then core chat, dead-end-free states, the guard, and the
entries. Approvals (P2), attachments (P3), and per-screen contextual entries
stay in the ADR until the transport is proven. In this milestone the agent
cannot write to the ledger from mobile at all — "AI proposes, the user
confirms" in its strongest form.

## Persian right-to-left — 2026-08-17

**m31**, straight out of m30's outcome note, which named the gap and ruled it out of scope in the same sentence: `fa` was fully translated but rendered inside a left-to-right shell. Shipped the same day — the app now flips at launch, the drawer opens from the right, and 63 physical spacing props plus 21 directional glyphs became direction-aware. English and the other eleven locales are pixel-unchanged, checked screen by screen against captures taken beforehand.

Two React Native defaults turned out to pull in opposite directions, and both cost a debugging cycle before they were understood: `doLeftAndRightSwapInRTL` is **on**, so `left`/`right` silently become logical and break anything paired with unmirrored geometry (it sent the time-range pills' selected fill off the screen); while `textAlign` is **already** logical, so the obvious "fix" of branching it on `isRTL` double-flips it. The real defect underneath both was React Native's `natural` alignment, which reads direction from the string rather than the layout — which is why Latin ledger data drifted to the wrong edge and the account tree's indentation stopped reading as indentation. All three are written up in `done/m31/README.md`.

**Not verified, and said so there:** the restart prompt's rendering (the language wheel cannot be driven headlessly), receipt capture (no camera permission, same as m29/m30), and Android (the `textAlign` behaviour is iOS platform code).

**New inbox note:** `027` — dates still render in English in all thirteen locales. A formatting gap, not a translation or layout one, and gated on whether this build ships full ICU.

## Translation integrity — 2026-08-17

`/pm` request: make English the enforced source of truth for translations, then close the gap. Measured before writing anything, at the source level (locale files are `{ ...en, <overrides> }`, so a runtime lookup can never reveal a missing key — an untranslated string silently serves English):

|               | `en` | `zh` | `de` | `ru` | `es` | `fr` | `pt` | `bg` `ca` `fa` `nl` `sk` `uk` |
| ------------- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ----------------------------- |
| declared keys | 318  | 170  | 150  | 150  | 147  | 147  | 143  | 143 each                      |
| missing       | —    | 148  | 168  | 168  | 171  | 171  | 175  | 175 each                      |

**2051 missing declarations across twelve locales; 148 keys missing in all twelve; zero extra keys anywhere.** So "no extra" is a guard against future drift, not a cleanup — the whole cost is in "no missing".

Split into two milestones because ~170 keys × 12 locales is roughly ten hours: **m29** builds the gate (missing / extra / duplicate / interpolation-token parity, with a shrinking `KNOWN_GAPS` baseline so it lands green and fails on any _new_ gap) and closes the six largest locales; **m30** closes the remaining six, empties the baseline, and adds the rule that a byte-identical English value is not a translation.

**m27 deleted, not duplicated.** It translated the receipt group into twelve locales — a strict subset: those keys are among the 148 missing everywhere, so each m27 task is contained in an m29 locale task. Its one non-overlapping piece, the receipt-flow UX walk in the longest locales, is written into `m29/t009` by name.

**Consequence, now live:** the baseline is empty, so every future feature adding an `en` key must ship twelve translations or add an explicit `KNOWN_GAPS` entry naming what it deferred. The escape hatch is kept deliberately rather than deleted — a red build on an honest deferral would just get worked around. Both milestones shipped 2026-08-17; the sweep translated 3101 strings across twelve languages, and **none of it has been reviewed by a native speaker** — the pre-existing `// TODO: needs native speaker review` markers in `fa`, `bg`, and `sk` are the only per-string caveats the files carry.

## Board triage — 2026-08-18

Every milestone in this workstream is now closed. The two that were still open
were each down to one task:

- **m20** — `t009`, the deferred simplify pass over the motion + chart code, run
  as a four-angle review. Landed a shared `chart-chrome.tsx` (the error boundary,
  placeholder, legend and styles all four charts had copied) and `restingBarRect`
  in `bar-geometry.ts`, which also fixed a latent defect: one chart returned a
  negative bar height for a near-zero negative value, which SVG will not draw.
  Two findings were deliberately **not** applied and are now `028` and `029`.
- **m25** — `t003` was implemented with its cancel path verified; only the
  success path was unexercised, because it writes a real `open` directive to the
  production ledger. Closed with the walk split out to `030`, the same treatment
  `w1/023` got when `m21/t006` closed.

**Inbox, after this pass:**

- `027` **consumed** — its blocking question ("is Hermes shipping full ICU?") was
  answered on device: yes. Locale-aware dates shipped; Persian now reads
  `۸ سپتامبر ۲۰۱۷` instead of `September 8, 2017`. The Jalali-calendar question it
  deferred is now `031`.
- `006` **still blocked, now definitively** — enumerated the mobile schema's
  roots: 74 queries, 60 mutations, 9 subscriptions, and zero agent/chat
  operations. The dashboard does talk to a larger gateway, as suspected.
- `007` **still blocked on a dependency** — re-confirmed the Plaid surface is
  fully present in the mobile schema (18 operations), so nothing is missing
  server-side; it needs the `react-native-plaid-link-sdk` decision and its own
  scoping pass.
- `020` **still blocked** — `d3-sankey` dependency decision plus a phone-width
  design pass.
- `023` **still owner-only** — hardware haptics; a simulator has no Taptic Engine.
- `028`, `029`, `030`, `031` **new**, all with their blocker or their reason for
  deferral written down.

Nothing was deleted: every parked note is blocked on something real — a
dependency, a server-side capability, a physical device, or a product decision —
rather than stale.

## Board triage — 2026-08-17

Full inbox triage against the working tree (every claim re-verified by grep before acting). Four notes became four milestones, one was deleted, four stay parked.

**Promoted:** `009` → **m25** (its two prerequisites, m16's open-account flow and m17's picker, are both in `done/`; the picker's zero-results state at `account-picker-screen.tsx:348` is still a dead end); `019` → **m26** (`interactive-line-chart.tsx` still runs scrub on `PanResponder` + `useState`; the note's hazard analysis is preserved in the milestone README); `022` → **m27** (still only `en.ts` declares any receipt key — twelve locales to go, then the parity test m21 couldn't ship); `024` + `026` → **m28**, grouped by verification loop like m22 was — both are proven by driving taps and deep links in the simulator. One drift caught during verification: `recent-transactions-card` now navigates too (024 said budget-card was the only door), which strengthens m28/t001's case for a shared affordance.

**Deleted:** `008` (see the struck line above — speculative v2 with no why-now, which `DO_NOT_DO.md` names directly).

**Still parked, each on a blocker this board cannot clear:**

- `006` — Ask-AI parity. Re-verified 2026-08-17: the mobile schema still exposes **zero** chat/agent operations, so no task can name a concrete operation and the work cannot land in this repo yet.
- `007` — Plaid bank sync. The schema side is fully present (61 Plaid mentions), but mobile Plaid Link needs `react-native-plaid-link-sdk` — a new native dependency, which is the owner's call. One "yes" away from a `/pm-brainstorm` scoping pass.
- `020` — cash-flow Sankey. Same dependency gate (`d3-sankey` or hand-rolled layout) plus a phone-width design pass the note itself requires before a task breakdown.
- `023` — m21 haptics hardware walkthrough. Sub-hour and not code: it needs a physical Taptic Engine, which only the owner's hands supply. m26/t003 adds one more row to that same walkthrough.

**Open milestones after this pass, in order:** m20 (only `t009`, the simplify pass), m18 (re-verified untouched: no `frecency`/`accountUsageVar` in `src/`), then m25–m28 (m26 queued behind m20/t009 because they share `interactive-line-chart.tsx`).

## Board triage — 2026-08-16

Every open milestone and note was checked against the working tree. Two milestones closed, one was deleted, three notes went away, three were corrected.

**Open work, in order:**

1. **m20** — `t009` (the simplify pass over the motion + chart diff) is all that is left. `t011` was closed 2026-08-17: its fix had already shipped as `d668411` and only the board entry was outstanding; `w1/m24` re-verified the indicator in both themes while generalizing the same component. `t008` was closed on 2026-08-16 on the owner's call without its device reduce-motion check; the risk is written down in the task's outcome note rather than left implied.
2. **m18** — untouched in code (no `frecency`, `accountUsageVar`, or recents anywhere), still valid, and now unblocked: m17 shipped the list it composes with.
3. **m23 / m24** — materialized 2026-08-16 from six inbox notes (see below); both shipped. m24 closed 2026-08-17; its `t004` dependency on `m20/t011` was satisfied in the tree by `d668411`, and closing m24 is what surfaced that `t011`'s board entry was still open.

**m22 shipped the same day it was created.** Seven files left the tree, tabs now mount on first focus instead of at launch, and one pre-existing defect was filed rather than fixed (`026` — an unmatched tabs route renders black instead of `+not-found`). Two follow-on effects to remember: `m23/t004`'s cost argument ("all five tabs are already mounted, so a spring on `focused` is free") is no longer true, and `m24/t002` should not expect `src/common/progress-bar.tsx` to still exist if `m23/t003` runs first.

**Promoted out of the inbox 2026-08-16:** ten notes became three milestones — `002`/`012`/`013`/`025` → **m22** (deletions plus the lazy-tab flip), `015`/`016`/`017`/`018` → **m23** (one loading and feedback vocabulary), `010`/`011` → **m24** (the light-mode control boundary, then the shared search bar / pills / picker helper). They were grouped by shared verification loop, not by theme alone: m22 is proved by grep plus `yarn test`, m23 by a light/dark walk with reduce-motion toggled, m24 by measured contrast.

**Deliberately left in the inbox:** `006`, `007`, `008`, `020` are parked on a named blocker (schema reachability, dependency approval, cost); `009` and `019` say in their own text that they need a sizing pass first; `022` is twelve languages of translation work; `023` is a device walkthrough, not code; `024` is sub-hour, which the sizing rule keeps out of a milestone.

**Unblocked by shipped work, still a note:** `009` — inline `open` from the picker; m16 and m17 both landed, so only its own sizing pass stands in the way.

**Removed:** `014` (its own instruction — `m20/t007` landed and all four skeleton heights now derive from shared constants) and `021` (folded into `m20/t011`, where the bug belongs).
