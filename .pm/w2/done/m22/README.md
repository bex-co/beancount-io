# w2 · m22 — Make reports download and initialize less chart code

**Worker:** worker2 **Goal:** People evaluating the example ledger reach usable reports with less chart code and avoidable initialization work. **Status:** done

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Inventory chart registrations and report chunk costs — **DONE** | 30m | w2/m21/t008 |
| t002 | Register only required ECharts modules — **DONE** | 60m | w2/m22/t001 |
| t003 | Load chart runtime lazily with stable placeholders — **DONE** | 45m | w2/m22/t002 |
| t004 | Remove proven redundant chart work — **DONE** | 45m | w2/m22/t003 |
| t005 | Adoption surface — **DONE** | 20m | w2/m22/t004 |
| t006 | Simplify — **DONE** | 20m | w2/m22/t005 |
| t007 | Test coverage — **DONE** | 40m | w2/m22/t005, w2/m22/t006 |
| t008 | Closeout — **DONE** | 15m | w2/m22/t007 |

## Definition of done

- Production report downloads contain fewer compressed chart bytes than the recorded baseline, with traces proving the intended lazy chunk boundary.
- Every used chart type, tooltip, resize, theme switch, and supported statement export still works.
- First-chart readiness does not regress beyond the documented measurement variability under the same baseline scenario.
- Only profiling-supported redundant initialization or updates are removed; no speculative memoization pass is included.

## Source + Goal linkage

- **Source:** /pm-brainstorm dashboard performance, 2026-09-05; user requested materialization in w2. dashboard/src/common/components/react-echarts/client.tsx imports the full echarts package; the shared wrapper imports that client statically. ClientOnly controls rendering, not a dynamic import boundary.
- **Goal linkage:** A2 — Frictionless onboarding. People evaluating the example ledger reach usable reports with less chart code and avoidable initialization work.
- **Expected outcome:** Lower time to the first usable report under repeatable conditions. First-ledger/onboarding completion is a downstream adoption signal, not a promised conversion gain; no new analytics service is required.
- **Why now:** Build on m21's measurement procedure and improve the report experience already promoted in the root README. w2 is the user-selected general-purpose queue, assigned to worker2.
- **Adoption surface:** Included because dashboard users directly experience this change; keep quickstart and measurement instructions accurate.

## Scope and measurement

Implementation stays within dashboard. Use public or synthetic ledgers, never user data or credentials in reports. Capture production-build baselines before changes; static imports identify candidates, not measured timing gains. Ask before adding dependencies; never hand-edit lockfiles. Preserve current access controls, accounting semantics, and supported exports. Journal virtualization and blanket memoization are out of scope; backend cold-start/retry safety is already tracked separately in w3/003.


## Validation and outcome

Dashboard format:check, lint (including TypeScript and Knip), test, build, and perf:locales pass. 272 test files: 3,449 passed, one skipped. Production browser checks cover Canvas, hover tooltip, resize, dark theme, all three statement CSV/Markdown/print exports, and chunk-error reload recovery.

Manifest and browser trace confirm a dynamic client chunk; login loads none. Deferred-load tests preserve dimensions and refs. Browser aborted-chunk recovery passes. Income-statement/overview median readiness improves from 3,414/3,823 ms to 3,025/3,374 ms. Selective registry reduces the chart-containing chunk from 371,683 to 213,937 gzip bytes (level 9), with real registry tests for every chart type and zoom/legend actions.

Measured on the public example ledger with fresh Chrome contexts, CPU 4× and a fixed warmed read-only API response cache. Full methodology, measured ranges, registry inventory, and lifecycle evidence: `dashboard/docs/performance-charts.md`. No accounting, access, export-content, or backend changes.
