# w3 · m11 — Reliable entry context for public-ledger readers

**Worker:** worker3 **Goal:** public-ledger readers reach the originating source entry and receive controls appropriate to their permissions **Status:** done

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Preserve resolved source metadata in entry context — **DONE** | 45m | — |
| t002 | Handle unavailable entry locations in the dashboard — **DONE** | 25m | t001 |
| t003 | Gate entry editing by ledger write permission — **DONE** | 35m | — |
| t004 | Adoption surface — **DONE** | 20m | t002, t003 |
| t005 | Simplify — **DONE** | 20m | t004 |
| t006 | Test coverage across context callers and transports — **DONE** | 40m | t004, t005 |
| t007 | Closeout — **DONE** | 15m | t006 |

## Reproduced findings

QA against `https://beancount.io`, 2026-09-07, Chrome 152, English/light,
1440×1000 and 390×844. Source checkout: `60dbd7fd`; production build SHA
unverified. Both symptoms match current source. The signed-in QA account has
`admin:false, pull:true, push:false` on `open_ledger/example`.
The earlier anonymous run in this same QA session also reproduced both symptoms.

### Major — source links open the directory instead of the entry

1. Open `/ledger/open_ledger/example/journal`.
2. Open the 2017-09-07 Hoogle / Payroll transaction.
3. Wait for Entry Context, then click its displayed location.
4. Repeat after reloading; the narrow layout has the same failure.

Expected: a source filename and positive line number, leading to that entry.
Actual: `:0`, followed by `/ledger/open_ledger/example/files/tree/main`.
Opening `main.bean` directly in Files works and displays its contents.

GraphQL `GetLedgerEntryContext` for entry hash
`c94ed5271c6df2e9a494015d1dcb6121` returns HTTP 200, `entry.meta:null`,
a nonempty payroll source slice, and a nonempty `sha256sum`.
The authenticated REST control
`GET /api-gateway/v1/ledgers/open_ledger/example/entry-context?entryHash=c94ed5271c6df2e9a494015d1dcb6121`
also returns HTTP 200 with missing metadata and a nonempty slice.

Root cause: `backend-cluster/ledger/src/features/ledger/service/ledger-journal-service.ts:573–585`
resolves `found` but serializes the directive without its location.
`src/foundation/rustledger/journal-serialize.ts:48–51,113` carries only user
metadata. `EntrySlice` already supplies `file` and zero-based `startLine`.
The dashboard defaults absent metadata to an empty filename/zero at
`dashboard/src/features/journal/components/entry-context-dialog.tsx:173–189`
and always makes the location clickable.

### Minor — read-only entry viewers receive editable source and mutation controls

1. As the same reader, reopen the transaction.
2. Type an unsaved comment in the source editor.
3. Wait for “Source has been modified”.

Actual: Delete is enabled immediately and Save becomes enabled after the edit.
Confirmed at both viewport sizes. Expected: source and balances remain readable,
but editing and mutation controls require write permission.
No Save or Delete request was submitted; this does not establish an authorization
bypass. Drafts were discarded.

Root cause: the same dialog hard-codes `readOnly:false` at line 289 and renders
Save/Delete at lines 303–324 without the existing `useLedgerPermission` guard.
The parent journal correctly hides New Entry for this reader.

## Definition of done

- The public example's Hoogle entry displays its real file and positive source
  line; clicking opens that file at the transaction, including after reload.
- An unresolved location is explicitly unavailable and has no broken navigation.
- Read-only viewers can inspect source/balances but cannot alter the editor or
  activate Save/Delete; authorized writers retain editing behavior.
- Journal, overview recent activity, and account-report callers use the same
  corrected context/permission behavior. Journal and overview were exercised in
  the QA session; account report needs the implementation's regression check.
- GraphQL and REST preserve resolved source metadata, existing user metadata,
  entry identity, source slice, and authorization. MCP's shared analysis binding
  receives the same corrected result; its live transport remains to be checked.
- Relevant ledger and dashboard gates pass, and the demonstrated desktop/narrow
  journeys pass without writing to pre-existing production data.

## Source + Goal linkage

- **Source:** user-requested `qa-find-bugs-dashboard w3), 2026-09-07. The complete
reproducible text is above; local screenshots and sanitized responses remain
in ignored `dashboard/tmp/qa-20260907-w3/`.
- **Goal linkage:** A2 — Frictionless onboarding. A newcomer can follow a sample
  transaction into readable source without encountering a dead end or unusable
  edit controls. A1 benefits because source context is shared with REST/MCP.
- **Expected outcome:** the public example supports a reliable journal → source
  learning journey, and read-only collaborators receive an honest interface.
- **Why now:** two live failures interrupt an existing onboarding surface.
  Shared service output requires a ledger fix plus a dashboard fallback; the
  independent permission defect belongs to the same entry-viewing journey.
  This is about 3h20 across several implementation and verification tasks.
- **Adoption surface:** included because the public dashboard and agent-readable
  source context are user-facing.
- **Dedupe:** searched open milestones in all queues and open/completed notes for
  entry context, source metadata/location, read-only editing, and dialog callers.
  No overlapping open task. Completed `w3/done/m7` and `w1/done/m10` established
  transport parity, not correctness of source location. Targeted git history and
  fetched `origin/main` contain no later repair. Do not label deployment lag
  solely from the unverified production SHA.
