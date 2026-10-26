# w4 · m34 — Resolve multiline entry sources without splitting quoted strings

**Worker:** worker1 **Goal:** Every valid source-backed multiline Note can be opened through its current Journal identity, with its entire source span and neighboring bytes intact. **Status:** done

**Severity:** minor (valid entries cannot be opened for source editing). **Estimate:** 150m across six tasks; implementation owned by ledger.

## Source + Goal linkage

Continuous dashboard QA requested for w4, 2026-10-20. **A2 — Frictionless onboarding:** New Entry offers a multiline Note field and successfully stores the complete text, but reopening that valid entry yields resource not found. Repair the shared source boundary contract now so ordinary pasted notes remain editable. The block scanner, marker probe and source-based edit/delete consumers need coordinated handling and real-engine regression coverage, exceeding one hour. Adoption-surface verification is included for the visible Journal → Entry Context recovery journey.

## Tasks

| id | title | est | depends_on |
| --- | --- | --- | --- |
| [t001](./done/t001.md) | Respect quoted-string boundaries in source blocks — **DONE** | 45m | — |
| [t002](./done/t002.md) | Keep source probes and slice consumers on complete directives — **DONE** | 35m | t001 |
| [t003](./t003.md) | Verify valid multiline entries through the dashboard | 10m | t002 |
| [t004](./done/t004.md) | Simplify the source boundary handling — **DONE** | 15m | t003 |
| [t005](./done/t005.md) | Prove complete source spans and validate eligible API surfaces — **DONE** | 35m | t003 |
| [t006](./t006.md) | Close out and archive the milestone | 10m | t004, t005 |

## Fresh live reproduction and working control

Production https://beancount.io, 2026-10-20; local main `c5e4cd11a`. QA-owned isolated headless Chromium 155.0.8059.85, owner/admin/push on the designated disposable synthetic ledger, English/light, America/Los_Angeles. A real 390×844 New Entry → Note creates exactly one prefixed Note on existing Assets:Cash. Its content has quotes, backslashes, two unindented newlines, a tab, café/Chinese/Persian/emoji and literal HTML-looking text.

1. Create Note Entry returns real BulkEntries HTTP 200, success=true. File readback preserves the original prefix exactly; Journal returns the complete parsed comment equal to the submitted value, total30, no ledger errors.
2. Reload: one matching Note row remains and literal markup/Unicode display correctly.
3. Activate that row's named Open entry button with Enter. The actual GetLedgerEntryContext request uses the current Journal hash `04e973b2f94422eb531b295c455bc379`. HTTP 200 carries GraphQL NOT_FOUND, “Ledger resource not found”. The dialog shows “The requested resource could not be found”, with no editor or Save.
4. A separate fresh 1440×1000 owner context independently opens the real row and receives the same hash/error.
5. Working narrow control: create a second prefixed Note with the same quotes, backslashes, Unicode, tab and literal markup but a single physical line. Its current hash `06c00e3a9110c872d6d956c782eb5609` opens an editable source at main.bean:94, with Save initially disabled. No source edits or deletions were attempted.

The failing content begins `qa-20261020 text-roundtrip: "quoted" C:\qa\receipts`, followed by unindented “second line” and “third line” text. Full exact values and sanitized requests are in the ignored evidence below. This is not a missing/stale entry: the current Journal read lists it and the stored, parser-valid source is present.

## Local proof and source cause

A read-only synthetic probe against the existing ledger package and its installed WASM 0.24.0, Node24.16.0, calls the real parseLedgerFilesInProcess and findEntrySliceWithFullLedger:

| Note content shape | Normal parse | Source resolution |
| --- | --- | --- |
| Single line with Unicode | zero errors, Note present | complete slice |
| Unindented second line inside the quoted comment | zero errors, Note present | null |
| Indented second line inside the quoted comment | zero errors, Note present | complete slice |
| Blank line inside the quoted comment | zero errors, Note present | null |
| Date-like line inside the quoted comment | zero errors, Note present | null |

`backend-cluster/ledger/src/foundation/rustledger/source-slice.ts:265–294` ends a source block at any blank or non-indented following line, without tracking whether that line is inside a string. It therefore cuts off the valid multiline Note before its closing quote. Both entrySliceFromSourceLocation (:429) and the fallback findEntrySlice (:520) depend on these blocks. source-slice-resolver.ts tries the marker-derived location then that same fallback; local resolution is null. LedgerJournalService.getContext at :637–658 throws NotFound when no source span resolves, and backend-v2 forwards it through its journal service.

A second source-derived boundary to repair: buildSourceDetailsProbe at :336–362 inserts a metadata marker after the first physical directive line. In a multiline quoted header that insertion is inside the literal rather than after its logical end. Preserve the full-ledger booking/provenance design while placing markers at a syntactically valid boundary. Other directive strings and source-based update/delete/CAS paths share this scanner; their inclusion is regression scope, not a claim of live corruption or independently exercised mutations.

