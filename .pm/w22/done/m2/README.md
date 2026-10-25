# w22 · m2 — No-code OFX/QFX import through upstream beangulp

**Worker:** worker1 **Goal:** `bea import bank.ofx --account Assets:Checking` previews and applies with no `importers.py`, using the shared duplicate review and rules **Status:** done

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Spike and decision note: what the managed engine already provides for OFX — **DONE** | 30m | — |
| t002 | Engine adapter: OFX/QFX file to native directive request with FITID in `import-id` — **DONE** | 60m | t001 |
| t003 | Frontend dispatch: `bea import *.ofx|*.qfx` with rules and remembered mapping — **DONE** | 50m | t002 |
| t004 | Real-sample fixtures and docs — **DONE** | 45m | t003 |
| t005 | Adoption surface — **DONE** | 25m | t004 |
| t006 | Simplify — **DONE** | 25m | t005 |
| t007 | Test coverage — **DONE** | 45m | t005 |
| t008 | Closeout — **DONE** | 15m | t006, t007 |

## Definition of done

- A checked-in synthetic `.ofx` and `.qfx` preview and then apply into a ledger with correct signs.
- Re-importing the same file writes zero rows (FITID carried into `import-id`).
- Without beangulp enabled, the command exits with the documented usage code and the exact `bea engine enable beangulp` hint.
- No new dependency enters the default install or the engine locks without user approval; `make check-all` passes from `cli/`.

## Source + Goal linkage

- **Source:** `/pm-brainstorm for cli` 2026-10-24, candidate 2; `cli/docs/IMPORTING.md` documents OFX only via a hand-written importer.
- **Goal linkage:** A2 (a newcomer with an OFX/QFX bank export imports without writing Python).
- **Expected outcome:** Newcomers and agents import the most common non-CSV bank download in one command, raising the share of first-month imports that need no Python.
- **Why now:** OFX/QFX is the most common export after CSV and today needs `importers.py`. Parsing stays upstream (beangulp, opt-in), so the cost is an adapter, and the dependency question is settled first by t001.
- **Adoption surface:** included, because the milestone ships user- and agent-facing `bea` behavior.
