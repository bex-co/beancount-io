# w23 · m39 — Prove a preview and its commit give the same verdict

**Worker:** worker1 **Goal:** A differential test runs each write twice on identical state, once with `dry_run` and once to commit, and fails when the validation verdict, the files written or the hashes differ. **Status:** done

## Tasks (in order)

| id | title | est | depends_on |
| -- | ----- | --- | ---------- |
| t001 | Choose the harness for a real preview-versus-commit run — **DONE** | 30m | — |
| t002 | Build the fixtures — **DONE** | 30m | t001 |
| t003 | Write the differential runner over every projection tool — **DONE** | 60m | t002 |
| t004 | Fix the renameLedgerFile preview baseline (w1/236) — **DONE** | 30m | t003 |
| t005 | Report an unincluded file as unvalidated, not green (w1/227) — **DONE** | 40m | t003 |
| t006 | Make a projection tool without a differential case fail the matrix — **DONE** | 20m | t003 |
| t007 | Adoption surface — **DONE** | 20m | t004, t005, t006 |
| t008 | Simplify — **DONE** | 20m | t007 |
| t009 | Test coverage — **DONE** | 30m | t007 |
| t010 | Closeout — **DONE** | 15m | t009 |

## Definition of done

For every write tool registered as a projection in `write-preview-matrix.test.ts`, a differential case compares the preview's `validation` (`errorsBefore`, `errorsAfter`, `newErrors`, `valid`) with the commit's on a broken-baseline ledger, an unincluded file, a renamed file with errors and a balance assertion spanning a move; reintroducing the `w1/236` or `w1/227` repro turns it red naming the tool; `yarn test` and `yarn typecheck` pass in backend-v2.

## Source + Goal linkage

- **Source:** `w1/236`, `w1/227`; `/pm-brainstorm more for w23` 2026-11-10, proposal 2. Builds on `w23/done/m21`.
- **Goal linkage:** A1 — Agent-native accounting.
- **Expected outcome:** An agent tidying a broken ledger can trust that a preview that says "no new errors" is what the commit will say.
- **Why now:** `write-preview-matrix.test.ts` registers which tests prove each tool; it never runs a write twice and compares. That is how `renameLedgerFile` previewed "no new errors" and then committed with 4, and how a file nothing includes got a green verdict.
- **Adoption surface:** included: previews and verdicts are what agents read.
