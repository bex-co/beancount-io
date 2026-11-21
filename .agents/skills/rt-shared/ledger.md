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

- 2026-11-19 backend-v2 expired TEMPORARY `__Host-authSess` retirement shim (`src/server/middleware/orphaned-host-cookie-middleware.ts`, mounted in `src/server/start-server.ts:114-127`, test in `src/server/middleware/__tests__/orphaned-host-cookie-middleware.test.ts`) — marked safe-to-delete after 2026-10-21; confirm no stranded-window tokens remain, then delete shim + mount + test. 2026-11-20 re-check: still mounted and reachable on every production request (not dead code); default JWT lifetime is 365 days (`config.ts:527`), so stranded tokens may still be valid — the repo alone cannot prove the window is empty.
- 2026-11-19 ledger `getUserApiClient` on `IGiteaClientFactory`/`RequestScopedGiteaClientFactory` (`backend-cluster/ledger/src/foundation/clients/gitea-client-factory.ts`) — zero callers in ledger (every service uses `getPublicApiClient`), but the method is live in the backend-v2 donor (`ledger-workflow.ts` ×4, `commits-service.ts` ×2 per 2026-11-20 re-check); decide transplant fidelity vs removal.

### Skipped

- 2026-11-20 cli vulture min-confidence-100 on Python 3.12.16 — clean over `src/cli`, `src/bea_engine`, `src/fava` (parses the three PEP-695 files vulture skipped on 3.11); ruff F401/F841 clean tree-wide; closes the 2026-11-18 Deferred vulture entry.
- 2026-11-20 vulture min-confidence-100 over `skills/` and the root support scripts (`check-agent-guidance`, `ci-check`, `check-bex-blueprint`, `scan-secrets`) — clean; single-file scan of `scripts/skills/test_beancount_skills.py` flags the `pattern` arg of the `load_tests` protocol hook, but the whole-dir scan is clean and unittest requires the 3-arg signature; false positive.
- 2026-11-20 marker sweeps with zero hits — `if False`/`while False` (`cli/src`), `if (false)` (`dashboard`/`mobile`/`backend-v2`/`ledger`/`agent-box` src), commented-out `def`/`class`/`import`/`export`, "no longer used/dead code" markers.
- 2026-11-19 knip-clean with installed deps (mobile incl. production knip + graphql-operations-check, dashboard, ledger, backend-v2) — zero hits; cli ruff F401/F841 clean tree-wide and vulture min-confidence-100 clean on every file it can parse.
- 2026-11-19 cli `ask/agent.py`, `api/client.py`, `bea_engine/importing.py` (vulture-unparseable on 3.11, PEP 695 syntax) — manual occurrence sweep: every top-level symbol has exactly one use; nothing dead.
- 2026-11-19 `scripts/skills/test_beancount_skills.py` (vulture-unparseable f-string) — single-occurrence names are all `Test*` classes found by unittest discovery plus the `load_tests` protocol hook; nothing dead.
- 2026-11-19 vulture `setUpClass(cls)` unused-variable hits (8× in `scripts/skills/test_verify_*.py`) — `cls` is signature-required for the unittest classmethod override; false positives, left in place.
- 2026-11-19 agent-box `vitest.setup.ts` knip hit with no node_modules — referenced by `vitest.config.ts` `setupFiles`; detector-environment artifact, no ignore added.

## rt-dup-unifier

### Deferred

- 2026-11-20 unguarded engine/frontend twin patterns (`regex_reads_otherwise`, `_DESCRIPTOR`, `same_file`/`not_a_load_cache`/`expand_path`, `include_glob`) — agree today but no test compares the two copies; add a drift guard for each pair (a guard-only commit is a finding, per "Guard every twin"), take next run.

### Skipped

- 2026-11-20 `cli/src/bea_engine/*` vs `cli/src/cli/*` twin re-compare — every pair agrees or is deliberately adapted, no non-deliberate drift: `amounts` shared patterns identical (`_ZERO_DIVISOR`, `_NOT_ARITHMETIC`, `JSON_FLOAT_MARKER`); `display_width`/`pad` identical; `include_glob` identical; `csv_mapper` deliberately split (engine extraction vs frontend inference); `paths` `_DESCRIPTOR` identical, `expand_path` identical, `descriptor_number`/`held_descriptor`/`refuse_too_long_name` frontend-only by design; `ledger/text` `fold_account`/`regex_reads_otherwise` logic identical, `single_line` identical modulo the frontend's shared `_escape_controls` alias, `decode_error_message` identical modulo the `UTF8_BOM` import source; `write`/`query` vs `output` `CACHE_ENV`/`not_a_load_cache`/`same_file` identical, `refuse_cache_over_ledger` deliberately adapted to each side's members source. Closes the 2026-11-17 Deferred comparison.
- 2026-11-19 mobile `filterLedgers` (`components/ledger-drawer/drawer-ledgers.ts` generic vs `screens/ledger-selection/discovery-store.ts`) — identical 3-line wrappers over the shared `ledgerMatchesQuery`; unifying saves nothing and would drag drawer imports into the discovery screen; below the value bar.
- 2026-11-19 dashboard `toIntervalEnum` (`features/ledger-data/budget/budget-chart-card.tsx` vs `budget-history-table.tsx`) — 4 identical lines, `Object.values`-driven so no missed-edit hazard; below the value bar.
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

