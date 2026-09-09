# w3 · m27 — Preserve explicit amounts when a posting omits currency

**Worker:** worker3 **Goal:** currency inference keeps the amount the user entered and exposes real imbalances **Status:** todo

## Tasks (in order)

| id   | title                                                       | est | depends_on |
| ---- | ----------------------------------------------------------- | --- | ---------- |
| t001 | Pin original partial-currency fixtures and expected amounts | 30m | —          |
| t002 | Integrate the verified upstream interpolation fix           | 60m | t001       |
| t003 | Verify ledger and dashboard adoption surfaces               | 20m | t002       |
| t004 | Simplify the engine integration                             | 20m | t003       |
| t005 | Verify loaded entries, errors and query amounts             | 45m | t004       |
| t006 | Close out and archive the interpolation repair              | 15m | t005       |

190 minutes total, including90 minutes for reproducible integration fixtures
and the dependency/adapter integration. One major finding group. Owner:
**backend-cluster/ledger**. No dashboard or upstream engine rewrite is required.

## Definition of done

- For Expense10 MUSD and Cash-4 with currency omitted, loaded Cash remains
  **-4 MUSD** and the ledger reports the **6 MUSD** imbalance. It cannot
  silently become-10 and pass validation.
- An explicit Cash0 remains **0 MUSD** and the10 MUSD imbalance remains visible.
  Zero is not an omitted amount.
- Correctly balanced Cash-10 with omitted currency remains valid. A completely
  omitted amount still supports ordinary balancing inference.
- An explicit-currency10/-4 control remains unbalanced. A number-only posting
  with multiple possible currencies is rejected without splitting/replacing
  the authored amount into newly balanced postings.
- The owning package loads a verified supported engine containing the fix.
  Direct parsing and the worker-backed journal/errors/query paths agree on
  exact amounts and validation outcomes. Existing relevant engine/golden
  checks and package gates pass.
- No upstream source or WASM bytes are vendored into this repository, and no
  new dependency or client-side replacement booking algorithm is introduced.

## Source + Goal linkage

- **Source:** dashboard QA on2026-09-08, repeated guarded Transaction form
  inputs and local actual-engine controls.
- **Goal linkage:** **A2 — Frictionless onboarding**. A person entering or
  editing a ledger can trust that currency inference will not change a number
  they explicitly supplied to hide a mistake.
- **Expected outcome:** journal, balances and errors reflect authored amounts;
  the user sees and can correct an unbalanced entry.
- **Why now:** pinned0.21.0 loses numeric input, while published0.24.0
  independently passes the original fixtures. A concrete upstream repair is
  available to integrate and validate.
- **Adoption surface:** included because the correction affects user-visible
  ledger reads and validation. Existing setup and compatibility guidance must
  remain accurate.

## Reproduction and evidence boundary

Severity: **major**. Production browser:`https://beancount.io`,Chrome152,
English/light,1440×1000 and390×844, QA session, public`open_ledger/minimax`.
Local HEAD`a315c273`, fetched main`afb36a9b`, relevant source and dependency
pin unchanged; deployed SHA unverified. **No production mutation was accepted.**

1. Open `/ledger/open_ledger/minimax/journal?lang=en&action=new-entry&directive=transaction`.
2. Select Expenses:CostOfRevenue and Assets:Current:Cash. Enter10 and-4.
   Leave the first currency MUSD and clear the second Currency field.
3. Create Transaction Entry stays enabled. Its intercepted BulkEntries
   preserves Cash units.number **-4**, units.currency **empty string**.
   Repeat with explicit **0**, and repeat both cases from fresh loads at
   both widths. The guard aborts each request before transmission.
4. Restoring MUSD preserves the entered-4 or0 in the prepared request.
   Eight documents returned200; each produced an aborted empty-currency
   request and an aborted restored-currency control. No page exceptions or
   other mutation operations occurred. All contexts closed.

The dashboard does not overwrite the amount. The actual local entry builder
prints a number-only posting, which is valid Beancount syntax. A preliminary
balanced10/-10 control passes; an empty currency alone is not the defect.

The loss occurs when the pinned engine loads the resulting original fixture:

