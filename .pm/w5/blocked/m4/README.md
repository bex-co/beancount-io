# w5 · m4 — Make real MCP agent journeys reproducible

**Worker:** worker1 **Goal:** contributors can run the audited onboarding journeys through real MCP clients and compare answer correctness, ledger effects, and effort **Status:** blocked — see [Blocked](#blocked)

**Estimate:** 4h implementation; 6h including standing closing tasks (9 tasks).

## Blocked

**Blocked 2026-09-14 by `/loop-worker w5` triage; no implementation started.** The definition of done requires live Claude Code and Codex runs against a real local MCP endpoint built from this repository's current revision. The only local stack found on the worker machine is a `deploy/docker-mac` Compose project owned by other checkouts, and this checkout's local stack has pre-initialized data without its environment file, so neither can serve as a trustworthy, isolated baseline without a user decision.

**Unblock with a user decision:** run the baseline on an isolated stack built from this checkout (alternate ports and fresh synthetic data), or on an existing local stack; and approve the repeated billed client runs (three journeys × two clients × repeated attempts). When unblocked, move this directory back to `.pm/w5/m4/`; its workstream checkbox stays unchecked until closeout.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Package synthetic ledgers and the three audited journeys | 45m | — |
| t002 | Add bounded Claude Code and Codex MCP runners | 60m | w5/m4/t001 |
| t003 | Score answer correctness and persisted ledger effects | 45m | w5/m4/t001, w5/m4/t002 |
| t004 | Add run limits cleanup and sanitized comparison reports | 45m | w5/m4/t002, w5/m4/t003 |
| t005 | Capture the current baseline and document comparisons | 45m | w5/m4/t004 |
| t006 | Adoption surface | 30m | w5/m4/t005 |
| t007 | Simplify | 30m | w5/m4/t006 |
| t008 | Test coverage | 45m | w5/m4/t006, w5/m4/t007 |
| t009 | Closeout | 15m | w5/m4/t007, w5/m4/t008 |

## Definition of done

- `yarn mcp:agent-eval` (or an equally explicit documented package command) runs the three audited journeys against a real local MCP endpoint using Claude Code and Codex.
- Fixtures and expected facts cover cash/food spend plus a controlled purchase, reporting/net worth/stale accounts/validity, and ledger discovery/recent transactions/payees. Read-only and authorized-write phases have distinct state expectations.
- Scoring checks actual answers and persisted ledger state, detects wrong totals and unintended or duplicate writes, and does not declare success from a plausible final sentence alone.
- Repeated runs start from equivalent fixture state. Timeout, cancellation, and failure paths terminate child processes, report incomplete results, and clean up only run-owned data.
- A sanitized fresh baseline records server/client/model versions, attempts, correctness, calls, latency, and available usage metrics. Actual client invocations are distinguished from transcript replay or mocked harness checks.
- Focused deterministic harness/scorer checks and native backend checks pass. Paid runs remain opt-in; the contributor guide states when to compare the benchmark for MCP inventory or instruction changes.

## Source + Goal linkage

- **Source:** Approved `/pm-brainstorm for w5` proposal and [w2/009](../../../w2/009.md), the MCP field audit of 2026-09-08; routed to available w5 capacity by `$pm for w5 for them all` on 2026-09-12.
- **Goal linkage:** **A1 — Agent-native accounting** and **A2 — Frictionless onboarding**: contributors can reproduce failures experienced by coding agents during ordinary ledger onboarding and assess whether a change improves completion.
- **Expected outcome:** One documented command produces per-journey correctness and file-effect results plus calls, latency, and available usage data. The fresh baseline becomes the comparison point for m5 and future MCP inventory changes.
- **Why now:** w2/m27 and m28 have shipped discovery and result-envelope changes, and w2/008 has now shipped the four playbooks. Capture the current external-client baseline before m5 makes follow-up repairs and verifies prompt journeys. w5 can own this work while w2 completes its existing milestones.
- **Adoption surface:** included. The package command and comparison report are a developer-facing adoption surface consumed by contributors assessing real agent behavior.

## Boundaries

- Implementation stays in `backend-cluster/backend-v2/`, reusing its eval layout and the existing complete local stack. The current internal BeancountAgent eval uses stubbed service results; it remains separate from these external-client journeys through the real MCP endpoint. Keep every service in the selected deployment together; do not connect a local dashboard to the managed API or add split-deployment onboarding.
- Use synthetic local ledgers, explicit fixture ownership, and approved fixture-only mutations. Billed client/model runs are opt-in; ordinary automated tests cover deterministic harness and scoring behavior without paid calls.
- Record exact client/model versions, server revision, run limits, and supported metrics. Missing credentials, missing clients, and unsupported metrics must be explicit; none count as a passing live rehearsal.
- The historical 11/21/15-turn field audit is provenance, not a current baseline or promised improvement. Compare repeated runs under equivalent conditions.
- The larger Plaid sandbox bank-import journey remains deferred in w2/009. This milestone covers the three original ledger journeys; it does not require new bank-provider setup, production credentials, or hosted verification.
- Any real domain bug found by the benchmark is reported with evidence and the existing parity requirements. Do not rewrite expected answers or weaken the scorer to hide it.
