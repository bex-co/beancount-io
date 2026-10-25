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
bea report balance-sheet | income-statement | trial-balance | overview | holdings | register ACCOUNT | capital-gains
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
| PyPI (`uv tool install beancount-io` or pipx) | First local command that needs the engine downloads the hash-pinned combination (needs network and `uv` on `PATH`) | Later commands reuse `$XDG_DATA_HOME/bea/engine/<version>` (default `~/.local/share/bea/engine/…`) | `bea upgrade` upgrades the frontend and, when the version changed, provisions the matching engine and prunes superseded engine versions |

If first-use or upgrade provisioning fails, fix network/`uv` availability and
retry a local command such as `bea check` — do not `pip install beancount`.
A broken managed environment is discarded and rebuilt on the next successful
provision; global `bean-check` decoys on `PATH` are ignored. Commands started
together on a fresh install share one provision: the first builds the engine
under a lock file beside it (`<version>.lock`) and the rest wait and reuse it.
A build killed mid-install (closed terminal, `SIGTERM`) leaves a
`<version>.partial.<pid>` directory that the next provision removes. An engine
whose packages are present but damaged (a quarantined compiled extension, a
half-deleted package) cannot be repaired in place: `bea engine status` reports
it as damaged, and every local command exits 1 naming the engine directory —
remove it and rerun, and a fresh engine is provisioned.

`bea engine status` names the engine that local commands would actually use:
a `BEA_ENGINE_PYTHON` override, the provisioned managed engine, or a source
checkout's `cli/src` (development only). When none of those exists it reports
`not provisioned; provisions on first use`. `--json` carries the same answer as
`serving.tier` (`override`, `managed`, `checkout`, or `first-use`) and
`serving.location`. A managed or override interpreter is probed, with the result
in `usable`. An override is usable only when `bean-check`, `bean-doctor`,
`bean-example` and `treeify` beside it can run: a missing tool, a directory, or
a file without execute permission makes it unusable, naming each one. A failed
probe adds the reason in `unusable` for an override or
`damaged` for the managed engine. Status still exits **0**; inspect those fields
before relying on the engine. Checkout and first-use status omit these probe fields.

### Optional engine features (Beangulp / Beanprice)

Beangulp and Beanprice are **not** in the base engine or the frontend. Enable
them explicitly into the managed engine:

```bash norun
# Needs network once to download Beangulp/Beanprice into the managed engine.
# The system libmagic library is optional: only importers that call
# python-magic themselves need it.
bea engine status
bea engine enable beangulp    # ingest helpers
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
| `--offline` | Never fetch, except an explicit `upgrade --check`: reuse cached managed prices and skip background update checks. Forwarded `price` quote fetching, `price refresh`, `engine enable`, `upgrade`, every `bea cloud` command, and `bea ask` exit 2 instead of sending anything. Local engine commands reuse an available engine; if installation is needed, they exit 2 before starting it. Run once without `--offline` with network access to install the engine. |
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
Paths that use home-directory expansion accept `~/…` and existing `~user/…`
names. If that home directory cannot be determined, the command exits **2**
naming the supplied path and its option, argument, or environment variable.
Use a known home name or an explicit path; init and writes create nothing
for an unresolved home.
An empty path (`--file ''`, or any path option or argument such as `format -i ''`,
`--into ''`, `--from ''`, `init ''` or `price export -o ''`) exits **2** naming it
instead of meaning the working directory, so an unset variable in a script
never reformats, exports into or initializes the current folder.
A `main.bean` that is present but not a readable ledger — a broken symbolic
link or a directory — is still the working directory's choice: the command
exits **2** naming it (and a broken link's target) rather than falling back
to `main.beancount`.
An unreadable ledger exits **2**, naming the path and the source that selected
it. Choose a readable ledger or correct its permissions.
An `include` that reaches a file without read permission, a directory, or a
broken symbolic link also exits **2** on every command, `bea check` included,
in one line naming the include and the file that includes it; `--allow-errors`
does not skip it. An include that matches nothing stays an ordinary ledger
error. A glob include in plaintext source also exits **2** naming any
directory it needs to list but cannot read, rather than loading a partial
ledger; this applies to cached loads too. Unmatched directories and hidden directories the pattern skips do
not need read permission. `format` reports the same traversal failures in its
missing-include results (`--check` and `-i` fail; `--dry-run` keeps its usual
report-only status).
One file reached under two names (a symbolic or hard link, or another
letter case or Unicode form on a volume that ignores them) is loaded once, from
its first include, and each repeat is a `Duplicate include` ledger error naming
both names; `price export` copies it once and comments out the repeat.
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

`--no-input` is implied whenever stdin is not a terminal, whenever `--json` is set, and when `CI` is truthy. In that mode nothing waits for a human. Questions are written to stderr, so a redirected or piped stdout carries only results — even with stderr closed (`2>&-`), when warnings and errors are dropped rather than written to stdout; when stderr is not a terminal either, nobody could see the question and the command fails with exit 2 as under `--no-input`. Import duplicate decisions still require `--duplicates`, and AI writes still require their own interactive permission:

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
- is another input of the same run: for `ingest extract`, a source document
  (named directly or found inside a source directory) or the ingest script
  itself, through a symlink or a hard link, or
- would become part of the ledger once written: a path that does not exist yet
  but that one of the ledger's `include` patterns matches — `-o txns/backup.bean`
  under `include "txns/*.bean"` — which the next load would read back as
  entries — for `price export`, the directory it creates as well as each file
  in it. The refusal names the path and the include; `--force` does not get
  past it, and another suffix or a directory no include reaches is fine, or
- would replace a file that did not come from this command: an existing
  `.bean`/`.beancount` file for `treeify -o` (named directly or reached
  through a symlink), and any pre-existing file at a path `price export`
  would write inside the destination directory.

When the input is an included file, the guard also checks nearby ledgers
that include it: `format txns/2026.bean -o txns/backup.bean` cannot add a
copy to a root's `include "txns/*.bean"`. Formatting stdin checks the working
ledger selected by `--file`, `BEA_FILE`, or the usual `main.bean` discovery.

Encrypted ledger members hide their own include patterns from these preflight
checks. Output and explicitly configured load-cache paths beneath an encrypted member's directory
are therefore refused as well; choose a destination outside that directory.
Encrypted files are left to Beancount's loader to decrypt and are skipped by
text scans. `doctor context` cannot inspect a location inside an encrypted
member; use a location in a plaintext ledger file instead.

A destination with a name longer than the filesystem allows is refused the
same way, exit **2** naming the flag, and so is such a `--file` or `--into`
path.
A refusal names the colliding path and leaves the destination byte-identical,
its file list included. `--force` is the only way past the second case
(`treeify -o`, `price export`, `example -o`); nothing gets past the first.
A destination the filesystem will not let the command write is a permission
failure, exit **3**, in text and under `--json` alike: `query -o`, `format -o`
and `treeify -o` refuse a read-only existing file rather than replacing it, and
a new file in a directory that is not writable, naming the path and leaving
everything as it was.
`price export` stages every file before any lands: a stop (SIGTERM, SIGHUP or
Ctrl-C) or a failed write while it stages, such as a full disk, leaves the
destination as it was, directories included, so the retry needs no `--force`.
`bea check --cache-filename` follows the first case as well: bean-check
deletes a cache file it cannot read, so a cache path that is the ledger or one
of its includes is refused before bean-check runs, with or without `--no-cache`.
The same holds for `BEANCOUNT_LOAD_CACHE_FILENAME` on every local command that
loads the ledger — `list`, `query`, `balance`, `report`, `price`, `doctor`,
`add`, `import` and the rest: a value that replaces the root or an include,
matches an include pattern once written, or falls under the encrypted-member
restriction above is refused with exit 2 before the loader starts. A cache path
outside these boundaries keeps working. An existing file there that is not a load cache
(a note, a CSV, anything that does not start with a pickle header), or that is
not a regular file at all (`/dev/null`, a FIFO), is refused the same way, under
either name, instead of being deleted, read or waited on.
bea's own default cache files under `$XDG_CACHE_HOME/bea` are never refused: a
directory, FIFO or link at the private load-cache path is removed before the
load. One that cannot be removed, such as a directory with files in it, is
left in place and the load runs uncached. A non-regular file in the
managed-price cache reads as missing.
`bea check --auto` (`-a`) always runs bean-check with `--no-cache`: the load
cache does not record which plugins produced it, so a load made with the auto
plugins is never stored for, or answered from, the cache other commands read.
The cache does not track attachments either, so every local read re-checks
them: when a `document` file appears or vanishes, or a `documents` directory
gains or loses a file, the next `check` or write sees it without a ledger file
being touched. Plugin code counts too: `bea` records where each plugin module
of a cached load resolved and its file's size and modification time, so
editing a plugin beside the ledger, removing it, or running without the
`PYTHONPATH` that found it reloads instead of serving the old plugin's output;
a load whose errors are types a local plugin defined is not cached at all.
The record also carries the load's local day: a plugin whose output depends
on today's date (`amortize_over`, `forecast`) would otherwise serve
yesterday's rows, so a cache written on an earlier day loads again.
A cached load written today that still matches the disk is served as before.
Nor does it record who loaded it: `bea` reads a ledger BOM-stripped and
NFC-normalized, Beancount's own tools read the bytes as they are. So `bea`'s
reads serve only a cache they wrote themselves and load again over one left by
`bean-check`, `bean-doctor` or an editor; those tools still read `bea`'s cache.
That cache is a full copy of the ledger, written once a load has taken a second.
A ledger with a managed price include keeps one too, beside it with a
`.managed` suffix, answered only while the ledger's files and the feed
revisions in use are unchanged.
`bea` keeps it out of the ledger's directory: under `$XDG_CACHE_HOME/bea/load-cache`
(default `~/.cache/bea/load-cache`), a directory only its owner can enter
(`0700` on POSIX), one file per ledger file. So no read — `list`, `query`,
`balance`, `report`, `check`, `doctor` — adds a file beside a ledger, whatever
the umask, and a `.<name>.picklecache` already beside one (left by an earlier
version or by Beancount's own tools) is neither read nor removed; delete it
when you no longer run those tools there. A `BEANCOUNT_LOAD_CACHE_FILENAME` or
`bea check --cache-filename` you set is used exactly as Beancount defines it,
relative paths beside the ledger included. The optional `bea price` and
`bea ingest` forwarders run upstream programs that place their own cache.
`price export` also plans the directories it needs: a file standing where the
export needs a directory (or a directory where it needs a file) is refused the
same way, and `--force` does not remove it. So is a plan that collides with
itself — one copied file landing where another copied file needs a directory.
The exceptions are both narrow: `ingest archive -o DIR` files source documents
into a directory tree rather than writing a ledger, so it keeps upstream's own
collision handling (exit 1 naming the document), and `example -o` reports its
existing destination as a conflict with exit **4**, the code it has always
documented. `query -o` and `format -o` overwrite an ordinary existing export
file by the usual CLI convention; only ledger files are protected there.
A device or FIFO destination is written through rather than replaced, so
`query -o /dev/null` discards the result, and `query -o /dev/stdout` (or
`/dev/fd/1`) prints it as `-o -` does. Any other descriptor `bea` holds —
`-o >(cmd)`, `-o /dev/fd/3` with `3>file`, `-o /dev/stderr` — receives the
result too, under `--json` as well; a closed one is refused naming `--output`.

## Exit codes

| Code | Category | Meaning |
|---|---|---|
| 0 | — | Success: the documented effect happened |
| 1 | `validation` | Ledger or validation error, and the catch-all for any other runtime failure |
| 2 | `usage` | Bad arguments, missing target, missing extra, or input needed under `--no-input` |
| 3 | `auth` | Authentication or permission failure |
| 4 | `conflict` | Conflict, or a write whose outcome is unknown |

This write-outcome protection includes `init` and `price export`: if their
engine dies without an answer, exit 4 asks you to inspect the created files
before retrying. A confirmed success keeps its result across a later stop.

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
the run was ended on purpose: `Ctrl-C` still exits 130 and a write to a closed
downstream pipe exits 141, both without a message. This includes deferred
warnings and update notices. A native command that fails without writing to
the closed stream keeps its own failure status; diagnostics to a separate,
live stderr remain available.
Bare `bea` keeps its usage/help exit **2**, including when its help cannot be
written to a closed diagnostic pipe.

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

`request_id` is included when the backend supplied one; a text-mode error
prints it as a last `  Request ID: …` line, for support. `result` carries
the partial effects when the command wrote some of what it promised (the
`formatted` paths for `format`, the `written` rows for `add transactions`);
`ledger_warnings` carries loader errors a `--json` command tolerated before
failing anyway; `--debug` adds the `traceback` string.

Cloud commands map the server's HTTP status onto the same table, preserving a
readable message from a supported JSON error response and otherwise showing
`HTTP <status>`: `401`/`403` exit **3**, `400` exits **2**, `409` exits **4**, and
everything else — including `404`, rate limiting, and server errors — exits
**1**. `ask` also accepts a single plain-text sentence of at most 200 characters;
markup, multiline or longer raw bodies fall back to the HTTP status. A message
inside JSON can span lines. A write whose outcome the CLI cannot know (a timeout
mid-delete, or a gateway's `504` or Cloudflare's `520`, `522` or `524`) exits
**4** and says so rather than guessing. Cloudflare's `521` (connection refused)
and `523` (origin unreachable) instead exit **1** with `Could not reach the server`.
[Cloudflare's `522`](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-5xx-errors/error-522/)
can occur during connection setup or while waiting for a request acknowledgment
on an established connection; its status alone cannot establish a write's outcome. A
write that never connected (a refused connection, a failed DNS lookup, a connect
timeout, or a proxy tunnel that was refused, dropped, or never answered) sent
nothing, so it exits **1** with `Could not reach the server (…)`, like a read.
Once the API request starts through an established tunnel, a lost answer still
leaves the write's outcome unknown and exits **4**.

An HTTP `401` asks you to replace the rejected credential: log in again for a
stored session, or correct or unset `BEA_TOKEN` when it supplies the credential.
An HTTP `403` asks you to check account and credential permissions; it does not
ask you to log in again. A missing or inaccessible ledger reported as `404`
keeps the server's not-found message.

A successful HTTP response that the generated parser cannot read exits **1**
with `Unexpected server response (HTTP 200).` (using the actual status code)
and preserves the request ID when supplied. This is a server-response error;
the CLI does not expose parser exceptions or the raw response body. On a write
(`cloud ledger create`, `cloud ledger delete`), an unreadable or empty success
most likely took effect, so it exits **4** instead and says the outcome is
unknown: check the current state before retrying.

bea does not follow redirects, so a credential never travels to another
origin. A `3xx` answer exits **1** with `Unexpected redirect (HTTP 302) to
<target>` (the target without its query string) and asks you to check that
`BEA_API_URL`, if set, uses `https://` and the right host, and that no proxy or
captive portal is answering for the API. It is not reported as a rejected
credential.

