# w5 · m6 — Authenticate live prices and report refresh failures

**Worker:** worker1
**Goal:** Authenticate live prices and report refresh failures.
**Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Relay existing cloud credentials to trusted price requests | 40m | — |
| t002 | Classify authentication and source failures | 40m | w5/m6/t001 |
| t003 | Make explicit refresh outcomes truthful | 40m | w5/m6/t002 |
| t004 | Adoption surface | 40m | w5/m6/t003 |
| t005 | Simplify | 40m | w5/m6/t004 |
| t006 | Test coverage | 40m | w5/m6/t005 |
| t007 | Closeout | 40m | w5/m6/t006 |

## Definition of done

Saved login and BEA_TOKEN load a trusted managed feed through a real helper process. Other origins and redirects receive no credential. Cached reads survive failed refreshes, while explicit refresh returns nonzero and identifies every failed source.

## Source + Goal linkage

- **Source:** `docs/prfaqs/PRFAQ003-cli-live-prices.md` and user request to implement all six launch gaps on 2026-09-21; extends ADR018 rather than rebuilding managed includes.
- **Goal linkage:** **A1 / A2** — make authenticated local valuation usable and trustworthy for people and coding agents.
- **Expected outcome:** A CLI user can reuse a cloud login and distinguish failed refreshes from successful cached reads.
- **Why now:** Hosted feeds require authentication; the existing anonymous resolver cannot fulfill the launch promise.
- **Adoption surface:** Included because commands and documentation are user- and agent-facing.
