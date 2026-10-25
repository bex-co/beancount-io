# Importing bank exports

A bank CSV or OFX/QFX export needs no Python importer. When its header row names columns bea
recognizes, `bea import statement.csv --account Assets:Checking` is the whole
command; otherwise name the columns with `--csv`. Either way bea previews the
resulting Beancount directives, checks duplicates, validates the candidate
ledger, and applies only when requested. OFX/QFX exports follow the same shape —
`bea import statement.ofx --account Assets:Checking` — and are documented under
[OFX without an importer (`--ofx`)](#ofx-without-an-importer---ofx); what follows
walks through CSV.

```bash
bea --no-input init books --currency USD --date 2026-08-01
cat > statement.csv <<'EOF'
Date,Payee,Narration,Amount
2026-08-02,Whole Foods,groceries,-20.00
2026-08-03,Shell,gas,-40.00
2026-08-04,Unknown Shop,mystery,-9.99
EOF
bea --file books/main.bean add open --date 2026-08-01 --account Expenses:Transport:Fuel -c USD
cat > rules.toml <<'EOF'
[[rule]]
match = "whole foods|trader joe|corner market"
account = "Expenses:Groceries"

[[rule]]
match = "shell|chevron|exxon"
account = "Expenses:Transport:Fuel"
EOF
bea --file books/main.bean import statement.csv --csv date=Date,amount=Amount,payee=Payee,narration=Narration --account Assets:Checking --rules rules.toml
bea --file books/main.bean import statement.csv --apply
```

The first import previews every row; the mapping is remembered, so `--apply`
re-runs flag-free. The `rules.toml` above matches the bundled
[rules example](examples/rules.toml). The walkthrough as written exits **0**
throughout and leaves one `!`-flagged row for the categorization queue below.
A Python importer remains the advanced path for formats neither no-code path
covers; it is documented after them, under
[A Python importer (`--config`)](#a-python-importer---config).

The preview includes every directive, destination accounts, row status, date,
payee, signed source amount, a unified ledger diff, and validation errors.
Duplicate candidates show the existing entry and its source location beside
the explanation. Fix categories or account openings
in the mapping, rules, or ledger, then rerun the preview. `--apply`
recomputes the preview from the current files and refuses an invalid result.
The human preview offers `--apply` when entries are ready and no unresolved
review blocks the import. With only exact duplicates or skipped rows it says
`Nothing new to import.`; blocked or conflicting rows ask for resolution and
another preview. Possible duplicates under the default review policy ask for
a `--duplicates skip/include` decision before previewing again.
A ledger that already fails validation blocks the import; `--allow-errors`
previews and applies over semantic errors such as a failing balance assertion,
never over syntax errors, and lists what it tolerated under
`validation_warnings` in JSON. Syntax errors stop both preview and apply,
even with the flag: fix the named file and line before any rows can be
reported ready.
A concurrent ledger change during preparation causes exit **4**; no entries
are appended. An `--apply` refused because duplicates need review also exits
**4**, including under `--no-input`. A successful preview or an explicit
decision to skip all duplicates exits **0**.
There is no automatic categorization model or hosted request in this command.

For split ledgers, add `--into 2026.bean` to write an included file while
`--file books/main.bean` continues to identify the validation root. The
destination is relative to the root ledger's directory and must already be
included by a literal path or glob. The preview's `into` and diff identify the
actual destination. If it does not exist, a successful `--apply` creates it;
previews, rejected imports, and imports with nothing new leave it absent.

## CSV without an importer (`--csv`)

The mapping implements the same identify/account/extract shape as a Python
importer, so preview, duplicate matching, validation, diff, and apply are
unchanged. The walkthrough above is the whole interface; this section is the
reference:

`--csv` takes `field=Column` pairs separated by commas; double-quote a column
name that holds a comma itself, as in `--csv 'date=Date,payee=Payee,amount="Amount (USD, net)"'`.
Inside the quotes two double quotes in a row are one literal quote, as in CSV, so a header
`Memo "` is written `narration="Memo """`.
`date` is required, as is at least one of
`payee` and `narration` — a single bank description column belongs in
`narration`, which keeps the payee field free for the merchant that
payee-based reporting groups by. `id` and `currency` are optional. Amounts
take either `amount=Column` or the `debit=A,credit=B` pair (exactly one of the
two). With the pair, the *column* decides the direction and the cell supplies
only the magnitude: a debit posts negative and a credit positive however the
bank signed the cell, so a `Money Out` column printed `-4.50` still posts
`-4.50`. A column that mixes non-zero signs is refused naming the column and
the two disagreeing rows — map it as `amount=` instead, where the sign *is* the
direction. When the export carries unsigned magnitudes with a direction column
(`Type` holding DEBIT/CREDIT, D/C, Dr/Cr, or Af/Bij), map it with
`direction=Column`: the column decides each row's sign and the cell supplies
only the magnitude, as with the pair. Unknown or blank direction cells are
refused with the row named. `direction=` combines with `amount=` only — not
with the pair, which already decides the direction, and never with
`sign=ledger`. An unmapped column whose values are only direction words is
refused while the amounts carry no sign, naming the column and the mapping
that reads it. Exactly one cell per row must be filled, and a cell that parses to
zero counts as empty, so the `Debit=30.00,Credit=0.00` shape banks zero-fill
imports as `-30.00`. Amount, debit, and credit cells must use decimal notation (`1000`,
not `1e3`); a notation error names the row and column before anything is written.
Cells may carry currency symbols (`$4.50`, `4,50 €`), thousands separators,
accounting parentheses or a trailing minus for negatives (one marker per cell:
`(-5.00)` is refused rather than read as `+5.00`; the typographic minus `−`,
U+2212, reads as `-`; the marker may stand on either side of the symbol, so
`-$1,234.56`, `$-1,234.56` and `$(1,234.56)` are one amount), and comma decimals —
the point-vs-comma convention is resolved from the whole column, and a column
mixing `1,000.00` with `1.000,00` is refused rather than guessed. A lone
`1,234` stays a thousands group, but `0,125` and `1613,030` cannot be one,
so they import as `0.125` and `1613.030`. A cell with two dot groups
(`1.650.000`) can only be dot grouping — no convention writes two decimal
points — so it settles the column to comma decimals. A dot-only column that
could be either (`650.000` against an ISK account, whose currency has no
minor unit) imports as decimals with a note naming both readings; pass
`decimal=comma` (or `decimal=point`) inside `--csv` to force one. `NaN` and
`Infinity` are blocked at preview time with the row named, so `--apply` can
never write them. A failed parse names the cell, the row, and the accepted
spellings.
Amounts default to bank sign (outflows negative); add `sign=ledger`
when the export uses the opposite convention. A row's commodity is resolved in
this order: the `currency=` column, then the source account's own currency when
its `open` directive names exactly one, then the ledger's single
`operating_currency`; with none of the three, the row is refused. `currency=`
also takes a commodity name the file has no column for — `--csv
…,currency=EUR` — for an export that never states its own currency. Such a
constant must be a commodity the ledger already knows (declared with
`commodity`, named by an `open`, posted, priced, or the operating currency),
and the preview notes that every row posts in it; a value that differs from a
header only by case (`currency=CURRENCY` for a `Currency` column) is refused
with the header it probably meant, as is any other mistyped column. A
currency cell must be exactly one commodity name (`USD`, `VFIAX`, `NT.TO`);
anything else — a space, a comma, a line break — is refused naming the row and
column before the preview, and nothing is written. A cell
carrying a symbol that names exactly one commodity (`€`, `₹`, …) and
contradicts the resolved currency is refused naming the row and the symbol,
rather than relabelled; `$` and `¥` name several commodities each and are
accepted as before, and `£` (GBP, GIP, FKP, SHP, EGP) and `₩` (KRW, KPW)
are accepted when the row posts in one of the commodities they name.
`--account` names the source account and
is required. The file may start with a BOM and with blank lines before the
header (error line numbers still count them); when title lines push the header
down, `--csv skip=N` starts the header after N leading records, and the
refusals name the header's line with the skip that reaches it. A data row that
repeats the header exactly — a page break in a paged export — is skipped with
a note, while a row whose date cell no known format reads is refused as not a
data row. Header cells are stripped before
matching, invisible format characters (zero-width spaces, direction marks,
soft hyphens, BOMs) are dropped, Unicode spaces fold to a plain space, and
the comparison is NFC-normalized — `--csv` names and remembered headers are
normalized the same way, as `--account` is for a remembered
mapping, so a composed `Descripción` names a decomposed one. A header cell
with a character left that still does not print shows it escaped in the
column listing. Field separators are detected from the header among comma,
semicolon, tab, and pipe — the one on which the header and the first rows
split into the same number of fields, so quoted `;` or dates like
`Jan 05, 2026` cannot outvote the real separator; pass `--delimiter ','`, `--delimiter ';'`, or
`--delimiter tab` to force one — or `delimiter=';'` inside `--csv` itself.
Files read as UTF-8 (with or without a BOM) unless `--csv encoding=` names
cp1252 or latin-1 — a Western European Windows export may need
`encoding=cp1252`. A bare `--csv encoding=cp1252` decodes with that codec
and then infers the mapping like `auto`. Without the key, a non-UTF-8 file
fails before importing: the error names the byte offset and asks for the
export re-saved as UTF-8. If the bytes decode as cp1252, the override is
offered only on the condition that the export really uses that encoding;
successful decoding alone cannot identify its code page. A file that
neither UTF-8 nor cp1252 decodes is named as such: only latin-1, which reads
any byte, would accept it, so pass `encoding=latin-1` only if that is the
export's encoding. An `encoding=`, `delimiter=`, `decimal=`, or `skip=` value outside
the supported set is refused before the file is read, whatever its bytes.
UTF-16 text (Excel's
"Unicode Text", recognized by its byte-order mark or NUL bytes) is refused
under any `encoding=` with a request to re-save it as UTF-8, and a `--rules`
file may start with a UTF-8 BOM. Unknown fields, missing columns, bad dates, and bad amounts fail
with the row number and column name, as `Row 2 (line 5)`: the row is the one
the preview's `ROW` column shows, and the physical file line follows it for
hand-editing. Rows whose mapped cells are all empty or
whitespace are skipped instead, and the preview counts them — which is why the
two numbers differ. A mapped column that appears more than
once in the header, or a quote left open at the end of the file, fails before
anything is written. So does a row carrying more fields than the header
declares — usually an unquoted separator inside a value, as in
`2026-01-02,-1,234.56,Coffee` under a three-column header. That row is
ambiguous rather than merely wrong (bad quoting, or the wrong delimiter), so
it is refused naming the file, line and field counts instead of being
truncated to fit, which silently shifted the remaining cells. Surplus cells
that are *empty* are tolerated: a trailing separator loses no data. Misuse exits **2**.

Rows — transactions, and a Python importer's balance, pad or close alike — that
would use an account the ledger never opened, an account that is not active on
the row's date (closed before it, or opened after it), or in a currency the open
directive disallows are shown `blocked`, not ready. A note or document is held
to less, as Beancount holds it: it may follow the account's `close` (a final
statement or attachment dated after it imports normally), still needs an account
the ledger opened (a never-opened account is `blocked` with the `bea add open`
line), and one dated before the account's opening is refused as `invalid`, naming
the opening date and its location, with `--apply` exiting **1**. An
inactive account's row names the `close` or `open` and its line, and says to
re-date it or to point the rule, category or `--default-account` at an open
account. Each row names all its missing and inactive accounts together, so
fixing one does not reveal another on the next preview. When the source account opens
after the row and carries init's `Opening balances` transaction on that open
date, the reason also names that transaction and its location: review and move
or restate it to describe the balance before the imported history, so that
history is not counted twice. Import does not edit existing opens or opening
balances. A never-opened account's row names the missing account and the
`bea add open` line that fixes it. Every blocked row stays in the diff so the
proposal stays visible, and `--apply` refuses with exit **4** while any row is
blocked. Every row blocked on the same account prints the same
line — dated for the earliest row of the import that posts there and allowing
each currency the import posts — so running it once unblocks them all. The line
carries `--file` for the ledger being imported (`bea --file books/main.bean add
open …`) unless the working directory's own `main.bean` is that ledger, so it
acts on the right books wherever it is pasted. "Opened"
is read from the ledger as the import would leave it: an account a plugin such
as `auto_accounts` opens on first use, or one whose `open` the importer returns
in the same batch, does not block its rows. On a ledger that loads
`beancount.plugins.nounused` (or `pedantic`) the printed line ends in
`--allow-errors`, because that plugin reports an account until something uses
it; the account staged that way does not block the import that first posts to
it. A currency mismatch offers a fix the run can apply first and widening the
`open` directive last, since widening it would book the foreign amounts as the
wrong commodity: on a CSV run's source account, the `--csv currency=` setting;
on a rule, category or `--default-account` account, choosing an account open
for that currency; and for a Python importer, having the importer post a
currency the account allows. An account under a root the ledger
does not use (`Foo:Bar`; the roots are its `name_*` options) can never be
opened: `--account`, `--default-account`, and rule accounts naming one exit
**2**, a category cell naming one queues the row for review, and an importer
posting to one is blocked without an `add open` suggestion. An importer's
`balance` row is blocked, naming the pad and the amount, when a pad an earlier
assertion already used would silently fill its gap — the rule `bea add balance`
refuses by; a staged pad still completes as the two-step intends. The same holds
for the `--account` itself: a row posted against its own source cancels
out, so a rule or `--default-account` naming it exits **2** and a category
cell naming it queues the row for review.

### Reading the header row

With no `--csv`, no remembered mapping, and no Python importer configured, bea
reads the mapping off the header row. `--csv auto` asks for the same reading
outright and fails naming the file's actual columns when it cannot. A role is
only filled when exactly one column claims it, so an export carrying both
`Description` and `Memo` reports the ambiguity — naming the role, the tied
columns, and a `--csv` line that resolves it — and leaves that
role unmapped rather than guessing. `Description`-style headers map to
`narration`; `Payee` and `Merchant` map to `payee`.

`--date-format` is likewise read from the file when unset: bea keeps the one
`strptime` format that parses every date in the column. A column whose days
never pass the twelfth cannot distinguish `%m/%d/%Y` from `%d/%m/%Y`, and bea
says so instead of choosing quietly. When no known format reads the whole
column, the error names the row whose date ruled out the last one; correct
that cell or pass `--date-format`. Anything read this way is printed as the
equivalent flags, so a wrong reading is visible in the preview that writes
nothing. An option you type always wins over one bea read or remembered.

An `id` column becomes `bank_id` metadata, so stable bank IDs deduplicate like
a Python importer's. Rows without one get the same `csv:sha256:` content hash
described under [Duplicate decisions](#duplicate-decisions).

### Categorization rules (`--rules`)

A TOML rules file categorizes rows by regex over three fields — payee,
narration, then the category label (case-insensitive, with pattern and text
compared NFC-normalized, so a composed `café` matches a decomposed one, and
with a multi-line cell's CR/LF line breaks read as the single space the
preview shows); the first matching rule wins:

```toml
[[rule]]
match = "whole foods|trader joe"
account = "Expenses:Groceries"
```

See the bundled [rules example](examples/rules.toml). Each entry needs
`match` and `account` and holds nothing else; a bad regex, a file without a
`[[rule]]` list, any other table (a misspelled `[[rules]]`) or any other key in
a rule (`field`, `flag`) fails with exit 2 naming the rule or the table, and
nothing is written or remembered. An empty or whitespace-only `match` is refused, and
so is any pattern that matches empty text (a trailing `|` as in
`"whole foods|"`, `(cafe)?`), since it would match every row — write
`match = ".*"` for an explicit catch-all. A regex that uses a backslash goes
in single quotes, `match = '\bshell\b'` (or doubled, `"\\bshell\\b"`): TOML
reads `"\b"` as a backspace, and a `match` holding a control character is
refused. Rules beat a `category`
column, and also match its labels: a rule pattern matching a bank's own
label categorizes the row before the category column is considered. An
explicit `category=Column` mapping, or a `Category` header when unmapped,
categorizes rows the rules skip, but only when the value is a full account
name such as `Expenses:Groceries`. A bank's own label such as `Groceries`
is not an account; rows no rule matches join the review queue and the
preview says so once, naming the labels it saw. Rows nothing matches post to
`--default-account` with flag `!` — by default `Uncategorized` under the
ledger's expenses root, so `Expenses:Uncategorized` unless the ledger sets
`name_expenses` (`Aufwand:Uncategorized` for `"Aufwand"`) — while matched
rows carry `*`. The preview's `RULE` column names the winning pattern (or
the category value, or `unmatched`), and JSON rows carry the same value in
`rule`. List the categorization queue with
`bea list transaction --flag '!'`, categorize, and re-import only after
opening any missing accounts: a rule naming an account the ledger does not
open fails validation with the `bea add open` command to run.

Clear the queue with `bea update transaction`: point `--id` at a row's
import-id (or its `file:line` from `--details`), preview the diff, and apply
it. Only that entry's lines change, and its `import-id` stays, so the next
import of the export still skips it:

```bash
bea --file books/main.bean list transaction --flag '!' --details
export ID=$(bea --json --file books/main.bean list transaction --flag '!' | jq -r '.data[0].meta["import-id"]')
bea --file books/main.bean update transaction --id "$ID" --account Expenses:Dining --flag '*'
bea --file books/main.bean update transaction --id "$ID" --account Expenses:Dining --flag '*' --apply
bea --file books/main.bean list transaction --flag '!'
```

For a longer queue, `bea update transactions --from queue.csv` applies a whole
`id,account,flag` mapping in one previewed write per file; see [Updating
directives](USAGE.md#updating-directives).

```bash
cat > category.csv <<'EOF'
Date,Description,Amount,Category
2026-08-05,Card purchase,-12.50,STARBUCKS
EOF
cat > category-rules.toml <<'EOF'
[[rule]]
match = "starbucks"
account = "Expenses:Dining"
EOF
bea --file books/main.bean import category.csv --csv date=Date,amount=Amount,narration=Description,category=Category --account Assets:Checking --rules category-rules.toml
```

Card and bank exports often carry a `Status` column (`Pending`/`Posted`), and
a pending charge often posts days later at another amount (a tip, a hold, a
currency conversion). Map that column with `status=Column`, as header
inference does for a `Status` header, and a row whose status reads `Pending…`,
an authorization (`Authorized`, `Pre-authorized`, `Authorization`), a hold
(`Hold`, `Held`, `On-Hold`, `Temporary Hold`), `Processing` or `Not Posted` is
left out; so is one that never posted (`Declined`, `Reverted`, `Failed`,
`Cancelled`, `Void`, `Rejected`), matched case-insensitively. The preview names
them ("Left out 1 pending row(s) (…); import them from the export they post
in", and a separate note for rows that never posted) and counts them in
`skipped_pending`. Those rows are not read for the date format either, so a
pending row's empty or `Pending` date cell never refuses the export. The posted
row then arrives once, in the next export. A mapping without `status=` imports
such rows as they are, and a column that marks some rows so is named in a note
suggesting `status=` for it; a date that will not parse on such a row says so too.

The mapping is remembered per root ledger, CSV header row, and source account,
along with the `--rules` path, `--default-account`, an explicit
`--date-format`, a delimiter you passed (`--delimiter` or `delimiter=`; a
detected one is re-detected for each file, and a remembered one that no longer
reads the header gives way to detection with a note), a `decimal=` you
passed, and a `skip=` you passed — but never `sign=`, which a different file
always needs passed explicitly. The one exception keeps a preview honest: after
`sign=ledger`, a flag-free `--apply` of the byte-identical file re-applies it
and says so; another file sharing the header is read bank-signed, with a note
naming the file that used `sign=ledger`. Each file keeps its own sign, so
previewing next month's export with the same header leaves this month's
`sign=ledger` in place. Previewing a file again without it drops only that
file's. Editing the file re-hashes it — the same name with changed bytes, as
when a pending row is deleted — and a flag-free run then refuses until the
sign is passed again, rather than replay a sign chosen for other bytes or
read the file bank-signed. A `--csv` that carries only keys —
`--csv sign=ledger`, `--csv encoding=cp1252`, `--csv delimiter=';'`,
`--csv decimal=comma`, `--csv skip=3` — applies them
on top of the mapping remembered for that header and account, keeping its
columns, rules, default account and date format; it infers from the header only
when nothing is remembered. When only one account uses those headers, the next import needs
no flags. If checking and savings exports share headers, their mappings are
kept separately and subsequent previews and applies require
`--account ACCOUNT`; bea refuses to choose between them. Always specify
`--account` when importing from a new account, since headers alone cannot
identify a bank account. A run whose `--account` or `--default-account` the
ledger does not open is not remembered — it says so — so a typo never becomes a
second account for the header. NFC and NFD account spellings use the same
guard, and saved source and default account names use NFC.
To forget settings already remembered, delete
the ledger's record in `importers/` under the configuration directory; the
"matches multiple source accounts" refusal names its path. For example:
`bea import checking.csv --account Assets:Checking --apply`.
For a remembered mapping, human output reports
`Using remembered settings for <file>` (or `Using settings remembered from
<seeding file> for <file>`) listing every setting in force as flags that paste
back: one `--csv` carrying the columns and any `encoding=`, then `--account`
and the rest. JSON reports
`config_source` `remembered --csv` plus a `remembered` object with the same
fields (`null` when the run used no memory). A successful explicit `--csv`
preview or apply replaces the remembered settings; settings it drops are named,
never silently discarded. A remembered `--date-format` the refresh does not
repeat is kept when the new file's dates read the same way, and named as
discarded otherwise. An option typed on a run that used the remembered
mapping — `--date-format`, `--rules`, `--default-account`, `--delimiter` — is
saved with it once that run succeeds, and the run says so
(`Updated remembered settings for <file>`), so a flag-free `--apply` writes the
rows the last preview showed. Failed runs leave the saved settings unchanged,
including an apply rejected for review with exit 4. A successful preview can
remember its mapping even when some rows need review. Only a `--date-format`
you passed is remembered, and even that is re-validated per file: when the new
export unambiguously uses another convention, the import refuses and names the
expected format, since two
exports can share a header row without sharing a date convention. A
remembered `encoding=cp1252` or `encoding=latin-1` is re-validated the same
way: a later file that is valid UTF-8 with accented or other non-ASCII text is
read as UTF-8 for that run, with a note, and the remembered encoding stays
saved for files that are not UTF-8. Reusing either legacy codec for non-UTF-8
text emits an uncertainty note before importing, also included in JSON
`notes`: confirm the export's encoding explicitly or re-save it as UTF-8.
The stored mapping stays unchanged. An explicit encoding for the current
run remains authoritative, and ASCII needs no uncertainty note. A
remembered `--rules` path that is missing or unreadable degrades to a warning
and an unruled import rather than failing; that repair is saved only after a
successful preview or apply. A changed header row matches
nothing remembered, and bea falls back to reading that header directly.

Remembered settings live in `importers/` under the config directory. When
that directory cannot be read (wrong modes after a restore, or left
root-owned by a privileged run), the import still runs — on the options you
typed, an `importers.py` beside the root ledger, or the header row — with a
stderr note (`Cannot read remembered import settings in <directory>`) that is
also in the JSON `notes`, and that run is not remembered. When it cannot be
written (a read-only config directory in a container or sandbox), the import
still succeeds and says what to pass next time — `Could not remember the
column mapping: <reason>. Pass --csv on the next import.`, or `Could not
remember the importer path: <reason>. Pass --config on the next import.` — on
stderr and in the JSON `notes` alike.
A remembered importer record that is not valid JSON, or not of the form
`{"config": "<path>"}`, selects nothing, just like an importer that was moved
away. The note (`The remembered importer record <file> is not valid; ignoring
it.`) names the file, and the `importers.py` and header-row fallbacks apply.
A record bea cannot read (wrong mode) still stops a flag-free import, since it
may name the importer the ledger relies on. The refusal names the file. Make
it readable or delete it, or choose for that run with `--config FILE` or
`--csv auto`.

## OFX without an importer (`--ofx`)

An OFX or QFX export — the format banks offer beside CSV — imports with no
Python importer either. bea detects `.ofx`/`.qfx` files (and OFX content under
any suffix) and parses their statements with the OFX importer Beangulp ships
as an example, so preview, duplicate matching, `--rules`, validation, diff,
and `--apply` behave exactly as for CSV. Parsing needs Beangulp in the
managed engine: `bea engine enable beangulp` once, and the import refuses
with that hint until it is enabled.

```bash norun
# Needs 'bea engine enable beangulp'.
bea --file books/main.bean import statement.ofx --account Assets:Checking
bea --file books/main.bean import statement.ofx --apply
```

The first import previews every row; the account is remembered per OFX account
id, so `--apply` re-runs flag-free, as does next month's export from the same
account. `--rules` match the statement text (merchant name, memo, and type
joined with ` / `), `--default-account` catches the rest, and unmatched rows
post to `<expenses root>:Uncategorized` with flag `!` for the review queue —
the same mapping the CSV path uses. Pass `--ofx` to force the OFX path, for
example when the ledger also keeps Python importers: a configured ledger
otherwise keeps using them for OFX files too.

Each statement row posts its amount with the sign the file states, dated per
`DTPOSTED`. A row's `FITID` becomes `import-id: "ofx:<FITID>"`; a row without
one gets an `ofx:sha256:` content-hash import-id and a preview note saying so.
A file mixing several account ids is refused — import one account per run, or
use `--config` with one importer per account — as is a file holding no bank
or credit-card transactions: investment statements need a Python importer.
Ledger balances are ignored: no `Balance` directive is emitted.

Synthetic samples live beside the other examples: [checking.ofx](examples/checking.ofx)
(a checking account), [credit-card.qfx](examples/credit-card.qfx) (a credit card),
[multi-currency.ofx](examples/multi-currency.ofx) (one account, a USD and a EUR
statement, in OFX 2.x form), and [fitid-collision.ofx](examples/fitid-collision.ofx)
(one `FITID` reused on two different rows, which preview as a conflict). All ids,
names, and amounts in them are invented.

## A Python importer (`--config`)

For formats the column mapping cannot express, `bea import` calls configured
importers using the modern
[Beangulp interface](https://github.com/beancount/beangulp/blob/master/beangulp/importer.py):
`identify(filepath)`, `account(filepath)`, and `extract(filepath, existing)`.
The importer owns bank-specific parsing and categorization. The importer must
supply explicit amounts on source-account postings so duplicate matching uses
actual bank amounts.
`account()` names the source account: either an account every transaction row
posts to, or a parent of one, as a brokerage importer that returns
`Assets:Broker` and posts to `Assets:Broker:Cash` and `Assets:Broker:HOOL`
does. A row's source postings are the ones to that exact account when it has
any, otherwise every posting under it. A row with neither stops the import
(exit 1, nothing written) with the accounts it does post to.

```bash norun
# Needs a Python importer file; the runnable example below provides one.
bea --file books/main.bean import statement.csv --config importers.py
bea --file books/main.bean import statement.csv --apply
```

The Python configuration must export `CONFIG = [importer, ...]`. An import
executes this Python file, so use your own local configuration. The selected
path is remembered per root ledger. Both this path and a `--csv` mapping
belong to the ledger file, not to the spelling typed for it: on a
case-insensitive volume `Books/main.bean` and `books/main.bean` share one
memory. An explicit `--config` overrides it;
without a saved path, the CLI uses `importers.py` beside the root ledger.
A saved path whose file has since been moved or deleted is ignored with a
stderr note (`The remembered importer <path> is missing; ignoring it.`), and the
run continues as if nothing were saved: `importers.py` beside the root ledger,
then the header row.
It does not search the working directory or parent directories for Python files.
Human output reports `Using importers from <path> (<source>)` on stderr. The
source is `--config`, `remembered`, or `default beside root ledger`. JSON
includes the path in `config` and its source in `config_source`.
The importer chooses the account and categories itself, so `--account`,
`--rules`, `--default-account`, `--date-format` and `--delimiter` are refused
(exit 2) on a run that resolves to a Python importer, including the remembered
and default ones; pass `--csv auto` with them to read the file by its header
row instead.
If multiple importers recognize the export, select one with `--importer NAME`.
Importers that share a name, such as two instances of one class configured for
different accounts, are listed as `NAME#1`, `NAME#2` in `CONFIG` order with the
account each files under; pass that selector, or give each importer a distinct
`name`.
An unknown name lists the available importer names; a recognized name whose
importer rejects the file reports that separately.
`--importer` names a Python importer only: on a run that resolves to the column
mapping (`--csv`, the header row, or a remembered mapping) it is refused (exit
2) rather than ignored.
The configuration can import sibling modules. It runs as a script, so import
them by plain name (`import helper`), not relatively; a wrong name or a relative
import is reported as `Importer failed (ImportError)`, and only a module that
cannot be found is reported as a missing engine dependency. Importer output — including what a child
process it runs prints — is captured in the preview's `importer_output` field
so it does not corrupt JSON. If the importer then raises, what it printed first
is kept: human output shows it on stderr ahead of the error, and JSON carries
it as `error.result.importer_output`.
A configuration that calls `sys.exit` — a Beangulp ingest script whose
`beangulp.Ingest(CONFIG)()` is not under `if __name__ == "__main__":` — is
reported the same way, as `Importer failed (SystemExit: N)` with that hint and
exit 1, before anything is written.
For importer exceptions, put `--debug` before the command to see the traceback:

```bash norun
# Needs a Python importer file; shows where a traceback would appear.
bea --debug --file books/main.bean import statement.csv --config importers.py
```

With `--json --debug`, the traceback is a string in `error.traceback`; stderr
remains one JSON object and stdout stays empty on failure.

## A runnable example

The bundled [CSV example](examples/csv_importers.py) uses only the standard
library and Beancount, so it runs in the Homebrew installation without extras.
Its input is a categorized export with a signed checking-account amount.
From a CLI source checkout, run:

```bash
bea --no-input init books-py --currency USD --date 2026-08-01
cat > bank.csv <<'EOF'
Date,Payee,Narration,Amount,Currency,Category,BankID
2026-08-02,Cafe,Coffee,-5.25,USD,Expenses:Dining,bank-001
2026-08-03,Employer,Salary,1000,USD,Income:Salary,bank-002
EOF
bea --file books-py/main.bean import bank.csv --config docs/examples/csv_importers.py
bea --file books-py/main.bean import bank.csv --config docs/examples/csv_importers.py --apply
bea --file books-py/main.bean check
```

For a bank's native CSV, try [`--csv`](#csv-without-an-importer---csv)
first; for OFX/QFX, try [`--ofx`](#ofx-without-an-importer---ofx) first; for
QIF, or a CSV the mapping cannot express, use an importer for that exact
format.
The sample is a configuration example, not a universal bank parser. Legacy
Beancount v2 importers that take a `FileMemo` need Beangulp's `Adapter` in the
configuration; the CLI calls the current interface directly. `Adapter` accepts
only a `beangulp.importer.ImporterProtocol` subclass: a `beangulp.Importer`
whose `name` is a plain method needs `@property` instead, and the refusal says
which applies. Every `CONFIG` entry must be an importer instance with
`identify`, `account` and `extract` methods; `None`, a string or a factory
function is refused by its position before any importer runs.

## Duplicate decisions

`bea import` follows the [`import-id` convention](../../skills/beancount-import/references/dedup.md),
so entries written by the CLI and by the `beancount-import` / `beancount-migrate`
skills deduplicate against each other: the ledger itself is the dedup database.

- A stable transaction ID is strong evidence. By default the CLI checks
  transaction metadata `bank_id`, `fitid`, `transaction_id`, and `imported_id`,
  scoped to the importer's source account, and always checks `import-id` and
  `import-id-2`. Use repeated `--id-key KEY` options to replace the native-ID
  list for your importer (a custom key uses its own name as the namespace).
  `--id-key id` is accepted in any case (`ID`, `Id`) as an alias for `bank_id`,
  the canonical key the `--csv` path writes, and a `--csv` mapping with `id=`
  keeps `bank_id` in the list whatever keys you name, so `--id-key` never
  silently disables bank-ID dedupe. A default key spelled in a way no metadata
  key can be folds to it (`FITID` is `fitid`). A legal key is used as typed,
  camelCase included (`fitId`, `bank_ID`). A metadata key needs at least two
  ASCII characters: a lowercase letter followed by letters (either case),
  digits, `-` or `_`. Any other key that cannot be a metadata key (including an
  empty or single-character key, or one not starting lowercase) exits **2**
  before the ledger is read or the importer runs.
  IDs must be stable and unique within that account. A transfer written by
  importing one account (its first posting) keeps that account's ID even
  though it also posts to the other account; its `import-id-2`, when it has
  one, is the other account's own ID and matches that account's row exactly.
  A first posting to `--account` or any account under it is the importer's
  own, so a brokerage trade that lists `Assets:Broker:HOOL` first re-imports
  under `Assets:Broker` as a duplicate. Importing the other account never
  takes that ID for one of its own rows. When the row has the same amount
  within a week, it is a possible duplicate ("on the other side of a transfer
  from …"), for banks that give both legs one reference; otherwise it is new.
  An exact match is skipped;
  reused native IDs with different source amounts or commodities are conflicts
  requiring review. Source amounts compare however either side groups them
  into postings: a `-104 USD` withdrawal matches `-100 USD` and `-4 USD`, and a
  written `-4 HOOL` lot reduction matches a statement's `-1` and `-3` fills
  of it, provided each unit moves for the same account, in the same direction,
  at the same price and from a lot both sides agree on. An ID repeated within one export with different data is a
  conflict too; it names the earlier row of the import, and the fix is in the
  source file rather than the ledger. An ID repeated within one export with the
  same amount on another date — a monthly autopay reusing one
  reference — is a possible duplicate naming the earlier row, never a silent
  skip: choose
  `--duplicates include` to keep both, or map that column to something other
  than `id`. A same-day repeat that differs only in its description is still one
  transaction and is written once. The same holds across exports, where a
  monthly autopay arrives one month per file. A ledger entry under the row's
  native ID with the same source amounts, dated a week or more from it, is a
  possible duplicate naming that date, never a silent skip; at different
  amounts it is the conflict above, on any date. A re-import is matched to the entry under that ID
  dated nearest the row among those with its source amounts, so January's row is January's duplicate
  even when February's amount under the same reference differs; it is a conflict only when no entry
  under the ID has the row's amounts. When the nearest such entry is a week or more away and another
  entry repeats the row on its own date, the possible duplicate names that entry instead, since
  `--duplicates include` would book it twice. Payee, narration, date, flag, and counter-account edits to an entry already in the ledger do
  not change that identity (generated ids: see below). For a native ID, a date
  moved by less than a week still matches. The preview's `ID` column names each row's
  identifier source: `bank` for a bank column, `hash` for a content hash, or
  `importer` for an `import-id` the importer supplied.
- A row with a native ID is written with `import-id: "<kind>:<id>"` (`bank_id`
  becomes `bank:`, `fitid` becomes `ofx:`). A row without one is written with
  a content-hash import-id — `csv:sha256:<16 hex>` for CSV and `--config` rows,
  `ofx:sha256:<16 hex>` for `--ofx` rows — hashed from
  `date|amount|description|account` per the convention: the ISO date, the
  exact source amount with its commodity and trailing zeros stripped
  (`-54.2 USD`) — with the per-unit cost (and acquisition date and lot label,
  when the importer states them) or price of a source posting held at cost or
  priced (`10 AAPL {100 USD}`), so two same-day buys of one share count at
  different prices, and two same-day sales selecting differently dated lots
  (`{100 USD, 2024-01-02}` and `{100 USD, 2024-01-03}`) or by label or number
  alone (`{"X"}` and `{"Y"}`, `{100}` and `{120}`), are two rows; ids written
  before that (units only, or without the date or partial selector) still
  match, but only the same lot. A cost the importer leaves
  open (`-4 HOOL {}`) compares only what it states, so it matches the lot
  booking chose for the entry already in the ledger, or the lots it chose
  when the sale spans several (`-20 HOOL {}` against `-10 HOOL {150 USD}` and
  `-10 HOOL {155 USD}`, the units adding up) — the narration (or payee when
  narration is empty) uppercased with whitespace collapsed, and the source
  account. A row with both a payee and a narration hashes both, as
  `date|amount|payee|narration|account`, so rows that differ only in payee
  keep distinct ids however the export orders them. A payee or narration that
  itself contains `|` or `\` is written with each as `\|` or `\\` in the hash
  input, so payee `Shop|Branch` with narration `Purchase` and payee `Shop` with
  narration `Branch|Purchase` are different rows; ids written before that
  (unescaped) still match, but only when the payee and narration agree. Identical rows within one
  file take an occurrence suffix, so re-importing the same file skips every row.
  A row with one description is counted among the one-description rows only, so
  a blank payee cell beside rows that name a payee gives the same id wherever
  the row falls. Keep this metadata when editing
  entries. New writes no longer carry the pre-release `bea_import_id` key, but
  existing entries with it still match on re-import.
- A generated id matches by its digest under any source prefix
  (`<source>:sha256:<16 hex>`, where the source name is a lowercase letter
  followed by lowercase letters, digits, `-` or `_`, such as `lunch_money`). So a bank export
  overlapping history that `beancount-migrate` wrote as `monarch:sha256:…`
  (or `mint:`, `qbo:`, or the generic path's `ynab:`, `actual:` and the like)
  is skipped rather than written again. For each side of a merged transfer, the digest is found through
  `import-id` or `import-id-2`. The digest already binds the date, amount,
  description, and account of the original source row, so a canonical
  generated-id hit is a duplicate even if the ledger's date, amounts, payee, or
  narration were edited later. Preserve the ID while reviewing an entry; it
  records where that entry came from, not its current presentation. A canonical
  hit also takes precedence over older file IDs retained on the same entry.
- Ids written before the amount was exact (it was rounded to two decimals with
  no commodity, or later to 28 significant digits), before the description
  was NFC-normalized, or since 0.3.1 with the description hashed after
  control-character escaping (a tab as literal `\x09` instead of collapsed
  whitespace) are still
  recognized: import offers every older spelling as a lookup-only key, matches
  it, and writes only the current one, so no re-hash pass is needed. An older
  *amount* digest also has to agree with the date and source amounts before it counts
  as a match, because that form was lossy enough to give two different rows one
  digest — a disagreement is ignored rather than reported as a conflict. A
  reused **native** bank ID with different source amounts or commodities is
  still a conflict.
- Ids written before payees were hashed (narration only) also stay
  lookup-only. Because their occurrence suffixes followed the old export's row
  order, every such id that a group of same-narration rows reaches is given to
  the row with that entry's payee — an entry with no payee to a row with no
  payee; an id whose payee no row has (edited since) stays with the row at its
  old position. One-description ids that an earlier release numbered behind
  payee-bearing rows are matched the same way.
- Date, normalized payee, and signed source amount/currency identify a *possible*
  duplicate even when bank IDs or narration differ. A row with no payee (the
  one-description mapping) is compared by its normalized narration instead, so
  two different same-day purchases of one amount are both new. When either the
  row or an entry already in the ledger has no payee, the two meet on their
  narrations. So a bank export of rows a migration wrote as payee plus
  statement text is not booked again. Two different named payees never meet on
  a shared narration, and neither do two rows of one export. This does not prove
  duplication: two real purchases can have identical details. `--apply` requires
  `--duplicates skip` or `--duplicates include`; choose include to preserve
  legitimate repeated purchases. Review the rows before choosing;
  the choice applies to all possible matches in that invocation.
- The other side of a transfer is a possible duplicate too, whatever each bank
  calls it. A transfer written by importing another balance-sheet account (its
  first posting) that posts this row's amount to `--account` within three days
  is named as "A transfer from … already posts …; this row may be its other
  side". So `TRANSFER TO SAVINGS` imported from checking and `TRANSFER FROM
  CHECKING` from savings are booked once, after `--duplicates skip`. A transfer
  has one other side: it is offered only to the row of this import dated
  nearest it (the earlier row when two are as near), so a deposit of the same
  amount a day later is new and `--duplicates skip` keeps it.
- Identical nontransaction directives are skipped. They are compared, and
  written, as the ledger reads them back: text in Unicode NFC, and a balance
  assertion without the difference a failing one reports. A `price` directive
  follows `bea add price` instead: the ledger keeps one quote per commodity and
  day, so a price equal in value to a recorded one (`110.0` against `110.00`)
  is a duplicate, and a different amount for that day — recorded in the
  ledger or in an earlier row of the import — is a conflict naming both
  values, which `--apply` refuses with exit **4**. A same-day quote in the
  other direction that disagrees is a conflict too. A price a plugin such as
  `implicit_prices` generates counts as neither. Import does not change the
  meaning of existing transactions or delete them, and never modifies existing
  lines: appended entries are written where `bea format` would put them, and
  `bea format` remains the only command that realigns a file.
  Amount corrections and recategorization of existing entries remain deliberate
  ledger edits.

Both existing entries and accepted rows in the same batch participate in
matching. Existing entries are the ones written in the ledger's files: a
transaction a plugin generates — a `fava.plugins.forecast` projection, an
amortization copy — is neither a duplicate nor a possible duplicate, so a real
payment it predicted imports as new. This includes the projection on the
template's own date and generated fees sharing a written transaction's line:
content matching requires the transaction's payee and narration to be declared
at that source location. A stable ID does not: a written transaction whose
payee or narration a plugin rewrites — a header normalizer — keeps its
`import-id` and bank ID, so the same export imported again is still skipped.
`bea add transactions --from FILE.json` remains a plain validated
append operation and intentionally does not deduplicate.

## Python dependencies and metadata

No extra dependency is needed for the CSV mapper or the importer interface
itself. The no-code OFX import and configurations that `import beangulp` (or
other importer packages) need Beangulp in the **managed engine**, not the bea
frontend:

```bash norun
# Needs network to provision Beangulp into the managed engine, a Python importer,
# and a real OFX/QIF (or similar) bank export.
bea engine enable beangulp
# The system libmagic library is optional: only importers that call
# python-magic themselves need it.
bea --file books/main.bean import bank.ofx --account Assets:Checking
bea --file books/main.bean import bank.ofx --config importers.py
# Standalone Beangulp lifecycle (not bea import --apply):
bea ingest identify --config ingest.py downloads/
bea ingest extract --config ingest.py downloads/ -o extracted.bean
bea ingest archive --config ingest.py downloads/ -o documents/ --dry-run
```

`bea engine status` shows whether each optional feature is enabled. This does
not alter the Homebrew/PyPI frontend environment. Add third-party importer
packages the same way you would for any engine-side dependency once Beangulp is
enabled, or keep a separate project environment for custom importer development.
For raw identify/extract/archive that preserve Beangulp hooks, dry-runs, and
archive naming, use `bea ingest` with an ingest script that calls
`beangulp.Ingest(...)()`. Preview/apply into the ledger remains `bea import`.

Native transaction and posting metadata are retained, including booleans,
decimal numbers, dates, and amounts. A Python `int` metadata value is written
as a number (`check_number=1042` becomes `check_number: 1042`); a value
Beancount cannot print, such as a `float` or an arbitrary object, stops the
import with `Importer NAME row N cannot be written as a ledger entry` and
writes nothing. So does a row that prints but would not read back as one
directive (an uppercase metadata key, a `NaN` amount, a tag with a space), a
date that is not a `datetime.date`, and a source posting with no amount; the
sentence goes on to name the field. A row the ledger refuses once appended,
such as one that does not balance, is shown `invalid` with Beancount's reason,
is not counted ready, and `--apply` refuses with exit **1** naming it. Custom directive boolean/date values also
survive listing and serialization. See [the JSON reference](USAGE.md#investment-postings-and-metadata)
for the typed metadata representation used by `bea list transaction` and
`bea add transactions`.

Imported payees, narrations, and string metadata replace CR/LF line breaks with
spaces before preview, duplicate matching, and writing. A quoted multiline CSV
field therefore stays on one ledger line, keeping merchant-provided text
readable in diffs and tables. Quotes and backslashes retain their contents;
typed metadata retains its type.

In global `--json` mode, preview and successful application return the normal
envelope. An application blocked by conflicts or validation exits **4** or
**1** and includes the full preview in `error.result`, with `written: 0` and
the same `notes`, `date_format` and `remembered` fields a preview carries. A
failure with no preview, on a run whose column mapping was remembered or read
from the header row, lists those settings notes first in the error details.
This includes refusals while checking remembered date formats or decoding
the next export. If reading the header fails before a mapping can be found,
the details still include any warning about unreadable remembered settings.
The same details appear in human output. Fully typed column mappings keep
the error’s own details.
Review refusals also list the affected preview row numbers and reasons in
the error details, including in human `--apply` output.
