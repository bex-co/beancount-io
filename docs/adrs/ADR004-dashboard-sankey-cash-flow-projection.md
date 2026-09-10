# ADR 004: The overview Sankey is a projection of the cash-flow statement in one presentation unit

- Status: Accepted
- Date: 2026-09-10
- Decision owners: Dashboard (client only — no backend changes)
- Extends [ADR002](./ADR002-dashboard-cash-flow-report.md) and follows [ADR003](./ADR003-dashboard-cash-flow-ledger-roles.md)

This ADR records rules an agent would otherwise break. It is invariants only —
the reasoning lives in ADR002/ADR003 and in the tests named below.

## Invariants

- **Sankey flows come from `buildCashFlowStatement` over `getLedgerIntervalTotals`,
  never from balance-sheet hierarchies.** Wrong code: reading
  `assetsHierarchyData` / `incomeHierarchyData` to build links — those are
  cumulative balances, not period flows. The data source and its conversion
  target are visible at
  `dashboard/src/features/reports/overview/hooks/use-sankey-statement.ts:50`.

- **A link value is one unit's amount, never a sum across units.** Wrong code:
  `balance["USD"] ?? Object.values(balance)[0]`, or adding IRT to TRY. Units
  with movement but no price to the presentation currency are collected into
  `unshownUnits` and disclosed in a caption — never converted, never dropped
  silently
  (`overview/lib/sankey-data-transformer.ts:86`). Enforced by the mixed-unit
  case in `overview/lib/__tests__/sankey-data-transformer.test.ts`.

- **The only balancing node is the net change in cash & equivalents, drawn on
  the side its sign requires.** Wrong code: a synthetic "Savings" residual, or
  dropping negative flows to keep the picture tidy — a negative aggregate is
  drawn on the opposite side of the hub instead
  (`overview/lib/sankey-data-transformer.ts:118`). Enforced by the
  Σin = Σout assertions in that same test file.

- **Every account resolves its role through `cash-flow/lib/role-resolver.ts`;
  Equity is financing, not excluded.** Wrong code: a Sankey-local root switch
  that disagrees with the statement
  (`overview/lib/account-categorizer.ts:20`).

## Where it lives

- `dashboard/src/features/reports/overview/lib/sankey-data-transformer.ts` — projection rules.
- `dashboard/src/features/reports/overview/hooks/use-sankey-statement.ts` — data source and conversion target.
- `dashboard/src/features/reports/cash-flow/lib/role-resolver.ts` — shared classification (ADR003).
