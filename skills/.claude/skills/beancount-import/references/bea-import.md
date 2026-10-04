# CSV import through `bea`

Read beancount-init's `references/bea-cli.md` for root/destination selection,
batch JSON, validation, and resume behavior. The CSV mapper handles simple
cash exports. Use the normalized batch path when it cannot represent the
source: pending/status flags, type-dependent signs, splits, or per-row
categories that a payee rule cannot distinguish.

## Keep the confirmed settings explicit

Set `mapping` to the confirmed `--csv` specification, **including**
`sign=bank` or `sign=ledger`. `bank` keeps the exported signs; `ledger`
negates them. Choose by inspecting the source rows, not the account type or
the option's name. Preserve this decision in the skill's per-source config.

`bea` remembers column mappings but deliberately **does not remember sign**
(it re-applies `sign=ledger` only to a byte-identical re-run of the same file).
Pass the full mapping, source `account`, `date_format`, `rules`, and `target`
on every preview and apply, including repeat imports. Matching headers alone
do not establish which account a file belongs to.

Set `rules` to the source's durable TOML file under the ledger repository,
for example `import-rules/chase-checking.toml`. `bea` remembers its **path**,
not its contents; if that path disappears, it warns and imports without those
rules. Read it before reuse. For a first preview, a scratch rules file is
fine; show the durable file's proposed contents and create it only after
confirmation, then re-preview using that final path before applying.

Rules are ordered regular expressions, matched against payee, narration and
category. Escape literal merchant names and use anchors where needed. A rule
must reproduce the **reviewed per-row categories**; a repeated merchant with
different categories needs the normalized batch path. Matched rows receive
`*`; unmatched rows receive `!` and `Expenses:Uncategorized`. If the source
marks a categorized row pending, use a batch with an explicit `!` instead.

## Preview and duplicate review

Set `export` to the original source file and run:

<!-- recipe: csv-preview -->
```sh
bea --file "$ledger" --json --no-input import "$export" --csv "$mapping" --account "$account" --date-format "$date_format" --rules "$rules" --into "$target"
```

Show the actual previewed amounts, flags, categories, counts, and destination.
If required accounts are blocked, include their opens in the proposal. After
approval, open them, then re-preview. Stop for a material change to the
approved entries or destination and obtain a corrected review before applying.

Read `references/dedup.md`: CLI duplicate review covers exact IDs and
**same-date, normalized-payee, source-amount** matches. It does not implement
the skill's **±3-day similar-description** check for legacy manual entries.
Always run that additional check before approving a CSV batch, even when
`possible_duplicates` is zero. Read the root ledger's postings in the export
date range extended by three days on both ends, including metadata:

<!-- recipe: duplicate-window -->
```sh
bea --file "$ledger" --json --no-input query "SELECT date, payee, narration, position, entry_meta('import-id') AS import_id, entry_meta('import-id-2') AS import_id_2 WHERE account = '$account' AND date >= $window_start AND date <= $window_end ORDER BY date"
```

Compare each surviving candidate with entries without imported IDs using
the date, exact signed amount/currency, and description rules. Show potential
matches and ask keep/skip. Neither a match nor a zero CLI duplicate count is
permission to decide silently.

## Apply exactly the approved rows

`--duplicates` chooses one policy for **all** CLI possible duplicates in that
invocation. When all such decisions agree, set `duplicates` to `skip` or
`include`; with none, leave it `review`. After approval, reuse every option:

<!-- recipe: csv-apply -->
```sh
bea --file "$ledger" --json --no-input import "$export" --csv "$mapping" --account "$account" --date-format "$date_format" --rules "$rules" --into "$target" --duplicates "$duplicates" --apply
```

If some rows must be skipped and others kept, or the additional fuzzy pass
finds a row the user skips, do **not** apply the original export with a global
decision. Build the reviewed JSON batch and use the shared batch recipe.
Preserve each included row's original previewed `import-id`, postings and
flag. Do not reimport a filtered CSV: occurrence-based IDs could change when
identical rows are removed. Before retrying, dedup against the current ledger;
`bea add transactions` has no automatic deduplication.

Run `bea --file "$ledger" check` after the write. Repeat previews must use
the same confirmed options and the same additional fuzzy review. Exact
reimports should be no-ops. A manual entry skipped by fuzzy review remains a
review item on subsequent runs unless the user separately authorized adding
its `import-id`; these import commands do not edit existing entries.
