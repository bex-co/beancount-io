# w3/m34 — Preserve decimal amounts in native multi-posting drafts

**Worker:** worker3 **Goal:** entered decimal amounts, balancing and serialized postings agree **Status:** todo

**Severity:** major. **Estimated effort:** 175m across six tasks. Mobile only; no new dependency or API change assumed.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Preserve exact decimal values in posting arithmetic and serialization | 50m | — |
| t002 | Connect exact amounts to draft controls and validation | 45m | t001 |
| t003 | Adoption surface | 15m | t002 |
| t004 | Simplify | 15m | t003 |
| t005 | Test coverage | 40m | t003, t004 |
| t006 | Closeout | 10m | t005 |

## Reproduced finding

Production https://beancount.io, September 11, 2026; local HEAD f1965988, latest mobile commit 7538fb0d, native build io.beancount.ios 1.20260906.47, iPhone 17e/iOS26.5, English/System-light/default text size. Authenticated QA account; public open_ledger/minimax reports pull/push true and admin false. Ledger permission did not authorize a production write: **Done was never pressed and no transaction was submitted**.

1. Select public open_ledger/minimax. Open the actual Transactions tab and its top-right plus button.
2. New Transaction correctly chooses MUSD, initially has Assets:Current:Cash and Expenses:CostOfRevenue, and disables Done for zero amounts.
3. Enter **1.005** in the first amount field. The displayed first posting remains **+1.005**, while the automatic second posting becomes **−1.00**.
4. The same settled screen reports green **Remainder ✓ 0.00 MUSD** and enables Done, despite the displayed amounts differing by 0.005 MUSD.
5. Terminate and relaunch the app; verify Home first, then repeat the actual Transactions → plus → native typing sequence. Fresh PID44571 reproduces the exact mismatch. Initial PID39488 also reproduced it.
6. A separate blank-draft native control entering **1.25** displays +1.25/−1.25 and zero remainder. Back exits the unsaved draft; no transaction was created.

The current, unmodified local `buildEntryInput` was invoked offline on the same two accounts and input. It serializes **1.00 MUSD / −1.00 MUSD**, with validation null and remainder0. This is a local payload probe, **not an observed submitted request or persisted corruption**. Further offline controls:1.25 retains ±1.25;1.999 becomes ±2.00;0.004 becomes zero and fails zeroAmount. Only1.005 and1.25 were exercised through the native amount field.

Expected: accepted decimal input remains exact through the automatic counterposting, remainder, sign changes and payload. A value that cannot be represented safely must produce an explicit validation error and disable submission; it must never silently become a different amount. The MUSD ledger itself uses three-decimal postings, confirmed by GetLedgerEntryContext for ordinary entry864c29173af59ac1164edd8214ad41c7 (for example −116.573MUSD and +95.760MUSD). Its existing source editor preserves those digits.

## Root cause and repair contract

- `mobile/src/screens/multi-postings-transaction/postings-utils.ts:14–19` parses text with parseFloat and Math.round(n*100), imposing cents on every currency. Binary floating-point also makes1.005 round to1.00 here.
- `updatePostingAmount` at107–127 keeps raw amountInput but stores a separately rounded amountCents. `applyAutoFill` at28–44 derives the opposite amount from rounded cents, and `remainder` at95–97 sums those values. The UI and model therefore disagree.
- `validatePostings` at154–160 sees only rounded cents. `buildEntryInput` at163–183 serializes those cents, dropping the entered precision.
- `multi-postings-transaction-screen.tsx:244–249,309` forwards native text into that model;414 enables Done from validation,428–437 builds the mutation payload,458 and584 format remainder through a cents division and two-decimal formatter.

Replace the universal cents representation with exact decimal parsing, arithmetic and serialization appropriate to Beancount amount strings. Keep raw editable text separate from validated exact numeric state. Preserve trailing editing states without falsely marking them valid. Automatic counterpostings, multiple-posting sums, sign toggles, removal, manual/auto switching and serialized amount strings must use the same exact value. Do not fix this by rounding the visible input, relabeling MUSD as USD, increasing only the display precision, or adding a floating-point epsilon. Reject invalid/nonfinite/unsupported precision explicitly and safely if needed; valid reproduced1.005 must be retained. Scope changes to mobile and use existing dependencies; any new dependency requires separate approval.

## Blast radius and adjacent states

`postings-utils` has one production consumer, MultiPostingsTransactionScreen. The actual Transactions plus uses /add-transaction; Home and receipt handoff also reach that screen. createPrefilledPostings uses the same parser, so cover precise route prefill in tests. The receipt camera/parser has its own upstream two-decimal handoff at receipt-capture-screen.tsx:140; its native behavior was not exercised and broad receipt precision is not claimed fixed by this milestone. The parked /add-transaction-legacy flow uses a separate implementation and is not a reproduced surface here.

