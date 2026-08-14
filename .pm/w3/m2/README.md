# w3 · m2 — Budget management: add, update, delete from mobile

**Worker:** worker3 **Goal:** Full budget lifecycle from the phone — create a budget, post a dated update, delete a history entry — without opening the web dashboard. **Status:** in progress (t001–t008 done; t009 closeout blocked on verifying add/update/delete against a real ledger file)

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | build-budget-entry.ts + unit tests | 30m | — | — **DONE**
| t002 | /add-budget screen (add mode) | 45m | t001 | — **DONE**
| t003 | Update mode: locked account + prefills + card entry point | 30m | t002 | — **DONE**
| t004 | History expansion on BudgetGroupCard | 30m | — | — **DONE**
| t005 | Delete flow with visible errors | 30m | t004 | — **DONE**
| t006 | Adoption surface | 20m | t003, t005 | — **DONE**
| t007 | Simplify | 30m | t006 | — **DONE**
| t008 | Test coverage | 45m | t006 | — **DONE**
| t009 | Closeout | 20m | t008 |

## Definition of done

From mobile: adding a budget writes a `custom "budget"` directive via `bulkEntries` and the new group appears on /budget after refetch; updating from a card posts a newer-dated directive for the locked account (dashboard-parity semantics — no edit mutation); expanding a card's history lists dated entries; deleting one confirms via native alert, runs the entry-context → slice-delete two-step, and surfaces a visible error when the optimistic-lock `sha256sum` is missing (not the dashboard's silent no-op); `yarn test` passes.

## Source + Goal linkage

- **Source:** budget-on-mobile PM spec, 2026-08-09 (`/pm` invocation). Write-path reference: `mobile/src/screens/open-account-screen/` (`useBulkEntriesMutation` + entry-builder pattern), delete-path reference: dashboard `delete-budget-dialog.tsx`.
- **Goal linkage:** A3 — management parity is what makes mobile a standalone client; "view on phone, edit on desktop" is a churn story. Secondary A2 — setting a first budget in minutes on the phone is the fastest path from installed app to active ledger habit.
- **Expected outcome:** Budget directives get created and maintained from mobile; measured by `budget_add_submitted` and `budget_deleted` events from the app.
- **Why now:** M1 ships the read surfaces this builds on; the write plumbing (`bulkEntries`, `getLedgerEntryContext`, `deleteLedgerEntrySourceSlice`) is already used elsewhere in the app, so this is assembly, not invention. Adoption surface task included: ships user-facing management flows.
