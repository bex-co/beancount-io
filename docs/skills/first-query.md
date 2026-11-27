# First query: from install to an answer

Get your first answer from a coding agent using a small synthetic ledger that ships with `beancount-ask`. You don't need an account, a hosted service, or real financial data, and the ledger is never modified.

## 1. Install and verify

Follow one method in [Install the Beancount skills](installation.md) through its discovery check. You need `bea` on your `PATH` and the complete suite installed for Claude Code, Codex, or both. For a project-scoped channel install, create a fresh synthetic workspace and run `git init -q` there before installing; stay in that workspace for the steps below. On native Windows, follow the guide's [Windows (PowerShell)](installation.md#windows-powershell) section instead, including [bea on Windows](installation.md#bea-on-windows).

## 2. Create a workspace with the sample ledger

```sh
SKILLS_SRC="${XDG_DATA_HOME:-$HOME/.local/share}/beancount-io"
mkdir -p ~/beancount-first-query && cd ~/beancount-first-query
git init -q
cp "$SKILLS_SRC/skills/beancount-ask/evals/files/eval1_ledger.beancount" ledger.beancount
shasum -a 256 ledger.beancount > ledger.sha256
bea --file ledger.beancount --json --no-input check
```

For a project-scoped `npx skills` or `gh skill` install, use its installed
fixture from the same fresh workspace instead of the linked checkout:

```sh
test ! -e ledger.beancount &&
  cp .agents/skills/beancount-ask/evals/files/eval1_ledger.beancount ledger.beancount &&
  shasum -a 256 ledger.beancount > ledger.sha256 &&
  bea --file ledger.beancount --json --no-input check
```

The guard stops if a ledger already exists. The check validates the sample
and completes `bea`'s first-use engine setup before the sandboxed question.

On native Windows, in Windows PowerShell:

```powershell
$SKILLS_SRC = Join-Path $env:LOCALAPPDATA 'beancount-io'
$WS = Join-Path $HOME 'beancount-first-query'
New-Item -ItemType Directory -Force "$WS" | Out-Null
Set-Location "$WS"
git init -q
Copy-Item "$SKILLS_SRC/skills/beancount-ask/evals/files/eval1_ledger.beancount" ledger.beancount
(Get-FileHash ledger.beancount -Algorithm SHA256).Hash | Set-Content ledger.sha256
bea --file ledger.beancount --json --no-input check
```

The Windows rehearsal linked the suite into the workspace itself, the only scope where both agents were tried on Windows. To do the same, run `python "$SKILLS_SRC/scripts/skills/beancount-skills.py" install "$WS\.claude\skills" "$WS\.agents\skills"` there, and `uninstall` with the same directories when you are done.

The ledger covers April–June 2026: salary, groceries, gas, a streaming subscription, savings transfers, and credit-card payments. Codex expects a Git repository, so the workspace gets one.

## 3. Ask the question

Start `claude` or `codex` in `~/beancount-first-query` and ask:

> What were my biggest expenses in June 2026? Ledger is ./ledger.beancount.

