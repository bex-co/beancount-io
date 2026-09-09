# w3 · m19 — Keep import values valid from parsing through configuration

**Worker:** worker3 **Goal:** preserve raw transaction values and complete row validity through CSV preview, inline repair and configuration **Status:** done

## Tasks (in order)

| id   | title                                                                | est | depends_on |
| ---- | -------------------------------------------------------------------- | --- | ---------- |
| t001 | Validate complete amount tokens with one conversion contract — **DONE** | 35m | —          |
| t002 | Preserve raw import fields and their validation diagnostics — **DONE** | 35m | t001       |
| t003 | Revalidate complete preview rows after edits — **DONE** | 40m | t002       |
| t004 | Reject invalid configuration input without invented dates or amounts — **DONE** | 25m | t003       |
| t005 | Adoption surface — document usable import validation and repair — **DONE** | 20m | t004       |
| t006 | Simplify the import validation changes — **DONE** | 20m | t005       |
| t007 | Test coverage — parsing, unrelated edits, repair and configuration — **DONE** | 45m | t005, t006 |
| t008 | Closeout — verify the import journeys and archive the milestone — **DONE** | 15m | t007       |

The four implementation tasks total135minutes; the complete milestone is235minutes.
The original sub-hour038 finding is promoted here because independently
reproduced error-loss behavior requires coordinated parser, form and
configuration changes.038 remains a source record, not a second implementation queue.

## Reproduced findings

Severity: **major**. Production `https://beancount.io`, 2026-09-08, Chrome152,
English, System/light; authenticated QA reader of public synthetic
`open_ledger/crypto-example`. Desktop1440×1000 and fresh390×844.
Local HEAD `a315c273`; fresh-fetched main `cc3f4c2f` has no importer repair.
Deployed SHA is unverified. All changes below were local preview/configuration
state; no Import action or production write was performed.

The original [038 amount-token reproducer](../038.md) remains part of this
milestone: `"-1,234.56"` becomes **-1**, and `12oops` becomes **12**, both
reported valid. An inline grouped token remains visible in full but configures
as-1. Fix complete-token validation and use its validated result consistently.
The minimum supported grammar may reject grouping; accepting grouped or
locale-specific numbers is not required.

The additional failure starts with correctly rejected input:

```csv
Date,Payee,Description,Amount
2025-12-01,QA Control,Valid record,-1.25
2025-02-29,QA Invalid Date,Date repair control,-2.50
2025-12-03,QA Invalid Amount,Amount repair control,abc
```

1. Open `/ledger/open_ledger/crypto-example/import` and select this file.
   Preview says **1 Valid / 2 Errors**. February29,2025 is impossible;
   the amount token `abc` is invalid and is already displayed as0.
2. Change only the second row's payee to **QA Renamed Date**, then press Enter.
   Preview now says **2 Valid / 1 Errors**, although its date remains
   **2025-02-29**.
3. Change only the third row's payee to **QA Renamed Amount**, then press Enter.
   Preview now says **3 Valid** and removes the validation warning. Neither
   invalid date nor invalid amount was repaired.
4. Continue to Configure. It contains all three transactions. The renamed date
   row is dated **9/8/2026**, the browser's current day during this run, instead
   of the impossible input. The renamed amount row carries **0.00**.
5. A fresh390px repeat produces exactly the same counts, today's date and zero.

Expected: changing a valid payee must leave the two unrelated errors intact.
Both invalid rows remain available for correction and excluded from configuration
under the existing valid-row/skip-warning behavior. The application must not
invent today's date or convert an invalid numeric token into a legitimate zero.

Working controls: an untouched fresh file configures only the valid December1
row. Correcting the actual invalid date to **2025-02-28** changes the count to
2Valid/1Error. Correcting the amount to **-3.75** changes it to3Valid; configuration
then preserves February28,2025 and-3.75. The two real repairs work individually.
No row deletion occurred, so037's index-key issue is not the trigger.

## Root cause and fix direction

- `dashboard/src/features/importer/hooks/use-csv-parser.ts:127–141` records
  the amount parse error but stores `amountResult.amount || 0`, losing
  `abc` as an editable raw value. `types/index.ts:17–23` has only a numeric
  amount and unstructured error strings.038's prefix parsing is a separate
  first-stage defect in the same value/validation pipeline.
- `components/steps/preview/editable-preview-row.tsx:34–43` initializes its
  form from those values, with no initial parser diagnostics. At55–76 it calls
  `trigger(field)`, reads the form's current errors, and replaces the entire
  parsed row's error list. Validating a payee does not establish date or amount
  validity. `parseFloat(value) || 0` is also a separate inline conversion.
- The locked React Hook Form **7.71.0** confirms this is caller misuse:
  its published `dist/index.esm.mjs:1625–1638` updates errors only for the
  supplied names; `trigger(name)` at1911–1921 evaluates that field's result.
  Other resolver issues are not automatically copied into the field-scoped
  error map. Merely waiting another render does not validate the whole row.
  Merely changing to full-form validation also cannot recover a raw `abc`
  that the parser has already replaced with0.
