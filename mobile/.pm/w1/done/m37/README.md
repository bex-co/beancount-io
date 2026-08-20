# w1 · m37 — Recurring merchants: detection and grouping

**Worker:** worker1 **Goal:** merchants with a steady cadence surface automatically in a pinned "Recurring" section of the directory — frequency, typical amount, next-expected date — and the user can mark or unmark any merchant by hand, Monarch's core recurring mechanic without its server. **Status:** **done** 2026-08-20 — Recurring section with detection, overrides, cadence/amount/next/overdue, merchant-view toggle; light/dark/RTL verified

## Tasks (in order)

| id   | title                                                  | est | depends_on              |
| ---- | ------------------------------------------------------ | --- | ----------------------- |
| t001 | `detect-recurrence` pure selector                      | 60m | — — **DONE**            |
| t002 | Windowed per-payee series fetch                        | 45m | t001 — **DONE**         |
| t003 | Device-local recurring overrides store                 | 30m | — — **DONE**            |
| t004 | Recurring section + badges in the directory            | 45m | t001, t002, t003 — **DONE** |
| t005 | Mark/unmark toggle + cadence chip in the merchant view | 30m | t003, t004 — **DONE**   |
| t006 | UX pass (light/dark, RTL, translations, analytics)     | 30m | t005 — **DONE**         |
| t007 | Simplify pass over the milestone's diff                | 30m | t006 — **DONE**         |
| t008 | Test coverage for detection edge cases                 | 60m | t006 — **DONE**         |
| t009 | Closeout                                               | 15m | t008 — **DONE**         |

## Definition of done

Opening Merchants on a ledger with genuine subscriptions (e.g. a monthly rent or streaming payee) shows them in a pinned Recurring section with a cadence label, typical amount (flagged approximate when it varies), and next-expected date, with an overdue indicator when that date plus grace has passed; irregular payees (groceries, coffee) do **not** appear there. The merchant view offers "mark as recurring" / "mark as not recurring"; a manual choice always beats detection and survives an app restart. Detection logic is unit-tested against fabricated series. Light/dark verified; translation gate green; `yarn test` green.

## Fidelity note (anti-goal check)

Detection is **pure derived state** — recomputed from the ledger, nothing stored. Manual overrides are **device-local display preferences** (AsyncStorage-backed reactive var, keyed by ledger + payee), the same class of local state as theme and locale; the ledger is never written, so nothing here can silently mutate it or trap data in a proprietary format. If the owner later wants overrides to sync across devices, the beancount-native home is a `custom "recurring"` directive — recorded as inbox `032`, an owner decision, deliberately not assumed here. `@react-native-async-storage/async-storage` is already a dependency (m34) — **no new dependencies**.

## Source + Goal linkage

- **Source:** same `/pm` hand-off 2026-08-19. Monarch's model: one recurring stream per merchant behind a "Mark merchant as recurring" toggle (frequency / type / start date / amount / status), sync-time auto-detection (~80% community-reported accuracy) with a review queue, and a Recurring page (mobbin.com/screens/478aaf92-6a4d-461a-81f0-b3e0e3419f8f). We collapse the review queue into the pinned section + toggle; income-vs-expense is derived from postings rather than asked.
- **Goal linkage:** Pillar 3 (analytics & insights) — "what are my subscriptions, what's due next" is among the most-cited reasons users adopt Monarch-class apps. Pillar 4: strictly read-only against the ledger.
- **Expected outcome:** subscriptions and salaries surface themselves; a missed expected payment is visible at a glance.
- **Why now:** the research's headline capability and the reason this track exists; m35 supplies the directory surface and aggregation plumbing, m36 the per-merchant surface the toggle lives on — this is the payoff milestone of the sequence.

## Outcome note (2026-08-20)

**Shipped**

- Pure `detectRecurrence(series, today)` with weekly/biweekly/monthly/quarterly/yearly bands, MAD dispersion gate, approximate amounts, next-expected + overdue grace.
- Windowed `queryShell` series (`PAYEE_SERIES_WINDOW_MONTHS = 37` — tuned up from the task's ~15 so three yearly events fit; Expenses/Income legs only) mapped by `mapPayeeSeries` (sum same-day currency).
- Device-local `merchantRecurringOverrides` reactive var (AsyncStorage), `resolveRecurringVerdict` (override always wins), hydrated at splash.
- Merchants directory: pinned Recurring section (cadence, ~amount, next/overdue) + RECURRING badge on general rows; search reaches both; sort applies to general only.
- Merchant detail route with cadence chip + mark/unmark toggle; `merchants_tap_row` / `merchant_toggle_recurring` analytics.
- Shared `usePayeeRecurrence` hook so directory and detail do not fork series logic.

**Detection accuracy on `open_ledger/minimax`**

- MiniMax Group Inc. (Dec 31 yearly, 2023–2025 in window) → **yearly**, approximate amount (~465 MUSD median of varying year-end totals), next Jan 1 2027.
- Manual notRecurring override removed it from the pin immediately and survived restart; clearing the override restored detection.

**Verified**

- Simulator light + dark + Persian RTL (`tmp/m37/merchants-*.png`, `detail-*.png`).
- Toggle off → Recurring section gone; `yarn test` green (1474).

**Deliberately not built / follow-ups**

- Full m36 merchant stats + transaction history (scaffold only — enough for the recurring toggle). m36 remains open.
- Cross-device override sync via `custom "recurring"` (inbox `032`).
- Review queue UI beyond the pinned section + toggle.

**Screenshots:** `tmp/m37/merchants-light.png`, `merchants-dark.png`, `merchants-fa.png`, `detail-light.png`, `detail-toggled-off.png`, `merchants-after-unmark.png`.
