# w3 · m36 — Reject lossy CSV amount conversions before import

**Worker:** worker3 **Goal:** accepted CSV amounts retain their exact serialized decimal value **Status:** todo

Severity: **major**. Package: dashboard. Residual boundary of completed [m19](../done/m19/README.md), whose t001 requires each accepted amount to represent its whole input token. Do not count a new historical group or reopen its working full-token/field-validity repairs. Related [142](../142.md) separately owns initial field-error presentation.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Reject amount conversions that change the exact decimal value | 45m | — |
| t002 | Keep rejected precision inputs out of automatic parser fallback | 30m | t001 |
| t003 | Verify the import validation adoption surface | 15m | t002 |
| t004 | Simplify the precision validation changes | 15m | t003 |
| t005 | Test exact values and parser-stage boundaries | 45m | t003 |
| t006 | Close and archive the precision guard milestone | 10m | t004, t005 |

Implementation totals75minutes; all six tasks total160minutes. Parser-stage handling makes this more than a sub-hour validator edit.

## Reproduction and evidence

Production https://beancount.io,2026-09-11, isolated headless Chromium152, authenticated QA GROWTH reader, public open_ledger/crypto-example, English/light, fresh1440×1000 and390×1000. Local/fetched main f1965988; latest entry main-RkgtsKH_.js, exact deployed commit unverified. CSV stays local in browser preview/configuration; no import, AI processing or upload request was submitted.

```csv
Date,Payee,Description,Amount
2026-09-01,QA Fraction,Precision boundary,0.123456789012345678
2026-09-02,QA Integer,Safe integer boundary,9007199254740993
2026-09-03,QA Underflow,Nonzero exponent boundary,1e-324
2026-09-04,QA Control,Ordinary decimal,1.25
```

Select this file at /ledger/open_ledger/crypto-example/import?lang=en. Preview preserves all four original tokens and says4Valid. Continue to Configure: amounts become0.12345678901234568,9007199254740992,0 and1.25. All four remain selected; the ordinary missing-account validation is still shown, and the action says Import4Transactions. Both widths reproduce. A third fresh390 waits for Source Account/Currency controls to load and repeats the same changed values. No page errors or additional blocked writes occurred.

Local control transpiles and calls the unmodified parseAmount function using installed TypeScript: the three changed-value tokens return valid:true with the rounded/zero Number. Python Decimal comparison proves their serialized decimal values differ from the original tokens.1.25,0,1.2500,+2.5e1 and-0.0 have equivalent values;12,34, grouped-1,234.56 and overflowing1e309 are correctly rejected. This is not a requirement to support arbitrary precision: unsupported values should be rejected explicitly instead of accepted as different amounts.

Verified evidence under dashboard/tmp/qa-20260911-w3-loop/: import-number-boundaries.csv, import-number-boundaries-1440.json, import-number-boundaries-390.json, import-number-boundaries-1440.png, import-number-boundaries-390.png, import-number-boundaries-settled-390.json/.png, import-number-parser-control.cjs/.json and import-number-exact-comparison.json. Desktop image inspected; its account selectors were still loading, so the third repeat establishes that the amount issue persists after they settle. All fresh contexts closed. Actual server persistence/rejection and AI fallback outcomes remain unverified.

## Root cause and repair boundary

- importer/utils/csv-validator.ts:83–90 converts with Number and checks only NaN/nonfinite. Finite rounded values and nonzero underflow to0 pass. buildParsedRow:124–135 keeps amountInput but stores that Number. row-edit-schema.ts:41 and editable-preview-row.tsx:73 reuse the same validator.
- components/steps/configure/transaction-config-form.tsx:53 and119–125 revalidate then store the same rounded Number; handleSubmit:163–169 carries txn.amount into ImportTransaction. hooks/use-import-submit.ts:40–49 serializes txn.amount.toString() and its negation into posting number strings. This downstream consequence is source-traced, not a submitted mutation.
- format-import-review-amount.ts displays the numeric value it receives; merely increasing display precision cannot restore digits already lost in parsing.
- Required adjacent stage: hooks/use-multi-stage-parser.ts:30–49 falls through to LLM parsing when validCount=0, and use-llm-parser.ts:48–55 trusts numeric returned amounts and creates amountInput with String(row.amount). A new precision rejection must not be bypassed by this fallback for recognized CSV. That future bypass is source-traced risk, not claimed as a live LLM result.