- `import-preview-table.tsx:40–69` derives valid counts and the workflow result
  solely from each row's error array. `transaction-config-form.tsx:51–53`
  trusts the same array, then at116–125 replaces an invalid date with
  `dateResult.date || new Date()`. This produces the observed current day.
- Keep original editable values and sufficient field/record diagnostics until
  they are actually repaired. Derive typed values and whole-row validity
  together from a complete current candidate. Preserve unresolved structural
  parser errors rather than clearing them when an unrelated field is valid.
  Do not infer that a numeric fallback0 proves its lost source token was valid.
- Publish a coherent validated row to the workflow after an edit commits;
  pending validation must not allow Continue to use stale validity. Preserve
  other committed edits and Escape cancellation. Keep037's stable row identity
  work coordinated without duplicating its deletion task.
- At the configuration boundary, accept only validated rows and calendar dates.
  Remove silent current-date/invalid-amount fallbacks; preserve legitimate
  explicitly entered zero. Keep valid rows usable with the existing clear skip
  warning for excluded rows. No stored ledger, API or financial-sign change is
  required;039 owns posting sign construction.

## Definition of done

- [x] The original038 complete-token cases are rejected or deliberately parsed
      in full; upload and inline editing agree on their exact numeric value.
- [x] Editing only either payee in the reproduced file leaves1Valid/2Errors;
      configuration still contains only the actual valid control transaction.
- [x] Original invalid input is available for repair, and the correct field
      diagnostics explain why each rejected row is excluded.
- [x] Correcting February29 to February28 and `abc` to-3.75 admits exactly those
      corrected values, without inventing today's date or a numeric fallback.
- [x] Literal zero remains valid; malformed values and incomplete rows remain
      invalid after unrelated edits, including form remount and Back/Continue.
- [x] Pending validation, Enter/blur commits and Escape cancellation produce a
      coherent latest row before advancing. Empty/all-invalid and mixed-validity
      previews retain honest recovery and counts. Editing an existing preview
      does not invoke AI; initial file-parser fallback behavior is preserved.
- [x] Desktop and narrow browser repeats pass without booking transactions;
      meaningful component/parser/configuration tests and dashboard gates pass.
- [x] Standing closing tasks pass before moving this milestone to done.

## Source + Goal linkage

- **Source:** promoted w3/038 and continued `qa-find-bugs-dashboard w3`,
  2026-09-08. Original numeric-token evidence remains in038; this milestone
  owns the combined implementation and its new row-repair evidence.
- **Goal linkage:** **A2 — Frictionless onboarding**: newcomers can repair
  imported data without silently changing its dates or amounts.
- **Expected outcome:** valid input reaches account mapping unchanged; invalid
  input stays identifiable until corrected, including after unrelated edits.
- **Why now:** fixing the numeric grammar alone leaves correctly rejected rows
  able to become valid through ordinary editing. Preserving raw input and row
  validity together avoids a second repair across the same importer boundary.
- **Adoption surface:** included because the upload, preview, error and repair
  journeys are user-facing. Verify documentation and shared guidance for drift;
  no new package or skill is required.

## Dedupe, blast radius and limits

Searched all open/completed board files for invalid-date defaults, error loss,
partial field validation, numeric fallbacks and importer repairs; scanned open
milestones.038 explicitly required rejected tokens not to become valid zero and
is therefore consolidated here instead of receiving a parallel repair task.
037 owns identity after deletion;015 owns logical CSV records;045 owns header
recognition;039 owns posting signs. Their original evidence remains valid.

The single EditablePreviewRow caller is ImportPreviewTable. Both Preview and
Configure receive the same workflow parse result. The CSV hook has two callers:
the active multi-stage path and FileUpload's fallback callback branch. AI results
also enter the shared preview; adapt the internal contract without inventing
raw source text for AI rows. The active CSV flow was exercised; AI, fallback
callback, storage upload and actual persistence were not.

Targeted histories for `trigger(field)` and the current-date fallback both lead
to `af5339de`;6304627a fixes calendar-day parsing but not error propagation.
The pinned framework artifact was read from ignored scratch space, with no
dependency install/change. Fetching main again confirmed no importer changes.

The monitored fresh narrow failure had no page errors; only GetLedgerAccounts
and GetLedgerCurrencies were requested when configuration opened. All file
parsing/editing stayed local. Previews were cleared using Back and Upload
Different File. Other browsers/locales, single-record all-invalid AI fallback,
rapid-edit races, malformed structural rows and a patched implementation remain
unverified live; their regression obligations do not imply they were reproduced.

Verified ignored evidence in `dashboard/tmp/qa-20260907-w3-loop/`:
`import-unrelated-edit-validation.csv`,
`import-unrelated-edit-validation-evidence.json`,
`import-unrelated-edit-accepts-invalid-1440.png`,
`import-unrelated-edit-accepts-invalid-390.png`,
`import-invalid-date-becomes-today-1440.png`,
`import-invalid-date-becomes-today-390.png`,
`react-hook-form-7.71.0.esm.mjs` and `react-hook-form-7.71.0.tgz`.
The original038 evidence and pure-source probe remain linked from that note.
