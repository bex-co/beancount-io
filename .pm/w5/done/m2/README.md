# w5 · m2 — Accessibility pass on /ledger + gallery

**Worker:** worker1 **Goal:** fix the four concrete accessibility violations on the `/ledger` sidebar and the ledger gallery so both are keyboard-operable and screen-reader-correct. **Status:** done

## Tasks (in order)

| id   | title                                                                        | est | depends_on                   |            |
| ---- | ---------------------------------------------------------------------------- | --- | ---------------------------- | ---------- |
| t001 | Home/logo button: aria-label + localized descriptive img alt                 | 25m | —                            | — **DONE** |
| t002 | Ledger row: restructure nested button-in-button; 24px targets; aria-labels   | 40m | —                            | — **DONE** |
| t003 | Gallery combobox: role=listbox, aria-controls/activedescendant, clear button | 40m | —                            | — **DONE** |
| t004 | Delete-ledger dialog: destructive-action focus/aria semantics                | 20m | —                            | — **DONE** |
| t005 | Adoption surface                                                             | 30m | w5/m2/t001, t002, t003, t004 | — **DONE** |
| t006 | Simplify                                                                     | 30m | w5/m2/t005                   | — **DONE** |
| t007 | Test coverage                                                                | 45m | w5/m2/t005                   | — **DONE** |
| t008 | Closeout                                                                     | 10m | w5/m2/t007                   | — **DONE** |

## Definition of done

The four violations are gone: the home/logo control and icon-only buttons have accessible names; ledger rows no longer nest a button inside a button and meet 24px minimum target size; the gallery combobox exposes listbox semantics and its clear button is keyboard-reachable; the delete-ledger dialog communicates its destructive nature to assistive tech. Sidebar and gallery are operable by keyboard and announce correctly to a screen reader.

## Source + Goal linkage

- **Source:** `/pm-brainstorm` 2026-08-17 — same polish review as w5/m1. Violations verified in code: `dashboard-sidebar.tsx` (~line 328 plain `<button>` home control, `alt="Logo"`; ~line 112 icon-only 20px settings trigger without `aria-label`; `LedgerItem` nests the dropdown `<button>` inside `SidebarMenuButton`), `ledger-switcher.tsx` (same generic `alt="Logo"`), `pages/gallery-page/index.tsx` (combobox lacks `role="listbox"`/`aria-controls`/`aria-activedescendant`; clear button `tabIndex={-1}`).
- **Goal linkage:** **A2 — Frictionless onboarding** (accessibility is onboarding friction) with **A3 — Community & distribution** credibility for open-source contributors evaluating the codebase.
- **Expected outcome:** keyboard and screen-reader users can complete create/edit/delete ledger and gallery search; no nested-interactive-element semantics.
- **Why now:** sequenced after w5/m1 — both touch `LedgerItem`, and re-doing a11y over rows that are about to change wastes the pass.
- **Adoption surface:** included — user-facing dashboard change.
