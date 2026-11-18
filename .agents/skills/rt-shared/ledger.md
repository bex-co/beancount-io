# rt-\* ledger

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

- 2026-11-18 cli `bea_engine`/`cli` mirror pairs (`amounts`, `csv_mapper`, `paths`, `display_width`, `include_glob`, `ledger/text`, `protocol`/`query`/`write` vs `output`, `write` vs `launch`/`provision`, `managed_price_cache` vs `update`) — Deferred comparison done: identical or deliberately adapted (engine handles ENAMETOOLONG at point of use; descriptor/long-name helpers are frontend-only; convention vote lives only in the engine extraction copy); no non-deliberate drift.
- 2026-11-18 cli `list.py` `_account/_currency/_type/_plain_command` factories — differ by one filter option each; parameterizing needs config objects, more complex than the copies.
- 2026-11-18 cli `report.py` per-command bodies — Typer command definitions differing per report; shared parts already factored (`_ask`/`_emit_json`/`_csv_output`).
- 2026-11-18 cli `add.py` balance/price `_write` blocks — differ in request name and post-handling; unification needs mode flags.
- 2026-11-18 cli `cloud/ledger/app.py` vs `init.py` `--module`/`--property-name` options — shared option spelling, but help-text drift is cosmetic, below the value bar.
- 2026-11-18 cli `provision.py` vs `utils.py` lock tails — different locks (provision timeout/announce vs simple exclusive); shared unlock tail is six stable lines.
- 2026-11-18 cli `agent_guidance.py` templates — template text overlap, not logic.
- 2026-11-18 `bea_engine/query.py` `GuardedShell` vs `PreciseShell` — deliberately different shells; shared one-liners already delegate to module helpers.
- 2026-11-18 `bea_engine/reader.py` `list_*` functions and `updating.py`/`main.py`/`managed_load.py`/`models.py`/`report.py` small pairs — same-signature skeletons or option declarations; parameterizing needs dispatch/mode abstractions.
- 2026-11-17 mobile `ledger-guard.tsx` settings button ×3 — `settings-entry.test.ts` asserts the source appears three times.
- 2026-11-17 dashboard `use-local-storage-state.ts` vs `use-session-storage-state.ts` — merging needs a storage parameter plus a cross-tab-sync mode flag, more complex than the copies.

## rt-flaky-test-fixer

### Deferred

### Skipped

- 2026-11-18 `dashboard/.../react-echarts` dir siblings (`client-lifecycle`, `client-legend-state`, `runtime`, `chart-empty`, `lazy-chart-error`) — 20/20 green in-suite on the fix commit; no flake, nothing to change.

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

- 2026-11-18 w5/1173 reports `ConversionSelect`/`use-report-conversion.ts` — selector offers only the first operating currency; expose the full list and accept any of them (backend already converts); out of this run's budget.
- 2026-11-18 w5/1130 `beancount-query-history` key is per-browser not per-user — sign-out leaks one user's queries to the next visitor; scope the key per user when fixing (kept global here so this run's merge behavior carries over).
- 2026-11-17 `dashboard/src/common/lib/editor/monaco-beancount-language.ts` vs `monaco-beancount-language-vscode.ts` — both register the global `beancount` language and themes, so the last editor opened re-highlights the others; keep the `-vscode` module only.

### Skipped

