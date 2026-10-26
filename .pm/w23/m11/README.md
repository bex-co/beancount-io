# w23 · m11 — Unify the temp-asset object-key spellings

**Worker:** worker1 **Goal:** agents pass `objectKey`/`s3ObjectKey`/`receiptObjectKey` in any spelling on MCP, REST, and GraphQL without memorizing which tool takes which **Status:** todo (t001–t003 done)

## Tasks (in order)

| id | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Map the key splits, decide the canonical spelling ✅ | 30m | — |
| t002 | Parse-path key aliases end to end ✅ | 45m | t001 |
| t003 | Insert-path key alias end to end ✅ | 45m | t002 |
| t004 | Document the key spellings | 30m | t003 |
| t005 | Adoption surface | 20m | t004 |
| t006 | Simplify | 30m | t005 |
| t007 | Test coverage | 45m | t005 |
| t008 | Closeout | 15m | t006, t007 |

## Definition of done

- Every spelling of the temp-asset object key is accepted everywhere the key exists: `objectKey`, `s3ObjectKey`, and `receiptObjectKey` on the MCP tools and resources, the REST routes, and the GraphQL operations; two different values in one call refuse rather than guess.
- No existing caller breaks: aliases only, no renames; the canonical spelling per surface is documented in `docs/mcp.md`.
- Parity tests prove every spelling and the conflict refusal on REST, GraphQL, and MCP; OpenAPI regen with no drift; package gates green.

## Source + Goal linkage

- **Source:** promoted from `w23/100` (inbox note): production audit 2026-10-26 shows the same caller-owned `tmp/…` key spelled `receiptObjectKey` on insert, `objectKey` on `parseReceipt`, and `s3ObjectKey` on `parseFile`, with the same three-way split on REST (×2/×4/×4) and GraphQL (×1/×2/×2).
- **Goal linkage:** A1 (agent-native accounting) — the upload→parse→insert chain passes one key through three tools that each spell it differently; strict schemas refuse the guessed spelling.
- **Expected outcome:** an agent passes any spelling of the key on any surface and is refused only when it sends two different values; `docs/mcp.md` names the canonical spelling per surface.
- **Why now:** w23/m3 (done) established the alias pattern, and w23/m8/m9/m10 (done) extended it across bank ids, universal flags, and journal params; this milestone closes the same naming family for the temp-asset key, sequenced right after so the pattern and parity tests stay coherent.
- **Adoption surface:** included — the milestone ships agent-facing argument names that must hold on every surface.
