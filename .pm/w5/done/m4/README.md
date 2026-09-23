# w5 · m4 — Make real MCP agent journeys reproducible

**Worker:** worker1 **Goal:** contributors can run the audited onboarding journeys through real MCP clients and compare answer correctness, ledger effects, and effort **Status:** done

**Estimate:** 4h implementation; 6h including standing closing tasks (9 tasks).

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Package synthetic ledgers and the three audited journeys — **DONE** | 45m | — |
| t002 | Add bounded Claude Code and Codex MCP runners — **DONE** | 60m | w5/m4/t001 |
| t003 | Score answer correctness and persisted ledger effects — **DONE** | 45m | w5/m4/t001, w5/m4/t002 |
| t004 | Add run limits cleanup and sanitized comparison reports — **DONE** | 45m | w5/m4/t002, w5/m4/t003 |
| t005 | Capture the current baseline and document comparisons — **DONE** | 45m | w5/m4/t004 |
| t006 | Adoption surface — **DONE** | 30m | w5/m4/t005 |
| t007 | Simplify — **DONE** | 30m | w5/m4/t006 |
| t008 | Test coverage — **DONE** | 45m | w5/m4/t006, w5/m4/t007 |
| t009 | Closeout — **DONE** | 15m | w5/m4/t007, w5/m4/t008 |

## Definition of done

- `yarn mcp:agent-eval` (or an equally explicit documented package command) runs the three audited journeys against the hosted Beancount.io MCP endpoint (`https://beancount.io/api-gateway/mcp`) using Claude Code and Codex, on a synthetic test ledger owned by a dedicated QA account.
- Fixtures and expected facts cover cash/food spend plus a controlled purchase, reporting/net worth/stale accounts/validity, and ledger discovery/recent transactions/payees. Read-only and authorized-write phases have distinct state expectations.
- Scoring checks actual answers and persisted ledger state, detects wrong totals and unintended or duplicate writes, and does not declare success from a plausible final sentence alone.
- Repeated runs start from equivalent fixture state. Timeout, cancellation, and failure paths terminate child processes, report incomplete results, and clean up only run-owned data.
- A sanitized fresh baseline records the server version the endpoint reports, client/model versions, attempts, correctness, calls, latency, and available usage metrics. Actual client invocations are distinguished from transcript replay or mocked harness checks.
- Focused deterministic harness/scorer checks and native backend checks pass. Paid runs remain opt-in; the contributor guide states when to compare the benchmark for MCP inventory or instruction changes.

## Source + Goal linkage

- **Source:** Approved `/pm-brainstorm for w5` proposal and [w2/009](../../../w2/blocked/009.md), the MCP field audit of 2026-09-08; routed to available w5 capacity by `$pm for w5 for them all` on 2026-09-12.
- **Goal linkage:** **A1 — Agent-native accounting** and **A2 — Frictionless onboarding**: contributors can reproduce failures experienced by coding agents during ordinary ledger onboarding and assess whether a change improves completion.
- **Expected outcome:** One documented command produces per-journey correctness and file-effect results plus calls, latency, and available usage data. The fresh baseline becomes the comparison point for m5 and future MCP inventory changes.
- **Rescoped 2026-09-15:** blocked on choosing a separate local benchmark stack; the user decided real-client MCP evaluation uses the hosted endpoint instead (`.pm/DO_NOT_DO.md`: no duplicate stacks for MCP testing).
- **Why now:** w2/m27 and m28 have shipped discovery and result-envelope changes, and w2/008 has now shipped the four playbooks. Capture the current external-client baseline before m5 makes follow-up repairs and verifies prompt journeys. w5 can own this work while w2 completes its existing milestones.
- **Adoption surface:** included. The package command and comparison report are a developer-facing adoption surface consumed by contributors assessing real agent behavior.

## Validation evidence (2026-09-15)

- **Harness:** `yarn mcp:agent-eval` in `backend-cluster/backend-v2`. The runner is `scripts/mcp-agent-eval.ts`, with scorer, transcript, and process modules under `scripts/mcp-agent-eval/`. Journeys and the fixture are under `evals/mcp-agent/`, and the guide is `docs/mcp-agent-eval.md`.
- **Live baseline:** [evals/mcp-agent/baseline/2026-09-15.md](../../../../backend-cluster/backend-v2/evals/mcp-agent/baseline/2026-09-15.md).
  - Hosted endpoint reporting `beancount-mcp 1.0.0`; it does not expose a deployed revision.
  - Clients: Claude Code 2.1.272, which reported `claude-opus-5`, and Codex 0.154.0, which does not report its model.
  - 3 journeys × 2 clients × 3 attempts: 18/18 passed, and the fixture was restored afterwards.
  - Claude Code cost about USD 1.78 in total.
