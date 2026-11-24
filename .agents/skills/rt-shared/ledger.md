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

- 2026-11-21 cli engine `infer_date_format` (`src/bea_engine/csv_mapper.py:1362`) — zero callers repo-wide (grep over `src tests docs action`); live inference is the frontend twin (`src/cli/csv_mapper.py:881` + `inspect_date_column`, called from `import_.py:1699`) and the engine path always receives an explicit `--date-format` (`importing.py:284` defaults to `%Y-%m-%d`); `_strptime`/`_has_year_directive`/`_locale_shorthand` beside it are still used (lines 1401/1568-1569), so only `infer_date_format` is dead — verify no dynamic/`getattr` use, then delete.
- 2026-11-19 backend-v2 expired TEMPORARY `__Host-authSess` retirement shim (`src/server/middleware/orphaned-host-cookie-middleware.ts`, mounted in `src/server/start-server.ts:114-127`, test in `src/server/middleware/__tests__/orphaned-host-cookie-middleware.test.ts`) — marked safe-to-delete after 2026-10-21; confirm no stranded-window tokens remain, then delete shim + mount + test. 2026-11-20 re-check: still mounted and reachable on every production request (not dead code); default JWT lifetime is 365 days (`config.ts:527`), so stranded tokens may still be valid — the repo alone cannot prove the window is empty.
- 2026-11-19 ledger `getUserApiClient` on `IGiteaClientFactory`/`RequestScopedGiteaClientFactory` (`backend-cluster/ledger/src/foundation/clients/gitea-client-factory.ts`) — zero callers in ledger (every service uses `getPublicApiClient`), but the method is live in the backend-v2 donor (`ledger-workflow.ts` ×4, `commits-service.ts` ×2 per 2026-11-20 re-check); decide transplant fidelity vs removal.

### Skipped

- 2026-11-20 cli vulture min-confidence-100 on Python 3.12.16 — clean over `src/cli`, `src/bea_engine`, `src/fava` (parses the three PEP-695 files vulture skipped on 3.11); ruff F401/F841 clean tree-wide; closes the 2026-11-18 Deferred vulture entry.
- 2026-11-20 vulture min-confidence-100 over `skills/` and the root support scripts (`check-agent-guidance`, `ci-check`, `check-bex-blueprint`, `scan-secrets`) — clean; single-file scan of `scripts/skills/test_beancount_skills.py` flags the `pattern` arg of the `load_tests` protocol hook, but the whole-dir scan is clean and unittest requires the 3-arg signature; false positive.
- 2026-11-20 marker sweeps with zero hits — `if False`/`while False` (`cli/src`), `if (false)` (`dashboard`/`mobile`/`backend-v2`/`ledger` src), commented-out `def`/`class`/`import`/`export`, "no longer used/dead code" markers.
- 2026-11-19 knip-clean with installed deps (mobile incl. production knip + graphql-operations-check, dashboard, ledger, backend-v2) — zero hits; cli ruff F401/F841 clean tree-wide and vulture min-confidence-100 clean on every file it can parse.
- 2026-11-19 cli `ask/agent.py`, `api/client.py`, `bea_engine/importing.py` (vulture-unparseable on 3.11, PEP 695 syntax) — manual occurrence sweep: every top-level symbol has exactly one use; nothing dead.
- 2026-11-19 `scripts/skills/test_beancount_skills.py` (vulture-unparseable f-string) — single-occurrence names are all `Test*` classes found by unittest discovery plus the `load_tests` protocol hook; nothing dead.
- 2026-11-19 vulture `setUpClass(cls)` unused-variable hits (8× in `scripts/skills/test_verify_*.py`) — `cls` is signature-required for the unittest classmethod override; false positives, left in place.

## rt-dup-unifier

### Deferred

- 2026-11-21 `JSON_FLOAT_MARKER` transport marker (`cli/amounts.py:36` "must match `bea_engine.amounts`" vs `bea_engine/amounts.py:197`) — string literal both sides must share, no test pins it; add a drift guard next run.

### Skipped

- 2026-11-21 twin pairs already guarded, verified this run: `include_glob` (`test_include_glob_preflight.py` runs both `check_glob` copies over the same inputs), `expand_path` (`test_unresolved_home_paths.py` params both modules with identical messages), `fold_account` (`test_turkish_case_fold.py` imports both), `single_line` (`test_bidi_controls_are_escaped.py` compares both), `decode_error_message` (`test_bom_ledger.py` compares both) — agree today, nothing to add.
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

