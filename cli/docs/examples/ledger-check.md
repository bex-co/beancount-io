# Check a ledger with GitHub Actions or pre-commit

Copy [ledger-check.yml](ledger-check.yml) into
`.github/workflows/ledger-check.yml` in your ledger repository. The
workflow checks out the repo and calls the shared action in one line:

```yaml
- uses: bex-co/beancount-io/cli/action@cb844f97b261f7f5457e8e64371642de5e5f0882 # no action tag yet; re-pin to cli-v* on the next release
  with:
    version: "0.3.1"
    file: main.bean
```

The action installs the pinned `beancount-io` release with uv and Python
3.12, then runs `bea check` and `bea format --check` against `file`
(relative to the repository, includes followed). Set `file` to the root
ledger path, for example `accounts/main.beancount`. Change `version`
deliberately when upgrading. The example runs on pushes and pull
requests with only `contents: read`; it does not commit changes.

Findings appear as annotations: `bea check` errors land on their
`file:line`, and `bea format --check` flags the drifted file. `bea check`
rejects accounting errors such as unbalanced transactions.
`bea format --check` rejects formatting drift without rewriting the ledger;
formatting alone does not prove accounting validity. Both must succeed. If
the validation step fails, GitHub skips the later formatting step and the
job fails. Fix and review the ledger locally, then push the correction to
rerun the checks. No Beancount.io login is needed for these local-ledger
checks.

## Pre-commit hooks

The same checks run before each commit. Install `bea` once
(`uv tool install 'beancount-io==0.3.1'`), then add to the ledger
repository's `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: https://github.com/bex-co/beancount-io
    rev: cb844f97b261f7f5457e8e64371642de5e5f0882 # re-pin to cli-v* on the next release
    hooks:
      - id: bea-check
      - id: bea-format
```

`bea-check` validates the root file once per commit; `bea-format` checks
the changed `.bean` / `.beancount` files. A root ledger other than
`main.bean` overrides the check hook's file:

```yaml
      - id: bea-check
        args: [accounts/main.beancount]
```

## Rehearsal

On 2026-09-27, the exact installation and check commands the action runs
were rehearsed locally on macOS arm64 with uv 0.12.15, Python 3.12, and
published bea 0.3.0. The isolated synthetic repository had `main.bean`
including `entries.bean`; installation used a fresh tool directory and
managed engine. The setup and three cases took 27.36 seconds on that
machine. On 2026-09-28 the same three cases were repeated with published
bea 0.3.1, the current pin, in a fresh tool directory and engine, with
the results below unchanged.

| Synthetic input | `bea check` exit | `bea format --check` exit | Files unchanged |
| --- | --- | --- | --- |
| Valid, formatted ledger | 0 | 0 | Yes |
| Unbalanced transaction in included file | 1 | 0 | Yes |
| Formatting drift in included file | 0 | 1 | Yes |

A ledger that carries a managed price include
(`include "https://beancount.io/prices/BTC-USD"`) passes `bea format --check`
like any other formatted ledger from the release after 0.3.1: the formatter
does not treat the feed URL as a missing file, and needs neither the network
nor a login. On 0.3.1 and earlier that gate fails on such a ledger. This was
checked on a source checkout, not on a published release.

Both commands were run independently for each case to establish their distinct
failure behavior. File hashes, including Git state, were unchanged after every
pair of checks. YAML structure and action pins were checked against the official
action documentation. This is a local command rehearsal; a hosted GitHub Actions
run and Linux execution have not been observed here.

On 2026-10-25 the action wrapper and hooks were verified without changing
the rehearsed commands: the problem matchers parse real `bea` stderr
(covered by `cli/tests/test_ledger_check_matcher.py`), and both hooks ran
green on a clean ledger and red on a broken one via `pre-commit try-repo`.