Keep initial loading, zero/missing accounts, incomplete/invalid numbers, negative/zero, pending mutation and denied-write behavior honest. Preserve normal two-decimal input, selected ledger currency, date and account selections. No schema or backend mutation change is established as necessary. Submission, server persistence/rejection, camera input, Android, physical devices and patched behavior remain unverified.

## Definition of done

- [ ] On iPhone17e the exact reproduced1.005MUSD draft shows automatic−1.005MUSD, a mathematically correct zero remainder, and a payload retaining both values.
- [ ] The1.25 control still works;0.004, negative values, mixed decimal scales and three-or-more-posting sums retain exact values.
- [ ] Editing, sign/auto toggles, adding/removing postings and valid route prefill preserve the same amounts. Invalid/incomplete/unsafe values cannot produce a submission or a misleading green balance state.
- [ ] An isolated mocked-mutation or explicitly authorized disposable-ledger test verifies the exact submission boundary; no production-write permission is inferred from this report.
- [ ] Mobile format, lint, typecheck and unit checks pass, and fresh native draft evidence confirms the repaired behavior. Complete the standing closing tasks before moving to done.

## Dedupe and evidence

All open/done queues searched for parseCents, amountCents, multi-posting precision, rounding/input and split terminology; open milestone titles scanned. w3/109 affects read-only headline formatting and has a different helper; w3/116 and done/m26 are dashboard formatting. w1/done/m2 concerns ledger-scoped currency selection, which passes here. w4/done/m7 is accessibility. No matching amount-entry arithmetic task found. git log -S identifies9c240d2e as introduction;3ae25ee9 later adds receipt prefill using the same parser. No current-main repair exists.

Verified ignored evidence under `mobile/tmp/qa-2026-09-11/`: minimax-add-form-initial.jpg; minimax-precise-draft.jpg; minimax-precise-fresh-home.jpg; minimax-precise-repeat.jpg; minimax-cents-fresh-control.jpg; minimax-add-draft-exit.jpg; minimax-precise-draft-type.log; minimax-precise-repeat-type.log; minimax-cents-fresh-control-type.log; minimax-precise-payload-probe.json; minimax-precise-js-errors.json (empty bounded capture); minimax-entry-context-api.json; minimax-access.json. Native typing helper verified the exact target field and resulting value. An earlier replacement-typing control failed its helper assertion and is excluded; the fresh blank control above passed.

## Source + Goal linkage

- **Source:** continuous qa-find-bugs-mobile for w3, September11 native draft reproduction and local serializer probe.
- **Goal linkage:** A2 — Frictionless onboarding: a newcomer can enter an exact transaction amount without silent loss of precision.
- **Expected outcome:** supported decimal input matches the counterposting and submitted amount on the default mobile add flow.
- **Why now:** the current default flow enables submission of an amount different from the user's visible input. Correcting its value model and UI together is more than a sub-hour formatting patch.
- **Adoption surface:** included because this changes the default user-facing entry flow; document meaningful limits and verify discovery without expanding scope to dormant flows.

## Additional native parsing evidence — comma input

September 11, same environment, initial PID68731 and fresh PID71776: actual Transactions -> plus -> guarded native text entry of `1,25` in the first amount. The field retains `1,25`, the automatic second posting shows `−1.00`, remainder is green zero, and Done is enabled. The simulator's visible decimal key is a dot; this was XCTest text entry, not proof of a comma-locale software keyboard or paste-menu journey. Both drafts were discarded through Back; Done was never pressed.

The unmodified local parser/serializer returns validation null and postings `1.00 MUSD` / `-1.00 MUSD` for `1,25`, versus `1.25 MUSD` / `-1.25 MUSD` for the ordinary dot control. This is a local payload probe, not submitted/persisted data. `parseFloat` at postings-utils.ts:17 accepts a numeric prefix instead of validating the whole input; changing only Math.round would leave this failure. This extends the existing invalid-input scope of t001/t002/t005 rather than creating a duplicate milestone.

Acceptance refinement: validate the full supported numeric grammar. If comma decimals are supported, normalize `1,25` explicitly to exact1.25; otherwise show a clear invalid-number state and block submission. Never silently accept only the prefix1, and do not indiscriminately remove separators, which could change a decimal into125. Preserve dot-decimal1.25 and the required exact1.005 control. Add this actual native case to model and rendered validation regressions. Comma-locale keyboards, grouping rules, pasted numeric text, Android and persisted mutation outcomes remain unverified.

Verified ignored evidence in mobile/tmp/qa-2026-09-11/: posting-comma-initial.jpg, posting-comma-fresh-home.jpg, posting-comma-repeat.jpg, posting-comma-type.log, posting-comma-repeat-type.log, posting-comma-payload-probe.json, posting-comma-js-errors.json. Bounded JS error capture empty. No product fix or shipping.
