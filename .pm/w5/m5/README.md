# w5 · m5 — Verify and complete shipped MCP accounting prompts

**Worker:** worker1 **Goal:** hosted-ledger users can select four evidence-backed accounting playbooks through MCP and complete them using existing authorized operations **Status:** todo

**Estimate:** 4h30m (approximately 5h) implementation; 6h30m including standing closing tasks (9 tasks).

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Audit shipped prompt capabilities and argument handling | 45m | w5/m4/t009 |
| t002 | Verify and repair spending-report and month-close behavior | 60m | w5/m5/t001 |
| t003 | Verify and repair account reconciliation behavior | 60m | w5/m5/t001 |
| t004 | Verify and repair import categorization behavior | 60m | w5/m5/t001 |
| t005 | Document native and manual client invocation paths | 45m | w5/m5/t002, w5/m5/t003, w5/m5/t004 |
| t006 | Adoption surface | 30m | w5/m5/t005 |
| t007 | Simplify | 30m | w5/m5/t006 |
| t008 | Test coverage | 45m | w5/m5/t006, w5/m5/t007 |
| t009 | Closeout | 15m | w5/m5/t007, w5/m5/t008 |

## Definition of done

- `spending-report`, `reconcile-account`, `categorize-imports`, and `close-month` are exposed by MCP prompt discovery and retrieval with documented, validated arguments.
- Listing or retrieving prompts causes no ledger side effects. Invalid names/arguments fail clearly; instructions preserve explicit target selection and credential-pin limits.
- Spending answers cite re-runnable queries and exact report scope. Reconciliation classifies mismatches without fabricating matches or balances; import categorization stays within existing accounts and preserves deduplication.
- Writes require the inherited preview/confirmation sequence and final validation. A read-only credential does not gain write authority. Close-month cannot claim completion while accounts, assertions, or required checks remain unresolved.
- Both Claude Code and Codex have a demonstrated native or equivalent manual invocation path. Synthetic workflow runs verify effects and compare correctness and effort using m4; unavailable client UI is documented accurately.
- Native backend checks, MCP conformance where applicable, and required API parity checks pass. Customer-playbook provenance, supported invocation paths, and measured results are documented.

## Source + Goal linkage

- **Source:** Approved `/pm-brainstorm for w5` proposal and [completed w2/008](../../w2/done/008.md), from the MCP field audit of 2026-09-08; routed to w5 on 2026-09-12. During the 2026-09-13 shipping rebase, commit `adfcf587` was found to have already shipped all four prompt bodies and registration. This milestone retains the approved client-level acceptance work and repairs only demonstrated gaps.
- **Goal linkage:** **A1 — Agent-native accounting** and **A2 — Frictionless onboarding**: hosted-ledger users with an MCP connection can invoke a complete accounting workflow without installing local ledger skills or constructing a tool sequence.
- **Expected outcome:** The four shipped prompts have demonstrated usable invocation paths, correct workflow results, and expected ledger effects in both clients. Measure completion, unnecessary calls, and invocation results through m4; keep any discovered failure visible until repaired.
- **Why now:** Registration and protocol tests already shipped, while real-client execution evidence for the full workflows remains to be captured. Sequence after w5/m4 closes so each follow-up repair has a current baseline and state-based acceptance evidence.
- **Adoption surface:** included. MCP prompt selection and the client walkthroughs are directly used by hosted-ledger customers and coding agents.

## Boundaries

- Implementation belongs in `backend-cluster/backend-v2/`. Reuse `mcp-prompts.ts`, its existing registration, and the shipped protocol tests. Add fixture journeys and make minimal repairs where they demonstrate a gap against the approved behavior; do not recreate the prompt surface. Retain customer-playbook source links, avoid runtime cross-package imports, and keep local skill or accounting-engine rewrites out of scope.
- MCP prompts are selected by users. Do not assume models automatically discover or invoke them; prove each supported client's native selection or documented equivalent manual path.
- Prompt discovery/retrieval is side-effect-free protocol metadata. Ledger reads and writes use the existing protected operations, current credential scopes, ledger pins, rate limits, and per-call authorization.
- Map every step to a real supported operation before implementation. Any missing domain capability requires the full REST/GraphQL/MCP parity workflow and revised scope before claiming the workflow works; do not bypass a missing operation through an approximate query or raw-file workaround.
- Read-only workflows must not mutate. Proposed writes preserve preview, explicit confirmation, existing-account categorization, import-id deduplication, and final validation. A partially reconciled month must be reported as blocked or incomplete.
- Use synthetic fixtures and the m4 evaluation procedure. Prompt retrieval must never execute a financial workflow or imply that selecting a prompt is blanket permission for later writes.

## Shipped baseline and remaining work

`adfcf587` registered all four prompts, folded caller arguments and ledger restrictions into their text, documented their metadata-only classification, and added protocol/list tests. The resolved source note preserves those implementation and validation details. They are completed work, not pending tasks in this milestone.

The remaining tasks map and exercise the shipped instructions through actual client journeys, cover argument/target behavior and accounting completion conditions, repair reproduced failures, and document supported invocation paths. For import categorization, use synthetic staged transactions with controlled provider responses where necessary; label that evidence clearly. Live Plaid linking and sync remain the separate deferred w2/009 journey.
