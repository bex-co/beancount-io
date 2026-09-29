# Shared `bea` command recipes

Read the sections needed for the current workflow. Prefer `bea` for ledger
operations; the skill owns interpretation, review, and the user's confirmation.
Check `command -v bea` once. If it is absent, suggest
`brew install bex-co/tap/bea` or `uv tool install beancount-io`; the explicit
developer fallback is in beancount-init's `references/compatibility.md`.
If an installed `bea` fails, surface its error and repair/retry its managed
engine. Do not install another Beancount CLI or configure private engine paths.

## Bind the ledger and destination

- Set `ledger` to the discovered **root** ledger's absolute path, including
  when its name is `ledger.beancount` or it is outside the current directory.
- Set `target` to the user-approved write destination, relative to that root's
  directory. For these existing-ledger workflows it must already exist and be
  included by the root. For a root-file write, use its basename as `target`.
- Pass `--file "$ledger"` on every ledger command and `--into "$target"` on
  every directive write. `--file` selects the whole ledger for validation;
  `--into` selects where entries go. Never substitute the included file for
  the root: that would omit accounts, plugins, and assertions in other files.
- Use global `--json --no-input` for machine ledger reads and writes. Inspect the
  exit status, error envelope, notes, and `truncated` indicator; a truncated
  listing is not complete input for deduplication or reconciliation. Query the
  full date window, or increase the listing limit until it is complete.
- `bea ingest` uses native output and rejects `--json`; inspect its actual
  identification and extraction results even when the exit status is 0.

## Read and check

```sh
bea --file "$ledger" --json --no-input query "$query"
bea --file "$ledger" --json --no-input report income-statement --time "$month"
bea --file "$ledger" --json --no-input report balance-sheet --time "$month"
```

Use BQL to enumerate all relevant postings/accounts; `list` defaults to only
50 results. For a human-readable transaction, use `list transaction --details`.
Run the final check against the root, including after writing an included file:

<!-- recipe: check -->
```sh
bea --file "$ledger" --json --no-input check
```

## Open accounts, then write the confirmed batch

Show account opens with the proposal. Their dates must be on or before the
earliest affected transaction, including historical opening balances. Set
`open_target` to the approved file for account definitions (often the root).
Only restrict currencies when that matches the account's intended holdings.

<!-- recipe: open -->
```sh
bea --file "$ledger" --json --no-input add open --date "$open_date" --account "$account" --into "$open_target"
```

Create the approved JSON array in `batch` (a scratch file), or pass that same
array on stdin using `--from -`. Use decimal **strings**, not floating-point
numbers. Each transaction has `date`, `flag`, optional `payee`, `narration`,
`postings`, optional `meta`, `tags`, and `links`. A cash posting looks like
this complete example; replace the example's native ID with the source row's
actual ID. Follow beancount-import's `references/dedup.md` for hashed IDs.

<!-- recipe: batch-json -->
```json
[
  {
    "date": "2026-05-07",
    "flag": "*",
    "payee": "Coffee Shop",
    "narration": "Card purchase",
    "meta": {"import-id": "ofx:2026050701"},
    "postings": [
      {"account": "Assets:Checking", "units": {"number": "-12.50", "currency": "USD"}},
      {"account": "Expenses:Dining", "units": {"number": "12.50", "currency": "USD"}}
    ]
  }
]
```

<!-- recipe: batch -->
```sh
bea --file "$ledger" --json --no-input add transactions --from "$batch" --into "$target"
```

The batch is validated before writing. Do not use `--partial` or
`--allow-errors` to get an ordinary confirmed batch through a failed check.
`add transactions` **does not deduplicate**, even when `meta.import-id` is
present. Perform the workflow's dedup before writing and before any retry.
Keep `import-id-2` on merged transfers, and preserve pending/uncertain `!` flags.

## Options and investment lots

For explicit per-unit costs, use structured `units` and `cost` in a batch.
For example, after opening the three accounts below, a short put with a
$150 gross premium and $0.65 fee is:

<!-- recipe: option-batch-json -->
```json
[
  {
    "date": "2026-05-07",
    "narration": "Sell put",
    "links": ["option-1"],
    "postings": [
      {"account": "Assets:Checking", "units": {"number": "149.35", "currency": "USD"}},
      {"account": "Assets:Brokerage:Options", "units": {"number": "-1", "currency": "AAPL_PUT_20260620_00150000"}, "cost": {"number": "150.00", "currency": "USD"}},
      {"account": "Expenses:Trading:Fees", "units": {"number": "0.65", "currency": "USD"}}
    ]
  }
]
```

For a disposal with an explicitly selected held lot, carry its actual cost
and optional acquisition date in `cost`. For native booking syntax such as
`{}` or total costs `{{...}}`, use `add transaction --posting`; older `bea`
batch schemas require explicit cost number/currency and accept only plain
amounts in `amount` shorthand. Do not guess a cost to satisfy that schema.

For example, to expire the held short put, set `option_posting` to
`Assets:Brokerage:Options 1 AAPL_PUT_20260620_00150000 {} @ 0 USD`,
`income_account` to the already-open `Income:Trading:OptionPremium`,
`trade_date` to `2026-06-20`, `narration` to `Expire put`, and `trade_link`
to the original `option-1`:

<!-- recipe: option-expiry -->
```sh
bea --file "$ledger" --json --no-input add transaction --date "$trade_date" --narration "$narration" --link "$trade_link" --posting "$option_posting" --posting "$income_account" --into "$target"
```

Repeat `--posting` for the approved cash/fee/stock legs of other events.
Preserve prices, cost dates, tags and links. Omit `units`/`amount` on an
inferred JSON posting, or pass only its account as a native posting.
Confirm unfamiliar shapes with `bea add transactions --help` before writing.

## Assert the statement balance

Set `assertion_date` to the day **after** the statement end, and `amount` to
the signed statement ending amount including its currency (e.g. `987.50 USD`).
Only write an assertion that the proposed ledger will satisfy.

<!-- recipe: balance -->
```sh
bea --file "$ledger" --json --no-input add balance --date "$assertion_date" --account "$account" --amount "$amount" --into "$target"
```

For an explicitly accepted opening gap with no prior assertion, use
`add balance --pad-from "$equity_account" --pad-date "$pad_date"` with the
same root and destination. Open both accounts on/before the pad date and
place the opening assertion before the period's movements. Reuse the ledger's
existing opening-equity account (`bea init` creates `Equity:OpeningBalances`).
Never use padding to conceal an unresolved transaction mismatch.

## Failure and resume

Account opens, the transaction batch, and assertions are **separate writes**.
Atomicity applies to each command, not the whole workflow. If a later command
fails, report which earlier steps succeeded and inspect the current ledger
before retrying; never blindly replay the transaction batch. A failed
assertion must not be reported as a completed reconciliation.

`bea` has no command for the skills' config comment blocks. Update only the
reviewed comment block after confirmation, preserving other text. This does
not authorize hand-writing directives on the `bea` path.
