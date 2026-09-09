# w3 · m24 — Keep typed dates consistent with submitted entries

**Worker:** worker3 **Goal:** users can edit a complete calendar date without submitting a previous or silently corrected date **Status:** done

## Tasks (in order)

| id   | title                                                  | est | depends_on |
| ---- | ------------------------------------------------------ | --- | ---------- |
| t001 | Preserve date drafts and parse complete calendar dates — **DONE** | 55m | —          |
| t002 | Propagate invalid date state through all form callers — **DONE** | 40m | t001       |
| t003 | Verify date-entry adoption surfaces — **DONE** | 20m | t002       |
| t004 | Simplify date state and validation wiring — **DONE** | 20m | t003       |
| t005 | Test real typing, invalid submission and recovery — **DONE** | 55m | t004       |
| t006 | Close out and archive the date-entry repair — **DONE** | 15m | t005       |

205 minutes total, including 95 minutes of implementation across the shared
picker and its form integrations. One major finding group with related
manifestations of the same raw-text/parsed-date contract, not four separate bugs.

## Definition of done

- Typing **06/15/2025** one character at a time in the cleared Budget date input
  leaves that intended date intact; intermediate characters are not expanded
  into unrelated dates or years.
- After entering **06/15/2025**, clearing the date or replacing it with
  **not-a-date** prevents submission using the previous **2025-06-15** date.
  Budget and Journal Balance surface a usable invalid/required state.
- Entering **02/30/2025** remains an invalid calendar date; it cannot silently
  become and submit **2025-03-02**. Valid **02/28/2025** remains **2025-02-28**.
- Pasting **2025-06-15** retains June 15 in America/Los_Angeles and UTC. Any
  normalized display is **06/15/2025** and the prepared date is **2025-06-15**,
  just as for the complete **06/15/2025** input. It never shifts to June 14.
- Calendar/Today selection and correction to a valid typed date restore a
  coherent valid form. External resets and reopening do not retain stale text.
- All seven DatePicker callers honor its invalid/empty value contract. Required
  forms do not retain a prior valid Date when the visible draft is invalid.
- Desktop and 390px interactions preserve keyboard use, labels, existing
  permissions, busy/error behavior and exact date-only serialization.
  Meaningful real-component tests and dashboard format, lint, test and build
  checks pass. No production writes are needed to verify this repair.

## Source + Goal linkage

- **Source:** repeated dashboard QA on 2026-09-08, fresh Budget and Journal
  Balance journeys at desktop and narrow widths.
- **Goal linkage:** **A2 — Frictionless onboarding**. A person entering a first
  budget or balance can type the intended date and see invalid input before
  anything is booked against a different day.
- **Expected outcome:** ordinary keyboard date entry works, and invalid visible
  text never prepares a write using a hidden previous or normalized date.
- **Why now:** the shared picker publishes permissively parsed partial text,
  but retains stale form data for invalid text. Its callers also discard empty
  changes, so repairing only the shared handler is insufficient.
- **Adoption surface:** included because date entry is exposed by several
  existing user journeys. No new public command, package or skill is introduced.

## Reproduced behavior

Severity: **major**. Owning package: **dashboard**.

Production `https://beancount.io`, Chrome 152, English, light,
America/Los_Angeles, 1440×1000 and 390×844. QA account from dashboard/.env,
public `open_ledger/minimax`; GetLedger returns HTTP 200, pull/push true,
admin false and no errors. This ledger is not disposable. Unconditional
GraphQL mutation guards were installed before each navigation and aborted every
prepared write before transmission; service workers were blocked.

1. Open `/ledger/open_ledger/minimax/budget` → Add Budget. Wait for the actual
   Account input, choose Expenses:CostOfRevenue and enter Amount **100**;
   keep the default MUSD currency.
2. Fill Date with **06/15/2025**, then clear it. Click Add Budget. The field is
   blank, native required is false and the button is enabled, but BulkEntries
   is prepared with budget.date **2025-06-15**.
