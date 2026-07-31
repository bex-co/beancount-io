# w2 · m4 — beancount-ask: local BQL Q&A over the ledger

**Worker:** worker2 **Goal:** an agent answers everyday financial questions ("top expenses this quarter", "what subscriptions crept up") with correct, shown BQL over the local ledger — no hosted service required **Status:** todo

## Tasks (in order)

| id   | title                                                  | est  | depends_on |
| ---- | ------------------------------------------------------ | ---- | ---------- |
| t001 | SKILL.md skeleton: triggers/skip (read-only Q&A)       | 30m  | —          |
| t002 | BQL recipe reference — reuse bean-query and cli/       | 1.5h | t001       |
| t003 | Answer conventions: show query, link Fava, no made-up numbers | 30m  | t002       |
| t004 | Evals: fixture ledger + Q/A pairs with expected values | 45m  | t003       |
| t005 | Adoption surface — skill discoverable on every surface | 30m  | t004       |
| t006 | Simplify                                               | 20m  | t005       |
| t007 | Test coverage — failure-mode evals                     | 45m  | t005       |
| t008 | Closeout                                               | 15m  | t007       |

## Definition of done

Against a fixture ledger, the skill answers the standard question set (top expenses, monthly category trends, net worth, burn rate, recurring charges + price creep, anomalies) with numerically correct values, every figure produced by a shown BQL query (never model arithmetic); fully local via `bean-query`/`cli` — no hosted-API dependency; evals pass.

## Source + Goal linkage

- **Source:** /pm-brainstorm 2026-07-31 — July 2026 skills-market research: "Ask Digits" ($65/mo) and Monarch's assistant ($99/yr) sell exactly this; over structured plain text it is near-zero-cost to match, and every figure is reproducible.
- **Goal linkage:** A1 — agent-native ledger analysis with deterministic queries as the trust rail; A3 — the most demo-able skill in the suite (screenshots/launch content). Reuses `bean-query` and the `cli/` package's BQL surface rather than duplicating them (DO_NOT_DO-clean); complements, and shares no code with, the hosted Ask AI in w1.
- **Expected outcome:** users get paid-assistant parity locally for free; observable via installs/invocations and demo-content engagement.
- **Why now:** cheap and low-stakes (read-only), sequenced after the write-path skills that carry more differentiation; feeds launch content for the suite. Adoption surface included: ships a new agent-facing skill.
