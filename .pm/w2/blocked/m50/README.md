# w2 · m50 — Import investment activity in bulk, with lots intact

**Worker:** worker2 **Goal:** a user with a year of broker or exchange activity — or an existing portfolio to onboard — gets those events into the ledger as correct lots through one reviewed batch proposal, instead of dictating trades one at a time. **Status:** blocked (Codex expanded cohort complete; new assertions need Claude authentication)

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| [t001](done/t001.md) | Let beancount-trade propose many described events in one batch — **DONE** | 60m | w2/m45/t002 |
| [t002](done/t002.md) | Import a broker activity export as lots — **DONE** | 90m | t001 |
| [t003](done/t003.md) | Import exchange activity and opening lots from a cost-basis export — **DONE** | 75m | t001 |
| [t004](done/t004.md) | Write evals, fixtures, and routing entries for bulk intake — **DONE** | 60m | t001, t002, t003 |
| t005 | Run the evals and routing set on both clients | 45m | t004 |
| t006 | Adoption surface | 30m | t005 |
| t007 | Simplify | 15m | t006 |
| t008 | Test coverage | 45m | t006, t007 |
| t009 | Closeout | 15m | t008 |

## Previous blocker

- **t005 onward (2026-10-20)** — t001–t004 are shipped, and t005's Claude Code half passes (evals 7/7, routing 95/95; evidence in [t005](t005.md)). t005's acceptance requires both clients, and Codex returns its account usage-limit error until 2026-11-17, so t006–t009 wait behind it. **Unblock:** Codex usage returns (2026-11-17); rerun trade evals 9–10, import evals 16–20, and the 95-prompt routing set on Codex, close t005, then t006 (adoption) starts. **Who can clear it:** the operator (Codex usage).

## Definition of done

- A batch of described investment events is proposed once, confirmed once, and written check-gated, with lot ambiguity resolved per event and partial failures reported event-by-event.
- One broker activity format and one exchange activity format import as lots with `import-id` dedup (re-import is a no-op); a sell against an unheld lot stops before any write.
- An opening-lots import seeds existing positions at true cost/date, tied to the export's totals. Evals pass on both clients; routing keeps bank imports, single trades, and bulk intake apart.

## Source + Goal linkage

- **Source:** user walkthrough as a personal investor (real estate, crypto, stocks, daily spending), 2026-10-19.
- **Goal linkage:** **A1 — Agent-native accounting:** per-event dictation caps adoption at toy portfolios; bulk intake is what makes an agent-maintained investment ledger realistic. **A2** for the opening-lots on-ramp.
- **Expected outcome:** a user can onboard an existing portfolio and keep it current from exports, not dictation. Signals: eval pass on both clients, first-year journey rehearsal (m53) using bulk intake.
- **Why now:** m45 proved single-event lot correctness and shipped the batch write recipe's sibling in add; volume is the next wall the walkthrough hits.

## Unblocked — 2026-11-08

m45 is complete; Codex 0.167.0 / gpt-6.1-sol runs real sandboxed turns. Run
original trade 9–10 and import 16–20, auditing the unchanged 95-entry routing
cohort separately. This work does not depend on m49's mixed-question trigger.

## Current blocker — 2026-11-08

[t005](t005.md) records all seven original Codex cases plus the new legacy-ID
regression passing. A source clarification fixes printed-decimal hash IDs;
the candidate also corrects trade 9's narrative arithmetic without changing
prices. New 20/29 assertions have no Claude run; authentication is unavailable.
**Unblock:** authenticate Claude, verify the expanded cohort, fix/rerun affected
Codex cases and ship the rebased candidate, then close t005. **Who can clear
it:** operator login, then worker. Source is preserved in an unpushed isolated
worktree and main restored; t006–t009 remain dependent.
