# w5 · m7 — Expose live-price provenance in ordinary reports

**Worker:** worker1
**Goal:** Expose live-price provenance in ordinary reports.
**Status:** done

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Carry source metadata from the report load— **DONE** | 40m | w5/m6/t007 |
| t002 | Render freshness and failures for humans and agents— **DONE** | 40m | w5/m7/t001 |
| t003 | Adoption surface— **DONE** | 40m | w5/m7/t002 |
| t004 | Simplify— **DONE** | 40m | w5/m7/t003 |
| t005 | Test coverage— **DONE** | 40m | w5/m7/t004 |
| t006 | Closeout— **DONE** | 40m | w5/m7/t005 |

## Definition of done

Ordinary balance and report output exposes stale observations and refresh failures, with machine-readable source metadata describing the same revision used for the calculation. Offline and strict modes retain documented behavior.

## Source + Goal linkage

- **Source:** `docs/prfaqs/PRFAQ003-cli-live-prices.md` and user request to implement all six launch gaps on 2026-09-21; extends ADR018 rather than rebuilding managed includes.
- **Goal linkage:** **A1** — make authenticated local valuation usable and trustworthy for people and coding agents.
- **Expected outcome:** A CLI user can assess source freshness directly from the report they use.
- **Why now:** Depends on the preceding milestone; completes the launch contract before claiming public availability.
- **Adoption surface:** Included because commands and documentation are user- and agent-facing.

## Verification

All five ordinary report commands expose the same source revision in JSON. Cached 503 failures and observation age are visible in text; offline reads make no additional request and strict reads reject stale sources. See completed task evidence and `cli/tests/test_price.py`.
