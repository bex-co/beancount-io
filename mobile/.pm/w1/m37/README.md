# w1 · m37 — Recurring merchants: detection and grouping

**Worker:** worker1 **Goal:** merchants with a steady cadence surface automatically in a pinned "Recurring" section of the directory — frequency, typical amount, next-expected date — and the user can mark or unmark any merchant by hand, Monarch's core recurring mechanic without its server. **Status:** todo

## Tasks (in order)

| id   | title                                                  | est | depends_on       |
| ---- | ------------------------------------------------------ | --- | ---------------- |
| t001 | `detect-recurrence` pure selector                      | 60m | —                |
| t002 | Windowed per-payee series fetch                        | 45m | t001             |
| t003 | Device-local recurring overrides store                 | 30m | —                |
| t004 | Recurring section + badges in the directory            | 45m | t001, t002, t003 |
| t005 | Mark/unmark toggle + cadence chip in the merchant view | 30m | t003, t004       |
| t006 | UX pass (light/dark, RTL, translations, analytics)     | 30m | t005             |
| t007 | Simplify pass over the milestone's diff                | 30m | t006             |
| t008 | Test coverage for detection edge cases                 | 60m | t006             |
| t009 | Closeout                                               | 15m | t008             |

## Definition of done

Opening Merchants on a ledger with genuine subscriptions (e.g. a monthly rent or streaming payee) shows them in a pinned Recurring section with a cadence label, typical amount (flagged approximate when it varies), and next-expected date, with an overdue indicator when that date plus grace has passed; irregular payees (groceries, coffee) do **not** appear there. The merchant view offers "mark as recurring" / "mark as not recurring"; a manual choice always beats detection and survives an app restart. Detection logic is unit-tested against fabricated series. Light/dark verified; translation gate green; `yarn test` green.

## Fidelity note (anti-goal check)

Detection is **pure derived state** — recomputed from the ledger, nothing stored. Manual overrides are **device-local display preferences** (AsyncStorage-backed reactive var, keyed by ledger + payee), the same class of local state as theme and locale; the ledger is never written, so nothing here can silently mutate it or trap data in a proprietary format. If the owner later wants overrides to sync across devices, the beancount-native home is a `custom "recurring"` directive — recorded as inbox `032`, an owner decision, deliberately not assumed here. `@react-native-async-storage/async-storage` is already a dependency (m34) — **no new dependencies**.

## Source + Goal linkage

- **Source:** same `/pm` hand-off 2026-08-19. Monarch's model: one recurring stream per merchant behind a "Mark merchant as recurring" toggle (frequency / type / start date / amount / status), sync-time auto-detection (~80% community-reported accuracy) with a review queue, and a Recurring page (mobbin.com/screens/478aaf92-6a4d-461a-81f0-b3e0e3419f8f). We collapse the review queue into the pinned section + toggle; income-vs-expense is derived from postings rather than asked.
- **Goal linkage:** Pillar 3 (analytics & insights) — "what are my subscriptions, what's due next" is among the most-cited reasons users adopt Monarch-class apps. Pillar 4: strictly read-only against the ledger.
- **Expected outcome:** subscriptions and salaries surface themselves; a missed expected payment is visible at a glance.
- **Why now:** the research's headline capability and the reason this track exists; m35 supplies the directory surface and aggregation plumbing, m36 the per-merchant surface the toggle lives on — this is the payoff milestone of the sequence.
