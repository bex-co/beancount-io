# w4 · m11 — Mobile says what a converted balance means: units for commodities, labelled cost basis, disclosed omissions

**Worker:** worker1 **Goal:** every balance the mobile app shows for a ledger that holds commodities says what it is — a commodity account shows its recorded units, a converted total says it is at cost, and a holding that cannot be converted is named instead of reading `$0.00` or vanishing from Net Worth **Status:** done

## Blocked

**Unblocked 2026-09-26.** A signed-in app session is available: the simulator's Expo Go session runs this checkout's bundle. It is the same path w4/m26 and w4/m27 used for their on-screen checks. The work continues from t005.

## Display rule

Decided 2026-09-15, when the user approved `/pm-brainstorm for w4` item 2. It resolves the open question that blocked [w4/016](../../blocked/016.md) and w4/027. Every task applies it to the Accounts tree, the account detail header, journal rows, the running balance, and Home's Net Worth together, so the screens keep agreeing.

1. **Totals stay at cost.** `BALANCE_CONVERSION` stays `"at_cost"`. Operating-currency totals do not change, and the Accounts tree and Home keep agreeing to the cent.
2. **Converted totals state their basis.** Home's Net Worth and the Accounts totals carry an "at cost" label.
3. **Commodity accounts lead with units.** An account holding a commodity other than the operating currency shows its recorded units (`597.748 RGAGX`) as the primary figure. Its cost amount, when it has one, is secondary and labelled as cost.
4. **A non-empty account never reads as zero.** A commodity with no cost currency (`-8 VACHR`) shows its units and stays distinguishable from a genuinely empty account.
5. **Totals disclose what they leave out.** A parent, a root, or Net Worth whose holdings include commodities it cannot express in the operating currency names them, reusing the merchant header's one-line-per-currency shape (`merchant-detail-screen.tsx`, `totalsByCurrency`).

Not part of this rule: a cost / market value / units toggle (w4/068, dropped 2026-09-26 in favour of [w4/m26](../m26/README.md)); converting the Transactions list, which keeps its recorded scale (`w3/done/109`); any change to the ledger itself.

## Tasks (in order)

| id   | title                                                                                               | est | depends_on |
| ---- | --------------------------------------------------------------------------------------------------- | --- | ---------- |
| t001 | Fetch units beside cost and decide each balance's display in one selector — **DONE** | 60m | —          |
| t002 | Show commodity units and disclose unconverted holdings in the Accounts tree — **DONE** | 50m | t001       |
| t003 | Apply the rule to the account detail header, journal rows, and running balance — **DONE** | 60m | t001       |
| t004 | Label the cost basis and name excluded holdings on Home's Net Worth and the Accounts totals — **DONE** | 40m | t002       |
| t005 | Verify the rule on the public example ledgers against BQL — **DONE** | 40m | t003, t004 |
| t006 | Adoption surface — **DONE** | 25m | t005       |
| t007 | Simplify — **DONE** | 25m | t006       |
| t008 | Test coverage — **DONE** | 45m | t006       |
| t009 | Closeout — **DONE** | 15m | t007, t008 |

## Definition of done

- A commodity account held at cost (`Assets:US:Vanguard:RGAGX` shape) shows `597.748 RGAGX` as its primary figure, with its cost amount visibly labelled as cost, in the Accounts tree and the account detail header. Its journal rows show the units change first and the cost amount second.
- A commodity with no cost currency (`Assets:US:Hoogle:Vacation`, `-8 VACHR`) shows its units and is distinguishable from a genuinely empty account.
- Every parent or root whose subtree holds unconvertible commodities names them (for example `Assets`, `Income`, `Expenses`, and `Expenses:Taxes:Y2015:US` with its `IRAUSD` child). Home's Net Worth names the holdings it excludes.
- Home's Net Worth card and the Accounts totals state "at cost" in all 13 shipped locales, and the locale-integrity suite passes.
- Operating-currency totals are unchanged: on the public example ledgers they match BQL `sum(cost(position))` to the cent, Accounts and Home agree, a plain USD account renders as before, and the Transactions list keeps its recorded scale.
- `yarn format:check`, `yarn lint`, `yarn typecheck`, and `yarn test:unit` pass in `mobile/`, with tests covering a commodity held at cost, a multi-lot holding at different costs, a commodity with no cost currency, an empty account, and a USD-only control.

## Source + Goal linkage

