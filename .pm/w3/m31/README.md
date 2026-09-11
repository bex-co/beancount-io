# w3 · m31 — Complete the Entry Context keyboard journey

**Worker:** worker3 **Goal:** keyboard users can inspect balances, follow source locations and return to the originating transaction **Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Expose source and balances as native keyboard controls | 30m | — |
| t002 | Restore Entry Context focus across its three callers | 45m | t001 |
| t003 | Verify adoption of the keyboard entry journey | 20m | t001, t002 |
| t004 | Simplify the entry keyboard and focus changes | 20m | t003 |
| t005 | Test keyboard controls and caller focus with real dialogs | 40m | t003, t004 |
| t006 | Close out the Entry Context keyboard repair | 15m | t005 |

170 minutes total:75 minutes of implementation plus adoption, simplification,
meaningful regression coverage and closeout.

## Definition of done

- In the public freelancer example, a keyboard user opens the January9 Northwind
  transaction, reaches the source action and opens transactions/invoicing.bean
  at line10. The reader's editor remains readonly and the payee filter survives.
- The balances disclosure is a named native keyboard control. Enter/Space toggles
  it; expanded state and its controlled region are exposed. Before/after values
  remain correct, including the invoice's -6000USD income/+6000USD receivable.
- Escape and the named Close button return focus to the connected originating
  row in Journal, Account Journal and Overview Recent activity. Immediate Enter
  reopens that entry; the next Tab continues locally rather than at page start.
- Focus handling distinguishes dismissal from source-file navigation. If a row
  disappears after successful writer work, a connected caller fallback receives
  focus. Loading/error closure remains usable; failure keeps an active edit open.
- Unavailable locations stay noninteractive. Public readers cannot edit/save/
  delete; authorized writer behavior and existing source metadata remain intact.
- Real dialog/keyboard tests cover these transitions and all three callers;
  desktop/narrow smoke and dashboard format/lint/test/build pass.

## Source + Goal linkage

- **Source:** continuous dashboard QA for w3,2026-09-11. Two independently
  reproduced gaps in the same entry-viewing journey are detailed below.
- **Goal linkage:** **A2 — Frictionless onboarding**. Exploring a public transaction
  with a keyboard leads to its source and back without losing navigation position.
- **Expected outcome:** balances and source are reachable through named controls,
  and readers can inspect consecutive entries without restarting page traversal.
- **Why now:** the correct source/permission work in completed m11 exposes the
  intended content, but two pointer-only elements and missing opener association
  still interrupt keyboard use. Shared content plus three caller integrations
  require more than an hour of implementation/verification work.
- **Adoption surface:** included because the corrected interaction is user-facing.

## Reproduction

Production https://beancount.io, isolated headless Chrome152.0.7977.83,
English/light, dedicated authenticated reader of synthetic
open_ledger/freelancer-invoicing. Fresh1440×1000 and390×844. Local and fetched
origin/main f1965988 have no newer implicated fix; deployed SHA is unverified.

**Minor — source and balances are pointer-only.**

1. Open `/ledger/open_ledger/freelancer-invoicing/journal?filter=payee%3A%22Northwind%20Traders%22`.
2. Focus the2026-01-09 Northwind / January retainer row and press Enter.
3. Wait for Entry Context's Location and source. The visible underlined
   transactions/invoicing.bean:10 is a CODE element, tabIndex-1, with no role.
   The Entry Context balances toggle is a DIV, tabIndex-1, without a role or
   aria-expanded. The dialog exposes zero links and only the Close button.
4. Starting on Close, Tab focuses Editor content; Shift+Tab returns to Close.
   Neither source nor balances can be reached. Both fresh widths reproduce.
5. Pointer controls work: clicking the balances header reveals two correct
   before/after tables; clicking the location opens the real file with
   editMode=false&lineNumber=10 and the original payee filter. The invoice source
   is present. Both widths pass these controls with no page/console errors.

**Minor — m23 focus-return coverage extension for Entry Context.**

1. From the same row, open Entry Context with Enter, wait for Location, press
   Escape, wait for the dialog to disappear and another600ms.
2. Focus is BODY at both widths despite the originating row still being mounted.
   The next Tab reaches Go to dashboard at1440 or Toggle Sidebar at390.
3. Fresh desktop Account Journal for Assets:Receivable:Northwind reproduces
   on the same January9 row. Fresh Overview reproduces on Fabrikam's June30
   write-off in Recent activity. All start with the correct opener focused;
   all end on BODY without page errors.
4. Working sibling: Journal Export closes with Escape and restores Export
   after the same wait. Its m23 fix is working.

## Root causes and repair boundaries

`dashboard/src/features/journal/components/entry-context-dialog.tsx:177–184`
uses onClick on CODE for source navigation;189–205 uses an onClick DIV for
balances. Replace these with native controls, preserving code styling and
existing file-navigation behavior. Expose disclosure state/region semantics.

The controlled Dialog at430–456 has neither an associated DialogTrigger nor an
explicit close-focus handler. Journal's callback at
features/journal/pages/journal-page.tsx:260–263, Account at
features/reports/account/index.tsx:268–270, and Overview at
features/reports/overview/components/recent-activity-card.tsx:224–227 save the
entry/open state but no opener. Installed Radix Dialog1.1.15
`dist/index.mjs:146–149` prevents default close autofocus and tries triggerRef,
which is empty for this dialog. Capture the actual opener when activating the
entry and pass a connected return target/fallback into the dialog. Reuse
common/lib/focus/restore-focus-on-dialog-close.ts; keep this behavior scoped
rather than adding a global Dialog override or timing workaround.

All three production EntryContextDialog callers were source-searched and their
focus failure was exercised. Main content is shared across them. The existing
entry-context test clicks source text with fireEvent and supplies null balances;
it does not prove Tab access, disclosure semantics or caller focus restoration.
No API/dependency change is required.

## Data controls, dedupe and limits

For entry hash adb465137cf8b36da48b3236b8bf20e0, GraphQL GetLedgerEntryContext
and REST `/api-gateway/v1/ledgers/open_ledger/freelancer-invoicing/entry-context?entryHash=adb465137cf8b36da48b3236b8bf20e0`
return200 with identical entry, slice and before/after balances. Metadata names
transactions/invoicing.bean:10, invoice2026-001, due2026-02-08. This confirms
correct underlying data and the working pointer path, not a transport defect.

Searched all open/done board records and historical entry-context/source/focus/
keyboard notes, scanned active milestones, and reviewed full m11/m23 DoDs.
m11 owns resolved locations and read permission and passes those controls here.
m23 owns the existing missing-opener finding across export/budget/account edit
consumers; this schedules its additional Entry Context consumer without counting
that historical focus group again. Pointer-only source/balance controls are the
new finding group. cc3f4c2f repaired m11; source/control and opener history has
no later keyboard repair. BQL table m28 and native entry crash106 are separate.

Evidence under ignored `dashboard/tmp/qa-20260911-w3-loop/`:
freelancer-entry-settled.json, entry-balances.json, entry-focus-{1440,390}.json,
entry-focus-callers.json, entry-keyboard-controls-{1440,390}.json,
entry-keyboard-dialog-{1440,390}.png, entry-api-controls.json.
Dialog images were visually inspected; actual focus and role measurements are
in JSON. Fresh contexts were closed. No ledger mutation, product fix or shipping.
Writer save/delete, unavailable/error/loading closure, focus after a removed row,
native screen-reader speech and other browsers remain unverified implementation
regression cases. Existing concurrent board conflicts/native findings are preserved.
