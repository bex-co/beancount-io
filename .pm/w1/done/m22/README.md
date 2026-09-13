# w1 · m22 — Fix published CLI exports, native help, and shell output reset

**Worker:** worker1 **Goal:** customers can export trustworthy query results and discover/use native commands through one beancount-io installation **Status:** done

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Honor JSON query export and numberification options — **DONE** | 45m | — |
| t002 | Expose native command arguments and options in bea help — **DONE** | 45m | — |
| t003 | Repair interactive output reset inherited from Beanquery — **DONE** | 45m | — |
| t004 | Verify adoption surfaces for query output and native help — **DONE** | 20m | t001, t002, t003 |
| t005 | Simplify the CLI parity fixes — **DONE** | 20m | t004 |
| t006 | Add regression coverage and verify CI plus installed artifacts — **DONE** | 50m | t004, t005 |
| t007 | Close out the ADR014 QA fixes — **DONE** | 15m | t001, t002, t003, t004, t005, t006 |

240 minutes total, including three independent implementation tasks and adoption, simplification, regression/CI and closeout work. Start with t001: silent stale exports have the highest impact.

## Definition of done

- [x] JSON query `-o FILE` writes the requested standard envelope instead of silently leaving a missing/stale file; numberification is honored; failures preserve existing output.
- [x] Native help exposes supported arguments/options for affected doctor operations, example, treeify, price and ingest while retaining useful bea-specific guidance.
- [x] Interactive redirect → query → reset → query succeeds without traceback or closed-stream errors; the inherited Beanquery failure is actually repaired.
- [x] Meaningful regressions, `make check-all`, affected CI and installed wheel/sdist checks pass; eleven doctor controls and the full-year daily report remain correct.
- [x] The frontend stays isolated; customers install only beancount-io. Original ledgers/user history remain untouched and docs match tested behavior.

## Source + Goal linkage

- **Source:** user `/pm for w1 to fix them` after published-package QA on 2026-09-12, beancount-io 0.2.0 / Python 3.12.14 / macOS arm64, reference HEAD 46a165e3. ADR014: `docs/adrs/ADR014-cli-beancount-parity.md`.
- **Goal linkage:** **A1 — Agent-native accounting** (reliable exports for automation), **A2 — Frictionless onboarding** (discoverable native options and working shell).
- **Expected outcome:** an agent gets the output file it requested, and a newcomer can discover native flags and return from file output to the terminal using bea alone.
- **Why now:** release QA found these acceptance gaps after 0.2.0 passed the existing installed smoke; stale exports can mislead downstream consumers. This follows completed m19–m21 and preserves the corrected one-distribution decision.
- **Adoption surface:** included because CLI help, exports, shell and reference docs are customer/agent interfaces. Cross-surface backend/UI parity omitted: changes are local CLI behavior, with no REST, GraphQL, MCP or UI surface change.

## Public reproducer and evidence

Create this synthetic `main.bean` in a disposable directory:

```beancount
option "operating_currency" "USD"
2026-01-01 open Assets:Checking USD
2026-01-01 open Income:Salary USD
2026-01-01 * "QA" "Synthetic salary"
  Assets:Checking  100 USD
  Income:Salary
```

1. `bea --json --file main.bean query 'SELECT 1' -o result.json` exits 0 without creating result.json. Pre-create it with `STALE PREVIOUS RESULT` and repeat: those bytes remain. Text `--format csv -o result.csv` works. JSON `--numberify` is likewise silently ignored.
2. `bea example --help` / `bea treeify --help` expose only help, even though native counterparts have date/seed/output or input/pattern/output flags. Doctor region hides required arguments; enabled price and ingest help omit native options.
3. In a real `bea --file main.bean query` shell run `.output scratch.txt`, `SELECT 1;`, `.output`: TypeError from upstream `open(sys.stdout)`. Native Beanquery 0.2.0 reproduces too. No ledger write is needed.

Local supplementary evidence: `cli/tmp/qa-20260912-pypi/REPORT.md`, `results/json-output-{0,1,stale}.json`, help/native-help captures, `pty-shell.json`, and `output-reset-{0,1}.json` / native controls. These ignored files are not required to rerun the public fixture above. QA retained 142 command/session captures plus the 75-command installed smoke. Counts include controls and expected failures, not 217 passing assertions.

## Dedupe and boundaries

Searched open/done board entries for query output, numberify, native help and do_output/reset. No matching open CLI fix found. Completed w1/m19/t005 and t011 claimed export/shell parity but missed these cases; targeted query history a90b1706/20fefdf4 and current HEAD retain the causes. Treat this as follow-up acceptance work, not deployment lag, and do not rewrite completed history.

The `.csv` suffix candidate is excluded: native Beanquery showed the same behavior. Daily report truncation is also excluded: the two-transaction control now returns 365 periods and 300 USD. Do not add independent engine packaging, redesign the shell, or claim live cloud/AI/quote-service coverage. An upstream fix may be integrated, or the broken handler minimally adapted inside the existing helper; opening an upstream issue alone does not close t003. No external message or new release is authorized by this board-only request.

## Local verification

Local `make check-all` passed 648 tests plus lint/types/spec/docs gates. Installed wheel on Python 3.12 and pip-installed sdist on Python 3.14 each passed 80 smoke commands. A separate installed-wheel audit matched all eleven doctor stdout/exit-code controls and retained the 365-period/300-USD report, with the original ledger unchanged. All three simplify reviews completed. CI and installed-artifact evidence are recorded below.

## Final verification

Implementation: b75b1b671bd225adef3f53cb2f77f61ac23422ab (`fix(cli): honor JSON exports and restore native CLI usability`). [CI (cli)](https://github.com/bex-co/beancount-io/actions/runs/34730363219) completed successfully: all 15 jobs, including wheel/sdist installs on Linux/macOS/Windows with Python 3.12/3.14 and Homebrew on Linux/macOS. [Secret scan](https://github.com/bex-co/beancount-io/actions/runs/34730363090) passed.

Local full gate: 648 tests passed, plus lint, Vulture, formatting, mypy, spec and generated-documentation checks. Sixteen focused regression cases cover exports, ignored options, help, and a real PTY redirect/reset/requery/failure-recovery sequence. Wheel/Python 3.12 and sdist/pip/Python 3.14 each passed the expanded 80-command installed smoke. Separate installed-wheel checks matched all eleven doctor controls, preserved 365 daily report periods and 300 USD, and passed the full shell session plus .exit/EOF with no traceback. Original ledger hashes matched. Guidance compatibility validation passed; root package descriptions required no changes.

QA artifacts remain local under cli/tmp/m22/: check-all.log, wheel.log, sdist.log, audit-results.json and results/pty-*.json. Upstream's current shell still contains the broken reset handler; a narrow engine-side override carries its removal condition. No new dependency or separate distribution was introduced. The milestone ships on main; these changes are not a new PyPI version.
