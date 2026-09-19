# w4 · m21 — Preserve amounts and units in the overview charts

**Worker:** worker1 **Goal:** Make public overview chart amounts faithful to the ledger's direct balances and currency units. **Status:** done

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| [t001](./done/t001.md) | Preserve account balances, units and roles — **DONE** | 80m | — |
| [t002](./done/t002.md) | Render truthful unit-specific Sankey amounts — **DONE** | 45m | t001 |
| [t003](./done/t003.md) | Keep distribution slices and percentages within one unit — **DONE** | 45m | t002 |
| [t004](./done/t004.md) | Adoption surface — **DONE** | 20m | t003 |
| [t005](./done/t005.md) | Simplify — **DONE** | 15m | t004 |
| [t006](./done/t006.md) | Test coverage — **DONE** | 75m | t004, t005 |
| [t007](./done/t007.md) | Closeout — **DONE** | 10m | t006 |

## Definition of done

The overview Sankey preserves direct parent and child balances once per unit at every supported depth. Its values, link widths, totals, Savings and tooltips never add unlike units or label arbitrary units USD. Public example tax balances retain52,047.35 USD and18,000 IRAUSD separately, and Synopsys revenue displays7,054 MUSD. Asset/liability distribution slices, percentages and Other grouping likewise preserve units:386.28 USD and25 VACHR never become411.28. Mixed-unit scope is clear to readers, nested cash accounts are excluded before grouping, existing declared-role and filter contracts hold, meaningful regression tests and dashboard gates pass, and real narrow/desktop verification is recorded.

## Source + Goal linkage

- **Source:** Repeated dashboard QA on2026-09-17; [reproduction and trace](./FINDINGS.md).
- **Goal linkage:** A2 — Frictionless onboarding: readers can trust the public overview's monetary values and understand their units.
- **Expected outcome:** Parent postings remain included and currency identities survive from the real response to flow and distribution diagrams.
- **Why now:** Two related financial-chart findings require170minutes of implementation and290minutes including adoption, simplification, tests and closeout; this exceeds a loose inbox note.
- **Adoption surface:** Included because mixed-unit presentation and tooltip values are public financial UI. Scope is dashboard; no API, dependency or new package.
