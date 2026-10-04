# Usage

The Beancount.io CLI installs one command: `bea`. New here? Start with the
[first-month tutorial](TUTORIAL.md), then use this guide as the contract.

```text
# Local — works on .bean files
bea init [DIRECTORY] --currency USD
bea import EXPORT [--config importers.py] [--into FILE] [--apply]
bea import EXPORT.csv --csv date=Date,amount=Amount,payee=Payee --account Assets:Checking [--rules rules.toml]
bea ingest identify|extract|archive --config ingest.py [PATH…]   # needs beangulp
bea price status|refresh | bea price [bean-price options…]     # latter needs beanprice
bea check | format | query "<BQL>"
bea list <type> | bea add <type>          # eleven directive types; add transactions --from PATH
bea report balance-sheet | income-statement | trial-balance | overview
bea balance [ACCOUNT…]                    # trial balance pruned to matching subtrees
bea ask ["question"]                      # requires beancount-io[ask] and hosted credentials

# Cloud — the beancount.io hosted service
bea cloud login | logout | status
bea cloud ledger list | create [--clone] | show | clone | delete

# CLI maintenance
bea upgrade [--check]
bea engine status
bea engine enable beangulp|beanprice
```

Everything outside `bea cloud` works on local files (`ask` is the one exception: its model calls run through the hosted AI proxy). Everything under `bea cloud` needs a session from `bea cloud login` or `BEA_TOKEN`.

## One install — no separate Beancount setup

Install `bea` from Homebrew or PyPI. Customers do **not** install Beancount,
Beanquery, or Fava themselves, and do not put `bean-*` tools on `PATH`. The
`bea` frontend never loads those libraries; local ledger work runs through a
managed engine environment that `bea` provisions.

| Channel | Provisioning | Offline reuse | Upgrade |
| --- | --- | --- | --- |
| Homebrew (`brew install bex-co/tap/bea`) | Frontend and engine virtualenvs are created during installation | Local commands use the keg-local engine with no further download | `bea upgrade` → `brew upgrade bea` refreshes both |
| PyPI (`uv tool install beancount-io` or pipx) | First local command that needs the engine downloads the hash-pinned combination (needs network and `uv` on `PATH`) | Later commands reuse `$XDG_DATA_HOME/bea/engine/<version>` (default `~/.local/share/bea/engine/…`) | `bea upgrade` upgrades the frontend and, when the version changed, provisions the matching engine |

If first-use or upgrade provisioning fails, fix network/`uv` availability and
retry a local command such as `bea check` — do not `pip install beancount`.
A broken managed environment is discarded and rebuilt on the next successful
provision; global `bean-check` decoys on `PATH` are ignored. Commands started
together on a fresh install share one provision: the first builds the engine
under a lock file beside it (`<version>.lock`) and the rest wait and reuse it.
A build killed mid-install (closed terminal, `SIGTERM`) leaves a
`<version>.partial.<pid>` directory that the next provision removes.

`bea engine status` names the engine that local commands would actually use:
a `BEA_ENGINE_PYTHON` override, the provisioned managed engine, or a source
checkout's `cli/src` (development only). When none of those exists it reports
`not provisioned; provisions on first use`. `--json` carries the same answer as
`serving.tier` (`override`, `managed`, `checkout`, or `first-use`) and
`serving.location`.

### Optional engine features (Beangulp / Beanprice)

Beangulp and Beanprice are **not** in the base engine or the frontend. Enable
them explicitly into the managed engine:

```bash norun
# Needs network once to download Beangulp/Beanprice into the managed engine;
# Beangulp also needs the system libmagic library.
bea engine status
bea engine enable beangulp    # ingest helpers; needs system libmagic
bea engine enable beanprice   # bean-price quote fetching
bea ingest identify|extract|archive --config ingest.py [PATH…]
bea price --no-cache -e USD:yahoo/AAPL   # fetch quotes (not bea add price)
```

Each enable installs a reviewed, hash-pinned lock (`engine-optional-*.lock` in
release artifacts) into the engine venv only. `bea import --csv` continues to
work without Beangulp. `bea add price` still records a supplied quote without
Beanprice. Licenses are recorded in
[ADR014](../../docs/adrs/ADR014-cli-beancount-parity.md#optional-ecosystem-licenses-m20).
Customer ledger skills follow the same one-install boundary (m21).

## Global options

Global options come before the command.

| Option | Description |
|---|---|
| `--file / -f PATH` | Ledger entry file. Overrides `BEA_FILE` and cwd `main.bean` / `main.beancount`. |
| `--json` | Emit the JSON envelope on stdout and JSON errors on stderr. Implies `--no-input`. |
| `--no-input` | Never prompt. Missing confirmation or input fails with exit 2 instead of waiting. |
| `--strict` | Refuse partial answers even in a terminal; `--allow-errors` opts into them. |
| `--offline` | Resolve managed price includes from the local cache only; never fetch. |
| `--strict-prices` | Fail the load when a managed price source is stale or unavailable. |
| `--yes / -y` | Answer confirmations with yes. |
| `--debug` | Include exception tracebacks; JSON errors gain a `traceback` string. |
| `--show-completion` / `--install-completion` | Print or install shell completion. |
| `--shell NAME` | Select bash, zsh, fish, powershell or pwsh when generating completion. |
| `--version` | Print the version and exit; under `--json`, as the envelope. Makes no network call. |
| `-h / --help` | Show help. |

```bash
bea --file main.bean check
bea --json list transaction --limit 100
bea --shell zsh --show-completion
```

### Choosing the ledger

Local commands resolve their target in this order:

1. `--file PATH`
2. `$BEA_FILE`
3. `./main.bean` in the working directory, or `./main.beancount` if `main.bean` is absent

If the resolved file does not exist, the command exits **2** and names those sources. Hosted targeting (`--ledger`) is not implemented yet.
Passing a directory also exits **2** with a hint to select its root ledger file.
An unreadable ledger exits **2**, naming the path and the source that selected
it. Choose a readable ledger or correct its permissions.
A root ledger that is a symlink keeps the path you named, as `bean-check` does:
its relative `include` and `--into` paths resolve beside the link, not beside
the file it points to, and writes such as `add` land in that file through the
link. A layout whose includes sit only beside the target fails in both.
Hosted commands name ledgers as `owner/name`; local files are never implicitly
uploaded. Each segment must match the service's own rule (owner: letters,
digits, `.`, `-`, `_`, but not `.` or `..`; name: a lowercase ledger slug), so
`../account` or `alice/..` exits **2** before credentials, a prompt, or any
request. `init` creates its target from its own argument or global `--file`
and ignores `BEA_FILE`. `format` uses its positional paths first, then global
`--file` when no paths are given; it ignores `BEA_FILE` and cwd discovery.
Directories must be positional (`bea format -i DIR`); `--file` must name a file.
The delegated commands `doctor`, `example`, and `treeify` forward
their own arguments to upstream unchanged, so they ignore all three sources:
pass the ledger as upstream's positional argument, as in
`bea doctor lex main.bean`. `bea --file main.bean doctor lex` and
`BEA_FILE=main.bean bea doctor lex` exit **2** with upstream's
`Missing argument 'FILENAME'`.

### Non-interactive behavior

`--no-input` is implied whenever stdin is not a terminal, whenever `--json` is set, and when `CI` is truthy. In that mode nothing waits for a human. Import duplicate decisions still require `--duplicates`, and AI writes still require their own interactive permission:

```bash norun
# Needs hosted credentials; demonstrates the unattended refusal.
$ echo | bea cloud ledger delete alice/books
Error: Permanently delete ledger 'alice/books'? Refusing to ask — pass --yes to confirm without a prompt.
$ echo $?
2
```

### Output destinations

One rule covers every command that takes an output destination — `query -o`,
`format -o`, `ingest extract -o`, `treeify -o`, `price export --output`,
`example -o`: **a `bea` command never replaces a file it was not given.** A
destination is refused with exit **2**, before anything is written, when it

