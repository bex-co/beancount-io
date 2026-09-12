# `bea-engine` — the Beancount.io engine helper

`bea-engine` is an independently invocable command-line program that performs
the ledger operations which require Beancount. It is the Beancount side of the
[ADR014](../../../docs/adrs/ADR014-cli-beancount-parity.md) process boundary:
this package and the vendored Fava code ship in the `beancount-io-engine`
distribution (`cli/engine/`), and they are the only place allowed to import
`beancount`, `beanquery` or `fava`.

The `bea` frontend calls it as a child process and never imports it. Nothing in
this contract is private to `bea` — the commands take file paths and ordinary
arguments and answer with documented JSON, so a script or an agent can call it
directly.

## Running it

```zsh
bea-engine check --file main.bean       # installed in the engine environment
python -m bea_engine check --file main.bean   # no PATH or console script needed
```

The frontend uses the second form. `bea` resolves the engine interpreter,
provisions the environment on first use, and forwards the call; see
`cli/src/cli/engine/`.

## I/O contract

**Input** is argv plus the files it names. Ledger paths may be relative — the
helper resolves them, because Beancount's loader asserts on a relative entry
path and resolves every `include` against it. The helper reads and writes only
the paths it is given, inherits the caller's working directory, and never
prompts: there is no interactive mode and no terminal detection.

**stdout** carries exactly one JSON object per invocation and nothing else:

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

**stderr** is unstructured diagnostics — progress notes, loader warnings, and
whatever the engine's own dependencies print. It is never parsed and never
carries the result.

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
cannot recover by rereading the ledger.

Amounts are strings in JSON, never floats: every consumer of this envelope is
doing money arithmetic, and a float would silently round.

## Commands

| command                             | answers                                                    |
| ----------------------------------- | ---------------------------------------------------------- |
| `check --file PATH`                 | `{"valid": true, "errors": []}`                            |
| `query --file PATH --query BQL`     | the query's columns and rows                               |
| `list --file PATH --type TYPE`      | `{"items": [...], "truncated": false, "errors": []}`       |
| `add --file PATH --type TYPE --request JSON` | `{"written": 1, "directive": {...}, "warnings": [], "target": "..."}` |
| `append --file PATH --text TEXT`    | raw directive text: dry-run token or `{"written", "target"}` |
| `shell --file PATH`                 | nothing — the one streaming command (see below)            |
| `report --file PATH --kind KIND`    | one financial report (trees, series, valuation metadata)   |
| `balance --file PATH [ACCOUNT...]`  | filtered balances or the trial balance                     |
| `init --file PATH --currency CCY --date DATE` | starter ledger creation                          |
| `import --file PATH --source PATH`  | CSV/Beangulp extract, dedup preview, optional append       |
| `version`                           | `{"version": "0.1.0"}`                                     |

`shell` is the exception to everything above: an interactive terminal session
cannot be summarised in an envelope, so it streams and answers with its exit
status.

### `list`

`--type` is one of `transaction`, `open`, `close`, `balance`, `pad`, `price`,
`commodity`, `note`, `event`, `document`, `custom`. `--limit` (default 50)
bounds the answer and `truncated` says it cut something off. `--from-date` and
`--to-date` bound the dates; `--account` is a case-insensitive substring on the
types that name an account and `--currency` an exact match on the ones that name
a currency. Transactions additionally take `--flag`, repeatable `--search`,
`--tag` and `--link`, `--newest` to take the most recent rather than the
earliest, and `--details` to add a `rendered` array of Beancount syntax.

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

Two answers are not a plain append. A `price` that the ledger already records
exactly answers `{"written": 0, "duplicate": true, "source": {...}}` and touches
nothing; `--strict-read` makes it refuse a ledger that does not load instead of
reporting the errors in `ledger_errors`. A `balance` with `pad_from` writes both
directives atomically and answers `{"written": 2, "directives": [...]}`.

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
`{"count": N, "target": "...", "warnings": [], "token": {path: digest, ...}}`.
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
