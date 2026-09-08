---
name: qa-find-bugs-dashboard
description: >-
  Exercise the running Beancount.io dashboard with Playwright, use QA_EMAIL and
  QA_PASSWORD for login, reproduce bugs, trace fixes to source, and deduplicate
  findings. Use for dashboard QA or a browser bug hunt. Skip ordinary code review,
  bug implementation, and native-mobile QA (use qa-find-bugs-mobile).
---

# Dashboard QA bug hunt

Read [the shared QA contract](../qa-shared/contract.md) first. Read
`dashboard/CLAUDE.md`. Use Playwright MCP to test real browser behavior.

Arguments: optional server URL, journey names, `wN`, `SHIP=1`, `DRY_RUN=1`.
Default to production and report mode. A target URL changes the client under
test; inspect its API origin independently. Record whether the running client
matches local HEAD before declaring a source fix missing from production.

## Prepare the browser

- Record the initial browser session. Authenticate using `QA_EMAIL` and
  `QA_PASSWORD` from **`dashboard/.env`**, unless the user supplies another path.
  From the repo root, run
  `node skills/.claude/skills/qa-shared/scripts/qa-login.mjs --env-file dashboard/.env`.
  The helper hides the password and transfers session cookies in memory.
  Inspect `features/auth/hooks/use-login-form.ts`,
  `graphql/query/auth.graphql`, and the backend auth resolver/cookie helper for the
  current contract. Verify the resulting account and role, not merely a 200.
- Use an ordinary desktop viewport (for example 1440×1000), then repeat the
  relevant controls at a narrow viewport. Record locale, theme, and active
  filters. Prefer accessible roles and names from snapshots to brittle selectors.
- If the account is unavailable, continue public-ledger and signed-out journeys
  and explicitly leave authenticated behavior unverified.
- For local reproduction, install existing dependencies with
  `yarn install --immutable` inside `dashboard/`; start `yarn dev`. Never assume
  the local server uses a sandbox backend. Existing
  `scripts/perf-fixture-api.mjs` can isolate loading behavior, but results against
  its synthetic owner/fixtures must be labeled local simulations.

## Sweep whole journeys

Use selected journey names to narrow this table; otherwise survey the available
surfaces and deepen the journeys that show failures. Report each skipped group.

| Journey       | Observable promise                                                                                                                                                                                        |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| auth          | Sign-in reaches the intended safe `next` route; cancellation/back and expired-session states remain usable. Do not send reset or invitation email without authorization.                                  |
| discovery     | Gallery search narrows, pagination changes results, a public ledger opens, and returning restores a coherent list. Test ledger switching without leaking prior data.                                      |
| overview      | Date/account filters affect cards and charts; recent activity opens the corresponding journal item; empty and loading states are truthful.                                                                |
| journal       | Type, flag, date, account, payee/tag filters compose; pagination/count agree; postings expand; back/reload preserves the stated filters. Authorized synthetic edits persist exactly once.                 |
| accounts      | Search and hierarchy expansion work; a linked account shows matching entries and balances; closed or absent accounts have honest states.                                                                  |
| reports       | Balance Sheet, Income Statement, Trial Balance, Cash Flow, holdings/statistics and budget honor the selected period and units; drill-down retains intended context.                                       |
| export        | CSV/Markdown and Print / Save as PDF match the filtered supported statement, dates, entity, commodity units, and sign conventions. Read `features/reports/CLAUDE.md` before interpreting financial signs. |
| files         | Tree navigation, text preview, branches, commit/diff links, and downloads work. Test create/edit/upload/delete only with authorized disposable files and check the resulting commit.                      |
| query         | BQL executes, errors are actionable, result paging/export matches the result, and editing the query does not show stale output as new.                                                                    |
| import        | Receipt/file/bank entrypoints and validation are usable. Actual imports and bank linking need the applicable authorization; inspect previews without booking real transactions.                           |
| settings      | Available profile/ledger/settings screens render; owner/member/public controls match permissions. Inspect billing, credentials and collaborators without changing them.                                   |
| accessibility | Keyboard access, dialogs/focus return, accessible primary controls, narrow screens, theme and locale changes. Confirm names with the accessibility tree.                                                  |

After a surprising state, capture the screenshot, console errors, request status,
and operation response (sanitized). Use `page.evaluate` with `fetch` for an
authenticated API control when appropriate, returning only relevant non-secret
fields. Do not export an unfiltered HAR containing login bodies or cookies.
Reproduce once from a fresh page load before retaining a finding.

## Research map

- Thin route wrappers: `dashboard/src/routes/`; implementation:
  `dashboard/src/features/<feature>/`.
- Cross-feature infrastructure: `dashboard/src/common/`, particularly Apollo
  links, auth, filters, navigation and ledger layout.
- Report behavior and exports: `features/reports/CLAUDE.md`; importer and
  ledger-data have their own nested guides. ADRs are in `docs/adrs/`.
- Shared server causes: read `backend-cluster/backend-v2/CLAUDE.md` before tracing
  `src/features/<domain>/api`, services, schemas, and ledger adapters. Read the
  ledger package guide if the response originates there. Keep fixes assigned to
  the package that owns the defect; do not create cross-package imports.

Apply the contract's reproduce → research → dedupe → report/optional filing
steps. Finding a bug does not require changing product code or adding a test that
merely repeats the implementation. If the user also requests a fix, reproduce it
with a meaningful regression check and run the owning package's normal gates.
