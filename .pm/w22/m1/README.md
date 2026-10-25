# w22 · m1 — `bea update transaction`: resolve the review queue in place

**Worker:** worker1 **Goal:** an imported `!` / `Expenses:Uncategorized` row is categorized with one previewed, atomic, git-friendly `bea` command instead of a hand edit **Status:** todo (t001 done)

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Engine `update` request/answer: locate a transaction by import-id, `ref`, or file:line — **DONE** | 60m | — |
| t002 | Atomic in-place rewrite of one entry with a preview diff | 60m | t001 |
| t003 | Frontend `bea update transaction` options and preview/apply flow | 50m | t002 |
| t004 | Batch form: `bea update transactions --from PATH` | 45m | t003 |
| t005 | Docs: add the "clear the `!` queue" step to the CSV tutorial and examples | 30m | t004 |
| t006 | Adoption surface | 25m | t005 |
| t007 | Simplify | 25m | t006 |
| t008 | Test coverage | 45m | t006 |
| t009 | Closeout | 15m | t007, t008 |

## Definition of done

- On the checked-in first-month example, `bea import --apply` followed by the new verb categorizes every `!` row; `bea check` is clean, `bea list transaction --flag '!'` is empty, and the git diff touches only the retargeted lines.
- An ambiguous or unknown id exits with the documented non-zero code and changes no bytes.
- Without `--apply` the command prints a diff and writes nothing; `--json` returns one envelope per row.
- `make check-all` passes from `cli/`.

## Source + Goal linkage

- **Source:** `/pm-brainstorm for cli` 2026-10-24, candidate 1; follow-up to the no-code CSV path ([w1/m16](../../w1/done/m16/README.md)), whose `!` rows have no resolving verb.
- **Goal linkage:** A1 (an agent finishes the import-and-review loop without raw file edits), with A2 as a secondary benefit.
- **Expected outcome:** After a CSV import, a human or coding agent clears the categorization queue with `bea update transaction` and reaches a reconciled first month without editing text.
- **Why now:** CSV rules already create the `!` queue, and nothing resolves it. The blocked review-and-undo skill (`w2/m46`) needs this primitive, and the work reuses shipped write guarantees (atomic locked writes, append-only alignment, preview/`--apply`).
- **Adoption surface:** included, because the milestone ships user- and agent-facing `bea` behavior.
