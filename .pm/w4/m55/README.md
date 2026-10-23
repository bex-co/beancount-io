# w4 · m55 — Preserve exact Budget amounts and variance

**Worker:** worker1 **Goal:** distinct recorded Budget targets and actuals retain their amounts and one-unit differences **Status:** todo

Minor residual of [m45](../done/m45/README.md)'s Budget precision work, separate from [978](../done/978.md)'s representable-difference tolerance. Approximately3h25m across exact data/proration, presentation/comparison and verification. See [FINDINGS](./FINDINGS.md).

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| [t001](./t001.md) | Carry exact targets and actuals through Budget calculations | 60m | — |
| [t002](./t002.md) | Render exact amounts and derive truthful variance status | 50m | t001 |
| [t003](./t003.md) | Repeat the producer-backed native Budget controls | 20m | t002 |
| [t004](./t004.md) | Adoption surface | 15m | t003 |
| [t005](./t005.md) | Simplify | 15m | t004 |
| [t006](./t006.md) | Test coverage | 35m | t004, t005 |
| [t007](./t007.md) | Closeout | 10m | t006 |

## Definition of done

- [ ] A daily target9007199254740993USD and actual9007199254740992USD retain those exact card and Period data amounts and show Below target/−1.00USD.
- [ ] Target9007199254740992USD and actual9007199254740993USD retain the exact actual and show Above target/+1.00USD.
- [ ] The existing history source stays exact; the ordinary100USD/99USD control still shows Below target/−1.00USD.
- [ ] All three valid producer-backed fixtures pass at1440×1000 and390×844, using Last year and native Period data. Numeric chart/progress geometry may remain approximate.
- [ ] Existing dated-target precedence, cadence changes/daily-equivalent proration, current/ended-period selection, sparse amounts, income direction, ISO minor units and commodity precision remain compatible. Exact-match proration does not regain floating residue or false variance.
- [ ] Meaningful data and rendered regressions fail on the old early-Number paths; dashboard gates pass, native evidence identifies source/client and deployment limits, and standing tasks are complete before `/pm done` moves the milestone.

## Source + Goal linkage

- **Source:** dashboard QA2026-10-23, six fresh headless cases, actual local WASM/Journal/Data service producers and independent Beancount/Decimal controls, detailed in FINDINGS.
- **Goal linkage:** A2 — Budget readers can reconcile their dated target with actual activity; A3 — financial text alternatives remain credible.
- **Expected outcome:** accepted exact amounts stay distinct and a real one-dollar difference is not presented as an exact match.
- **Why now:** m45 added commodity display digits and978 bounded round-off tolerance, but both still receive already-rounded doubles. This requires an exact value channel through calculation and consumers, exceeding a sub-hour note. Reuse existing decimal/formatting infrastructure without reopening their completed scopes.
- **Adoption surface included:** the existing Budget header, variance and Period data change. Audit owning guidance/README and usability without a new setting, warning or workflow.
