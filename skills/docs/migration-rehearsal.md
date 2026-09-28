# Installed migration rehearsal

This record covers real agent sessions on synthetic local ledgers that follow
the [migration guide](migration.md). It is separate from the deterministic
verifier and import tests; no hosted ledger or real financial data was used.

## Environment and reproduction

- Run date: 2026-09-28. Platform: macOS 26.5.1, arm64.
- Source baseline: `8b9c6207`, plus the guide's `BEA_CONFIG_DIR` setup line,
  which shipped in `5604ad54` (see below).
- CLI: `bea` from this repository's `cli/` at that baseline (it reports
  `0.3.0`). It includes the migrated-history matching from w5/020, which the
  published `beancount-io==0.3.0` lacks. This is a source build, not the
  published newcomer install.
- Each branch ran in its own run directory using the guide's setup block, the
  customer installer, and a synthetic Git repository.
- Prompts were the guide's blocks, sent verbatim, one headless call per block
  (see the [first-month record](first-month-rehearsal.md#headless-client-invocation)
  for the invocation). Each response was reviewed before the next prompt. The
  conflict branch's init prompt named `balances-conflicting.md`, as the guide
  instructs.
- Required confirmations are part of the guide and are not interventions;
  extra corrective instructions are. Times are wall-clock from the first prompt
  to the last checkpoint, including verifier commands and operator review.

## Results

| Checkpoint | Claude Code | Codex |
| --- | --- | --- |
| initialized | PASS | PASS |
| declined_conversion | PASS | PASS |
| migrated | PASS | PASS |
| checking_overlap | PASS | PASS |
| savings_overlap | PASS | PASS |
| imported_new | PASS | PASS |
| reimported_new | PASS | PASS |
| conflicting_balance | PASS + transcript reviewed | PASS + transcript reviewed |
| Main journey | 7m 35s, 12 calls | 7m 41s, 12 calls |
| Conflict branch | 2m 14s, 5 calls | 3m 09s, 5 calls |
| Corrective interventions | 0 | 0 |

Clients: Claude Code `2.1.283` with `claude-opus-5-5`, and Codex CLI `0.157.1`
with its default model. User config was ignored, and the event stream did not
report the model name. Codex ran with `--sandbox workspace-write`, with the
inputs directory and the run's `BEA_CONFIG_DIR` added as writable directories.
It received no sandbox bypass or model override.

Both clients behaved the same way on every branch:

- The mapping review computed all five `monarch:sha256:` IDs exactly as the
  fixture expects. It put the savings transfer row's ID in `import-id-2`,
  reported `5 = 3 + 2 × 1 + 0`, and labelled checking's opening independent and
  savings' derived. It stated that the savings assertion only confirms the
  derivation.
- Both overlap imports previewed 2 duplicates and 0 new rows. The savings
  transfer row matched through `import-id-2`. The client wrote nothing,
  including no rules file or config block.
- The April import proposed exactly the new 2026-04-03 −61.10 purchase with
  `csv:sha256:765112df24194e91`, categorized from the migrated Trader Joes
  entry. The approved write also persisted a rules file and a config block.
  Re-importing wrote nothing.
- The conflict branch wrote the history and the savings assertion, left
  checking unasserted, and reported a **+10.00 USD** residual (statement minus
  ledger). It added no pad, residual, or adjustment.

The transcripts differed only in presentation. Claude proposed a broader
Trader Joes rule; Codex proposed an exact-description rule. In the main runs,
Claude's merged transfer used the outflow description as its narration, and
Codex's joined both descriptions. The verifier ignores payee and narration text.

## Guide correction from these runs

During the April preview, Claude reported that `bea import` saves remembered
CSV mappings in bea's configuration directory, even on previews. That is
outside the workspace and so outside the verifier's snapshot. The main run
wrote this mapping cache to the operator's default bea configuration. The guide
now exports `BEA_CONFIG_DIR="$RUN/bea-config"` so each run keeps that state to
itself. Claude's conflict branch and both Codex branches used this setup. The
change touches no agent instruction, and no ledger was repaired.

## Limits

These are supervised rehearsals, one run per client and branch, on macOS,
using a source-built `bea`. They are not a reliability benchmark or an adoption
measure, and they do not show that the published 0.3.0 install works: it does
not match migrated IDs. Mint and QuickBooks exports, populated-ledger merges,
investment lots, and Linux or Windows were not exercised.
