# w22 · m10 — Bank Sync: set one target account for every selected staged row

**Worker:** worker1 **Goal:** clearing a Bank Sync backlog takes one action instead of one account picker per row **Status:** blocked (t001, t002, t003, t005, t006, t007 done; t004 blocked, t008 waits on it)

## Tasks (in order)

| id   | title                                                             | est | depends_on |
| ---- | ----------------------------------------------------------------- | --- | ---------- |
| t001 | Pure helper: apply one target account to the selected rows — **DONE**        | 30m | —          |
| t002 | "Set for selected" control in the Bank Sync review table — **DONE**          | 45m | t001       |
| t003 | Translate the new control into all 15 dashboard locales — **DONE**           | 30m | t002       |
| t004 | Browser check: select all, set the target, submit once            | 45m | t003       |
| t005 | Adoption surface — **DONE**                                                  | 25m | t003       |
| t006 | Simplify — **DONE**                                                          | 25m | t005       |
| t007 | Test coverage — **DONE**                                                     | 45m | t005       |
| t008 | Closeout                                                          | 15m | t004, t006, t007 |

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

## Blocked

**Milestone parked 2026-11-14.** Every task that does not need a browser has shipped. What is left is t004 (the browser check), which is blocked, and t008 (Closeout), which depends on it; so the milestone as a whole waits on the condition below. (t004 was blocked first, earlier the same day, while the other tasks proceeded.)

- **Blocker (outside the repository):** the check cannot run in the environment the worker has. (1) It needs a signed-in dashboard session, and `QA_EMAIL` and `QA_PASSWORD` are not set. (2) It needs a ledger with a connected bank and staged (unsynced) transactions, which in practice means a Plaid sandbox connection on the QA account. (3) It needs a browser for headless Playwright, and the Chrome that Playwright launches is not installed (`npx playwright install chrome` would add it).
- **Baseline already shipped:** t001 in `b2ef6d073`; t002 and t003 in `85b9753f4`; t005 in `493bb6f4e`; t006 in `39f0b8734`; t007 in `ea4b11b81`. The control (now `bulk-target-popover.tsx`), its 15 locales, the same-target recipe in `backend-v2/docs/mcp.md`, and 15 component tests are on `main`. Five mutations of the component (Apply always overwrites, Apply reaches only visible rows, Apply reaches unselected rows, the control not disabled with nothing selected, the panel left open after Apply) each fail those tests, and `yarn format:check`, `yarn lint`, `yarn test`, and `yarn build` passed from `dashboard/`. The component tests drive the real review table with the real popover and checkbox, but a jsdom run cannot show layout.
- **Still to confirm in a browser:** one Apply gives every selected row, including one a filter hides, the target, and Submit succeeds in one action; a row edited after Apply keeps its own account; and the panel renders correctly in Persian (RTL). t003 moved the RTL check here: the panel uses logical properties only (`me-1`, `justify-end`, and a checkbox instead of the shared Switch, whose thumb moves with a physical translate and has no RTL variant).
- **Unblock:** the owner supplies `QA_EMAIL` and `QA_PASSWORD` for a dashboard account whose ledger has a connected Plaid sandbox bank with at least four staged transactions across two accounts (so a filter can hide some), and installs the Playwright browser; then run the dashboard QA workflow (`.agents/skills/qa-find-bugs-dashboard/SKILL.md`) over t004's steps.
- **Who can clear it:** the repository owner (credentials, the Plaid sandbox connection, the browser install).
- **Dependencies retargeted so independent work proceeds:** t005 (Adoption surface) now depends on t003 instead of t004, because it does not need the browser check; t006 and t007 keep depending on t005; t008 (Closeout) depends on t004 as well as t006 and t007, so the milestone cannot close until the browser check has run.
- **Next verification step:** once the inputs exist, run t004 and set its status back to `todo` through `/pm unblock`.
- **When unblocked, the remaining work is** t004, then t008 (Closeout). t004 also takes over what jsdom cannot show: the Persian (RTL) layout, the hover tooltip on the disabled control, and how a screen reader announces its reason (the first two were fixed in t006 and are not verified in a browser). t008 must not run until the definition of done holds.
