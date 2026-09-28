# Installed first-month rehearsal

This record covers real agent sessions on synthetic local ledgers using the
[first-month guide](first-month.md). It is separate from deterministic verifier
and command tests; no hosted ledger or production financial data was used.

## Environment and reproduction

- Run date: 2026-09-27 in America/Denver (2026-09-28 UTC).
- Platform: macOS 26.5.1, arm64. Source baseline: `5bee9c7eae3f65b72357a10ced6839cf75871742`.
- CLI: published `beancount-io==0.3.0`, installed in an isolated uv tool environment.
- Claude Code: `2.1.283`. Codex CLI: `0.157.1`.
- Each client uses its own synthetic Git repository and the customer installer,
  linking all eight customer skills into `.claude/skills` and `.agents/skills`.
- Follow the guide in order, including user approvals and verifier commands.
  Start fresh sessions with physically separate inputs for unresolved and missing
  statements. Keep logs and snapshots outside each inspected workspace.
- Use the exported absolute `BEA` executable in every agent session. Tool access
  does not grant accounting approval; writes and commits wait for the separate
  documented confirmation.

## Demonstrated guide correction

Codex launched a login shell that resolved an older global `bea` despite the
parent process's `PATH`. Before approving ledger writes, the operator bound the
session to the exported `BEA` executable and verified version 0.3.0. The guide
now includes this runtime instruction for every session. Claude had already used
0.3.0 for initialization; the same instruction reinforced its runtime binding
before imports. No ledger was repaired to hide this setup issue.

## Results

Claude completed all eleven checkpoints in 11m 43s (8m 55s to reconciled), using
`claude-opus-5-5`. Its 23 client calls included discovery, confirmations, repeated
proposals, and three separate sessions. Two operator interventions were needed:
the shared runtime instruction above and a reconciliation review correction.

The reconciliation preview twice wrote an incorrect arithmetic expression in its
prose, although the queried starting balance, proposed transaction, and assertion
were correct. Approval was withheld. A fresh query confirmed 2945.00 USD and the
agent corrected the calculation to 2945.00 − 3.00 = 2942.00 before approval.
The operator did not edit the ledger. Claude also recovered from exploratory BQL
errors by using supported queries and inspecting the complete single-file ledger.

Codex completed all eleven checkpoints in 13m 21s, using `gpt-6-astra`.
Its one operator intervention was the runtime binding before initialization.
After import approval, a cache-lock permission error blocked the first ledger import;
the agent retried with `XDG_CACHE_HOME` set to writable temporary storage outside
the books. This was an autonomous recovery, with no ledger repair or extra
installation.

| Checkpoint | Claude Code | Codex |
| --- | --- | --- |
| initialized | PASS | PASS |
| declined_import | PASS | PASS |
| imported | PASS | PASS |
| reimported | PASS | PASS |
| unresolved_statement | PASS + transcript reviewed | PASS + transcript reviewed |
| missing_statement | PASS + transcript reviewed | PASS + transcript reviewed |
| declined_reconcile | PASS | PASS |
| reconciled | PASS | PASS |
| asked | PASS | PASS |
| declined_commit | PASS | PASS |
| closed | PASS | PASS |

Both runs discovered all eight installed customer skills: `beancount-ask`,
`beancount-close`, `beancount-import`, `beancount-importer-author`,
`beancount-init`, `beancount-migrate`, `beancount-options`, and
`beancount-reconcile`. Required confirmations are part of the guide and are not
counted as interventions; extra corrective instructions are. Elapsed time
includes operator review, verifier commands, and separate statement branches.

## Reconciliation preview replay

After the preview correction above, beancount-reconcile began requiring
preview balances and residuals to come from one executed `bea query`. The query's
decimal arithmetic is shown, and prose must copy its operands and results. The
reconcile checkpoint was then replayed on 2026-09-28 from source baseline
`d140098b` plus that instruction change. The replay used `beancount-io==0.3.0`,
Claude Code `2.1.283` (`claude-opus-5-5`), and Codex CLI `0.157.1`. Codex ran
with its default model because user config was ignored; the event stream did
not report the model name. Each client had separate synthetic workspaces,
seeded from reconcile evals 12 and 13 with the imported August ledger, and the
installed customer suite.

