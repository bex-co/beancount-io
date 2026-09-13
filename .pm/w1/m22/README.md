# w1 · m22 — Fix published CLI exports, native help, and shell output reset

**Worker:** worker1 **Goal:** customers can export trustworthy query results and discover/use native commands through one beancount-io installation **Status:** todo (t001–t005 done; awaiting CI and closeout)

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Honor JSON query export and numberification options — **DONE** | 45m | — |
| t002 | Expose native command arguments and options in bea help — **DONE** | 45m | — |
| t003 | Repair interactive output reset inherited from Beanquery — **DONE** | 45m | — |
| t004 | Verify adoption surfaces for query output and native help — **DONE** | 20m | t001, t002, t003 |
| t005 | Simplify the CLI parity fixes — **DONE** | 20m | t004 |
| t006 | Add regression coverage and verify CI plus installed artifacts | 50m | t004, t005 |
| t007 | Close out the ADR014 QA fixes | 15m | t001, t002, t003, t004, t005, t006 |

240 minutes total, including three independent implementation tasks and adoption, simplification, regression/CI and closeout work. Start with t001: silent stale exports have the highest impact.

## Definition of done

- [ ] JSON query `-o FILE` writes the requested standard envelope instead of silently leaving a missing/stale file; numberification is honored; failures preserve existing output.
- [ ] Native help exposes supported arguments/options for affected doctor operations, example, treeify, price and ingest while retaining useful bea-specific guidance.
- [ ] Interactive redirect → query → reset → query succeeds without traceback or closed-stream errors; the inherited Beanquery failure is actually repaired.
- [ ] Meaningful regressions, `make check-all`, affected CI and installed wheel/sdist checks pass; eleven doctor controls and the full-year daily report remain correct.
- [ ] The frontend stays isolated; customers install only beancount-io. Original ledgers/user history remain untouched and docs match tested behavior.

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

## Validation in progress

Local `make check-all` passed 648 tests plus lint/types/spec/docs gates. Installed wheel on Python 3.12 and pip-installed sdist on Python 3.14 each passed 80 smoke commands. A separate installed-wheel audit matched all eleven doctor stdout/exit-code controls and retained the 365-period/300-USD report, with the original ledger unchanged. All three simplify reviews completed. CI evidence will be added before t006/t007 close.
