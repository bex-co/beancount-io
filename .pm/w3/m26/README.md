# w3 · m26 — Prepare complete transaction amounts from eligible postings

**Worker:** worker3 **Goal:** transaction auto-balance uses the rows that will be written and rejects amounts it cannot infer **Status:** todo

## Tasks (in order)

| id   | title                                                     | est | depends_on |
| ---- | --------------------------------------------------------- | --- | ---------- |
| t001 | Use the same posting eligibility for inference and output | 35m | —          |
| t002 | Reject ambiguous or incomplete derived posting amounts    | 40m | t001       |
| t003 | Verify transaction-entry adoption surfaces                | 20m | t002       |
| t004 | Simplify inference and submission validation              | 20m | t003       |
| t005 | Test row eligibility, ambiguity and valid currency groups | 45m | t004       |
| t006 | Close out and archive the transaction inference repair    | 15m | t005       |

175 minutes total, including 75 minutes of implementation. One major finding
group, promoted from [067](../067.md); do not count or implement that historical
note separately.

## Definition of done

- With an unused first row, Expense10 and Cash-auto prepare exactly 10/-10 MUSD,
  whether the unused row has an empty amount or100. Skipped rows cannot receive
  the inferred amount or contribute to its sum.
- Three eligible same-currency postings with amounts10/blank/blank retain the
  draft and require correction; they do not prepare 10/-10/NaN or silently
  substitute zero. Three eligible rows with all amounts blank likewise cannot
  prepare NaN postings.
- Every eligible posting has a finite amount after inference before a mutation
  is prepared. The existing at-least-two-postings check still applies.
- A single missing amount per currency remains supported: 10/-4/blank becomes
  10/-4/-6; 0/0/blank becomes0/0/0; separate MUSD10/blank and USD5/blank become
  MUSD10/-10 and USD5/-5. Explicit zero remains a real input.
- Original row indexes, unused trailing rows, row deletion and correction after
  a validation error behave coherently. Inputs, inferred placeholders and
  submitted values agree at desktop and390px widths.
- Meaningful component/submission checks and dashboard format, lint, test and
  build gates pass. Production ledger mutations are unnecessary for verification.

## Source + Goal linkage

- **Source:** [067](../067.md), expanded through fresh dashboard QA on2026-09-08.
- **Goal linkage:** **A2 — Frictionless onboarding**. Someone entering a first
  transaction can trust the inferred amount and correct incomplete postings
  before attempting to book them.
- **Expected outcome:** unused rows do not create an invalid residual, and
  ambiguous missing amounts produce an actionable local validation state.
- **Why now:** filtering unused accounts repairs the original cases but still
  leaves independently reproduced NaN output when several eligible amounts are
  blank. Both parts must use one coherent inference/output contract.
- **Adoption surface:** included because the existing Journal entry flow is
  user-facing. No new package, command, skill or dependency is required.

## Reproduced behavior

Severity: **major**. Owner: **dashboard**.

Production `https://beancount.io`,2026-09-08,Chrome152,English/light,
1440×1000 and390×844. Fresh QA contexts, public `open_ledger/minimax`;
pull/push true, admin false. This ledger is not disposable. All GraphQL
mutations were aborted before transmission. Local HEAD`a315c273`, fetched
main`afb36a9b`, implicated source unchanged; deployed SHA unverified.

Original unused-row cases and working controls are retained in067. Additional
steps:

1. Open `/ledger/open_ledger/minimax/journal?lang=en&action=new-entry&directive=transaction`.
2. Choose these existing accounts in order: Expenses:CostOfRevenue,
   Assets:Current:Cash, Expenses:IncomeTax. Keep MUSD for all three.
3. Enter10 in the first amount; leave the other two amounts blank. The ordinary
   automatically appended fourth row also remains unused.
4. Cash shows the inferred placeholder-10.00, while IncomeTax has no inference.
   Create Transaction Entry is enabled. Its intercepted BulkEntries contains
   **10 MUSD, -10 MUSD, NaN MUSD** for those three accounts.
