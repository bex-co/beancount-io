# w23 · m43 — Accept directive metadata on every typed entry and gate the journal round trip

**Worker:** worker1 **Goal:** Every directive type the journal returns metadata for can be written back through the typed entry tool with that metadata, and a round-trip test keeps it that way. **Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| -- | ----- | --- | ---------- |
| t001 | Add string-valued meta to every non-transaction entry type | 50m | — |
| t002 | Render directive meta through the serializer | 40m | t001 |
| t003 | Write the journal round-trip gate | 50m | t002 |
| t004 | Report a byte-identical updateEntrySource as a no-op | 25m | — |
| t005 | Regenerate OpenAPI and the CLI pin; update the entry-tool docs | 30m | t002 |
| t006 | Adoption surface | 20m | t003, t004, t005 |
| t007 | Simplify | 20m | t006 |
| t008 | Test coverage | 30m | t006 |
| t009 | Closeout | 15m | t008 |

## Definition of done

`addLedgerEntries` accepts string-valued `meta` on open, close, commodity, price, balance, note, event, document and pad on REST, GraphQL and MCP; a round-trip test feeds the journal JSON of a fixture holding every directive type with metadata back through `addLedgerEntries` `dry_run` and parses it back identical; removing metadata rendering for any type turns it red; `updateEntrySource` with byte-identical text reports a no-op; OpenAPI is regenerated and the CLI pin re-synced; `yarn test` passes in backend-v2.

## Source + Goal linkage

- **Source:** `w1/233`; `/pm-brainstorm more for w23` 2026-11-10, proposal 6. Builds on `w23/done/m6` (typed entry schema).
- **Goal linkage:** A1 — Agent-native accounting.
- **Expected outcome:** An agent can set up accounts and commodities with the keys other tools read (a commodity's `price:` for bean-price, an open's `account:` for importers) through the typed tool, without dropping to raw text.
- **Why now:** `w23/m6` completed the typed schema for transactions and postings, but every non-transaction variant is a strict object without `meta` (`entries-handler.ts`), so the journal's metadata cannot be written back. QA verified a 261-entry round trip by hand and lost only the metadata on 16 directives.
- **Adoption surface:** included: agents and integrators use the typed entry schema directly.
