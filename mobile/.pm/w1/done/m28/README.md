# w1 · m28 — Home cards tap through; bad routes fall back

**Worker:** worker1 **Goal:** Every Home dashboard card that summarizes a deeper view is a door to it — with one shared, visible tap affordance and an analytics event per door — and a deep link that matches no route lands on `+not-found` instead of an unrecoverable black screen. **Status:** **done** 2026-08-18 — four Home cards are doors with one shared affordance and one event; an unmatched deep link is readable and recoverable in both themes; 1346 unit tests green

## Tasks (in order)

| id   | title                                                   | est | depends_on            |
| ---- | ------------------------------------------------------- | --- | --------------------- |
| t001 | Shared tap affordance in the `DashboardCard` header     | 30m | — — **DONE**          |
| t002 | Spending card taps through to `/reports`                | 25m | t001 — **DONE**       |
| t003 | Liabilities carousel page taps through to `/accounts`   | 35m | t001 — **DONE**       |
| t004 | One analytics event shape for card tap-throughs         | 20m | t002, t003 — **DONE** |
| t005 | Unmatched `(app)/(tabs)` deep link renders `+not-found` | 45m | — — **DONE**          |
| t006 | UX pass — light/dark, deep-link drive of every door     | 30m | t004, t005 — **DONE** |
| t007 | Simplify pass over the navigation diff                  | 25m | t006 — **DONE**       |
| t008 | Unit tests for tap guards and the event shape           | 35m | t006 — **DONE**       |

## Definition of done

The spending card opens Reports and the liabilities carousel page opens Accounts; the two cards that already navigated (recent transactions → Transactions, budget → Budget) now share the same header affordance instead of an unmarked tap. A card tap during a horizontal `PagedCarousel` swipe does not fire. Each tap-through emits one analytics event carrying a card identifier. Deep-linking a plausible-but-wrong route like `beancount:///(app)/(tabs)/index` shows the not-found screen with a way back — not a black screen recoverable only by relaunch. Correct in light and dark; `yarn lint` / `yarn typecheck` / `yarn test:unit` pass.

## Source + Goal linkage

- **Source:** inbox notes `w1/024` (what survives of the deleted m7, salvaged 2026-08-16) and `w1/026` (black-screen defect found verifying `w1/m22/t006`), promoted together during the 2026-08-17 board triage — bundled because they share one verification loop: drive the app by tap and deep link in the simulator and assert where it lands.
- **Goal linkage:** Pillar 3 **Analytics & insights** — the dashboard's summary cards become one-tap entries into the full Reports/Accounts views, closing the loop m1/m2/m3 opened; the route fallback serves the quality bar's "errors surfaced honestly".
- **Expected outcome:** a user who wants the story behind a Home number taps the card instead of hunting the tab bar; QA scripts and agents driving by deep link stop reading a typo as an app crash, and a future mistyped universal link strands no one.
- **Why now:** the 2026-08-16 state check found tap-through drift already underway — the recent-transactions card gained navigation while three cards still dead-end, and `budget-card` invented its own pattern. Landing the shared affordance now (t001) is what keeps the next card from inventing a third. `024`'s survivors went stale once already when the segment switcher was deleted; door-by-door they rot, as one milestone they ship.

## Design decisions (from the sizing pass)

- **No time-range param on the Reports push.** The Reports range is local state (`useState<TimeRange>` in `reports-screen.tsx`); carrying the card's compared month across means a route param + state seeding, deferred as out of scope until someone asks for it.
- **The chevron lives in the shared `DashboardCard` header** (`src/components/dashboard-card/index.tsx`), not per card — `budget-card.tsx` is the pattern to unify, not to copy.
