# w1 · m25 — Every failure is a JSON envelope, and empty inputs are errors

**Worker:** worker1 **Goal:** an agent that wraps every `bea` call in `--json` can parse success and failure alike — no tracebacks, no raw errno text, no silently ignored flags — and an empty filter value is an error rather than a wildcard **Status:** todo (t001, t002 done)

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Convert every engine and native failure into the JSON envelope at one boundary — **DONE** | 60m | — |
| t002 | Turn query-shell crashes into structured errors — **DONE** | 60m | t001 |
| t003 | Make `--json` compose with `--format`, `-o`, and every command | 30m | t001 |
| t004 | Render ledger-load failures readably | 45m | t001 |
| t005 | Make empty-string filter values usage errors | 30m | — |
| t006 | Adoption surface | 25m | t001, t002, t003, t004, t005 |
| t007 | Simplify | 30m | t006 |
| t008 | Test coverage | 45m | t006, t007 |
| t009 | Closeout | 15m | t008 |

## Definition of done

- Under `--json`, `json.loads` succeeds on the error output of every reproducer from the absorbed notes (w3/233, 234, 238, 239, 250, 268, 270, 274, 286, 287, 294, 296, 298, 299, 302, 312, 314, 327, 328, 333, 335, 358, 359, 360 and w5/004). No Python traceback reaches stdout or stderr unless `--debug` is passed.
- A failed multi-file operation reports the files it already wrote: `bea --json format -i` over a tree containing one unwritable file names the rewritten files and the file that failed.
- The BQL shell answers `.help`, `help`, `help select`, and `.parse …` without a traceback and never reports `engine did not answer`; unsupported query constructs return a BQL error naming the construct.
- `--json` composes with `--format` and `-o` under one documented rule and is never silently ignored; `price` and `ingest` emit an envelope or a clean refusal; `--json import` carries the engine notes human mode prints; `bea --json --version` answers in JSON.
- Every filter flag (`--search`, `--account`, `--tag`, `--link`, `-a`, `-t`, `-x`, and `balance`'s positional) exits 2 on an empty or whitespace-only value, naming the flag — never returning the full result set and never falling through to a default.
- `cli/docs/USAGE.md` documents the failure envelope, the partial-effects field, and both rules; `make docs-check` and `cd cli && make check-all` pass.

## Source + Goal linkage

- **Source:** `/pm-brainstorm for w1` 2026-09-16, item 3. Absorbs continuous CLI QA inbox notes w3/233 (major), 234, 238, 239, 250, 268, 270, 274, 286, 287, 294, 296, 298, 299, 302, 312, 314, 327, 328, 333, 335, 358, 359, 360, and w5/004.
- **Goal linkage:** **A1 — Agent-native accounting.** `--json` is the contract every coding agent and every `beancount-*` skill depends on. A traceback on stderr is unparseable, and a filter that treats an empty template hole as "match everything" silently returns the wrong answer, which is worse than an error.
- **Expected outcome:** A coding agent can branch on `bea`'s failures programmatically instead of pattern-matching English, and a skill that builds a filter from a variable gets an error rather than a full-ledger result when the variable is empty.
- **Why now:** w1/m13 established the strict-for-automation contract and w1/m22 patched three leaks in it; the 2026-09-15/16 sweep found twenty-four more places where it still leaks, concentrated at the engine and native-forward boundary. One boundary fix closes most of them, and the empty-value class is a silent-wrong-answer bug rather than a cosmetic one.
- **Adoption surface:** included — the JSON contract, help text and the `beancount-ask` skill's parsing are all agent-facing.
