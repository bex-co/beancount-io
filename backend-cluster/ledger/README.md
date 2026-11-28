# beancount-ledger-v2

Standalone TypeScript service that parses, validates, and queries Beancount
ledgers, built on the [`@rustledger/wasm`](https://www.npmjs.com/package/@rustledger/wasm)
engine (a Rust reimplementation of Beancount, 10-30x faster than the Python
parser).

## Why a separate service

`@rustledger/wasm` is GPL-3.0-only. Running it in-process inside another
service would make that service's Docker image a conveyance of GPL-licensed
code. Instead, the engine is contained in this standalone sidecar, which
other services talk to over plain HTTP/JSON. See `NOTICE` and
`src/foundation/rustledger/README.md` for the containment rationale and
`AGENTS.md` for the hard rules.

## Architecture

- `src/foundation/rustledger/` - the Beancount engine (WASM loader, parsers,
  report builders, plugins)
- `src/foundation/clients/` - Gitea file-map loading + caching
- `src/features/gitea/` - generated Gitea API client + auth
- `src/features/ledger/` - request-to-engine orchestration (reports, journal,
  entries, shell/BQL queries)
- `src/api/` - Koa route handlers, one file per endpoint family
- `src/server/` - auth, error handling, server bootstrap
- `src/shared/` - errors, logging, caching, locking, path-safety helpers

There is no database and no user table: auth is Basic/token credentials
forwarded verbatim to Gitea, which is the sole source of truth for identity
and repository access.

Internal JSON requests have a bounded body allowance of about **7.4 MiB**
(`JSON_BODY_LIMIT_BYTES` in `src/server/start-server.ts`). It covers the
largest body backend-v2 sends: a projected check of at most 5,000,000 decoded
bytes (`MAX_PROJECTED_BYTES`), as base64 inside JSON, with 1 MiB for the
envelope. The old 2 MiB allowance refused batches the gateway's own 2 MiB
request cap admits once their files were re-encoded (w23/074). It is a
transport limit, separate from the gateway's decoded-file policy. It does not
impose a decoded upload cap on generated or merged ledger contents. A body past
it, JSON or form, is refused with **413**, which backend-v2 reports as
`BAD_USER_INPUT` "split it into smaller batches", not as an outage.
URL-encoded forms retain the parser's default **56 KiB** limit, and multipart
routes keep their existing route-specific handling.

## Report coverage

Income-statement and overview flow series, account-report interval totals,
and `/interval-totals` cover the full selected period. They no longer keep only
the latest 100 intervals: a full non-leap year with `interval=daily` returns
365 rows. Consumers should aggregate or window charts explicitly if needed;
the report service does not apply a chart display limit to financial data.

## BQL column types

BQL query tables include column names and `dtype` labels. The pinned
`@rustledger/wasm` 0.24.0 result does not expose an expression schema, so the
ledger service infers these labels from non-null returned cells and canonical
column names. Numeric-looking or date-looking string literals can be labelled
`Decimal` or `date`, and a projection alias can change a label. Empty or
entirely null columns fall back to their output names.

An unaliased expression keeps the text it was written with as its column name,
as stock beanquery does: `SELECT 1+1` answers a column named `1+1`,
`UPPER( payee )` is `UPPER( payee )`, `TRUE` stays `TRUE` and `null` stays
`null`, where the engine alone would print `1 + 1`, `UPPER(payee)`, `true` and
`NULL`. An alias names its column, and a bare column keeps its canonical name
(`Year` answers `year`). A wildcard, or a SELECT list the service cannot line up
with the engine's columns one for one, keeps the engine's own names.

For example, `'00123' AS reference` can be labelled `Decimal` while
`'00123' AS account` is labelled `str`; both preserve the string `"00123"`.
Numeric `1.25 AS account` can conversely be labelled `str`. Consumers should
not coerce an identifier to a number solely from this inferred label. Scalar
text and decimal strings retain their values and precision.

NULL cells stay `null` in the shell result (`toShellCell` in
`src/features/ledger/service/ledger-shell-mappers.ts`), so a missing payee or
price, `SELECT NULL`, or a `sum` over an empty filter reads `null`, while an
empty string stays `""`. REST JSON and MCP `runBqlQueryStructured` return the
`null`; GraphQL `queryShell` keeps its pre-migration `""` for a NULL cell
(backend-v2's resolver converts it) so the generated dashboard and mobile
clients are unchanged (w23/075 option b1). The text table prints a NULL as a
blank. Use `IS NULL` in the query to tell a missing value from an empty string
on GraphQL (`WHERE payee IS NULL`).

Set-typed cells (tags, links, `other_accounts`, …) render identically in text
and structured results: members sorted and double-space-joined, the way stock
beanquery prints a set. An empty set reads `""`. The dtype still says `set`
while the value is a string; returning real JSON arrays is a three-surface
contract change, still undecided (w23/119).

REST, GraphQL and MCP share this query producer and its limitations. Reliable
expression types independent of aliases, including empty or entirely null
columns, require a supported engine schema. The service does not reconstruct
that schema by parsing user queries or coercing values.

## BQL integer arithmetic is `Decimal`

Stock beanquery types integer `sum(...)` and integer `+`, `-`, `*` as `int`
with JSON-number cells. The pinned engine does that arithmetic in exact
decimals, because a JS number loses integers above 2^53 (`SELECT
9007199254740993` is exact), and answers a string cell. The dtype follows the
cells: `sum(year)`, `year + 1` and `1 + 1` report `Decimal` (`"44564"`,
`"2026"`, `"2"`), the same with rows and with none, where it used to flip from
`int` to `Decimal` as soon as a row appeared. `%`, `count`, `min`, `max`,
`round`, `abs` and bare integer columns keep `int` and a number. Giving
integer arithmetic `int` cells would change the JSON type of cells on REST,
GraphQL and MCP and needs a rule for results past 2^53, so it is not done
(w23/215, option b). The one remaining oracle difference is recorded in
`scripts/bql-oracle/allowlist.json` as `inner-sum1`.

## BQL string concatenation

Stock beanquery concatenates strings with `+` (`'a' + 'b'` → `ab`), but the
pinned engine only adds numbers and refuses str `+` str. There is no
`concat()` spelling on either side and no engine spelling to rewrite to
(`||` is a syntax error, `concat()` is unknown, `joinstr` joins with a
`", "` separator), so BQL here has no string-concat spelling at all:
concatenate outside the query. The refusal names the limitation
(`String concatenation with + is not supported …`, w23/154) instead of the
engine's generic numeric hint. Engine support is tracked upstream
(w23/blocked/022).

## BQL `str()` input domain

Stock beanquery stringifies every value, but the pinned engine's `str()`
accepts only strings, integers, numbers, booleans, dates, and amounts —
positions, inventories, and sets refuse with
`type error: STR expects a string, integer, number, boolean, date, or amount`.
Stock would render those as `3000.00 USD`, `(3000.00 USD)`, and set text;
here there is no spelling for those renderings (w23/155). The refusal
already names the whitelist, so no service rewrite applies. Engine
overloads are tracked upstream (w23/blocked/022).

## BQL date arithmetic

Stock beanquery shifts dates by day counts (`date + 7`, `7 + date`,
`date - 7`) and counts days (`date - date`), but the pinned engine adds
numbers only and refuses every date pair. There is no operator spelling
to rewrite to, so spell the shift with `date_add(date, days)` and the day
count with `date_diff(first, second)` — both answer on this engine. The
refusal names the limitation and the workaround
(`Date arithmetic with + and - is not supported …`, w23/165) instead of
the engine's generic numeric hint. Date comparisons are unaffected
(`WHERE date > 2026-06-01` works), and so are the pairs stock refuses
too (`7 - date`, `date + date`, `-date`). Engine overloads are tracked
upstream (w23/blocked/022).

## BQL `FROM OPEN ON` is suffix-only

Stock's `FROM OPEN ON <date>` returns the postings from `<date>` onward
plus a synthetic opening-balances entry dated `<date>−1` (opening legs
per balance account offset to `Equity:Opening-Balances`, plus an
`Equity:Earnings:Previous` leg), but the pinned engine evaluates the
scope as a plain date-suffix filter with no summary synthesis. Counts
over mid-period OPEN scopes miss the summary block, and per-account
`GROUP BY` sums miss its legs (summary-only groups are absent entirely);
the ungrouped `sum(position)` still nets to zero on both, since the
missing block balances. Combined `OPEN ON … CLOSE ON` ranges share the
gap; the `CLOSE ON` mirror agrees row-for-row (w23/166). There is no
query-side spelling for the summary entry — refusing the scope would
steal its correct suffix rows — so the scope stays suffix-only until the
engine synthesizes the entry (w23/blocked/022).

## BQL `FROM … CLEAR` is refused

Stock's `CLEAR` books every Income and Expenses balance into
`Equity:Earnings:Current`, which is how a balance sheet as of a date reads
in beanquery. The pinned engine parses the keyword and ignores it, so the
same query kept the income and expense balances and had no earnings row —
wrong numbers with no error. The shell refuses `CLEAR` before the query
runs (`FROM … CLEAR is not supported …`, w1/192) and names the stand-in:
drop `CLEAR` and read the earnings with
`SELECT sum(position) FROM <the same scope> WHERE account ~ '^(Income|Expenses):'`.
The refusal goes once the engine books the transfer; `yarn verify:rustledger`
fails its "raw engine still ignores FROM … CLEAR" check when it does. Engine
gaps are tracked upstream (w23/blocked/022).

## BQL `balances.discrepancy`

The pinned engine leaves `balances.discrepancy` NULL even for a failing
assertion, where stock reports the difference. The shell fills it from the
validator (the figure the journal already serves, `actual - expected`): when a
query selects `discrepancy` (or `*`) from `balances` as a plain column, the
`date`, `account` and `amount` of each row are added to the query as hidden
columns, the failing assertions' differences are looked up by them, and the
hidden columns are dropped again. A passing assertion stays NULL. The query is
otherwise run as written, so `WHERE` on other columns, `ORDER BY` and `LIMIT`
behave as usual.

Where the engine would evaluate `discrepancy` over NULL and answer silently
wrong — in `WHERE`, `ORDER BY`, `GROUP BY`, a function or aggregate, a
computed column, or a `DISTINCT`/grouped query — the query is refused with the
supported form (`SELECT date, account, amount, discrepancy FROM balances`).
Reported upstream as rustledger/rustledger#2823; drop the enrichment when the
engine fills the column (w23/m19).

## BQL `getprice()` and `convert()` chain through a third currency

Stock beanquery reads a price only from the pair itself or its inverse:
`getprice(base, quote[, date])` answers NULL, and `convert(<amount>,
currency[, date])` leaves the amount in its own currency, when the ledger has
neither by that date. Only `convert(<position>, …)` of a lot at cost goes
further, through that lot's cost currency. The pinned engine falls back to one
hop through any other currency for every `getprice` and `convert`, a deliberate
rustledger extension (rustledger/rustledger#2152). On a ledger that holds
11 VTI at cost in USD and records only `price VTI 125.00 USD` and
`price EUR 1.20 USD`:

| Query | REST, GraphQL and MCP | `bean-query`, `bea query` |
| --- | --- | --- |
| `SELECT getprice('VTI', 'EUR'), getprice('EUR', 'VTI') LIMIT 1` | `104.1666666666666666666666667`, `0.00960` | NULL, NULL |
| `SELECT convert(units(sum(position)), 'EUR') WHERE account ~ 'Broker'` | `1145.833333333333333333333333 EUR` | `11 VTI` |
| `SELECT convert(units(position), 'EUR', 2026-08-25) WHERE account ~ 'Broker'` | `1041.666… EUR`, `104.166… EUR` | `10 VTI`, `1 VTI` |

Both agree on a recorded pair or its inverse (`getprice('USD', 'EUR')` is
`0.8333333333333333333333333333`), on `getprice('EUR', 'EUR')` (`1`), on a
currency with no route at all (`getprice('GBP', 'EUR')` is NULL), and on
`convert(position, 'EUR')` for a lot whose cost currency is the only route
(`1041.666… EUR`). When several routes exist, the engine takes the one whose
older leg is newest rather than the lot's cost currency, so a lot can convert
through another currency than stock uses. The engine's lookups also read a
rate from a posting's `@` price, which stock does only with the
`implicit_prices` plugin (w1/229). To match stock, convert only to a currency
a `price` directive quotes against the source currency, either way round;
`SELECT * FROM #prices` lists them on both.

The engine has no option to turn the chain off, and the service cannot undo it
afterwards: a chained figure looks like a direct one, and the lookup can sit
anywhere in an expression. The hosted reports are unaffected, since they value
from the ledger's own price map. `yarn verify:rustledger` fails its "hosted
getprice and convert still chain" check once an engine bump stops chaining;
then this section goes (w31/143).

## Validation: stock errors the engine does not raise

These things stock `bean-check` refuses load without an error in the pinned
engine (`@rustledger/wasm` 0.24.0), so the ledger reports them at their line, in
the same error list `checkLedger`, the post-write report and the write gates
read. Two scans in `src/foundation/rustledger/` read the source text for them:
`stock-syntax-errors.ts` (w23/240, w31/120, w31/121, w31/148, w31/154), which reads a posting's
cost and price with `posting-syntax-errors.ts`, and `balance-tolerance-syntax.ts`
(w23/197). One rule reads the booked stream instead: `zero-units-at-cost.ts`
(w31/140). Each row names the file whose rule finds it:

| Code | Construct | Stock's message | Source |
| --- | --- | --- | --- |
| `SYNTAX` | an unquoted booking method on `open` (`open Assets:Stock ABC STRICT`) | `syntax error, unexpected CURRENCY` | `stock-syntax-errors.ts` |
| `DUPLICATE_COMMODITY` | a second `commodity` directive for a currency, on the later one | `Duplicate commodity directives for 'ZZZ'` | `stock-syntax-errors.ts` |
| `DUPLICATE_METADATA` | one metadata key twice on a transaction, or on a posting, at the transaction's line | `Duplicate metadata field on entry`, `Duplicate posting metadata field` | `stock-syntax-errors.ts` |
| `NEGATIVE_PRICE` | a negative per-unit or total price (`10 EUR @ -1.10 USD`), on the posting's line | `Negative prices are not allowed: -1.10 USD (see …)` | `posting-syntax-errors.ts` |
| `COST_MERGE` | a merge cost (`-5 HOOL {*}`), on the posting's line | `Cost merging is not supported yet`, `Duplicate merge-cost spec` | `posting-syntax-errors.ts` |
| `DUPLICATE_COST_COMPONENT` | a second amount, date or label in one `{…}`, on the posting's line | `Duplicate cost: …`, `Duplicate date: '2026-01-05'.`, `Duplicate label: 'b'.` | `posting-syntax-errors.ts` |
| `COST_PRICE_CURRENCY` | a cost and a price in two currencies (`10 QAXR {100.00 USD} @ 90.00 EUR`, also `@@`), on the posting's line; `{}`, a cost with no currency and `{100 USD} @ 110 USD` stay clean, as in stock | `Cost and price currencies must match: USD != EUR` | `posting-syntax-errors.ts` |
| `TOTAL_COST_PER_UNIT` | a per-unit cost inside a total cost (`{{100 # 5 USD}}`), on the posting's line; `{{1005 USD}}` and `{100 # 5 USD}` stay clean | `Per-unit cost may not be specified using total cost syntax: 'CompoundAmount(…)'; ignoring per-unit cost` | `posting-syntax-errors.ts` |
| `TOTAL_PRICE_WITHOUT_UNITS` | a total price on a posting with no units (`Expenses:Food  @@ 10.00 USD`), on the posting's line | `Total price on a posting without units: 10.00 USD.` | `posting-syntax-errors.ts` |
| `TAGS_AFTER_POSTING` | a line of tags or links after a transaction's first posting, once per line, on the transaction's line; one before the first posting stays clean | `Tags or links not allowed after first Posting: TagsLinks(tags={'late'}, links=set())` | `stock-syntax-errors.ts` |
| `P0024` | a `\|` between a transaction header's strings (`* "payee" \| "narration"`), once per pipe, on the header's line, unless the same file set `option "allow_pipe_separator"` true above it | `Pipe symbol is deprecated.` | `stock-syntax-errors.ts` |
| `P0012` | an account with a colon after it (`Assets:Cash:`), on a posting, an `open`, `close`, `pad`, `balance`, `note`, `document` or `custom` line, or a metadata value | `syntax error, unexpected COLON, expecting …` (the tokens stock expected there) | `stock-syntax-errors.ts` |
| `P0012` | a string where a dated line's flag goes (`2026-09-02 "x"`) | `syntax error, unexpected STRING` | `stock-syntax-errors.ts` |
| `P0012` | a number with no leading digit (`.50 USD`), at each one | `Invalid token: '.50'` | `stock-syntax-errors.ts` |
| `P0012` | a currency that ends in `.`, `_` or `'` (`1 QAB.`, `commodity QAB_`), or a lone capital before one of `-'._` (`1 X.`), wherever it stands | `Invalid token: '.'` (the token runs to the next whitespace: `{1 QAB.}` is `.}`) | `stock-syntax-errors.ts` |
| `P0012` | a currency that ends in `-` (`1 QAB-`), on a posting's units, cost or price, an `open`, `commodity`, `price` (the quoted currency) or `balance` line, or a metadata value; `price QAB- 1.00 USD` stays clean, since stock reads `price QAB -1.00 USD` | `syntax error, unexpected MINUS, expecting …` (the tokens stock expected there) | `stock-syntax-errors.ts`, `posting-syntax-errors.ts` |
| `P0012` | a `custom` amount whose currency ends in `-` (`custom "budget" 1 QAB-`), where stock reads the `-` as the next value's sign and refuses the token after it; a line's end is reported on the next line, as stock does, and a number after it stays clean | `syntax error, unexpected EOL, expecting PLUS or MINUS or LPAREN or NUMBER` (or `STRING`, `DATE`, `BOOL`, `ACCOUNT`, `end of file`) | `stock-syntax-errors.ts` |
| `P0012` | a `\|` after a transaction header's tags or links (`* "x" #tag \|`) | `syntax error, unexpected PIPE, expecting end of file or EOL or TAG or LINK` | `stock-syntax-errors.ts` |
| `TOLERANCE` | a currency before a balance tolerance's `~` (`balance Assets:Cash 49.75 USD ~ 0.05 USD`, where the grammar wants `49.75 ~ 0.05 USD`), on the `balance` line | `syntax error, unexpected TILDE, expecting end of file or EOL` | `balance-tolerance-syntax.ts` |
| `ZERO_UNITS_AT_COST` | a posting of zero units at a cost with a number (`0 VTI {5 USD}`, `0.00 VTI {0 USD}`), on the posting's line; `0 VTI {}`, a date or a label alone, and `0 EUR @ 1.1 USD` stay clean, as in stock | `Amount is zero: "0 VTI"` | `zero-units-at-cost.ts` |

The table lists these rules only. Other files that `engine.ts` calls
reconcile what Beancount's booking (a sale from an AVERAGE position), its
plugins (`noduplicates`, `coherent_cost`, `sellgains` and others) and its pad
checks refuse where the engine does not, and those are not listed here.

The engine books a zero-unit posting at cost as an empty lot (`0 VTI {5 USD,
2026-09-01}` in BQL) and raises only the sibling rule, `E4005` "Cost is
negative". Stock keeps that entry and its posting too, so the rule adds the
error and changes no figure. It reads the stream as booked before plugins run,
as stock checks it. Stock 3.2.3 stops with a `DivisionByZero` on a zero-unit
total cost (`0 VTI {{5 USD}}`); the ledger reports this error there, beside the
engine's own imbalance.

The engine keeps a negative price's sign, so `10 EUR @ -1.10 USD` weighed
-11.00 USD; it keeps a cost spec's first date, label and amount, and reads `{*}`
as an empty cost. Structured `addLedgerEntries` refuses a negative `price` or
`totalPrice` before it reads a file (`src/api/entries.ts`).

The engine reads `{{100 # 5 USD}}` as 100 per unit plus 5 in total, so
`10 QAXT {{100 # 5 USD}}` weighs 1005 USD where stock keeps only the 5 USD
total, and an elided cash leg moved 1000 USD more. It keeps a total price on a
posting with no units, which stock drops, and files a transaction under a tag
written after its first posting, which stock does not apply. The errors change
no figure: they keep each entry from counting as clean. Structured
`addLedgerEntries` refuses a `cost` whose currency differs from its `price` or
`totalPrice` before it reads a file. Stock prints a set of tags in hash order,
which changes from run to run; the error lists them as written. The engine
raises its own pipe error only when a file fails to parse, and then for some
pipes and not others, past `allow_pipe_separator` too, so the scan's errors
take its place. Stock reads that option per file, from its line on: an
included file gets no pass from the option in `main.bean`.

The engine books `Assets:Cash:` to `Assets:Cash`, so a balance assertion that
holds only with that posting counted passed, and reads the flagless header as a
`*` transaction. It would read `.50` as 50; `withLeadingZeros`
(`parseable-files.ts`) gives it its zero so the figure is right, and the error
is reported at exactly the dots it rewrites. The two syntax errors carry
stock's message and then what is wrong (`: the account "Assets:Cash:" ends with
a colon`); all three carry the engine's own parse-error code, so a write
refused for them says the text is not valid Beancount. Stock drops a directive
at its first syntax error, so the scan reports that one and none of the
directive's later errors (a repeated key, a posting error below the bad line, a
second commodity it would have been), and, like stock's parser, stays quiet
about a flagless header on the line straight after a failed directive. Checked
against stock 3.2.3 on 14,500 random ledgers and the 126 tracked ledger fixtures
with no difference. A tags line that holds more than tags (`#late Assets:Cash`)
and a token after a header's tags end the directive the same way. The engine
raises those itself, except a `|` after the tags, which the scan reports with
stock's message and what is wrong.

The engine books a currency named `QAB.` or `QAB-` (BQL reads `units(position)`
as `{"QAB.": "1"}`), where stock's lexer ends a currency at its last capital or
digit (`beancount/parser/lexer.l`), the rule the structured entries route
already applies (`entry-tokens.ts`). The scan finds the currency where stock's
lexer would start one: after whitespace, `{`, `,`, `@`, `~` or `)`, or a number
or an expression written against it (`1QAB.`, `10/4/QAB.`), never inside an
account or a tag (`#a-QAB.`). A `.`, `_` or `'` is the lexer's error wherever it
is, like a `.50`, and a `-` is the grammar's, with stock's expected tokens for
where the currency stands; the errors change no figure. Two neighboring refusals
are left alone: a keyword where a currency goes (`1 TRUE-`, stock's `unexpected
BOOL`), so a later error in that directive can still be reported, and a lone
capital that ends a file with no line break (`1 X`). Checked against stock
3.2.3's parser on 14,500 random ledgers, where it reported about 37,600 invalid
tokens besides the `.50` kind, 8,000 `unexpected MINUS` errors and 110 errors
after a `custom` amount's `-`, and on the 126 tracked ledger fixtures; those two
were the only differences.

The scan is syntactic and abstains on doubt: it reads one block's own lines (a
line inside a multi-line string is never a key), and a line that does not have a
rule's exact shape is left alone. It mirrors stock's quirks rather than
tightening them. A bare word after a currency list is the error, but
`open Assets:Stock STRICT` is a currency named STRICT. Stock checks only
transactions for a repeated key, and it records a repeat only when the second
value is not the same Python object as the first, so a repeated `TRUE`, a
repeated one-character string, an empty value or a repeated account name is
accepted, where a repeated `"ab"`, number, date or currency is the error; a
string with a backslash is left alone. Checked against stock 3.2.3 on 1,000
random cases and the repository's 120 ledger fixtures with no difference.

The posting rules (`posting-syntax-errors.ts`) read a posting line with stock's
lexer (a `1,000.00` number, a `2026/1/5` date, a comma inside a label) and its
posting grammar, and evaluate a price or cost expression (`@ (1-2.1) USD`) the
way Python's `Decimal` does, so each message prints the number stock prints. A
line stock refuses as a syntax error, or a label that spans lines, is left
alone. Checked against stock 3.2.3 on 1,800 random postings and the 126 tracked
ledger fixtures with no difference. The w31/148 rules (cost and price
currencies, a per-unit cost in a total cost, a total price with no units, a late
tags line, a header's `|`) were checked against stock 3.2.3's parser on 14,000
random transactions, where it reported 21,257 errors, and on the same fixtures,
with no difference.

The tolerance rule (`balance-tolerance-syntax.ts`) reads a `balance` line that
starts with a date, in any spelling stock's lexer reads, and has a currency
straight before its `~`. The valid spelling has the `~` straight after the
number, so it never matches. Like the scan above, it skips a line inside a
multi-line string and a line Beancount skips. The engine reads the misplaced
spelling with the tolerance as written (`0.05`). The error is in the ledger's
own words and names the spelling stock takes (`49.75 ~ 0.05 USD`).

`yarn verify:rustledger` pins each construct: it fails when the raw engine
starts to reject one, which is the cue to delete that rule. The unquoted
booking method is already a parse error in `@rustledger/wasm` 1.0.0-rc.18; the
duplicate commodity and metadata key still load there. Moving to that release
also changes the engine's API (`Ledger.fromFiles` becomes `ParsedLedger`), so it
is not a drop-in bump.

The write-side tools differ in the other direction: `appendLedgerText` is a line
classifier and refuses a `YYYY/MM/DD` date and a quoted string that spans lines,
which stock and `updateLedgerFiles` accept. It says so in the refusal's hint
(`backend-v2/docs/mcp.md`).

## Validation: a lone elided posting is not an error

Stock interpolation fills an elided posting from the transaction's residual.
When the elided posting is the transaction's only posting, there is no
residual, so stock drops the posting and reports nothing: the entry loads with
no postings, and `bean-query` returns no row for it. The engine reports `BOOK`
"interpolation failed: cannot infer currency for posting to account …" for it.
`loneElidedTransactions` (`book-errors.ts`) pairs that error with its
transaction by date, narration and account, and `engine.ts` drops the error and
books the entry with no postings, as stock does (w31/138). The entry keeps the
ID its source text hashes to, so it still opens in the journal. The engine's
`E3004` "Transaction has only one posting" warning stays. A lone posting with a
cost or a price, or two elided postings, is still an error, as it is in stock.
`yarn verify:rustledger` fails its "raw engine still refuses a lone elided
posting" check once the engine stops reporting it, which is the cue to delete
the rule.

## BQL `meta` dialects

The `meta` column reports dtype `object` on both tables at every
endpoint — valued, blank, and empty — matching stock's dict (w23/170).
But the two tables serialize the same content differently: postings
serves pre-stringified `k: "v"` cells (comma-joined, engine-rendered)
while entries serves the dict, which the shell renders as `k=v`. The
split lives in the engine's cell shapes, so only the engine can unify
the serialization; parsing its undocumented string form back into
dicts would be guessing. Neither table carries filename/lineno (the
w23/016 upstream gap: no source-location surface is populated) — custom
keys flow on both. Engine unification is tracked upstream
(w23/blocked/022).

## Getting started

Requires Node.js 20.19+, 22.13+, or 24+ and a running Gitea instance. See
`.env.example` for the expected environment variables.

TypeScript stays on 6.0.x: TypeScript 7 is outside the current ts-jest and
typescript-eslint supported ranges and fails Yarn 4.17's TypeScript patch.
The `ignoreDeprecations: "6.0"` setting preserves the CommonJS loader and
`baseUrl` aliases used by ts-node until that toolchain can migrate together.

```bash
yarn install
cp .env.example .env   # fill in GITEA_* / BACKEND_V2_* as needed
yarn dev                # runs on :8000
```

### Scripts

- `yarn dev` / `yarn start` - run with ts-node
- `yarn build` / `yarn dist:start` - compile then run the compiled output
- `yarn test` - unit tests (WASM-free)
- `yarn verify:rustledger` - live engine checks against the real WASM module
- `yarn lint` / `yarn typecheck`
- `yarn generate-gitea-client` - regenerate the client from
  `../idl/gitea.swagger.v1.json` using pinned generator tooling. The local config
  encodes owner/repository path segments; the thin HTTP template preserves
  `format: "raw"` streaming and rejects unexpected upstream template changes.

### Environment variables

See `.env.example`. All are optional with sensible defaults for the Docker
Compose network; the only ones typically set explicitly are `WEBHOOK_TOKEN`
and `BACKEND_V2_ADMIN_TOKEN`.

### Managed price includes

A ledger file may include a managed price feed:

```beancount
include "https://beancount.io/prices/BTC-USD"
```

The service fetches the feed, accepts only `price` directives with the
allowlisted metadata, overlays them as a read-only virtual file after the
committed files are loaded, and refreshes them on a five-minute schedule
without creating a Git commit. A failed refresh keeps the last validated
revision serving. Ledger-authored prices for the same date and pair win.
`MANAGED_PRICE_ORIGINS` lists the origins the service may fetch from and
allows only `https://beancount.io` unless set; set it to an empty string to
disable the feature. The design is recorded in
[ADR 015](../../docs/adrs/ADR015-ledger-managed-price-includes.md).

## Testing

`yarn test` runs the unit suite. A separate parity harness under `parity/`
proved endpoint-by-endpoint equivalence with the Python service during
migration; it's retired now that the Python service is gone, but
`parity/COVERAGE.md` is kept as the historical record.