- 2026-11-20 dashboard budget focus suites (`budget-update-focus` 20/20, `budget-search-focus` 20/20) plus `ledger-group-flyout` 10/10 on the post-aac0a0086 version, `create-file-stay-focus` 10/10 (20ms settle sleep holds), and BQL `bql/pages/index` 10/10 (c0b711467 auto-run-settle fix holds); no flake, nothing to change.
- 2026-11-20 cli `test_query_shell_hangup.py` (12 tests) 10/10 green; now runnable (python3.12 + uv present), supersedes the unrunnable half of the 2026-11-19 cli pty/signal entry — the interrupt-contract half fails deterministically for an environmental reason, handed to `rt-logic-bugfixer` as Deferred.
- 2026-11-19 mobile 19 timer-adjacent suites (`token-manager`, `foreground-refresh`, `invalidate-persistence`, `ledger-write`, `entry-write`, `use-single-entry-write`, `write-during-refresh`, `map-in-batches`, `second-link`, `authorization-completion`, `chart-accessibility`, `invalidate-ledger`, `root-field-selections`, `unsaved-edits-link`, `settle-within`, `user-avatar`, `editor-recovery`, `retry-reuses-upload`, `receipt-cancel`) — 20/20 green each in isolation (incl. under full-suite load); full `test:unit` gate green twice (5227 passed, 1 skipped).
- 2026-11-19 dashboard `ledger-collection.test.tsx` — 400ms sleeps settle a 250ms debounce; 10/10 green; assertions hold even if the debounce lands late.
- 2026-11-19 dashboard `gallery-url-search.test.tsx` — 350ms sleeps settle a 300ms debounce behind a minimum-length gate; short queries never fetch by construction, not by timing.
- 2026-11-19 ledger `entries-concurrent-write.test.ts` — sequential mocked-HTTP assertions, no timing; 10/10 green; `--detectOpenHandles` clean.
- 2026-11-19 cli pty/signal suites (`test_query_shell_hangup`, `test_native_interrupt_is_silent`) — unrunnable in this sandbox (requires-python >=3.12; system has 3.11, no uv, interpreter download blocked); not examined. 2026-11-20 update: toolchain now present, so both halves examined — hangup green 10/10 (see 2026-11-20 entry), interrupt-contract deterministically red on a libedit-readline `^C`-echo difference (see rt-logic-bugfixer Deferred).
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

- 2026-11-20 cli `test_interrupt_contract.py` (3 tests) + `test_native_interrupt_is_silent.py::test_ctrl_c_during_a_forwarded_program_exits_130_silently` (2 params) — deterministic 10/10 FAIL in this sandbox, green in CI: sandbox python is libedit-readline, so ETX during `input()` raises KeyboardInterrupt in-process with no line-discipline `^C` echo (probe: exit by SIGINT, no `^C` on screen) while `_noise()` pins the echo; the exit-130 half of the USAGE.md carve-out holds — needs an intent call on whether the echo pin is backend-specific over-pinning (w3/388, w5/273).

### Skipped