3. Repeat from a fresh load with **not-a-date** instead of an empty date.
   The visible invalid text still produces **2025-06-15**.
4. In Journal's
   `/journal?action=new-entry&directive=balance` within the same ledger, wait
   for the Balance tabpanel, choose the same account and Amount100, set
   **06/15/2025**, then **not-a-date**. Create Balance Entry prepares
   balance.date **2025-06-15**, with native validity true and no invalid event.
5. On a fresh Budget form, fill **02/30/2025**. It immediately becomes
   **03/02/2025**, and submission prepares **2025-03-02**.
6. Clear Date on another fresh Budget form and type **06/15/2025** character
   by character. The first **0** expands to **01/01/2000**; after **6**, it
   becomes **01/01/20006**. The final visible text is
   **01/01/2000615/2025**. This typing experiment was not submitted.

All failing cases repeat at both widths. Request fields above are captured
at the guard, not responses from accepted ledger writes. Documents return
HTTP 200. Original typing/empty-required controls produce no errors. Deliberate
abort controls produce expected ERR_FAILED console messages; page exceptions
are zero. All isolated contexts were closed.

Working controls: Journal Balance's empty date is blocked by its native required
attribute, with one invalid event and no request. It does not validate nonempty
date text. Pasting **02/28/2025** into Budget prepares the correct **2025-02-28**.
Opening the calendar and choosing Today recovers the corrupted typing draft to
**09/08/2026**, without submitting. These controls pass at both widths.

## Cause and repair boundary

All application paths below are relative to `dashboard/src/`.

- `common/components/ui/date-picker.tsx:74–91` runs `new Date(inputVal)`
  on every keystroke. A valid result is immediately published to the parent;
  its value effect reformats the draft. Invalid/empty text publishes nothing,
  so the parent retains the previous Date.
- `isValidDate` at38–42 checks only for a non-NaN timestamp. It does not enforce
  complete input or reject calendar rollover. JavaScript's
  [Date.parse contract](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-date.parse)
  permits implementation-specific parsing for nonstandard formats; it is not
  a strict MM/DD/YYYY validator. The exact expansions here were observed in Chrome.
- Budget's date schema is `z.date()` at
  `features/ledger-data/budget/add-budget-dialog.tsx:47–54`, but it sees the
  previous valid Date. Its caller at201–205 ignores undefined, and its serializer
  at139 converts that stale value to yyyy-MM-dd. Journal Balance has the same
  valid-only callback at150–159 and serializer at96.
- Keep the raw draft independent from the last parsed Date. Publish an invalid/
  empty state when text is incomplete or invalid, without erasing the draft
  when the parent echoes that state. Parse complete MM/DD/YYYY and YYYY-MM-DD
  calendar inputs strictly as local calendar components; normalize only at an
  intentional commit boundary, not after each
  parseable prefix. Preserve external value resets, calendar selection and Today.
- Use the existing date-fns dependency instead of implementing calendar rules
  or adding a package. Its integrity-verified 4.1.0 DateParser validates month
  length/leap years. A local control with parse(MM/dd/yyyy) rejects February30,
  non-leap February29, 0, empty and invalid text, while accepting February28 and
  leap-day2024. This validates an available parser, not a patched application.
- Update callers that ignore undefined and keep required validation truthful.
  Missing/invalid dates must not reach format() or a write. Do not substitute
  today, retain the old date silently, hide raw text on invalidation, or solve
  only the empty case by adding required. Keep dates as calendar dates and
  preserve the existing supported input/serialization contract explicitly.

## ISO date extension — timezone control

Fresh Budget repeats on 2026-09-08 at 1440×1000 and 390×844 add another
manifestation of the same permissive DatePicker parser. In an isolated
America/Los_Angeles context, open Add Budget, choose Expenses:CostOfRevenue,
enter 100 MUSD, and paste **2025-06-15** into Date. It immediately displays
**06/14/2025**. The enabled Add Budget action prepares a guarded BulkEntries
budget date of **2025-06-14**. Both fresh widths reproduce the previous-day
change. Every mutation is aborted before transmission; no budget is accepted.

