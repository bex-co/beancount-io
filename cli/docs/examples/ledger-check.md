# Check a ledger with GitHub Actions

Copy [ledger-check.yml](ledger-check.yml) into
`.github/workflows/ledger-check.yml` in your ledger repository. Set `LEDGER_FILE`
to the root ledger path relative to that repository, for example
`accounts/main.beancount`. Both checks follow its includes. The example runs on
pushes and pull requests with only `contents: read`; it does not commit changes.

The workflow installs published `beancount-io==0.3.1` with Python 3.12 and uv
0.12.15. Change `BEA_VERSION` deliberately when upgrading. The checkout and uv
actions are pinned to commits; their comments identify the releases. Installation
follows [uv's official GitHub Actions guidance](https://docs.astral.sh/uv/guides/integration/github/).
The first ledger command provisions bea's managed engine. No separate Beancount
install or Beancount.io login is needed for this local-ledger example.

`bea check` rejects accounting errors such as unbalanced transactions.
`bea format --check` rejects formatting drift without rewriting the ledger;
formatting alone does not prove accounting validity. Both must succeed. If the
validation step fails, GitHub skips the later formatting step and the job fails.
Fix and review the ledger locally, then push the correction to rerun the checks.

## Rehearsal

On 2026-09-27, the exact workflow installation and check commands ran locally
on macOS arm64 with uv 0.12.15, Python 3.12, and published bea 0.3.0. The isolated
synthetic repository had `main.bean` including `entries.bean`; installation used
a fresh tool directory and managed engine. The setup and three cases took
27.36 seconds on that machine. On 2026-09-28 the same three cases were repeated
with published bea 0.3.1, the current pin, in a fresh tool directory and engine,
with the results below unchanged.

| Synthetic input | `bea check` exit | `bea format --check` exit | Files unchanged |
| --- | --- | --- | --- |
| Valid, formatted ledger | 0 | 0 | Yes |
| Unbalanced transaction in included file | 1 | 0 | Yes |
| Formatting drift in included file | 0 | 1 | Yes |

Both commands were run independently for each case to establish their distinct
failure behavior. File hashes, including Git state, were unchanged after every
pair of checks. YAML structure and action pins were checked against the official
action documentation. This is a local command rehearsal; a hosted GitHub Actions
run and Linux execution have not been observed here.
