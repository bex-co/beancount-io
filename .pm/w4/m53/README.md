# w4 · m53 — Keep exact amounts in Overview charts

**Worker:** worker1 **Goal:** commodity amounts in Overview chart tables and hover text reconcile with the ledger's decimals **Status:** todo

Minor financial-display residual of [1015](../done/1015.md), independently proven in distributions, Income vs Expenses and Cash Flow. Approximately4h45m across exact data, renderers and verification; this exceeds the inbox-note threshold. See [FINDINGS](./FINDINGS.md).

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| [t001](./t001.md) | Carry exact distribution amounts through grouping | 40m | — |
| [t002](./t002.md) | Format pie/bar tooltips and Breakdown from exact amounts | 45m | t001 |
| [t008](./t008.md) | Preserve Income vs Expenses amounts and exact net | 40m | t001 |
| [t009](./t009.md) | Preserve exact Cash Flow links and savings | 45m | t001 |
| [t003](./t003.md) | Repeat producer-backed native chart controls | 30m | t002, t008, t009 |
| [t004](./t004.md) | Adoption surface | 15m | t003 |
| [t005](./t005.md) | Simplify | 20m | t004 |
| [t006](./t006.md) | Test coverage | 40m | t004, t005 |
| [t007](./t007.md) | Closeout | 10m | t006 |

## Definition of done

- [ ] The producer-backed BTC bar case reads4.00995BTC and−0.00001BTC in Breakdown, and the actual main-bar hover retains4.00995.
- [ ] The BTC pie case reads9007199254740993BTC for QaLarge in Breakdown and actual hover, Other1BTC, reconciling to the existing correct headline9007199254740994BTC.
- [ ] Income vs Expenses Period data and Cash Flow Flows retain income4.00995BTC, expense0.00001BTC and exact net/savings4.00994BTC; actual income bar/flow hovers retain4.00995.
- [ ] Their large-integer case retains income9007199254740993BTC, expense1BTC and exact net/savings9007199254740992BTC, rather than…992 income and…991 net/savings.
- [ ] All four fixtures work at1440×1000 and390×844, with no changes to source balances, numeric plotting policy, chart choice, unit selection, grouping threshold or percentage rounding.
- [ ] Exact source amounts and grouped Other sums survive to the shared formatter; ISO minor units, commodity digits, signs, real zero and locale behavior retain their existing contracts. Existing unit/scope and parent-own-balance work remains compatible.
- [ ] Meaningful data and rendered regressions fail against the original early-Number/fallback-formatting paths; dashboard gates pass. Native evidence names the tested client/source and distinguishes production deployment.
- [ ] Standing tasks are complete, public closeout evidence is recorded, and the milestone exits the open tree through `/pm done`.

## Source + Goal linkage

- **Source:** dashboard QA2026-10-23; eight fresh headless native cases across three chart pipelines, valid local producers and independent Beancount/Decimal controls, detailed in FINDINGS.
- **Goal linkage:** A2 financial trust and A3 usable exact records: readers and agents must be able to reconcile the visual chart's text alternative and hover with recorded commodity amounts.
- **Expected outcome:** supported small fractions remain nonzero, distinct large quantities retain their digits, and Other, net profit and savings report exact decimal calculations.
- **Why now:**1015 and m52 preserve source decimals in other Overview text, while these consumers of the same Number-only unit model still discard them. Coordinate edits to `buildDistributionData` with [1030](../1030.md)'s parent traversal repair; do not duplicate it or undo m21's unit model or1020's renamed-root handling.
- **Adoption surface included:** this changes existing chart hover, Breakdown, Period data and Flows surfaces. Audit owning README/guidance and discoverability without adding a new setting, warning or workflow.
