# w4 · m26 — Value Home and Accounts at market value, and say so on web and mobile

**Worker:** worker1 **Goal:** Home's Net Worth on web and mobile, and the mobile Accounts totals, value holdings at market (`at_value`) and say what each figure is: its basis, the date of the prices behind it, the holdings still valued at cost, and the cost basis beside it. Flows, journals and formal reports stay at cost. **Status:** done

## Valuation rule

The user decided this on 2026-09-26 in a PM review of the Home net-worth basis. For balances, it replaces rules 1 and 2 of [w4/m11](../../m11/README.md#display-rule). m11's rules 3–5 still hold: commodity accounts lead with units, nothing non-empty reads as zero, and totals name what they leave out.

1. **Balances are valued at market.** These read `conversion: "at_value"`: on web Home, Net Worth, Account balances and the assets and liabilities distribution charts; on mobile, Home, the Accounts tab, and the account detail header and chart.
2. **Flows and history stay at cost.** Web Home's Money movement, Income vs Expenses and Cash flow keep the existing `at_cost` overview read. Mobile Reports, every journal and every running balance keep `at_cost` (or `units`). Every web report page keeps its `At Cost` default and its selector.
3. **What `at_value` does** (`backend-cluster/ledger/src/foundation/rustledger/lot-inventory.ts`): a lot held at cost is valued at the latest price on or before the valuation date, quoted in its cost currency. A lot with no such price is valued at its cost, and a lot with no cost stays in its units. So a cash-only ledger reads exactly as before.
4. **A total that includes a held commodity says so.** It reads `At market value · prices as of <date>`, where `<date>` is the oldest of the latest prices used for the held, priced commodities. A total is only as fresh as its stalest price. When `<date>` is more than 7 days older than the figure's own date (or today, if that is earlier), the label reads `prices as of <date>, may be out of date`. A total that holds no commodity carries no basis label.
5. **Holdings valued at cost for lack of a price are named**, for example `At cost, no price: 1,000 STARTUP`. Holdings the operating-currency total cannot express keep m11's `Not in total: -13 VACHR`.
6. **The cost basis stays visible** beside Net Worth whenever it differs from the market value, for example `Cost $106,826.05 · Unrealized +$10,823.44`.
7. **Commodity rows keep leading with units** (m11 rule 3). Their secondary figure reads `$X at market` when the commodity has a price and `$X at cost` when it fell back to cost.

Every input already exists, so no API changes are needed:

- **Held commodities:** a `units` read of the same balance sheet.
- **Cost basis:** an `at_cost` read. On web, that is the existing overview query.
- **Price dates:** `getLedgerCommodities`. A pair matches in either direction with the operating currency, as the ledger's price map does.

A managed feed's minute-level freshness stays on the web Commodities page ([w2/m32](../../../w2/done/m32/README.md)). Home uses the price dates instead, so a daily valuation does not flip between fresh and stale within a day.

## Tasks (in order)

| id   | title                                                                     | est | depends_on       |
| ---- | ------------------------------------------------------------------------- | --- | ---------------- |
| t001 | Mobile: read balances at market and derive what each total discloses — **DONE** | 60m | —                |
| t002 | Mobile Home: basis, price date, cost-valued holdings and the cost basis — **DONE** | 45m | t001             |
| t003 | Mobile Accounts and account detail: market totals and per-row basis — **DONE** | 45m | t001             |
| t004 | Web Home: read balances at market, keep flows at cost — **DONE**          | 45m | —                |
| t005 | Web Net Worth card: the missing basis and price hint — **DONE**           | 45m | t004             |
| t006 | Verify on the public example ledgers against BQL — **DONE** | 45m | t002, t003, t005 |
| t007 | Adoption surface — **DONE** | 25m | t006             |
| t008 | Simplify — **DONE** | 25m | t007             |
| t009 | Test coverage — **DONE** | 45m | t007             |
| t010 | Closeout — **DONE** | 15m | t008, t009       |

## Definition of done

- On `open_ledger/example`, web Home's Net Worth equals BQL `sum(value(position))` over Assets and Liabilities in USD to the cent. Its cost line equals `sum(cost(position))`, and its unrealized figure is the difference. Mobile Home and the mobile Accounts `Assets` and `Liabilities` roots show the same figures.
- That Net Worth reads `At market value`, names the price date the rule defines, and flags it as possibly out of date, since the example's prices end on 2017-09-08. `-13 VACHR` stays named as not in total. A holding with a cost but no price reads as at cost. This is covered by unit tests on a synthetic balance, because the example ledger prices every holding it has.
- A cash-only ledger (`open_ledger/minimax`, or a synthetic control) shows the same figures as before and no basis label.
- These read the same figures as before this milestone: web Money movement, Income vs Expenses and Cash flow; mobile Reports; every journal. The web report pages still default to `At Cost`.
- A priced commodity row (`597.748 RGAGX`) shows its market value labelled `at market`, and its account detail header agrees with the row.
- The new strings exist in all 13 mobile locales and all 15 dashboard overview locales, and mobile's locale-integrity suite passes.
- These checks pass: `yarn format:check`, `yarn lint`, `yarn typecheck` and `yarn test:unit` in `mobile/`; `yarn format:check`, `yarn lint`, `yarn test` and `yarn build` in `dashboard/`.
- Observed on screen: web Home at 390px and 1440px in light and dark, and mobile Home and Accounts on the simulator in both themes.

## Source + Goal linkage

- **Source:**
  - The user's decision on 2026-09-26, after a PM review found that "Net Worth at cost" is the wrong default for a personal-finance headline. The review also found that web Home states no basis at all and ignores the conversion a reader picks on the report pages.
  - It supersedes m11's display rules 1–2 for balances. It folds in [w4/027](../../README.md#dropped) (the valuation-basis question, now settled on its option 2, value at market and disclose) and [w4/068](../../README.md#dropped) (the cost/market/units toggle, no longer planned because the cost basis shows beside the market figure).
- **Goal linkage:**
  - **A2 — Frictionless onboarding:** a newcomer's first Net Worth matches what their brokerage shows, instead of reading about 10% low with nothing on screen to explain why.
  - **A3 — Community & distribution:** the public example ledgers are the showcase, and they now show market values with honest price dates.
  - It also delivers the "current net worth" that [PRFAQ002](../../../../docs/prfaqs/PRFAQ002-include-live-price.md) promises to Include Live Price users.
- **Expected outcome:** anyone with priced holdings sees their net worth at market on both clients, with the date of the prices behind it and the cost basis and unrealized gain beside it. Cash-only ledgers see no change, and the accounting reports stay at cost.
- **Why now:**
  - [w2/m31](../../../w2/done/m31/README.md) and [w2/m32](../../../w2/done/m32/README.md) shipped managed live prices. That removes the stale-price objection behind m11's decision.
  - m11's on-screen check and its store images have not run yet. Changing the basis now avoids verifying and regenerating them twice.
  - Web Home has no basis hint at all today.
- **Adoption surface:** included. The milestone changes what users see on Home (both clients) and in mobile Accounts, and the product tour and store screenshots show Home's Net Worth.

## Evidence

Carried from [w4/027](../../README.md#dropped), which was dropped into this milestone:

- **`puncsky/example`, 2026-09-13, HEAD `038faeeb`:** Home read `$106,723.05`, which is exactly `sum(cost(position))` over Assets and Liabilities. Assets `sum(value(position))` is `USD 125,669.83828`, so net worth at the ledger's own latest prices is `$117,546.49`: `$10,823.44`, or 10.1%, above the figure shown.
- **Prices in that ledger:** `#prices` holds 141 points each for `GLD`, `ITOT`, `RGAGX`, `VBMPX`, `VEA` and `VHT`, from 2015-01-02 to 2017-09-08. `VACHR` and `IRAUSD` carry no price and no cost.
- **`open_ledger/example`, 2026-09-15 ([m11 implementation evidence](../../m11/README.md#implementation-evidence)):** Home read `$106,826.05` at cost, with the note `Not in total: -13 VACHR`.
- **Current code:** web Home hard-codes `conversion: "at_cost"` in `dashboard/src/features/reports/overview/constants.ts`, and its Net Worth card describes itself only as "Assets plus liabilities over the last 12 months". Mobile hard-codes `BALANCE_CONVERSION = "at_cost"` in `mobile/src/common/balance-util.ts`.

## Verification record

Observed 2026-09-26, read-only. BQL came from `queryShell` against production, the web from this checkout's dashboard dev server (proxied anonymously to production), and mobile from this checkout's bundle in the simulator's signed-in Expo Go session (iPhone 17 Pro, iOS 26.5). The simulator's active ledger was restored afterwards.

**BQL ground truth** (`sum(value(position))`, `sum(cost(position))` over Assets and Liabilities):

| ledger | market (USD) | cost (USD) | notes |
| --- | --- | --- | --- |
| `open_ledger/example` | 117,649.48828 | 106,826.04944 | `-13 VACHR` has no cost; every price ends 2017-09-08 |
| `open_ledger/crypto-example` | 194,307.622788 | 194,405.2188007 | `AETH`, `CUSDC`, `STETH` and `WETH` prices end 2026-09-15 |
| `open_ledger/minimax` | 1,346.683 MUSD | 1,346.683 MUSD | cash only |

**Observed:**

- **Web Home, `open_ledger/example`, 1440px light:** `117,649.488 USD` and `-13 VACHR`, then `⚠ At market value · Prices as of Sep 8, 2017 may be out of date`, then `Cost basis 106,826.049 USD · Unrealized +10,823.439 USD`. The Accounts card lists RGAGX at `48,471.385 USD` (market).
- **Web Home, `open_ledger/example`, 390px dark:** the same content, wrapped, with no horizontal scroll (`scrollWidth` 390).
- **Web Home, `open_ledger/crypto-example`:** `Prices as of Sep 15, 2026 may be out of date`, `Cost basis 194,405.219 USD`, `Unrealized -97.596 USD`.
- **Web Home, `open_ledger/minimax`:** no basis line.
- **Mobile Home, `open_ledger/example`:** caption `At market value · prices as of Sep 8, 2017, may be out of date · Not in total: -13 VACHR`, figure `$117,649.49`, line `Cost $106,826.05 · Unrealized +$10,823.44`.
- **Mobile Accounts, `open_ledger/example`:**
  - Roots: `Assets $120,352.78` + `Liabilities -$2,703.29` = `$117,649.49`, which agrees with Home. The Assets root carries the basis note.
  - Flows at cost: Income and Expenses keep their cost figures with `Not in total` notes.
  - Rows: `RGAGX` reads `597.748 RGAGX · $48,471.39 at market` (through the shipped selectors on live data, t003), and `US:Hoogle:Vacation` reads `-13 VACHR`.
- **Mobile Home, a cash-only MUSD ledger:** `11,764.00 MUSD`, the same figure as before this change and with no caption. The same screen on the pre-change bundle read `At cost`.
- **Holding with a cost but no price:** covered by unit tests on both clients (`mobile/src/common/__tests__/valuation.test.ts`, `dashboard/.../lib/__tests__/net-worth-valuation.test.ts`), since no public ledger has one.
- **Gates:** mobile `format:check`, `lint`, `typecheck` and `test:unit` (1924) pass; dashboard `format:check`, `lint`, `test` (4902) and `build` pass.
- **Mobile Home, `open_ledger/example`, dark theme:** the same caption, figure and cost line, legible on the dark card. The app's theme setting was switched to dark for the check and restored to light.
- **Tests catch rule breaks:**
  - Setting `VALUATION_CONVERSION` back to `at_cost` fails 1 mobile test.
  - Removing the stale check fails 6 mobile and 3 dashboard tests.
- **Not exercised:** Android.

## Simplify record (t008)

Four review passes (reuse, simplification, efficiency, altitude) ran over the changed code.

**Applied:**

- The mobile price read is now cache-first. `invalidateLedger` evicts it after writes, so a tab visit no longer re-downloads the whole price history.
- The mobile selector drops a dead units guard and takes `cost` as optional, so two callers no longer pass `cost: undefined`.
- The web valuation query no longer fetches unused price values.
- The web card's stale branch now makes one `t()` call.

After these, every gate passes again: mobile 1924 tests, dashboard 4902 tests, and the build.

**Deferred as not behavior-preserving or out of scope:**

- **Scoping the cost and units history reads to the latest point with `time`:** that changes the clamp semantics.
- **Moving `parseLedgerDay` into mobile `common/`:** it is a refactor outside this diff.
- **Account detail:** it reads the whole trial balance to match its units header to the Accounts row. A mixed-holding account's money header still uses the account report's own last point, so it can differ from its row. Making the header come from the row everywhere is a follow-up.
- **The "held at cost" rule:** mobile compares with the market map and web with the cost map. Both give the same result, because the ledger service converts the same lots either way.
