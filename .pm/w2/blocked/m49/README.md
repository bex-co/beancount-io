# w2 · m49 — See what a portfolio holds and what it is worth

**Worker:** worker2 **Goal:** a user who asks "what do I hold, what is it worth, and how is it allocated" gets per-lot holdings at cost and — when prices exist — at market value with unrealized gains, from shown queries; missing prices are named, never silently replaced by cost. **Status:** blocked (mixed facts/advice routing failure; authenticated two-client controls needed)

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| [t001](done/t001.md) | Add holdings, allocation, and unrealized-gain recipes to beancount-ask — **DONE** | 60m | — |
| [t002](done/t002.md) | Give price refresh an owner and a documented path — **DONE** | 45m | t001 |
| t003 | Write evals for holdings questions and run them on both clients | 45m | t001, t002 |
| t004 | Adoption surface | 30m | t003 |
| t005 | Simplify | 15m | t004 |
| t006 | Test coverage | 45m | t004, t005 |
| t007 | Closeout | 15m | t006 |

## Previous blocker

- **t003 onward (2026-10-19)** — t001 (holdings recipes) and t002 (price-refresh ownership) are shipped, and t003's Claude Code half passes (evals 4/4, routing 92/92; evidence in [t003](t003.md), including one real failure found and fixed). t003's acceptance requires both clients, and Codex returns its account usage-limit error until 2026-11-17, so t004–t007 wait behind it. **Unblock:** Codex usage returns (2026-11-17); rerun evals 10–13 and the 92-prompt routing set on Codex, close t003, then t004 (adoption) starts. **Who can clear it:** the operator (Codex usage).

## Definition of done

- "What do I hold and what is it worth" is answered per open lot (units, cost, acquisition date) from shown `bea` queries; market value and unrealized gain appear only where a `price` directive exists, and unpriced commodities are named as gaps.
- Allocation shares sum to the valued total they are computed from, and the cost-basis total ties to the existing book-value net-worth recipe on the same fixture.
- One documented, confirm-gated path refreshes stale prices, and ask's missing-price output names it. The new evals pass on Claude Code and Codex, recorded with versions and dates.

## Source + Goal linkage

- **Source:** user walkthrough as a personal investor (real estate, crypto, stocks, daily spending), 2026-10-19.
- **Goal linkage:** **A1 — Agent-native accounting:** the most common investor question ("what's my portfolio worth") currently has no skill owner; trade covers closed lots, ask covers spending.
- **Expected outcome:** investors can see holdings, allocation, and unrealized gains without leaving the agent workflow, and know exactly which prices are stale. Signals: holdings-question routing recall, eval pass on both clients.
- **Why now:** [m45](../../done/m45/README.md) shipped correct lots and realized gains; open-lot valuation is the read side it explicitly left uncovered, and it needs no new write path.

## Unblocked — 2026-11-08

m45 is complete and Codex 0.167.0 / gpt-6.1-sol performs real sandboxed model
turns. Run original ask evals 10–13 on the linked synthetic fixture and audit
all original 92 routing entries against the completed November 1 cohort.
Historical client evidence retains its date; any new failure must be fixed and
rerun without weakening the eval.

## Current blocker — 2026-11-08

[t003](t003.md) now has real Codex results: three original cases pass after a
locally preserved per-lot clarification; eval 13 fails because ask is never
selected and the response gives investment/tax advice. Historical 92-entry
routing is unchanged and audited, but does not cover that mixed-question miss.
**Unblock:** authenticate Claude to measure the required both-client before/after
trigger controls, fix/rerun the full original cohort and ship the rebased
candidate. **Who can clear it:** operator login, then worker. Candidate source
is unshipped and main restored; t004–t007 still depend on t003.

**Recheck 2026-11-11** — Claude Code on the macOS checkout is now
authenticated: `claude auth status` reports a claude.ai login and a
non-interactive `claude -p` turn answers. That clears the login half of this
block on that machine only. The preserved per-lot candidate is in an unpushed
worktree on the Linux runtime, not in that checkout or on origin. Codex there
refuses its configured model for the signed-in ChatGPT account, so the
both-client check still cannot run on one machine. **Unblock (updated):** push
the candidate branch to origin so the authenticated checkout can measure the
Claude trigger controls, or authenticate Claude on the Linux runtime; then
continue as above. **Who can clear it:** the operator with the Linux runtime.
