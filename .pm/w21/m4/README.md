# w21 · m4 — `bea report cash-flow`: where the money went, by period

**Worker:** worker1 **Goal:** a native, offline cash-flow report with `--json` that reconciles to the change in cash balances **Status:** todo (t001-t003 done)

## Tasks (in order)

| id   | title                                                                  | est | depends_on |
| ---- | ---------------------------------------------------------------------- | --- | ---------- |
| t001 | Define the cash-flow contract — **DONE**                               | 30m | —          |
| t002 | Implement the engine read — **DONE**                                  | 60m | t001       |
| t003 | Add `bea report cash-flow` with table and `--json` output — **DONE**  | 45m | t002       |
| t004 | Fixture tests: transfers net to zero, multi-currency, empty period     | 40m | t003       |
| t005 | Adoption surface                                                       | 20m | t004       |
| t006 | Simplify                                                               | 20m | t005       |
| t007 | Test coverage                                                          | 30m | t005       |
| t008 | Closeout                                                               | 15m | t006, t007 |

## Definition of done

`bea report cash-flow` (with the period and currency options its sibling reports take) prints operating, investing and financing sections by account root, and `--json` returns the same data. On the fixture ledger the sections' net equals the change in cash-account balances over the period, and a test asserts it. Transfers between cash accounts net to zero.

## Source + Goal linkage

- **Source:** `/pm-brainstorm for w21` 2026-10-25, candidate 3. The CLI offers overview, income-statement, balance-sheet and trial-balance only.
- **Goal linkage:** **A2 — Frictionless onboarding** (answers the first question a personal-finance adopter asks: why did my balance change) and **A1 — Agent-native accounting** (an agent gets one command and a stable JSON shape instead of hand-written BQL).
- **Expected outcome:** newcomers and agents get a cash-flow view offline with no account; `bea report` command usage and skill invocations that cite it rise.
- **Why now:** w22/m3 and w22/m4 add the other missing reports; this is the remaining gap and is not covered by them.
- **Parity:** CLI-native only. If a customer-facing API read is later added it needs REST, GraphQL and MCP together (root `AGENTS.md`); that would be a separate, larger milestone.
- **Adoption surface:** included — a new user- and agent-facing command.
