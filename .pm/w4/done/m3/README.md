# w4 · m3 — Ledger-declared cash-flow roles (`cash-flow-role` metadata)

**Worker:** worker1 **Goal:** ship ledger-declared cash-flow classification — one `cash-flow-role` metadata key on `open` directives (`"cash" | "operating" | "investing" | "financing"`) that overrides the `config.ts` heuristics across the cash-flow report, its exports, and the overview Sankey. **Status:** done

## Tasks (in order)

| id   | title                                                                 | est | depends_on      |
| ---- | -------------------------------------------------------------------- | --- | --------------- |
| t001 | Expose per-account `open` metadata through GraphQL                   | 45m | — **DONE**      |
| t002 | Role resolver lib: `cash-flow-role` key, precedence, invalid values  | 45m | — **DONE**      |
| t003 | Cash-flow loader: merge declared roles into model + status panel     | 40m | t001, t002 — **DONE** |
| t004 | Overview Sankey reads the shared role resolver                       | 30m | t003 — **DONE** |
| t005 | Declared/inferred indicators + export disclosure gating              | 30m | t003 — **DONE** |
| t006 | ADR003 + docs alignment                                              | 25m | t002 — **DONE** |
| t007 | Adoption surface                                                     | 20m | t004, t005, t006 — **DONE** |
| t008 | Simplify                                                             | 20m | t007 — **DONE** |
| t009 | Test coverage                                                        | 30m | t007 — **DONE** |
| t010 | Closeout                                                             | 10m | t009 — **DONE** |

## Definition of done

An annotated ledger (`cash-flow-role` on `open` directives) renders the cash-flow statement honoring every declaration — CCE membership, activity sections, bottom line — while an unannotated ledger renders byte-identical to today. Invalid values are flagged in the account status panel and fall back to the heuristic. CSV/Markdown/print exports drop the "classification is inferred" disclosure for declared rows. The overview Sankey excludes accounts declared `"cash"` and honors declared roles for non-`Income` accounts. Dashboard and backend-cluster CI green.

## Source + Goal linkage

- **Source:** `dashboard/docs/PRFAQ-cash-flow-ledger-classification.md` (single-key spec, parser-verified 2026-08-25); follow-up to w4/m2 (cash-flow report).
- **Goal linkage:** **A1 — Agent-native accounting**: a coding agent can correct a report's classification by editing plain-text ledger metadata — no settings UI, no feature request, fully scriptable and auditable in git. **A2** spillover: removes the "the report classified my account wrong and I can't fix it" cliff for newcomers.
- **Expected outcome:** any user or agent can override cash-flow classification in-ledger; exports stop carrying the inferred-classification disclaimer for declared accounts; adoption measurable via share of active ledgers with ≥1 `cash-flow-role` annotation.
- **Why now:** w4/m2 just shipped the report and its heuristic-disclosure limitation is the natural next increment; the backend services now live in this monorepo (`backend-cluster/`), so the full path (ledger service → GraphQL → dashboard) lands in one public repo with no external coordination; the spec is finalized and parser-verified. Adoption surface is included because this ships a user- and agent-facing behavior change.
