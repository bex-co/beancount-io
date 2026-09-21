# w5 · m8 — Validate and release authenticated CLI live prices

**Worker:** worker1
**Goal:** Validate and release authenticated CLI live prices.
**Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Exercise packaged and authenticated live journeys | 40m | w5/m7/t006 |
| t002 | Align launch documentation and versioned artifacts | 40m | w5/m8/t001 |
| t003 | Publish and verify PyPI and Homebrew release | 40m | w5/m8/t002 |
| t004 | Adoption surface | 40m | w5/m8/t003 |
| t005 | Simplify | 40m | w5/m8/t004 |
| t006 | Test coverage | 40m | w5/m8/t005 |
| t007 | Closeout | 40m | w5/m8/t006 |

## Definition of done

The versioned CLI passes make check-all, installed wheel/sdist smoke and authenticated feed smoke. Matching frontend/helper artifacts are published to PyPI and Homebrew and verified by post-publication installation checks; documentation teaches the actual authentication and freshness contract.

## Source + Goal linkage

- **Source:** `docs/prfaqs/PRFAQ003-cli-live-prices.md` and user request to implement all six launch gaps on 2026-09-21; extends ADR018 rather than rebuilding managed includes.
- **Goal linkage:** **A2 / A3** — make authenticated local valuation usable and trustworthy for people and coding agents.
- **Expected outcome:** A CLI user can install the published CLI and complete the documented live-price journey.
- **Why now:** Depends on the preceding milestone; completes the launch contract before claiming public availability.
- **Adoption surface:** Included because commands and documentation are user- and agent-facing.
