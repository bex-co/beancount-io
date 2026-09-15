# MCP agent journeys

`yarn mcp:agent-eval` runs ordinary ledger tasks and the four MCP prompt playbooks through real Claude Code and Codex sessions connected to the hosted Beancount.io MCP endpoint. It checks each answer against a synthetic fixture, reads the ledger back to see what the agent changed, and records how much effort the task took.

Use it to compare real agent behavior before and after changing MCP tools, resources, prompts, or server instructions. It is not a CI check: every attempt is a live, billed client session. The scorers, transcript parsers, and process limits have deterministic tests in `scripts/__tests__/mcp-agent-eval.test.ts`, which run with `yarn test`.

## The journeys

The journeys come from the 2026-09-08 MCP field audit. Prompts, expected facts, and the fixture live in [`evals/mcp-agent/`](../evals/mcp-agent/).

| Id                               | The agent is asked to                                                                                        | Ledger                                |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| `cash-food-purchase`             | Report the cash balance and August food spending, then record one authorized 4.50 USD cash purchase          | exactly that one transaction is added |
| `report-networth-stale-validity` | Give an August spending report, net worth, accounts without recent postings, and whether the ledger is valid | unchanged                             |
| `discovery-recent-payees`        | Find the accessible ledgers, list the five most recent transactions, and list every payee                    | unchanged                             |

The prompt journeys select one of the server's [MCP prompts](./mcp.md#prompts) instead of typing a request. Claude Code selects the prompt natively as a slash command. Codex has no prompt picker, so it receives the text the harness retrieves with `prompts/get`. The report labels these runs `native prompt` and `retrieved prompt`. Follow-up messages, such as a pasted statement or a confirmation, continue the same session.

| Id                                      | Prompt and follow-ups                                                                          | Ledger                                                                    |
| --------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `prompt-spending-report`                | `spending-report` for 2026-08, then the question (total and per account)                       | unchanged                                                                 |
| `prompt-close-month-no-statements`      | `close-month` for 2026-08, with no statements given                                            | unchanged; the answer must not claim a finished close                     |
| `prompt-reconcile-mismatch-unconfirmed` | `reconcile-account` for `Assets:Cash`, then a statement with date drift and an amount mismatch | unchanged                                                                 |
| `prompt-reconcile-missing-confirmed`    | `reconcile-account`, a statement with one missing entry, then "Yes"                            | the missing transaction and a balance assertion, written only after "Yes" |
| `prompt-reconcile-balance-does-not-tie` | `reconcile-account`, a statement whose ending balance does not tie, then \"Yes\"               | unchanged; the difference is reported and no failing assertion is written |
| `prompt-categorize-no-bank`             | `categorize-imports` with no linked bank                                                       | unchanged; the agent says there is nothing to categorize                  |
| `prompt-reconcile-read-only-credential` | the confirmed reconciliation, with a read-only key                                             | unchanged; the agent reports the refusal                                  |

An attempt **passes** only when all of these hold:

- The final answer contains every expected figure and name. Numbers are compared to the cent regardless of formatting, so `$2,095.60` matches `2095.60`.
- The answers contain no claim the journey forbids, such as a finished close.
- The ledger read back afterwards is exactly as permitted. For a read-only journey that means byte-for-byte unchanged. For a writing journey it means exactly the authorized transaction and directives were added, nothing else was edited, there are no extra files, and there are no validation errors.
- For a journey with a confirmation, the ledger was still untouched just before the harness sent the confirmation.

A confident "done" with a wrong total **fails**. A client that is missing, times out, exceeds the call limit, never connects, or produces no answer is **incomplete**. When the harness cannot reset or read the ledger, the attempt is an **error**. An unreadable ledger is never treated as unchanged.

## One-time setup

