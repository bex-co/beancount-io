# `bea-engine` — the Beancount.io engine helper

`bea-engine` is an independently invocable command-line program that performs
the ledger operations which require Beancount. It is the Beancount side of the
[ADR014](../../../docs/adrs/ADR014-cli-beancount-parity.md) process boundary:
the helper and vendored Fava sources ship as internal resources in the single
`beancount-io` distribution. The frontend adds their resource directory to
`PYTHONPATH` only for a child process using the managed upstream environment.
It never imports the helper in its own process.

## Running it

Customers use `bea`. In a development checkout, the helper protocol can also
be exercised directly with `PYTHONPATH=src uv run python -m bea_engine`.
There is no separately installed `bea-engine` executable or helper distribution.
The documented argv and JSON interface below remains the subprocess contract.

## I/O contract

**Input** is argv plus the files it names. Ledger paths may be relative — the
helper resolves them, because Beancount's loader asserts on a relative entry
path and resolves every `include` against it. The helper reads and writes only
the paths it is given, inherits the caller's working directory, and never
prompts: there is no interactive mode and no terminal detection.

**stdout** carries exactly one JSON object per invocation and nothing else.
While a command body runs, descriptor 1 points at stderr, so a ledger plugin
or importer that prints cannot corrupt it:

```json
{"engine": "0.1.0", "command": "check", "ok": true, "data": {"valid": true, "errors": []}}
```

A failure uses the same envelope rather than a different stream, so a caller
reads and parses once without having to know the outcome first:

```json
{"engine": "0.1.0", "command": "check", "ok": false,
 "error": {"category": "validation", "message": "main.bean: 2 error(s).",
           "details": ["main.bean:3: Transaction does not balance: ..."], "exit_code": 1}}
```

`data` is per-command; `engine`, `command` and `ok` are always present, and
exactly one of `data` or `error` accompanies them.
Argument-parser refusals, including unknown commands, answer with
`command: "usage"`, a `usage` error, and exit 2 before any command body runs.
A writer that produces no envelope still has an unknown outcome, even at
exit 2: a plugin may have changed files before exiting with that status.

**stderr** is unstructured diagnostics — progress notes, loader warnings, and
whatever the engine's own dependencies print. It is never parsed and never
carries the result. A line opening with `bea-engine-notice: ` is one the
frontend shows while the command is still running — a writer queued behind
another write says so that way — instead of holding it for the end.

**Exit codes** repeat what the envelope says, so a shell caller needs no JSON
parser. They are the frontend's `cli.errors` codes, which lets `bea` pass a
category through instead of translating between two tables:

| code | `category`   | meaning                                        |
| ---- | ------------ | ---------------------------------------------- |
| 0    | —            | success; `ok` is true                          |
| 1    | `validation` | the ledger does not load, or a write is invalid |
| 2    | `usage`      | bad arguments, or a missing/unusable ledger    |
| 3    | `auth`       | the filesystem refused: a read-only ledger, an unwritable destination |
| 4    | `conflict`   | something else changed the ledger while the operation ran |

A failed write that had already applied part of its work adds `result` to the
error, holding the same fields the successful answer would have: a batch that
appended three of five rows says which three. It is the one thing a caller
cannot recover by rereading the ledger. An `import` whose importer raised uses
it for `importer_output` alone — what the importer printed before it failed.

Amounts are strings in JSON, never floats: every consumer of this envelope is
doing money arithmetic, and a float would silently round.

## Commands

