# w3 · m33 — Preserve import configuration across Back

**Worker:** worker3 **Goal:** reviewing or repairing a CSV preview does not discard the configured accounts, currency or excluded rows **Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Keep configuration draft in the active import workflow | 45m | — |
| t002 | Reconcile preview edits using stable parsed-row identities | 35m | t001 |
| t003 | Verify adoption of the configure and review journey | 20m | t001, t002 |
| t004 | Simplify import draft ownership | 15m | t003 |
| t005 | Test draft persistence and row reconciliation end to end | 40m | t003, t004 |
| t006 | Close out import configuration preservation | 15m | t005 |

170 minutes total:80 minutes implementation plus adoption, simplification, meaningful regression coverage and closeout. Severity **minor**; owning package **dashboard**. A2: readers can finish an import review without repeating account mapping work.

## Definition of done

- [ ] Configure→Back→Continue without changing the preview preserves source account, currency, per-row targets and selection; the example remains Import1Transaction with its second row excluded.
- [ ] Preview edits/removals preserve choices for the same ParsedRow.id, never a different filtered-array position. Updated values still pass the existing parse/validation contract.
- [ ] Newly eligible rows get explicit defaults and invalid/removed rows cannot remain active submission candidates.
- [ ] A new file, ledger or reset/finished workflow starts a clean configuration; no durable/global storage of financial drafts is introduced.
- [ ] Desktop/narrow real wizard repeats and meaningful integration regressions pass alongside dashboard format/lint/test/build. No production imports or AI categorization are required to verify this local state contract.

## Reproduction

Production https://beancount.io, 2026-09-11, public synthetic open_ledger/freelancer-invoicing, authenticated reader, English/light, isolated headless Chrome152. Initial1440×1000 plus independent fresh1440×1000 and390×1000 repeats. All actions are local wizard state; no Import or AI Fill action was invoked and the write guard recorded0 attempts.

Upload this local CSV at /ledger/open_ledger/freelancer-invoicing/import?lang=en:

```csv
Date,Payee,Description,Amount
2026-09-10,QA Supplies,Keep this expense,-4.50
2026-09-11,QA Refund,Exclude this refund,12.75
```

Preview reports2Valid and preserves both rows. Continue to Configure. Set Source Account to Assets:Bank:Business, first target to Expenses:Software, Currency toEUR using its supported custom-value entry, and uncheck Select transaction2. The displayed state is the chosen accounts/EUR, secondSelectedfalse, Import1Transaction.

Press Back, make **no preview edit**, and Continue to Configure. Source account and target are empty, currency isUSD, secondSelected istrue, and the action now reads Import2Transactions. Both fresh widths reproduce exactly, with0page errors. Preview still has its2valid rows; this is lost configuration, not lost/invalid CSV data. The UI warns that2transactions lack target accounts. Existing required-account validation is a mitigating control; no actual unwanted booking or server mutation is claimed.

## Source and repair boundary

hooks/use-import-workflow.ts owns only currentStep and parseResult at19–20. handleBack at32–41 switches Configure to Preview without any configuration draft. components/import-workflow-container.tsx:55–77 conditionally mounts one step, so Back unmounts ConfigureStep/TransactionConfigForm. That form initializes defaultValues at114–137 with sourceAccount empty, primaryCurrency, targetAccount empty and selectedtrue. Re-entering constructs those defaults again.

Keep the draft with the active file workflow and reconcile it with the latest preview. types/index.ts already defines stable ParsedRow.id (not submitted to the API), introduced for preview identity in037; reuse it. Current configuration rowIndex comes from the filtered validRows array and is not a safe identity for retained mapping after deletions. Keep backend ImportTransaction rowIndex semantics unchanged at the submission boundary. No new parser, account API, persistence service or dependency is needed.

## Dedupe and controls

Read completedm19's full DoD: it preserves raw tokens/row validity across edits and Back/Continue, not source/currency/target/selection drafts.037/7cc66fed owns preview form identity after deletion; its existing IDs support this fix.045/1cc5bb64 owns header detection;118 owns reordered columns;076 concerns canceled independent forms. All open/done board and targeted history searches found no retained import-configuration task. Workflow/default ownership dates toaf5339de; a90ee4a6 fixes validity without retaining the draft. Local/fetched origin mainf1965988 has no newer repair; full deployed SHA unverified.

The preceding local quoted/Unicode/BOM/CRLF CSV control reports2Valid and retains the intended dates, payees, quoted description text and signed amounts through configuration at both widths (import-text-roundtrip files). Configuration controls load account choices asynchronously; the early snapshots lacking them were not settled failures. All controls used for this finding were present before setting values.

Evidence dashboard/tmp/qa-20260911-w3-loop/: import-back-configure.json, import-back-repeat-{1440,390}.json, import-back-before-1440.png, import-back-after-1440.png, import-back-repeat-after-{1440,390}.png. Desktop before/after screenshots visually inspected; the before image catches harmless popover closing animation, not a retained UI defect. Exact field values, checked state and action counts are captured independently. All three import contexts closed. No product fix, ledger write, AI request or shipping. Edited/deleted/newly-valid row reconciliation, new-file/ledger reset, actual submission, other locales and patched behavior remain acceptance work, not live coverage claimed here.
