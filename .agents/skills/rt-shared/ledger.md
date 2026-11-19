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

- 2026-11-19 ledger `RequestScopedGiteaClientFactory`/`IGiteaClientFactory` (`foundation/clients/gitea-client-factory.ts`) — one-product factory shape, but ~30 test files stub `getPublicApiClient` (one pins its args) and `scripts/verify-rustledger.ts` monkey-patches it; seam is load-bearing for tests, blast radius ~40 files.
- 2026-11-19 ledger `ILedgerGeneratedFileWriter`/`ILedgerEntryWriter` (zero refs outside their defining service files) — live narrow contracts in the backend-v2 donor (workflows consume both, `composition/layers.ts` wires both); ledger copies are transplant fidelity, removing them diverges the transplant for no behavioral gain.

## rt-abstraction-police

### Deferred

### Skipped

## rt-dead-code-removal

### Deferred

- 2026-11-19 ledger `getUserApiClient` on `IGiteaClientFactory`/`RequestScopedGiteaClientFactory` (`backend-cluster/ledger/src/foundation/clients/gitea-client-factory.ts`) — zero callers in ledger (every service uses `getPublicApiClient`), but the method is live in the backend-v2 donor (`ledger-workflow.ts` ×4); decide transplant fidelity vs removal.
- 2026-11-18 cli/ full `make deadcode` vulture scan — unrunnable where only Python 3.11 exists (requires-python >=3.12; interpreter download blocked); ruff F401/F841 plus `if False`/commented-def sweeps clean, rerun vulture where Python 3.12+ exists.

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

- 2026-11-19 `dashboard/src/features/bql/pages/__tests__/index.test.tsx` "editor focus when Monaco finishes loading (w4/974) > leaves focus where the reader already moved it" — failed once on main (`CI (dashboard)` run 44468016285 on `ee5307632`, the Run button lost focus after the URL query auto-ran) and passed on the next three main runs with no change to the page; found by triage from Actions history, which this sandbox cannot read.

### Skipped

- 2026-11-19 mobile 19 timer-adjacent suites (`token-manager`, `foreground-refresh`, `invalidate-persistence`, `ledger-write`, `entry-write`, `use-single-entry-write`, `write-during-refresh`, `map-in-batches`, `second-link`, `authorization-completion`, `chart-accessibility`, `invalidate-ledger`, `root-field-selections`, `unsaved-edits-link`, `settle-within`, `user-avatar`, `editor-recovery`, `retry-reuses-upload`, `receipt-cancel`) — 20/20 green each in isolation (incl. under full-suite load); full `test:unit` gate green twice (5227 passed, 1 skipped).
- 2026-11-19 dashboard `ledger-collection.test.tsx` — 400ms sleeps settle a 250ms debounce; 10/10 green; assertions hold even if the debounce lands late.
- 2026-11-19 dashboard `gallery-url-search.test.tsx` — 350ms sleeps settle a 300ms debounce behind a minimum-length gate; short queries never fetch by construction, not by timing.
- 2026-11-19 ledger `entries-concurrent-write.test.ts` — sequential mocked-HTTP assertions, no timing; 10/10 green; `--detectOpenHandles` clean.
- 2026-11-19 cli pty/signal suites (`test_query_shell_hangup`, `test_native_interrupt_is_silent`) — unrunnable in this sandbox (requires-python >=3.12; system has 3.11, no uv, interpreter download blocked); not examined.
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

- 2026-11-17 `dashboard/src/common/lib/editor/monaco-beancount-language.ts` vs `monaco-beancount-language-vscode.ts` — both register the global `beancount` language and themes, so the last editor opened re-highlights the others; keep the `-vscode` module only.

### Skipped

- 2026-11-19 backend-cluster/ledger `discrepancyKey` spelling agreement (parsed balance `amount` vs engine `balances.amount` cell) — live-engine probes agree on every spelling (trailing/leading zeros, exponents, signs); both sides share one producer; examined, no divergence.
- 2026-11-19 backend-cluster/ledger balances subquery/CTE/UNION/quoted-alias/OVER-window shapes — the engine refuses each with its own error, never a silent NULL; examined, no divergence.
- 2026-11-19 dashboard importer duplicate/amount agreement (`import-duplicates.ts` decimalKey vs `csv-validator.ts` exactDecimalValueKey vs journal postings) — both sides normalize to exact decimal value, one-for-one consumption pinned by tests; examined, no divergence.
- 2026-11-19 mobile `account-close-dates.ts` (open/close/list/seed/name-key predicates) — read against its tests and callers (`use-account-close-dates`, budget card); boundary semantics agree with the documented w21 intents; examined, no divergence.
- 2026-11-18 w5/1173 reports `ConversionSelect`/`use-report-conversion.ts` — FIXED: selector offers every operating currency and the hook validates against the full list; `ConversionOption` widened past the hard-coded `"USD"`.
- 2026-11-18 w5/1130 BQL `use-query-history.ts` — FIXED: history keyed per signed-in user id (`beancount-query-history.<id>`), signed-out visitors get `beancount-query-history:signed-out`, the unscoped legacy bucket is dropped on mount, and logout removes every stored history; BQL page passes `userProfile?.id`.
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

- 2026-11-19 dashboard `conversion-select.test.tsx` "should use default USD currency when not specified" — near-duplicate of the "renders with USD value" twin above it (both render value="USD" and assert the Converted-to-USD label); corrupting the label turns both red, so the proof rule keeps them.
- 2026-11-19 mock-API self-assertion shape (`expect(vi.mocked|vi|jest).toBeDefined()`) repo-wide (mobile/dashboard/ledger/backend-v2/skills) — zero hits; the 2026-11-18 dashboard instances stay pruned.
- 2026-11-19 brace-aware expect-free `it` sweep (dashboard/mobile/backend-cluster/ledger, 577 files) — every flag was a `throw`-assertion mobile test or a parser miss on `test(`/multi-line bodies; sampled the flags, all real.
- 2026-11-19 cli AST assert-free-function sweep — hits assert via `_refuse_*`/`run_doc`/raising-validator helpers as in the 2026-11-18 sweep; no new shape.
- 2026-11-18 duplicate neighboring `it` bodies repo-wide (dup-body sweep, ~30 files incl. star/unstar init-loading twins, ssh-keys twins, encode twins) — twins go red under sabotage, so the skill's proof rule keeps them; no vacuous twin found.
- 2026-11-18 cli/tests assertion-less-per-function sweep (~40 hits) — every hit asserts via local `_assert_*`/`_refuse_*`/`run_doc`/`_applies`/`_replays` helpers or raising validators; sampled 8 files, all real.
- 2026-11-18 `expect(vi.mocked(...))` with-args call assertions (reconciliation-page, write-outcome, create-file-pending) — real wiring pins, not the bare-`vi.mocked` shape; left in place.
- 2026-11-18 mobile `toast-provider/__tests__/index.test.ts` — a prior run already pruned its tautologies; remaining asserts pin `toast-queue` behavior.
- 2026-11-18 static sweeps with zero hits repo-wide (mobile/dashboard/ledger/cli): assertion-free `it` bodies, weak-matcher-only files, literal tautologies, empty bodies, tests mocking their own unit.
