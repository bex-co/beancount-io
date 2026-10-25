# w22 · m3 — Holdings and register reports

**Worker:** worker1 **Goal:** `bea report holdings` and `bea report register ACCOUNT` answer "what do I hold?" and "show this account's running balance" without hand-written BQL **Status:** done

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Engine `report holdings` — **DONE** | 60m | — |
| t002 | Engine `report register ACCOUNT` — **DONE** | 60m | — |
| t003 | Frontend `bea report holdings` and `bea report register` — **DONE** | 50m | t001, t002 |
| t004 | Live-price provenance in both reports — **DONE** | 30m | t003 |
| t005 | Docs and skill-guide pointer — **DONE** | 30m | t004 |
| t006 | Adoption surface — **DONE** | 25m | t005 |
| t007 | Simplify — **DONE** | 25m | t006 |
| t008 | Test coverage — **DONE** | 45m | t006 |
| t009 | Closeout — **DONE** | 15m | t007, t008 |

## Definition of done

- On the `bean-example` ledger, `bea report holdings` lists every non-cash position with units, cost and market value.
- `bea report register Assets:Checking` ends at the same total as `bea balance Assets:Checking`.
- Both reports support `--json` and follow the strict/lenient read policy of [w1/m13](../../w1/done/m13/README.md).
- `make check-all` passes from `cli/`.

## Source + Goal linkage

- **Source:** `/pm-brainstorm for cli` 2026-10-24, candidate 3; the blocked investor milestones `w2/m49` and `w2/m53` assume these reads.
- **Goal linkage:** A1 (agents and `beancount-ask` get first-class portfolio and account-history answers).
- **Expected outcome:** Agents and people get holdings and an account register from one verb each; `beancount-ask` stops improvising BQL for them.
- **Why now:** The vendored Fava subset already holds the holdings and journal logic, so this wraps rather than re-implements, and it unblocks the capital-gains report (w22/m4) and the investor skills.
- **Adoption surface:** included, because the milestone ships user- and agent-facing `bea` behavior.