| Cash source after Expense10 MUSD | WASM0.21.0             | WASM0.24.0 and Beancount3.2.3 |
| -------------------------------- | ---------------------- | ----------------------------- |
| -4, currency omitted             | Cash-10 MUSD, valid    | Cash-4 MUSD,6 MUSD imbalance  |
| 0, currency omitted              | Cash-10 MUSD, valid    | Cash0 MUSD,10 MUSD imbalance  |
| -10, currency omitted            | Cash-10 MUSD, valid    | Same correct result           |
| -4 MUSD                          | Cash-4 MUSD, imbalance | Same correct result           |
| Completely omitted units         | Cash-10 MUSD, valid    | Same correct result           |

With Expense10 MUSD, IncomeTax5 USD and Cash-15 lacking a currency,0.21.0
creates separate Cash-10 MUSD and Cash-5 USD postings and declares validity.
0.24.0 and Python reject the ambiguous currency. That matrix case is local,
not an exercised production entry journey.

These are actual local published engines on identical original text, not
fabricated API responses. Twelve engine cases and six Python oracle cases
establish the difference. Production post-write behavior and a deployed
corrected client/backend remain unverified.

## Root, upstream fix and integration boundary

- Dashboard `src/features/journal/components/new-directive-dialog/transaction-form.tsx:90,239–240`
  allows the currency draft to be empty and preserves the supplied number.
  The ledger's `src/foundation/rustledger/entry-build.ts:81–91` and
  `journal-serialize.ts:455` preserve that number in source.
- Ledger `package.json` pins`@rustledger/wasm`0.21.0.
  `src/foundation/rustledger/loader.ts:39–49` initializes that module;
  `engine.ts:85–86,516,681–682` obtains booked directives/query results.
  The incorrect amount already exists inside that producer.
- In pinned upstream
  [interpolate.rs](https://github.com/rustledger/rustledger/blob/23b9068958afb35dbec542a6acc7953a804b18cc/crates/rustledger-booking/src/interpolate.rs),
  the NumberOnly arm at387–411 places a posting with no currency context in
  the same unassigned list as a completely missing amount. At616–623 it
  replaces the amount from the residual; the multi-currency branch at582–589
  can also replace/split it.
- Verified upstream
  [commit81b28698](https://github.com/rustledger/rustledger/commit/81b286989797275f315b7663b7c9a61236f55dc7)
  distinguishes supplied numbers from missing numbers. It resolves only the
  currency, retains the known contribution and rejects ambiguous currency.
  Its original tests also cover a supplied number that leaves an imbalance.
- Published0.24.0 contains that change and passes the original local matrix.
  Both reused archives were checked against exact registry SHA512 metadata.
  The GitHub API supplied the primary commit/source after browser-source
  requests missed the cache.

Integrate a supported artifact containing that correction;0.24.0 is a verified
candidate for this defect, not a claim that all package integrations have been
tested. Check its API/behavior compatibility, update the existing package pin
and regenerate its Yarn lockfile normally. Keep CommonJS, loader recovery,
worker memory cleanup and GPL containment. Do not recreate upstream booking
logic, silently prefill a currency to conceal the engine bug, or overwrite
authored amounts after parsing.

All consumers of booked directives are potentially affected: journal,
balances/reports, validation and BQL. Their application-specific presentation
was source-traced; this run did not publish a malformed ledger to test them.
Tests must carry the original fixture through the package's real loading
boundary, not merely invoke a replacement mock returning corrected postings.

## Dedupe and coordination

All open/completed board records, current main and targeted source/history
were searched for partial/elided currency, NumberOnly, interpolation and
upstream1920/1921. No existing item owns this preservation defect.
m26 concerns unresolved client amounts and skipped rows; no currency-validation
expansion was added there.089 concerns exponent source rendering; it remains
independent of this booking fix.

Coordinate the shared dependency pin with m18.0.24.0 still fails m18's separate
lot-reduction price tests. Completing this milestone must not close m18 or
claim that the price-policy prerequisite is satisfied. No upstream issue,
message, patch or release was published by this QA run.

Ignored evidence under `dashboard/tmp/qa-20260907-w3-loop/`:
`partial-currency-evidence.json`,`partial-currency-engine-matrix.json`,
`partial-currency-python-control.json`,`partial-currency-upstream-fix.json`,
`partial-currency-release-integrity.json` and two
`transaction-partial-currency-{1440,390}.png` captures.
Reusable local probe:
`backend-cluster/ledger/tmp/qa-20260907-holdings/probe-partial-currency.mjs`.
