# w4 · m27 — Say which prices are stale, and only when they are

**Worker:** worker1 **Goal:** Net Worth's headline stays quiet when every price is current. It names stale prices by count and oldest date, judged per holding by how that holding is normally priced, and the detail (each holding's price date, what is valued at cost or left out, and how to update) sits one tap away. **Status:** done

## Display rule

The user decided this on 2026-09-26 after a design review of [m26](../m26/README.md). It replaces m26's rule 4, which put a price date on every headline. The review found two problems. On `open_ledger/crypto-example`, the oldest price date across all holdings made BTC, priced 9/26, read as "as of Sep 15". And listing tickers in the headline would outweigh the figure itself.

1. **Headline status line, at most one line.** The line always starts with `At market value`, and three optional items can follow it:
   - `N prices not updated since <oldest stale date>`, with the warning icon, only when some holding is stale;
   - `N at cost (no price)`;
   - `N not in total`.

   A total that holds no commodity still carries no status line. The cost and unrealized line from m26 rule 6 is unchanged.
2. **Detail on demand.** The status line opens a detail view: a bottom sheet on mobile, a popover on web. It lists every held commodity with its latest price date, marks the stale ones and the ones at cost or not in total, and ends with one action: open the ledger's Commodities page on web to add prices or connect a live price.
3. **Staleness is judged per holding.** A holding is stale when `age = min(figure date, today) − its latest price date` exceeds its own threshold:
   - **Managed feed** (a `getLedgerManagedPrices` source for the commodity and the operating currency, in either direction): stale when `age > 3` days, which leaves room for a weekend on future stock feeds, or when the feed reports `unavailable` and `age ≥ 1`. Minute-level `stale` is ignored on Home.
   - **Ledger-authored prices:** the cadence is the median gap, in days, between the last 10 price dates on or before the latest one; a holding with fewer than 3 points gets a cadence of 7. It is stale when `age > max(7, 3 × cadence)`, so a daily price that stops for over a week is flagged while a monthly or yearly valuation is not.
4. **Wording states facts, not verdicts.** The status line says "not updated since <date>", never "wrong" or "stale".

Out of scope for now: a holding's share of net worth in the warning (it needs price values, which neither client fetches); reading `price:` metadata on `commodity` directives.

## Tasks (in order)

| id   | title                                                              | est | depends_on |
| ---- | ------------------------------------------------------------------ | --- | ---------- |
| t001 | Mobile: per-holding staleness, compact status, detail sheet — **DONE** | 60m | —          |
| t002 | Web: per-holding staleness, compact status, detail popover — **DONE** | 60m | —          |
| t003 | Verify on the example, crypto-example and cash-only ledgers — **DONE** | 30m | t001, t002 |
| t004 | Adoption surface — **DONE** | 15m | t003       |
| t005 | Simplify — **DONE** | 20m | t004       |
| t006 | Test coverage — **DONE** | 30m | t004       |
| t007 | Closeout — **DONE** | 10m | t005, t006 |

## Definition of done

- On `open_ledger/crypto-example`, the headline reads only `At market value`. Its nine managed feeds (BTC, ETH and others) are priced on 2026-09-26. AETH, CUSDC, STETH and WETH were last priced on 2026-09-15, but they are hand-priced about every 42 days, so 11 days is within their cadence and they are not flagged. The detail view lists every holding with its own date. This is the case that motivated the milestone: BTC no longer reads as "as of Sep 15".
- On `open_ledger/example`, every price stops on 2017-09-08. The headline reads `At market value · 6 prices not updated since Sep 8, 2017 · 1 not in total`, and the detail view lists `-13 VACHR` as not in total.
- A ledger whose prices are all current shows only `At market value`, and a cash-only ledger shows no status line.
- Unit tests pin the thresholds: a daily price stopped 8 days ago is stale; a monthly price 40 days old is not; a managed price 2 days old is not, and 4 days old is; fewer than 3 points uses a cadence of 7.
- The new strings exist in all 13 mobile locales and all 15 dashboard overview locales, and every gate in both packages passes.
- Observed on screen on web (390px and 1440px, light and dark) and mobile (Home, the detail sheet, and an Accounts root).