5. Repeat fresh at both widths. Repeat again with all three amounts blank:
   the enabled action prepares **three NaN MUSD amounts**.

Twelve additional documents returned200 across initial/fresh failures and
controls. No page exceptions or unexpected mutation operations occurred.
All contexts closed. These are prepared requests, not accepted transactions
or claims about the uncalled server's response.

Working controls at both widths:

| Draft amounts       | Currencies           | Prepared amounts |
| ------------------- | -------------------- | ---------------- |
| 10, -4, blank       | MUSD throughout      | 10, -4, -6       |
| 0, 0, blank         | MUSD throughout      | 0, 0, 0          |
| 10, blank, 5, blank | MUSD, MUSD, USD, USD | 10, -10, 5, -5   |

The fourth account for the currency control is Expenses:OtherNet. Currency
Combobox's existing custom-value Enter path commits USD without submitting
the form; intercepted request count stays zero until the final action.
Ordinary trailing blank rows are present in all controls.

Local Beancount3.2.3 independently accepts the three valid prepared controls
and rejects the NaN-containing strings as LexerError, invalid token NaN.
The original local control also rejects10/-110 as unbalanced by-100 MUSD.
This is parser evidence, not a production write or a substituted API response.

## Cause and repair boundary

All application paths below are under `dashboard/src/`.

- `features/journal/components/new-directive-dialog/transaction-form.tsx:78–103`
  permits empty draft amounts. Its array minimum applies before unused rows
  are removed.
- `autoBalanceInfo` at174–214 groups every watched row, including accounts
  excluded from output. Each currency stores only its first emptyIndex;
  further missing amounts are not counted or validated. It infers only if at
  least one explicit finite amount exists.
- `onSubmit` at221–242 applies inference, filters blank accounts, then calls
  parseFloat(...).toString() on every remaining amount. An unresolved empty
  amount becomes the literal string NaN. At244–247 it checks only row count.
- `graphql/query/journal.graphql:9` BulkEntries uses AddEntryInput.
  The gateway's `LedgerAmountInput` in
  `backend-cluster/backend-v2/src/features/ledger/api/resolvers/ledger-entry-resolver.mutation.ts:62–67`
  represents number as String; GraphQL's scalar type does not turn NaN into a
  missing amount or validate this client inference. Keep ownership in dashboard.
- Apply one trimmed, nonblank account eligibility rule before inference and
  output. Preserve original indexes. Count missing eligible amounts per
  currency; only a uniquely inferable amount should receive the balancing
  value. Do not treat an empty group as an explicit zero.
- Validate the derived result before preparing BulkEntries, retain the user's
  input, and expose a localized usable correction path. Do not silently fill
  unresolved blanks with zero, include unused rows, change signs, or send a
  partial transaction. Preserve each currency group's independence.

TransactionForm has one component caller:
`features/journal/components/new-directive-dialog/index.tsx:86`.
Journal toolbar/sidebar entry actions and the transaction deep link share it.
Balance/Note/Account directives, importer and mobile use separate paths.

## Dedupe and limits

All open/completed board records and targeted history were searched for
auto-balance, emptyIndex, missing amounts, finite output and NaN.067 owns the
same inference/output defect, so it is promoted and expanded.039 is import
sign reversal;064 is native input precision; m19 is CSV numeric validation;
m24 is date state;066 is control naming. No overlap requires a new finding.
Targeted history traces emptyIndex to`af5339de`; fetched main has no repair.

Currency validation, arbitrary decimal-precision changes, costs/prices, other
directive forms, native apps, accepted write behavior and a patched live flow
remain outside this finding. Tests should use the real form and capture the
mutation boundary rather than mirror the implementation or call production.

Ignored evidence under `dashboard/tmp/qa-20260907-w3-loop/`:
`transaction-inference-evidence.json`,
`transaction-inference-parser-control.json`,
`transaction-ambiguous-amounts-{1440,390}.png`, plus the original067 evidence.
Screenshots show the unresolved posting before submission; the sanitized
intercepted payload is the evidence for NaN.