- is the ledger under read — the root file or anything it includes, in any
  spelling the downstream parser accepts (`-o X`, `-oX`, `--output X`,
  `--output=X`, boolean flags clustered in front such as `-qo X`, and
  treeify's abbreviations such as `--outp X`), through a symlink or a hard
  link — including the `-e/--existing` ledger `ingest extract` reads, or
- would replace a file that did not come from this command: an existing
  `.bean`/`.beancount` file for `treeify -o`, and any pre-existing file at a
  path `price export` would write inside the destination directory.

A refusal names the colliding path and leaves the destination byte-identical,
its file list included. `--force` is the only way past the second case
(`treeify -o`, `price export`, `example -o`); nothing gets past the first.
The exceptions are both narrow: `ingest archive -o DIR` files source documents
into a directory tree rather than writing a ledger, so it keeps upstream's own
collision handling (exit 1 naming the document), and `example -o` reports its
existing destination as a conflict with exit **4**, the code it has always
documented. `query -o` and `format -o` overwrite an ordinary existing export
file by the usual CLI convention; only ledger files are protected there.
A device or FIFO destination is written through rather than replaced, so
`query -o /dev/null` discards the result, and `query -o /dev/stdout` (or
`/dev/fd/1`) prints it as `-o -` does.

## Exit codes

| Code | Category | Meaning |
|---|---|---|
| 0 | — | Success: the documented effect happened |
| 1 | `validation` | Ledger or validation error, and the catch-all for any other runtime failure |
| 2 | `usage` | Bad arguments, missing target, missing extra, or input needed under `--no-input` |
| 3 | `auth` | Authentication or permission failure |
| 4 | `conflict` | Conflict, or a write whose outcome is unknown |

Exit 0 is a promise: the documented effect happened, and the run left the
ledger no worse than it found it — a write that exits 0 introduces no new
`bea check` error. A command that did nothing, or that wrote only part of
what it promised, exits nonzero and says what is missing, so a script or an
agent can branch on the status without re-checking the books.

A nonzero exit does not universally mean nothing changed:
`add transactions --partial` can write accepted rows, `format --in-place` over
several files can rewrite some before failing on one it cannot write, and
`cloud ledger create --clone` can create a ledger before cloning fails. Read
the operation result before retrying mutations. A clone failure carries the
confirmed ledger metadata in `error.result`, including `id`, `full_name`,
`ssh_url`, and `http_url`; use those to clone the existing ledger instead of
creating it again. Human output prints the ledger details before cloning.
An in-place formatter failure
reports completed replacements in `error.result.formatted`, failed files and
their reasons in `failed`, files already aligned in `unchanged`, and files it
never reached in `not_attempted`. Human output names the same outcomes. Once
any file was rewritten, the error message counts each outcome instead of
repeating the stopped file's "nothing was written". A
staging-cleanup failure after a replacement still lists that file as formatted.
These per-file outcomes require the engine's result; a lost engine response
cannot establish which writes finished. `--debug` includes any upstream traceback.

These five codes are the whole table. If the engine process dies on a signal —
an upstream crash, an out-of-memory kill — `bea` reports it as exit 1 with a
message naming the signal, rather than passing the shell's `128+N` convention
through as an undocumented status. The exceptions are the two signals that mean
the run was ended on purpose: `Ctrl-C` still exits 130 and a closed downstream
pipe still exits 141, both without a message.

In `--json` mode a failure writes nothing to stdout and one object to stderr:

```json
{
  "error": {
    "category": "validation",
    "message": "Ledger has 3 error(s). Pass --allow-errors to report anyway.",
    "exit_code": 1,
    "details": ["main.bean:1: Transaction does not balance: (2.50 USD)"]
  }
}
```

`request_id` is included when the backend supplied one. `result` carries
the partial effects when the command wrote some of what it promised (the
`formatted` paths for `format`, the `written` rows for `add transactions`);
`ledger_warnings` carries loader errors a `--json` command tolerated before
failing anyway; `--debug` adds the `traceback` string.

Cloud commands map the server's HTTP status onto the same table, keeping the server's own message: `401`/`403` exit **3**, `400` exits **2**, `409` exits **4**, and everything else — including `404`, rate limiting, and server errors — exits **1**. A write whose outcome the CLI cannot know (a timeout mid-delete) exits **4** and says so rather than guessing.

An HTTP `401` asks you to replace the rejected credential: log in again for a
stored session, or correct or unset `BEA_TOKEN` when it supplies the credential.
An HTTP `403` asks you to check account and credential permissions; it does not
ask you to log in again. A missing or inaccessible ledger reported as `404`
keeps the server's not-found message.

A successful HTTP response that the generated parser cannot read exits **1**
with `Unexpected server response (HTTP 200).` (using the actual status code)
and preserves the request ID when supplied. This is a server-response error;
the CLI does not expose parser exceptions or the raw response body.

### `bea doctor` exit contract

`doctor` delegates to upstream `bean-doctor` but maps its diagnostics onto the
table above instead of forwarding exit **0** regardless. Valid ledgers print
upstream's output unchanged; these are the failure modes:

| Operation | Exits 1 when |
|---|---|
| `parse`, `lex` | The ledger has syntax errors (upstream's trace still prints) |
| `print-options` | The ledger or any file it includes does not parse; no default options are printed |
| `roundtrip` | The ledger or any file it includes does not parse (the trace prints without its congratulations), **or** the comparison reports `Entries differ!` — a valid ledger that does not survive upstream's own print/parse cycle. `roundtrip` exits **4** without running when `<stem>.roundtrip1<suffix>` or `.roundtrip2<suffix>` already exists beside the ledger (beside its target, for a symlinked ledger), since upstream would overwrite and then delete them |
| `linked`, `region` | The link or region matches no entries |
| `missing-open` | Postings reference a closed account (upstream's missing opens still print) |
| `directories` | Upstream reports an `ERROR:` line |

`context`, `display-context`, and `list-options` forward upstream's exit
unchanged. A nonzero upstream status is never rewritten.

## Creating a ledger

```bash
# bea init books prompts for currency, history start date, and opening
# balance when run in a terminal; the unattended form below runs anywhere.
bea --no-input init books --currency EUR --date 2026-08-01 \
  --opening-balance "Assets:Checking 1000" \
  --opening-balance "Liabilities:CreditCard -50"
```

These are alternative ways to create a new ledger. `init` never overwrites an
existing file. Pass a directory (creates `main.bean`) or a `.bean`/`.beancount`
path; the global `--file` can also name the new file, but use either that
argument or `--file`, not both. To backfill before the chosen date, edit the
relevant account opens and ensure the opening balances still describe that
history. New ledger files are
private by default (`0600` on POSIX: readable and writable only by their owner).
For group-readable books, explicitly run `chmod 640 books/main.bean` after
creation. Subsequent add/import/format writes preserve the file's permissions:
its mode, group, ACL entries, extended attributes and user file flags such as
`nodump`. A group the writing user cannot assign refuses the write with exit
**3** instead of silently changing who can read the ledger.
`BEA_FILE` does not redirect
`init`. Without a terminal, `--currency` is required and the date defaults to
today. Interactively, choose the earliest date you intend to record. Use
`--date` when importing older history; opening balances must be as of that date.
An inactive-account error shows the account's opening/closing date and file
location so you can correct the date without creating another open directive.
Invalid answers re-prompt the current question while keeping earlier answers.
Invalid command-line options still fail with exit **2**.
Opening balances and custom `number:`/`amount:` values accept finite decimal
notation with ASCII digits and an optional sign and decimal point. Exponents,
underscores, and non-ASCII digits are refused before anything is written.

The personal template opens checking, savings, cash, credit card, salary,
interest, groceries, dining, rent, transport, utilities, fees, and opening
equity accounts. Opening balances use that currency and balance against
`Equity:OpeningBalances`; credit card debt is negative. Add other accounts with
`bea add open` before posting to them.

Currency symbols follow Beancount syntax, including custom and crypto symbols;
the CLI does not check an ISO currency registry. `init --currency US` is valid
syntax, but emits a typo warning because the symbol is not three uppercase
letters. The warning appears on stderr, or in `data.warnings` in JSON mode.
Lowercase input such as `usd` is normalized to `USD`.

## Checking, formatting, querying

```bash
# Parse, validate and realize the ledger
bea check

# Under --json, check emits bea's envelope and refuses bean-check-only
# flags such as -v / --auto (drop --json to use those native options).

# Format to stdout, or rewrite the files with --in-place / -i
bea format main.bean               # formatted text on stdout; the file is untouched
bea format main.bean -o clean.bean # or to a file of your choosing
bea format -i main.bean            # rewrite it
cat main.bean | bea format         # or read stdin; 'bea format -' says so outright
bea format -i .                    # rewrite every .bean/.beancount file under a directory
bea format . --dry-run             # write nothing; list the files that would change
bea format . --check               # CI/pre-commit gate: alignment, parseable files, complete includes

# Upstream's own diagnostics and generators; a location is [FILE:]LINENO
bea doctor context main.bean main.bean:22   # the entry at that line, as an include spells it
bea doctor context main.bean 22             # a bare line number means the root file
bea example --seed 1 -o example.beancount
bea query "SELECT account, sum(position) GROUP BY account" > balances.txt
bea treeify < balances.txt                  # the account column drawn as a tree

# Run a BQL query and print a table; omit the query for the interactive shell
bea query "SELECT account, sum(position) GROUP BY account"
bea query "PRINT"          # parseable directives, not a table
bea query                  # needs a terminal; exits 2 without one
```

`bea doctor region` and `bea doctor linked` number their balance tree from the
amounts in scope, so a `5.50 USD` region reads `5.50 USD` in a ledger whose other
amounts are whole numbers — upstream formats that tree with the whole ledger's
display context, which rounded it to `6 USD` while the `Net Income` line below
said `-5.50 USD`. The tree and `Net Income` now agree in both directions:
a whole-number scope shows no trailing zeros either.

`bea doctor context`, `linked` and `region` take a location such as
`txns/jan.bean:4` — the spelling the ledger's own `include` uses. Upstream
resolves that filename against the working directory, so `bea` first resolves it
against the root ledger's directory when the working directory has no such file.
A location that already resolves, and an absolute one, are passed through
untouched.

`bea example` exits 2 before generating when its date range is inverted or
shorter than 31 days; a missing `--date-begin` or `--date-end` takes
upstream's default (January 1 two years back, and today) for that check.
`bea treeify` exits 2 when its input has no hierarchical column to render,
naming what it looked for — piping plain text is not a tree. Its `-o`
destination follows [Output destinations](#output-destinations): the ledger
under read is refused, an existing `.bean`/`.beancount` file needs
`--force`, and a destination that is the input file is refused. The
destination is written only after the tree renders, so a failed run leaves it
untouched. `bea ingest`
needs a script that calls `beangulp.Ingest(...)()`; a `CONFIG = [...]`
import module is refused with exit 2 and pointed at `bea import --config`,
which is the command that shape belongs to.

### `bea format` writes to stdout unless you ask for a file

Formatting used to rewrite whatever path it was given. It now prints the
formatted text and leaves the file alone; `--in-place` (`-i`) is what rewrites
it, and `--output FILE` (`-o`) writes somewhere else. `bea format -i .` is the
old `bea format .`.

The engine uses `bean-format`'s alignment for every destination, with two-space
posting indents. Beancount's lexer distinguishes postings from metadata and
multiline strings: metadata indentation and string contents are preserved,
including string lines that look like postings. Stdout, `-o`, and `-i` produce
the same text; `--check` and `--dry-run` compare the exact bytes `-i` would write.
Stdout and `-o` remain text filters that accept syntax errors; the walking modes
check parseability as described below. Run `bea check` to validate the ledger.

Writes match the file they append to: new lines use CRLF in a CRLF ledger and
LF elsewhere, a missing final newline is repaired as part of the append, and
existing bytes are never renormalised as a side effect. `format -i` is the
convergence path instead — it rewrites the file to LF, strips a UTF-8 BOM, and
reports the file as formatted even when alignment alone did not change — so
`--check` fails on a BOM-marked or carriage-return file until `-i` has run.

`-i` is a write like any other here, with the same guarantee: each target ends
up either exactly as it was or completely formatted, never partially written.
The aligned text is produced in memory and staged into a hidden `.bea-*.tmp`
copy beside the file, which then replaces it in one atomic step, so a Ctrl-C
(exit **130**), a crash, or a power loss mid-run cannot empty or truncate a
ledger, and no staging copy is left behind. Each target is also locked for the
whole pass, so `format -i` is serialized against every other `bea` write —
`add`, `add transactions`, `import --apply`, `ask` — and against another
`format -i`: a concurrent append either lands before the formatting reads the
file or waits for it, and can no longer be discarded by it. Two `format -i` runs
on the same ledger both finish, and the second reports nothing to do.
`--check` and `--dry-run` take no lock because they write nothing.

A ledger saved with a UTF-8 BOM loads like any other: the mark is skipped on
read, kept by appends, and removed only by `format -i`. Account names, search
terms, and BQL literals compare NFC-normalized, so NFC and NFD spellings of
one name resolve to one account with one balance; new directives are written
NFC while existing bytes are never renormalised as a side effect. `bea check`
therefore runs a closure that spells an account or tag outside NFC through the
helper, and refuses bean-check options such as `-v` for it (exit **2**): drop
the options, or re-save the file as NFC — `format -i` does not renormalize.
Non-NFC text in comments and strings does not count. A file that
is not UTF-8 at all fails with its path, the offending byte offset, and a hint
to re-save as UTF-8; piped input to `bea format -` fails the same way, naming
`stdin`, before anything is written.

A directory is walked for `.bean` and `.beancount` files, and a walked entry it
cannot read stops the run (exit **2**) naming the path and where it points — a
broken `include` symlink is the shape this usually takes. Silently dropping it
would let `--check` report a tree it never looked at, green while `bea check`
fails on the very include the entry stands for. The dangling `.#name` lock
links Emacs keeps beside files with unsaved edits are not ledger files and are
skipped. A symlink resolving outside the
requested directory is still skipped; one resolving inside is formatted once,
under its real path. `format -i` over a directory with no `.bean` or
`.beancount` files exits 2 — there was nothing to rewrite. Under `--json`
the error carries the zero-file scan result.

With no positional paths, global `--file` selects the input file. Without
either, it is a filter: it formats stdin and writes to stdout, so
`cat main.bean | bea format` and `bea format < main.bean` work in a pipeline
without a temporary file. An explicit `-` asks for the same thing by name, and
cannot be combined with file paths. `BEA_FILE` and cwd ledger discovery do not
select a formatter input.

Automatic alignment chooses account-prefix and number widths from values up
to 200 characters wide. Longer values retain their full text on their own
lines without forcing every other posting to that column. Explicit
`--prefix-width`, `--num-width`, and `--currency-column` values are also capped
at 200; zero keeps automatic sizing. Appended entries use the same automatic
alignment rule.

In `--json` mode the destination has to be explicit, because stdout carries the
envelope and nothing else: pass `-i`, `-o FILE`, `--check` or `--dry-run`.
`-o -` is refused there for the same reason — it names the stream the envelope
already owns — while plain `bea format -o -` remains the text export.

A successful `-o FILE` answers with the envelope, so a script can confirm what
was written without re-reading the directory:

```json
{"scanned": 1, "output": "/home/alice/books/clean.bean"}
```

`scanned` counts the input files, and is `0` when the input was stdin, whose
envelope names `{"stdin": "-"}` as its target.

`bea --json query "SELECT account, sum(position) GROUP BY account" -o result.json`
writes the standard JSON envelope to the file with no duplicate stdout output.
`-o -` keeps stdout; `--numberify` splits inventories into decimal currency columns
in JSON as well as text. One-shot query exports replace the destination only after a successful
query; a failed query or write preserves an existing export. Text, CSV, and JSON
exports preserve an existing file's permissions and follow destination symlinks.
New exports use the caller's umask (for example, `0644` with umask `022`).
Metadata cells (`meta`, `entry.meta`, and the metadata inside a directive) hold
only the keys written in the ledger — never the loader's `filename`, `lineno`
or `__`-prefixed keys — in text, CSV, and JSON alike; a CSV metadata cell is
the text table's cell, and a CSV directive cell is the directive's Beancount
text. Native `--source` queries keep upstream's rendering.

CSV cells hold the ledger's values verbatim, as `bean-query` writes them, so a
payee or narration such as `=HYPERLINK(...)`, `+cmd|...` or `@SUM(...)` —
common in imported bank exports — is evaluated as a formula if the file is
opened in a spreadsheet. Pass `--spreadsheet-safe` with `--format csv` (local
`--file` only) to prefix text cells that start with `=`, `+`, `-`, `@`, a tab
or a carriage return with `'`; numbers and amounts keep their sign. Leave it
off for files a program reads back, since it changes those text values.

An `-o` destination that is the ledger under read is refused with exit 2 before
anything is written, in one-shots and in the interactive shell's `.output`
alike, including a `.output` line in Beanquery's `~/.config/beanquery/init`
file, which is replayed once the ledger is loaded (an explicit `-o` outranks
it) — see [Output destinations](#output-destinations) for the one rule every
command with an output destination follows.

`--format beancount` prints directives, so the query has to return entries:
`bea query PRINT -f beancount` (or `SELECT entry`) preserves negative custom
values as separate values, decimal precision, and complete cost specifications.
Existing multiline text stays intact. These rules also apply to stored queries
and the interactive shell; explicit `--source` uses native Beanquery rendering.
A column result such as `SELECT date, account` is a usage error (exit 2) that
points you at `PRINT` or at `--format text`/`csv`.

Under `--json`, `--format` is refused (exit 2): the envelope already selects
JSON output, so `--json` and `--format` cannot be combined. Drop `--format`
or drop `--json`.

Native forwarding commands include their pinned upstream usage/options in
`--help`, even offline and before optional engine features are enabled. The
native `FILENAME` in check help is supplied by global `bea --file`.

Native short-option tokens are forwarded intact, including glued values such
as `-o/home/alice/export.bean` or `-e/home/alice/main.bean`. Letters inside a
native option's value do not activate bea's own flags. Use a separate `-h` or
`--help` to request bea's help; native options remain subject to the downstream
command's parser and the output-destination checks above.

In the interactive query shell, `.output FILE` redirects results and `.output`
restores the original output stream. A failed redirection reports the path and
reason on stderr, keeps the current output destination, and leaves the shell usable.

One-shot queries carry exactly one statement: an empty or whitespace-only
query, a `.output` with no query, a `.run` naming no stored query, and two
statements joined by `;` are each refused with exit 2 and the supported form.
A trailing `;`, and semicolons inside quotes, are not second statements.
The same one-statement rule covers native `--source` one-shots, the body of a
stored `query` directive replayed by `.run NAME` or `.run *`, and BQL typed at
the interactive prompt, where the refusal is an ordinary error and the shell
stays usable. `.run *` still runs several separate stored queries.
Native `--source` one-shots keep upstream's rendering but not its exit status:
`.run` naming a missing stored query, and BQL that does not parse or compile,
exit 2 with the reason on stderr, and an existing `--output` export is replaced
only after the query succeeds.
With no query argument, `--file` and `--source` alike read BQL from piped
stdin and open the interactive shell only on a terminal where prompting is
allowed; under `--no-input` (or `CI`), or with empty stdin, a missing query is
refused with exit 2 instead of waiting at a prompt. In the shell, `Ctrl-C`
cancels the current line and returns to `beanquery>`, as under `bean-query`;
`.exit` (or `Ctrl-D`) ends the session with exit 0 and saves its history.

Query tables preserve the precision of result values, including calculated
amounts and commodity quantities. Interactive queries and the `ask` BQL tool
use the same precision policy; cents are never discarded because most entries
in the ledger happen to use whole amounts.
`tags` and `links` hold a whole set per entry, so BQL cannot compare them:
`SELECT DISTINCT tags` and `GROUP BY tags` are refused (exit **2**) with the
recipes that work — `SELECT DISTINCT joinstr(tags)` for distinct combinations,
`SELECT joinstr(tags), count(*) GROUP BY joinstr(tags)` for counts, and
`WHERE 'grocery' IN tags` for one tag at a time. `joinstr` returns a string,
which behaves like any other column; the order of the tags inside that string is
not stable, so compare sets by membership rather than by the joined text.

An empty result prints `(no rows)` on stderr. JSON mode keeps the usual
envelope with an empty `rows` array and no human notice.

BQL's `CLOSE ON D` is exclusive, unlike the inclusive `--from-date` /
`--to-date` filters elsewhere in `bea`, so `FROM OPEN ON D CLOSE ON D` asks for
a window of zero days. That is refused (exit **2**) rather than answered with an
empty result that reads like an empty day: the error names the exclusive bound
and points at `CLOSE ON D+1` and at
`bea list transaction --from-date D --to-date D`. A reversed window
(`OPEN ON` after `CLOSE ON`) is refused the same way. Windows that cover at
least one day are untouched.

Reads are lenient in a terminal and strict everywhere else. `query`, `list`,
and `report` print the data with the loader errors as a banner on stderr and
exit 0 when stdout is a terminal; under `--json`, when stdout is piped, when
`CI` is truthy, or with `--strict`, they exit 1 instead unless `--allow-errors`
opts into the partial answer (the errors still print on stderr). If a JSON
command tolerates loader errors and then fails anyway, stderr still holds one
object: the loader lines ride along as `error.ledger_warnings`. `bea check`
always exits 1 on errors — reporting them is its whole job, so it has no
`--allow-errors` flag.
The same validation gate runs before the interactive BQL shell opens, and a
strict session keeps it: after a `.reload` that introduces errors, typed and
stored (`.run`) queries are refused until a clean `.reload`. Missing
format targets are usage errors. `format --dry-run` previews changes without
writing and exits **0** even when formatting is needed. `format --check` leaves
files untouched and exits **1** when formatting is needed, **0** when all
scanned files are formatted.

`format --check` gates on alignment, parseability, and the include graph:
a named file stands for its whole include closure — every file an `include`
reaches, whatever its suffix (`entries.inc` too) — a file the parser rejects
fails instead of reading as "already formatted", and an include that matches
nothing fails naming the directive. `--in-place` formats every reachable file
and skips the unparseable ones, exiting nonzero when anything was skipped.
Semantic validity stays with `bea check`: a failing balance assertion or an
unbalanced transaction does not fail `--check`, so for CI or a pre-commit hook
run `bea check` alongside `bea format --check`. Included files are formatted
independently of their root ledger's account opens and options. In JSON mode, a
failing `--check` returns the scan result in `error.result`: `scanned`, the
`formatted` paths that would change, the `failed` files with their syntax
errors, the `missing` includes, `check`, and `dry_run`.

### GitHub Actions for a ledger repository

Copy the [ledger-check workflow](examples/ledger-check.yml) into your ledger
repository to run both checks on pushes and pull requests. The
[setup and rehearsal notes](examples/ledger-check.md) explain the pinned released
CLI, ledger-path setting, and expected failures. The workflow checks local files
without a Beancount.io login and never formats or commits them automatically.

## Listing directives

`bea list <type>` reads a local `.bean` file. The eleven types are `transaction`, `open`, `close`, `balance`, `pad`, `note`, `event`, `price`, `commodity`, `document`, and `custom`.

| Option | Description |
|---|---|
| `--limit / -l` | Positive maximum results (default 50). The envelope reports `truncated` when more exist. |
| `--sort oldest/newest` | Transaction order, applied before the limit; default `newest`. Specify `oldest` in scripts that depend on ascending order. |
| `--details` | Transactions: render Beancount syntax with every posting, cost/price, metadata, and source location |
| `--flag` | Transactions: select a flag, such as `!` for entries needing review; applied before the limit. |
| `--search TEXT` | Transactions: case-insensitive substring over payee and narration; repeatable (AND — every term must match a row), applied before the limit. |
| `--tag TAG` | Transactions: tag with or without `#`; repeatable. |
| `--link LINK` | Transactions: link with or without `^`; repeatable. |
| `--from-date` | Only directives on or after this date (`YYYY-MM-DD`) |
| `--to-date` | Only directives on or before this date (`YYYY-MM-DD`) |
| `--account / -a` | Case-insensitive substring account filter (`transaction`, `note`, `balance`, `open`, `close`, `document`, `pad`). Matching ignores Unicode normalization, so the NFC and NFD spellings of one account name find each other, and folds Turkish `İ`/`ı` to `i` like `--search` and `bea balance` do. |
| `--currency / -c` | Exact symbol, case-insensitive (`price`, `commodity`); `eur` matches `EUR` |
| `--type / -t` | Exact type, case-insensitive (`event`, `custom`); `Location` matches `location` |
| `--allow-errors` | Return data even though the ledger has loader errors (they still print on stderr) |
| `--on-disk` | Only directives written in a ledger file; hide rows a plugin synthesized |

```bash
bea list transaction
bea list transaction --sort newest --details --limit 10
bea list transaction --account Expenses:Food --from-date 2026-01-01 --to-date 2026-03-31
bea list price --currency BTC
bea list open
bea list transaction --flag '!' --details
bea list transaction --search netflix --tag trip
bea list open --on-disk
```

`bea list open` writes `(any)` in its `CURRENCIES` column for an account whose
`open` names no currencies and therefore accepts any commodity — a fact about
the account, not a cell the renderer failed to fill. JSON keeps the empty
`currencies` list.

An empty or whitespace-only filter value is refused (exit 2) naming the flag,
in human and `--json` mode alike: it is almost always a template hole or an
unset shell variable, and a substring test would silently match every row. Drop
the flag to leave the results unfiltered.

A plugin can add directives the ledger file never declares — `auto_accounts`
opens, `implicit_prices` prices, `currency_accounts` opens, `close_tree`
closes — or copy a written transaction to other dates, like the forecast and
amortize plugins; only the copy dated as its source line declares is on disk.
`list` marks those rows `generated`: a `SOURCE` column in human
tables, a `"generated": true` field in JSON. The field is absent when false,
so a plugin-free answer is unchanged. `--on-disk` drops the synthesized rows,
answering exactly what `grep` would find in the file. `list pad` heads the
funding account `FROM` (JSON `source_account`), so the provenance column is
the only `SOURCE`.

The transaction table shows signed amounts by account and currency, with the
cost basis and price that tell one lot from another — `5 HOOL {50.00 USD,
2024-02-01}`, `1 HOOL @ 60.00 USD` — spelled the way `--details` and the ledger
spell them. Booking normalises a `@@` total into a per-unit `@`, so the table
shows what the ledger holds rather than what was typed. With `--account`, the
amounts column is labeled `MATCHING POSTING AMOUNTS` and shows only those
postings. Under `--json`, `postings` always stays the complete entry
— the counterparty legs are what make a transaction readable — and `--account`
adds a `matching_postings` array holding exactly the postings the filter
selected, in entry order; without `--account` the key is absent. `--details`
labels its output as transactions rendered in Beancount syntax and shows every
posting and its metadata, including inferred amounts. Amounts on opposite sides
are not combined into a zero total.


## Adding directives

`bea add <type>` appends to the resolved entry file only after the complete
candidate ledger passes Beancount parsing, booking, and validation. Relative
includes and document paths keep their original meaning. Unknown or closed
accounts, invalid currencies, unavailable cost lots, and unbalanced transactions
leave the original bytes unchanged. Account typos include suggested matches.
Account syntax follows Beancount: colon-separated segments with an uppercase
root; each subaccount starts with an uppercase letter or digit. Unicode
letters and configured root names are supported. An account name written in a
different Unicode normalization than the ledger uses — NFC where the ledger has
NFD, which is what a name taken from a macOS file path looks like — resolves to
the same account instead of a false unknown-account error, and the new
directive is written NFC. Amount strings use decimal notation
(e.g. `1000`, not `1e3`) in command arguments, bulk JSON, and imports,
including units, costs, and prices; scientific notation is refused on every
path with the same message. Bulk JSON amounts and tagged `number`/`amount`
metadata, like `--posting`, also refuse underscores (`1_000`) and non-ASCII
digits (`٤٥`, `１０`). Bulk JSON amounts must be decimal strings or
integers — a JSON float such as `0.3` is refused naming the field, the row,
and the string form to send, because the double already carries binary
error. Bulk notation errors follow the normal row-validation and
`--partial` rules. JSON output — listings, `add` results (custom values and
balance tolerances included), typed metadata, query JSON and CSV, and balance
and report JSON — spells amounts in fixed-point decimal notation
(`0.00000001`, never `1E-8`) so tiny values can be fed back into input without
losing precision. Native posting
arithmetic such as `84/2 EUR` works. A literal zero divisor (`100/0`) is
refused as a usage error before it reaches the engine, because Beancount
evaluates amount arithmetic while parsing and a zero divisor crashes it.

Every write is staged into a hidden `.bea-*.tmp` copy beside the ledger and
moved into place only once it validates, so an interrupted write never leaves a
half-written ledger. Only the destination and the files that include it,
directly or through other includes, get a staging copy; the rest of the include
graph is read in place, so a read-only shared directory of included files does
not block a write elsewhere. When a directory that needs a staging copy is not
writable, or the filesystem refuses the final replacement, the write exits
**3** naming the directory or file, and nothing is written. If the command is stopped, the staging copy goes with it:
the engine is told to unwind, and a later write in the same directory clears any
copy left by a kill that could not be caught, which is the only case a signal
handler cannot cover. A stop that lands while the ledger is being parsed ends
the engine at once with its staging copies removed, so a stopped write never
commits, with or without `--allow-errors`.

For split ledgers, keep `--file` pointed at the root and choose the included
destination with `--into`. Its path is relative to the root ledger's directory
and must match a literal include or include glob. An absent destination is
created only when a validated write succeeds; its parent directory must already
exist. Previews, rejected writes, and duplicate-only imports leave it absent.
New destinations are private (`0600` on POSIX).

```bash
bea --file main.bean add transaction --into 2026.bean \
  --date 2026-08-02 -p "Expenses:Groceries 30" -p "Assets:Checking"
```

All add commands and `import` support this separation. Validation includes the
entire root ledger; the root and other included files are preserved. Changes
to an included file or to files matched by an include glob abort the write.
Successful additions never modify existing lines. Appended lines are written
where `bea format` would put them given the file's current contents, so a
formatted file stays formatted after an add; when a new amount or account is
wider than any before it, a later `bea format` realigns only the older lines.
Writes respect the destination file's permissions: a read-only file produces
exit **3**, even when its directory permits replacement. This also applies to
import and to `bea format -i`, which replaces the file itself rather than
handing it to upstream's formatter. A read-only root can still validate a
writable `--into` file.

Payees, narrations, string metadata, and the string fields of `note`, `event`,
and `custom` are written on one line: runs of CR/LF line breaks become spaces
in single adds, bulk JSON, and imports, so a pasted multi-line value can never
write a directive that breaks the file. Every other control character —
`ESC`, the rest of the C0 range including tab, `DEL`, and C1 — is replaced by
a visible `\xNN` rather than passed through, so text from an untrusted source
such as an imported bank export cannot drive your terminal. That matters most
in the `import` preview, which is the surface `--apply` is gated on: a
description carrying a cursor-movement sequence could otherwise redraw over the
rows above it and show you something other than what would be written. The
escaped form is what gets stored, so the oddity stays visible on later reads.
Quotes and backslashes retain their contents. Human tables also flatten line
breaks from existing entries without modifying the ledger. Diagnostics get the
same treatment in text mode: loader errors and warnings, error details, format
progress lines, and `list transaction --details` source lines show a document
name or include path's control characters as `\xNN`, while `--json` keeps the
exact value. Native `bea check` output is upstream's own and passes through.

Examples below assume their accounts were opened and their dates, balances,
and document paths are valid for your ledger. Every add command, and `import`,
accepts `--allow-errors` for a semantic error already in the books, such as a
balance assertion that still fails. An error the write itself would introduce —
an unknown account, a currency violation, a new balance failure — is refused
even with the flag; the staged-pad half of the two-step pad flow below is the
one exception. Syntax errors and pad references to unknown or inactive accounts
are always rejected. For an opening adjustment, prefer an explicit atomic pad
and balance:

```bash
bea add balance --date 2026-01-02 --account Assets:Checking \
  --amount "900 USD" --pad-from Equity:OpeningBalances
```

The pad defaults to the preceding day; `--pad-date` can select another date
before the assertion. Both accounts must be open by the pad date. When the
book already holds the asserted amount, `--pad-from` writes the assertion alone
and says so. When an existing pad on the account already fills the assertion
from the same source, it writes the assertion alone with a warning naming that
pad and the amount it inserts; an existing pad from a different source refuses.
A staged pad still waiting for its balance refuses the write, naming it. A pad
fills only the first later assertion in each currency, so an assertion between
`--pad-date` and `--date` is named as the reason the pad went unused. Ordinary
`add balance` remains a strict assertion: review missing transactions before
choosing to create an adjustment. Advanced users can stage `add pad --allow-errors`,
add the later balance, then run `bea check`. The staged pad reports `Unused Pad`
until a matching balance consumes it; complete that pair before other writes.
Balance amounts accept native tolerance syntax, for example
`--amount '1538 ~ 1 EUR'`. The assertion succeeds only within the supplied
nonnegative tolerance. This also works with `--pad-from`.
Concurrent CLI writers use persistent locks under `$XDG_CACHE_HOME/bea/locks`
(default `~/.cache/bea/locks`), keyed by the identity of each file's
directory plus its case-folded name, so every spelling of one path — `Books`
and `books` on a case-insensitive volume, a symlinked directory — takes the
same lock. No lock files are created in ledger directories. Locks remain in
the cache after release so waiting writers always coordinate through the same
file. Stop any older CLI writers before deleting their leftover
`.FILENAME.bea.lock` sidecars. An external edit detected before replacement
produces exit **4** and is preserved. The locks coordinate `bea` writers only:
an editor or script that does not take them is caught by the final
compare-before-replace check in most cases, but can still slip a change in
between that check and the replacement and lose it.

```bash
bea add transaction "Coffee" \
  --date 2026-04-30 \
  --posting "Expenses:Food 12.50 USD" \
  --posting "Assets:Cash -12.50 USD"

# With payee, flag, tags, and links
bea add transaction \
  --date 2026-04-30 \
  --payee "Blue Bottle" \
  --narration "Coffee" \
  --flag "!" \
  --posting "Expenses:Food 12.50 USD" \
  --posting "Assets:Cash -12.50 USD" \
  --tag trip \
  --link "^inv-001"
```

```bash
bea add open --date 2026-01-01 --account Assets:Reserve --currency USD
bea add close --date 2026-12-31 --account Assets:OldAccount
bea add balance --date 2026-04-30 --account Assets:Cash --amount "1000 USD"
# Advanced two-step pad: complete the pair before adding anything else
bea add pad --date 2026-01-01 --account Assets:Savings --source Equity:OpeningBalances --allow-errors
bea add balance --date 2026-01-02 --account Assets:Savings --amount "50 USD"
bea add note --date 2026-04-30 --account Assets:Cash --comment "ATM withdrawal"
bea add event --date 2026-04-30 --type location --description "New York"
bea add price --date 2026-04-30 --currency BTC --amount "62000 USD"
bea add commodity --date 2026-01-01 --currency VFINX --meta 'name:Vanguard 500 Index'
bea add document --date 2026-04-30 --account Assets:Cash --filename "receipts/april.pdf" --tag trip --link "^inv-001"
```

`add transaction` defaults to today's date. One posting may omit its amount;
Beancount infers the balancing amount. When a numbered posting omits its
currency, the CLI uses the account's sole allowed currency, otherwise the
ledger's sole operating currency. Ambiguous currencies require an explicit
symbol. Other directive types keep their explicit dates. Only `add transaction`
defaults the date to today; the other types require it. The transaction flag
defaults to `*`; `!` marks an entry for review.

Tags, links, flags and commodities are written as bare tokens, so each value
must be exactly one. A tag or link takes an optional leading `#` or `^`, then
letters, digits and `- _ / .`; a flag is one of `* ! & # ? %`, a capital
letter, or `txn`; a commodity is Beancount's commodity name, such as `USD`,
`NT.TO` or `/6J`. Repeat the option for several values. A space, a second
sigil (`--tag 'a ^b'`), a comma (`-c EUR,GBP`) or a line break is refused with
exit **2** naming the option, and the file is unchanged; `add transactions`
rejects such a row the same way it rejects any other invalid row. As a last
check, every write reads each rendered directive back and refuses one that
would land as more than one directive.

Narration is optional. Omitting `--narration` records empty text, displayed as
`(no narration)` in the table; `--payee` can still identify the other party.
Supply `--narration "Coffee"` when the purpose would otherwise be unclear.

Currency exchanges need a price annotation, for example
`-p 'Assets:Euro 100 EUR @ 1.08 USD' -p 'Assets:Checking -108 USD'`. Use the
actual rate for that transaction. A multi-currency imbalance includes this
hint; the CLI never inserts a rate to force the postings to balance.

Document paths resolve relative to the file containing the directive. With
`--into years/2026.bean`, `--filename receipt.pdf` means `years/receipt.pdf`
beside that included file. Missing-document errors name this directory.
`add document` takes a relative path that stays inside the root ledger's
directory: an absolute path or one that climbs out with `..` is refused, and
`bea check` reports any document that resolves outside that directory,
quoting the path as written.

Use repeated `--meta` options for native Beancount transaction metadata:

```bash
bea add transaction -p 'Expenses:Groceries 30 USD' -p 'Assets:Checking' \
  --meta 'receipt:R-42' --meta 'reviewed:TRUE' \
  --meta 'rate: 1.125' --meta 'received: 2026-09-01'
```

Each argument contains one `key:value` pair. Bare text such as `note:hello`
or `receipt:IMG_1234.jpg` becomes a string. Valid native numbers, booleans,
dates and amounts retain their types, including when single-add JSON is reused
for bulk entry. Inner quotes force a string, e.g. `--meta 'code:"1234"'`;
`--meta 'note:""'` writes an empty string. Repeat `--meta` for different keys;
keys must be distinct and cannot use the reserved source fields `filename` or
`lineno`. A date-shaped value in any spelling Beancount reads (`2026-02-30`,
`2026/02/30`, `2026-2-30`) that is not a real calendar day is refused rather
than stored as text.

`add commodity` takes the same `--meta`, which is how a symbol becomes more than
a date and a ticker — `--meta 'name:Vanguard 500 Index' --meta
'asset-class:equity'`. The keys are written indented under the directive and come
back in the add envelope in the same tagged form as transaction metadata, so a
response can be sent again unchanged.

`add price` skips an exact date/commodity/amount match anywhere in the root
ledger's includes. It reports the existing location and exits **0** with
`written: 0` and `duplicate: true` in JSON. A different amount for the same
date and commodity is refused naming both values; pass `--force` to record a
corrected quote. Only written price directives count: a price a plugin such as
`implicit_prices` generates is neither a duplicate nor a conflict. `add balance` is idempotent the same way: re-running an
identical assertion reports the existing location and writes nothing, and a
different value for the same date, account, and currency needs `--force`
(ledger validation still applies, so a conflicting value cannot land). Without
an explicit `~` tolerance the number's precision sets the tolerance, so
`10.30 USD` is a different, stricter assertion than `10.3 USD`.
Repeated `--amount` is refused on both commands — a price and an assertion
each hold one amount.

Aliases: `price` and `commodity` accept `--commodity`; `document` accepts
`--path`; `note` accepts `--message`. Existing option names remain supported.

### Custom directives

Values use a `kind:value` prefix. Supported kinds: `text`, `number`, `amount`, `account`, `bool`, `date`.

```bash
bea add custom \
  --date 2026-04-30 \
  --type budget \
  --value "text:travel" \
  --value "number:1000" \
  --value "amount:500 USD" \
  --value "account:Assets:Cash" \
  --value "bool:true" \
  --value "date:2026-04-30"
```

A negative value is written in parentheses (`custom "budget" 5 (-2)`), because
Beancount's grammar reads `5 -2` as one subtracted value. Every `custom` line is
parsed back before it is written and refused if it would reload as different
values, so what `bea list custom` reports is what was asked for.

### Bulk transactions from JSON

```bash
bea add transactions --from transactions.json
bea add transactions --from transactions.json --partial
cat transactions.json | bea add transactions --from -
```

`transactions.json` must be an array of objects matching the `TransactionDirective` schema:

```json
[
  {
    "date": "2026-04-30",
    "flag": "*",
    "narration": "Groceries",
    "postings": [
      {"account": "Expenses:Food", "units": {"number": "45.00", "currency": "USD"}},
      {"account": "Assets:Cash", "units": {"number": "-45.00", "currency": "USD"}}
    ],
    "tags": [],
    "links": []
  }
]
```

The file or stdin must be UTF-8 JSON (a BOM is fine). Undecodable or UTF-16
input, a key repeated within one object, absurdly deep nesting, or an integer
too long to convert is a usage error (exit **2**) naming the problem.

Every row is validated before anything is written. If any row is invalid the ledger is left byte-identical and the command exits **1**, listing the rejected rows. `--partial` appends the valid rows instead — and still exits **1**, so a partial write can never look like a clean one.

A posting can also use `{"account":"Assets:Cash","amount":"-45 USD"}`.
Omit `units`/`amount` for a balancing posting. Supplying both forms or unknown
fields — at the transaction or posting level, or inside `units`, `cost`,
`price` and `price_total` — is rejected. Schema errors show a human row number, field path,
and example; `bea add transactions --help` contains a complete minimal batch.

Validation includes accounting errors, not just JSON shape. The whole batch is
tried first so a sale can use a purchase appearing later in the input. Partial
recovery tries rows in input order and validates each accepted subset. When
some rows are written, the JSON error includes `result.written`, `written_rows`,
and `rejected_rows` (zero-based indexes); a failed atomic batch reports zero
written and `unwritten_rows` when the failure concerns the combined ledger.
This command appends supplied transactions and does not deduplicate them. Use
[`bea import`](IMPORTING.md) for extraction, preview, and duplicate review.

### Investment postings and metadata

Single `--posting` arguments accept native Beancount cost and price syntax:

```bash
bea add transaction "Buy AAPL" --date 2026-08-02 \
  -p "Assets:Brokerage 10 AAPL {100 USD}" -p "Assets:Cash -1000 USD"
```

Per-unit and total prices (`@`, `@@`) and total costs (`{{...}}`) are supported.
A `@@` total is written back with `@@` and its exact total, never divided
into a repeating unit price. A cost is written whole: a total cost keeps its
total (`{0 # 250.00 USD}`, the same lot as `{{250.00 USD}}`), a currency-only
or date-only lot selector keeps its constraint (`{EUR}`, `{2026-03-01}`)
instead of relaxing to `{}`, and the JSON answer reports the same constraint —
`number`, `number_total`, `currency`, `date` and `label`, with `null` for the
parts you left open — so it can be fed straight back to
`bea add transactions`. In bulk input a `cost` with a `number_total` and a `null`
`number` is that total cost. JSON remains useful for batches and metadata.
Open `Assets:Brokerage` in AAPL and `Assets:Cash` in USD before applying this purchase:

```json
[
  {
    "date": "2026-08-02",
    "narration": "Buy AAPL",
    "meta": {"bank_id": "trade-001", "cleared": true},
    "postings": [
      {
        "account": "Assets:Brokerage",
        "units": {"number": "10", "currency": "AAPL"},
        "cost": {"number": "100", "currency": "USD", "date": "2026-08-02"}
      },
      {"account": "Assets:Cash", "units": {"number": "-1000", "currency": "USD"}}
    ]
  }
]
```

For a sale, use negative units with the existing cost and optionally
`"price": {"number": "120", "currency": "USD"}` on that posting, plus the cash
proceeds and realized gain postings. Use `"price_total"` instead of `"price"`
for a total price; the two are mutually exclusive. Booking validates that the lot exists.
Cost dates are optional; specify one to select a particular acquisition lot.
Bulk `amount` shorthand accepts the same lot spelling: `"amount": "5 HOOL
{10 USD}"`, with optional date, label, and `@`/`@@` price. The shorthand
cannot spell a total cost (`{{...}}`); use `units` with a structured `cost`
carrying `number_total` instead.

Round-trip guarantee: the `units`, `cost`, `price`, and `price_total` shapes
in `add transaction --json` output are valid `add transactions` input, so a
returned posting pipes back into `--from -` unedited. A `@@` total is
answered as `price_total` with `price` null, never as its divided unit price.
Transaction and posting `meta` preserve text and booleans; numeric, date and
amount metadata use tagged objects: `{"kind":"number","value":"1.125"}`,
`{"kind":"date","value":"2026-08-03"}`, or
`{"kind":"amount","number":"5.25","currency":"USD"}`. A JSON float in a
tagged `value` or `number` rejects the row, because the float cannot hold the
decimal exactly; send a decimal string. An array, an untagged object, a tagged
object with other keys, or the reserved keys `filename`/`lineno` likewise
reject their row, reported as `Row N, meta.<key>` (or
`postings.<i>.meta.<key>`), so `--partial` still writes the others. A row
`date`, a cost `date` and a tagged date `value` must be `YYYY-MM-DD` strings,
like every `--date` flag; Unix timestamps, `20260201`, week dates
(`2026-W05-7`) and times are refused. JSON listing includes
`source.filename`/`source.lineno` separately; those locations are never written
back as transaction metadata.

## Reports

Human tables round each currency to the finest precision the ledger itself
uses for it, so a whole-dollar ledger prints `10 USD` rather than `10.00`.
That precision comes from posting amounts and balance assertions (or
`option "display_precision"`), not from price quotes or cost numbers, so a
`price AAPL 191.559998 USD` does not make a cents ledger print six decimals.
A currency no posting names — usually a `--conversion` target — has no
precision to infer and renders with two decimals; `--json` keeps the exact
value either way.

Report interval breakdowns cover the complete requested period, including more
than 100 daily or monthly intervals. The interval selects the aggregation
grain, not a limit on the returned history.

When `--time` ends partway through an interval, the last bucket is a fragment
of it — `-t 2020-03 -i weekly` ends on the Monday–Tuesday tail of an ISO week
that runs into April. Flow series (income statement periods, the overview's
income and expense series) drop that fragment when no entries fall in it, so a
clipped boundary does not read as one more quiet week; a fragment holding
entries — a transaction on `2020-12-31` — stays, and so does the only bucket of
a short filter. Balance series (net worth, assets, liabilities, equity) keep
every bucket, because their value is real whether or not the fragment saw
activity and the series must still reach the as-of date.

```bash
bea report overview
bea report income-statement
bea report balance-sheet
bea report trial-balance
bea balance Checking
```

`bea balance [ACCOUNT…]` prunes the trial balance to the subtrees whose
account names contain any argument (case-insensitive, and insensitive to
Unicode normalization), keeping ancestors for structure. Accounts closed by the `--time` end date that
hold no balance are excluded from filtered views; a closed account still holding
money stays, so totals agree with the trial balance. With no argument it prints the trial balance; `--conversion`, `--time`, and `--allow-errors`
work as in reports.

All four accept `--conversion / -x`, `--time / -t`, `--account / -a`, and
`--allow-errors`. Conversion defaults to the ledger's single operating
currency. With zero or multiple operating currencies, it defaults to `units`
and keeps currencies separate. All but `trial-balance` accept `--interval / -i`
(`monthly`, `quarterly`, `yearly`, `weekly`, `daily`; default `monthly`).

```bash
bea report income-statement --time 2026 --interval quarterly
bea report balance-sheet --conversion EUR
```

Each report states its period, as-of date, account filter, and valuation.
Invalid intervals, dates, reversed ranges, and malformed account filters exit
**2**. `--account` takes a parent account (`Expenses:Food`) or a regular
expression (`'Expenses:(Food|Rent)'`); it selects transactions involving
matching accounts, then reports only the postings to those accounts — totals,
trees, and the interval breakdown all describe the accounts you asked for, not
the counterparties they happened to face. As in `list`, an empty or
whitespace-only `--account`, `--time`, or `--conversion` — or a blank `bea
balance` argument — is refused (exit 2) naming the flag rather than silently
falling back to the unfiltered default.

A parent whose children cancel under the conversion — a long and a short lot at
the same cost, two funds whose cost bases offset, or a 10.00 USD expense and its
-10.00 USD refund — reports an explicit zero, in filtered views too,
(`0.00 USD` / `{"USD": "0"}`) rather than the `—` / `{}` of an account with no
balance. An inventory drops a position the moment it nets to zero, which would
otherwise render a real cancelling rollup as missing data beside the children
that produced it.

Account trees retain Beancount signs: income, liabilities, and equity are
normally negative. `net_profit` is `-(income + expenses)`, so a gain is positive
and a loss negative. The income statement includes actual period rows with
the same signed income and expenses as the account trees. Net profit remains
positive for a gain; JSON labels this with `net_profit_signs: "positive_for_gain"`.
Older versions returned positive revenue in the period rows; consumers should
now use `-(income + expenses)` consistently. Overview JSON income/expense series
are interval flows; asset/liability series are balances as of each date.

Balance sheets include signed `current_earnings`, a derived
`valuation_adjustment`, and `equity_total` so converted assets, liabilities,
and total equity reconcile. A balance sheet's `net_profit` (and
`current_earnings`, its credit-signed twin) follows the income statement's
rule, so the two reports always give the same `net_profit`: under a currency
conversion it names that currency, `null` when part of it could not be valued
and `"0"` when there is no income or expense. These are report values and do not create ledger
directives. Prices after the report date do not affect its valuation.
Unconverted `units` reports do not claim an equity reconciliation or invent a
valuation adjustment across unlike commodities. `equity_reconciled` states
whether the derived reconciliation is available. Reports run with loader
errors also carry `ledger_valid: false` and `ledger_errors` in JSON.

Reports convert what has a price and keep the rest in units. Each interval
row is valued at its own date, so a later quote cannot value an earlier
interval: earlier rows stay in the source commodity while later rows convert.
A missing price never fails a terminal report — stderr carries one summary
line per commodity, for example `VACHR has no USD price at any date; shown in
units` or `EUR → USD has no price before 2026-08-31; earlier rows shown in
EUR`. Under `--json`, with piped stdout, under `CI`, or with `--strict`, a
missing price exits **1** unless `--allow-errors` is passed; the error's
`details` carry the same per-commodity summary, and `error.result` keeps the
dated triples in `missing_price_dates` (`from`, `to`, `date`) alongside
`missing_prices` for automation (a null date means no quote at any date).
Partial JSON marks `valuation: "partial"`, lists `missing_prices`, retains
amounts in their source currencies, and sets combined net profit/net worth to
`null` in the requested currency when that total itself, at the report's
as-of date, still holds a commodity it could not value. A gap only in an
earlier row (a holding bought before its first quote) leaves the headline
valued; `valuation: "partial"` and `missing_price_dates` still describe the
rows. The same rule applies row by row: an income
statement period and a net-worth series point whose balance still holds a
commodity the report could not value read `null` too, so no interval series
contradicts the headline above it with per-unit amounts. Rows that did convert
keep their number. It also withholds the derived equity adjustment and equity
total. Text shows the source amounts and says the total is unavailable.
`--conversion units` shows quantities; `at_cost` shows acquisition costs and
`at_value` uses market values with Fava's cost fallback when no price exists.
Holdings without a cost basis (cash, `@`-priced lots) keep amounts already in
an operating currency, are valued into the first operating currency that has a
price, and otherwise stay in their units. Other values must be valid uppercase Beancount currency symbols. Misspellings
such as `at-cost`, `usd`, and `US D` exit **2** before loading the ledger, in
terminals and automation alike. Valid symbols need not already appear in the
ledger: an unpriced target such as `GBP` follows the partial-valuation policy
above.

The conversion decides how an interval row spells itself, and a quiet row keeps
its place in the series either way. A currency conversion names that currency in
every row, so a month with no activity reads `0.00 USD` / `{"USD": "0"}` and a
month that could not be valued reads `Unavailable USD` / `{"USD": null}`. A
per-unit conversion (`units`, `at_cost`, `at_value`) names only the commodities
a row actually holds, so the same quiet month reads `—` / `{}` — absent amounts,
not an absent period. Compare rows by date, not by the presence of a currency
key.

Text amounts are rounded to the display precision the ledger uses for each
currency (half up, so `4.9050 USD` of converted dining reads `4.91 USD`);
JSON keeps the full-precision decimal string (`"4.9050"`).

## Managed price includes

One line values a holding at market in every command — no quote provider to
configure and no recurring download chore:

```beancount
include "https://beancount.io/prices/BTC-USD"
```

`check`, `list`, `query`, `report`, `import`, and write validation all see
the same resolved prices. The URL is a registered price request, not a
general remote include: only allowlisted origins and exact
`/prices/<ALIAS>` paths resolve, redirects are refused, and the request
carries no ledger name or ledger content. Sign in with `bea cloud login` or
set `BEA_TOKEN` before fetching Beancount.io prices. The frontend relays the
credential to the helper in its environment; only the exact HTTPS
`beancount.io/prices/<ALIAS>` endpoint receives a bearer header. Additional
allowlisted origins and redirects never receive it. Offline reads and ordinary
ledgers do not require login. Select supported pairs at
[Live Prices](https://beancount.io/live-prices).

A price you declare yourself wins: a ledger-authored price for the same date
and pair shadows the managed point, and the shadowed count is reported. Feed
entries are read-only — a write targeting one fails naming the managed
source — and your files are never rewritten to accommodate a feed.
`bea add price` writes your supplied quote even when it matches a managed
point, pinning that price in your ledger. A different supplied quote also
shadows the managed point without `--force`; the result names the managed
source. Duplicate detection and the `--force` conflict rule apply to prices
already authored in the ledger, including its local included files.

```bash
bea price status            # freshness, revision, observed-at, errors per source
bea price refresh           # re-resolve now; reports which sources changed
bea --offline balance       # resolve from the cache only; never fetch
bea --strict-prices check   # fail when a source is stale or unavailable
```

Freshness is computed at read time from the latest observation: `recent`
within ten minutes, `stale` beyond it, `unavailable` when no revision ever
validated. This measures observation age, not exchange trading hours.
`observed-at` stamps compare as instants; a stamp without an offset (or a bare
date) reads as UTC, and one more than five minutes ahead of the clock reads
`stale`.
A failed refresh never replaces the last good revision. `--offline` never writes
the price cache. A cache that cannot be written still loads its prices, with a
`price cache not writable` warning and source error. Explicit `price refresh`
exits 1 if any source fails (including when a cached revision can still serve).
Text errors describe every source; JSON errors carry all `sources` and `changed`
records under `error.result`. `--strict-prices` also rejects stale refresh results.
`--offline price refresh` exits 2 without fetching or changing refresh windows.
Ordinary `balance` and `report` text warns about stale or unavailable sources
and failed refreshes. JSON includes `price_sources` with the revision,
observation timestamp, freshness and error from the same load that calculated
the report. Freshness does not change the separate missing-price valuation
rules; use `--strict-prices` to reject stale sources.
Missing/rejected login points to `bea cloud login` or `BEA_TOKEN`; 403 means
account access is denied, 404 means an unknown source, and 5xx means the service
is unavailable. `status`
and `refresh` take no arguments; anything else after `bea price` still
forwards to `bean-price`, so name a quotes job file `status` by path
(`./status`) if you ever have one.

`price export` snapshots a self-contained copy for stock tools: each feed
lands at `prices/<ALIAS>.beancount` as a `custom "bea-managed-source"`
marker directive plus the exact effective text the load parsed, and every
include is rewritten relative. `document` attachments under the root's
directory are copied to the same relative place, under the name the
directive uses — a path through a symlinked file or folder becomes a plain
copy at that path; one outside that tree (including a symlink pointing out of
it), or named by an absolute path, refuses the export before anything is written. An
unavailable source refuses the export unless `--allow-errors` carries its
marker alone. The destination follows
[Output destinations](#output-destinations): a file already at any path the
export would write refuses it with exit 2, naming the collision and writing
nothing, and `--force` is the opt-in that overwrites — which is what
re-exporting into a previous snapshot needs. Under `--json` the answer's
`overwritten` list names every path `--force` replaced.

```bash
bea price export                    # <ledger>-export/ beside the ledger
bea price export --output audit     # a chosen directory instead
bea price export --force            # refresh a snapshot this ledger already exported
```

A managed URL include resolves only in `bea` (and Beancount.io hosted
tools). Upstream Beancount, Fava, and `bean-query` read plain file includes,
so give them the exported local line instead:

```beancount
include "https://beancount.io/prices/BTC-USD"   # bea: fetched, cached, refreshed
include "prices/BTC-USD.beancount"              # stock tools: the exported snapshot
```

## Ask (optional extra)

`bea ask` needs the AI dependencies, which the default install does not carry:

```bash norun
# Installs software; needs uv plus network.
uv tool install 'beancount-io[ask]'

# or, from a local clone of this repo
uv tool install './cli[ask]'
```

With Homebrew, keep the managed base CLI and run the optional AI environment
with `uvx --from 'beancount-io[ask]' bea ask "QUESTION" --print`. Both installations
use the same `bea cloud login` credentials. Model calls use the hosted
Beancount.io AI service even though the ledger is local.

```bash norun
# Needs the ask extra plus hosted credentials and a real ledger.
# Interactive session over your ledger
bea ask

# One question, one answer, no REPL
bea ask "what did I spend on groceries last month?" --print
```

Without the extra the command exits **2** with the install command. It also needs hosted credentials: the model runs through the Beancount.io AI proxy, so a local ledger still requires `bea cloud login`. `bea ask` has no `--json` mode; use `bea query` for machine-readable results. Ledger queries and validation run locally, while questions, supplied skill context, and tool results are sent to the hosted service. The current command uses `gpt-4o` and has no model-selection flag.

Print mode and noninteractive use require a nonblank question: empty or
whitespace-only input exits **2** before constructing the agent or making a
request. A blank starting question in an interactive session leaves the prompt
empty.

Interactive write requests are validated before confirmation, then appended
atomically only if the root ledger and included files still match the preview.
The confirmation names the file the write will actually change — with
`--into FILE` that is the included destination, not the root ledger — and shows
the directive with any control character escaped to a visible `\xNN`, so what is
on screen is what will be written. Raw directive text carrying a control
character is refused rather than rewritten, so no AI-proposed write can leave one
in a ledger file. Use `ask --into FILE` for an included destination. The write
tool accepts dated directives; configure plugins, options and includes
separately. Noninteractive
sessions do not write ledger entries. AI write permission is separate from
global `--yes`: one-answer and non-interactive mode cannot obtain it and never
apply AI-proposed writes.

In a session, one turn is one unit of failure. Ctrl-C clears the line you are
typing, or abandons the turn in flight, and returns to the prompt with the
conversation intact; Ctrl-D (or `/exit`) ends the session. A failed turn — a
server error, a question the assistant cannot complete — prints the failure and
returns to the prompt with the earlier history still loaded. A turn that fails
or is cancelled after an approved write names the directives it already wrote
and the file they went to — they stay in the ledger — and the conversation keeps
that turn, so the assistant knows the entry exists. A rejected
credential is the one exception: it ends the session with exit **3**, because
every later turn would fail the same way. Each question also has a fixed budget
of hosted requests and ledger queries; a model that keeps querying without
answering stops there, reports what was written (nothing, unless you approved a
write), and costs no more.
Each answer also carries an explicit output cap rather than reserving the
model's default allowance.

A query's result reaches the assistant as rows with a row count, the relation
they came from, and a zero written as `0` — a total that nets to zero is a zero,
not missing data. Results are bounded: past a few hundred rows, or roughly
12,000 characters, the result is truncated and the answer says so; a single row
longer than that is cut short with a marked cut. Enumerating a
large ledger therefore returns a truncated list instead of failing; ask for a
total, a `GROUP BY` or a date range to see everything that matters. The BQL tool
runs `SELECT` (and `BALANCES` / `JOURNAL`); `PRINT` and dot commands remain
available in `bea query`. A proxy that cannot be reached reads the same in `ask`
as anywhere else — `Could not reach the server (…)`.

Ask discovers project skills as `NAME/SKILL.md` files in `.agents/skills/`
under the working directory (regardless of `--file`) and user skills in
`skills/` under the configuration directory. Project skills override user
skills with the same name. Each file needs YAML frontmatter with a nonempty
`name` and `description`, followed by Markdown instructions; invalid files are
skipped. Names and descriptions are supplied up front and full instructions
load on demand. Interactive prompt history is saved in `ask_history` in the
configuration directory.

## Cloud: authentication

Hosted commands need a session. `bea cloud login` prints a one-time code and opens the dashboard's device page; enter the code there, check that the device shown is this machine, and approve. The link itself carries no secret, so a device page opened from anywhere else cannot authorize this CLI. The credential is stored as `credentials.json` in the configuration directory — `$BEA_CONFIG_DIR` when set, else `~/.config/bea` (mode 0600, in a 0700 directory).

```bash norun
# Needs a browser and hosted credentials.
bea cloud login
bea cloud status
bea cloud logout
```

`bea cloud status` reports the credential source (`file` or `environment`), its expiry, and the account it belongs to. For CI, set `BEA_TOKEN` instead of logging in — it is never written to disk, and `cloud status` reports `source: environment`. `cloud logout` revokes the stored session and deletes the credential file. The file is deleted even when revocation fails, but then the command exits nonzero and says the session may still be valid (revoke it from the dashboard): exit 1 when the server is unreachable or answers with an error, exit 4 when the request timed out and the outcome is unknown. A 401 answer means the session was already revoked, so it exits 0. When `BEA_TOKEN` is set, `cloud logout` changes nothing: it neither revokes the token (another job may share it) nor unsets it in the shell — unset the variable yourself, or revoke the token from the dashboard. A credential the server rejects is reported against the source actually in use: `BEA_TOKEN` takes precedence over the stored file unconditionally, so that failure tells you to correct or unset the variable rather than to log in, which would not change which credential is sent.

## Cloud: hosted ledgers

```bash norun
# Needs hosted credentials; delete also shows global-before-command order.
# Create a hosted ledger — private unless --public is passed
bea cloud ledger create my-books
bea cloud ledger create my-books --public --description "Shared books"

# Create and clone in one step
bea cloud ledger create my-books --clone
bea cloud ledger create my-books --clone --dir ./accounting/my-books

# List, inspect, clone, delete
bea cloud ledger list                         # --page 1, --limit 50 (API maximum 100)
bea cloud ledger show alice/my-books
bea cloud ledger clone alice/my-books
bea cloud ledger delete alice/my-books          # asks for confirmation
bea --yes cloud ledger delete alice/old-books   # global switches precede the command
```

`clone` and `create --clone` pass git only an `ssh://`, `https://` or
`user@host:path` remote, and clone into `./<name>` only when the server's
ledger name is a valid ledger name. Any other clone URL or name is an
unexpected server response (exit 1) and git is not run; pass `--dir` to choose
the directory yourself.

`bea cloud ledger show` renders booleans as `yes`/`no` and indents nested
permissions beneath their field name. Use `--json` for the complete structured
result with native booleans and objects.

For `bea --json cloud ledger list`, `truncated` means another row was found after
the returned page. A full page triggers one additional request for that next
row; a short or empty page needs no extra request. The envelope keeps the
requested `page` and `limit`, and a full final page reports `truncated: false`.
If the additional read fails, the command reports the error instead of guessing
whether more rows exist. Human table output uses only the requested page.

A ledger name uses lowercase letters, digits, hyphens and underscores, at most
100 characters — the service's own rule. `create` checks it before touching
credentials, so a malformed name exits **2** naming the rule and a slugified
suggestion rather than exiting **3** with "Not logged in", which would say
nothing about the name.

Cloning uses `git clone` over SSH, so it needs Git and working SSH access. If a clone fails after the ledger was created, the command exits nonzero and prints the manual `git clone` command — the ledger exists either way.

## Updating

`bea upgrade` hands the update to whichever package manager installed this copy
— Homebrew, uv, or pipx — and never rewrites its own installed files. After the
manager finishes on a uv or pipx install that changed version, it also
provisions the new version's managed Beancount engine so frontend and engine
stay paired; Homebrew builds the keg's engine itself, and a no-op upgrade
leaves the engine alone. A failed engine provision exits **1** after the
upgrade and keeps the current engine; a later local command retries it.

```bash norun
# Needs network for the latest-version check; versions vary by machine.
# Report the installed and latest versions and the command that would run
$ bea upgrade --check
bea 1.2.3 (installed by: homebrew)
Latest release: 1.3.0
Would run: brew upgrade bea

# Run it
$ bea upgrade
```

| Install channel | What `bea upgrade` runs | Uninstall |
|---|---|---|
| Homebrew (`brew install bex-co/tap/bea`) | `brew upgrade bea` | `brew uninstall bea` |
| uv tool (`uv tool install beancount-io`) | `uv tool upgrade beancount-io` | `uv tool uninstall beancount-io` |
| pipx | `pipx upgrade beancount-io` | `pipx uninstall beancount-io` |
| A checkout (editable install) | Nothing; prints `git pull` and `uv sync --all-groups`, exits 0 | — |
| Anything else | Nothing; exits **2** naming both install channels | — |

Uninstalling the executable leaves ledgers and user state in place.

If the manager itself fails, the command exits **1** and says so; nothing about
the installation is changed. `--check` reports and runs nothing.

### The update notice

In a terminal, `bea` asks its installation channel at most once a day whether a newer release
exists, and prints one line on stderr after the command's own output:

```
bea 1.3.0 is available (you have 1.2.3) — run 'bea upgrade' to update.
```

It never runs at all under `--json`, `--no-input`, `CI`, or
`BEA_NO_UPDATE_NOTIFIER=1`, without a terminal on stderr, or from a checkout or
unrecognized install — those are the installs whose `bea upgrade` runs nothing,
so they stay silent in `--version` too. `bea upgrade --check` still asks, since
that check is the explicit request. Every outcome — including a failure — is
cached for 24 hours in `~/.config/bea/update-check.json` (or
`update-check-homebrew.json` for Homebrew), so an offline machine waits at most
once a day and prints nothing. `bea --version` adds the same line from that
cache only, and makes no network call.
Homebrew checks the published tap formula; PyPI-only releases are never
advertised to a Homebrew installation before the tap can install them.

## JSON output

Global `--json` provides structured results for `check`, local-file `query`, `list <type>`, `balance`, `report`, `engine status`, and hosted reads such as `cloud status`, `cloud ledger list`, and `cloud ledger show`. `init`, `import`, `format`, `add`, `engine enable`, `cloud ledger create`, and `cloud ledger delete` also emit an envelope so a script can confirm what was written (create returns the new ledger's metadata with the same fields as `cloud ledger show`, delete the deleted ledger's id). Usage failures, including unknown commands and missing global option values, follow the same JSON error contract.

The envelope is always:

```json
{
  "bea": "0.1.0",
  "target": {"file": "/home/alice/books/main.bean"},
  "data": "…",
  "truncated": false
}
```

`target` identifies the operation's scope:

| Shape | Scope |
|---|---|
| `{"file": "<absolute path>"}` | A resolved ledger, including formatting one file |
| `{"files": ["<absolute path>", "…"]}` | Formatting multiple named files or a root's include closure; paths are sorted and deduplicated |
| `{"directory": "<absolute path>"}` | Formatting a directory |
| `{"stdin": "-"}` | Formatting stdin to an explicit output file |
| `{"server": "<api url>"}` | Hosted commands |
| `null` | `bea --json --version`, which reads no ledger and calls no server |

Bounded lists also carry `limit`, and paged hosted lists (`cloud ledger list`) also carry the `page` that was served. Amounts use decimal **strings** — never floats — and dates are ISO `YYYY-MM-DD`.

These run against a ledger with a 1000 USD opening balance in
`Assets:Checking` and one 12.50 USD expense recorded first. Listings are newest
first, and `net_profit` is positive for a gain (`data.net_profit_signs` says
`positive_for_gain`), so a period of spending only is negative:

```bash
$ bea add transaction Coffee --date 2026-08-02 --posting "Expenses:Food 12.50" --posting Assets:Checking
Added 1 transaction to /tmp/books/main.bean.

$ bea --json check
{"bea": "0.1.0", "target": {"file": "/tmp/books/main.bean"}, "data": {"valid": true, "errors": []}, "truncated": false}

$ bea --json list transaction --limit 2 | jq '.data[0].postings[0].units'
{
  "number": "12.50",
  "currency": "USD"
}

$ bea --json query "SELECT account, sum(position) AS total GROUP BY account" | jq -c '.data.columns'
[{"name":"account","type":"str"},{"name":"total","type":"Inventory"}]

$ bea --json report income-statement | jq -c '.data.net_profit'
{"USD":"-12.50"}
```

```bash norun
# Needs hosted credentials.
$ bea --json cloud ledger list --limit 10 | jq '.data[0].full_name'
"alice/my-books"

$ bea --json cloud status | jq '{source: .data.source, tier: .data.tier}'
{"source": "file", "tier": "free"}
```

Report JSON carries the same tree the text renderer walks — `account`, `balance`, `balance_children`, `has_txns`, `children` — not a rendering of it.

Commands that cannot produce JSON keep their own shapes: `ask`, `doctor`,
`example`, `treeify`, `price`, `ingest`, and `query --source` reject JSON mode, `cloud login` requires interaction,
successful `cloud logout` and `cloud ledger clone` emit no JSON success object
(use their exit status), and help and completion output stay textual.
`upgrade` can stream package-manager output to stderr even in JSON mode. The
[directive models](https://github.com/bex-co/beancount-io/blob/main/cli/src/bea_engine/ledger/models.py)
define the exact object fields for directive listings and bulk input.

## Environment variables

There is no general-purpose CLI configuration file. Environment variables
select targets, endpoints, and state directories:

| Variable | Default | Description |
|---|---|---|
| `BEA_FILE` | — | Ledger entry file, when `--file` is not passed |
| `BEA_TOKEN` | — | Hosted credential for unattended jobs; never written to disk |
| `BEA_CONFIG_DIR` | `$XDG_CONFIG_HOME/bea`, else `~/.config/bea` | Per-user state: credentials, `ask` history, user skills |
| `XDG_DATA_HOME` | `~/.local/share` | Root for the managed PyPI engine under `…/bea/engine/<version>` |
| `XDG_CACHE_HOME` | `~/.cache` | Root for ledger write locks under `…/bea/locks` and managed price feeds under `…/bea/managed-prices` |
| `BEA_API_URL` | `https://api.v3.beancount.io` | API base URL; empty means the default, and a value that is not an `http(s)://` URL with a host is a usage error (exit 2) |
| `BEA_DASHBOARD_URL` | `https://beancount.io` | Dashboard URL, used by the device login flow; validated like `BEA_API_URL` |
| `BEA_NO_UPDATE_NOTIFIER` | — | Truthy disables the update notice entirely |
| `CI` | — | Truthy implies `--no-input`, and disables the update notice |
| `MANAGED_PRICE_ORIGINS` | `https://beancount.io` | Comma-separated origin allowlist for managed price includes; empty disables them |
| `MANAGED_PRICE_OFFLINE` | — | Truthy resolves managed includes from the cache only, like `--offline` |
| `MANAGED_PRICE_STRICT` | — | Truthy fails loads on stale or unavailable sources, like `--strict-prices` |

A relative `XDG_CONFIG_HOME`, `XDG_DATA_HOME`, or `XDG_CACHE_HOME` is ignored,
as the XDG Base Directory spec requires, and the default applies.

Homebrew sets `BEA_ENGINE_DIR` to the keg-local engine so installs never look
for a separately provisioned copy. Advanced overrides (`BEA_ENGINE_PYTHON`,
`BEA_UV`) exist for tests and recovery tooling; ordinary installs do not need
them. Both are checked before use: one that names a path which does not exist,
or an environment missing the tool being run, fails with a message naming the
variable and telling you to correct or unset it. `bea engine status` reports
which engine would serve.

Truthy values are `1`, `true`, `yes`, and `on`, ignoring case and surrounding
whitespace. The configuration directory holds `credentials.json` (mode 0600 on
POSIX), `ask_history`, user `skills/`, remembered importer paths and column
mappings under `importers/`, and channel-specific update-check caches.
Ledger plugins and importer configurations run their own Python code and
control any I/O they perform. What they print — including from a child process
or a raw write to descriptor 1 — never reaches bea's machine output: plugin
output goes to stderr and importer output to `importer_output`.
