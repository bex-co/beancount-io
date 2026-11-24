# w1 · m50 — A batch recategorization costs one ledger load, not one per row

**Worker:** worker1 **Goal:** `bea update transactions` resolves, plans, diffs and validates a batch in about one ledger load plus work proportional to its rows, and a rejected row adds a few loads rather than one per row, with byte-identical output **Status:** done

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Resolve and plan every row against indexes built once per batch — **DONE** | 30m | — |
| t002 | Diff each row from a window around its span, byte-identical to the whole-file diff — **DONE** | 30m | — |
| t003 | Attribute a failed combined validation to rows from its located errors; bisect only the rest — **DONE** | 45m | — |
| t004 | Simplify — **DONE** | 20m | t001, t002, t003 |
| t005 | Test coverage — **DONE** | 30m | t001, t002, t003 |
| t006 | Closeout — **DONE** | 15m | t004, t005 |

## Closeout

**Done 2026-11-23** (`/loopx w1`). Measured on the repro and the larger fixtures (macOS arm64, Python 3.12, `uv run bea` from the checkout, the same machine before and after; previews leave every file byte-identical):

| Ledger (one file) | Batch | Before (`762899226`) | After |
| --- | --- | --- | --- |
| 5,000 transactions | 500 valid rows, preview | 10.9 s | 1.0 s |
| 5,000 transactions | the same 500, row 1 names `Expenses:Typo` | 134.0 s | 2.1 s |
| 22,000 transactions | the last 2,000 rows, preview | 360.6 s | 5.0 s |
| 22,000 transactions | 2,000 rows scattered over the file, preview | not run | 58.1 s |

The 22,000-transaction file has the note's shape, every entry carrying an import-id and amounts varying; the note's `bea import` of 2,000 such rows took 9 s. The three before/after answers are byte-identical (`cmp` of the `--json` output). The pre-change engine and this one gave identical answers, exit codes and written bytes for eight scenarios, each previewed and applied: a mistyped first row, 14 mistyped rows among 120, a missing id beside a duplicate row, an assertion one row breaks, two rows that break an assertion beside a typo, a narration that drops a continuation line, two included files with a byte-order mark and no final newline, and `file:line` ids on a file whose entries repeat. Validations fell from 102 to 3, 122 to 16, 52 to 8 and 69 to 4. `make check-all` passes in `cli/`.

Deviations, both recorded in t002 and t003 and pinned by tests:

- Rows that load together are written together beside a rejected row, even one that fails alone, as they are in a batch without the rejected row. Before, every row was tried alone once the batch failed.
- Where entries repeat each other line for line, a row's diff shows the row's own lines; `difflib` over the whole file could pair a line with its copy in another entry and report dozens of unchanged lines. The batch's combined diff is still the whole file's.

Left as they were:

- The batch's combined diff is still one whole-file `difflib` per file, kept for byte-identity. Its cost grows with how scattered the rows are. The 2,000 rows `bea import` just wrote sit together at the end of the file, and that preview takes 5.0 s. Spread over the whole file, the same number of rows takes 58.1 s, of which `difflib` is all but about 8 s (cProfile: the 2,000 row diffs take 0.17 s together). Windowing the combined diff would remove that cost, but on densely edited files it pairs lines differently from the whole-file matcher. Doing it would mean deliberately changing that diff.
- `--apply` re-validates each file the preview already judged, and a failing trial reloads the unchanged ledger to classify its errors.

## Definition of done

On the repro below (one 5,000-transaction file):

- The 500-row preview takes about one load plus one validation (was 11 s at `762899226`), and the same preview with row 1 naming `Expenses:Typo` takes at most a few seconds more than that (was 134 s). The answers are identical to the pre-change answers: every row's `status`, `reason`, `details`, `changes` and `diff`, and the combined `diff`.
- A 2,000-row preview on a 22,000-transaction file takes about as long as `bea import` takes to write those rows (the note measured 280 s against 9 s).
- Regression tests count loads instead of timing them: with one bad row among N, the `validate_candidate` calls stay around log N, not N; `reader.shared_locations` runs once per batch; per-row diffs equal the whole-file `unified_file_diff`, including the byte-order-mark, no-final-newline, first-line and removed-continuation-line cases. Each test fails with its part reverted.
- The "valid alone, but … fail together" and cumulative-include reasons keep their wording; the existing batch tests pass unchanged.
- `make check-all` passes in `cli/`; before/after timings are recorded in the Closeout task.

## Repro

