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

- 2026-11-18 `mobile/.../date-format.test.ts` "formats thousands of dates quickly" (<300ms) — inner op measures 9–58ms; 20/20 green, margin too wide to call a flake.
- 2026-11-18 `mobile/.../select-trial-balance.test.ts` min-of-5 build timing — already hardened (min across repeats); 20/20 green.
- 2026-11-18 `mobile/.../authorization-launcher.test.ts` 20ms browser-open gate — correct path settles in microtasks; 30/30 green, not reproducible as a flake.
- 2026-11-18 `mobile/.../default-options.test.ts`, `today-watcher.test.ts`, `bounded-discovery.test.ts` — 50ms settles / wall-clock bounds with wide margins; 20/20 green each.
- 2026-11-18 dashboard `ledger-group-flyout`, `diff-viewer`, `react-native-bridge`, `prefetch`, `use-write-outcome-cache`, `locale-preload-recovery` timing tests — 10/10 green each in isolation.
- 2026-11-18 `ledger/.../pad-recheck.test.ts` + `balance-error-dates.test.ts` (<1000ms perf asserts) — inner ops measure 19–45ms; full ledger unit gate green (223 suites / 3466 tests).
- 2026-11-18 `ledger/.../lock.test.ts`, `healthz.test.ts`, `managed-price-feed.test.ts` — fake timers with restore, or no competing timing path; green.
- 2026-11-18 `backend-v2/.../cardinality-control.test.ts` 0.45–0.55 sampling band — ±10σ at n=10000, never fires in practice.

## rt-logic-bugfixer

### Deferred

- 2026-11-17 `dashboard/src/common/lib/editor/monaco-beancount-language.ts` vs `monaco-beancount-language-vscode.ts` — both register the global `beancount` language and themes, so the last editor opened re-highlights the others; keep the `-vscode` module only.

### Skipped

- 2026-11-17 `dashboard/src/features/ledger-data/holdings/utils.ts:71` `tableToCSV` — FIXED: now serializes through shared `rowsToCSV({ quoteAll: true })`; `-33.71 USD` leaves neutralized, signed plain numbers stay numeric; `holdings-amount-direction.test.tsx` expectation updated.

## rt-logic-simplifier

### Deferred

### Skipped

## rt-shipped-feature-inliner

### Deferred

### Skipped

## rt-useless-test-pruner

### Deferred

### Skipped
