# w4 · m53 — Keep exact amounts in Overview distributions

**Worker:** worker1 **Goal:** commodity amounts in pie/bar hover text and Breakdown reconcile with the ledger's decimals **Status:** todo

Minor financial-display residual of [1015](../done/1015.md), independently proven in the distribution pipeline. Approximately3h across data/grouping, renderers and verification; this exceeds the inbox-note threshold. See [FINDINGS](./FINDINGS.md).

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| [t001](./t001.md) | Carry exact distribution amounts through grouping | 40m | — |
| [t002](./t002.md) | Format pie/bar tooltips and Breakdown from exact amounts | 45m | t001 |
| [t003](./t003.md) | Repeat producer-backed native distribution controls | 20m | t002 |
| [t004](./t004.md) | Adoption surface | 15m | t003 |
| [t005](./t005.md) | Simplify | 15m | t004 |
| [t006](./t006.md) | Test coverage | 30m | t004, t005 |
| [t007](./t007.md) | Closeout | 10m | t006 |

## Definition of done

- [ ] The producer-backed BTC bar case reads4.00995BTC and−0.00001BTC in Breakdown, and the actual main-bar hover retains4.00995.
- [ ] The BTC pie case reads9007199254740993BTC for QaLarge in Breakdown and actual hover, Other1BTC, reconciling to the existing correct headline9007199254740994BTC.
- [ ] Both cases work at1440×1000 and390×844, with no changes to source balances, numeric plotting policy, chart choice, unit selection, grouping threshold or percentage rounding.
- [ ] Exact source amounts and grouped Other sums survive to the shared formatter; ISO minor units, commodity digits, signs, real zero and locale behavior retain their existing contracts. Existing unit/scope and parent-own-balance work remains compatible.
- [ ] Meaningful data and rendered regressions fail against the original early-Number/fallback-formatting paths; dashboard gates pass. Native evidence names the tested client/source and distinguishes production deployment.
- [ ] Standing tasks are complete, public closeout evidence is recorded, and the milestone exits the open tree through `/pm done`.

## Source + Goal linkage

- **Source:** dashboard QA2026-10-23; four fresh headless native cases, valid local producers and independent Beancount/Decimal controls, detailed in FINDINGS.
- **Goal linkage:** A2 financial trust and A3 usable exact records: readers and agents must be able to reconcile the visual chart's text alternative and hover with recorded commodity amounts.
- **Expected outcome:** supported small fractions remain nonzero, distinct large quantities retain their digits, and Other reports the exact sum represented by its grouped accounts.
- **Why now:**1015 and m52 preserve source decimals in other Overview text, while this independent distribution pipeline still discards them. Coordinate edits to `buildDistributionData` with [1030](../1030.md)'s parent traversal repair; do not duplicate it or undo m21's unit model.
- **Adoption surface included:** this changes the reader-facing chart, hover and existing Breakdown surface. Audit owning README/guidance and discoverability without adding a new setting, warning or workflow.
