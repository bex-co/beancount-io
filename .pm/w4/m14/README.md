# w4 · m14 — Restore truthful Catalan navigation and Journal labels

**Worker:** worker1 **Goal:** Catalan readers can recognize navigation, filters and journal controls without unrelated error/loading text **Status:** todo (t001 done)

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Repair Catalan shared navigation and filter messages — **DONE** | 40m | — |
| t002 | Repair Catalan Journal message associations | 50m | t001 |
| t003 | Verify the localized adoption surface | 10m | t002 |
| t004 | Simplify the catalog changes | 10m | t003 |
| t005 | Test real Catalan controls and run dashboard gates | 35m | t003, t004 |
| t006 | Close out the verified Catalan repair | 10m | t005 |

155 minutes total. Severity: major localized interface defect. Owning package: dashboard.

## Definition of done

- The Catalan Overview link identifies Overview; it does not claim missing Trial Balance data.
- Shared payee/tag filtering has an instructional placeholder, and Clear all describes clearing filters in desktop and narrow filter sheets.
- Journal Open, Note, Pending, Other, Metadata and Payee/Narration labels match their actions or contents; a populated journal does not present unrelated validation/loading text as those controls.
- Catalan Open-only selection still returns the same 53 Open entries for the recorded example/year; clearing shared filters restores the same 1,044 transactions when Transaction is selected.
- Existing English controls, API inputs, persisted directive selections, table semantics, filter counts, navigation and permission gates remain unchanged.
- A real-catalog rendered/browser regression covers the reported labels and their actions, and dashboard format/lint/test/build pass before closeout.

## Source + Goal linkage

- **Source:** repeated `qa-find-bugs-dashboard` on September 17, 2026; exact public reproducer and source mapping in [FINDINGS.md](./FINDINGS.md).
- **Goal linkage:** A2 frictionless onboarding and A3 community credibility: a Catalan newcomer can explore the public ledger without mistaking controls for application errors.
- **Expected outcome:** the public Journal and common navigation/filter journey are understandable in Catalan at desktop and narrow widths.
- **Why now:** independently repeated live controls are assigned messages for different concepts. A one-key Clear all correction would leave the same journey unusable.
- Adoption surface is included because existing user-facing localized routes change. No new language, dependency, API capability or ledger mutation is requested. Other locales' mixed Clear all strings are separately scoped in [083](../083.md).