### `bea doctor` exit contract

`doctor` delegates to upstream `bean-doctor` but maps its diagnostics onto the
table above instead of forwarding exit **0** regardless. Valid ledgers print
upstream's output unchanged; these are the failure modes:

| Operation | Exits 1 when |
|---|---|
| `parse`, `lex` | The ledger has syntax errors (upstream's trace still prints) |
| `print-options` | The ledger or any file it includes does not parse; no default options are printed |
| `roundtrip` | The ledger or any file it includes does not parse (the trace prints without its congratulations), **or** the comparison reports `Entries differ!` — a valid ledger that does not survive upstream's own print/parse cycle. `roundtrip` exits **4** without running when `<stem>.roundtrip1<suffix>` or `.roundtrip2<suffix>` already exists beside the ledger (beside its target, for a symlinked ledger), since upstream would overwrite and then delete them |
| `linked`, `region` | The ledger or any file it includes does not parse, or an include matches no file, before anything prints, **or** the link or region matches no entries |
| `missing-open` | The ledger or any file it includes does not parse, or an include matches no file, before anything prints; **or** postings reference an inactive account, dated before its `open` or after its `close` (upstream's missing opens still print on stdout, and the inactive references on stderr, so the output can be appended to the ledger) |
| `directories` | Upstream reports an `ERROR:` line |

`context`, `display-context`, and `list-options` forward upstream's exit
unchanged. A nonzero upstream status is never rewritten.

Every operation that loads the ledger (all but `lex`, `parse` and
`list-options`) first exits 1, without running upstream, on a ledger `bea check`
rejects for a string that is not UTF-8, for a plugin that cannot be imported
or fails while running, or for a transaction booking cannot do the arithmetic
for, with check's own one-line message. Upstream logs the first two and carries
on, so its answer would describe a ledger other than yours, and dies on the
third with a bare `DivisionByZero` or `InvalidOperation` traceback. A ledger
with only other errors (an unopened account, a failed balance) still runs.

Every operation reads a BOM-marked file, and NFC and NFD spellings of one
account, as the rest of `bea` does: such a ledger runs the same upstream
operation inside the helper instead of the stock executable, so
`print-options` shows its real options and `missing-open` proposes no `open`
for an account that is already open. `lex` then dumps the tokens of the text
as loaded — without the mark, account names in NFC.

A ledger with a [managed price include](#managed-price-includes) runs inside
the helper too, for every operation that loads it (all but `lex` and `parse`,
which read the named file alone): `region --conversion value` values a holding
from the feed as `balance` does, and `roundtrip` compares the entries with the
feed's prices among them. `--offline` and `--strict-prices` apply as they do
elsewhere. An unavailable source is a load error like any other, which only
`roundtrip` prints; pass `--strict-prices` to fail on one instead.

A directory where an operation expects its ledger file exits **2** before
upstream runs, with the same one-line message `--file DIRECTORY` gets
elsewhere: `bea doctor lex books` names `books` and suggests
`bea doctor lex books/main.bean`.

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
path. An existing directory is a directory target even when its name ends in
`.bean` or `.beancount`. The global `--file` can also name the new file, but use
either that argument or `--file`, not both. To backfill before the chosen date, edit the
relevant account opens and ensure the opening balances still describe that
history. `--file` must name a ledger file: an existing directory exits **2**
with suggestions to pass it to `bea init DIR` or use `--file DIR/main.bean`.
The asset and liability accounts are opened for the chosen currency
only; the income, expense and equity categories take any currency, so a
foreign charge such as `Expenses:Dining 45 USD @ 0.90 EUR` books in the EUR
ledger above without editing an open. To hold another currency in an account,
add it to that account's open line (`2026-08-01 open Assets:Checking EUR,USD`): `bea add open`
refuses an account that is already open, and a refused posting names the open
to edit. New ledger files are
private by default (`0600` on POSIX: readable and writable only by their owner).
For group-readable books, explicitly run `chmod 640 books/main.bean` after
creation. Subsequent add/import/format writes preserve the file's permissions:
its mode, group, ACL entries, extended attributes and user file flags such as
`nodump`. A group the writing user cannot assign refuses the write with exit
**3** instead of silently changing who can read the ledger. So does a ledger
file with another hard link: the validated copy replaces the name being
written, which would leave the other name holding the old ledger. Use a
symbolic link for a second name instead; writes land in the real file.
`BEA_FILE` does not redirect
`init`; while it is set, the printed next steps name the new ledger with
`--file`, because a bare `bea` would open the one `BEA_FILE` points at.
The check, purchase and import hints also use `--file` for a custom filename
such as `ledger.beancount`; a directory's `main.bean` uses the printed `cd`
before the plain `bea` commands.
Without a terminal, `--currency` is required and the date defaults to
today. Interactively, choose the earliest date you intend to record. Use
`--date` when importing older history; opening balances must be as of that date.
An inactive-account error shows the account's opening/closing date and file
location so you can correct the date without creating another open directive.
Invalid answers re-prompt the current question while keeping earlier answers.
Invalid command-line options still fail with exit **2**.
Opening balances, `add price --amount` and custom `number:`/`amount:` values
accept finite decimal notation with ASCII digits and an optional sign and
decimal point. Comma grouping in threes (`1,000.00`, `65,432.10`) is accepted
for these values, as it is for `add balance` and `--posting`; numbers are
written without the commas. Other comma placements (`1,50`, `12,34,567`) are
refused naming the thousands separators.
Exponents, underscores, and non-ASCII digits are refused before anything is
written.

The personal template opens checking, savings, cash, credit card, salary,
interest, groceries, dining, rent, transport, utilities, fees, uncategorized
expenses (`Expenses:Uncategorized`), and opening equity accounts. Opening
balances use that currency and balance against
`Equity:OpeningBalances`; credit card debt is negative. Add other accounts with
`bea add open` before posting to them.

Currency symbols follow Beancount syntax, including custom and crypto symbols;
the CLI does not check an ISO currency registry. `init --currency US` is valid
syntax, but emits a typo warning because the symbol is not three uppercase
letters. The warning appears on stderr, or in `data.warnings` in JSON mode.
Lowercase input such as `usd` is normalized to `USD`. Single-letter symbols
such as `F` and internal punctuation such as `NT.TO` or `X_USD` work. A symbol
ending in punctuation, including `_`, is refused with exit **2** before init
creates a directory or ledger.

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
bea query "SELECT account, sum(position) GROUP BY account ORDER BY account" > balances.txt
bea treeify < balances.txt                  # the account column drawn as a tree

# Run a BQL query and print a table; omit the query for the interactive shell
bea query "SELECT account, sum(position) GROUP BY account"
bea query "PRINT"          # parseable directives, not a table
bea query                  # needs a terminal; exits 2 without one
```

`bea check` reports a `plugin` line that cannot be imported as `FILE:LINE:
Cannot import plugin "NAME": CAUSE`, and one whose plugin raises while running
as `FILE:LINE: Plugin "NAME" failed while running: CAUSE` (with the
`plugin "NAME" "CONFIG"` form named when the plugin needs a configuration
string) — the lines `--json check` and every other read give — instead of
bean-check's traceback at `<load>:0`, and exits **1**. With no bean-check options the
ledger's other load errors are listed beside it; with options such as `-v` or
`--auto`, which can change those, only the plugin failures are.
A plugin that calls `sys.exit()` also fails with exit **1**, including exits
0 and 7 or an argument parser rejecting its configuration. The failure names
the plugin, its `SystemExit` value, and what it printed. This stops the load
on reads and writes, including doctor, native-source queries, `--debug`, and
`--allow-errors`; the plugin did not finish transforming the ledger.
A transaction Beancount's booking cannot do the arithmetic for — zero units
at a total cost (`0 HOOL {{310 USD}}`), units elided beside a zero cost or
price (`HOOL {0 USD}`, `EUR @ 0 USD`), or an amount it must infer wider than
the 28 significant digits it keeps — is reported the same way, as `FILE:LINE:
Beancount cannot book this transaction: …`, where bean-check raises an
uncaught error; every other read reports it at that line too, and leaves
that transaction out.
`bea --debug check` keeps bean-check's traceback for ordinary exceptions;
a terminating plugin is refused before bean-check can run it again.
Metadata named `filename` or `lineno`, on a directive, a posting or in a
`pushmeta`, is an error at its line under every option, `--debug` included:
`Metadata key 'filename' is reserved for Beancount's source location; choose
another key.` It is added to the ledger's other errors, never in place of
them: with bean-check's own options (`-C`, `-v`, its `--json`) bean-check
still reports the rest, and the key joins its list.
Beancount writes such a value over the entry's location without a word, so
every read would place the entry in a file that does not exist. Reads keep the
real location; rename the key, for example to `receipt:` or `statement:`.

`bea check` loads the ledger once in its helper, which applies bean-check's own
validations. With no bean-check options, a ledger that passes is answered from
that load, so each plugin runs once. A ledger with errors, or a run with
options, also goes through native bean-check, which loads it again so that its
errors print in bean-check's own form; plugins run twice there. That load skips
the shared load cache (`--no-cache`, unless you name a `--cache-filename`): a
cached load lacks bean-check's own data-type checks, so a slow ledger passed
that bean-check rejects.

`bea treeify` reads account names with Beancount's own grammar unless `-r`, `-F`
or `-A` chooses another pattern, so a component with an accented or CJK
character (`Assets:Bank:Épargne`, `Assets:B银行`) is drawn in the tree like any
other. Upstream's default pattern, the one `--help` prints, takes ASCII only
and left those rows flat between the branches.

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

`bea example` exits 2 before generating when its date range is inverted,
shorter than 31 days, starts before 1970-01-01 or spans more than 100 years
(a longer span ran for minutes, then failed upstream); a missing `--date-begin` or `--date-end` takes
upstream's default (January 1 two years back, and today) for that check.
Both dates must be written `YYYY-MM-DD`; any other spelling (`2026/03/01`,
`March 1 2026`) exits 2 as well, since the range could not be checked.
It exits 1 when the history `bean-example` generated fails upstream's own
validation — a range that starts mid-year and crosses January 1 does, as does
a `--date-birth` after the begin year's January 1 — naming the errors and
writing nothing: `-o` is written by `bea`, only after the run validates, so a
failed run leaves no new file and an existing `--force` target untouched.
`bea treeify` exits 2 when its input has no hierarchical column to render,
naming what it looked for — piping plain text is not a tree. Its `-o`
option accepts `-` for stdout, and an input of `-` reads stdin, just like
omitting the input. Neither form reads or creates a file named `-`; use `./-`
when that literal file is intended. Its file output
destination follows [Output destinations](#output-destinations): the ledger
under read is refused, an existing `.bean`/`.beancount` file needs
`--force`, and a destination that is the input file is refused. The
destination is written only after the tree renders, so a failed run leaves it
untouched. `bea ingest`
needs a script that calls `beangulp.Ingest(...)()`; a `CONFIG = [...]`
import module is refused with exit 2 and pointed at `bea import --config`,
which is the command that shape belongs to. An annotated
`CONFIG: list = [...]`, a `from myimps import CONFIG`, or a `CONFIG` bound
inside `try`/`if`/`with` is the same module and is refused the same way, and an
`Ingest(` in a comment or docstring calls nothing; a script with an `if __name__ == "__main__":` block runs, whatever it names its
importer list and wherever its `Ingest` call lives.

`ingest extract -e/--existing LEDGER` uses Beangulp's own loader for duplicate
detection. It refuses a plaintext root or included file with a UTF-8 BOM or text outside
Unicode NFC (exit **2**, naming the file), before running the ingest script or
writing output. Run the printed `bea format -i FILE` command to remove a BOM.
For Unicode normalization, re-save the named file in NFC; `format -i` does not
renormalize existing text. Retry extraction after correcting the file. This
guard applies to all text in those plaintext files, including comments and strings;
encrypted files pass through to Beangulp without this preflight inspection.
The existing ledger must be a regular file; a directory is refused with a
`--existing` hint naming its root ledger. Extract also checks that a file output
has an existing parent and can be written before running the ingest script.
An invalid destination exits **2**, and a permission refusal exits **3**, with
existing output left untouched. `-o -` keeps Beangulp's stdout behavior;
`archive -o` continues to name an archive directory.

### `bea format` writes to stdout unless you ask for a file

Formatting used to rewrite whatever path it was given. It now prints the
formatted text and leaves the file alone; `--in-place` (`-i`) is what rewrites
it, and `--output FILE` (`-o`) writes somewhere else. `bea format -i .` is the
old `bea format .`.

The engine uses `bean-format`'s alignment for every destination, with two-space
posting indents. Beancount's lexer distinguishes postings from metadata and
multiline strings: metadata indentation and string contents are preserved,
including string lines that look like postings. A line holding a space other
than a plain space or tab ahead of any comment or string — a pasted no-break
space (U+00A0) or ideographic space (U+3000) beside an account, say — is kept
byte for byte under every width option, because Beancount reads that character
as part of the name; the rest of the file is still aligned. Stdout, `-o`, and `-i` produce
the same text; `--check` and `--dry-run` compare the exact bytes `-i` would write.
Every destination checks syntax first. Stdout and `-o` refuse malformed input
with exit 1, naming its file (or stdin) and line, and leave the destination
untouched. They parse only the supplied text, without loading includes or
running plugins. The walking modes check parseability as described below.
Run `bea check` to validate the ledger's accounts and balances.
`-o` replaces its destination only once the whole formatted text is written: a
write that fails part-way preserves an existing export and leaves no partial file.
The same holds when it is stopped (SIGTERM, SIGHUP or Ctrl-C) while writing: the
hidden `.bea-*.tmp` copy is removed and bea ends by that signal. This covers
every `-o` export (`format`, `treeify`, `example`, `query`).

Ledger text and query results on stdout are UTF-8 whatever the locale, so
`bea format FILE > out.bean` and `bea query … > out.csv` write the bytes `-o`
would; so are the `list`, `balance` and `report` tables and `list --details`.
Only messages are escaped (`\xfc`) when the locale cannot show them.

Writes match the file they append to: new lines use CRLF in a CRLF ledger and
LF elsewhere, a missing final newline is repaired as part of the append, and
existing bytes are never renormalised as a side effect. `format -i` is the
convergence path instead — it rewrites CRLF line endings to LF, strips a UTF-8
BOM, and reports the file as formatted even when alignment alone did not change
— so `--check` fails on a BOM-marked or CRLF file until `-i` has run. A lone
carriage return inside a line is text to Beancount (in a comment or a string),
so the formatter keeps it and leaves that line unaligned. Carriage returns
at line endings or EOF become a single LF on the first format pass. Appends preserve
the original bytes and add the missing newline and blank separator there.

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
on the same ledger both finish, and the second reports nothing to do. The wait
is bounded like every writer's (see [`BEA_LOCK_TIMEOUT`](#environment-variables)). A lock
is an open file, so a directory with more targets than the process may hold
open (macOS starts at 256) first raises its own limit, and past the hard limit
locks each file only while that file is read and replaced; the number of files
is not bounded either way.
`--check` and `--dry-run` take no lock because they write nothing.

A ledger saved with a UTF-8 BOM loads like any other: the mark is skipped on
read, kept by appends, and removed only by `format -i`. Account names, search
terms, and BQL literals compare NFC-normalized, so NFC and NFD spellings of
one name resolve to one account with one balance; new directives write their
account names NFC (text — a payee, narration, comment or custom text value —
keeps the bytes typed), and a file `--into` creates takes the NFC spelling of
its name, while existing bytes are never renormalised as a side effect. `bea check`
therefore runs a closure that spells an account or tag outside NFC through the
helper, and refuses bean-check options such as `-v` for it (exit **2**): drop
the options, or re-save the file as NFC — `format -i` does not renormalize.
Non-NFC text in comments and strings does not count. A file that
is not UTF-8 at all fails with its path, the offending byte offset, and a hint
to re-save as UTF-8; piped input to `bea format -` fails the same way, naming
`stdin`, before anything is written. Reads and `bea check` give that same
message for a string the parser cannot decode, in the root ledger or an
include, and `--allow-errors` does not report past it.

A directory is walked for `.bean` and `.beancount` files, and a walked entry it
cannot read stops the run (exit **2**) naming the path and where it points — a
broken `include` symlink is the shape this usually takes; a subdirectory it may
not list, or a ledger file it may not read, stops it the same way. Silently dropping it
would let `--check` report a tree it never looked at, green while `bea check`
fails on the very include the entry stands for. The dangling `.#name` lock
links Emacs keeps beside files with unsaved edits are not ledger files and are
skipped, as are the AppleDouble `._name` files macOS writes beside files on
exFAT, FAT and SMB volumes and leaves in its archives. Only files that start
with that format's magic bytes are skipped. A symlink resolving outside the
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
at 200; zero keeps automatic sizing. A nonzero `--currency-column` lays every
amount out against that one column, as `bean-format` does, so `--prefix-width`
and `--num-width` given beside it are accepted and have no effect. Appended
entries use the same automatic alignment rule.

In `--json` mode the destination has to be explicit, because stdout carries the
envelope and nothing else: pass `-i`, `-o FILE`, `--check` or `--dry-run`.
`-o -` is refused there for the same reason — it names the stream the envelope
already owns — and so are its device spellings `-o /dev/stdout` and
`-o /dev/fd/1`, while plain `bea format -o -` remains the text export.

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
or `__`-prefixed keys — in text, CSV, and JSON alike. A text or CSV metadata
cell is the JSON output's object written on one line
(`{"fee-rate": "0.00000001", "settled": "2026-01-07", "cleared": true}`), so
it parses as JSON and never shows a Python `Decimal('1E-8')` or
`datetime.date(...)`; a text or CSV directive cell is the directive's
Beancount text, one line per table row in text. Text-table numbers, `-m`
included, are fixed-point (`0.00000001` and `1500`, never `1E-8` or
`1.5E+3`), aligned on the decimal point, with columns padded by display
width so CJK text keeps its row aligned, and a NaN or an infinity prints
as `NaN` or `Infinity`, as in CSV and JSON. Native `--source` queries keep
upstream's rendering.

CSV cells hold the ledger's values verbatim, as `bean-query` writes them, so a
payee or narration such as `=HYPERLINK(...)`, `+cmd|...` or `@SUM(...)` —
common in imported bank exports — is evaluated as a formula if the file is
opened in a spreadsheet. Pass `--spreadsheet-safe` with `--format csv` (local
`--file` only) to prefix text cells that start with `=`, `+`, `-`, `@`, a tab
or a carriage return with `'`; numbers and amounts keep their sign. Leave it
off for files a program reads back, since it changes those text values.

A redirect, a pipe and `-o FILE` receive the same bytes for the same result.
Only a result printed straight to a terminal differs: control characters in a
CSV cell or a `PRINT` directive are shown as a visible `\xNN` there, as the
text table shows them everywhere, so a stray escape sequence in a payee cannot
drive the terminal.

An `-o` destination that is the ledger under read is refused with exit 2 before
anything is written, in one-shots and in the interactive shell's `.output`
alike, including a `.output` line in Beanquery's `~/.config/beanquery/init`
file, which is replayed once the ledger is loaded (an explicit `-o` outranks
it) — see [Output destinations](#output-destinations) for the one rule every
command with an output destination follows.

`--format beancount` prints directives, so the query has to return entries:
`bea query PRINT -f beancount` (or `SELECT entry`) preserves negative custom
values as separate values, decimal precision, and complete cost specifications.
Existing multiline text stays intact. A padding transaction Beancount derived
from a `pad` is left out when that `pad` is in the same result, so the export
of a valid ledger passes `bea check`; selected without its `pad`, it is printed.
For the same reason the export starts with the `option` lines its validity
rests on, wherever the ledger changes them from Beancount's defaults: renamed
roots (`name_assets` …), `account_rounding`, `booking_method`,
`tolerance_multiplier`, `infer_tolerance_from_cost` and each
`inferred_tolerance_default`. Other options and `plugin` lines are not carried.
When included directives use default root names, the export switches `name_*`
options around those directives without changing their result order, then
restores the root ledger's names at the end. A directive needing both the
default and renamed name for one account type, or another included file's
names that differ from both, cannot be flattened this way: export refuses and
names its accounts. Keep the split ledger or use JSON/text output for those results.
A `document` path inside the root ledger's directory is printed relative to
that directory, whichever file of the ledger wrote it, so the export never
names the machine it ran on and reloads when saved beside the ledger; a path
outside that directory stays absolute.
These rules also apply to stored queries
and the interactive shell; explicit `--source` uses native Beanquery rendering.
A column result such as `SELECT date, account` is a usage error (exit 2) that
points you at `PRINT` or at `--format text`/`csv`. A `PRINT` that matches no
directives is an empty result like any other: exit 0, `(no rows)` on stderr,
and with `-o` an empty file, as an empty `SELECT -o` writes.

A directive in query JSON (`PRINT`, `SELECT entry`) spells an `open`'s booking
method as the ledger does (`"FIFO"`) and gives each `custom` value the tagged
shape `bea list custom` answers — `{"kind": "text", "value": …}`,
`{"kind": "amount", "number": …, "currency": …}` and so on — never a Python type name.

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
A trailing `;`, a `/* comment */` after it, and semicolons inside quotes or
comments, are not second statements.
A shell command such as `.tables` or `.format` is one line: further lines
after it are refused the same way (only `.explain` and `.parse` take BQL that
may span lines), and a command the shell rejects (an unknown name, a bad
`.set` or `.format`) exits 2 without writing an `--output` export.
`.help` and `.parse` go to `--output` like every other command, on `--file`
and `--source` alike. A shell command that prints nothing there (`.history`,
`.reload`, `.run` with no stored queries, `.errors` over a ledger with errors)
says so on stderr and leaves the destination as it was; a query with no rows
still writes its empty result.
The same one-statement rule covers native `--source` one-shots, the body of a
stored `query` directive replayed by `.run NAME` or `.run *`, and BQL typed at
the interactive prompt, where the refusal is an ordinary error and the shell
stays usable. `.run *` still runs several separate stored queries. A stored
`query` directive whose body is empty, blank or only a comment is refused by
name under `.run NAME`; `.run *` skips it with a line on stderr and answers the
rest. A stored query whose window covers no days is refused by name the same
way, and a stored `OPEN ON` beside a bare `CLOSE` is told the window closes at
the query directive's date, not the end of the ledger.
Native `--source` one-shots keep upstream's rendering but not its exit status:
`.run` naming a missing stored query, and BQL that does not parse or compile,
exit 2 with the reason on stderr, and an existing `--output` export is replaced
only after the query succeeds. A Beancount `--source` (a bare path or
`beancount:<path>`) naming a file that does not exist, or a directory, exits 2
naming the path before anything runs, for a one-shot and the shell alike;
load errors inside a ledger that exists keep upstream's behaviour. A
`csv:<path>` source that is missing or a directory, and a source with no path
at all (`--source ""`), exit 2 the same way; a source the filesystem will not
let `bea` read is one line on stderr (exit 3 for a refused permission), with
no traceback.
With no query argument, `--file` and `--source` alike read BQL from piped
stdin and open the interactive shell only on a terminal where prompting is
allowed; under `--no-input` (or `CI`), or with empty stdin, a missing query is
refused with exit 2 instead of waiting at a prompt, and so is the shell with
stdout redirected, where its prompt would land in the output. Piped BQL must be UTF-8 (a
BOM is fine); anything else is refused with exit 2, naming `stdin` and the
offending byte offset, whatever the locale. The shell prints results without
a pager, as `bean-query` does (`.set pager on` turns Beanquery's pager on). In
the shell, `Ctrl-C` cancels the current line and returns to `beanquery>`, as
under `bean-query`;
`.exit` (or `Ctrl-D`) ends the session with exit 0 and saves its history to
Beanquery's `~/.config/beanquery/history`, the file `bean-query` shares. It
follows `HOME` only: `BEA_CONFIG_DIR` and `XDG_CONFIG_HOME` do not move it, so an
isolated setup sets `HOME` too.
A history file that cannot be loaded costs the history, not the session: the
shell says so in one line on stderr and opens with an empty history.
Pressed while the ledger is still loading, `Ctrl-C` takes effect once that load
completes, so no session answers from a partly read ledger: at startup the
shell exits 130 without opening, and a `.reload` returns to the prompt.

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
A column selected beside an aggregate with no `GROUP BY` is grouped by
implicitly, so one BQL cannot hash — `other_accounts`, `balance`, `meta` — is
the same usage error (exit **2**), named with its type:
`SELECT joinstr(other_accounts), count(*)` or `str(meta)` groups by its text.

An empty result prints `(no rows)` on stderr, as an empty `bea list` prints
`No transactions found.` (or its type's notice) there, so a `> file` or `| head`
never reads it as a row. JSON mode keeps the usual
envelope with an empty `rows` array and no human notice.

BQL's `CLOSE ON D` is exclusive, unlike the inclusive `--from-date` /
`--to-date` filters elsewhere in `bea`, so `FROM OPEN ON D CLOSE ON D` asks for
a window of zero days. That is refused (exit **2**) rather than answered with an
empty result that reads like an empty day: the error names the exclusive bound
and points at `CLOSE ON D+1` and at
`bea list transaction --from-date D --to-date D`. A reversed window
(`OPEN ON` after `CLOSE ON`) is refused the same way. So is `OPEN ON D` with a
bare `CLOSE`, which Beanquery cannot compile: give `CLOSE ON` a date, or drop
`CLOSE`. Windows that cover at least one day are untouched.

Reads are lenient in a terminal and strict everywhere else. `query`, `list`,
and `report` print the data with the loader errors as a banner on stderr and
exit 0 when stdout is a terminal; under `--json`, when stdout is piped, when
`CI` is truthy, or with `--strict`, they exit 1 instead unless `--allow-errors`
opts into the partial answer (the errors still print on stderr). A `--json`
`list` or `query` envelope carries `ledger_valid` and `ledger_errors` beside
`data`, as reports carry them inside it, so a partial answer says so in the
JSON itself. `price status` also tolerates ledger errors and includes these
two fields beside `data`. If a JSON command tolerates loader errors and then fails anyway,
stderr still holds one object: the loader lines ride along as
`error.ledger_warnings`. `bea check`
always exits 1 on errors — reporting them is its whole job, so it has no
`--allow-errors` flag.
The same validation gate runs before the interactive BQL shell opens, and a
strict session keeps it: after a `.reload` that introduces errors, typed and
stored (`.run`) queries are refused until a clean `.reload`. A `.reload` that
cannot read the ledger at all (a file or include unreadable or gone) says so in
one line and refuses queries in every session, strict or not, until a `.reload`
succeeds; `.errors` shows the reason. Missing
format targets are usage errors. `format --dry-run` previews changes without
writing and exits **0** even when formatting is needed. `format --check` leaves
files untouched and exits **1** when formatting is needed, **0** when all
scanned files are formatted.

`format --check` gates on alignment, parseability, and the include graph:
a named file stands for its whole include closure — every file an `include`
reaches, whatever its suffix (`entries.inc` too) — a file the parser rejects
fails instead of reading as "already formatted", and an include that matches
nothing fails naming the directive. A relative include resolves beside the file
that names it, never against the working directory. A managed price include (an `http(s)://`
URL) is not a file: it is neither formatted nor reported missing, and the gate
needs no network or login for it. Encrypted includes (`.gpg`, or armored PGP
`.asc`) are also left untouched: formatting names them as skipped and never
decrypts them. These intentional skips do not cause a nonzero exit; the gate
judges the plaintext files only. `--in-place` formats every reachable plaintext
file and skips the unparseable ones, exiting nonzero for parse failures or
missing/unreadable includes, as well as write failures.
When several roots or include directives reach one unreadable member, the
report names each includer.
Semantic validity stays with `bea check`: a failing balance assertion or an
unbalanced transaction does not fail `--check`, so for CI or a pre-commit hook
run `bea check` alongside `bea format --check`. Included files are formatted
independently of their root ledger's account opens and options. In JSON mode, a
failing `--check` returns the scan result in `error.result`: `scanned`, the
`formatted` paths that would change, the `failed` files with their syntax
errors, the `missing` includes, the `skipped` encrypted files with their
`file` and `reason`, `check`, and `dry_run`. Successful check/dry-run and
in-place results also include `skipped` (empty when none were skipped), as do
reported in-place failure results. `scanned` counts the plaintext files and
does not include the encrypted files in `skipped`.

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
| `--sort oldest/newest` | Date order, applied before the limit, so it also decides which end of the ledger a truncated listing keeps. `transaction` defaults to `newest`; the other ten types default to `oldest`, so pass `--sort newest` for the latest prices or balance assertions. Specify the order in scripts that depend on it. |
| `--details` | Transactions: render Beancount syntax with every posting, cost/price, metadata, and source location; strings exactly as the ledger holds them, each transaction headed by its source location as a `;` comment, so redirected output parses back (a terminal sees control characters as `\xNN`) |
| `--flag` | Transactions: select a flag, such as `!` for entries needing review; applied before the limit. |
| `--search TEXT` | Transactions: case-insensitive substring over payee and narration; every run of spaces, tabs and line breaks, in the entry or the term, compares as one space, so the text the table shows matches however it spaced a line break. Repeatable (AND — every term must match a row), applied before the limit. |
| `--tag TAG` | Transactions: tag with or without `#`, matched case-sensitively. Repeatable (AND — a row must carry every tag given). |
| `--link LINK` | Transactions: link with or without `^`, matched case-sensitively. Repeatable (AND — a row must carry every link given). |
| `--from-date` | Only directives on or after this date (`YYYY-MM-DD`) |
| `--to-date` | Only directives on or before this date (`YYYY-MM-DD`) |
| `--account / -a` | Case-insensitive substring account filter (`transaction`, `note`, `balance`, `open`, `close`, `document`, `pad`). Matching ignores Unicode normalization, so the NFC and NFD spellings of one account name find each other, and folds Turkish `İ`/`ı` to `i` like `--search` and `bea balance` do. |
| `--currency / -c` | Exact symbol, case-insensitive (`price`, `commodity`); `eur` matches `EUR` |
| `--type / -t` | Exact type, case-insensitive (`event`, `custom`); `Location` matches `location` |
| `--allow-errors` | Return data even though the ledger has loader errors (they still print on stderr) |
| `--on-disk` | Only directives written in a ledger file; hide rows a plugin synthesized |

A `document` row's `filename` is relative to the file that wrote the directive
(the form `add document --into` takes back), so each row also names that file:
`source` (`filename`, `lineno`) in JSON and a `WRITTEN IN` column in the table.

```bash
bea list transaction
bea list transaction --sort newest --details --limit 10
bea list transaction --account Expenses:Food --from-date 2026-01-01 --to-date 2026-03-31
bea list price --currency BTC --sort newest
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
A managed price include adds prices no ledger file declares either: they live
in the price cache, and are marked and dropped the same way. After
`bea price export` the feed is an ordinary local file and its rows are on disk.
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
selected, in entry order; without `--account` the key is absent.
`bea add transactions` ignores it on input, so a filtered listing can be fed
straight back in. `--details`
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
letters and configured root names are supported, and so is any other non-ASCII
character Beancount itself loads after a segment's first character, such as a
combining mark that has no precomposed letter, except Unicode whitespace.
Unicode spaces such as U+00A0 (NO-BREAK SPACE) are refused even in an existing
account Beancount loads; rename that account in the ledger before `add` can
reference it. `add open` refuses Unicode format
characters in new names, including U+200B (zero width space), ZWJ and ZWNJ. Existing
accounts containing them remain usable; an unopened name gets visible escapes
and a code-point explanation instead of an unusable `add open` remedy.
An account name written in a
different Unicode normalization than the ledger uses — NFC where the ledger has
NFD, which is what a name taken from a macOS file path looks like — resolves to
the same account instead of a false unknown-account error, and the new
directive is written NFC. Only `bea` reads the two spellings as one account:
when the ledger spells the name in another normalization than the new line,
other Beancount tools such as stock `bean-check` report that line as an unknown
account, so a ledger they accepted stops being valid for them. The write still
succeeds, and says so in a note on stderr (`warnings` under `--json`) naming
both spellings as escapes, for every `add`, bulk row, and import; re-save the
ledger as NFC to keep it valid elsewhere — `format -i` does not renormalize.
Amount strings use decimal notation
(e.g. `1000`, not `1e3`) in command arguments, bulk JSON, and imports,
including units, costs, and prices; scientific notation is refused on every
path with the same message. Bulk JSON amounts and tagged `number`/`amount`
metadata, like `--posting`, also refuse underscores (`1_000`) and non-ASCII
digits (`٤٥`, `１０`). Bulk JSON amounts must be decimal strings or
integers — a JSON float such as `0.3` is refused naming the field, the row,
and the string form to send, because the double already carries binary
error. Bulk notation errors follow the normal row-validation and
`--partial` rules. JSON output — listings, `add` results (custom values and
balance tolerances included), typed metadata, import row amounts, query JSON
and CSV, and balance and report JSON — spells amounts in fixed-point decimal notation
(`0.00000001`, never `1E-8`) so tiny values can be fed back into input without
losing precision. Native posting
arithmetic such as `84/2 EUR` works. A literal zero divisor (`100/0`) is
refused as a usage error before it reaches the engine, because Beancount
evaluates amount arithmetic while parsing and a zero divisor crashes it.

Every write is staged into a hidden `.bea-*.tmp` copy beside the ledger and
moved into place only once it validates, so an interrupted write never leaves a
half-written ledger. A write whose `bea` process is killed outright (`kill -9`,
an out-of-memory kill) is abandoned too: the helper notices its parent is gone
and stops without committing, so a retry never records the entry twice. Only the destination and the files that include it,
directly or through other includes, get a staging copy; the rest of the include
graph is read in place, so a read-only shared directory of included files does
not block a write elsewhere. When a directory that needs a staging copy is not
writable, or the filesystem refuses the final replacement, the write exits
**3** naming the directory or file, and nothing is written. If the command is stopped, the staging copy goes with it:
the engine is told to unwind, and a later write in the same directory clears any
copy left by a kill that could not be caught, which is the only case a signal
handler cannot cover. A stop that lands while the ledger is being parsed ends
the engine at once with its staging copies removed, so a stopped write never
commits, with or without `--allow-errors`. The atomic replace itself is the
dividing line. A stop (SIGTERM, SIGINT, SIGHUP) that arrives during the replace
or after it never undoes the write or silences it. bea prints the write's normal
result, adds `Stopped (SIGTERM) after the write had completed; its result
stands.` on stderr, and exits 0, so a retry is never needed. A multi-file
`format -i` stopped after a rewrite ends before the next file and exits **1**,
listing the files it formatted and the ones it did not attempt; re-running it
formats the rest. A helper that cannot finish within the grace period after a
stop is killed, and the write then exits **4**, its outcome unknown. Only a
`kill -9` of the helper itself in that moment can end it unreported: SIGKILL
cannot be caught, so after one, check the ledger before retrying.

For split ledgers, keep `--file` pointed at the root and choose the included
destination with `--into`. Its path is relative to the root ledger's directory
and must match a literal include or include glob; a URL is refused with exit 2. An absent destination is
created only when a validated write succeeds; its parent directory must already
exist. Previews, rejected writes, and duplicate-only imports leave it absent.
New destinations are private (`0600` on POSIX). When `--file` names an included file anyway, a
write (`add`, `import`, `ask`) that has no `--into` finds the ledger that
includes it — searching the file's directory and up to three above it (stopping
at a `.git` directory), each with its immediate subdirectories, opening at most
64 candidate `.bean`/`.beancount` files — and runs through that root
with `--into` set to the file: the entry still lands in the named file, but it
is validated and deduplicated against the whole ledger, and a note says so (in
`warnings`, or `notes` for import, under `--json`). Such a write is the root's:
`target.file` names the root, as the same write with `--file` on the root and
`--into` does, and import memory is kept under the root, so both spellings
share one remembered mapping. That holds only when the including ledger defines what the file
reads: an account it opens, a plugin for entries the file posts to accounts it
never opens, or an option the file does not already set (beyond its title). A Fava
or forecast overlay that includes a working ledger and only adds entries is
not its root even when it repeats an option or names the forecast plugin, so
writes and failing reads stay with the ledger named, and a leaf below the
working ledger stops its climb there rather than at the overlay above.

Beancount applies `option "name_assets"` and the other root-renaming options
only while it parses the file that sets them, so an included file reads the
default roots unless it repeats them. A new destination on a ledger with renamed
roots starts with the root's `name_*` option lines. A write into an existing
include that lacks them is refused, and the error lists the lines to add at
the top of that file.
Write checks and new-file seeds use NFC root names and the last valid option
values; a leading UTF-8 BOM does not hide the first option.

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
A balance assertion with a `~` tolerance takes no part in alignment: an add
writes it single-spaced and `bea format` leaves it as written.
Writes respect the destination file's permissions: a read-only file produces
exit **3**, even when its directory permits replacement. This also applies to
import and to `bea format -i`, which replaces the file itself rather than
handing it to upstream's formatter. A read-only root can still validate a
writable `--into` file.

Payees, narrations, lot labels, string metadata, and the string fields of
`note`, `event`, and `custom` are written on one line: runs of CR/LF line breaks become spaces
in single adds, bulk JSON, and imports, so a pasted multi-line value can never
write a directive that breaks the file. That applies to a value given as its own
field — a bulk `cost.label`, a `--payee`. A posting fragment is refused instead:
a `--posting` argument or a bulk `amount` containing a line break (a lot label
spelled inside `{…}` included) exits with an error naming it, writing nothing. A sale's lot label is the exception:
it selects an existing lot, so it is matched — and written — exactly as
typed. Every other control character —
`ESC`, the rest of the C0 range including tab, `DEL`, and C1 — is replaced by
a visible `\xNN` rather than passed through, so text from an untrusted source
such as an imported bank export cannot drive your terminal. The Unicode
bidirectional overrides, embeddings and isolates (U+202A–202E, U+2066–2069) are
escaped the same way, as `\uNNNN`: a right-to-left override ahead of an amount
could otherwise reorder how the rest of a row reads. Arabic, Hebrew and other
right-to-left text is left as it is, and so are the line and paragraph
separators (U+2028, U+2029) inside a string. That matters most
in the `import` preview, which is the surface `--apply` is gated on: a
description carrying a cursor-movement sequence could otherwise redraw over the
rows above it and show you something other than what would be written. The
escaped form is what gets stored, so the oddity stays visible on later reads.
Quotes and backslashes retain their contents. Human tables also flatten line
breaks from existing entries without modifying the ledger. Diagnostics get the
same treatment in text mode: loader errors and warnings, error details, format
progress lines, and `list transaction --details` source lines show a document
name or include path's control characters as `\xNN`, while `--json` keeps the
exact value. The `import` preview's diff does the same for the existing ledger
lines it shows as context. Native `bea check` output is upstream's own and passes through.

Examples below assume their accounts were opened and their dates, balances,
and document paths are valid for your ledger. Every add command, and `import`,
accepts `--allow-errors` for a semantic error already in the books, such as a
balance assertion that still fails; without the flag the write refuses and
names the existing errors. Import and the price/balance pre-checks say
`The ledger already has N error(s); nothing was written. Pass --allow-errors
to write anyway.` Syntax errors instead say to fix the syntax first, and
import refuses both preview and apply without reporting rows ready, even
with the flag. An error the write itself would introduce —
an unknown account, a currency violation, a new balance failure — is refused
even with the flag. The two exceptions are the first halves of a two-step: the
staged pad of the pad flow below, and an account opened on a ledger that loads
`beancount.plugins.nounused` (alone or through `pedantic`). That plugin reports
an account until something uses it, so there `add open` needs `--allow-errors`,
reports `Unused account` as staged, and the account's first `add transaction`,
`add transactions` or `import` clears it without the flag; the refusals for a
missing account print the `add open` line with the flag. Syntax errors and pad references to unknown or inactive accounts
are always rejected. An unterminated string in the append destination is
reported at its original file and line, even with `--allow-errors`.
A syntax error is text Beancount could not read; what it
reports about text it did read — an unknown option, a duplicate metadata key, an
unbalanced `pushtag` — is tolerated like any other existing error. An append
destination that ends inside `pushtag` or `pushmeta` is always refused, even
with `--allow-errors` or a leading UTF-8 BOM, because the new entry would
inherit that context. Close the push or choose another destination. For an
opening adjustment, prefer an explicit atomic pad and balance:

```bash
bea add balance --date 2026-01-02 --account Assets:Checking \
  --amount "900 USD" --pad-from Equity:OpeningBalances
```

The pad defaults to the preceding day; `--pad-date` can select another date
before the assertion. Both accounts must be open by the pad date. If an
explicit pad date is before the account opens, move `--pad-date` to the open
date or later and keep the balance `--date` later than that pad date; moving
only the balance leaves an explicit pad date unchanged. When the
book already holds the asserted amount, `--pad-from` writes the assertion alone
and says so. A book that holds a different amount within the assertion's
tolerance is named with that amount. When an existing pad on the account already
fills the assertion from the same source, it writes the assertion alone with a
warning naming that pad and the amount it inserts; an existing pad from a
different source refuses. A written pad says what it inserts (`the pad inserts
154.08 USD into …`). Liabilities, equity and income balances are negative in
Beancount, so an assertion that is exactly such an account's balance negated is
almost always a statement's positive figure. `add balance` names the sign in
that case. With `--pad-from`, it refuses (exit **2**) and says what the pad would
insert, unless you pass `--force`. A generated opening adjustment for such an
account with a positive amount also offers the negative one.
Under `--json` every `add balance` answer has one layout: `directive` is the
assertion and `pad` the inserted pad (or `null` when none was written), each in
the shape `list balance` and `list pad` return, beside `written`, `duplicate`
and `source`. A written `pad` also carries `amount`, the units it inserts.
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
Balance amounts accept pasted Unicode space separators, such as U+00A0
(no-break space), and write ordinary spaces between tokens.
Concurrent CLI writers use persistent locks under `$XDG_CACHE_HOME/bea/locks`
(default `~/.cache/bea/locks`), keyed by the identity of each file's
directory plus its case-folded name, so every spelling of one path — `Books`
and `books` on a case-insensitive volume, a symlinked directory — takes the
same lock. No lock files are created in ledger directories. Locks remain in
the cache after release so waiting writers always coordinate through the same
file. Writers queue rather than refuse one another: a command that reads the
ledger to decide what to write — `add price`, `add balance`, `add transaction`
with an inferred currency, `add transactions`, `import --apply` — takes the
lock before that read, so unrelated `bea` writes started together all land,
and a repeated price or balance is reported as already recorded. One of these
that ends up writing nothing removes a lock file it created itself. Each
writer also holds an advisory lock on the directory of every file it writes,
so writers whose `XDG_CACHE_HOME` differs — two OS users, containers or
sandboxes sharing one ledger — still queue. That second lock needs `flock` on
a directory the writer can read: on Windows, or on a filesystem without it,
writers must share `XDG_CACHE_HOME` to be serialized. When the lock directory
cannot be created or written — a read-only cache
root, a file in the way — the write is refused with exit **3** naming it;
make it writable or set `XDG_CACHE_HOME`. A lock file that is not a regular
file (a directory, a named pipe) is refused the same way, naming the lock file;
remove it and retry. A writer that finds either lock held
waits for it, but not forever: after about a second it prints `Waiting up to 60
seconds for another bea write on PATH ...` on stderr (JSON mode stays silent, so
stderr remains one object), and after 60 seconds it gives up with exit **4**,
having written nothing. `BEA_LOCK_TIMEOUT` sets a different number of seconds;
`0` refuses at once instead of waiting. Stop any older CLI writers before
deleting their leftover
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
bea add close --date 2026-12-31 --account Assets:OldAccount   # refused while it still holds a balance; --force closes anyway
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

`add transaction` defaults to today's date. Its positional argument is the
narration, so without `--date` a narration that is a date (`2026-01-05`,
`01/05/2026`) is refused (exit 2) rather than written today, and one that is
an account or an amount is written with a warning that postings go in `-p`.
One posting may omit its amount;
Beancount infers the balancing amount. When a numbered posting omits its
currency, the CLI uses the account's sole allowed currency, otherwise the
ledger's sole operating currency. Ambiguous currencies require an explicit
symbol, and so does a posting with a cost or a price when that default would be
the rate's own currency: `3 {80 USD}` is refused (exit 2) rather than written as
`3 USD {80 USD}`. Other directive types keep their explicit dates. Only `add transaction`
defaults the date to today; the other types require it. The transaction flag
defaults to `*`; `!` marks an entry for review.

Tags, links, flags and commodities are written as bare tokens, so each value
must be exactly one. A tag or link takes an optional leading `#` or `^`, then
letters, digits and `- _ / .`; a flag is one of `* ! & # ? %`, a capital
letter, or `txn`; a commodity is Beancount's commodity name, such as `USD`,
`NT.TO` or `/6J`. Repeat the option for several values. A space, a second
sigil (`--tag 'a ^b'`), a comma (`-c EUR,GBP`) or a line break is refused with
exit **2** naming the option, and the file is unchanged; `add transactions`
rejects such a row the same way it rejects any other invalid row. `list`
filters follow the same grammar: a `--tag`, `--link`, `--flag` or `-c` value
that cannot be one token exits **2** rather than answering an empty list
(`-c` still matches regardless of case). As a last
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
quoting the path as written. Documents Beancount finds through an
`option "documents"` folder outside that directory are reported once, at the
option's line, however many files the folder holds.

Use repeated `--meta` options for native Beancount transaction metadata:

```bash
bea add transaction -p 'Expenses:Groceries 30 USD' -p 'Assets:Checking' \
  --meta 'receipt:R-42' --meta 'reviewed:TRUE' \
  --meta 'rate: 1.125' --meta 'received: 2026-09-01'
```

Each argument contains one `key:value` pair. Bare text such as `note:hello`
or `receipt:IMG_1234.jpg` becomes a string. Valid native numbers, booleans,
dates and amounts retain their types, including when single-add JSON is reused
for bulk entry. A type is kept only when the whole value is one plain literal:
a decimal such as `3`, `-5` or `1.25`, `NUMBER CURRENCY` such as `5 USD`, a
date, or `TRUE`/`FALSE`. Anything Beancount would have to compute, normalize
or cut short is the text typed — an invoice number `2024-001`, a zip code
`02134`, a phone number `555-1234`, `1/3`, `1,000`, `5USD`, or a memo with a
`;` in it — so a reference number is never stored as arithmetic. Inner quotes
force a string, e.g. `--meta 'code:"1234"'`;
`--meta 'note:""'` writes an empty string. The quoted text is stored as typed:
only `\"` and `\\` are escapes, for a quote and a backslash, so a quoted
Windows path or regular expression keeps every other backslash. Repeat `--meta` for different keys;
keys must be distinct and cannot use the reserved source fields `filename` or
`lineno`. A date-shaped value in any spelling Beancount reads (`2026-02-30`,
`2026/02/30`, `2026-2-30`) that is not a real calendar day is refused rather
than stored as text.

A `--posting` (or a bulk row's `amount`) has no such escape: Beancount ends a
posting at a `;` and drops the rest, which would silently lose a note, a cost,
a price or the amount itself. A `;` outside a quoted cost label is refused —
exit 2 naming the `--posting`, or the row in bulk — and nothing is written;
put the note in `--meta` instead.

`add commodity` takes the same `--meta`, which is how a symbol becomes more than
a date and a ticker — `--meta 'name:Vanguard 500 Index' --meta
'asset-class:equity'`. The keys are written indented under the directive and come
back in the add envelope in the same tagged form as transaction metadata, so a
response can be sent again unchanged.

`add price` skips an exact date/commodity/amount match anywhere in the root
ledger's includes. It reports the existing location and exits **0** with
`written: 0` and `duplicate: true` in JSON. A different amount for the same
date and commodity is refused with conflict exit **4**, naming both values;
pass `--force` to record a
corrected quote. So is a same-day quote that disagrees with one written in the
other direction (`EUR 1.20 USD` beside `USD 0.80 EUR`, which says 1.25); with
both on record, every read settles each day from the quotes up to that day, as `bea query` does, whatever their line order: the pair is valued by the inverse of the direction quoted less often, and a tie is broken in favor of the quote from the alphabetically later currency. Two quotes agree when the inverse of one rounds to the other at the typed precision (`0.3333` beside `3`). A quote that loses its day to a price a plugin implied is still written, with a warning naming the implied price, since no read will use it. Only written price directives count: a price a plugin such as
`implicit_prices` generates is neither a duplicate nor a conflict. `add balance` is idempotent the same way: re-running an
identical assertion reports the existing location and writes nothing, including
with `--pad-from` (no new pad is written). A different value for the same date,
account, and currency is a conflict (exit **4**) and needs `--force`
(ledger validation still applies, so a conflicting value cannot land). Without
an explicit `~` tolerance the number's precision sets the tolerance, so
`10.30 USD` is a different, stricter assertion than `10.3 USD`.
Repeated `--amount` is refused on both commands — a price and an assertion
each hold one amount.

Aliases: `price` and `commodity` accept `--commodity`; `document` accepts
`--path`; `note` accepts `--message`. Existing option names remain supported.
An alias is the same option, and every `add` option that holds one value
refuses two different ones — `-a Assets:One -a Assets:Two`, or `add price
--commodity HOOL --currency USD` (the quote currency belongs in `--amount`) —
with exit **2** naming both and nothing written, instead of keeping the last.
Repeating the same value is accepted; `--posting`, `--tag`, `--link`,
`--meta`, `--value` and `add open --currency` still repeat. `import` and `init` follow
the same rule: a second, different `--account`, `--csv`, `--rules` or
`init -c` is refused before anything is written or remembered. So do the read
commands — `list`, `report`, `balance` and `query`: `list transaction -a Food
-a Rent` exits **2** naming both rather than listing Rent alone (`list`'s
account filter is one case-insensitive substring, so run it once per account;
`report -a 'Food|Rent'` takes a regular expression that matches either), while
`--search`, `--tag` and `--link` still repeat.

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
too long to convert is a usage error (exit **2**) naming the problem. A string
holding half a surrogate pair — a lone `\ud83d` escape, usually an emoji cut in
two — rejects its own row, naming the field, like any other invalid row.

Every row is validated before anything is written. If any row is invalid the ledger is left byte-identical and the command exits **1**, listing the rejected rows. `--partial` appends the valid rows instead — and still exits **1**, so a partial write can never look like a clean one.

A posting can also use `{"account":"Assets:Cash","amount":"-45 USD"}`.
Omit `units`/`amount` for a balancing posting; it carries no `cost`, so a
`cost` without `units`/`amount` rejects its row. Supplying both forms or unknown
fields — at the transaction or posting level, or inside `units`, `cost`,
`price` and `price_total` — is rejected, and so is an `amount` whose text
carries a cost beside an explicit `cost`, or a price beside an explicit
`price` or `price_total`. A cost in one place and a price in the other combine:
`"amount": "1 HOOL {100 USD}"` with `"price"`, or `"amount": "1 HOOL @@ 110 USD"`
with `"cost"`, writes both annotations.
Schema errors show a human row number, field path,
and example; `bea add transactions --help` contains a complete minimal batch.
An account name Beancount cannot read (`expenses:food`, `Expenses:Food Court`)
rejects its row as `Row N, postings.<i>.account`, and any other row whose text
would not read back as one transaction — a keyword such as `TRUE` for a
currency, a total cost with no currency — is rejected as `Row N` with
Beancount's reason, so `--partial` still writes the others.

Validation includes accounting errors, not just JSON shape. The whole batch is
tried first so a sale can use a purchase appearing later in the input. Beancount
books one date's entries in file order, so within a date a row selling a
commodity at cost that another row buys at cost into the same account that day
is written after that day's other rows — a broker export listing a same-day
sale first still books it against the purchase; rows otherwise keep their input
order. Partial
recovery tries rows in input order and validates each accepted subset. Rows
the failure names are dropped first; what remains is scanned forward, keeping
every leading run that loads and refusing the row that breaks it, judging the
rest in order once bisection would cost more than row-by-row trials. The kept
rows always load together, and which rows are kept is deterministic for a given
row order — but around a balance assertion a kept row can fail on its own when
a later kept row offsets it, so reorder the rows when a surprising row is
refused. When the ledger already fails on its own, `--partial` reports that
failure once instead of judging rows. When some rows are written, the JSON error includes `result.written`, `written_rows`,
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

Per-unit and total prices (`@`, `@@`) and total costs (`{{...}}`) are supported;
a total cost needs units to divide among, so zero units at one is refused
(exit **2** for `--posting`, `Row N, postings.<i>` in bulk input), as is a
`--posting` that elides its units beside a zero cost or price.
A `@@` total is written back with `@@` and its exact total, never divided
into a repeating unit price. A cost is written whole: a total cost keeps its
total (`{0 # 250.00 USD}`, the same lot as `{{250.00 USD}}`), a currency-only
or date-only lot selector keeps its constraint (`{EUR}`, `{2026-03-01}`)
instead of relaxing to `{}`, and the JSON answer reports the same constraint —
`number`, `number_total`, `currency`, `date` and `label`, with `null` for the
parts you left open — so it can be fed straight back to
`bea add transactions`. In bulk input a `cost` with a `number_total` and a `null`
`number` is that total cost, and `units` with a `null` `number` leaves the
number for booking to interpolate, as the `--posting` spelling does
(`HOOL {100 USD}`); only one posting per row may leave its number open, and
the `amount` shorthand cannot spell one — use structured `units`. JSON
remains useful for batches and metadata.
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
{10 USD}"`, with optional date, label, and `@`/`@@` price, and the partial
selectors `{USD}`, `{2026-01-02}`, `{"label"}` and `{}` for a sale. The shorthand
cannot spell a total cost (`{{...}}`); use `units` with a structured `cost`
carrying `number_total` instead. A plain two-token amount reads the same
numbers as the flag too: comma grouping (`"1,234.56 USD"`) and arithmetic
(`"84/2 EUR"`) are written as `1234.56 USD` and `42 EUR`.

Round-trip guarantee: the `units`, `cost`, `price`, and `price_total` shapes
in `add transaction --json` output are valid `add transactions` input, so a
returned posting pipes back into `--from -` unedited. A `@@` total is
answered as `price_total` with `price` null, never as its divided unit price.
Transaction and posting `meta` preserve text and booleans; numeric, date and
amount metadata use tagged objects: `{"kind":"number","value":"1.125"}`,
`{"kind":"date","value":"2026-08-03"}`, or
`{"kind":"amount","number":"5.25","currency":"USD"}`. A JSON float in a
tagged `value` or `number` rejects the row, because the float cannot hold the
decimal exactly; send a decimal string. An untagged float (`"rate": 0.3`) is
refused the same way, naming the tagged number to send, while an untagged JSON
integer is exact and is written as is. An array, an untagged object, a tagged
object with other keys, the reserved keys `filename`/`lineno`, or a key that
does not match `[a-z][A-Za-z0-9_-]+` (`Category`, `a.b`, `__x`) likewise
reject their row, reported as `Row N, meta.<key>` (or
`postings.<i>.meta.<key>`), so `--partial` still writes the others. A row
`date`, a cost `date` and a tagged date `value` must be `YYYY-MM-DD` strings,
like every `--date` flag; Unix timestamps, `20260201`, week dates
(`2026-W05-7`) and times are refused. JSON listing includes
`source.filename`/`source.lineno` separately; those locations are never written
back as transaction metadata.

## Updating directives

An import parks rows it cannot categorize on `Expenses:Uncategorized` with
flag `!`. List that review queue and recategorize each row with `bea update
transaction`, and the queue drains without a hand edit:

```bash
bea add transaction "Mystery" --date 2026-08-02 --flag '!' --posting "Expenses:Uncategorized 5" --posting "Assets:Checking" --meta 'import-id:demo-1'
bea list transaction --flag '!' --details
bea update transaction --id demo-1 --account Expenses:Dining --flag '*'
bea update transaction --id demo-1 --account Expenses:Dining --flag '*' --apply
bea list transaction --flag '!'
```

`--id` takes the row's import-id, a `ref` metadata value, or `file:line`; an
id shared by two rows is refused rather than guessed at. A bare `--account`
retargets the queue's leg, while `OLD=NEW` names another leg. `--flag`,
`--tag`, and `--narration` retouch the header. Every form previews a diff and
writes only with `--apply`, and only the entry's own lines change.

A longer queue goes through one mapping file, previewed and then applied in a
single write per file; a rejected row never aborts the valid ones:

```bash
bea add transaction "First" --date 2026-08-02 --flag '!' --posting "Expenses:Uncategorized 5" --posting "Assets:Checking" --meta 'import-id:demo-1'
bea add transaction "Second" --date 2026-08-03 --flag '!' --posting "Expenses:Uncategorized 7" --posting "Assets:Checking" --meta 'import-id:demo-2'
cat > queue.csv <<'EOF'
id,account,flag
demo-1,Expenses:Dining,*
demo-2,Expenses:Groceries,*
EOF
bea update transactions --from queue.csv
bea update transactions --from queue.csv --apply
bea list transaction --flag '!'
```

JSON rows use the single-row fields; pass `--from -` to read either form from
stdin. Any rejection exits **1** with per-row results, as `bea add
transactions --partial` reports.

## Reports

Human tables round each currency to the finest precision the ledger itself
uses for it, so a whole-dollar ledger prints `10 USD` rather than `10.00`.
That precision comes from posting amounts and balance assertions (or
`option "display_precision"`), not from price quotes or cost numbers, so a
`price AAPL 191.559998 USD` does not make a cents ledger print six decimals.
An amount Beancount inferred for an omitted leg — units times a cost or a price
— counts only for a currency the ledger never writes with decimals itself, so
an omitted cash leg on a `{191.559998 USD}` purchase leaves a cents ledger in
cents, while an inferred `31.5 USD` in a whole-dollar ledger is not rounded away.
Its precision is bounded by the transaction's written numbers: division noise
from a total price such as `3 HOOL @@ 1000 JPY` does not add decimal places.
A currency no posting names — usually a `--conversion` target — has no
precision to infer and renders with two decimals; `--json` keeps the exact
value either way.

Report interval breakdowns cover the complete requested period, including more
than 100 daily or monthly intervals. The interval selects the aggregation
grain, not a limit on the returned history.

No series point is dated after the report's as-of date. Without `--time` the
last bucket ends on the as-of date — a ledger whose last entry is `2026-02-10`
closes its `-i yearly` series on `2026-02-10`, not `2026-12-31` — and earlier
buckets end on their interval boundary.

When `--time` starts or ends partway through an interval, the first or last
bucket is a fragment of it — `-t 2020-03 -i weekly` starts on Sunday
`2020-03-01`, the last day of an ISO week, and ends on the Monday–Tuesday tail
of one that runs into April. Flow series (income statement periods, the
overview's income and expense series) drop such a fragment when no
transaction in it posts to an income or expense account (within `--account`),
so a clipped boundary does not read as one more quiet week. A fragment with
such a transaction stays, a plugin's included (a transaction on `2020-12-31`),
and so does the only bucket of a short filter. A balance assertion, a price or
an open on the boundary day does not keep an empty row. Balance series (net worth, assets, liabilities, equity) keep
every bucket, because their value is real whether or not the fragment saw
activity and the series must still reach the as-of date.

```bash
bea report overview
bea report income-statement
bea report balance-sheet
bea report trial-balance
bea report holdings
bea report register Assets:Checking
bea report capital-gains
bea balance Checking
```

`bea balance [ACCOUNT…]` prunes the trial balance to the subtrees whose
account names contain any argument (case-insensitive, and insensitive to
Unicode normalization), keeping ancestors for structure. Accounts closed by the `--time` end date that
hold no balance are excluded from filtered views; a closed account still holding
money stays, so totals agree with the trial balance. With no argument it prints the trial balance; `--conversion`, `--time`, and `--allow-errors`
work as in reports. Under `--json` the terms are listed one by one in
`account_filters` (`["food", "cash"]` for `balance food cash`, `["food cash"]`
for `balance "food cash"`) beside the space-joined `account_filter`, and with
several terms the text heading quotes each one (`'food' or 'cash'`).

All seven accept `--time / -t` and `--allow-errors`. All but
`capital-gains` also accept `--conversion / -x`: conversion defaults to the
ledger's single operating currency, and with zero or multiple operating
currencies it defaults to `units` and keeps currencies separate.
`capital-gains` takes no conversion — gains stay in each lot's cost currency
so the rows tie to the booked gain postings. All but `trial-balance`,
`holdings`, `register`, and `capital-gains` accept `--interval / -i`
(`monthly`, `quarterly`, `yearly`, `weekly`, `daily`; default `monthly`).

`holdings` lists every non-cash position with units, average cost, cost
basis, and market value, grouped by account or — with `--group-by commodity`
— by commodity across accounts; `--account / -a` narrows the positions.
`register` takes the account as a positional argument instead of `--account`
and lists one subtree's dated postings oldest first with the running balance,
so its last row is the trial-balance total. A market value from a stale
managed quote reads `1,700 USD (stale)`; under `--json` each group names the
source behind its quotes in `price_source` / `conversion_source`.
`capital-gains` lists one row per closed lot — acquired and sold dates,
quantity, proceeds, basis, and gain — with `--from-date / --to-date`
bounding the sales (both ends inclusive). Rows bucket into held one year or
less vs more than one year, a bare day count with no tax rules attached;
splits and transfers carry no price and stay out.

```bash
bea report income-statement --time 2026 --interval quarterly
bea report balance-sheet --conversion EUR
bea report holdings --group-by commodity --time 2026
bea report register Assets:Checking --time 2026-01
bea report capital-gains --from-date 2026-01-01 --to-date 2026-12-31
```

Each report states its period, as-of date, account filter, and valuation.
Invalid intervals, dates, reversed ranges, and malformed account filters exit
**2**. `--account` takes a parent account (`Expenses:Food`) or a regular
expression (`'Expenses:(Food|Rent)'`). A value spelled as an account name,
or a bare root (`Income`, or the ledger's renamed root), matches that account
and its children only, counted from the start of the name. So `Expenses:Food`
does not pick up `Expenses:FoodTruck` or `Assets:Reimbursable:Expenses:Food`,
and `Income` leaves out `Expenses:Taxes:Income`. Anything else is a
case-insensitive regular expression search. It selects transactions involving
matching accounts, then reports only the postings to those accounts — totals,
trees, and the interval breakdown all describe the accounts you asked for, not
the counterparties they happened to face. As in `list`, an empty or
whitespace-only `--account`, `--time`, or `--conversion` — or a blank `bea
balance` argument — is refused (exit 2) naming the flag, or the position of
the empty `ACCOUNT` argument, rather than silently
falling back to the unfiltered default.

A fiscal period (`--time FY2026`, `FY2026-Q1`, `fiscal_year`, `fiscal_quarter`)
follows the ledger's `custom "fava-option" "fiscal-year-end" "MM-DD"`, and the
calendar year when none is declared. As in Fava, a month from 13 to 24 is a
year end in the following calendar year: `"15-31"` runs FY2026 from 2026-04-01
through 2027-03-31, where `"03-31"` ends it on 2026-03-31. If that option is
declared but is not a real month and day (`"06-31"`, `"6-30"`, `"00-31"`,
`"99-31"`), a fiscal period is refused (exit 1) naming the option, with or
without `--allow-errors`, rather than reporting another year under the fiscal
label. With several declarations the last one is in effect, as in Fava: an
invalid earlier line is passed over, and an invalid last one refuses fiscal
periods. So does a misspelled name such as `fiscal-year-ends` when no
`fiscal-year-end` is declared, naming its line. Fiscal quarters need a
fiscal year that starts on the first of a month: with a year end such as
`"04-05"`, `FY2027-Q2` and `fiscal_quarter` exit **2** naming the option and
its line, while `FY2027` still reports the whole year. Calendar periods are
unaffected. `fiscal-year-end` is the only Fava option bea reads: every other
`custom "fava-option"` value, and every `fava-extension`, is ignored, and
`bea check` does not validate them.

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
Unconverted `units` reports, and `at_cost` or `at_value` reports whose net
worth or adjustment still spans more than one commodity (foreign cash has no
cost), do not claim an equity reconciliation or invent a valuation adjustment
across unlike commodities. `equity_reconciled` states
whether the derived reconciliation is available. Reports run with loader
errors also carry `ledger_valid: false` and `ledger_errors` in JSON.
Every report lists `unrooted_accounts`: posted accounts outside the root
ledger's five account roots. They arise when an include sets its own
`option "name_assets"` and its siblings, which Beancount applies only while
parsing that file. No report section can hold them, so stderr names them;
`query` still lists their balances.

Reports convert what has a price and keep the rest in units. Each interval
row is valued at its own date, so a later quote cannot value an earlier
interval: earlier rows stay in the source commodity while later rows convert.
A missing price never fails a terminal report — stderr carries one summary
line per commodity, for example `VACHR has no USD price at any date; shown in
units` or `EUR → USD has no price before 2026-08-31; earlier rows shown in
EUR`. A holding valued through its cost currency (a USD-cost stock in a EUR
ledger) gets the dated wording from the first date both legs are quoted.
A cost currency routes only rows holding a lot at that cost: one sold
before the row, or bought after it, leaves the undated wording.
Under `--json`, with piped stdout, under `CI`, or with `--strict`, a
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
keep their number. The balance sheet's derived equity adjustment and equity
total are as-of figures and follow the headline: they are withheld
(`equity_reconciled: false`) only when a balance at the report's as-of date
still holds a commodity it could not value, never for a gap only in an earlier
row, so the interval chosen does not decide whether the sheet reconciles. Text
shows the source amounts and says the total is unavailable.
`--conversion units` shows quantities; `at_cost` shows acquisition costs and
`at_value` uses market values with Fava's cost fallback when no price exists.
Holdings without a cost basis (cash, `@`-priced lots) keep amounts already in
an operating currency, are valued into the first operating currency that has a
price, and otherwise stay in their units. Other values must be valid uppercase Beancount currency symbols. Misspellings
such as `at-cost`, `usd`, and `US D` exit **2** before loading the ledger, in
terminals and automation alike. Valid symbols need not already appear in the
ledger: an unpriced target such as `GBP` follows the partial-valuation policy
above. The same rule holds for the ledger's own `option "operating_currency"`
wherever a command falls back to it — a report or `balance` without
`--conversion`, a bare `add` amount, a CSV import with no currency column: a
value such as `"usd"` exits **2** naming the option line and suggesting `USD`.

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
an amount that rounds to zero prints unsigned (`-0.40 USD` at whole-dollar
precision reads `0 USD`). JSON keeps the full-precision decimal string
(`"4.9050"`, `"-0.40"`).

## Managed price includes

One line values a holding at market in every command — no quote provider to
configure and no recurring download chore:

```beancount
include "https://beancount.io/prices/BTC-USD"
```

`check`, `list`, `query`, `report`, `import`, and write validation all see
the same resolved prices. Resolving the include parses a temporary copy beside
each ledger file, so these reads need the ledger's directories to be writable;
in a read-only one they exit **3** naming the include and the directory. A
`bea price export` snapshot has no such need. The URL is a registered price request, not a
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
source, and `--into` naming the include's URL fails with exit 2 — and your
files are never rewritten to accommodate a feed.
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
A URL include the origin policy refuses (managed price includes disabled, an
origin not in `MANAGED_PRICE_ORIGINS`) is no source and is never fetched;
`price status` lists it under `Refused URL includes` with its reason (JSON:
`refused`, one `{url, reason}` each) beside the load error that names its line.
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
is unavailable. A ledger may load at most 16 distinct managed sources: a 17th
is not fetched and is reported as unavailable — the load error names its
include, file and line and the limit, and `price status` lists it. `status`
and `refresh` take no arguments; anything else after `bea price` still
forwards to `bean-price`, so name a quotes job file `status` by path
(`./status`) if you ever have one.

`price export` snapshots a self-contained copy for stock tools: each feed
lands at `prices/<ALIAS>.beancount` as a `custom "bea-managed-source"`
marker directive plus the exact effective text the load parsed, and every
include is rewritten relative. Each copy keeps its source's permission bits
whatever the umask — a `0600` ledger, include or receipt stays `0600`, a feed
file takes the root ledger's — and directories the export creates are `0700`.
An existing output directory must be readable and searchable as well as
writable; a refused permission exits 3 naming the directory.
When the ledger includes a file of its own
named `prices`, the feeds go in `prices-managed/` instead. A feed never
replaces a file the ledger already keeps under that name: it lands at
`<ALIAS>-managed.beancount` instead, and names that differ only by letter case
count as the same name, since they are one file on a case-insensitive volume.
`document` attachments under the root's
directory are copied to the same relative place, under the name the
directive uses — a path through a symlinked file or folder becomes a plain
copy at that path; one outside that tree (including a symlink pointing out of
it), or named by an absolute path, refuses the export before anything is written.
So does a `document` whose file is missing, naming the directive's file and
line, with or without `--allow-errors`.
With `option "insert_pythonpath"` (in the root or any included file), a plugin
module or package that sits beside a ledger file setting it is copied to the
same relative place too, with any module or package under those directories
that the plugin imports, so the snapshot's `plugin` lines still resolve. A
package travels whole — its data files, such as a `settings.json` read through
`importlib.resources`, as well as its modules — leaving only bytecode caches
behind; a package entry that cannot be copied as a plain file (a linked
directory, a named pipe, a file this user cannot read) refuses the export
naming it. A plugin installed elsewhere is not copied, while a module or
package file outside the ledger tree refuses the export naming it. An
unavailable source refuses the export unless `--allow-errors` carries its
marker alone, and a URL include the load refused (an origin that is not
allowlisted) refuses it unless `--allow-errors` writes it as a
`; refused URL include:` comment. The destination follows
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
the directive as it will be appended, aligned as `bea format` leaves it (a
model's tab indentation shows as the spaces that are written). Its heading
says how many directives it approves (`these 60 directives`), and so does the
**Yes** option. A destination the write creates is marked `(new file, created
by this write)`, with the `option "name_*"` lines it starts with shown above the
directives, since they are written too. Text still
carrying a control character in a string is escaped to a visible `\xNN`, and an
invisible format character (a zero-width space, a soft hyphen, a BOM) to
`\uNNNN`, so what is on screen is what will be written. An account the text
opens or posts to that carries a format character is refused before any panel,
unless the ledger already opens that exact name, so an approval can never
create a lookalike of an existing account. The panel starts on **No**, so Enter alone
declines. Arrows, `j`/`k`, the option numbers `1`–`4` and the letters `y`, `n`,
`a` (yes to all) and `d` (deny all) move the selection, Enter confirms it, and
Ctrl-C declines. When one model reply proposes several writes, their panels
come one at a time, each previewed after the write before it, so each answer
applies to the directive on its panel. Raw directive text carrying a control
character is refused rather than rewritten, so no AI-proposed write can leave one
in a ledger file. Use `ask --into FILE` for an included destination. The write
tool accepts dated directives; configure plugins, options and includes
separately. Noninteractive
sessions do not write ledger entries: a proposed write is skipped before it is
validated, so the model is told the same thing whatever the text names and
learns nothing about local files from it. In an interactive session an
AI-proposed `document` must name a file inside the ledger's folder; one outside
it is refused before anything checks whether it exists. The interactive session draws its prompt
and approval panel on the terminal, so with stdout redirected it exits **2**
instead; save one answer with `bea ask QUESTION --print > FILE` — the saved
text keeps every character, never wrapped or cut. AI write permission is separate from
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
model's default allowance. An answer that reaches it is printed with a notice
that it was cut off, and `--print` then exits **1**: ask a narrower question.
An answer the provider's content filter stops partway prints its partial text
with a notice naming the filter instead, and `--print` exits **1** the same
way: rephrase the question and retry.

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
skills with the same name. Every run names the project skills it loaded, and
any user skill one replaces, on stderr: their descriptions are sent to the
model on every turn, so run `ask` only in a directory you trust. A description
is cut to 1,024 characters and the whole skill index to 32 KiB, with a note. Each file needs YAML frontmatter with a nonempty
`name` and `description`, followed by Markdown instructions; invalid files are
skipped. Names and descriptions are supplied up front and full instructions
load on demand. Interactive prompt history is saved in `ask_history` in the
configuration directory, owner-only (`0600` in a `0700` directory, like
`credentials.json`); set `BEA_NO_ASK_HISTORY=1` to keep it in memory only.

## Cloud: authentication

Hosted commands need a session. `bea cloud login` prints a one-time code and opens the dashboard's device page; enter the code there, check that the device shown is this machine, and approve. The link itself carries no secret, so a device page opened from anywhere else cannot authorize this CLI. The credential is stored as `credentials.json` in the configuration directory — `$BEA_CONFIG_DIR` when set, else `$XDG_CONFIG_HOME/bea`, else `~/.config/bea` (mode 0600, in a 0700 directory).

```bash norun
# Needs a browser and hosted credentials.
bea cloud login
bea cloud status
bea cloud logout
```

`bea cloud status` reports the credential source (`file` or `environment`),
its expiry, and the account it belongs to. For CI, set `BEA_TOKEN` instead of
logging in — it is never written to disk, and `cloud status` reports
`source: environment`.

`cloud logout` revokes the stored session and deletes the credential file
after an attempted revocation, including when that attempt fails. An invalid
endpoint is refused before any revocation attempt, keeping the credential. Failed attempts
say the session may still be valid and can be revoked from the dashboard.
Connection failures (including connection timeouts and failed proxy tunnel setup)
and ordinary server errors exit **1**. Other timeouts, connections lost after sending,
unreadable successful replies, and gateway HTTP **504, 520, 522, or 524** exit
**4** because the revocation outcome is unknown. Server request IDs are kept
in both JSON and human errors. A **401** answer means the session was already
revoked, so it exits **0**.

A credential file that exists but cannot be used — unreadable, not JSON, or
missing its `token` or `expireAt` — is never read as "not logged in": cloud
commands exit **3** naming the file and the reason, and `cloud logout` deletes
it and exits **1**, since a token it cannot read cannot be revoked.

When `BEA_TOKEN` is set, `cloud login` exits **2** before starting the browser
flow, since the new session would never be used, and `cloud logout` changes
nothing: it neither revokes the token (another job may share it) nor unsets it
in the shell — unset the variable yourself, or revoke the token from the
dashboard. This no-op also applies to malformed nonempty values: logout does
not validate or send the token, or read the stored credential. Commands that
use a malformed `BEA_TOKEN` exit **3** and tell you to fix or unset that variable.
An empty `BEA_TOKEN=` is treated as unset and falls back to the stored file.
A credential the server rejects is reported against the source
actually in use: `BEA_TOKEN` takes precedence over the stored file
unconditionally, so that failure tells you to correct or unset the variable
rather than to log in, which would not change which credential is sent.

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

Cloning uses `git clone` over SSH, so it needs Git and working SSH access. It uses the SSH command git would (`GIT_SSH_COMMAND`, `core.sshCommand`, then `GIT_SSH`); unattended (`--json`, `--no-input`, no terminal) it only adds `-o BatchMode=yes` to that command and closes git's stdin, so a host-key or password prompt fails instead of hanging. A clone target git would refuse (`./<name>` or `--dir` naming a file or a non-empty directory) is refused with exit **2** before the ledger is created. If a clone fails after the ledger was created, the command exits nonzero and prints the manual `git clone` command, target included — the ledger exists either way.

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

Uninstalling the executable leaves ledgers and user state in place. The
downloaded Beancount engine (tens of megabytes under
`$XDG_DATA_HOME/bea/engine/<version>`, or `$BEA_ENGINE_DIR` when set) stays
too; delete that directory to reclaim it. Any Python `uv` downloaded for the
install lives in `uv`'s own cache outside `bea`'s directories.

If the manager itself fails, the command exits **1** and says so; nothing about
the installation is changed. `--check` reports and runs nothing; when the
index cannot be reached it exits **1** naming the host and the reason, still
listing the installed version and the command `bea upgrade` would run, and
caches nothing.

### The update notice

In a terminal, `bea` asks its installation channel at most once a day whether a newer release
exists, and prints one line on stderr after the command's own output:

```
bea 1.3.0 is available (you have 1.2.3) — run 'bea upgrade' to update.
```

It never runs at all under `--json`, `--no-input`, `--offline`, `CI`, or
`BEA_NO_UPDATE_NOTIFIER=1`, without a terminal on stderr, or from a checkout or
unrecognized install — those are the installs whose `bea upgrade` runs nothing,
so they stay silent in `--version` too. `bea upgrade --check` still asks, since
that check is the explicit request. Every outcome — including a failure — is
cached for 24 hours in `~/.config/bea/update-check.json` (or
`update-check-homebrew.json` for Homebrew), so an offline machine waits at most
once a day and prints nothing. The check gets 3 seconds in all, however slowly
an index or proxy trickles its answer, and `bea upgrade --check` reports a
check that ran out of time as a failure. When that directory cannot be written (left
root-owned by `sudo bea`, a read-only home), the outcome goes to
`~/.cache/bea/` instead, and with neither writable the check is skipped rather
than repeated by every command. `bea --version` adds the same line from that
cache only, and makes no network call.
Homebrew checks the published tap formula; PyPI-only releases are never
advertised to a Homebrew installation before the tap can install them.

## JSON output

Global `--json` provides structured results for `check`, local-file `query`, `list <type>`, `balance`, `report`, `price status`, `engine status`, and hosted reads such as `cloud status`, `cloud ledger list`, and `cloud ledger show`. `init`, `import`, `format`, `add`, `price refresh`, `price export`, `engine enable`, `cloud ledger create`, and `cloud ledger delete` also emit an envelope so a script can confirm what was written (create returns the new ledger's metadata with the same fields as `cloud ledger show`, delete the deleted ledger's id). Usage failures, including unknown commands and missing global option values, follow the same JSON error contract.

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
| `{"file": "<absolute path>", "into": "<absolute path>"}` | A write into the ledger: `add` and `import` (preview and apply) name the file appended to — the root itself unless `--into` names an include — and `price export` the directory written |
| `{"files": ["<absolute path>", "…"]}` | Formatting multiple named files or a root's include closure; paths are sorted and deduplicated |
| `{"directory": "<absolute path>"}` | Formatting a directory |
| `{"stdin": "-"}` | Formatting stdin to an explicit output file |
| `{"server": "<api url>"}` | Hosted commands |
| `null` | `bea --json --version`, which reads no ledger and calls no server |

Bounded lists also carry `limit`, and paged hosted lists (`cloud ledger list`) also carry the `page` that was served. Amounts use decimal **strings** — never floats — and dates are ISO `YYYY-MM-DD`.

These run in the `books/` directory the [README quick start](../README.md#quick-start)
builds: a 1000 USD opening balance in `Assets:Checking` and its 12.50 USD coffee
in `Expenses:Dining`. Transaction listings are newest first, and `net_profit` is
positive for a gain (`data.net_profit_signs` says `positive_for_gain`), so a
period of spending only is negative:

```bash
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
`example`, `treeify`, `ingest`, `query --source`, and `price` when it forwards to
`bean-price` reject JSON mode (`price status`, `refresh` and `export` answer
with the envelope), `cloud login` requires interaction,
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
| `BEA_CONFIG_DIR` | `$XDG_CONFIG_HOME/bea`, else `~/.config/bea` | Per-user state: credentials, `ask` history, user skills. The query shell's history and init file stay at Beanquery's `~/.config/beanquery/` |
| `XDG_DATA_HOME` | `~/.local/share` | Root for the managed PyPI engine under `…/bea/engine/<version>` |
| `XDG_CACHE_HOME` | `~/.cache` | Root for ledger write locks under `…/bea/locks`, managed price feeds under `…/bea/managed-prices` and Beancount's load cache under `…/bea/load-cache` |
| `BEA_LOCK_TIMEOUT` | `60` | Seconds a write waits for another `bea` write on the same file before exiting 4; `0` does not wait, and anything but a number zero or greater is a usage error (exit 2) |
| `BEA_API_URL` | `https://api.v3.beancount.io` | API base URL; empty means the default, and a value that is not an `http(s)://` URL with a host is a usage error (exit 2) |
| `BEA_DASHBOARD_URL` | `https://beancount.io` | Dashboard URL, used by the device login flow; validated like `BEA_API_URL` |
| `BEA_NO_UPDATE_NOTIFIER` | — | Truthy disables the update notice entirely |
| `BEA_NO_ASK_HISTORY` | — | Truthy keeps `bea ask`'s prompt history in memory; no `ask_history` file is written |
| `CI` | — | Truthy implies `--no-input`, and disables the update notice |
| `MANAGED_PRICE_ORIGINS` | `https://beancount.io` | Comma-separated origin allowlist for managed price includes; empty disables them. Each entry compares as its origin (`https://Beancount.io:443/` is `https://beancount.io`); one that is not an http(s) URL is ignored, and when every entry is, the refusal names them instead of saying includes are disabled |
| `MANAGED_PRICE_OFFLINE` | — | Truthy resolves managed includes from the cache only, like `--offline` |
| `MANAGED_PRICE_STRICT` | — | Truthy fails loads on stale or unavailable sources, like `--strict-prices` |

`BEA_API_URL` and `BEA_DASHBOARD_URL` also validate Unicode and punycode
hostnames. An invalid endpoint exits **2** before any request; `cloud logout`
keeps the stored credential when endpoint validation fails.

Hosted commands and `ask` also use HTTP(S) proxies from `HTTP_PROXY`,
`HTTPS_PROXY`, and `ALL_PROXY` (including lowercase and mixed-case spellings).
Unsupported schemes, malformed proxy URLs, and SOCKS proxies without the
client's optional SOCKS support are refused with usage exit **2**. The refusal
names the variables, omits their URL values, and shows how to clear every
unusable setting for one invocation. Use a valid HTTP(S) proxy instead.
`NO_PROXY=*` bypasses these proxy settings.

A relative `XDG_CONFIG_HOME`, `XDG_DATA_HOME`, or `XDG_CACHE_HOME` is ignored,
as the XDG Base Directory spec requires, and the default applies.
`BEA_CONFIG_DIR` names bea's own state directory, so a relative value is a
usage error (exit 2) instead: it would keep separate credentials and importer
settings in every working directory. `BEA_ENGINE_DIR` is checked the same way:
a relative value, or one that names an existing file, exits 2 naming the
variable rather than installing an engine there. `bea --help` and `bea --version` still
answer.

Homebrew sets `BEA_ENGINE_DIR` to the keg-local engine so installs never look
for a separately provisioned copy. bea builds an engine there only in a
directory that is missing, empty, or one it built before (it marks each with a
`.bea-engine` file); a directory holding anything else is refused by name and
left untouched, never replaced. Advanced overrides (`BEA_ENGINE_PYTHON`,
`BEA_UV`) exist for tests and recovery tooling; ordinary installs do not need
them. Both are checked before use: one that names a path which does not exist,
a directory or a file without the execute bit, a program that is not a Python
able to load the engine, or an environment missing the tool being run,
fails with a message naming the variable and telling you to correct or unset
it; a write refused this way exits 1, since nothing ran. `bea engine status` reports
which engine would serve.

Truthy values are `1`, `true`, `yes`, and `on`, ignoring case and surrounding
whitespace. The configuration directory holds `credentials.json` (mode 0600 on
POSIX), `ask_history`, user `skills/`, remembered importer paths and column
mappings under `importers/`, and channel-specific update-check caches.
Ledger plugins and importer configurations run their own Python code and
control any I/O they perform. What they print — including from a child process
or a raw write to descriptor 1 — never reaches bea's machine output: plugin
output goes to stderr and importer output to `importer_output`. Under `--json`
a successful command prints the plugin output on stderr after the envelope; a
failed one keeps stderr to its single error object and drops it.
