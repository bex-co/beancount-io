# beangulp v3 — the minimal correct surface

Verify against the installed version before use (`pip show beangulp`; `help(beangulp.Importer)`); this file matches beangulp ≥ 0.2 / beancount 3.x.

## The Importer contract

```python
import beangulp
from beancount.core import data

class Importer(beangulp.Importer):
    def identify(self, filepath: str) -> bool: ...        # claim this file?
    def account(self, filepath: str) -> data.Account: ... # filing account, e.g. "Assets:Bank:Checking"
    def date(self, filepath) -> datetime.date | None: ... # file's date (archiving); default: mtime
    def filename(self, filepath) -> str | None: ...       # archive name; default: basename
    def extract(self, filepath, existing) -> data.Entries: ...
```

`extract`'s `existing` is the current ledger's entries — usable for dedup marking; beangulp's own dedup marks duplicates rather than dropping them. Build transactions with `data.Transaction(data.new_metadata(filepath, lineno), date, flag, payee, narration, tags, links, postings)`; amounts via `beancount.core.amount.Amount(D("54.20"), "USD")`; use `decimal.Decimal` via `beancount.core.number.D`, never floats.

## csvbase — the declarative CSV path (prefer this)

```python
from beangulp.importers import csvbase

class Importer(csvbase.Importer):
    date = csvbase.Date("Date", "%m/%d/%Y")
    narration = csvbase.Column("Description")
    amount = csvbase.Amount("Amount")

    def __init__(self, account, currency="USD"):
        super().__init__(account, currency)

    def identify(self, filepath):
        # narrow: header signature, not just extension
        with open(filepath) as f:
            return f.readline().strip() == "Date,Description,Amount"
```

Column descriptors handle parsing/order; `csvbase.Importer` provides `extract` (and emits a `balance` directive when the file has a balance column — `balance = csvbase.Amount("Balance")`). Subclass hooks: `metadata()`, `finalize()` for per-row tweaks (e.g. attach `import-id` metadata from a row's native ID — follow the grammar in beancount-import's `references/dedup.md` so importer output dedups against skill-imported history).

**`metadata()` must extend, not replace, the default** — return `data.new_metadata(filepath, lineno)` updated with your keys. A dict holding only `import-id` drops the `filename`/`lineno` keys beangulp's sorting needs, and every `generate`/`test` run dies with `KeyError: 'lineno'`:

```python
from beancount.core import data

def metadata(self, filepath, lineno, row):
    meta = data.new_metadata(filepath, lineno)   # keep filename/lineno
    meta["import-id"] = "csv:sha256:…"           # then add yours
    return meta
```

**Split debit/credit columns**: there is no built-in that merges two columns (beangulp 0.2 has no `CreditOrDebit`), and `csvbase.Importer.extract` reads a single `amount` field. Declare both columns with `subs={r"^$": "0"}` (an empty cell crashes `decimal.Decimal`) and override `extract` to post the signed difference yourself:

```python
from beancount.core import amount as amount_mod
from beancount.core import data

class Importer(csvbase.Importer):
    date = csvbase.Date("Date", "%m/%d/%Y")
    narration = csvbase.Column("Description")
    debit = csvbase.Amount("Debit", subs={r"^$": "0"})
    credit = csvbase.Amount("Credit", subs={r"^$": "0"})

    def extract(self, filepath, existing):
        entries = []
        offset = int(self.skiplines) + bool(self.names) + 1
        for lineno, row in enumerate(self.read(filepath), offset):
            if not row:
                continue
            signed = row.credit - row.debit   # merge to one signed amount
            meta = data.new_metadata(filepath, lineno)
            meta["import-id"] = "csv:sha256:…"
            entries.append(
                data.Transaction(meta, row.date, self.flag, None, row.narration,
                                 set(), set(), [
                    data.Posting(self.importer_account,
                                 amount_mod.Amount(signed, self.currency), None, None, None, None),
                ]))
        return entries
```

`Column("A", "B")` (multiple names) means "column named A, or B if the bank renamed it" — alternate names for one logical column, not a merge.

## Self-test CLI — make every importer its own harness

```python
if __name__ == "__main__":
    from beangulp.testing import main
    main(Importer("Assets:Bank:Checking"))
```

gives the importer file these subcommands (run with the ledger venv's python):

| Command | Does |
|---|---|
| `python imp.py identify <dir/files>` | which files it claims |
| `python imp.py extract <file>` | extraction to stdout |
| `python imp.py generate <dir>` | write golden `<sample>.beancount` next to each claimed sample |
| `python imp.py test <dir>` | re-extract and diff against goldens — the green/red gate |

Golden-file discipline: goldens are *recorded behavior*, not truth — eyeball rows against the raw sample before committing them; `test` then guards every future change (drift repairs must keep old goldens green).

## Multi-importer runner (`import.py`)

```python
import beangulp
from importers import chase, amex

importers = [chase.Importer("Assets:Bank:Checking"),
             amex.Importer("Liabilities:CreditCard:Amex")]

if __name__ == "__main__":
    beangulp.Ingest(importers)()
```

Same subcommands across all importers, plus `archive`. Hooks (e.g. `smart_importer`'s `PredictPostings()`) wrap categorization at this layer — importer code stays category-free.

## Sharp edges

- `identify` over-matching: two importers claiming one file → beangulp errors out; header-signature checks keep claims disjoint.
- Encodings: bank CSVs are routinely `latin-1`/BOM'd — csvbase takes `encoding=`.
- OFX: no csvbase help; raw Importer parsing SGML-ish blocks (see the beancount-import skill's formats reference for the STMTTRN shape); FITID → entry metadata.
- Dates in goldens are extraction-order-sensitive only if you sort; emit rows in file order and let downstream sort.
- beangulp is beancount-3-only; a user on beancount 2.x needs `beancount.ingest` (different API — flag it, don't mix).
