# w2 · m52 — Record crypto-native events: swaps, staking, and network fees

**Worker:** worker2 **Goal:** a crypto holder records a coin-to-coin swap, staking or airdrop income, and a wallet transfer that pays its network fee in-kind — each with lots and booking-produced gains intact. **Status:** active (t001–t005 done)

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| [t001](done/t001.md) | Record a crypto-to-crypto swap as a priced sell and buy pair — **DONE** | 45m | w2/m45/t002 |
| [t002](done/t002.md) | Record staking rewards and airdrops as income at fair value — **DONE** | 45m | t001 |
| [t003](done/t003.md) | Carry an in-kind network fee on own-wallet transfers — **DONE** | 45m | t001 |
| [t004](done/t004.md) | Write evals, routing entries, and run them on both clients — **DONE** | 60m | t001, t002, t003 |
| [t005](done/t005.md) | Adoption surface — **DONE** | 30m | t004 |
| t006 | Simplify | 15m | t005 |
| t007 | Test coverage | 45m | t005, t006 |
| t008 | Closeout | 15m | t007 |

## Previous blocker

- **t004 onward (2026-10-20)** — t001–t003 are shipped (swaps, staking/airdrops, in-kind fees live in `beancount-trade`), and t004's Claude Code half passes (evals 4/4, routing 102/103 with the miss shown to be variance; evidence in [t004](done/t004.md)). t004's acceptance requires both clients, and Codex returns its account usage-limit error until 2026-11-17, so t005–t008 wait behind it. **Unblock:** Codex usage returns (2026-11-17); rerun trade evals 11–14 and the 103-prompt routing set on Codex, close t004, then t005 (adoption) starts. **Who can clear it:** the operator (Codex usage).

## Definition of done

- A swap disposes the named lot at a user-stated value with a booking-produced gain and opens the received lot at that value; no stated value, no entry.
- Staking/airdrop receipts book as dated lots against named income at stated fair values; own-wallet transfers can burn an in-kind fee from the same lot with units reconciling exactly.
- Evals pass on both clients; cash buys, exchange files, and price questions keep routing to their existing owners.

## Source + Goal linkage

- **Source:** user walkthrough as a personal investor (real estate, crypto, stocks, daily spending), 2026-10-19.
- **Goal linkage:** **A1 — Agent-native accounting:** m45 made crypto follow stock rules; these are the events stocks don't have, and they are most of an active holder's year.
- **Expected outcome:** crypto holders stop hand-editing entries for swaps, rewards, and fees. Signals: eval pass on both clients, trade-skill invocations on crypto prompts.
- **Why now:** m45/t002's procedures and eval 7's transfer fixture are the direct base; the gap list came from walking them as a holder.


## Unblocked — 2026-11-08

Original crypto evals 11–14 pass 4/4 on Codex 0.167.0 / gpt-6.1-sol with
native approved writes and independent ledger/lot checks. The unchanged
original 103 routing entries are fully covered by later completed cohorts
on both clients, with trade's description unchanged. t004 is complete;
t005 adoption is complete; t006 simplify is next. Historical client versions and dates remain distinct.
