# w4 · m18 — Make complete BQL cell values readable

**Worker:** worker1 **Goal:** readers can inspect every inventory unit and every line of printed directives without losing virtual-table usability **Status:** todo (t001–t003 done)

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Expose complete values within the virtual result table — **DONE** | 30m | — |
| t002 | Preserve inventory units and multiline directive structure — **DONE** | 25m | t001 |
| t003 | Verify the query inspection adoption journey — **DONE** | 10m | t002 |
| t004 | Simplify cell presentation and sizing ownership | 10m | t003 |
| t005 | Test real geometry and large-result behavior, then run gates | 35m | t004 |
| t006 | Close out after desktop and narrow inspection passes | 10m | t005 |

120 minutes across implementation and verification. Promoted w4/078 with its complete evidence preserved in [FINDINGS.md](./FINDINGS.md), expanded by independently reproduced PRINT values.

## Definition of done

- The eight-unit asset Inventory is fully inspectable and no unit silently disappears below the first line.
- PRINT's four-line Opening transaction exposes all three posting amounts and meaningful line structure at desktop/narrow widths.
- Complete values are accessible by keyboard if a separate full-cell view is used; focus returns predictably. Ordinary one-line cells remain compact.
- Multiple tall cells do not overlap or break virtual row indexes, aligned columns, later-row access or1001-row performance. Holdings remains unchanged.
- API data, decimal precision, inventory formatting and CSV contents remain exact. Do not patch the backend or replace the native query contract.
- Meaningful browser/geometry regressions cover the reproduced defect, and dashboard format/lint/test/build pass.

## Source + Goal linkage

- **Source:** user-requested repeated dashboard QA for w4,2026-09-17; promoted078 plus PRINT reproduction.
- **Goal linkage:** A2 — a reader can inspect financial query results directly and trust that all units/postings are available.
- **Expected outcome:** useful multi-unit aggregates and PRINT results remain readable at both widths.
- **Why now:** m37's multi-unit renderer and valid engine strings meet a36px/nowrap virtual cell that cannot display them completely.
- **Adoption surface:** verify existing BQL examples, query execution and result affordances; document a new full-value action only if the chosen repair introduces one.
- **Coordination:** preserve completed w3/m28 and m37. w4/077 is a separate row-count translation; w4/081 is a different hierarchy amount renderer.
