# MCP agent journeys

`yarn mcp:agent-eval` runs three ordinary ledger tasks through real Claude Code and Codex sessions connected to the hosted Beancount.io MCP endpoint. It checks each answer against a synthetic fixture, reads the ledger back to see what the agent changed, and records how much effort the task took.

Use it to compare real agent behavior before and after changing MCP tools, resources, prompts, or server instructions. It is not a CI check: every attempt is a live, billed client session. The scorers, transcript parsers, and process limits have deterministic tests in `scripts/__tests__/mcp-agent-eval.test.ts`, which run with `yarn test`.

## The journeys

The journeys come from the 2026-09-08 MCP field audit. Prompts, expected facts, and the fixture live in [`evals/mcp-agent/`](../evals/mcp-agent/).

| Id                               | The agent is asked to                                                                                        | Ledger                                |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| `cash-food-purchase`             | Report the cash balance and August food spending, then record one authorized 4.50 USD cash purchase          | exactly that one transaction is added |
| `report-networth-stale-validity` | Give an August spending report, net worth, accounts without recent postings, and whether the ledger is valid | unchanged                             |
| `discovery-recent-payees`        | Find the accessible ledgers, list the five most recent transactions, and list every payee                    | unchanged                             |

An attempt **passes** only when both of these hold:

- The final answer contains every expected figure and name. Numbers are compared to the cent regardless of formatting, so `$2,095.60` matches `2095.60`.
- The ledger read back afterwards is exactly as permitted. For a read-only journey that means byte-for-byte unchanged. For the purchase journey it means one matching transaction added, nothing else edited, no extra files, and no validation errors.

A confident "done" with a wrong total **fails**. A client that is missing, times out, exceeds the call limit, never connects, or produces no answer is **incomplete**. When the harness cannot reset or read the ledger, the attempt is an **error**. An unreadable ledger is never treated as unchanged.

## One-time setup

1. **Use a dedicated QA account on Beancount.io,** not a personal one. Minting API keys requires a paid plan.
2. **Create a private ledger named `mcp-agent-eval`** (or `mcp-agent-eval-<suffix>`) on that account.
3. **Mint an API key with `ledger.read` and `ledger.write`,** restricted to `<owner>/mcp-agent-eval` and with a short expiry, as described in [Personal API key](./mcp.md#personal-api-key).
4. **Install Claude Code and Codex and sign in to both.**

Every attempt overwrites the eval ledger. The harness therefore refuses to start unless the key reaches exactly one ledger and that ledger has the dedicated name.

Run against the hosted endpoint. Do not build or start a second deployment only for this benchmark (see [`.pm/DO_NOT_DO.md`](../../../.pm/DO_NOT_DO.md)). `--url` exists for pointing at a different complete deployment you already operate.

## Run

```zsh
cd backend-cluster/backend-v2
read -rs "BEANCOUNT_MCP_TOKEN?API key: " && export BEANCOUNT_MCP_TOKEN
export BEANCOUNT_MCP_LEDGER=<owner>/mcp-agent-eval
yarn mcp:agent-eval --attempts 3                                    # every journey, both clients
yarn mcp:agent-eval --client codex --journey cash-food-purchase     # one pair while iterating
```

| Option                            | Default                                | Meaning                                                                          |
| --------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------- |
| `--client`                        | `all`                                  | `claude`, `codex`, or `all`                                                      |
| `--journey`                       | `all`                                  | A journey id or `all`                                                            |
| `--attempts`                      | `1`                                    | Attempts per journey and client                                                  |
| `--timeout-sec`                   | `300`                                  | Wall-clock limit per attempt                                                     |
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

The first baseline is [`evals/mcp-agent/baseline/2026-09-15.md`](../evals/mcp-agent/baseline/2026-09-15.md).

The field audit's 11, 21, and 15 turns (2026-09-08) are historical provenance. They came from different prompts, one client, and a local stack, so they are not comparable to these runs. A Plaid sandbox bank-import journey remains a deferred follow-up in [`.pm/w2/009.md`](../../../.pm/w2/009.md).
