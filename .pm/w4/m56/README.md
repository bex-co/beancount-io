# w4 · m56 — Exclude entirely noncash transactions from Cash Flow activities

**Worker:** worker1 **Goal:** activity totals explain transactions that actually touch the resolved cash/equivalent set **Status:** in progress (all but t007 Closeout done)

Minor residual of [m2](../done/m2/README.md), approximately3h15m across eligibility data preparation, query integration and verification. The current public example reports425.83USD of operating cash outflows and financing inflows for20 purchases with no cash leg. Net cash and Income Statement are correct. See [FINDINGS](./FINDINGS.md).

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| [t001](./done/t001.md) | Resolve cash membership and compose transaction eligibility — **DONE** | 45m | — |
| [t002](./done/t002.md) | Apply eligibility to activity reads while retaining report scope — **DONE** | 45m | t001 |
| [t003](./done/t003.md) | Repeat native noncash and cash-payment journeys — **DONE** | 30m | t002 |
| [t004](./done/t004.md) | Adoption surface — **DONE** | 15m | t003 |
| [t005](./done/t005.md) | Simplify — **DONE** | 15m | t004 |
| [t006](./done/t006.md) | Test coverage — **DONE** | 35m | t004, t005 |
| [t007](./t007.md) | Closeout | 10m | t006 |

## Definition of done

- [ ] The public April2016 trip filter retains its425.83USD expense/loss in Income Statement, while Cash Flow has zero/no operating and financing cash activity from those20 transactions. The honest no-cash-data state is acceptable; old noncash amounts cannot remain exportable.
- [ ] The real electricity payment retains Operating−65.00USD and net−65.00USD, with the existing scoped opening/closing balances and source filters.
- [ ] The two local100USD fixtures distinguish a noncash purchase from real cash borrowing plus cash payment; the latter retains its two genuine activities despite net cash zero. Cash transfers remain compatible.
- [ ] Loader and page use the same settled resolved cash membership, correct filter precedence/escaping and existing supported role, ancestor and root-name semantics. Closing-balance scope and the visible user filters remain intact.
- [ ] Empty, loading and failed membership are honest; no missing read falls back to all transactions. Retry and settled scope replacement preserve existing report behavior.
- [ ] Native1440/390 checks and meaningful query/composition/model/rendered regressions pass. Exact values, units, declarations, reconciliation and export rules remain compatible; dashboard gates pass and standing tasks complete before closure.

## Source + Goal linkage

- **Source:** dashboard QA2026-10-23, genuine public reads and six CSVs at both widths, independent source/parser calculations, current-source reproduction and existing-API eligibility controls in FINDINGS.
- **Goal linkage:** A2 — newcomers can distinguish credit-funded spending from cash payments; A3 — exported cash-flow activities remain credible.
- **Expected outcome:** entirely noncash transactions no longer create offsetting cash inflows/outflows in activity sections or exports.
- **Why now:** existing reconciliation proves the net balances, but balanced noncash legs still create false gross cash activity. Membership must precede activity reads and be shared with loader/page loading and retry behavior; this exceeds a sub-hour note.
- **Adoption surface included:** update owning report guidance and the cash-flow method explanation for the existing flow, preserving ADR003's role choices. No new customer setting, API capability or dependency is planned.
