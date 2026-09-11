---
name: qa-find-bugs-cli
description: >-
  Hunt bugs in the Beancount.io bea CLI by running real commands against isolated
  synthetic ledgers, checking output and file effects, reproducing failures,
  tracing root causes, and deduplicating findings. Use for CLI QA or a terminal
  bug hunt. Skip ordinary code review, bug implementation, ledger bookkeeping,
  and browser or native-mobile QA.
---

# CLI QA bug hunt

Read [the shared QA contract](../qa-shared/contract.md) first, then
`cli/CLAUDE.md` and the relevant sections of `cli/README.md` and
`cli/docs/USAGE.md`. Exercise the real `bea` executable through subprocesses;
unit tests and source inspection support a finding but do not replace a CLI
journey.

Arguments: optional executable path, journey names, ledger path, server URL,
`wN`, `SHIP=1`, `DRY_RUN=1`. Default to this checkout's `uv run bea`, local
synthetic ledgers, and report mode. A server argument selects a hosted target;
it does not turn every local journey into a cloud test. `DRY_RUN=1` still allows
disposable local fixture writes needed to reproduce bugs.

## Prepare an isolated command environment

- Work inside `cli/`; use `uv sync --all-groups` if existing dependencies are
  missing. Record HEAD, dirty files, OS, Python version, executable path and
  `bea --version`. For a supplied installed binary, keep its results separate
  from checkout reproduction: an older release is not evidence HEAD is broken.
- Discover commands and flags from `bea --help` and subcommand help before
  scripting them. Global options precede the command, for example
  `uv run bea --json --file /absolute/path/main.bean list transaction`.
- Create a unique run directory under `cli/tmp/qa-<date>/`. Set absolute
  `BEA_CONFIG_DIR` and `XDG_CACHE_HOME` paths inside it in the **child process**
  environment and set `BEA_NO_UPDATE_NOTIFIER=1`. Remove inherited `BEA_FILE`
  and `BEA_TOKEN` from local-test children. Do not repurpose `HOME` or alter the
  user's shell, credential store, importer memory, or global CLI installation.
- Use explicit absolute `--file` paths except when testing discovery. Build
  small synthetic fixtures with fixed dates, known balances and separate
  includes; retain a pristine copy for resets. Local disposable writes are part
  of this QA request. Treat a supplied real ledger as read-only and reproduce
  mutations in synthetic data. Plugins and importer configs execute Python;
  inspect them before running, and prefer controlled local fixtures.
- Capture argument arrays, cwd, non-secret environment overrides, stdin mode,
  stdout, stderr, exit code, duration, and before/after file contents or hashes.
  Use bounded subprocess timeouts, closing stdin for unattended cases. Use a
  PTY for actual interactive journeys; lack of a PTY is a coverage limit.
  Do not pipe through a command that hides `bea`'s exit status.

## Sweep whole journeys

Use selected journey names to narrow this table; otherwise survey the available
commands and deepen failures. Report skipped groups and why.

