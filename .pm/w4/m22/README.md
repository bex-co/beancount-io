# w4 · m22 — Expose read-only state in Monaco readers

**Worker:** worker1 **Goal:** Public source and entry readers expose their actual read-only state while authorized editors retain editing behavior. **Status:** todo (t001 done)

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| [t001](./done/t001.md) | Expose read-only state through the Monaco integration — **DONE** | 30m | — |
| [t002](./t002.md) | Cover Entry Context and read-only preview consumers | 25m | t001 |
| [t003](./t003.md) | Adoption surface | 15m | t002 |
| [t004](./t004.md) | Simplify | 10m | t003 |
| [t005](./t005.md) | Test coverage | 35m | t003, t004 |
| [t006](./t006.md) | Closeout | 10m | t005 |

## Definition of done

Real native accessibility inspection reports readonly=true for anonymous file source and Entry Context in supported EditContext and textarea modes, while editing remains rejected. Local preview and writer/view-mode fixtures preserve correct state, editing permissions, drafts, selection, Find, source navigation and dialog behavior. No browser API is globally removed. Meaningful integration checks and dashboard gates pass, with unexercised assistive technologies clearly recorded.

## Source + Goal linkage

- **Source:** Promoted w4/102 with Entry Context and fallback evidence from repeated dashboard QA,2026-09-17; [full finding](./FINDINGS.md).
- **Goal linkage:** A2 — Frictionless onboarding: public readers should know a source/entry editor is read-only before attempting to edit it.
- **Expected outcome:** Consistent actual native input state across existing Monaco reader integrations without weakening permissions.
- **Why now:** The original file-viewer55m note now spans a shared input-mode issue plus Entry Context's missing DOM read-only option and source-derived previews. Integration and checks require125minutes across multiple tasks.
- **Adoption surface:** Included for anonymous source and entry-context journeys. Scope is dashboard; no API, dependency or new package.
