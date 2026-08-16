# w1 · m21 — Moments that land: haptics, save confirmation, receipt payoff

**Worker:** worker1 **Goal:** Every ledger write ends in a fast, consistent, felt confirmation — and the AI receipt flow, the most magical thing the app does, stops landing in silence. **Status:** done — the haptics-by-hand pass, the one check a simulator cannot do, is carried as `w1/023`

## Tasks (in order)

| id   | title                                                           | est | depends_on |            |
| ---- | --------------------------------------------------------------- | --- | ---------- | ---------- |
| t001 | Delete the 2s post-save stall; one shared return-and-confirm    | 40m | —          | — **DONE** |
| t002 | `common/haptics.ts` — one wrapper, platform-gated and guarded   | 30m | —          | — **DONE** |
| t003 | Success/error haptics on every ledger write                     | 25m | t002       | — **DONE** |
| t004 | Receipt parse lands with a reveal, not a silent replace         | 50m | t001, t003 | — **DONE** |
| t005 | `PressableScale` primitive, adopted by `Button` and the tab bar | 40m | —          | — **DONE** |
| t006 | UX pass — light/dark, i18n, haptics on device, analytics        | 35m | t004, t005 | — **DONE** |
| t007 | Simplify pass over the confirmation + haptics code              | 25m | t006       | — **DONE** |
| t008 | Unit tests for the confirmation path and haptics wrapper        | 35m | t006       | — **DONE** |

## Definition of done

Saving a transaction or a split returns to the previous screen **immediately** and confirms there — the two `setTimeout(…, 2000)` blocks are gone, and the `AddTransactionCallback` refetch fires without waiting on them. Quick-add, split, edit and delete all take the same confirmation path; today edit returns instantly while the other two stall for two seconds.

Every ledger write fires a haptic through one wrapper that gates platform and swallows failure. Today there are five raw `expo-haptics` call sites, only `haptic-tab` checks platform, only `haptic-tab` is _un_-guarded against rejection, and only _budget_ save produces a success notification haptic — transaction save, split save, delete and receipt parse produce none.

A parsed receipt shows what was extracted before the form takes over, instead of `router.replace()` with nothing but an analytics call. `Button` press feedback is a spring-scaled press rather than a hard color cut.

Correct in light **and** dark, all new strings via `useTranslations()` from the English base. `yarn lint` / `yarn typecheck` / `yarn test:unit` pass.

## Source + Goal linkage

- **Source:** `/pm-brainstorm` 2026-08-14 ("learn from monarch app's animation … and see how we can increase customer delight"). Verified sites: `src/screens/add-transaction-screen/add-transaction-next-screen.tsx:267-274`, `src/screens/multi-postings-transaction/multi-postings-transaction-screen.tsx:430-437`, `src/screens/edit-transaction-screen/edit-transaction-screen.tsx:147`, `src/screens/receipt-capture-screen/receipt-capture-screen.tsx:105-122`, `src/components/button/index.tsx:38-52`.
- **Goal linkage:** Pillar 1 **Effortless capture** — the pillar's promise is "recording a transaction takes seconds, not minutes", and the app currently spends two of those seconds per save on a deliberate pause. Pillar 2 **AI-powered ease** — the receipt flow is where "the app does the accounting thinking for the user" pays off, and today it produces no perceptible payoff at all.
- **Expected outcome:** the capture loop gets ~2s shorter per saved transaction, and the same gesture produces the same feedback everywhere in the app. The receipt scan reads as something the app _did for you_ rather than a screen that quietly changed.
- **Why now:** this is the cheapest per-hour user-visible win on the board and depends on nothing else. It composes with `w1/m20`'s motion tokens if that lands first, but does not require it — the two milestones can run in either order. No new dependencies: `expo-haptics` and `react-native-reanimated` are installed.

## Design decisions (settled during brainstorm research)

- **No confetti, and no celebration of spending.** Monarch fires confetti on goal creation and at the end of its monthly review, and it is the most-copied "delight" pattern in this category. Rejected here on judgment: Robinhood removed its confetti in 2021 under gamification scrutiny, and in a double-entry bookkeeping tool the thing being congratulated would usually be _the user spending money_. If a celebration ever ships, it belongs on completing the books — reconciled, balanced, imported cleanly — never on recording an expense.
- **The confirmation moves to the destination, not the origin.** The 2s stall exists so the success toast is visible before the screen unmounts. Returning first and confirming on the destination screen keeps the feedback and removes the wait.
- **`PressableScale` adoption is scoped.** Create the primitive and adopt it in `Button`, the tab bar and the chart cards. The full sweep of 41 `TouchableOpacity` sites — which carry four different `activeOpacity` values (23×`0.7`, 8×`0.6`, 3×`0.9`, 2×`0.8`, plus many with none, defaulting to a much harsher `0.2`) — is deliberately left as follow-up work.