| Branch | Claude Code | Codex |
| --- | --- | --- |
| preview, then decline (2942.00 statement) | PASS, 63s | PASS, 90s |
| unresolved (2941.00 claimed) | PASS, 42s | PASS, 66s |
| corrective interventions | 0 | 0 |

Both previews quoted the executed read `ledger 2945.00, projected 2942.00,
residual 0.00` and stated `2945.00 − 3.00 = 2942.00` before proposing the
2026-09-01 assertion for 2942.00 USD. In both, declining left file hashes
(including untracked files), HEAD, and index bytes unchanged. Both unresolved
branches reported the executed residual `-4.00`: the ledger holds 4.00 USD more
than the claimed balance. Neither proposed an assertion, fee, or pad, and both
left the workspace unchanged. Each client routed the fee to
`Expenses:Uncategorized`, flagged for refinement, because the ledger has no
earlier Synthetic Bank entry. That follows the skill's categorization rule.
Times are wall-clock per branch, including agent tool calls, with near-instant
operator review. This is one supervised replay per client of one checkpoint.
It shows that the observed error did not recur here. It does not establish
general arithmetic reliability.

## What the checkpoints establish

The initialized ledger contains one 1000 USD opening transaction. The import adds
exactly three source-identified transactions and yields 2945 USD. Reimport is an
exact no-op. Reconciliation adds the documented 3 USD fee and a 2942 USD checking
assertion dated 2026-09-01. Analysis reports groceries 50, dining 5, fees 3, income
2000, expenses 58, and net income 1942 USD; its displayed reads were rerun.

Each decline preserves all workspace files, HEAD, and index bytes, including
untracked files. The unresolved branch reports the unexplained 4 USD difference
and an unpinned assertion; the missing-statement branch reports checking as
unverified. Both preserve their imported ledgers. Transcript review establishes
these honest reports separately from the verifier's file checks.

The final close requires one commit containing only `main.bean`, correct report
fields, and an explicit admission that recurring history is unavailable. No
synthetic repository is pushed. Raw transcripts and snapshots stay in ignored
scratch directories; only this synthetic summary is published.

## Limits

These are supervised rehearsals, one run per client on macOS, not a reliability
benchmark or a production adoption rate. Linux, Windows, other model versions,
user-level skill installs, and hosted workflows were not exercised. Unavailable
recurring history does not establish that every recurring transaction is present.
A successful `bea check` does not resolve an inconsistent or absent statement.

## Headless client invocation

The rehearsals sent one guide prompt at a time and reviewed each response before
sending an approval. With the guide's environment and current directory set,
`PROMPT` is the verbatim text of the current prompt block. Use a unique log name
for each call; the examples below show the first call only.

```sh
claude -p "$PROMPT" --output-format stream-json --verbose \
  --tools Skill,Read,Bash,Write,Edit,Glob,Grep \
  --allowedTools Skill Read Bash Write Edit Glob Grep \
  --strict-mcp-config --mcp-config '{"mcpServers":{}}' \
  --setting-sources project \
  --add-dir "$FIRST_MONTH_INPUTS" "$SKILLS_SRC/skills/.claude/skills" \
  > "$RUN/evidence/claude-first.jsonl"
```

Read `session_id` from the final result record and append
`--resume "$CLAUDE_SESSION"` to subsequent Claude calls. Each statement branch
starts without `--resume`, from its separate workspace and inputs.

```sh
printf '%s\n' "$PROMPT" | codex exec --ignore-user-config --ignore-rules \
  --sandbox workspace-write --json --add-dir "$PWD/.git" - \
  > "$RUN/evidence/codex-first.jsonl"
```

Read `thread_id` from `thread.started`; replace the final `-` with
`resume "$CODEX_SESSION" -` on subsequent calls. Start statement branches without
`resume`. The additional writable directory is only the synthetic repository's
`.git`, needed for the explicitly approved close commit. Neither client received
a model override, blanket future accounting approval, or a sandbox-bypass flag.
