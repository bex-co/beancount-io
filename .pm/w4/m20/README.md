# w4 · m20 — Name Budget, Commodities, Statistics and Settings tables

**Worker:** worker1 **Goal:** Let readers identify a table's account, currency pair, report purpose or option family through accessible table navigation. **Status:** todo (t001–t003 done)

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| [t001](./done/t001.md) | Name Budget and Commodities histories — **DONE** | 35m | — |
| [t002](./done/t002.md) | Associate Statistics and Settings tables with their headings — **DONE** | 40m | t001 |
| [t003](./done/t003.md) | Adoption surface — **DONE** | 15m | t002 |
| [t004](./t004.md) | Simplify | 10m | t003 |
| [t005](./t005.md) | Test coverage | 40m | t003, t004 |
| [t006](./t006.md) | Closeout | 10m | t005 |

## Definition of done

Public Budget histories, Commodities histories, all three Statistics tables and both read-only Settings tables expose meaningful accessible names matching their visible identity. Names stay correct through supported filters, disclosures and loading/data states, with stable associations and no duplicate IDs. Existing data, table semantics, localized headings, account links, keyboard behavior and permissions remain intact. Meaningful rendered regression tests and dashboard gates pass; native browser inspection confirms narrow and desktop results. Record actual screen-reader coverage only when exercised.

## Source + Goal linkage

- **Source:** Promoted w4/091 with expanded Statistics evidence from repeated dashboard QA on2026-09-17; [full finding](./FINDINGS.md).
- **Goal linkage:** A2 — Frictionless onboarding: public financial tables remain identifiable to readers navigating by table.
- **Expected outcome:** Seven budget histories, distinct commodity histories, three Statistics tables and two Settings tables can be distinguished by their accessible names.
- **Why now:** The same missing association spans seven authoring components; repair, regression coverage and integration checks total150minutes and exceed a loose inbox note.
- **Adoption surface:** Included for the four public reader journeys; no new package, skill or acquisition surface is introduced.
