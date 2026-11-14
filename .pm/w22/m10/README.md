# w22 · m10 — Bank Sync: set one target account for every selected staged row

**Worker:** worker1 **Goal:** clearing a Bank Sync backlog takes one action instead of one account picker per row **Status:** todo (t001, t002, t003 done)

## Tasks (in order)

| id   | title                                                             | est | depends_on |
| ---- | ----------------------------------------------------------------- | --- | ---------- |
| t001 | Pure helper: apply one target account to the selected rows — **DONE**        | 30m | —          |
| t002 | "Set for selected" control in the Bank Sync review table — **DONE**          | 45m | t001       |
| t003 | Translate the new control into all 15 dashboard locales — **DONE**           | 30m | t002       |
| t004 | Browser check: select all, set the target, submit once            | 45m | t003       |
| t005 | Adoption surface                                                  | 25m | t004       |
| t006 | Simplify                                                          | 25m | t005       |
| t007 | Test coverage                                                     | 45m | t005       |
| t008 | Closeout                                                          | 15m | t006, t007 |

## Definition of done

- With N selected staged rows, some of them hidden by the active filters, one Apply gives every one of them a target account; the "selected transactions need target accounts" alert drops by exactly the rows that were set, and Submit succeeds in one action.
- The default mode, `fill-blank`, leaves every existing target untouched (an AI Fill suggestion, a hand-picked account); `overwrite` replaces them, and the control says how many rows each mode would change before it is applied.
- Every row's account picker stays editable afterwards, with and without the control used.
- The control is disabled, with a stated reason, when no row is selected, and it lists only open accounts (the existing account picker).
- Submit validation, AI Fill, and the in-memory review state are unchanged. No API, REST, GraphQL, or MCP behavior changes.
- All 15 dashboard locales carry the new messages with their own plural forms, and `yarn i18n:check` reports nothing.
- `yarn format:check`, `yarn lint`, `yarn test`, and `yarn build` pass from `dashboard/`.

## Source + Goal linkage

- **Source:** inbox note `w22/051`, from a user report on 2026-11-08: Bank Sync has no way to give every selected staged row the same target account, and the reporter said doing it row by row is not a realistic workaround. Promoted because the control, 15 locales with plural forms, tests, and a browser check run well past an hour across several tasks (the note itself said to promote in that case).
- **Goal linkage:** A2 — frictionless onboarding. A hosted user clearing a backlog of imported bank rows (for example 120 rows to `Expenses:Uncategorized`) reaches a submitted, reviewable ledger in one step instead of abandoning the review.
- **Expected outcome:** the common first pass over a Bank Sync backlog — "put everything in Uncategorized, sort it later" — is one selection, one account, one Apply. Fewer abandoned reviews; the complaint does not recur.
- **Why now:** a reporting user called the current flow unworkable, and nothing in the API blocks the fix: `importStagedBankTransactions` and REST `POST …/bank-transactions/submit` already take one target per row, so no REST/GraphQL/MCP parity work is triggered.
- **Adoption surface:** included, because the milestone ships a user-facing dashboard control and the agent route (one target per row on every surface) deserves a documented same-target backlog recipe.
- **Design decision recorded:** the control defaults to `fill-blank` so it never destroys an AI Fill suggestion or a hand-picked choice; `overwrite` is an explicit switch that shows how many rows it would replace. The note's text ("fills the target for every selected row") did not distinguish the two.
