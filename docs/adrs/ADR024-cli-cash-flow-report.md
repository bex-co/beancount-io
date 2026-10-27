# ADR 024: CLI cash-flow report (`bea report cash-flow`)

- Status: Done (shipped as w21/m4; implementation reviewed 2026-10-25)
- Date: 2026-10-25
- Decision owners: CLI (engine read + command; no other package changes)
- Scope: a native, offline `bea report cash-flow` with `--json` — which accounts form the operating/investing/financing sections, the period and multi-currency rules, and the JSON shape, mirroring the dashboard report's semantics.

## Context

The dashboard ships a cash-flow report ([ADR023](./ADR023-dashboard-cash-flow-report.md)) with ledger-declared classification ([ADR003](./ADR003-dashboard-cash-flow-ledger-roles.md)): direct method, cash-account-centric, `cash-flow-role` open metadata over name heuristics. The CLI offers overview, income-statement, balance-sheet, trial-balance, holdings, register, and capital-gains — no cash-flow view. Newcomers and agents get "why did my balance change" nowhere offline.

The classification semantics are already decided by ADR003/ADR023; this record binds the CLI to them and settles only what the CLI surface adds: options, signs, ordering, and the JSON shape.

## Decision

`bea report cash-flow` is the dashboard statement's offline twin, computed engine-side from posting inventories converted at cost, with three deliberate deviations noted below.

**Mirrored verbatim (ADR003/ADR023, `role-resolver.ts`, `model.ts`):**

- Direct method: each row is the **inverse** of one non-cash account's period change (+ = cash inflow, − = outflow); zero rows omitted.
- Role resolution per account: `cash-flow-role` open metadata (`cash`/`operating`/`investing`/`financing`, case-sensitive exact) wins; an invalid declared value falls back to the heuristic and is flagged. Fallback: CCE name patterns (`^Assets:.*(Cash|Checking|Savings)$`, `^Assets:.*Bank`, case-insensitive), else root map (Income/Expenses → operating, Assets → investing, Liabilities/Equity → financing). Heuristic cash carries down subtrees; a declared leaf role overrides for that leaf only. Renamed roots resolve as their type.
- CCE accounts are never rows; transfers between CCE accounts net to zero by construction.
- `net_change` = Σ rows; `closing` = CCE balances at period end; `opening` = `closing − net_change`.
- Non-five-root accounts are excluded from rows and surface via the shared `unrooted_accounts` note.

**CLI surface (new):**

- **Period:** `--time` (fava period, like every sibling) intersected with `--from-date`/`--to-date` (inclusive, capital-gains style). Flows sum the loaded transactions' postings in the half-open window — the period intersected with the bounds — never the opening-balance `<summarize>` entries the `--time` clamp adds for balance reports, which would read carried-in cash as current activity (w5/1048); closing sums postings before its exclusive end. A `--to-date` of the calendar's last day (`9999-12-31`) bounds nothing and leaves the period's own end in place rather than dropping the closing cutoff (w5/1049).
- **No `--conversion`** (capital-gains precedent: it "takes no --conversion" so rows tie to booked figures). `at_cost` is the one conversion the dashboard statement reconciles under — the page itself tells the user to try it when another conversion fails to reconcile — so the engine always computes at cost and `metadata.conversion` reads `"at_cost"`. Lots collapse to the cash they moved; cost-less positions stay in their own units. Multi-currency rule: per-currency amounts in every row, total, and bottom line; totals never sum across currencies.
- **No `--interval` series in v1** (trial-balance precedent). Charts stay dashboard-side.
- **`--account` narrows rows and the CCE set together** (per-posting match, capital-gains style). That reconciles only while the filter keeps each transaction in the window whole: a per-posting match can keep a cash leg and drop the income that paid it, or keep one side of a cash transfer, and `opening = closing − net_change` then solves for an invented opening (w5/1050). So a filter that keeps some but not all of a window transaction's statement legs (CCE members and rooted accounts) is refused with a usage error (exit 2) naming `--account`, the split transactions, and the accounts a balanced filter would also need. `--allow-errors` does not bypass it: the ledger is valid, the filter is what is unsupported. A filter that matches no window leg, or every one, reports as before.
- **Signs:** rows, section totals, and `net_change` are cash impact (`"row_signs": "positive_for_inflow"`, mirroring `net_profit_signs`); `opening`/`closing`/cash-account balances keep beancount signs. The human heading states both.
- **Row order:** account path ascending — a deliberate deviation from the dashboard's primary-currency-magnitude sort, which orders on floats; the CLI order is stable and greppable.
- **No reconciliation refusal** — a deliberate deviation from the dashboard's throw. Its inputs pass through conversion layers that can disagree; the engine reads raw units, where the identity holds by construction for an unfiltered statement and the only leak (excluded unrooted accounts) is already disclosed by the shared note. The one exception is the unsupported `--account` filter above, which breaks the identity before any conversion and is refused instead of reported.
- **No separate refusal for a ledger with no cash accounts**: sections still print (every account classifies to an activity), `closing`/`opening` read zero, and the empty CCE set is visible in the output.

