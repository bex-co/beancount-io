# w4 · m16 — Preserve statement chart selection through report reads

**Worker:** worker1 **Goal:** changing an interval or conversion keeps the selected statement chart while replacement data and exports remain safely pending **Status:** todo (t001–t005 done)

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Preserve Cash Flow view across pending interval reads — **DONE** | 25m | — |
| t002 | Apply the same lifetime repair to the three sibling reports — **DONE** | 45m | t001 |
| t003 | Verify the report comparison adoption journey — **DONE** | 10m | t002 |
| t004 | Simplify the state ownership change — **DONE** | 10m | t003 |
| t005 | Test uncached and cached reads with real content and run gates — **DONE** | 40m | t004 |
| t006 | Close out after all four report journeys pass | 15m | t005 |

145 minutes across two implementation tasks and verification. One reproduced state-lifetime regression affects Cash Flow, Income Statement, Balance Sheet and Trial Balance; details and controls are in [FINDINGS.md](./FINDINGS.md).

## Definition of done

- Cash Flow By Activity remains selected after changing Monthly to an uncached interval; desktop tabs and the narrow View selector agree.
- Income Statement Income and Balance Sheet Assets likewise remain selected after their interval reads complete. Other valid chart selections follow the same contract.
- Trial Balance Equity remains selected across an uncached conversion change (Units or At Market Value); cached conversion controls continue to retain it.
- Pending reads remain explicit and do not expose stale report values or exports under new interval/conversion metadata. Cached transitions, error/retry, chart show/hide and responsive switching retain their existing behavior.
- State is scoped to the relevant report/ledger lifetime; do not add a global preference store or carry old ledger data into a new ledger.
- Meaningful tests exercise the real content component across pending/success transitions, plus a cached control, and dashboard format/lint/test/build pass.

## Source + Goal linkage

- **Source:** user-requested repeated dashboard QA for w4, 2026-09-17.
- **Goal linkage:** A2 — frictionless onboarding: readers can compare a chosen chart at different intervals without having to reselect it after each read.
- **Expected outcome:** choosing a new interval changes the grouping of the selected chart, not which chart the reader sees.
- **Why now:** the settled-data safeguard introduced in 05c78c69 correctly hides stale data but unmounts the component owning chart selection. Preserve both requirements.
- **Adoption surface:** verify the existing visible report controls and instructions remain accurate; no new feature documentation is needed.
- **Coordination:** [m13](../m13/README.md) addresses the outer LedgerLayout router-pending boundary and list behavior. This reproduction changes only a local interval, leaves the URL unchanged, and crosses the report's Apollo pending branch instead. Keep their fixes compatible.