- 2026-11-18 `mobile/src/common/map-in-batches.ts` `size <= 0` infinite loop — sole caller passes a positive `BUDGET_PANEL_BATCH`; unreachable, defensive-only, below the bar.
- 2026-11-18 `mobile/src/common/{account-frecency,balance-display,balance-util,ledger-conflict,ledger-owner-rename}.ts` — bucket boundaries, units/money selection, `resolveCurrencyBalance` EUR-ledger pin (w21/058), conflict whole-word match (w21/387), owner-prefix rewrite all match their documented intent; examined, no divergence.
- 2026-11-18 `mobile/src/common/suggestion-utils.ts` deriveTwoPostingSuggestions oldest-direction tie-break — journal is newest-first (ledger-journal-service), so w21/833's purchase-wins-tie holds; examined, no divergence.
- 2026-11-18 `mobile/src/common/account-search.ts` fuzzyMatch cubic exact-substring bonus — per-length bound holds (exact min `l^3+4l` beats scattered max); examined, no divergence.
- 2026-11-18 `mobile/src/common/merchant-key.ts` — mobile-only, no dashboard twin; fold/trim/NFC/quote/whitespace/lowercase order sound; examined, no divergence.
- 2026-11-18 `dashboard/.../holdings/utils.ts` roundDecimalString + `export/model.ts` invertDecimal/sumBalanceRecords — zero paths, half-up rounding and exact-decimal sums agree; examined, no divergence.
- 2026-11-18 `dashboard/.../cash-flow/lib/model.ts` weight/inference keying + withinBalancingTolerance — matches beancount 3.2.3 `infer_tolerances`/`is_small` semantics; examined, no divergence.
- 2026-11-18 `mobile/src/common/series-util.ts` carryBalanceToToday/latestBalance/baseline agreement — agree by construction (value remap, borrowed-point baseline); duplicate-date input unreachable via pointsToMonthlySeries; examined, no divergence.
- 2026-11-18 `mobile/src/common/decimal-number.ts` vs `dashboard/src/common/lib/beancount/decimal-number.ts` — 138-case differential fuzz plus 60-input parser crash-fuzz agree with zero divergence; out-of-contract inputs (non-decimal strings, zero denominators, negative digits) throw identically on both sides and no caller passes them.
- 2026-11-18 mobile vs dashboard budget twins (`daysInBudgetPeriod`, week-start, unknown-cadence default, newest-signed-entry direction) — both Monday-start weeks, monthly default, DST-safe day counts, zero-sign normalized away by `parseDecimal`; agree on every probed edge.
- 2026-11-18 `mobile/src/common/entry-write.ts` nonce/fingerprint retry machine + `single-flight.ts` + `use-single-entry-write.ts` unification — retries rebuild identical variables so the requestId is stable, the nonce renews after every save, same-screen double taps collapse to one write; no divergence from the pre-unification hooks.
- 2026-11-18 `mobile/.../select-account-journal.ts` paging (`mergeAccountJournalItems`, `hasMoreAccountJournal`) and dashboard `formatPercentageCell` number path — covered by existing tests; the query returns decimal strings so the number path is defensive-only.

- 2026-11-18 mobile `detect-recurrence.ts` — 60k-case fuzz over cadences/jitter/refunds/zeros/pre-entered points plus 23 exact next-date oracles all hold; no divergence from documented intent found.
- 2026-11-18 `cli/src/bea_engine/csv_mapper.py` vs `cli/csv_mapper.py` mirror — `_DATE_FORMATS`, `detect_delimiter`, `read_header`, `parse_delimiter/encoding`, pending-status pin all agree; `_strptime` strictness unreachable via built-in formats; `open_records` surplus refusal is extraction-only by design (preview comes from the engine); engine `infer_mapping` `_spec_column` drift is dead code with no callers.
- 2026-11-17 `dashboard/src/features/ledger-data/holdings/utils.ts:71` `tableToCSV` — FIXED: now serializes through shared `rowsToCSV({ quoteAll: true })`; `-33.71 USD` leaves neutralized, signed plain numbers stay numeric; `holdings-amount-direction.test.tsx` expectation updated.

## rt-logic-simplifier

### Deferred

### Skipped

- 2026-11-18 mobile `resolve-app-link.ts` — switch dispatch over ledger paths, flat with early returns; churn is new-route fixes, not convolution.
- 2026-11-18 mobile `account-search.ts` (`fuzzyMatch`, `filterAccounts`) — scoring is factored with the cubic-exact proof in comments; no interleaving to split.
- 2026-11-18 mobile `number-utils.ts` / `valuation.ts` (`selectValuation`) — long but already split into named helpers by prior runs; remaining length is domain breadth, not nesting.

## rt-shipped-feature-inliner

### Deferred

### Skipped

## rt-useless-test-pruner

### Deferred

### Skipped

- 2026-11-18 duplicate neighboring `it` bodies repo-wide (dup-body sweep, ~30 files incl. star/unstar init-loading twins, ssh-keys twins, encode twins) — twins go red under sabotage, so the skill's proof rule keeps them; no vacuous twin found.
- 2026-11-18 cli/tests assertion-less-per-function sweep (~40 hits) — every hit asserts via local `_assert_*`/`_refuse_*`/`run_doc`/`_applies`/`_replays` helpers or raising validators; sampled 8 files, all real.
- 2026-11-18 `expect(vi.mocked(...))` with-args call assertions (reconciliation-page, write-outcome, create-file-pending) — real wiring pins, not the bare-`vi.mocked` shape; left in place.
- 2026-11-18 mobile `toast-provider/__tests__/index.test.ts` — a prior run already pruned its tautologies; remaining asserts pin `toast-queue` behavior.
- 2026-11-18 static sweeps with zero hits repo-wide (mobile/dashboard/ledger/cli): assertion-free `it` bodies, weak-matcher-only files, literal tautologies, empty bodies, tests mocking their own unit.