**JSON shape** (sibling envelope: shared metadata + `display_precision` + payload):

```json
{
  "sections": {"operating": [{"account": "Income:Salary", "amounts": {"USD": "3000.00"}, "role_source": "heuristic"}]},
  "totals": {"operating": {"USD": "3000.00"}, "investing": {}, "financing": {}},
  "net_change": {"USD": "3000.00"},
  "opening": {"USD": "4000.00"},
  "closing": {"USD": "7000.00"},
  "cash_accounts": [{"account": "Assets:Bank:Checking", "balance": {"USD": "7000.00"}, "role_source": "heuristic"}],
  "invalid_role_values": [{"account": "Assets:Odd", "value": "Cash"}]
}
```

Amounts are exact decimal strings; zero-balance bottom lines carry `{}` (a per-unit-family conversion spells a quiet row empty, per `_cell`). `invalid_role_values` is sorted by account. Membership gates rows: an account in the CCE set — including by subtree inheritance — is never a row, following the model's stated intent ("never double-counted"). The dashboard row loop briefly resolved the direct role instead, which could list an inherited-cash leaf as a row while counting it in closing; it now gates on the same membership, so this deviation is closed.

## Alternatives Considered

### Indirect method (rejected)

ADR023 rejected it for the dashboard for the same reason it fails here: personal ledgers rarely model accrual adjustments cleanly. The direct method matches what the ledger records.

### Compute via Fava interval-totals (rejected)

`ChartModule.interval_totals` yields per-interval flows, but the CLI statement needs one whole-period flow plus as-of CCE balances, and Fava has no whole-period interval. Summing posting units directly (capital-gains style) composes upstream primitives without duplicating Fava logic.

### A converted single-currency view (rejected)

A `--conversion USD` statement would read easier on multi-currency ledgers, but any valuation difference breaks the rows-sum-to-cash-change identity the report promises. The dashboard answers that with a refusal; the CLI answers it by not offering the option.

## Consequences

### Positive

- Newcomers and agents get the cash answer offline with no account, in a JSON shape stable enough to script against.
- Same books, same answer: declared roles and heuristics match the dashboard, so the two surfaces agree by construction.
- No new dependencies, no API surface, no backend work.

### Negative

- Row order and the no-refusal policy differ deliberately from the dashboard; anyone diffing the two surfaces must know the three deviations (order, refusal, no interval series).
- Name-heuristic misclassification inherits ADR023's weakness; the fix is the same one line of `cash-flow-role` metadata.

## Open Questions

- Whether a future `--interval` series should match the dashboard chart points (deferred; v1 has none).
- Whether invalid `cash-flow-role` values should ever hard-fail under a strict flag (v1 flags only, dashboard parity).
- Nothing in this decision needs an owner call: every rule above mirrors a shipped dashboard semantic or a CLI sibling precedent.

## References

Internal:

- `docs/adrs/ADR023-dashboard-cash-flow-report.md` — the dashboard statement (direct method, CCE bottom line)
- `docs/adrs/ADR003-dashboard-cash-flow-ledger-roles.md` — `cash-flow-role` values, precedence, invalid-value fallback
- `dashboard/docs/PRFAQ-cash-flow-ledger-classification.md` — normative classification spec appendix
- `dashboard/src/features/reports/cash-flow/config.ts` — CCE patterns + root map (fallback heuristics)
- `dashboard/src/features/reports/cash-flow/lib/role-resolver.ts` — `resolveCashFlowRole` (precedence)
- `dashboard/src/features/reports/cash-flow/lib/model.ts` — `buildCashFlowStatement` (inversion, opening identity, subtree inheritance)
- `cli/src/bea_engine/report.py` — `_capital_gains` (units, bounds, trivial valuation keys; the implementation template)
- `.pm/w21/m4/` — implementing milestone
