# w1 · m23 — Exit status tells the truth: no success without the effect

**Worker:** worker1 **Goal:** every `bea` exit code matches what actually happened on disk — exit 0 means the documented effect occurred and the ledger still checks, and nonzero means nothing was written or the partial writes are named **Status:** todo (t001, t002, t003, t004, t005, t006, t007, t008 done)

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Refuse output destinations that alias a loaded ledger file — **DONE** | 45m | — |
| t002 | Scope `--allow-errors` to pre-existing errors — **DONE** | 45m | — |
| t003 | Make `format --check` and `format -i` honor the include closure — **DONE** | 45m | — |
| t004 | Map doctor diagnostics to exit status — **DONE** | 45m | — |
| t005 | Stop query one-shots exiting 0 on nothing — **DONE** | 45m | — |
| t006 | Make "did nothing" a failure for treeify, ingest, and format — **DONE** | 30m | — |
| t007 | Mark plugin-synthesized directives as generated, not on disk — **DONE** | 45m | — |
| t008 | Adoption surface — **DONE** | 25m | t001, t002, t003, t004, t005, t006, t007 |
| t009 | Simplify | 30m | t008 |
| t010 | Test coverage | 45m | t008, t009 |
| t011 | Closeout | 15m | t010 |

## Definition of done

- A single exit-contract matrix test replays every reproducer from the absorbed notes (w3/236, 249, 262, 269, 273, 277, 282, 300, 301, 317, 318, 319, 320, 321, 323, 332, 336, 338, 345, 363, 364, 369, 370, 371) and asserts, per case: exit 0 only when the documented effect happened and `bea check` passes on every file the run wrote; nonzero only when nothing was written, or the files already written are named.
- `bea --file main.bean query 'PRINT' -o main.bean` exits 2 and leaves the ledger byte-identical, and so do the `--json`, relative-path, hard-link, include-closure and interactive `.output` variants. `bea example -o EXISTING` refuses without an explicit overwrite flag.
- `--allow-errors` never lets `add`, `add transactions`, or `import --apply` introduce a new ledger error: after any exit-0 write, `bea check` reports no error that was absent before the write. The flag still tolerates pre-existing errors.
- `bea format --check` on a split-ledger root exits nonzero for a missing include, an unparseable child, or an unformatted child, and names each one. Every doctor operation listed above exits nonzero when it reports an error or resolves an empty scope.
- `bea list` marks plugin-generated `open` / `price` / `close` rows as generated in both human and JSON output, so an agent cannot mistake them for text on disk.
- `cli/docs/USAGE.md` states the exit-0 rule beside its exit-code table, `make docs-check` is green, and `cd cli && make check-all` passes.

## Source + Goal linkage

- **Source:** `/pm-brainstorm for w1` 2026-09-16, item 1. Absorbs continuous CLI QA inbox notes w3/236, 249, 262, 269, 273, 277, 282, 300 (critical), 301, 317, 318, 319, 320, 321, 323, 332, 336, 338, 345, 363, 364, 369, 370, 371 — twenty-four findings with one shared cause class.
- **Goal linkage:** **A1 — Agent-native accounting.** Agents and CI gates branch on exit status, and every customer `beancount-*` skill routes its writes and checks through `bea`. A command that reports success without doing the work breaks the whole agent contract, not one flag.
- **Expected outcome:** A coding agent can trust exit 0 from `bea` without re-running `bea check` to find out whether the write really landed, and a pre-commit hook built on `bea format --check` actually catches broken ledgers instead of waving them through.
- **Why now:** The 2026-09-15/16 CLI QA sweep filed a silent ledger-wipe path (`w3/300`, critical) plus four majors in two days, all in commands the shipped skills call. Fixing them as one cluster gives a single testable contract rather than twenty-four separate ships, and it must land before further CLI capability work sits on top of the same false greens.
- **Adoption surface:** included — exit codes, help text, the usage guide and the skill instructions are all customer- and agent-facing.
