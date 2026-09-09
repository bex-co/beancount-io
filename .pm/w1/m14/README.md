# w1 · m14 — Ledger writes stay git-friendly: `import-id` convention and append-only alignment

**Worker:** worker1 **Goal:** an entry `bea` writes looks like one a person would write: a short `import-id` in the shape the ledger skills already use, and a diff that touches only the lines being added **Status:** todo

## Tasks (in order)

| id   | title                                                                                         | est | depends_on |
| ---- | --------------------------------------------------------------------------------------------- | --- | ---------- |
| t001 | `bea import` writes `import-id` in the skills' `<kind>:<id>` / `csv:sha256:<16-hex>` shape    | 60m | —          |
| t002 | Writes align only the appended block to the destination's existing indentation and column    | 45m | —          |
| t003 | Adoption surface                                                                              | 20m | t001, t002 |
| t004 | Simplify                                                                                      | 30m | t003       |
| t005 | Test coverage                                                                                 | 45m | t003       |
| t006 | Closeout                                                                                      | 15m | t005       |

## Definition of done

- An import from the example CSV writes `import-id: "bank:bank-001"` style metadata when the importer supplies a stable ID and `import-id: "csv:sha256:<16 hex>"` otherwise, computed with the normalization in `skills/.claude/skills/beancount-import/references/dedup.md`; re-importing the same file skips every row, and a ledger written by the `beancount-import` skill deduplicates against `bea import` and vice versa.
- Ledgers carrying the pre-release `bea_import_id` key still deduplicate on re-import.
- `bea add transaction` and `bea import --apply` on a file whose postings use four-space indentation produce a diff containing only the appended lines; `bea format` remains the only command that realigns existing entries.
- `cli/docs/IMPORTING.md`, `cli/README.md`, and `cli/docs/USAGE.md` describe the convention and the append-only rule.
- `make check-all` passes from `cli/`.

## Source + Goal linkage

- **Source:** CLI UX review 2026-09-08 — every imported entry carried a 64-hex `bea_import_id` line, and a three-row import produced a diff touching nine existing lines because one new account name was wider. The ledger skills already define an interoperable `import-id` convention (`references/dedup.md`) that the CLI ignores.
- **Goal linkage:** **A1 — Agent-native accounting:** one dedup convention shared by the CLI, the `beancount-import` skill, and `beancount-migrate` means an agent can mix tools without double-booking. **A3 — Community & distribution:** plain-text users judge a tool by the diff it leaves in git; noise here is what gets a CLI uninstalled.
- **Expected outcome:** a git-tracked ledger shows only the added entries per import; a user who imported with the skill last month and with `bea` this month sees zero duplicates.
- **Why now:** both behaviors are on-disk. Changing them before `cli-v0.1.0` is tagged (w2/m25 closeout) avoids a migration; after that every ledger written by the CLI carries the old shape. Adoption surface included: the change is visible in every ledger the CLI writes and in three docs.
