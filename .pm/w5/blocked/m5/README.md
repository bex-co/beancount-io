# w5 · m5 — Verify and complete shipped MCP accounting prompts

**Worker:** worker1 **Goal:** hosted-ledger users can select four evidence-backed accounting playbooks through MCP and complete them using existing authorized operations **Status:** blocked — see [Blocked](#blocked) (t001–t008 done; only the closeout remains)

**Estimate:** 4h30m (approximately 5h) implementation; 6h30m including standing closing tasks (9 tasks).

## Blocked

**Blocked 2026-09-15; narrowed 2026-10-20, twice on 2026-10-21, and reviewed 2026-11-04.** Every implementation task is done. These items are cleared:

- the 2026-09-15 deploy, verified on 2026-10-20 by the drift check
- the bank-linked confirmed import, measured on 2026-10-21 after the owner upgraded the plan
- the Codex results, measured on 2026-10-21 ([w4/960](../../../w4/done/960.md), see [Validation evidence (2026-10-21, Codex)](#validation-evidence-2026-10-21-codex))
- `2da3e6f9a` (the discard tool's name in `categorize-imports`), now deployed: no prompt drifts

The closeout (t009) still cannot run, because one thing remains that this repository cannot do on its own:

1. **Live verification of `d812112f6`.** It tells agents which staged-transaction id to pass. On 2026-10-21 it was merged but not deployed; the later deployment record below includes it, but the required import-session evidence is still missing.
   - The prompt drift line cannot show it, because the change is in tool descriptions and a service refusal, not prompt text ([w5/964](../../done/964.md)).
   - On 2026-10-21, the live `listStagedBankTransactions` description still read "(the ids importStagedBankTransactions and discardStagedBankTransactions take)".
   - Codex's first dry run on the bank-linked ledger passed a staged row's `id` and was refused with the generic hint.

   **2026-11-04 review:** the committed [2026-10-31 deployment verification](../../../../backend-cluster/backend-v2/docs/marketplace-submissions/openai/deployed-annotation-verification-20261031.json) records a successful production deployment of `d7e58ce06d24604681187f0d9cb7d8523ed4e97a`. A repository ancestry check confirms that revision contains `d812112f6`. That record verifies tool annotations, not this description or a categorization session, so another deploy is not the next prerequisite on the available evidence. The repository QA helper found no configured MCP QA token; an anonymous `tools/list` request returned HTTP 401. Current live behavior remains unverified. No bank data was read or written, and no account settings were changed during this review.

   **Unblock:** the owner supplies access through an existing authorized MCP client or a locally configured QA credential; the owner or QA worker verifies that the live `listStagedBankTransactions` description says to pass `transactionId`, not `id`, and that a fresh categorize session on the bank-linked ledger passes `transactionId` on its first try. A successful `dry_run: true` preview is sufficient for this remaining identifier check; the earlier real-import evidence is retained below. Do not submit or discard transactions for this verification. Record the observed description and first-call outcome without private ledger content. Redeployment is needed only if the live check demonstrates the repair is absent.

When that holds, unblock m5 and run t009.

## Validation evidence (2026-10-21)

- **t004 on real staged data:** this was the owner's QA ledger with one linked bank (production Plaid) and four staged transactions. The client was Claude Code, using the deployed `categorize-imports` prompt. Two credentials were used, each pinned to that ledger with read and write but not `ledger.admin`. First an OAuth grant, before the plan upgrade; then, once the owner had upgraded, a one-day API key, revoked afterwards. Four sessions ran: one declined, one confirmation refused by the directive limit, one confirmation that completed after the upgrade, and a repeat run. The ledger and staging were checked over REST after each. Transcripts are kept locally only, because they hold real bank data.
  - **Discovery:** listing banks was refused for lack of `ledger.admin`. The agent said so and worked from what was staged, as the prompt directs.
  - **Suggestions:**
    - It reused the ledger's own prior booking for one payee and cited that entry as the reason.
    - It left three rows unassigned and invented no account.
    - For two of those three, the ledger's earlier booking of the same payee went to an unrelated card liability. The agent declined to reuse that prior, and the server's suggestion with it, calling it the wrong card. The prompt's "reuse a confident prior" rule does not anticipate a prior that looks wrong.
    - The ledger has no `Expenses:Uncategorized`, and the agent did not use one.
  - **Dedup:** it checked the ledger for matching amounts near each date, found none, and said so.
  - **Declined:** "No" left the ledger's latest commit and all four staged rows unchanged.
  - **Confirmed one row, before the upgrade:**
    - The agent previewed with `dry_run: true` (one entry, no new errors), then waited for an explicit "Yes".
    - The real call was refused with `RESOURCE_LIMIT_REACHED`: the free-tier ledger was over its allowance.
    - The agent verified that nothing was written and nothing staged was marked synced, and it reported the refusal honestly.
  - **Confirmed one row, after the upgrade:**
    - The agent ran a dry run, then the real import.
    - Exactly one entry was added, with the expected postings and one commit, and the ledger stayed at 0 errors.
    - That row left staging, and the other three stayed.
  - **Repeat run:**
    - The imported row was not proposed again, and the ledger kept exactly one such entry.
    - A "No" afterwards changed nothing.
    - The service also refuses an already-synced row outright, which a unit test covers.
  - **Discard:** run as `dry_run: true` only. It reported one row and removed nothing, and staging still held three.
  - **Variance:** in one session the agent reused a payee's questionable prior booking and flagged it for review; in another it left that row unassigned.
- **Gaps found:**
  - **Wrong id:** the agent first passed a staged row's `id` to `importStagedBankTransactions`, which wants its `transactionId`, and got only "Some transactions not found in database".
    - The listing and both tool schemas now say which field to pass.
    - The service's refusal, shared by REST and GraphQL, carries `field: transactionIds` and a hint.
    - `plaid-sync-service.test.ts` pins the hint, and fails without the fix.
  - **Optimistic dry run:** the dry run promised a write that the plan limit then refused. Filed as [w5/904](../../done/904.md); it also affects `appendLedgerText`.
  - **No `import-id` on hosted imports:** filed as [w5/941](../../done/941.md). A successful import also reports no file and no entry hashes, filed as [w5/942](../../done/942.md).
- **Not measured:** a real discard (it is destructive on real staged rows), and Codex ([w4/960](../../../w4/done/960.md), measured the same day; see below).

## Validation evidence (2026-10-21, Codex)

- **Prompt journeys:** `yarn mcp:agent-eval --client codex --attempts 3` ran the nine `prompt-*` journeys on codex-cli 0.163.0. Each attempt used the retrieved-prompt invocation. Details: [2026-10-21-prompts-codex.md](../../../../backend-cluster/backend-v2/evals/mcp-agent/baseline/2026-10-21-prompts-codex.md).
  - **Dedicated ledger:** on a new private `mcp-agent-eval-w4` ledger, 25/27 passed.
    - The confirmation gate held in 12/12 attempts.
    - The read-only key's write was refused in 3/3 attempts, with the ledger unchanged.
    - Every close and reconciliation attempt met its state and answer checks.
  - **The two failures** are read-only refusals that Codex reported accurately ("rejected because the credential lacks `ledger.write` scope") but that the phrase list does not accept. They stay scored as fails; filed as [w5/962](../../done/962.md).
  - **Shared ledger:** the first run, on `mcp-agent-eval`, scored 21/27. Four of its failures were other QA sessions committing to that ledger mid-attempt, which the QA contract also designates. Filed as [w5/961](../../done/961.md).
  - **No prompt drift:** `2da3e6f9a` is live.
  - **Effort:** median wall time and MCP calls are within the range of Claude Code's 2026-10-20 single attempts. That comparison is skewed, though, because Codex also used the ChatGPT account's GitHub connector and the shell, which the harness does not give Claude Code. Filed as [w5/963](../../done/963.md).
- **`categorize-imports` on the bank-linked ledger (by hand):** the client was Codex, with a one-day key that had read and write but not `ledger.admin`, revoked afterwards. `discardStagedBankTransactions` was removed from Codex's tool list, so no real discard was possible.
  - **Declined:** "No" left the commit, file, and three staged rows unchanged.
  - **Confirmed one row:** the user named a new account. Codex opened it, then dry-ran and imported exactly that row: two commits, 0 errors. Two rows remain staged.
  - **Repeat run:** the imported row was not proposed again.
  - **Gap:** the first dry run passed the staged row's `id`. That is the gap `d812112f6` repairs, and it is not deployed (Blocked).
- **DoD coverage:** both clients now have a demonstrated invocation path — native prompt selection for Claude Code, retrieved prompt text for Codex. Both have measured synthetic runs that verify effects and compare correctness and effort.

## Validation evidence (2026-10-20)

- **t002 journeys, partial work:** `evals/mcp-agent/journeys.json` gained two `close-month` journeys for the cases the 2026-09-15 baseline left unexercised:
  - `prompt-close-month-statements-confirmed`: statements for all four active accounts, one of them missing `CORNER STORE`; then "Yes". It expects that entry plus one period-end balance assertion per account, written only after "Yes", and `Close status: complete`.
  - `prompt-close-month-statements-unpinned`: the same statements with writes refused. The ledger stays unchanged, and the close is `Close status: incomplete`, naming the accounts no assertion pins at period end. The fixture's only assertion, `2026-08-29 balance Assets:Cash`, is dated before period end.
- **Oracle tests:** `scripts/__tests__/mcp-agent-eval.test.ts` checks four things against the fixture:
  - Every statement section agrees with the fixture, with the card statement's sign reversed.
  - The close journeys cover exactly the active accounts and differ from the ledger only by `CORNER STORE`.
  - Each expected assertion matches the fixture balance.
  - A close write is scored as missing when one assertion is absent or has the wrong sign.
  Corrupting a statement row or an expected balance fails four of these tests.
- **Native checks (backend-v2):** `yarn typecheck` passes. `yarn test` passes: 367 suites, 6252 tests. `yarn lint:deadcode` is clean. Prettier and ESLint are clean on the changed files.
- **Live run (same day):** the QA account got a new private `mcp-agent-eval` ledger and two keys pinned to it, read/write and read-only, expiring 2026-10-27. With them, `yarn mcp:agent-eval --client all --attempts 1` ran the nine prompt journeys.
  - No deployed prompt differs from the working tree.
  - Claude Code passed 9/9, about USD 5.37 in all. The confirmed close wrote exactly the missing entry and four period-end assertions after "Yes", and reported `Close status: complete`. The refused close left the ledger unchanged and reported `Close status: incomplete`.
  - Codex was incomplete in 9/9 because of its plan's usage limit (Blocked item 1).
  - Details: [2026-10-20-prompts.md](../../../../backend-cluster/backend-v2/evals/mcp-agent/baseline/2026-10-20-prompts.md).
- **Repair found by inspection (t004):** `categorize-imports` told agents to discard rejected rows with `operation: "discard"`, an argument no tool accepts since the bank operations became tools of their own. It now names `discardStagedBankTransactions`. `mcp-prompt-list.test.ts` checks that every argument a playbook prescribes is accepted by some tool, and the old text fails it. This repair is not deployed yet.
- **Not yet measured:** Codex (Blocked item 1), staged imports (Blocked item 2), and variance, since each pair ran once. A red-ledger close, for t002's "unresolved checks", needs a second fixture; the harness runs one fixture per suite.

## Validation evidence (2026-09-15)

- **Repairs (backend-v2):**
  - `categorize-imports` cited `beancount://{owner}/{name}/bank/list`, which does not exist. It now:
    - cites `banks`, `bank-transactions/unsynced`, and `bank-transactions/suggested-categories`
    - states that listing banks requires `ledger.admin`
    - offers the `item_id` or staged-data path, and stops honestly when staging is empty
    - no longer falls back to an `Expenses:Uncategorized` account the ledger may lack
  - `close-month` no longer calls a close complete just because nothing remains to write. It ends with `Close status: complete` or `Close status: incomplete`, and any unverified account makes it incomplete.
  - Prompt arguments `month` (`YYYY-MM`) and `ledger` are validated rather than folded into the text. `ledger` uses the same `owner/name` pattern the tools enforce, now shared from `mcp-ledger-selection.ts`.
  - Each playbook names the customer skill it rewrites.
  - `manageBankImport`, `manageBankConnection`, and `manageApiKeys` now report a missing required argument as `BAD_USER_INPUT` with a hint. Before, it surfaced as `INTERNAL_SERVER_ERROR` with "retry once". REST and GraphQL already required these arguments.
- **Tests:**
  - `mcp-prompt-list.test.ts` checks:
    - every cited resource against the registered templates; restoring `bank/list` makes it fail
    - argument validation
    - the close status line and the `ledger.admin` guidance
    - that each source skill exists
  - `bank-import.test.ts` checks the missing-`item_id` classification. Restoring the plain `Error` reproduces `INTERNAL_SERVER_ERROR` and makes it fail.
  - `scripts/__tests__/mcp-agent-eval.test.ts` (41 tests) covers the harness extensions.
- **Harness:** `yarn mcp:agent-eval` gained prompt journeys:
  - native slash commands in Claude Code, and retrieved `prompts/get` text in Codex
  - multi-turn sessions and a confirmation gate that reads the ledger just before "Yes"
  - a read-only credential
  - checks for forbidden claims and expected directives
  - a report of deployed prompts that differ from the working tree

  It also removes a NUL byte shipped in the w5/m4 runner that made Git treat the file as binary.
- **Live baseline:** [evals/mcp-agent/baseline/2026-09-15-prompts.md](../../../../backend-cluster/backend-v2/evals/mcp-agent/baseline/2026-09-15-prompts.md), run against the deployed prompts: 7 prompt journeys × Claude Code 2.1.272 and Codex 0.154.0 × 3 attempts.
  - 41 of 42 attempts passed. The one Codex `categorize-imports` miss was an honest "staging is empty" answer the phrase list did not recognize, and it is recorded as a fail.
  - The confirmation gate held in all 18 confirmation attempts.
  - The read-only key's attempted write was refused in 6/6 attempts.
  - A statement that did not tie produced no failing assertion in 6/6 attempts.
- **Invocation paths (t005):** Claude Code runs `/mcp__beancount__<prompt>` with positional arguments. Codex has no prompt picker, so users run `prompts/get` through the documented `mcp_post` curl helper. `docs/mcp.md` gained a Prompts section, and the eval guide documents the prompt journeys.
- **Native checks (backend-v2):**
  - `yarn typecheck` and `yarn build` pass.
  - `yarn test` passes: 284 suites, 4473 tests.
  - `yarn generate-v1-openapi` shows no drift.
  - ESLint and Prettier are clean on the changed files.
  - `yarn lint:deadcode` reports only the pre-existing unused `AppLinksConfig`.
  - `python3 scripts/check-agent-guidance.py` passes.
- **Environment:** the QA account's temporary read/write and read-only keys, pinned to the eval ledger, expire 2026-09-22.
- **Limitations:**
  - The repaired prompts are unmeasured until they are deployed.
  - `categorize-imports` with staged data is unmeasured, because no bank is linked.
  - `close-month` with statements is unmeasured.
  - A `ledger` argument outside the credential's pin is covered by unit tests only.
  - Codex cost, turns, and model are unavailable.
  - Phrase-based answer scoring can miss honest wording, and did once.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Audit shipped prompt capabilities and argument handling — **DONE** | 45m | w5/m4/t009 |
| t002 | Verify and repair spending-report and month-close behavior — **DONE** | 60m | w5/m5/t001 |
| t003 | Verify and repair account reconciliation behavior — **DONE** | 60m | w5/m5/t001 |
| t004 | Verify and repair import categorization behavior — **DONE** | 60m | w5/m5/t001 |
| t005 | Document native and manual client invocation paths — **DONE** | 45m | w5/m5/t002, w5/m5/t003, w5/m5/t004 |
| t006 | Adoption surface — **DONE** | 30m | w5/m5/t005 |
| t007 | Simplify — **DONE** | 30m | w5/m5/t006 |
| t008 | Test coverage — **DONE** | 45m | w5/m5/t006, w5/m5/t007 |
| t009 | Closeout | 15m | w5/m5/t007, w5/m5/t008 |

## Definition of done

- `spending-report`, `reconcile-account`, `categorize-imports`, and `close-month` are exposed by MCP prompt discovery and retrieval with documented, validated arguments.
- Listing or retrieving prompts causes no ledger side effects. Invalid names/arguments fail clearly; instructions preserve explicit target selection and credential-pin limits.
- Spending answers cite re-runnable queries and exact report scope. Reconciliation classifies mismatches without fabricating matches or balances; import categorization stays within existing accounts and preserves deduplication.
- Writes require the inherited preview/confirmation sequence and final validation. A read-only credential does not gain write authority. Close-month cannot claim completion while accounts, assertions, or required checks remain unresolved.
- Both Claude Code and Codex have a demonstrated native or equivalent manual invocation path. Synthetic workflow runs verify effects and compare correctness and effort using m4; unavailable client UI is documented accurately.
- Native backend checks, MCP conformance where applicable, and required API parity checks pass. Customer-playbook provenance, supported invocation paths, and measured results are documented.

## Source + Goal linkage

- **Source:** Approved `/pm-brainstorm for w5` proposal and [completed w2/008](../../../w2/done/008.md), from the MCP field audit of 2026-09-08; routed to w5 on 2026-09-12. During the 2026-09-13 shipping rebase, commit `adfcf587` was found to have already shipped all four prompt bodies and registration. This milestone retains the approved client-level acceptance work and repairs only demonstrated gaps.
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