- **Live cancellation:** an earlier full run was cancelled with SIGINT mid-attempt. That attempt was reported `incomplete — cancelled`, the client process group stopped, the fixture was restored, and the report was still written. The baseline above supersedes that pre-refactor run.
- **Deterministic tests:** `scripts/__tests__/mcp-agent-eval.test.ts`, 25 tests.
  - Every figure and name in `journeys.json`, re-derived from the fixture and matched by fact id.
  - Answer scoring: a wrong total fails even when the answer claims success.
  - Read-only journeys: any write is caught.
  - Purchase journey: a missing, duplicate, or wrong purchase fails, as do edits to existing entries, extra files, and validation errors.
  - Unreadable state is an error, never "unchanged", and incomplete runs are classified as such.
  - Safety and secrets: the target guard, redaction of keys and the account owner, and that no client command line carries the credential.
  - Client resolution skips this package's `node_modules`.
  - Claude Code and Codex transcripts are parsed with unavailable metrics left null.
  - Process limits: the whole process group is killed on timeout, including helpers that ignore SIGTERM. Also covered: the call-limit stop, cancellation, stderr tail capture, and a client that cannot start.
- **Native checks in backend-v2:**
  - `yarn typecheck` and `yarn build` pass.
  - `yarn test` passes: 284 suites, 4451 tests.
  - ESLint and Prettier are clean on the new files.
  - `yarn lint:deadcode` reports only a pre-existing unused export (`AppLinksConfig` in `src/config/config.ts`), which is unrelated drift.
  - No API contract changed, so OpenAPI regeneration and the parity workflow do not apply.
- **Adoption surface:** the backend-v2 README (scripts list and MCP section), backend-v2 `CLAUDE.md`, a pointer in `docs/mcp.md`, and the root README's MCP entry point. `scripts/check-agent-guidance.py` passes.
- **Environment:** a QA account with a dedicated private `mcp-agent-eval` ledger and a temporary read/write API key pinned to it that expires 2026-09-22. This follows `.pm/DO_NOT_DO.md` (no duplicate stacks for MCP testing). Credentials stay in gitignored local files and are not in the repository.
- **Simplify:** applied the reuse, simplification, efficiency, and altitude findings.
  - Shared fixture and file-list helpers, and one sanitizer that also covers transcripts.
  - Concurrent state reads, with trusted post-run state reused for the next reset.
  - Narrower client resolution, and requested and reported models recorded separately.
  - The derivable `mode` field was removed, and the discovery prompt no longer names the ledger.
  - The oracle is compared by fact id, and the process test is faster.
  - Deferred: structured final-answer schemas, because they change what agents are asked to produce. Also deferred: server-side BQL state diffing, because the single-file fixture makes the text diff sufficient.
- **Limitations:**
  - Codex cost, turns, and model are unavailable from `codex exec --json`.
  - The answer scorer checks that expected facts are present, not that extra claims are absent.
  - Not run: Claude Code with a user-level MCP configuration, Linux, and other clients.
  - `docs/mcp.md` already failed Prettier before this change and was not reformatted.

## Boundaries

- Implementation stays in `backend-cluster/backend-v2/`, reusing its eval layout. Journeys connect to the hosted MCP endpoint with a temporary API key pinned to the synthetic test ledger; no local or duplicate stack is provisioned. QA credentials and minted keys stay in gitignored local files and are never logged, committed, or written to the board. The current internal BeancountAgent eval uses stubbed service results; it remains separate from these external-client journeys.
- Use the synthetic test ledger, explicit fixture ownership, and approved fixture-only mutations; never read or modify other ledgers on the QA account. Billed client/model runs are opt-in; ordinary automated tests cover deterministic harness and scoring behavior without paid calls.
- Record exact client/model versions, the observed server version, run limits, and supported metrics. Missing credentials, missing clients, and unsupported metrics must be explicit; none count as a passing live rehearsal.
- The historical 11/21/15-turn field audit is provenance, not a current baseline or promised improvement. Compare repeated runs under equivalent conditions.
- The larger Plaid sandbox bank-import journey remains deferred in w2/009. This milestone covers the three original ledger journeys; it does not require new bank-provider setup.
- Any real domain bug found by the benchmark is reported with evidence and the existing parity requirements. Do not rewrite expected answers or weaken the scorer to hide it.