| command                             | answers                                                    |
| ----------------------------------- | ---------------------------------------------------------- |
| `check --file PATH`                 | `{"valid": true, "errors": []}`; with `--documents-only`, a failed plugin answers `{"valid": false, "errors": [...], "plugin_failures": [...]}` |
| `query --file PATH --query BQL`     | the query's columns and rows                               |
| `list --file PATH --type TYPE`      | `{"items": [...], "truncated": false, "errors": []}`       |
| `add --file PATH --type TYPE --request JSON` | `{"written": 1, "directive": {...}, "warnings": [], "target": "..."}` |
| `append --file PATH --text TEXT`    | raw directive text: dry-run token or `{"written", "target"}` |
| `syntax PATH...`                    | `{"files": {path: [errors]}}`, per-file syntax errors       |
| `format PATH... [--in-place]`       | `{"changed": [path, ...]}` — locked, atomic in-place writes |
| `format --render PATH`             | `{"text": "..."}` — same formatting for a file or `-` for stdin |
| `shell --file PATH`                 | interactive query streams (see below)                     |
| `source-shell SOURCE`               | native Beanquery streams, with input-file protection      |
| `source-query SOURCE BQL`           | one native query's rendering; exit 2 on a usage error     |
| `report --file PATH --kind KIND`    | one financial report (trees, series, valuation metadata)   |
| `balance --file PATH [ACCOUNT...]`  | filtered balances or the trial balance                     |
| `init --file PATH --currency CCY --date DATE` | starter ledger creation                          |
| `import --file PATH --source PATH`  | CSV/Beangulp extract, dedup preview, optional append       |
| `update --file PATH --type TYPE --request JSON [--apply]` | rewrite one entry in place: a preview diff, or the write |
| `version`                           | `{"version": "0.1.0"}`                                     |

`shell` and `source-shell` are exceptions to the envelope contract: a terminal session
cannot be summarised in an envelope, so it streams and answers with its exit
status. `source-query` streams the same way, because native `--source` output
is upstream's rendering rather than bea's envelope; a missing stored query or a
dropped statement tail still exits 2.

### `list`

`--type` is one of `transaction`, `open`, `close`, `balance`, `pad`, `price`,
`commodity`, `note`, `event`, `document`, `custom`. `--limit` (default 50)
bounds the answer and `truncated` says it cut something off. `--from-date` and
`--to-date` bound the dates; `--account` is a case-insensitive substring on the
types that name an account and `--currency` an exact match on the ones that name
a currency. `--newest` takes the most recent rows of any type rather than the
earliest. Transactions additionally take `--flag`, repeatable `--search`,
`--tag` and `--link`, and `--details` to add a `rendered` array of Beancount
syntax.

Unlike `check`, a ledger that fails to load still answers: the load errors come
back in `errors` alongside whatever was readable. Whether a partial listing is
acceptable depends on who is asking, and only the caller knows that.

### `add`

`--type` is one of the `list` types, plus `transactions` for a batch. The
directive itself is `--request JSON`, or `--request -` to read that JSON from
stdin — which is what a batch needs, since a few thousand rows do not fit in an
argument list.

The request holds what a person typed rather than a pre-parsed directive,
because reading a posting, a balance tolerance or a typed metadata value is
Beancount's job:

| `--type`       | request fields                                                                             |
| -------------- | ------------------------------------------------------------------------------------------ |
| `transaction`  | `date`, `postings` (native syntax, e.g. `Assets:Stock 2 AAPL {100 USD}`), `flag`, `payee`, `narration`, `tags`, `links`, `meta` (`"key:value"` strings) |
| `transactions` | `rows` (an array of transaction objects), `partial`                                        |
| `open`         | `date`, `account`, `currencies`                                                            |
| `close`        | `date`, `account`                                                                          |
| `balance`      | `date`, `account`, `amount` (`"1538 ~ 1 EUR"`), and optionally `pad_from` + `pad_date`      |
| `pad`          | `date`, `account`, `source_account`                                                        |
| `note`         | `date`, `account`, `comment`                                                               |
| `event`        | `date`, `type`, `description`                                                              |
| `price`        | `date`, `currency`, `number`, `amount_currency`                                            |
| `commodity`    | `date`, `currency`                                                                         |
| `document`     | `date`, `account`, `filename`, `tags`, `links`                                             |
| `custom`       | `date`, `type`, `values` — each `{"kind": ...}` where kind is `text`, `number`, `amount`, `account`, `bool` or `date` |

Nothing is written unless the whole ledger still loads with the directive in it,
so a rejected write leaves every byte in place. `--allow-errors` accepts
semantic errors — a failing assertion, an unknown account — but never invalid
syntax and never an inactive pad account. `--into PATH` writes to an included
file, resolved relative to the root ledger.

### `update`

`--type` is `transaction` (one entry) or `transactions` (a batch of rows).
The request names its entry with `id`, in one of three forms:

- an `import-id` metadata value, which every bea import stamps;
- a `ref` metadata value, which bank importers use;
- `file:line`, the entry's header line, which names the entry outright.

