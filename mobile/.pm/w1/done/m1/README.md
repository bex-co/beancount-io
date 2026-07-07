# w1 · m1 — Monarch-style dashboard home

**Worker:** worker1 **Goal:** Turn the home tab into a scannable, card-based dashboard — a swipeable chart card (net worth ↔ spending-by-category ↔ liabilities), a recent-transactions glimpse, and a this-vs-last-month spending chart — so users understand their money at a glance. **Status:** done

## Tasks (in order)

| id   | title                                                              | est | depends_on       | status     |
| ---- | ------------------------------------------------------------------ | --- | ---------------- | ---------- |
| t001 | DashboardCard container + card-based home layout skeleton          | 45m | —                | — **DONE** |
| t002 | PagedCarousel component (horizontal pager + dot indicator)         | 40m | —                | — **DONE** |
| t003 | Swipeable account-charts card (net worth / category / liabilities) | 50m | t001, t002       | — **DONE** |
| t004 | Recent-transactions glimpse card                                   | 40m | t001             | — **DONE** |
| t005 | Spending card — this month vs last month                           | 50m | t001             | — **DONE** |
| t006 | UX pass — light/dark, i18n, loading bg, safe area, analytics       | 40m | t003, t004, t005 | — **DONE** |
| t007 | Simplify pass over dashboard code                                  | 30m | t006             | — **DONE** |
| t008 | Unit tests for dashboard selectors + behavior                      | 40m | t006             | — **DONE** |

## Definition of done

Opening the home tab renders a card-based dashboard where:

1. the **top card is horizontally swipeable** across ≥3 pages with a dot page indicator — page 1 net worth line chart, page 2 spending-by-category, page 3 liabilities;
2. a **"Recent transactions" card** shows the latest few entries and a "see all" affordance that navigates to the journal tab;
3. a **spending card** compares this month vs last month;

all rendered correctly in **light and dark**, strings localized via `useTranslations()` from the English base, loading skeletons with background colors, `SafeAreaView` spacing, and analytics on mount. `yarn test:unit` is green.

## Source + Goal linkage

- **Source:** `/pm` request + two Monarch dashboard reference screenshots (`~/Downloads/IMG_0730.PNG`, `~/Downloads/IMG_0732.PNG`) — "refactor the home screen to a dashboard collecting account charts (swipe to category sum, liabilities sum), transactions in a glimpse, spending charts … learn from monarch."
- **Goal linkage:** Pillar 3 **Analytics & insights** (net worth, spending trends, breakdowns at a glance) — primary; reinforced by the cross-cutting quality bar (delightful in light **and** dark, localized).
- **Expected outcome:** beancount.io users open the app to an at-a-glance financial picture — swipe one card across net worth, spending categories, and liabilities; skim recent activity; see whether they are spending more than last month — without leaving home or opening a spreadsheet.
- **Why now:** Home is the app's front door, and today it's a flat stack of raw numbers that buries insight. The charting/paging stack (`react-native-pager-view`, `react-native-svg`, `d3`, existing `BarChartD3`/`LineChartD3`) is already installed, so this is unblocked, additive, and high-leverage — no new dependencies.