- 2026-11-21 cli zero-divisor twin agreement (`bea_engine/amounts` vs `cli/amounts` `_Expression`/`_divides_by_zero`/`_ZERO_DIVISOR`/`_NOT_ARITHMETIC`) — bodies identical; 33-spelling fuzz vs beancount 3.2.3 oracle: no missed crash; the 4 evaluator-refuses divergences (`.0`, `0_0`, `//0`) are all inputs beancount rejects or SystemErrors on, and the literal scan already refuses them — message-only, nothing valid diverges.
- 2026-11-21 mobile recurrence trio (`detect-recurrence`/`payee-series`/`resolve-recurring` + `use-payee-recurrence` wiring) — 61-probe battery (leap clamping, lapse cap, grace/lapse edges, quarter-end anchor, four-weekly guard, biweekly-with-15, semimonthly skip, refund tie, currency switch, weekend shift, resolver truth table) all agree with documented intent; no divergence.
- 2026-11-21 mobile valuation basis pair (`valueBasisOf` operating-currency read vs `selectValuation` cost-currency pricing) — agree on all reachable inputs; w21/124 + w21/426 tests pin the foreign-cost-lot behavior; module-doc intro line is loose wording, not a behavior bug.
- 2026-11-20 dashboard Overview stepped month lost on Back/reload (w5/1148) — read the item and the `use-overview-month` state-vs-URL split; persisting the month in the URL is a navigation-design change on top of the w5/1147 link fix, out of this run's budget after three shipped findings; still open.
- 2026-11-20 cli `bea_engine`/`cli` mirror pairs (`amounts` twin regexes `_ZERO_DIVISOR`/`_NOT_ARITHMETIC`/`_EXPONENT_TOKEN`/`_divides_by_zero`, `csv_mapper`/`include_glob`/`paths` splits) — twin points textually identical, remaining splits deliberate engine/frontend adaptations; examined, no drift since the 2026-11-18 sweep.
- 2026-11-20 mobile `plural.ts` builtin-vs-`Intl` rules, `decimal-number.ts` vs dashboard twin, `number-locale`/`number-utils`/`currency-util` separator/position agreement — pinned by the 0–1000 agreement battery, the 138-case differential fuzz, and the w21/882 currencyAfter match; probed promotion/residue edges hold; examined, no divergence.
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

## rt-logic-simplifier

### Deferred

### Skipped

- 2026-11-19 cli `report.py` `_cash_flow` — 241 lines but every branch pins a past w5/10xx/11xx cash-flow fix; extracting it further is single-use helpers, below the value bar.
- 2026-11-19 cli `ledger/adding.py` `_transaction` — 200 lines of sequential validation gates with early refusals, no interleaved concerns to split.
- 2026-11-19 cli `ledger/updating.py` `_transactions` preview/apply branches — shared steps already live in `_plan_rows`/`_validate_plans`/`_row_payload` helpers; the two-phase shape is deliberate, not drift.
- 2026-11-19 cli `report.py` `_display_precision`/`_typed_precision`/`_written_transaction_precision` — precision-capping logic where each branch pins a past over-precision fix (w5/093, w5/946); below the value bar.
- 2026-11-19 cli `bea_engine/csv_mapper.py` `extract` — 165 lines but sequential stages with early `continue`s, no deep nesting or re-derived state.
- 2026-11-18 mobile `resolve-app-link.ts` — switch dispatch over ledger paths, flat with early returns; churn is new-route fixes, not convolution.
- 2026-11-18 mobile `account-search.ts` (`fuzzyMatch`, `filterAccounts`) — scoring is factored with the cubic-exact proof in comments; no interleaving to split.
- 2026-11-18 mobile `number-utils.ts` / `valuation.ts` (`selectValuation`) — long but already split into named helpers by prior runs; remaining length is domain breadth, not nesting.

## rt-shipped-feature-inliner

### Deferred

### Skipped

- 2026-11-19 backend-v2 `plaid-sync` scheduler `enabled: false` (`src/scheduler/job-scheduler.ts:105-109`) — deliberate fallback documented in ADR028 (gap G7 "the fallback sync is off", decision D3 to enable it is pending); scheduler test pins "plaid-sync always disabled"; pending decision, not a finding.
- 2026-11-19 mobile `config.features.agentChat: false` — owner-gated off, permanently out of scope per this routine's skill and `mobile/.pm/DO_NOT_DO.md`; the route guard and home card stay.
- 2026-11-19 backend `featureFlags` GraphQL field + REST `/api-gateway/v1/feature-flags` + MCP resource — cross-package contract consumed by mobile/CLI; removal is a universal STOP, reported not fixed.
- 2026-11-19 deployment-fact switches (`SELF_HOST`, `ASK_AI_MODE`/`AGENT_MODE`, `SSH_PROXY_ENABLED`, `OIDC_*`, `OAUTH_JWKS_FROM_AUTH_SECRET`, dashboard `emailDelivery`/`selfHost`/`spendingReportSubscription`, `analyticsEnabled`) — vary by environment (self-host vs managed, sandbox vs bql) by design; deliberate, not single-value.
- 2026-11-19 CLI user-managed switches (engine `beangulp`/`beanprice` enablement, `BEA_NO_*`, `BEANCOUNT_DISABLE_LOAD_CACHE`, `CI`, `BEA_TOKEN`) — vary per user invocation; deliberate opt-outs, not shipped-feature gates.

## rt-useless-test-pruner

### Deferred

