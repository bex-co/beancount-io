# w5 · m6 — Authenticate live prices and report refresh failures

**Worker:** worker1
**Goal:** Authenticate live prices and report refresh failures.
**Status:** done

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Relay existing cloud credentials to trusted price requests— **DONE** | 40m | — |
| t002 | Classify authentication and source failures— **DONE** | 40m | w5/m6/t001 |
| t003 | Make explicit refresh outcomes truthful— **DONE** | 40m | w5/m6/t002 |
| t004 | Adoption surface— **DONE** | 40m | w5/m6/t003 |
| t005 | Simplify— **DONE** | 40m | w5/m6/t004 |
| t006 | Test coverage— **DONE** | 40m | w5/m6/t005 |
| t007 | Closeout— **DONE** | 40m | w5/m6/t006 |

## Definition of done

Saved login and BEA_TOKEN load a trusted managed feed through a real helper process. Other origins and redirects receive no credential. Cached reads survive failed refreshes, while explicit refresh returns nonzero and identifies every failed source.

## Source + Goal linkage

- **Source:** `docs/prfaqs/PRFAQ003-cli-live-prices.md` and user request to implement all six launch gaps on 2026-09-21; extends ADR018 rather than rebuilding managed includes.
- **Goal linkage:** **A1 / A2** — make authenticated local valuation usable and trustworthy for people and coding agents.
- **Expected outcome:** A CLI user can reuse a cloud login and distinguish failed refreshes from successful cached reads.
- **Why now:** Hosted feeds require authentication; the existing anonymous resolver cannot fulfill the launch promise.
- **Adoption surface:** Included because commands and documentation are user- and agent-facing.

## Verification

Saved-login and BEA_TOKEN real frontend/helper subprocess tests pass; origin/path scope, expired login, token-free failures/cache, mixed refresh results and offline refusal are covered. A real authenticated BTC-USD refresh returned exit 0 with a recent validated revision on 2026-09-21. See completed task evidence and `cli/tests/test_price.py`.
