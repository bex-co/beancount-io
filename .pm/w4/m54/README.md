# w4 · m54 — Balance Overview Cash Flow refunds and deficits

**Worker:** worker1 **Goal:** readers can account for every side of the Cash Flow hub in the reproduced refund and deficit cases **Status:** todo

Minor dashboard finding. Approximately2h55m across signed expense links, deficit funding and verification; it exceeds the inbox-note threshold. See [FINDINGS](./FINDINGS.md). The separate [m53](../m53/README.md) owns exact decimal text/arithmetic, not this missing-flow policy.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| [t001](./t001.md) | Represent refunded expense amounts as incoming flows | 45m | — |
| [t002](./t002.md) | Explain a deficit with a synthetic shortfall source | 35m | t001 |
| [t003](./t003.md) | Verify the three producer-backed native controls | 20m | t002 |
| [t004](./t004.md) | Adoption surface | 15m | t003 |
| [t005](./t005.md) | Simplify | 15m | t004 |
| [t006](./t006.md) | Test coverage | 35m | t004, t005 |
| [t007](./t007.md) | Closeout | 10m | t006 |

## Definition of done

- [ ] With100USD income and125USD expense, the chart and Flows show100 income plus25 of clearly labeled synthetic shortfall funding into the hub, matching125 expense outflow.
- [ ] With100USD income and−25USD expense, the chart and Flows retain the25 refund as an incoming flow and125 Savings outflow. The refund account remains identifiable.
- [ ] The ordinary100 income/25 expense control remains100 in,25 expense plus75 Savings out, without a shortfall or refund row.
- [ ] Both widths,1440×1000 and390×844, show the same values in actual native tables/tooltips and diagram links; Enter/Space still open the Flows disclosure.
- [ ] Unit selection/omissions, roles/pending state, parent postings, renamed roots and snapshot/filter semantics remain intact. Synthetic labels are localized and distinct from real account identities. Coordinate exact amount metadata with m53.
- [ ] Meaningful producer/rendered regressions fail on the old branches, dashboard gates pass, native verification identifies client/source and deployment limits, and standing tasks are complete before `/pm done` moves the milestone.

## Source + Goal linkage

- **Source:** dashboard QA2026-10-23; six fresh headless cases, complete local WASM producer results and independent Beancount/Decimal controls, detailed in FINDINGS.
- **Goal linkage:** A2 — newcomers can reconcile the financial explanation on Overview; A3 — public examples and readable chart alternatives remain credible.
- **Expected outcome:** the reproduced25USD gap has an explicit source, and the picture and Flows explain the already-correct income/expense/net values.
- **Why now:** [W0/034](../../w0/done/034.md) and [W21/112](../../w21/done/112.md) explicitly left the dashboard counterpart unchanged. m21 fixed unit/role aggregation and m53 addresses decimal precision; neither adds these missing flows.
- **Adoption surface included:** the existing public chart, hover and Flows table change. Audit guidance/README and translations without adding setup, settings or unrelated workflow.
