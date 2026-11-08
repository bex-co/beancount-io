# w2 · m45 — Record stock, fund, and crypto trades with correct lots, and report realized gains

**Worker:** worker2 **Goal:** a user who tells their coding agent "I bought 10 VTI at 251.30", "sold 5 shares of AAPL from the 2023 lot", "my RSUs vested", or "moved my BTC to a hardware wallet" gets a proposed entry with the right cost basis and lot. It is written through `bea` only after a yes, and checked. At year end, the agent reports realized gains per lot, with holding period, from shown queries. **Status:** in progress (original Codex cohort verified; closing tasks pending)

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| [t001](done/t001.md) | Define the trigger, input contract, and placement — **DONE** | 45m | w2/m40/t009 |
| [t002](done/t002.md) | Write the trade procedures — **DONE** | 90m | t001 |
| [t003](done/t003.md) | Report realized gains for a year from BQL — **DONE** | 60m | t002 |
| [t004](done/t004.md) | Pin the booking methods `bea` accepts, and what to do when a user needs another — **DONE** | 30m | t002 |
| [t005](done/t005.md) | Write evals, fixtures, and routing entries — **DONE** | 60m | t002, t003 |
| [t006](done/t006.md) | Run the evals on Claude Code and Codex — **DONE** | 45m | t005 |
| [t007](done/t007.md) | Wire siblings, inventory, and the suite count — **DONE** | 30m | t002 |
| [t008](done/t008.md) | Adoption surface — **DONE** | 30m | t006, t007 |
| [t009](done/t009.md) | Simplify — **DONE** | 15m | t008 |
| [t010](done/t010.md) | Test coverage — **DONE** | 45m | t008, t009 |
| t011 | Closeout | 15m | t010 |

## Previous blocker

- **t006 onward (2026-10-19)** — t001–t005 and t007 are shipped, and t006's Claude Code half passes (evals 8/8, routing 90/90; evidence in [t006](done/t006.md)). t006's acceptance requires every eval on Codex too, and Codex 0.163.0 returns its account usage-limit error ("try again at Nov 17th, 2026 3:36 PM"), so t006 cannot close and t008–t011 wait behind it. **Unblock:** Codex usage returns (2026-11-17); rerun the 8 trade evals and the 90-prompt routing set on Codex, fix any skill-text failures, then t008 (adoption) starts. **Who can clear it:** the operator (Codex usage) — no owner decision is pending.

## Definition of done

- One skill owns investment trades, either new or `beancount-options` widened, as t001 decides with routing evidence. Its trigger, input contract, deliverable, and evaluation set meet [ADR 020](../../../docs/adrs/ADR020-skills-accounting-workflow-candidates.md)'s test for a top-level skill. `scripts/skills/routing.json` has positive prompts for trades, dividends, splits, lot transfers, and vests, with near-misses against `beancount-add` and `beancount-options`, and they route correctly on both clients.
- For a local ledger, the skill handles: buys with per-unit or total cost; sells that name the lot, or use the account's booking method, recording the gain in an income account; cash dividends and reinvested dividends; splits that keep total cost; transfers between the user's own accounts that keep each lot's cost and acquisition date; and RSU/ESPP vests with the income and cost basis shown. Crypto uses the same rules.
- Every write follows the suite's rails: a proposal showing the target file and exact entries, an explicit yes, existing accounts only, `bea add` with `--file` and `--into`, and a passing root `bea check` before success is reported. An ambiguous lot reduction is resolved with the user and never guessed.
- A realized-gains report for a year lists each closed lot with acquisition date, sale date, holding period (one year or less, or more), quantity, proceeds, cost, and gain, from `bea --json query` statements shown with the answer. Its total ties to the period's gain postings.
- The skill states the booking methods `bea` accepts. It does not pretend to average cost when the engine lacks it ([beancount#940](https://github.com/beancount/beancount/issues/940)).
- The skill's evals pass on Claude Code and Codex, recorded with versions and dates. The installer inventory, `skills/README.md`, `skills/AGENTS.md`, `docs/skills/installation.md`, and the root `README.md` describe the resulting suite.

## Source + Goal linkage

- **Source:** `/pm-brainstorm` 2026-10-18 on improving the customer skills against what is published online, item 4; materialized by `/pm all for w2` the same day. Demand evidence:
  - The most-upvoted open Beancount issue asks for average-cost booking ([#940](https://github.com/beancount/beancount/issues/940)). Moving lots between accounts is a recurring question ([#564](https://github.com/beancount/beancount/issues/564), [#614](https://github.com/beancount/beancount/issues/614)), and so are splits ([#941](https://github.com/beancount/beancount/issues/941)).
  - A user writes "shares … well, I'm lost" ([discussion #975](https://github.com/beancount/beancount/discussions/975)).
  - hledger built lot tracking with an agent and calls it a long-standing gap ([hledger.org/AI](https://hledger.org/AI.html)).
  - A published Claude Code tax-prep skill does FIFO crypto basis ([gist](https://gist.github.com/dcposch/8c6de2807fe8a65ebc30f64bdde07eb4)).
  - The suite today covers options only, and `beancount-migrate` explicitly leaves investment lots as follow-up work.
- **Goal linkage:** **A1 — Agent-native accounting:** an agent can keep an investment ledger correct, which is where hand-written Beancount most often goes wrong. **A3 — Community & distribution:** the largest uncovered need in the community's own trackers gets a checked workflow, and no published Beancount skill found in the research handles lots with this rigor.
- **Expected outcome:** a user records trades, dividends, splits, vests, and transfers by describing them, and gets a realized-gains table for a year whose total ties to the ledger. Signals: routing recall for trade prompts, skill invocations once the registry listings exist, and fewer lot questions in issues that cite the suite.
- **Why now:** [m40](../done/m40/README.md) settles which single-entry requests `beancount-add` owns, so the trade boundary can be drawn against it. Follow [m41](../done/m41/README.md)'s compact procedure style rather than the current patch-note style. Fetching fresh quotes is the blocked [w4/m9](../../w4/blocked/m9/README.md); this milestone values holdings only from prices already in the ledger. Adoption surface is included because this adds or widens a customer-facing skill.

## Out of scope

- Tax forms, tax advice, wash-sale adjustments, and jurisdiction-specific holding-period rules beyond the one-year split.
- Fetching quotes ([w4/m9](../../w4/blocked/m9/README.md)) and foreign-exchange gains.
- Re-implementing lot booking. Beancount's booking does the matching; the skill chooses and states the method.

## Unblocked — 2026-11-08

Codex 0.167.0 / gpt-6.1-sol now completes real Linux model turns. The original
8-case behavior cohort resumes on a linked synthetic workspace per eval. Existing
routing evidence is audited independently rather than replacing failed runs.
