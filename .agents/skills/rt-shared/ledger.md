# rt-* ledger

Findings carried from one routine run to the next. The rules are in
[`contract.md`](contract.md#ledger): read your section before discovering,
finish a Deferred entry before hunting new ones, and write what you hand to
another routine under that routine's heading.

Format: `- YYYY-MM-DD <path or symbol> — <finding>; <why deferred or skipped>`,
newest first.

## rt-abstraction-improver

### Deferred

### Skipped

## rt-abstraction-police

### Deferred

### Skipped

## rt-dead-code-removal

### Deferred

### Skipped

## rt-dup-unifier

### Deferred

- 2026-11-17 `cli/src/bea_engine/*` vs `cli/src/cli/*` (`csv_mapper`, `include_glob`, `amounts`, `display_width`, `ledger/text`) — mirrored on purpose across the ADR014 engine boundary and cannot be merged; they can still drift, so compare each pair and fix any difference that is not deliberate.

### Skipped

- 2026-11-17 mobile `ledger-guard.tsx` settings button ×3 — `settings-entry.test.ts` asserts the source appears three times.
- 2026-11-17 dashboard `use-local-storage-state.ts` vs `use-session-storage-state.ts` — merging needs a storage parameter plus a cross-tab-sync mode flag, more complex than the copies.

## rt-flaky-test-fixer

### Deferred

### Skipped

## rt-logic-bugfixer

### Deferred

- 2026-11-17 `dashboard/src/features/ledger-data/holdings/utils.ts:71` `tableToCSV` — writes cells without the shared `rowsToCSV` formula neutralization (CWE-1236), so `-33.71 USD` opens as a formula; route it through `rowsToCSV({ quoteAll: true })` and update `holdings-amount-direction.test.tsx`.
- 2026-11-17 `dashboard/src/common/lib/editor/monaco-beancount-language.ts` vs `monaco-beancount-language-vscode.ts` — both register the global `beancount` language and themes, so the last editor opened re-highlights the others; keep the `-vscode` module only.

### Skipped

## rt-logic-simplifier

### Deferred

### Skipped

## rt-shipped-feature-inliner

### Deferred

### Skipped

## rt-useless-test-pruner

### Deferred

### Skipped