The deployed ledger revision is unavailable. The live failure and the independently reproduced current-main root agree; do not claim a deployed service source hash match.

## Repair and acceptance boundary

Repair quoted-string-aware source spans and probe placement in the ledger package. Preserve accepted multiline content exactly; do not flatten the Note field, reject valid strings or substitute guessed source locations. Retain entry identities/occurrence numbering, include traversal, plugin provenance, exact byte ranges, indentation outside literals, escaped quotes/backslashes, comments and blank separators outside directives. A date-like line inside a string is content and cannot start another source block.

The same shared service supplies eligible REST, GraphQL and MCP entry-context and source-slice operations. Keep them in parity when implementing; adapter changes are not currently indicated. Verify complete source text, source coordinates, optimistic SHA guards, successful changes and failures together. Do not weaken identity/CAS checks to bypass lookup failures.

## Dedupe, evidence and cleanup

All board states searched for multiline Note context, source-block/string boundaries, source-slice lookup and the scanner/probe symbols. w4/251 is a dashboard route retaining an old hash after its own save; here the newly loaded current hash fails before any edit. w1/blocked/033 records historical delete visibility and does not identify quoted-source boundaries. w3/done/415 and w5/done/378 repair separate Python CLI string scans. No matching pending or landed ledger repair was found; source-slice history through `7721820ae` retains the line-based splitter.

Ignored dashboard evidence: `dashboard/tmp/qa-20261020/dashboard-loop/note-text-roundtrip-control.json`, visually inspected `note-text-context-390.png` and `note-text-context-1440.png`. Local source proof: `backend-cluster/ledger/tmp/qa-20261020/source-note-probe.cjs` and `source-note-probe.json`. Initial wrong row-button naming and a background-row read while a modal hid it timed out; those harness errors are excluded. Authoritative UI repeats use the observed named button and actual settled error.

Real multiline creation commit `0a7ca5b64`; single-line control commit `d64c0485c`; guarded snapshot restoration `9d4f0c3fd`. Final readback: original blob `f1a0b83c1aaf9608113c6bd3174bf7d2dab35407`, 2817 bytes, SHA-256 `77c3a591efd311e01d03d2f3a91f2919151c0fb0708e1abe1a10ce6ec7e29915`, one original file, 12 accounts, 29 directives, 16 settled Transaction rows, zero QA entries or ledger errors. All temporary contexts closed. No product changes, new dependencies, commit or push.

Live REST/MCP, other directive types, source mutations on multiline entries, other engines/locales, actual speech and the repaired implementation remain unverified.

## Definition of done

- [x] Fresh current identities resolve complete multiline Note sources with unindented, blank and date-like internal lines.
- [x] Marker probes never alter literal values or create phantom source directives.
- [x] Source update/delete preserve adjacent bytes and optimistic concurrency contracts.
- [x] Single-line, indented, escaped-string, duplicate-entry, include and provenance controls still work.
- [x] Eligible REST/GraphQL/MCP outcomes agree; meaningful real-engine regressions and package checks pass.
- [x] Dashboard reopening is verified with disposable fixtures restored, and completed tasks/archive links agree.

## Resolved

**Closed 2026-10-26** — the deploy landed and t003's live dashboard reopen passed (see [t003](./done/t003.md)); t006 closeout archived this milestone.

### Previously blocked

**Blocked 2026-10-20** — t003's live dashboard reopen (and therefore t006 Closeout) cannot run here.

- **Shipped baseline:** `a0fa2e619` — `splitIntoBlocks` is quoted-string aware and records `headerEndLine`; the source-details probe places its marker after the full header. Pure tests cover unindented/blank/date-like/indented literals, multiline narration with postings, escapes, comments, CRLF, the unterminated-quote fallback, probe placement and neighbor-preserving delete/replace; `yarn verify:rustledger` resolves every multiline Note and a multiline-narration transaction through the real WASM engine with probe source details at the right line. Both fail against the previous scanner. Ledger lint, typecheck, build and 1380 tests pass. REST/GraphQL/MCP entry context share `LedgerJournalService` and need no adapter change; their adapters were not exercised separately.
- **Blocker:** the DoD's dashboard reopen needs the ledger service at `a0fa2e619` or later deployed and an authorized disposable ledger; this worker has neither.
- **Unblock:** after deploy, a QA run creates the recorded multiline Note through New Entry, reloads Journal, opens it via the row's Open entry action at 1440 and 390 widths, sees the complete editable source at the right line with no NOT_FOUND, repeats the single-line control, and restores the fixture bytes. **Who:** the user (deploy) and the dashboard QA loop.
