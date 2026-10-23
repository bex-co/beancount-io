# Net Worth loses a recorded unit before display and comparison

**Minor financial accuracy.** Report-only QA on production https://beancount.io,2026-10-22, owned isolated headless Chromium155.0.8059.85, English/light/UTC, anonymous public-example shell. These balances are **explicit locally modeled reads**, not a claim about wealth in the public ledger. No hosted ledger write or product implementation occurred.

## Valid producer and native reproduction

Three isolated balanced Beancount ledgers use an Assets cash account and Equity counterpostings. Both independent Beancount3.2.3 and the current ledger's actual accountBalanceSeries return zero errors and these exact monthly USD strings:

| Case | Jan31,2016 | Feb29,2016 | Exact change |
| --- | --- | --- | --- |
| Increase | 9007199254740992 | 9007199254740993 | +1 |
| Safe control | 9007199254740990 | 9007199254740991 | +1 |
| Decrease | 9007199254740993 | 9007199254740992 | −1 |

1. Fresh-load public Example Journal with time=2016, then follow its native Overview link. Clone only successful HTTP200 GetLedgerOverview and GetLedgerOverviewValuation responses, replacing their Net Worth series with the exact producer points. Market/held series receive the same points; unrelated cards/valuation details are unasserted.
2. Native **Show table** opens the named monthly alternative. At both fresh390×844 and1440×1000, Increase shows **9,007,199,254,740,992.00 USD** in the headline and in **both** January and February rows. The change reads **0.00 USD**, instead of the exact993 ending amount and **+1.00 USD**.
3. Independent fresh controls at both widths use the safe pair. They show distinct990/991 monthly amounts, headline991 and **+1.00 USD** correctly.
4. A fifth fresh desktop context uses Decrease. Both table rows become992 and the change is again **0.00 USD**, hiding the real one-dollar loss. No percentage behavior or chart-coordinate precision is claimed.

All ten cloned reads return upstream HTTP200 without GraphQL errors, and each overridden point pair equals both independent producer controls exactly. An additional genuine read-only BQL query, SELECT date,9007199254740993.00 AS exact_total LIMIT1, returns dtype Decimal and exact string **9007199254740993.00**. A fresh390px BQL page and its actual native CSV download both retain that exact value; Python csv.reader independently confirms the exported second column. Preserve this working path. The separate unsuffixed integer-literal probe reaches the already documented [W3/157](../../../w3/done/157.md) representation guard; it is excluded, not another API finding.

## Cause and bounded fix

- overview/lib/unit-amounts.ts:27–29 converts every value through Number in toFiniteAmount.
- overview/lib/overview-utils.ts:139–156 discards the original decimal in getBalanceAmounts and returns CurrencyAmount.value:number. Both unsafe amounts consequently become9007199254740992.
- overview/components/formatted-amounts.tsx:25–28 formats that already-rounded value for the headline and table. NetWorthCard around284–299 also subtracts the rounded .value fields. A later format or increased fraction count cannot recover the lost integer.
- The common format-number.ts API itself accepts numbers. Retain an exact text/arithmetic representation and support the required locale/currency display without an early double conversion; reuse existing exact-decimal helpers and coordinate with1001. Keep numeric chart coordinates separate. Do not refuse an otherwise valid ledger amount or add a dependency.

getBalanceAmounts also feeds Overview hierarchy/movement helpers; FormattedAmounts is shared across its cards. Audit their compatibility when carrying exact source text, without expanding this reproduced scope to unverified metrics or migrating every chart model. Preserve malformed-value handling, signs, grouping, table/view semantics and the separate993 currency guard.

## Dedupe and source

All board states and targeted helper history were searched for unsafe integers, exact/rounded Net Worth, getBalanceAmounts, CurrencyAmount and monthly change precision. [1001](../1001.md) owns LineChart's independent Number-only period/tooltip path; [1007](../1007.md) owns a fixed-scale Holdings average. Neither fixes this source decoder or subtraction. [W0/010](../../../w0/done/010.md)'s consistent USD minor-unit policy stays intact: this is a lost integer before rounding. [W3/627](../../../w3/done/627.md) formats floating arithmetic residue in three other Overview tables. This is one new producer-decoder/consumer finding, not a reopening of those tasks.

The actually loaded ledger._ledgerOwner._ledgerName.index-Dt5Wt5tH.js.map matches complete current unit-amounts.ts (**055d2224d9311f62b3b809aa22ecb01d82155346b4744cee6737b9c02ea6a085**), overview-utils.ts (**a20e47a63fe13026773c14778dbcf6179ab0d14a4d95bd6b7f96f84f58f3c489**) and formatted-amounts.ts (**b2b6b6f016d089f201b47ca1df385f6f7673c3c2d63c0eca6fb7ce75d3d8e4c9**) at inspected main42fcb0a90 and the working tree. The served full NetWorthCard hash is04572c8e53963516bb0a8974f76041ebd0fd4401c72c0f3d15e4f8b1fc109cfe; whole-card equality is not claimed. Its getBalanceAmounts inputs and .value subtraction remain in served, committed and working source despite formatter consolidation and ongoing993 guard work. Preserve that work; no full deployment revision is inferred.

## Evidence and cleanup

Ignored dashboard/tmp/qa-20261020/dashboard-loop/ contains overview-large-net-worth-complete-controls.json, its -independent-control.json, -producer-control.json, -api-control.json, -source-verification.json and -card-source.diff companions; three valid ledgers in overview-large-net-worth/; and overview-large-net-worth-precision_increment-{390,1440}.png plus the desktop decrement image. The genuine BQL control is in overview-large-net-worth-bql-native-control.json and -bql-control.csv. The desktop increase image was visually inspected. Five retained contexts, one exploratory context, one source-only context and one BQL control context are closed; all response overrides are context-local and gone, root context only. Zero mutation attempts, hosted writes, route errors or page exceptions. Actual public-ledger large balances, other currencies/locales/engines, screen-reader speech and repaired behavior remain unverified. No product tests or fixes were authored.