- 2026-11-20 ledger `src/shared/logger/index.test.ts` existence tests ("should be defined", four method-existence, "should have child method", "should create a child logger") — mirror the pruned backend-v2 logger six (e4fbb81b7); proof observed 2026-11-20: empty `LOGGABLE_CONTEXT_KEYS` reds 4 allowlist tests while all 7 stay green; deferred for single-package scope, take next run.
- 2026-11-20 ledger `src/shared/lock/lock.test.ts` "should be defined" + "should have acquire method" — mirror the pruned backend-v2 lock two; proof recipe: stub `acquire` to return a wrong answer (observed 2026-11-20: 5 behavior tests red, both green); deferred for single-package scope, take next run.

### Skipped

- 2026-11-20 cli 13 new test files (`test_update_self_cancel`, `test_balance_pad_omit_messages`, `test_into_unincluded_missing_directory`, +10) — AST sweep: every test function carries real asserts; subprocess-based suite, no mock/tautology shapes.
- 2026-11-20 backend-v2 capital-gains parity ×3 + ledger `flow-valuation-date.test.ts`/`account-journal-flow.test.ts` — exact `toEqual` pins on every surface/rate; reviewed, all real.
- 2026-11-20 dashboard `sankey-colors` scheme-mapping tests + `cash-account-status.test.ts` — mapping/toEqual pins; swapping a mapping reds its own test, so the proof rule keeps them.
- 2026-11-20 dashboard `no-cash-accounts`/`account-balances-card-period`/`use-import-duplicates`/`budget-summary-day` — every test pins exact output (activity-filter string, period hrefs, page-bound requests, summary day); reviewed, all real.
- 2026-11-19 backend-v2 `metrics-definitions.test.ts` `toBeInstanceOf(Histogram/Counter/Gauge)` — pins each metric's type; swapping a type turns its own test red, so the proof rule keeps them.
- 2026-11-19 backend-v2 `error-logging-plugin.test.ts` "should return an object with didEncounterErrors handler" — dropping the handler from the plugin's return turns it red; weak but real wiring pin.
- 2026-11-19 backend-v2 `legacy-posting-amount.test.ts` "is what the legacy workflow parses..." — source-grep pin on the `parsePostingAmount(posting.amount)` call site goes red when the workflow stops using it; real.
- 2026-11-19 cli zero-divisor twins (`test_engine_zero_divisor_tags` vs `test_format_crash_isolation` `test_tags_and_links_hold_no_divisor`) — identical bodies are a deliberate ADR014 mirror pinning both twins, plus a pattern-equality guard; sabotaging one twin reds only its own.
- 2026-11-19 cli near-duplicate pairs (`test_human_import_warns_with_renamed_roots` across close-drained/close-tree files, `test_plain_check_names_it_too` across missing/repeated-include files) — differ in asserted account/location helper per feature; each reds under its own sabotage.
- 2026-11-19 cli 48h AST assert sweep (36 recent test files) — every test function carries real asserts; subprocess-based suite, no mock/tautology shapes.
- 2026-11-19 dashboard `conversion-select.test.tsx` "should use default USD currency when not specified" — near-duplicate of the "renders with USD value" twin above it (both render value="USD" and assert the Converted-to-USD label); corrupting the label turns both red, so the proof rule keeps them.
- 2026-11-19 mock-API self-assertion shape (`expect(vi.mocked|vi|jest).toBeDefined()`) repo-wide (mobile/dashboard/ledger/backend-v2/skills) — zero hits; the 2026-11-18 dashboard instances stay pruned.
- 2026-11-19 brace-aware expect-free `it` sweep (dashboard/mobile/backend-cluster/ledger, 577 files) — every flag was a `throw`-assertion mobile test or a parser miss on `test(`/multi-line bodies; sampled the flags, all real.
- 2026-11-19 cli AST assert-free-function sweep — hits assert via `_refuse_*`/`run_doc`/raising-validator helpers as in the 2026-11-18 sweep; no new shape.
- 2026-11-18 duplicate neighboring `it` bodies repo-wide (dup-body sweep, ~30 files incl. star/unstar init-loading twins, ssh-keys twins, encode twins) — twins go red under sabotage, so the skill's proof rule keeps them; no vacuous twin found.
- 2026-11-18 cli/tests assertion-less-per-function sweep (~40 hits) — every hit asserts via local `_assert_*`/`_refuse_*`/`run_doc`/`_applies`/`_replays` helpers or raising validators; sampled 8 files, all real.
- 2026-11-18 `expect(vi.mocked(...))` with-args call assertions (reconciliation-page, write-outcome, create-file-pending) — real wiring pins, not the bare-`vi.mocked` shape; left in place.
- 2026-11-18 mobile `toast-provider/__tests__/index.test.ts` — a prior run already pruned its tautologies; remaining asserts pin `toast-queue` behavior.
- 2026-11-18 static sweeps with zero hits repo-wide (mobile/dashboard/ledger/cli): assertion-free `it` bodies, weak-matcher-only files, literal tautologies, empty bodies, tests mocking their own unit.