- 2026-11-22 cli `example --seed 1` with unbounded default range (`test_closed_stdout_replayed_output`, `test_captured_termination_reaches_child`) — seed 1 verified clean in-process across 9 month-end date-ends spanning 2 years, and seeds 2–400 clean for the current range; wall-clock drift is speculation, no proof of flake.
- 2026-11-22 cli refusal-path `example` invocations (json refusal, `--version`, misplaced-global, inverted/short ranges, destination-guard conflict, expanding-path refusal) — all raise before `capture_native` runs, so the unseeded RNG never executes; cannot flake on it.
- 2026-11-22 dashboard `report-read-retry.test.tsx` Cash-Flow retry failure (CI run 44900982238, commit 7e5f7238) — mid-branch failure in code the same branch was rewriting (`collectCashAccounts` assetsHierarchy crash); later commits on that branch fixed it and the branch merged green; never a same-commit red-to-green, not a flake.
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
- 2026-11-21 dashboard declared `cash-flow-role: "cash"` under Income/Expenses roots — `isCashAccountByMembership`/rows follow the five-root gate, but `BalanceSheetData` serves no income/expense hierarchy so there is no closing snapshot (liabilities/equity added this run); engine accumulates them. Needs a server field or a scope call; still open. 2026-11-21 re-check: still blocked — the dashboard server is only a proxy and the closings need a backend API field (cross-package STOP).
- 2026-11-20 cli `test_interrupt_contract.py` (3 tests) + `test_native_interrupt_is_silent.py::test_ctrl_c_during_a_forwarded_program_exits_130_silently` (2 params) — deterministic 10/10 FAIL in this sandbox, green in CI: sandbox python is libedit-readline, so ETX during `input()` raises KeyboardInterrupt in-process with no line-discipline `^C` echo (probe: exit by SIGINT, no `^C` on screen) while `_noise()` pins the echo; the exit-130 half of the USAGE.md carve-out holds — needs an intent call on whether the echo pin is backend-specific over-pinning (w3/388, w5/273).

### Skipped

- 2026-11-23 ledger `average-booking.ts` — read fully; every branch pins a past fix (w21/708 AVERAGE refusal, w21/721 saleLocator, w21/722 last-option-wins, w21/733 flagged-sale POSTING); examined, no divergence.
- 2026-11-23 ledger `generated-closes.ts` (`inactiveAfterGeneratedCloses`/`inactivePads`/`withoutDroppedCloseErrors`/`withoutGeneratedCloseErrors`) — read fully; every branch pins a past fix (w21/737 close_tree closes, w21/753 late child, w21/756 pads, w21/775/776 dropped/generated errors); examined, no divergence.
- 2026-11-23 ledger `sell-gains.ts` mul/add, `source-slice.ts` addScaled, `price-map.ts` addInto/two-hop times, `account-tree.ts` reduce-plus — exact arithmetic like the pre-fix journal/lot-inventory twins, but every operand chain is written-source short decimals (prices, tolerances `0.5×10^-places`, already-rounded reduced values); the >28-digit dust needs a 28-digit division quotient, which only the booked-cost paths carry — examined, no reachable divergence, no proof.
- 2026-11-23 mobile `decimal-number.ts` vs dashboard `beancount/decimal-number.ts` — shared parse/negate/sum/fraction core is textually identical modulo names; splits are per-surface (`decimalOf`/`compareDecimals`/`roundDecimal` mobile-only, `exceedsLedgerDigits`/`isPositiveDecimalNumber` dashboard-only), no divergence.
- 2026-11-23 dashboard `transaction-summary.ts` transfer check (`abs(sum) < 1e-9`) — pins near-balanced two-posting txns as transfers; no documented intent for a different tolerance, left alone.
- 2026-11-22 backend-cluster/ledger `directives-report` `activeYears` under FYE "00-31" — the raw month/day comparison labels every entry FY(year+1), matching the fixed `directive-filter` numbering where FY2025 covers calendar 2024; examined alongside the month-0 fix, no change.
- 2026-11-22 mobile `account-close-dates.ts` remaining helpers (`isOpenOn` close-day inclusivity, `listedAccountsAsOf` close-day hiding, `budgetEndsOn` split-parent rule, `firstOpeningAfter`, `closedBeforeDate` trim, `isDeclared` empty-read claim) — boundaries match their docblocks and pins; the one divergence found (`closedAccountNamed` shadowing `notYetOpenAccountNamed`) shipped as its own fix.
- 2026-11-22 dashboard `use-import-duplicates` journal window vs server `parseDateRange` — the client sends the file's first/last day (or one day) as `time`; the server resolves both endpoints inclusively (`[begin, end)`), so the booked pool covers the file's days; examined, no divergence.
- 2026-11-22 backend-cluster/ledger `directive-filter` TS-NONE-vs-donor-crash pairs — where the donor raises (year ≤ 0 constructions, underflows below year 1), the TS port returns undefined (400), consistent with the existing impossible-date 400 pins; examined, no change.
- 2026-11-22 backend-cluster/ledger `directive-filter` `monthOffset` clamp-vs-raise — `monthOffset` clamps the day while Python `month_offset` raises, but every call site (`getFiscalPeriod` quarter starts, `substitute` day-1 inputs) provably carries day 1; examined, no divergence.

