# w1 · m15 — Daily-use ergonomics for `bea`

**Worker:** worker1 **Goal:** the five things a person does every week with a ledger (find a transaction, check a balance, record a purchase, read a table, format the file they named) each take one short command and read cleanly in a terminal **Status:** todo

## Tasks (in order)

| id   | title                                                                                     | est | depends_on |
| ---- | ----------------------------------------------------------------------------------------- | --- | ---------- |
| t001 | `list transaction --search`, `--tag`, and `--link` filters                                | 45m | —          |
| t002 | `bea balance [ACCOUNT…]`: trial balance pruned to matching subtrees                       | 45m | —          |
| t003 | Positional narration for `add transaction`                                                | 30m | —          |
| t004 | Terminal-width-aware tables: one posting per line when a row does not fit                 | 45m | —          |
| t005 | Small fixes: `format` honors `--file`, `--from -`, help first lines, hints, plurals, wording | 45m | —          |
| t006 | Adoption surface                                                                          | 20m | t001, t002, t003, t004, t005 |
| t007 | Simplify                                                                                  | 30m | t006       |
| t008 | Test coverage                                                                             | 45m | t006       |
| t009 | Closeout                                                                                  | 15m | t008       |

## Definition of done

- `bea list transaction --search netflix` lists transactions whose payee or narration contains the text case-insensitively; `--tag` and `--link` filter likewise; all three compose with `--account` and dates and appear in JSON `limit`/`truncated` envelopes unchanged.
- `bea balance Checking` prints the trial-balance subtree for accounts matching `Checking` and their totals; `bea balance` with no argument equals `bea report trial-balance`; `--json` returns the same tree shape as trial balance.
- `bea add transaction "Coffee" -p "Expenses:Dining 12.50" -p Assets:Checking` records narration `Coffee`; `--narration` still works, and giving both with different text is a usage error.
- In an 80-column terminal, `bea list transaction` on the `bean-example` ledger never wraps: postings render one per line under the row when the single-line form would overflow; piped output keeps the current single-line form.
- `bea --file books/main.bean format` formats that file; `bea add transactions --from -` reads stdin; every first line in `bea --help` fits without truncation; `bea init ~/x` prints an absolute path in its "Next:" hint; "1 row was rejected"; an in-batch duplicate says "matches row N of this import"; `format --check` lists "would format" lines outside the error block.
- `make check-all` passes from `cli/`.

## Source + Goal linkage

- **Source:** CLI UX review 2026-09-08 — finding a transaction needed BQL, `report --account Checking` printed the whole Assets tree, recording a coffee took five flags, a six-posting opening entry pushed table rows past 200 characters, and a handful of polish issues (relative `Next:` path with seven `../` segments, "1 rows were rejected", truncated help summaries).
- **Goal linkage:** **A2 — Frictionless onboarding:** the first week is spent on exactly these five actions; each one currently sends the newcomer to the reference. **A1 — Agent-native accounting:** `--search`, `--tag`, and `bea balance --json` give agents targeted reads instead of full listings.
- **Expected outcome:** a user answers "when did I last pay Netflix" and "what is in checking" with one command each and no BQL; terminal tables read without horizontal scrolling.
- **Why now:** cheap, independent, and the most visible daily friction once installation works (w2/m25). Adoption surface included: every change is in user-facing commands and help.