- **Source:** promoted from [w4/016](../../blocked/016.md) (native QA, 2026-09-13, major) with w4/027 folded in (the valuation-basis decision). Both were blocked on a display decision, which the user made by approving `/pm-brainstorm for w4` item 2 on 2026-09-15. w4/016 stays in the open tree as evidence until closeout, following the `w3/038` precedent. w4/027 was dropped into [w4/m26](../m26/README.md) on 2026-09-26, when the user reversed its valuation decision.
- **Goal linkage:** **A2 — Frictionless onboarding:** a newcomer's first look at their balances and net worth is truthful, instead of a number 10% below their brokerage with no explanation, or a real holding shown as `$0.00`. **A3 — Community & distribution:** the public example ledgers, including `open_ledger/crypto-example`, are the app's showcase, and today they misrepresent what they hold.
- **Expected outcome:** a mobile user holding investments, crypto, or non-money commodities can read every account and total without cross-checking BQL. Each figure says whether it is units or cost, and nothing non-empty reads as zero.
- **Why now:** showing a real balance as `$0.00` and silently dropping it from Net Worth is a correctness defect, not polish. Triage already traced the cause to the client's own `BALANCE_CONVERSION = "at_cost"` request, so the change is mobile-only, and the display decision was the only blocker. The merchant header already renders one line per currency, so the shape exists in the app.
- **Adoption surface:** included. This changes what users see on the Accounts, account detail, and Home screens, and the mobile product tour and store screenshots show Home's Net Worth.

## Evidence

Reproductions, BQL results, and the screenshot index live in [w4/016](../../blocked/016.md), and w4/027's valuation evidence now lives in [w4/m26](../m26/README.md#evidence). In short, from the Beancount example ledger at HEAD `038faeeb`:

- `RGAGX` holds `597.748 RGAGX` and is shown only as `$49,049.67`, which is exactly `sum(cost(position))`.
- `Hoogle:Vacation` holds `-8 VACHR` and is shown as `$0.00`, the same as the genuinely empty `Federal:PreTax401k`.
- The `Assets`, `Income`, and `Expenses` roots carry `VACHR` and `IRAUSD` that the tree never mentions. `Expenses:Taxes:Y2015:US` omits an `18000 IRAUSD` pre-tax 401(k) child.
- Net Worth is `$106,723.05` at cost. The same ledger's latest prices value it at `$117,546.49`, and nothing on screen says which basis is shown.

## Implementation evidence

- **Where the rule lives:** `mobile/src/common/balance-display.ts` decides whether a balance reads in units or money and carries its cost and not-in-total notes. `formatUnits` and `amountScale` live in `mobile/src/common/number-utils.ts`. The shared tree builder gained an opt-in `wholeBalance` rule, used only by the Accounts tab, so a balance of unconverted commodities is kept and a chain folds only when those holdings match; Reports is unchanged. Account detail reads its report and journal in `units` for a commodity account and computes each row's cost from its postings. Home captions every figure "At cost" and names what a total leaves out. Four new strings are in all 13 locales, and `accountBalance` is gone.
- **Live public data, through the shipped selectors (2026-09-15):**

| ledger | row | reads as |
| --- | --- | --- |
| `open_ledger/example` | `Assets:US:Vanguard:RGAGX` | `597.748 RGAGX`, note `$49,049.67 at cost` |
| `open_ledger/example` | `Assets:US:Hoogle:Vacation` | `-13 VACHR` (kept in the tree; was `$0.00`) |
| `open_ledger/example` | `Assets` root | `$109,529.34`, note `Not in total: -13 VACHR` |
| `open_ledger/example` | `Expenses:Taxes:Y2015:US` | `$53,758.01`, note `Not in total: 18,000 IRAUSD` |
| `open_ledger/example` | RGAGX journal, 2017-08-14 | `+1.843 RGAGX` costing `$150.02`; day total `+5.528 RGAGX` |
| `open_ledger/example` | Home net worth | `$106,826.05` at cost, note `Not in total: -13 VACHR` |
| `open_ledger/example` | `Assets:US:BofA:Checking` detail | unchanged money figure |
| `open_ledger/crypto-example` | `Assets:Staking:Lido:STETH` | `0.515 STETH`, note `$1,694.75 at cost` |

- **Not exercised:** the rendered screens, dark mode, enlarged text, VoiceOver, Android, and the Home pager's caption height. These are t005.
