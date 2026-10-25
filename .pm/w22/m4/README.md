# w22 · m4 — `bea report capital-gains`: realized gains by lot

**Worker:** worker1 **Goal:** a personal investor or an agent reads realized gains per sale lot with one verb **Status:** todo (t001–t003 done)

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Engine answer: realized gain/loss per reduction with holding period — **DONE** | 60m | w22/m3/t001 |
| t002 | Frontend `bea report capital-gains` with date range, text and JSON — **DONE** | 45m | t001 |
| t003 | Fixtures for FIFO, specific-lot, partial lots and multi-currency, plus docs — **DONE** | 45m | t002 |
| t004 | Adoption surface | 25m | t003 |
| t005 | Simplify | 25m | t004 |
| t006 | Test coverage | 45m | t004 |
| t007 | Closeout | 15m | t005, t006 |

## Definition of done

- A fixture with three buys and two partial sells reports the expected per-lot proceeds, basis, gain/loss and holding period.
- The report total ties to the ledger's `Income:CapitalGains` postings for the same range, and `--from-date/--to-date` bound the output.
- Text and `--json` outputs; no tax-liability or jurisdiction logic.
- `make check-all` passes from `cli/`.

## Source + Goal linkage

- **Source:** `/pm-brainstorm for cli` 2026-10-24, candidate 4; realized gains are a stated need in the blocked investor milestones `w2/m45` and `w2/m50`.
- **Goal linkage:** A1 (agents can answer realized-gains questions from the ledger).
- **Expected outcome:** Investors and tax-season agents get per-lot realized gains without writing BQL.
- **Why now:** It shares the report plumbing and lot data from w22/m3, so it follows that milestone directly, and the investor skills are waiting on it.
- **Adoption surface:** included, because the milestone ships user- and agent-facing `bea` behavior.