An `import-id` always wins when a `ref` elsewhere spells the same value. A
value shared by two entries is refused as ambiguous (naming each `file:line`
so the caller can pick one), and an unknown value as not found; both are
`usage` failures and both change no bytes. Only entries written in a ledger
file resolve — a plugin-synthesized row has no source lines to rewrite.

The request changes the entry with `account`, `flag`, `tags`, or `narration`
(or `--request -` to read the JSON from stdin). A bare `account` retargets the
review queue's leg — the unique posting to the holding account (`<expenses
root>:Uncategorized`, normally `Expenses:Uncategorized`), or the only posting
when the entry holds one — and `OLD=NEW` names the leg outright. Only the
entry's own lines are rewritten: its header line for a flag, narration, or
tags, its posting lines for an account retarget. Indentation, amounts, and
alignment stay byte-identical, and no line is added or removed.

Without `--apply` the command previews: it answers `{"id", "target",
"lineno", "diff", "written": 0, "warnings"}` and writes nothing. `--apply`
validates the rewritten file as a whole — the write is refused when the ledger
would no longer load, like `add` — and installs it through the same locked,
atomic replace, answering `"written": 1`. An edit that lands while the write
runs is refused as `conflict`. A request that changes nothing answers
`"written": 0` with `"noop": true`.

Two answers are not a plain append. A `price` that the ledger already records
exactly answers `{"written": 0, "duplicate": true, "source": {...}}` and touches
nothing; `--strict-read` makes it refuse a ledger that does not load instead of
reporting the errors in `ledger_errors`. A `balance` with `pad_from` writes both
directives atomically and answers `{"written": 2, "directive": {...}, "pad": {...}}`:
the assertion and the inserted pad in the `list balance`/`list pad` model
shape. Every other `balance` answer carries `"pad": null`.
`pad_date_explicit` records whether the caller supplied the pad date, so a
refusal can distinguish changing `--pad-date` from moving a derived date with
the balance. It defaults to false when omitted.

```zsh
bea-engine add --file main.bean --type transaction --request '{
  "date": "2026-01-02", "narration": "Coffee",
  "postings": ["Expenses:Coffee 4 USD", "Assets:Checking"]}'
```

### `append`

Raw Beancount directive text — what `bea ask` writes after the model proposes
an entry. `--text` is the directive (or `-` for stdin). Configuration
directives (`option`, `plugin`, `include`, push/pop tag/meta) are refused;
everything else must parse as at least one dated entry and leave the whole
ledger loadable, same atomic rule as `add`.

`--dry-run` validates without writing and answers
`{"count": N, "target": "...", "warnings": [], "token": {path: digest, ...}, "text": "..."}`,
where `text` is the lines the commit will append, aligned as written.
A later call with the same `--text` and that `--token` commits, or answers
`conflict` if any file in the include graph changed — which is how the
frontend's write confirmation still detects an edit made while the user was
deciding.

```zsh
bea-engine append --file main.bean --text - --dry-run <<'EOF'
2026-01-02 * "Coffee"
  Expenses:Coffee 4.00 USD
  Assets:Checking
EOF
```

## Licensing

This distribution uses Beancount (GPL-2.0-only) and carries the vendored Fava
subset, so it ships and retains `NOTICE.fava` alongside this code. The frontend
keeps its MIT license and its optional Apache-licensed AI SDKs, which are
deliberately absent from the engine's dependencies.

## Managed price context

The frontend reads cloud credentials and passes `BEA_MANAGED_PRICE_TOKEN` or
a token-free `BEA_MANAGED_PRICE_AUTH_ERROR` state in the child environment.
The helper does not import frontend credentials or settings. The fetcher sends
the bearer only to exact HTTPS `beancount.io/prices/<ALIAS>` requests and
refuses redirects; custom allowlisted origins receive no bearer. Offline loads
do not fetch, and missing login never affects ledgers without managed includes.

`price-refresh` resolves every source with strict enforcement deferred to the
frontend, returning `sources`, `changed`, `errors`, and `strict_prices`. The
frontend returns a validation error with `result.sources` and `result.changed`
if any source fails, or a strict refresh remains stale. Offline refresh is a
usage error before any refresh-window mutation. Reports carry `price_sources`
from the same load through the internal `bea_managed_price_sources` option.