Compare the exact decimal represented by the accepted token with the final numeric serialization, allowing equivalent signs/zero/trailing-zero/exponent spellings. Avoid Number-to-Number comparisons (both sides already round), binary epsilon tolerances, blanket integer-only limits or rejecting ordinary0.1 because of its binary representation. Keep this guard in the current numeric model. Do not migrate to an arbitrary-precision amount model or add dependencies as part of this milestone.

## Definition of done

- The three unsupported tokens stay editable and invalid; they cannot become selected Configure/ImportTransaction amounts. The mixed fixture configures only the1.25 control.
- Supported decimal/zero/exponent equivalents keep the same serialized decimal value through upload, inline correction and Configure. Existing grouping/junk/overflow rejections remain intact.
- An all-unsupported recognized CSV remains an honest repairable invalid preview and does not start LLM/upload fallback. Existing non-CSV/unrecognized-format behavior is preserved.
- Invalidity and its precision reason remain available in the row-error flow; coordinate142 without duplicating its initial field-error rendering repair.
- Real-parser/workflow regressions, browser repeats and dashboard gates pass without production writes. Dates, account selection, currencies and existing display/inference behavior remain unchanged.

## Dedupe and limits

All open/done queues searched for unsafe integers, underflow, amount precision and exact conversion; full m19/t001 reviewed. This extends its accepted-whole-token validation contract, so it is a residual, not a second historical CSV validation finding. Completedm26 explicitly excludes arbitrary decimal-precision changes and owns inference/review formatting;116 is journal display,118 column mapping, native m34 another package's multi-posting arithmetic, and157 BQL's SDK range-error classification. None supplies this CSV representability guard. Current parser history includes a90ee4a6,7cc66fed and1cc5bb64; no newer main fix. Other import entry mechanisms without original tokens, native input and actual backend mutation behavior are outside this reproduction.

## Source + Goal linkage

- **Source:** completed [m19/t001](../done/m19/done/t001.md), plus fresh CSV preview/configuration and local exact-decimal controls on2026-09-11.
- **Goal linkage:** **A2 — Frictionless onboarding**: a first imported amount must not silently change while being labeled valid.
- **Expected outcome:** readers can repair unsupported values before configuring an import, with exact supported values and no fallback that bypasses rejection.
- **Why now:** the whole-token grammar repair still accepts lossy finite conversions; parser-stage behavior must be handled with the guard. Adoption surface is included because users encounter these validation decisions directly.

## Inline-edit corroboration

Fresh390 imported a single1.25 control row, opened its amount editor, typed0.123456789012345678 and committed with Enter. Preview retained the full token and still said1Valid; settled Configure showed0.12345678901234568. import-inline-precision-control.json under the same dashboard evidence directory records the actual edit and transition, with no page errors or blocked-write increase. This confirms the shared inline caller as well as file parsing; no import submitted.

## Downstream exact-string control

The current ledger entryInputToText function plus installedWASM0.24.0 locally preserve both1e-8 (expanded to0.00000001) and0.123456789012345678 as balanced source with zero validation errors. Evidence backend-cluster/ledger/tmp/qa-20260911-errors/amount-serialization-control.cjs and amount-serialization-control.json. Thus unsupported precision here means the current frontend Number-based import path, not a universal ledger precision limit. The proposed rejection is a bounded safety guard; full exact-string import support is separate scope. The earlier exponent-rendering defect089 was repaired byf4e95c31 and is not reopened. No production mutation was invoked.
