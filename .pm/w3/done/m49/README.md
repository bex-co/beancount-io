# w3 · m49 — Write the money the user asked for

**Worker:** worker3 **Goal:** every `bea` command that writes an amount into a
ledger writes the value, the sign and the commodity it was given — or refuses —
so no run can end with exit 0, a green `bea check`, and different accounting in
the file. **Status:** done

## Tasks (in order)

| id   | title                                                                     | est | depends_on |
| ---- | ------------------------------------------------------------------------- | --- | ---------- |
| t001 | Post a debit by magnitude and treat a zero companion cell as empty        | 45m | —          | — **DONE**
| t002 | Write `custom` values so they reload as the values requested              | 40m | —          | — **DONE**
| t003 | Serialize a `CostSpec` faithfully and build the answer before the write   | 50m | —          | — **DONE**
| t004 | Resolve an imported row's currency from the account, and refuse a contradicting symbol | 60m | t001 | — **DONE**
| t005 | Document the sign, zero-cell and currency rules for import               | 20m | t004 | — **DONE**
| t006 | Simplify                                                                  | 20m | t005 | — **DONE**
| t007 | Test coverage                                                             | 45m | t005 | — **DONE**
| t008 | Closeout                                                                  | 10m | t007 | — **DONE**

## Definition of done

- A `Money Out = -4.50` / `Money In` pair imports as `Assets:Checking -4.50 USD`
  (balance `995.50 USD`), and a positive-debit control still posts negative
  (`w3/424`). A debit column that mixes signs is refused naming the column.
- A row with `Debit=30.00,Credit=0.00` previews and applies as `-30.00 USD`
  instead of `fill exactly one of …` exit 2 (`w3/424`).
- `bea add custom -v number:5 -v number:-2` writes a line that reloads as the
  two values `5` and `-2`; `number:100` + `amount:-20 USD` reloads as `100` and
  `-20 USD` (`w3/430`). Positive-value output stays byte-identical.
- `bea add transaction -p '… -5 HOOL {}'` exits 0, appends exactly once, and
  answers with a `cost` whose unspecified parts are `null`; `{2026-03-01}`
  likewise; `{{250.00 USD}}` round-trips back through `add transactions`
  (`w3/414`). No write happens when the answer cannot be built.
- `-5 HOOL {EUR}` either writes `{EUR}` or is refused — never silently `{}`
  (`w3/416`) — and the written text and the JSON answer describe the same
  constraint.
- A CSV imported into an account opened for a single non-operating currency
  books that currency; a cell whose unambiguous symbol contradicts the resolved
  currency is refused naming the row and the symbol; a constant currency can be
  named without editing the bank file (`w3/421`).
- `cli/docs/IMPORTING.md` states the debit/credit sign rule, the zero-cell rule
  and the currency resolution order, and each statement is true as written.

## Source + Goal linkage

- **Source:** inbox notes [424](../424.md), [430](../430.md), [421](../421.md),
  [416](../416.md) and [414](../414.md) — the "wrong money written to the
  ledger" cluster from the continuous CLI QA rounds of 2026-09-25/26. Each one
  exits 0 (or writes and then fails) with a value in the file that differs from
  the value requested, and `bea check` confirms the wrong figure.
- **Goal linkage:** A1 — an agent maintaining a ledger cannot detect a write
  that succeeds with different numbers than it asked for. Silent sign, value
  and commodity corruption is the one failure class no downstream check catches.
- **Expected outcome:** an agent or newcomer can import a bank export and append
  directives knowing that a zero exit means the ledger holds exactly the
  amounts, signs and commodities it was given, and that anything ambiguous is
  refused with the row, column or symbol named.
- **Why now:** these are the remaining silent data-corruption findings after
  m47 (atomic `format -i`) and m48 (output destination guards) closed the
  data-*loss* ones; they need no new design, only correct sign, serialization
  and currency resolution in code the CLI already owns.
- **Adoption surface task included** (t005): the import sign and currency rules
  are documented promises in `cli/docs/IMPORTING.md` that users follow literally.
