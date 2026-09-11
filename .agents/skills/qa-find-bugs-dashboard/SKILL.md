---
name: qa-find-bugs-dashboard
description: >-
  Exercise the running Beancount.io dashboard with headless Playwright, use QA_EMAIL and
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

## Run in the background

- Default to a **headless browser with an isolated QA profile**. Keep the user's
  windows, tabs, mouse, keyboard, and system clipboard undisturbed. A fresh
  context inside a headed browser can still open a visible window; it does not
  satisfy this requirement.
- Launch Playwright MCP with `--headless --isolated`. For Claude Code, check
  `mcpServers.playwright.args` in the repo's `.mcp.json`; for Codex, check the
  active `[mcp_servers.playwright]` configuration, normally in
  `~/.codex/config.toml`. Inspect effective launch settings, including overrides
  and any attached-browser endpoint, before the first browser action. A config
  edit takes effect on a new MCP server/browser session, not an already-running
  headed session. Do not attach to the user's regular browser.
- If the current MCP session is headed, establish a separate headless session
  before continuing UI checks. An already available Playwright runtime in a
  QA-owned process is an acceptable fallback when MCP cannot be restarted
  safely. Preserve the same login and evidence workflow. If no background
  session is available, report the UI checks as blocked and continue independent
  source/API investigation; do not silently launch a visible browser or stop
  another task's browser server.
- Use Playwright's page/context APIs for clicks, typing, keyboard navigation,
  focus assertions, viewport changes, screenshots, and downloads. Do not call
  `bringToFront`, activate desktop apps, drive the OS mouse/keyboard, or open
  downloaded artifacts in desktop viewers. Browser-local focus checks remain
  part of accessibility QA.
- For uploads, use file inputs/file-chooser APIs with authorized fixtures. For
  print checks, inspect print media or a headless PDF where supported; this does
  not verify the native print dialog. Run visible-browser, native-dialog, or
  actual screen-reader checks only when explicitly requested. Otherwise record
  that coverage as unverified and continue the background journeys.
- Record the browser mode and session ownership with the run evidence. Reuse
  the owned headless browser with fresh contexts as needed, and close only this
  run's contexts, browsers, and helper processes during cleanup.

## Prepare the browser

- Record the initial browser session. Authenticate using `QA_EMAIL` and
  `QA_PASSWORD` from **`dashboard/.env`**, unless the user supplies another path.
  From the repo root, run
  `node .agents/skills/qa-shared/scripts/qa-login.mjs --env-file dashboard/.env`.
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