## Source + Goal linkage

- **Source:** the user's question on 2026-09-26 about why crypto-example read "as of Sep 15" when the BTC feed reaches 9/26, followed by the design review and staleness discussion that approved this rule.
- **Goal linkage:** **A2 — Frictionless onboarding:** a newcomer's Net Worth headline is calm when nothing is wrong, and when something is, it says exactly which prices to fix and where. A misleading date or a wall of tickers erodes trust in the figure. It also serves Include Live Price users, whose managed prices are judged on the feed's own terms.
- **Expected outcome:** readers can tell at a glance whether the figure needs attention, and can reach the holdings behind it and the page that fixes them in one tap.
- **Why now:** m26 just shipped the date rule, the public crypto example already shows the misleading headline, and the detail view is the natural home for the per-holding facts m26 had packed into one line.
- **Adoption surface:** included. The change alters what users see on Home on both clients.

## Verification record

**Web**, observed 2026-09-26 on this checkout's dashboard, reading production anonymously:

- **`open_ledger/example`, 390px dark:** amber `⚠ At market value · Prices not updated since Sep 8, 2017: 6 · Not in total: 1`. The popover lists GLD, ITOT, RGAGX, VBMPX, VEA and VHT at `Price Sep 8, 2017 · Not updated`, and VACHR at `No price · Not in total`, then `Update prices`. There is no horizontal scroll.
- **`open_ledger/crypto-example`, 1440px light:** the line reads only `At market value`. The popover lists nine holdings at `Price Sep 26, 2026 · Live price`, and AETH, CUSDC, STETH and WETH at `Price Sep 15, 2026` with no marker.
- **`open_ledger/minimax`:** no status line.
- **Console:** one hydration warning, from `QuickAskInput`'s input attributes. It is unrelated to this change.

**Mobile**, observed 2026-09-26 in this checkout's bundle on the simulator's signed-in Expo Go session (iPhone 17 Pro, iOS 26.5, app language Chinese). The session's active ledger and theme were restored afterwards.

- **`open_ledger/example`, Home, light theme:** `按市值计 · 6 个价格自 2017年9月8日 起未更新 · 1 项未计入合计`, then `$117,649.49`, then `成本 $106,826.05 · 浮动盈亏 +$10,823.44`. Tapping the line opens the sheet, which lists the six funds at `价格 2017年9月8日 ⚠ 未更新`, `-13 VACHR` at `未计入合计`, and the button `在网页上更新价格`.
- **`open_ledger/example`, Accounts:** the Assets root carries the same compact status line.
- **`open_ledger/crypto-example`, Home, dark theme:** only `按市值计 ›`, then `$194,558.92` (live prices move) and a cost line. The sheet lists nine holdings at `实时价格 · 2026年9月26日`, and AETH, CUSDC, STETH and WETH at `价格 2026年9月15日` with no marker.
- **Fixed during this check:**
  - **The sheet did not open.** A press inside the chart pager's pages never reached the status line; only the chart's native scrub gesture works there. The status line now renders in a new `header` slot of `SegmentedPages`, above the pager, and `InteractiveLineChart` is back to a plain text label.
  - **Page height floor:** the pager's floor returned to 240, since the status line no longer sits inside the page.
  - **Close label:** the sheet's close button used the `close` key, which is the Beancount `close` directive (`关户` in Chinese), so it now uses `done`.
- **Gates after the fixes:** `yarn format:check`, `yarn lint`, `yarn typecheck`, and `yarn test:unit` (1930) pass.

**Recorded deviation:** the dashboard's overview translation module has no plural forms, so web reads `Prices not updated since <date>: N` and `Not in total: N`, while mobile reads `N prices not updated since <date>` and `N not in total`.