1. **Use a dedicated QA account on Beancount.io,** not a personal one. Minting API keys requires a paid plan.
2. **Create a private ledger named `mcp-agent-eval`** (or `mcp-agent-eval-<suffix>`) on that account.
3. **Mint an API key with `ledger.read` and `ledger.write`,** restricted to `<owner>/mcp-agent-eval` and with a short expiry, as described in [Personal API key](./mcp.md#personal-api-key).
4. **Install Claude Code and Codex and sign in to both.**
5. **For `prompt-reconcile-read-only-credential`, mint a second key** with only `ledger.read`, restricted to the same ledger.

Every attempt overwrites the eval ledger. The harness therefore refuses to start unless the key reaches exactly one ledger and that ledger has the dedicated name.

Run against the hosted endpoint. Do not build or start a second deployment only for this benchmark (see [`.pm/DO_NOT_DO.md`](../../../.pm/DO_NOT_DO.md)). `--url` exists for pointing at a different complete deployment you already operate.

## Run

```zsh
cd backend-cluster/backend-v2
read -rs "BEANCOUNT_MCP_TOKEN?API key: " && export BEANCOUNT_MCP_TOKEN
export BEANCOUNT_MCP_LEDGER=<owner>/mcp-agent-eval
read -rs "BEANCOUNT_MCP_READONLY_TOKEN?Read-only API key: " && export BEANCOUNT_MCP_READONLY_TOKEN   # only for the read-only journey
yarn mcp:agent-eval --attempts 3                                    # every journey, both clients
yarn mcp:agent-eval --client codex --journey cash-food-purchase     # one pair while iterating
```

Without `BEANCOUNT_MCP_READONLY_TOKEN`, the read-only journey is reported as incomplete rather than skipped.

| Option                            | Default                                | Meaning                                                                          |
| --------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------- |
| `--client`                        | `all`                                  | `claude`, `codex`, or `all`                                                      |
| `--journey`                       | `all`                                  | Journey ids, comma-separated, or `all`                                           |
| `--attempts`                      | `1`                                    | Attempts per journey and client                                                  |
| `--timeout-sec`                   | `300`                                  | Wall-clock limit per client turn                                                 |
| `--max-mcp-calls`                 | `40`                                   | MCP calls after which an attempt is stopped                                      |
| `--claude-model`, `--codex-model` | client default                         | Model to request; a Claude Code run that reports a different model is incomplete |
| `--claude-bin`, `--codex-bin`     | installed client on `PATH`             | Client executable                                                                |
| `--url`                           | `https://beancount.io/api-gateway/mcp` | MCP endpoint                                                                     |
| `--out`                           | `tmp/mcp-agent-eval/runs/<time>`       | Report directory                                                                 |

The exit status is `0` when every attempt passed and the fixture was restored, `1` otherwise, `2` for a usage or safety refusal, and `130` after Ctrl-C.

## What happens during a run

- **Before each attempt,** the harness restores the fixture with `editLedgerFiles`, then confirms the read-back content, the file list, and `checkLedger`. It skips the commit when the ledger already matches.
- **Each client runs in a fresh temporary directory and its own process group.**
  - A timeout, the call limit, or Ctrl-C terminates the whole group, helpers included, and marks the attempt incomplete.
  - The ledger is still read back, because an interrupted write is still a write.
- **Claude Code** gets only the eval server (`--mcp-config` with `--strict-mcp-config`) and may call only its tools.
- **Codex** runs with `--ignore-user-config`, a read-only sandbox, and the eval server configured on the command line.
- **Follow-up messages** resume the same session: `claude -p … --resume <session>` and `codex exec resume <thread> …`. Before a confirmation message, the harness reads the ledger to prove nothing was written early.
- **The read-only journey** passes `BEANCOUNT_MCP_READONLY_TOKEN` to the client in place of the read/write key. The harness still resets and reads the ledger with the read/write key.
- **The key reaches each client only through the `BEANCOUNT_MCP_TOKEN` environment variable,** never on a command line.
- **Clients resolve from `PATH` with `node_modules` directories skipped.** This package depends on an older `@openai/codex`, which `yarn` would otherwise run in place of the installed client.
- **After the last attempt,** the fixture is restored again. A failed restore is reported and makes the exit status nonzero.
- **Reports** go to `report.md`, `report.json`, and `transcripts/*.jsonl` in the output directory. API keys, the account owner, and your home directory are redacted.

The report records the endpoint's server name and version, each client's version and executable, the model (when the client reports it), limits, attempt counts, outcomes, median wall time, and mean MCP calls. It also records turns and cost where Claude Code reports them, and input and output tokens. `n/a` means the client does not report that metric, not zero. The hosted endpoint does not expose a deployed revision, so the report says so rather than guessing.

## When to compare

Run a comparison when a change touches:

- MCP tool or resource registration, descriptions, or input and output schemas
- server instructions or prompts
- the result envelope

The hosted endpoint serves deployed code, so capture a run before the change is deployed and another after it. Compare runs with the same attempts, client versions, and models. Treat one attempt as an anecdote. A difference means something only when it holds across repeated attempts.

## Baseline

The first baseline is [`evals/mcp-agent/baseline/2026-09-15.md`](../evals/mcp-agent/baseline/2026-09-15.md). The prompt playbooks have their own baseline in [`evals/mcp-agent/baseline/2026-09-15-prompts.md`](../evals/mcp-agent/baseline/2026-09-15-prompts.md), recorded against the prompts as deployed before this change's repairs.

The field audit's 11, 21, and 15 turns (2026-09-08) are historical provenance. They came from different prompts, one client, and a local stack, so they are not comparable to these runs. A Plaid sandbox bank-import journey remains a deferred follow-up in [`.pm/w2/009.md`](../../../.pm/w2/009.md).