Working controls at both widths: the identical ISO input in UTC and the
**06/15/2025** input in Los Angeles each display June 15 and prepare
**2025-06-15**. All six documents return HTTP 200; each deliberate abort produces
one expected ERR_FAILED and no page exception. All contexts closed; the main
browser's timezone and session were not changed.

The source remains `date-picker.tsx:83–91`: new Date(inputVal) interprets an
ISO date-only string as UTC midnight, then local formatting in lines23–28 and
the Budget serializer at139 see the previous local day. The
[ECMAScript Date.parse contract](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-date.parse)
specifies UTC interpretation for this form. This is not a backend truncation
or a new timezone policy. A local pinned date-fns 4.1.0 control using strict
yyyy-MM-dd/MM/dd/yyyy patterns preserves June 15 in both zones and rejects
2025-02-30. Extend t001's strict parsing and t005's real timezone coverage.

Source files are unchanged on fetched main `790791ac`; deployed SHA is
unverified. Open/completed searches found no separate DatePicker ISO repair.
m19 and the earlier6304627a calendar parsing change concern the independent
CSV import path. Calendar text localization remains m22 and navigation bounds
remain069. Keep this as one m24 finding group. Other timezone offsets, daylight
saving boundaries, receipt prefills and patched production remain unverified.

Verified ignored additions in the same QA directory:
`date-picker-iso-evidence.json`, `date-picker-iso-parser-control.json`, and
`budget-iso-date-shift-{1440,390}.png` (date-input crops only).

Seven callers were enumerated: Budget AddBudgetDialog; Journal Transaction,
Balance, Note and OpenAccountForm; Accounts OpenAccountDialog; ReceiptReviewForm.
Six discard undefined; ReceiptReviewForm already forwards it. Only Budget and
Balance were exercised live. Account/receipt/other Journal flows require
integration coverage for the shared contract, not separate live bug claims.
The Accounts toolbar and Journal toolbar/sidebar/deep-link variants expose
these forms; Budget also has empty-state/card callers. No receipt was uploaded
or processed, and no account was opened.

The existing Budget test replaces DatePicker with a readOnly input
(`features/ledger-data/budget/__tests__/add-budget-dialog.test.tsx:50–66`), so it
cannot detect real typing, effect synchronization or native validation.
Use real picker/form behavior with isolated data/mutation boundaries.

## Dedupe, limits and evidence

Searched open/completed board records for typed/invalid/stale dates, date pickers,
calendar dates and rollover. m19 concerns the independent CSV parser and import
configuration fallback; it does not use this picker. Native w3/m2 uses a different
DatePickerModal. 064 is amount step validation and065 is selector ID/ARIA
forwarding. Coordinate overlapping Budget/Journal files with those notes and
m23's return-focus work; preserve their repairs.

Targeted history traces this picker/callback pattern to `af5339de` and
localization `aeec496b`. Local HEAD `a315c273`, fetched main `853a4942`;
implicated source is unchanged there. Deployed SHA is unverified. No product
code, dependencies or lockfiles were changed during QA.

Evidence under `dashboard/tmp/qa-20260907-w3-loop/`:
`date-picker-editing-evidence.json`, `date-picker-parser-control.json`,
`budget-invalid-date-{1440,390}.png`,
`balance-invalid-date-{1440,390}.png`,
`date-fns-4.1.0-DateParser.js` and the verified 4.1.0 archive/CDN artifact.
JSON includes exact intermediate keystroke values, native validity, guarded
dates, successful controls and minimal public permission data.

Unverified: accepted write success, a patched UI, other browsers/OS keyboards,
timezone variants, other calendar selections and the five source-only callers.
No production ledger resources were created.
