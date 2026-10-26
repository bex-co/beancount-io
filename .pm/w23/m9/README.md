# w23 · m9 — Unify the universal write-flag spellings

**Worker:** worker1 **Goal:** agents pass `dry_run`/`dryRun` and `allowInvalid`/`allow_invalid` in either spelling on every surface without memorizing per-flag, per-tool conventions **Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Reproduce + map the flag splits, decide canonical spellings ✅ | 45m | — |
| t002 | Preview-flag aliases end to end | 60m | t001 |
| t003 | Commit-despite-errors aliases end to end | 60m | t002 |
| t004 | Document the flag spellings | 30m | t003 |
| t005 | Adoption surface | 20m | t004 |
| t006 | Simplify | 30m | t005 |
| t007 | Test coverage | 45m | t005 |
| t008 | Closeout | 15m | t006, t007 |

## Definition of done

- Both spellings of each universal write flag are accepted everywhere the flag exists: the preview flag on MCP (`dry_run`), REST (bodies and bank queries), and GraphQL, and the commit-despite-errors flag on all three surfaces; two different values in one call refuse rather than guess.
- No existing caller breaks: aliases only, no renames; the canonical spelling per surface is documented in `docs/mcp.md`.
- Parity tests prove both spellings and the conflict refusal on REST, GraphQL, and MCP; OpenAPI regen with no drift; package gates green.

## Source + Goal linkage

- **Source:** promoted from `w23/097` (inbox note): production audit 2026-10-26 shows the preview flag spelled `dry_run` on MCP and REST bank queries but `dryRun` on REST bodies and GraphQL, while the commit-despite-errors flag is `allowInvalid` everywhere — and `appendLedgerText` takes both conventions side by side, so no single convention can be inferred.
- **Goal linkage:** A1 (agent-native accounting) — every write path takes one or both flags; the spelling split is load-bearing on every mutation call an agent makes.
- **Expected outcome:** an agent passes either spelling of either flag on any surface and is refused only when it sends two different values; `docs/mcp.md` names the canonical spelling per surface.
- **Why now:** w23/m3 (done) established the alias pattern on entry spellings and w23/m8 (done) extended it to bank ids; this milestone closes the same naming family for the two universal flags, sequenced right after so the pattern and parity tests stay coherent. The note's counts predate w23/m7's preview flags — t001 recounts on `main` and the canonical-spelling decision belongs to the owner there.
- **Adoption surface:** included — the milestone ships agent-facing argument names that must hold on every surface.