- 2026-11-21 dashboard `decode-csv-bytes.ts` + `use-csv-parser.ts` empty path — empty/whitespace-only bytes throw `CsvEmptyError` at the caller, BOM-only UTF-16 decodes to empty and throws the same way; no-BOM UTF-16 is out of the documented scope (same choice as `FileReader.readAsText`); examined, no divergence.
- 2026-11-21 cli engine/frontend date-inference split (`bea_engine/csv_mapper.py` vs `cli/csv_mapper.py`) — the pair agrees on all 12 built-in formats; the engine's extra `%j`/`%U`/`%W` rollover refusal (w5/986, w5/1022) only fires on custom `--date-format`s where the frontend already forwarded the recalled format, so the strict side refuses loudly instead of diverging silently; the engine's own `infer_date_format` is dead code, handed to `rt-dead-code-removal` as Deferred.
- 2026-11-21 cli OFX vs frontend `_source_accounts`/`_ofx_identities` twin scans — textually identical modulo bytes/str decode (non-ASCII ids only); the w5/1069 recipient and w5/1031 same-number-different-bank cases agree; examined, no drift.
- 2026-11-21 cli `report_csv.py` vs `bea_engine/query.py` CSV-injection handling — trigger sets agree; every report user-text cell is in `_TEXT_COLUMNS`, numbers exempt by column; examined, no divergence.
- 2026-11-21 cli `rows._alternating_nuls` vs `csv_mapper._refuse_utf16` parity half — deliberate documented floor (w5/738); examined, no divergence.
- 2026-11-21 cli `bea_engine/importing.py` duplicate pool vs dashboard unbooked-dup fix — probed live: exact-ID rows matching an unbalanced ledger txn stay `duplicate` per the documented always-skip rule, failing ledgers refuse without `--allow-errors`; no intent pins error entries out; ambiguous, no fix.

## rt-logic-simplifier

### Deferred

### Skipped

- 2026-11-21 cli `bea_engine/importing.py:answer` row-classification chain — ~300-line duplicate/twin/counterpart dispatch interleaved with price/balance/directive handling and preview assembly; every branch pins a past w5/xxx fix and shares mutable loop state (`identities`, `dated`, `batch_rows`, `texts`/`included`); splitting it is single-use helpers plus re-threaded state, below the value bar.
- 2026-11-21 cli `report.py:_register` (194 lines, w1/337 flow branch) and `_cash_flow` re-check (w1/m49 refactor, w5/1057 fix landed since the 2026-11-19 skip) — still sequential stages with early exits, every branch pins a past fix; extracting further is single-use helpers, below the value bar.
- 2026-11-21 mobile `budget-screen/selectors/budget-selectors.ts` (`budgetForIntervalExact` fast-path + day walk) — backfill/governing/effective-from branches each pin a past w21/xxx verdict fix (301/622/762); factored small helpers already, no interleaving to split.

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
- 2026-11-19 deployment-fact switches (`SELF_HOST`, `SSH_PROXY_ENABLED`, `OIDC_*`, `OAUTH_JWKS_FROM_AUTH_SECRET`, dashboard `emailDelivery`/`selfHost`/`spendingReportSubscription`, `analyticsEnabled`) — vary by environment (self-host vs managed) by design; deliberate, not single-value.
- 2026-11-19 CLI user-managed switches (engine `beangulp`/`beanprice` enablement, `BEA_NO_*`, `BEANCOUNT_DISABLE_LOAD_CACHE`, `CI`, `BEA_TOKEN`) — vary per user invocation; deliberate opt-outs, not shipped-feature gates.

## rt-useless-test-pruner

### Deferred

### Skipped

- 2026-11-23 dashboard expect-free sweep (6700 it/test blocks, brace-matched honoring file-local `expect*` helpers; 17 flags triaged, residual all real) — hollow `ledger-file-view` pair deleted this run (integration 8 + errors 23 tests, sabotage-proven green); `getBy`-throws bodies and `it.each`-table bodies are this sweep's blind spots.
- 2026-11-21 ledger `src/shared/logger/index.test.ts` remaining 23 tests — doesn't-throw/level/child-behavior/async-context/allowlist pins all hold behavior (re-proved 2026-11-21: emptied `LOGGABLE_CONTEXT_KEYS` reds the same 4 allowlist tests); kept per the proof rule.
- 2026-11-21 ledger `src/shared/lock/lock.test.ts` remaining 5 behavior tests — re-proved 2026-11-21: `acquire` stubbed to return without running the callback reds all 5, both existence tests stay green; kept per the proof rule.
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