| Journey | Observable promise |
| --- | --- |
| discovery/init | Help, version, target precedence (`--file`, `BEA_FILE`, cwd), paths with spaces/Unicode, missing files, and split-ledger includes work as documented. Init succeeds in a fresh directory; rerunning against an existing target preserves its contents. |
| directives | Add then list each relevant directive; check the whole ledger and query the result in a fresh process. Cover balanced/inferred postings, metadata, escaping, date boundaries, `--into`, and invalid input. Rejected atomic writes leave files unchanged. |
| batch/import | Preview leaves the ledger unchanged; apply persists the expected rows. Repeat import checks deduplication. Cover duplicate policy, malformed rows, and documented partial acceptance. Inspect the result and file diff before retrying any failed write. Use an inspected importer and synthetic bank export. |
| check/format | Valid and deliberately invalid ledgers produce documented diagnostics and exit codes. Formatting preserves meaning and is idempotent; `--check` and `--dry-run` do not write. Recursive formatting's partial failures identify affected files. |
| list/query | Filters compose; limits, ordering and truncation agree with fixture rows. BQL results, empty results, malformed queries, decimal/date serialization and supported exports are correct. Exercise the interactive query shell only with a PTY. |
| reports | Overview, income statement, balance sheet and trial balance honor periods, intervals and conversion. Compare against fixed-date fixture expectations and independent BQL/Beancount inventories; preserve commodity units, cost/price distinctions and documented sign conventions. |
| automation | Human and JSON output convey the same supported result. Parse JSON and check stdout/stderr separation, envelope, target and exit category. Compare terminal, redirected stdin, `--no-input`, and `CI` behavior; unattended commands must not hang waiting for prompts. |
| cloud | On the selected server and authorized QA account, exercise status, listing, inspection and applicable auth recovery. Create/clone/delete only scoped disposable resources when authorized, inspect partial or uncertain outcomes before retrying, and verify persistence in another process. |
| ask/upgrade | Check help and missing-dependency/auth diagnostics locally. Live Ask sends ledger context and may use quota; use synthetic data within existing authorization. `upgrade --check` uses the network; actual upgrade changes the installation and requires that scope. Never upgrade the user's CLI as a routine QA step. |

Use `cli/docs/USAGE.md`'s current JSON exceptions and exit-code table as the contract.
For example, `ask` rejects JSON, login requires interaction, and successful
logout/clone need not emit JSON. A nonzero exit can accompany partial batch
writes, recursive formatting, or successful remote creation followed by clone
failure. Do not classify these documented behaviors as bugs.

## Hosted journeys and credentials

Local journeys need no login. Inspect `BEA_API_URL` and `BEA_DASHBOARD_URL`
independently; the browser sign-in origin is not the REST origin. Use a
user-designated QA token via the child environment or the CLI's real
`bea cloud login` device flow with the isolated configuration directory.
Do not assume `cli/.env` exists or load another package's credentials. Browser
cookies from the shared dashboard helper are not CLI tokens. If browser login
needs QA_EMAIL/QA_PASSWORD, use the shared credential rules and a verified
field, then complete the device flow and check `cloud status`.

Keep tokens and device authorization codes out of captured transcripts. Never
log an entire environment, credential file, authentication response, or raw
debug transport. Without credentials, continue local and signed-out cases;
mark authenticated cloud and live Ask unverified. Mock HTTP failures may prove
local error handling but must be labeled simulations, not server defects.

## Reproduce, research, and hand off

Repeat a candidate from pristine fixtures in a fresh process using the same
executable and child environment. Check a nearby working control. Distinguish
documented usage errors, invalid fixtures, missing optional extras and upstream
Beancount semantics from CLI bugs. A hang needs a bounded capture and a check
for an intended prompt; a data-loss claim needs before/after evidence.

Trace command registration in `src/cli/main.py`, behavior in
`src/cli/commands/`, output/errors in `src/cli/output.py` and `errors.py`, and
the relevant directive, report, auth or config helpers. Read nested guidance
before following vendored `src/fava/`. Hosted commands use the generated REST
client and cloud adapters: generated files are evidence, not manual fix targets.
Trace server causes under backend package guidance and retain eligible
REST/GraphQL/MCP parity in a proposed server fix.

Apply shared root-cause, caller search, board/history dedupe and optional
`pm`/`ship` steps. In the finding record, replace route/device evidence with
executable/version, OS, cwd, exact command and fixture setup, stdin/TTY mode,
exit code, separate output streams and file diff. State expected behavior and
its documented or independently calculated basis. Include a minimal synthetic
reproducer in public filing text so ignored evidence files are not required.

Finish with findings by severity, coverage/skips, dedupe/filing status, and
cleanup. Retain sanitized reproducible evidence; remove disposable credentials
and stop only processes started by this run. Report remaining test resources.
Do not implement fixes unless requested; if requested, add meaningful regression
coverage and run `make check-all` inside `cli/` before handoff.
