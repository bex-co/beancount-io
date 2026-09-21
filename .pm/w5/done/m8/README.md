# w5 · m8 — Validate and release authenticated CLI live prices

**Worker:** worker1
**Goal:** Validate and release authenticated CLI live prices.
**Status:** done

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Exercise packaged and authenticated live journeys — **DONE** | 40m | w5/m7/t006 |
| t002 | Align launch documentation and versioned artifacts — **DONE** | 40m | w5/m8/t001 |
| t003 | Publish and verify PyPI and Homebrew release— **DONE** | 40m | w5/m8/t002 |
| t004 | Adoption surface— **DONE** | 40m | w5/m8/t003 |
| t005 | Simplify— **DONE** | 40m | w5/m8/t004 |
| t006 | Test coverage— **DONE** | 40m | w5/m8/t005 |
| t007 | Closeout— **DONE** | 40m | w5/m8/t006 |

## Definition of done

The versioned CLI passes make check-all, installed wheel/sdist smoke and authenticated feed smoke. Matching frontend/helper artifacts are published to PyPI and Homebrew and verified by post-publication installation checks; documentation teaches the actual authentication and freshness contract.

## Source + Goal linkage

- **Source:** `docs/prfaqs/PRFAQ003-cli-live-prices.md` and user request to implement all six launch gaps on 2026-09-21; extends ADR018 rather than rebuilding managed includes.
- **Goal linkage:** **A2 / A3** — make authenticated local valuation usable and trustworthy for people and coding agents.
- **Expected outcome:** A CLI user can install the published CLI and complete the documented live-price journey.
- **Why now:** Depends on the preceding milestone; completes the launch contract before claiming public availability.
- **Adoption surface:** Included because commands and documentation are user- and agent-facing.

## Release verification

CLI 0.3.0 was published from c80a49fd (tag cli-v0.3.0). Release workflow https://github.com/bex-co/beancount-io/actions/runs/35575551718 completed successfully with all 21 jobs: full checks, 12 cross-platform Python artifact installs, two Homebrew rehearsals, publication and five public-channel installation checks. PyPI wheel/sdist hashes match the GitHub artifacts; the public Homebrew formula uses that sdist. The exact CI wheel passed authenticated production refresh/check/valuation/offline/export/manual-precedence validation.

Package and release documentation and PRFAQ003 name 0.3.0 and the actual credential/freshness contract. Root package tables remain accurate; no new skill or divergent agent instructions were introduced. `scripts/check-agent-guidance.py` passed all 17 scopes and the shared skill link. Behavior-preserving simplification review reused existing subprocess, credential, cache, JSON and smoke infrastructure; no installed `/simplify` skill was available, so its specified review was performed directly. Regression coverage includes credentials, URL scope, body-read failures retaining cached data, mixed refresh results, report provenance and packaged workflows. Local `make check-all` passed; final price suite: 167 passed, one explicit network probe skipped. No private ledger data or credential was committed.