```sh
mkdir books && cd books
python3 - <<'PY'
import datetime, json
lines = ['option "operating_currency" "USD"',
         '2020-01-01 open Assets:Checking USD',
         '2020-01-01 open Expenses:Uncategorized USD',
         '2020-01-01 open Expenses:Groceries USD', '']
for i in range(5000):
    day = datetime.date(2020, 1, 2) + datetime.timedelta(days=i // 5)
    lines.append(f'{day} ! "MERCHANT {i}"\n  import-id: "bank:TX-{i}"\n'
                 f'  Assets:Checking  -12.34 USD\n  Expenses:Uncategorized  12.34 USD\n')
open('main.bean', 'w').write('\n'.join(lines))
rows = [{"id": f"bank:TX-{i}", "account": "Expenses:Groceries", "flag": "*"} for i in range(4500, 5000)]
json.dump(rows, open('ok500.json', 'w'))
rows[0]["account"] = "Expenses:Typo"            # one mistyped category
json.dump(rows, open('typo500.json', 'w'))
PY
time bea --json --file main.bean update transactions --from ok500.json >/dev/null
time bea --json --file main.bean update transactions --from typo500.json >/dev/null
```

Measured by routine cli-qa at `3e21e42da` (macOS arm64, Python 3.12.14, managed engine 0.5.0): 11 s and 134 s; 100 rows with one bad row and `--apply` 27 s against 3 s with none bad; on a 20,000-transaction file, 1 / 50 / 100 / 200 valid rows preview in 2.6 / 11.4 / 21.2 / 40 s; 2,000 rows that `bea import … --apply` had just written in 9 s took 280 s to preview on a 22,000-transaction file. Reproduced by `/loopx w1` triage at `762899226`: 10.9 s and 134.0 s. Controls: `bea add transactions --partial` settles the same 500 rows in 2 s with or without the bad row, and a single-row `update transaction` on the 20,000-transaction file takes 2.4 s. Every result is correct and the preview leaves `main.bean` byte-identical.

## Cause

All in `cli/src/bea_engine/ledger/updating.py`. A cProfile of 50 valid rows on the 20,000-transaction file (28.7 s) spends 13.2 s in the per-row whole-file `unified_file_diff`, 6.0 s in `entry_span` (1,987,700 `entry_generated` calls) and 4.8 s in `locate_transaction`.

- `_plan_rows` calls `locate_transaction` per row, which recomputes `reader.shared_locations(entries)`, runs `reader.entry_generated` over every entry to build the on-disk list, and scans every entry once per id tier.
- `plan_lines` calls `entry_span` per row, which recomputes `shared_locations` and walks every entry again for the next written line in the file.
- `_row_payload` copies the whole file per row and runs `difflib.unified_diff` over all of it to show a few changed lines.
- `_validate_plans`: when a file's combined rewrite fails, every row of that file is validated alone with `_validate_text`, a full ledger load each — the pattern w5/123, w5/537 and w5/720 removed from `add transactions --partial` (`_named_rows`, `_refused_in_order` in `adding.py`).

## Out of scope

- Single-row `bea update transaction`, which pays each scan once (it may share the new helpers).
- `bea import` and `bea add transactions`, the working controls.
- No REST, GraphQL or MCP surface rewrites local entries, so there is no parity work.

## Source + Goal linkage

- **Source:** promoted from inbox note w1/374 (routine cli-qa, 2026-11-23) during `/loopx w1` triage on 2026-11-23: three independent changes to the batch path (row resolution, per-row diffs, failure attribution) plus load-counting tests run past an hour.
- **Evidence:** the measurements above, reproduced at `762899226`. `cli/docs/IMPORTING.md` sends a longer review queue to this command: "For a longer queue, `bea update transactions --from queue.csv` applies a whole `id,account,flag` mapping in one previewed write per file". A 500-row preview with one typo outlasts a coding agent's usual two-minute command timeout.
- **Goal linkage:** **A1 — Agent-native accounting**: an agent recategorizing a statement's review queue gets its preview inside one command's time budget, and a mistyped category costs seconds instead of minutes.
- **Expected outcome:** a person or agent who imported a statement with `bea import` clears its review queue with one `bea update transactions --from` preview and apply in about the time the import took, whether or not a row is wrong.
- **Why now:** the batch form is the documented way to clear the queue every `bea import` leaves, and its cost grows with rows × ledger size, so the ledgers that need it most hit it hardest.
- **Adoption surface:** omitted — the change keeps every answer byte-identical and adds no command, flag, document or skill; only run time changes.