Or run it without an interactive session (on Windows, use the [Windows variants](installation.md#agents-on-windows)):

```sh
claude -p "What were my biggest expenses in June 2026? Ledger is ./ledger.beancount." \
  --allowedTools "Skill" "Read" "Bash(bea:*)"
```

For Codex on macOS or Linux, don't use `--sandbox read-only`: it stops `bea`
from creating the temporary files its query engine needs. This command grants
writes only to a fresh scratch directory. The ledger stays read-only and
network access stays off. [Codex: allow scratch files](#codex-allow-scratch-files-while-keeping-the-ledger-read-only)
explains the profile and the older Codex settings that override it.

```sh
BEA_QUERY_TMP="$(mktemp -d)"
TMPDIR="$BEA_QUERY_TMP" XDG_CACHE_HOME="$BEA_QUERY_TMP/cache" \
BEA_CONFIG_DIR="$BEA_QUERY_TMP/config" \
codex exec -c 'default_permissions="bea_query"' \
  -c 'permissions.bea_query={filesystem={":root"="read",":tmpdir"="write"},network={enabled=false}}' \
  "What were my biggest expenses in June 2026? Ledger is ./ledger.beancount."
rm -rf "$BEA_QUERY_TMP"
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

In Windows PowerShell, this prints `True`:

```powershell
(Get-FileHash ledger.beancount -Algorithm SHA256).Hash -eq (Get-Content ledger.sha256)
```

## If something goes wrong

- **The agent doesn't use the skill or says it has none:** run `verify` from [the installation guide](installation.md#3-confirm-the-agents-see-them), then start a new session.
- **`bea: command not found`:** install `bea` as described in the [prerequisites](installation.md#prerequisites), then open a new terminal.
- **The agent asks permission to run `bea`:** allow it. The query only reads the ledger.
- **Codex says `bea` found no usable temporary directory:** it ran under `--sandbox read-only`. Use the Codex command in step 3 instead.
- **Different numbers:** make sure you asked about June 2026 and that the checksum check in step 4 passes.
- **On Windows, Claude Code is denied `bea` or cannot read the skill's references, or Codex reports `blocked by policy`:** use the flags in [Agents on Windows](installation.md#agents-on-windows).

### Codex: allow scratch files while keeping the ledger read-only

Codex's `--sandbox read-only` refuses every write, including the temporary
files `bea`'s query engine creates, so `bea query` stops with
`No usable temporary directory found`. This happens on macOS and on Linux.
Step 3's Codex command uses a
[named permission profile](https://developers.openai.com/codex/permissions)
instead. It grants writes only to a fresh scratch directory. The workspace stays
read-only and command network access stays disabled. Before using this profile,
remove a legacy `sandbox_mode` setting from your Codex configuration and omit
`--sandbox`; those older settings override named profiles. Keep user configuration
loaded for a plugin install: `--ignore-user-config` also hides its registration.
For linked or copied skills, that flag is an alternative to removing an old
`sandbox_mode` setting.

On native Windows, use the [Windows variant](installation.md#agents-on-windows)
instead. Codex answered the first query there under `--sandbox read-only` with
the unelevated Windows sandbox.

## Tested with

On 2026-09-14 on macOS, Claude Code 2.1.270 (workspace install) and Codex 0.154.0 (user and workspace installs, `--sandbox read-only`) each listed exactly these eight skills and returned the figures above through `beancount-ask`. The ledger checksum was unchanged. Not yet tested: Claude Code with a user-level install, and Linux.

On 2026-10-20 on macOS, standalone ClawHub `beancount-ask@1.0.0` also returned these figures through real OpenClaw 2026.10.5 and Hermes v0.22.2 agent turns using published `bea` 0.3.1 and `gpt-6.1-sol`. Both agents showed the command they executed and preserved the ledger checksum. OpenClaw used its explicitly selected embedded runtime; Hermes used its `openai-codex` provider.

Workspace discovery was also rechecked on 2026-10-20 with the current eleven-skill suite: Claude Code 2.1.304's startup catalog and Codex 0.163.0's `skills/list` both expose all eleven linked source skills. Codex's loaded descriptions match the source. These are discovery checks, separate from the dated query rehearsals above.

On 2026-10-28 on native Windows 11 (ARM64, Windows PowerShell 5.1), Claude Code 2.1.312 and Codex 0.165.0 with a workspace install each listed the suite's fourteen skills. Each returned the figures above through `beancount-ask` and published `bea` 0.3.1, installed with `uv tool install`. The ledger checksum was unchanged. It took the corrections in [bea on Windows](installation.md#bea-on-windows) and [Agents on Windows](installation.md#agents-on-windows). User-level installs on Windows and WSL were not tested.

On 2026-11-08, Codex 0.167.0 (`gpt-6.1-sol`) on Linux returned the figures
above from both a Skills CLI 1.7.6 project install and a GitHub CLI 2.96.0
local-source project install. The installers ran on macOS and populated both
client destinations with all sixteen workflows. The Linux command used the
scratch-only permission profile above; native write-denial sentinels and the
ledger checksum both passed. These are Codex answer results; the earlier
Claude results keep their original dates. See the [channel record](suite-distribution.md#codex-first-query-completion-for-git-copy-channels--2026-11-08)
for the remote `gh` download limits and exact rehearsal scope.

On 2026-11-26 on macOS, step 4's query ran with published `bea` 0.5.0 inside
Codex CLI 0.163.0's own sandbox (`codex sandbox`, no model turn). Under the
`--sandbox read-only` policy it stopped with
`No usable temporary directory found`. Under step 3's scratch-only profile it
returned the three figures above, a write to `ledger.beancount` was refused,
a network request failed, and the ledger checksum was unchanged. The same
profile carried a full Codex CLI 0.171.0 answer turn on macOS on 2026-11-25 in
the [existing-ledger guide](existing-ledger.md#tested-with). A Codex answer
turn for this guide's question on macOS under the profile is not yet recorded.

## Continue through a first month

The [first-month guide](first-month.md) starts from a fresh ledger and walks through approved imports, duplicate checks, reconciliation, read-only analysis, and a confirmed close. It includes synthetic statements, decline branches, and an independent checkpoint verifier.
