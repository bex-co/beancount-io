# w23 · m2 — Fix the journal filter mini-language

**Worker:** worker1 **Goal:** journal `filter` finds what it claims: `account:` scans transaction postings, `tag:`/`link:` match entry tags/links, full `a:b:c` paths are expressible, and the syntax is documented on every surface **Status:** in progress

## Tasks (in order)

| id | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Match account: against transaction postings ✅ | 45m | — |
| t002 | Match tag: and link: against entry tags/links ✅ | 45m | — |
| t003 | Accept quoted values with colons | 30m | — |
| t004 | Document the filter language | 30m | t001, t002, t003 |
| t005 | Adoption surface | 20m | t004 |
| t006 | Simplify | 30m | t005 |
| t007 | Test coverage | 45m | t005 |
| t008 | Closeout | 15m | t006, t007 |

## Definition of done

- `account:Checking` matches transaction postings (substring, like the top-level `account` param) as well as directive-level accounts; the note's repro row finds 11+, not 1.
- `tag:qafilt` and `link:qal1nk` match entry (and posting) tags/links — or the fields are refused as unsupported with a syntax hint, never silent-empty.
- Full account paths are expressible (quoted/escaped values survive the lexer; no `Trailing tokens`).
- `tag:#qafilt` answers a syntax hint, not a bare lexer error.
- The `field:value` syntax, field list, and escaping rules are documented on the `filter` property and in `docs/mcp.md`; REST/GraphQL/MCP behave identically (shared evaluator + parity tests).
- Package gates green in every touched package; OpenAPI regen with no drift.

## Source + Goal linkage

- **Source:** promoted from `w23/089` (inbox note): production repro 2026-10-25 shows `tag:`/`link:` answering empty, `account:` missing postings, and full paths unexpressible. Triage located the evaluator (`backend-cluster/ledger/src/foundation/rustledger/directive-filter.ts`, a 1300-line Fava reimplementation shared backend-wide) and sized the four fix steps past the sub-hour note limit.
- **Goal linkage:** A1 (agent-native accounting) — agents filtering journals by tag, link, or account silently get wrong-empty answers today.
- **Expected outcome:** journal search by account/tag/link works as documented; agents can discover the syntax from the tool description and docs.
- **Why now:** silent wrong-empty results corrupt agent conclusions ("no tagged entries", "no activity"); the fix is contained in one evaluator plus docs.
- **Adoption surface:** included — the milestone ships agent-facing documentation (tool description + `docs/mcp.md`) that must be accurate on every surface.
