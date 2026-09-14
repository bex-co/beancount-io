# w3 · m41 — Confirm before deleting a transaction

**Worker:** worker3 **Goal:** destroying a ledger entry takes a deliberate confirmation, like every other destructive action in the product **Status:** todo

Severity: **major**. Package: dashboard. One click on **Delete** in the Entry Context dialog permanently removes a transaction from the ledger. There is no confirmation, no undo, and on an unmodified entry it is the only enabled action other than Close.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Require a confirmation before deleting an entry | 45m | — |
| t002 | Localize the confirmation copy in all 15 locales | 30m | t001 |
| t003 | Verify the delete-confirmation adoption surface | 15m | t002 |
| t004 | Simplify the confirmation wiring | 10m | t003 |
| t005 | Test the confirmation across all three dialog callers | 45m | t003 |
| t006 | Close and archive the delete-confirmation milestone | 10m | t004, t005 |

Implementation totals 75 minutes; all six tasks total 155 minutes. A shared dialog with three callers, copy in fifteen locales, and destructive-path tests put this past a sub-hour edit.

## Reproduced problem

Production https://beancount.io, 2026-09-12, isolated headless Chrome (Playwright MCP `--headless --isolated`), English/light, 1440×1000, authenticated QA account with write access on its own synthetic `example` ledger. Local/fetched main `84231f9c`; deployed SHA unverified.

**No entry was deleted.** The destructive path is traced in source; only the rendered dialog and its button states were observed live. Establishing the defect does not require destroying a real transaction.

Open `/ledger/<owner>/example/journal?lang=en&time=2026` and click the `Anthropic` row. The Entry Context dialog opens on `main.bean:6536` showing the source slice, and its action row reports:

| button | state |
| --- | --- |
| **Delete** | **enabled** |
| Save | disabled (correctly — nothing has been edited) |
| Close | enabled |

So on an entry the reader has not touched, the one enabled action besides dismissing the dialog is the irreversible one, sitting immediately beside the disabled Save.

Source: `dashboard/src/features/journal/components/entry-context-dialog.tsx:373-386` renders the destructive button with `onClick={handleDelete}`, disabled only while a save or delete is already running. `handleDelete` at `:210-222` calls `onDelete(entry.entry_hash, data.sha256sum)` straight away; the parent at `:471-491` fires `deleteEntrySourceSlice`, shows `toast.success(t("journal.entryDeletedSuccess"))`, closes the dialog and clears the cache. There is no `AlertDialog`, no `window.confirm`, and no undo affordance anywhere in that file. The deletion is committed to the ledger's git history, so the content survives in history — but the UI offers the user no path back to it.

The product already disagrees with itself here. The dashboard has a confirmation primitive (`src/common/components/ui/alert-dialog.tsx`) and uses it for strictly less consequential actions: deleting a **budget** target (`features/ledger-data/budget/delete-budget-dialog.tsx`), revoking an API key (`features/user-settings/pages/api-keys/api-key-revoke-dialog.tsx`), a bank connection (`features/plaid/pages/plaid-connections/components/bank-item.tsx`) and the dashboard sidebar's ledger action. The mobile client confirms budget deletion too — completed [121](../done/121.md) quotes its native alert offering Cancel and a destructive Delete that "explain[s] removal cannot be undone". Only the deletion of actual financial data goes through unguarded.

Blast radius: this is a shared dialog with three production callers — `features/journal/pages/journal-page.tsx`, `features/reports/account/index.tsx` and `features/reports/overview/components/recent-activity-card.tsx` (the caller list established by completed [146](../done/146.md)). A mis-click on any of the three deletes an entry.

Evidence: `dashboard/tmp/qa-20260912/entry-delete-no-confirm.json` (gitignored, local only) — rendered dialog, observed button states, source trace, and the peer surfaces that do confirm.

## Definition of done

- Deleting an entry from any of the three callers requires an explicit confirmation that names what is being deleted and says the action cannot be undone from the app.
- Cancelling the confirmation deletes nothing, leaves the Entry Context dialog open and unchanged, and returns focus to the control that opened it.
- Confirming deletes exactly the entry shown, exactly once; a double activation cannot issue two deletions.
- The confirmation copy exists in all 15 locale files and `src/test/translations.test.ts` passes.
- The confirmation is keyboard-operable and its focus behavior matches the pattern completed `m23` established for this app's dialogs; Escape cancels rather than confirms.
- Read-only users still see no Delete at all (the existing `canWrite` gate is unchanged), and the disabled-Save behavior on an unmodified entry is unchanged.
- `yarn format:check && yarn lint && yarn test && yarn build` pass in `dashboard/`.

## Dedupe and limits

All open and `done/` queues searched for delete confirmation, destructive action and entry deletion. Completed [121](../done/121.md) is the **mobile** budget-history Delete exposed to a read-only reader — a permissions gap on another package, and its evidence is what shows the mobile client confirming this class of action. Completed [184](../done/184.md) is a mobile keyboard-layout problem *inside* an existing confirmation dialog. Completed [m29](../done/m29/README.md) confirms discarding **file drafts**, not deleting entries. Completed [146](../done/146.md) fixed the generated-padding case of this same dialog and enumerated its three callers, but never touched the delete path. Open [m31](../m31/README.md) owns this dialog's keyboard journey — coordinate, since a new confirmation adds a focus step that m31's work must account for. Nothing owns the missing confirmation.

Unverified: the actual deletion and its recovery path (deliberately not exercised on production data), the read-only and expired-session variants of the dialog, other locales, narrow viewport, and the patched behavior.

## Source + Goal linkage

- **Source:** continuous dashboard QA, 2026-09-12 — the journal journey; evidence in `dashboard/tmp/qa-20260912/entry-delete-no-confirm.json`.
- **Goal linkage:** **A2 — Frictionless onboarding**, with A3 credibility: a newcomer exploring their first ledger can destroy a transaction with one stray click, in a product whose pitch is that your books are auditable and under your control.
- **Expected outcome:** deleting an entry becomes a deliberate act, consistent with how the same app already treats budgets, API keys and bank connections.
- **Why now:** the confirmation primitive and the copy patterns already exist in this package, the gap is on the most destructive action in the app, and the dialog is about to be touched by m31 anyway. Adoption surface is included because this changes a user-facing interaction.
