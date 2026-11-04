# Annotation correction packet for the existing OpenAI application

This packet belongs to the original application. It records the submitted
remediation text; the [accepted resubmission record](resubmission-receipt-20261104.json)
contains the actual In review readback. Approval and publication remain pending.

## Proposed reviewer note

We audited every one of the 44 exposed tools against its actual implementation.
Every tool explicitly supplies boolean `readOnlyHint`, `destructiveHint`,
`openWorldHint` and `idempotentHint` values; none is null or omitted.

We corrected four previously understated destructive effects:

- `renameLedgerFile` removes the original path and can rewrite existing includes.
- `insertReceiptTransaction` deletes the caller-owned temporary upload after
  promoting it and appending the transaction.
- `syncBankTransactions` can replace and remove existing staged bank rows.
- `setLedgerStar` removes an existing personal relationship when `starred` is false.

We also classified every tool's target boundary. Tools that can operate on public
ledgers/repositories advertise an open world. Nine operations limited to the
current account, private bank staging, caller-bound uploads or pure setup preview
retain a closed-world annotation. Configured external AI, bank and price-feed
processing is covered explicitly. Authorization and ledger selection still apply
on every call; these hints grant no permission.

A write-capable tool remains non-read-only even when it also supports `dry_run`.
The AI parsers remain non-read-only because they consume persisted AI quota.

The [complete per-tool matrix](tool-annotations.json) supplies the four exact
booleans and a separate behavior-based justification for each of them on all
44 tools. The matrix is checked against raw `tools/list`, and the corrected
removal behavior has regression coverage. Full backend validation passes
412 suites and 7,830 tests.

## Dashboard execution checklist

1. Open the [original application](https://platform.openai.com/plugins/manage/plugin_asdk_app_6ad4537f69288191816f3fc04b1ac11a)
   in its original submitting organization.
2. Confirm the live deployment evidence, then use the supported rescan action.
3. Compare the dashboard's scanned definitions with the complete matrix; enter
   the requested explanations in the actual fields the dashboard provides.
4. Submit the same application once and retain the accepted receipt/status/time.

Source validation and hosted wire verification do not establish that the
platform's stored snapshot has changed. Task w6/m11/t010 retains those actions;
t001 retains the later review, public listing and native accounting gate.


## Prepared in the actual portal — 2026-11-03 UTC

The latest successful portal scan has no findings; all 44 stored tool definitions
and 176 explicit boolean hints match the complete matrix. All 176 individual
English explanations are saved in the private reviewer instructions after the
original sign-in steps, and persistence was verified by reopening that form.
A separate 1,833-character Additional Submission Context explains the correction
and where the complete justifications are stored. Existing reviewer credentials
and test cases are retained. The final legal/compliance confirmation is pending;
preparation does not establish an accepted resubmission.

## Accepted resubmission — 2026-11-04 UTC

After the publisher explicitly confirmed the final submission/declarations, the
worker clicked Submit once on the same 1.0.0 application. Both the plugins list
and original version detail report **In review**, with **Not published** retained.
[Actual receipt/status/time](resubmission-receipt-20261104.json) closes t010;
t001 owns review feedback, eventual public listing and native synthetic acceptance.
No further publisher action is needed now. The stale Nov1 portal estimate is not
a new completion commitment; next manual check is on/after 2026-11-09 UTC or upon
actual feedback/decision earlier.
