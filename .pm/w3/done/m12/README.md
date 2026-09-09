# w3 · m12 — Execute and restore the BQL query shown in the editor

**Worker:** worker3 **Goal:** keyboard execution, button execution, and bookmarked query pages agree on the user's query text **Status:** done

## Tasks (in order)

| id   | title                                                               | est | depends_on |
| ---- | ------------------------------------------------------------------- | --- | ---------- |
| t001 | Execute current editor text from the keyboard shortcut — **DONE** | 35m | —          |
| t002 | Restore editor text from bookmarked query parameters — **DONE**   | 35m | t001       |
| t003 | Adoption surface — **DONE**                                       | 20m | t002       |
| t004 | Simplify — **DONE**                                               | 20m | t003       |
| t005 | Test coverage for query execution and restoration — **DONE**      | 40m | t003, t004 |
| t006 | Closeout — **DONE**                                               | 15m | t005       |

## Reproduced findings

QA against `https://beancount.io`, 2026-09-07, signed-in reader of public
`open_ledger/example`, Chrome 152 on macOS, English/light, 1440×1000.
The bookmark mismatch also reproduced at 390×844. Checkout `60dbd7fd`;
production build SHA unverified, with observed behavior matching current source.

### Major — Cmd+Enter executes the default query instead of the editor text

1. Open `/ledger/open_ledger/example/query`.
2. Replace the editor contents with `select account limit 2`.
3. Press Cmd+Enter, the shortcut explicitly advertised by the page.
4. Observe the request/result and then click Execute Query without changing text.

Actual shortcut request: `QueryShell` with
`variables.query = "select * from accounts"`, HTTP 200, 60 account rows.
The editor still displays `select account limit 2`.
The Execute Query button is a working control: it sends the edited query,
returns HTTP 200 with two rows, and updates the URL accordingly.
A fresh page load with `select account limit 3` reproduced the shortcut's
default-query request and 60-row result.

Root cause: `dashboard/src/features/bql/pages/index.tsx:187–193` registers a
Monaco command during mount that closes over the initial `handleSubmit`.
That handler reads `queryText` from its render at lines 138–152, whose initial
value at line 38 is `select * from accounts`. The button receives a current
render's handler. The shared Monaco wrapper only adds `ClientOnly`; the query
page owns the stale callback.

### Minor — bookmarked query results disagree with the editor after reload

1. Execute `select account limit 2` with the button.
2. Reload its resulting URL:
   `/ledger/open_ledger/example/query?query=select+account+limit+2`.
3. Compare the editor with the expanded history result.

Actual: the editor shows `select * from accounts`, while history correctly
shows `select account limit 2` and the two corresponding rows.
Directly opening that URL at 390×844 reproduces the mismatch.
Expected: the editor restores the bookmarked query so continuing or rerunning it
operates on the visible bookmarked text.

Root cause: line 38 unconditionally initializes the default editor text.
The URL effect at lines 122–133 executes `urlQuery` without updating
`queryText`. This is a separate state-restoration defect from the shortcut
closure, although both fixes belong in the same page.

Working controls: button execution returns the right two rows; its CSV contains
one `account` header and exactly those two data rows. An invalid `select from`
query shows a validation error, and button execution recovers to the valid
two-row result. No ledger mutation occurs.

## Definition of done

- Editing to the tested two-/three-row queries and pressing Cmd+Enter executes
  that current text, exactly once, with the same request/result as the button.
- Reloading or directly opening the tested bookmarked URL restores matching
  editor text and results on desktop and at 390×844.
- URL synchronization does not overwrite a new draft during unrelated renders
  or introduce duplicate requests; history and CSV remain tied to their own
  executed query.
- Empty-query handling, invalid-query recovery, and the advertised platform
  shortcut binding retain their behavior. Live Windows/Linux Ctrl+Enter was not
  exercised; cover its registration and record any remaining platform limitation.
- Dashboard checks and the repeated live-style journeys pass.

## Source + Goal linkage

- **Source:** user-requested `qa-find-bugs-dashboard w3), 2026-09-07. Reproduction
text and observed values are above; screenshots, sanitized request summaries,
and the two-row CSV are in ignored `dashboard/tmp/qa-20260907-w3/`.
- **Goal linkage:** A1 — Agent-native accounting and A2 — Frictionless onboarding.
  Query snippets shared by people or agents must be reproducible in the UI, and
  the advertised keyboard flow must execute the text the user supplies.
- **Expected outcome:** a newcomer can paste a BQL snippet, run it by either
  control, share the URL, and continue from that query after reopening it.
- **Why now:** the displayed keyboard instruction currently leads to a different
  query and potentially much larger results. Two distinct implementation fixes
  total about 70m before shared regression and adoption checks.
- **Adoption surface:** included because this changes a user-facing query and
  bookmark contract.
- **Dedupe:** scanned all open milestone READMEs and searched open/completed
  records for BQL keyboard/shortcut, query editor, bookmark and history behavior.
  No overlapping item. Completed export/parity work covers other contracts.
  The page has one route caller,
  `dashboard/src/routes/ledger.$ledgerOwner.$ledgerName.query.tsx`.
  Targeted `git log -S` traces both patterns to the dashboard import; fetched
  `origin/main` has no newer fix. Backend BQL execution is a working control,
  so these are dashboard fixes with no server/API-schema change.
