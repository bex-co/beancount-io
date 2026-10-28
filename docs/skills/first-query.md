# First query: from install to an answer

Get your first answer from a coding agent using a small synthetic ledger that ships with `beancount-ask`. You don't need an account, a hosted service, or real financial data, and the ledger is never modified.

## 1. Install and verify

Follow [Install the Beancount skills](installation.md) through step 3. You need `bea` on your `PATH` and the suite linked into Claude Code (`~/.claude/skills`), Codex (`~/.agents/skills`), or both.

## 2. Create a workspace with the sample ledger

```sh
SKILLS_SRC="${XDG_DATA_HOME:-$HOME/.local/share}/beancount-io"
mkdir -p ~/beancount-first-query && cd ~/beancount-first-query
git init -q
cp "$SKILLS_SRC/skills/beancount-ask/evals/files/eval1_ledger.beancount" ledger.beancount
shasum -a 256 ledger.beancount > ledger.sha256
```

The ledger covers April–June 2026: salary, groceries, gas, a streaming subscription, savings transfers, and credit-card payments. Codex expects a Git repository, so the workspace gets one.

## 3. Ask the question

Start `claude` or `codex` in `~/beancount-first-query` and ask:

> What were my biggest expenses in June 2026? Ledger is ./ledger.beancount.

Or run it without an interactive session. These commands allow only reads and the `bea` query (on Windows, use the [Windows variants](installation.md#agents-on-windows)):

```sh
claude -p "What were my biggest expenses in June 2026? Ledger is ./ledger.beancount." \
  --allowedTools "Skill" "Read" "Bash(bea:*)"
codex exec --sandbox read-only "What were my biggest expenses in June 2026? Ledger is ./ledger.beancount."
```

## 4. Check the answer

The agent uses `beancount-ask` and answers with these figures for 2026-06-01 to 2026-06-30:

| Account | June 2026 |
| ------- | --------- |
| Expenses:Food:Groceries | 141.60 USD |
| Expenses:Transport:Gas | 50.00 USD |
| Expenses:Entertainment:Streaming | 17.99 USD |

The 500.00 USD savings transfer and the credit-card payment are not expenses, so they do not appear. The answer includes the query it ran, which you can re-run. The agent may word its query differently, but the figures must match. This one returns the same rows:

```sh
bea --file ledger.beancount --json query "SELECT account, sum(weight) AS total WHERE account ~ '^Expenses:' AND date >= 2026-06-01 AND date < 2026-07-01 GROUP BY account ORDER BY total DESC"
```

Confirm the ledger is byte-for-byte unchanged:

```sh
shasum -a 256 -c ledger.sha256   # ledger.beancount: OK
```

## If something goes wrong

- **The agent doesn't use the skill or says it has none:** run `verify` from [the installation guide](installation.md#3-confirm-the-agents-see-them), then start a new session.
- **`bea: command not found`:** install `bea` as described in the [prerequisites](installation.md#prerequisites), then open a new terminal.
- **The agent asks permission to run `bea`:** allow it. The query only reads the ledger.
- **Different numbers:** make sure you asked about June 2026 and that `shasum -a 256 -c ledger.sha256` reports `OK`.

## Tested with

On 2026-09-14 on macOS, Claude Code 2.1.270 (workspace install) and Codex 0.154.0 (user and workspace installs, `--sandbox read-only`) each listed exactly these eight skills and returned the figures above through `beancount-ask`. The ledger checksum was unchanged. Not yet tested: Claude Code with a user-level install, and Linux.

On 2026-10-20 on macOS, standalone ClawHub `beancount-ask@1.0.0` also returned these figures through real OpenClaw 2026.10.5 and Hermes v0.22.2 agent turns using published `bea` 0.3.1 and `gpt-6.1-sol`. Both agents showed the command they executed and preserved the ledger checksum. OpenClaw used its explicitly selected embedded runtime; Hermes used its `openai-codex` provider. See the [registry rehearsal](clawhub-rehearsal.md#real-host-turns--2026-10-20) for the tested setup and remaining host compatibility limits.

Workspace discovery was also rechecked on 2026-10-20 with the current eleven-skill suite: Claude Code 2.1.304's startup catalog and Codex 0.163.0's `skills/list` both expose all eleven linked source skills. Codex's loaded descriptions match the source. These are discovery checks, separate from the dated query rehearsals above.

On 2026-10-28 on native Windows 11 (ARM64, Windows PowerShell 5.1), Claude Code 2.1.312 and Codex 0.165.0 with a workspace install each listed the suite's fourteen skills. Each returned the figures above through `beancount-ask` and published `bea` 0.3.1, installed with `uv tool install`. The ledger checksum was unchanged. Three corrections were needed: a manual one-time engine install, because `bea` 0.3.1's own install failed on that host; `"PowerShell(bea:*)"` and `--add-dir` for Claude Code; and `-c 'windows.sandbox="unelevated"'` for Codex `--sandbox read-only`. See [bea on Windows](installation.md#bea-on-windows), [Agents on Windows](installation.md#agents-on-windows) and the [Windows rehearsal](windows-rehearsal.md#agent-discovery-and-first-query-t004). User-level installs on Windows and WSL were not tested.

## Continue through a first month

The [first-month guide](first-month.md) starts from a fresh ledger and walks through approved imports, duplicate checks, reconciliation, read-only analysis, and a confirmed close. It includes synthetic statements, decline branches, and an independent checkpoint verifier. [Real-client rehearsals](first-month-rehearsal.md) record results and interventions for both Claude Code and Codex.
