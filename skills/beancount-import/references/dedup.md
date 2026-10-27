# Dedup and the `import-id` convention

The idempotency guarantee — re-importing a file adds zero new entries — rests on one convention: **every imported transaction carries an `import-id` metadata line identifying its source row.** The ledger itself is the dedup database; no side files, no state outside the plain text. Any other tool that adopts the same convention becomes dedup-interoperable with this skill.

## Grammar

```
import-id: "<source>:<stable-id>"
```

| Source has… | Form | Example |
|---|---|---|
| A native unique ID (OFX `FITID`, any bank/exporter txn id) | `<kind>:<native-id>` | `import-id: "ofx:2026050701"` |
| No native ID (typical CSV/QIF) | `csv:sha256:<16-hex>` | `import-id: "csv:sha256:a3f19c02d4e8b711"` |
| No native ID, read from a PDF statement | `pdf:sha256:<16-hex>` | `import-id: "pdf:sha256:273e1fe28b2668d9"` |

Other tools may use their own source prefixes (e.g. a bank-feed integration writing `plaid:<txn-id>`); the exact-match layer treats every `import-id` value as an opaque string, so foreign prefixes dedup correctly without this skill knowing them. `bea import` follows this convention: native bank IDs become `bank:<id>` (`fitid` becomes `ofx:<id>`), rows without one become `csv:sha256:<16-hex>` with the normalization above — `ofx:sha256:<16-hex>` for `--ofx` rows without a FITID, and older `csv:` spellings still match — and pre-release `bea_import_id` entries still match.

Migration prefixes (used by `beancount-migrate`, normative here): `mint:sha256:<16-hex>`, `monarch:sha256:<16-hex>`, `qbo:sha256:<16-hex>`, and `<source>:sha256:<16-hex>` for a source without its own reference, where the source name is a lowercase letter followed by lowercase letters, digits, `-` or `_` (`ynab:`, `actual:`, `lunch_money:`). `bea import` matches the digest under any of them. The hash is computed with exactly the normalization below, using the source's raw-description field (each migrate per-source reference names it) — always the four-field form: app-assigned merchant and name columns (QBO `Name`, Monarch `Merchant`) are excluded, because the bank export a later import reads carries only the raw description, so hashing app-only fields would never match. This is what lets a post-migration `beancount-import` run dedup against migrated history.

## Hash normalization (the `csv:sha256` form)

Hash input is the UTF-8 string:

```
<date>|<amount>|<description>|<source-account>
```

- `date` — ISO `YYYY-MM-DD`.
- `amount` — the **ledger-sign** amount followed by a space and its commodity: `-54.20 USD`. Write the exact value with trailing zeros stripped and no thousands separators, so the spellings of one amount (`-54.2`, `-54.20`, `-54.200`) all render `-54.2 USD`, and never in scientific notation (`100`, not `1E+2`). The exact value and the commodity keep distinct rows distinct: rounding would give `-0.001 ETH` and `-0.002 ETH` the same input, and dropping the commodity would do the same for `-1 ETH` and `-1 BTC`. A transaction with several source postings joins them with `+` sorted by numeric amount, then commodity, then lot — numeric, not string order, whatever order the row lists them: `10 AAPL {120 USD}` and `2 AAPL {100 USD}` join as `2 AAPL {100 USD}+10 AAPL {120 USD}` (string sorting would put `10 …` first). A source posting held at cost or priced adds its lot right after its units, as the ledger writes it: the per-unit cost and its commodity in braces, with its label when it has one (`10 AAPL {100 USD}`, `10 AAPL {100 USD, "lot-a"}`), then its price (`-10 AAPL {100 USD} @ 120 USD`), every number in the same exact form. A compound cost counts at its effective per-unit cost: `{100 # 5 USD}` on 5 units hashes as `{101 USD}`, so it differs from `{100 # 10 USD}`. So two same-day buys of `10 AAPL` at 100 and 120 USD are two rows. A cost the posting leaves open (`{}`, a currency or date alone) adds nothing. Ids hashed from units alone, written before lots counted, stay **lookup-only** keys: `bea import` matches them, but only against the same lot. Ids hashed before a compound cost counted its total stay lookup-only the same way.
- `description` — the **raw** row description (not the cleaned payee), uppercased, runs of whitespace collapsed to one space, leading/trailing whitespace stripped, then Unicode-normalized to **NFC**. Raw, because payee-cleanup rules may improve over time and must not change hashes; NFC, because the same description can arrive decomposed in one export and composed in the next, and the two must hash alike. Normalize *after* uppercasing — uppercasing decomposed text can itself emit a non-canonical form.
- `source-account` — the full account name in NFC, e.g. `Assets:Bank:Checking`.

**Rows with a separate payee.** When the source row carries a raw payee/name field (a merchant or counterparty column — not a payee cleaned out of the description) as well as a description, hash both, the payee normalized exactly like the description:

```
<date>|<amount>|<payee>|<description>|<source-account>
```

Otherwise `STARBUCKS / CARD PURCHASE` and `PEETS COFFEE / CARD PURCHASE` for the same amount on the same day share one input and only the occurrence suffix tells them apart — and a re-downloaded export may list them in the other order. A row whose only text is its description keeps the four-field form. This five-field form is for imports, whose later re-downloads carry both fields; migration ids never take it (see above).

Take the SHA-256 hex digest, keep the **first 16 hex chars** (64 bits — collision-safe at personal-ledger scale, short enough to read).

Example: `2026-05-07|-54.2 USD|TRADER JOES #123 SEATTLE WA|Assets:Bank:Checking` → `import-id: "csv:sha256:<first-16-of-sha256>"`. With a payee column reading `Store`: `2026-05-07|-54.2 USD|STORE|TRADER JOES #123 SEATTLE WA|Assets:Bank:Checking`. With a lot (an importer's `BUY AAPL` row posting `10 AAPL {100 USD}` to its source account): `2026-05-07|10 AAPL {100 USD}|BUY AAPL|Assets:Broker:AAPL` → `import-id: "csv:sha256:d11701f46efbd599"`. With a compound lot (`5 AAPL {100 # 5 USD}`): `2026-05-07|5 AAPL {101 USD}|BUY AAPL|Assets:Broker:AAPL` → `import-id: "csv:sha256:a5b6e00ea85caa3d"`. With two legs listed `10 AAPL {120 USD}` then `2 AAPL {100 USD}`: `2026-05-07|2 AAPL {100 USD}+10 AAPL {120 USD}|BUY AAPL|Assets:Broker:AAPL` → `import-id: "csv:sha256:6648ad67a6d94d97"`.

Compute it honestly (e.g. `printf '%s' '<input>' | shasum -a 256 | cut -c1-16`) — never fabricate a plausible-looking hash.

**Ledgers written before exact amounts or before NFC normalization.** Ids stored by an earlier `bea` were hashed from the un-normalized description, or from the two-decimal amount without its commodity, or both. (Earlier exact-amount ids also rounded amounts past 28 significant digits; `bea import` matches those lookup-only too.) There are therefore two independent axes a ledger may predate, and `bea import` offers every older combination as a **lookup-only** key: it matches them, writes only the canonical one, and needs no re-hash pass.

**Ledgers written before payees were hashed.** Earlier ids for a row with both a payee and a description were hashed from the description alone. They also stay **lookup-only** keys. Their occurrence suffixes followed the old export's row order, so `bea import` gives each such stored id that a group of same-description rows reaches to the row whose payee matches the stored entry's payee; an id whose payee no row has (edited since) stays with the row at its old occurrence. When computing ids by hand, check a row with a payee against both its five-field and its four-field id.

An older amount digest is additionally **content-checked** before it counts as a match. That form was lossy — it could hand two genuinely different rows the same digest — so a hit on one means *already imported* only when the date and source amounts agree; otherwise the hit is ignored rather than reported as a conflict. A reused **native** bank id with different source amounts or commodities is still a conflict and requires review. Payee, narration, date, flag, and counter-account edits do not invalidate a native ID match with unchanged source amounts.

A canonical generated hash identifies the original source row. Keep it when reviewing or correcting the ledger entry: later changes to the ledger's date, amount, payee, or narration do not turn that hash hit into a conflict. The canonical match takes precedence over an older file ID retained on the entry. These rules concern re-importing the original source row; a changed source row without a native ID has a different hash and needs its own duplicate review.

**Same-day identical rows** (two identical coffees on one card, same date/amount/description): they produce the same hash. Disambiguate by suffixing an occurrence counter to the hash input for the second and later duplicates within one file: `…|Assets:Bank:Checking|2`. This keeps N identical rows ↔ N entries while re-imports still match 1:1 (occurrence order is stable within a file).

## PDF statement rows (the `pdf:sha256` form)

A row extracted from a PDF statement — by `beancount-import`, or proposed by `beancount-reconcile` from a PDF — carries `pdf:sha256:<16-hex>`. The hash input is the **same** normalized string as the `csv:sha256` form above (four fields, or five when the statement prints a separate payee), with `description` taken from the statement line **as printed**: copy the line's text, join a wrapped description's lines with one space, then apply exactly the normalization above (uppercase, collapse whitespace, strip, NFC). Never paraphrase, translate, or clean the wording first — the printed text is the raw description, the same bargain the CSV form makes with the raw export.

That is what makes the id stable across re-reads of one file: the date, amount, and account are printed facts, and the normalization erases the differences a second read realistically introduces (line wraps, spacing, case). A re-read that changes actual words is an extraction difference, not an identity difference — the statement tie-out (opening + movements = closing) and the review still stand between it and a write. The occurrence rule is the same as for CSV: second and later identical rows **within one statement**, in printed order, suffix `|2`, `|3`, ….

Example: a statement line dated 2026-06-03 posting `-12.40 USD` to `Assets:Bank:Checking`, printed `Starbucks Store 12345` → input `2026-06-03|-12.4 USD|STARBUCKS STORE 12345|Assets:Bank:Checking` → `import-id: "pdf:sha256:273e1fe28b2668d9"`.

Sharing the hash input is deliberate: when a later CSV export's raw description for the same purchase normalizes to the same string, the two digests are equal, and the row exact-matches across sources (`bea import` already indexes the bare digest of any `<prefix>:sha256:` id). When the bank words the two sources differently, Layer 2c below is the net. The prefix still records provenance — which source kind first recorded the row — and Layer 2c keys off it.

## The two dedup layers

**Layer 1 — exact (import-id match).** Collect every `import-id` value already in the ledger (scan entry metadata; also collect `import-id-2` — beancount-migrate's merged transfer pairs record the counterparty row's id there). A candidate whose ID is present under either key is *already imported*: drop it, count it in the review summary. This layer is mechanical — no user decision needed.

**Layer 2 — fuzzy (legacy entries without metadata).** Manual entries predate the convention. For each surviving candidate, look for existing entries **lacking** import-id metadata that post the **same amount** to the **source account** within **±3 days**, with similar descriptions (case-insensitive token overlap; a matching leading word like a shared merchant name counts). Each hit is a **suspected duplicate**: present the candidate and the existing entry side by side and ask *skip* (already recorded manually) or *import* (genuinely distinct). Never decide silently in either direction — a wrong skip loses a real transaction, a wrong import double-books one.

**Layer 2b — the other side of a transfer.** A transfer imported from one account already sits in the ledger with that account's `import-id`, and posts to the source account only as its counter posting (the first posting is the other account). Each bank words its side differently (`TRANSFER TO SAVINGS` / `TRANSFER FROM CHECKING`), so neither the description pass nor Layer 1 sees the pair. For each surviving candidate, look for such entries, with or without import-id metadata, that post the **same amount** to the source account within **±3 days**, whatever the description. Each hit is a suspected duplicate, presented and decided like the ones above; *skip* is the usual answer, since the transfer is already booked. A processor payout booked from a payout export (`references/payouts.md`) is such a transfer, from the processor's clearing account: the bank deposit that later carries it is skipped here, so the sales behind it are counted once.

**Layer 2c — the same purchase from another source kind.** Layer 2 skips entries that carry an `import-id`, so a purchase first recorded from a PDF statement is invisible to it when the same month later arrives as CSV (and the reverse). For each surviving candidate, also look for existing entries that post the **same amount** to the **source account** within **±3 days** and whose `import-id` source kind **differs** from the candidate's — kinds are the prefix families: native (`ofx:`/`bank:`/…), `csv:`, `pdf:`, and each migration prefix. Description similarity is **not** required: two sources word one purchase differently, which is the whole problem. Each hit is a suspected duplicate, presented and decided like the layers above; a pair already shown under Layer 2b is not shown twice. Example: the ledger holds the 2026-06-03 Starbucks entry above (`pdf:sha256:273e1fe28b2668d9`, narration from the statement); a July CSV export offers `2026-06-04, -12.40, SQ *STARBUCKS #12345` for the same account. The hashes differ (different raw wording, posting date one day later), Layer 1 misses, Layer 2 skips the id-bearing entry — Layer 2c pairs them (same amount and account, one day apart, `csv:` candidate vs `pdf:` entry) and asks. *Skip* is the usual answer; *import* when they are genuinely two coffees.

If the user chooses *skip*, leave the existing entry byte-for-byte unchanged.
These append-only workflows do not attach `import-id` or `import-id-2` to old
entries. Explain that the same fuzzy review can recur on a later import.
If useful, show the candidate ID for the user's separate manual edit, without
making that edit or claiming it has already enabled exact-match deduplication.
New approved entries still carry their required source identities, including
both IDs on a newly merged transfer.

## Ordering

Dedup runs **before** categorization (Suggest). Skipped rows must not consume categorization effort or clutter the review table beyond their counts.

## `bea import` behavior

`bea import` auto-skips exact `import-id` matches and reports possible
duplicates with the same date, normalized payee (the narration when the row has
no payee) and source amount/currency. It may also note a transfer's other side
("… this row may be its other side"); do not depend on that note. Run Layer 2b
and the ±3-day, similar-description pass above yourself on every import, even
when the CLI reports zero possible duplicates; see
`references/bea-import.md` for the query and write procedure. Layer 2c pairs
(different source kinds, differently worded) are likewise yours to run: the
CLI exact-matches a `pdf:`/`csv:` pair only when their digests happen to be
equal, and its possible-duplicate report does not look ±3 days across source
kinds.

The CLI's `--duplicates skip/include` applies to every possible duplicate in
one invocation. Mixed decisions or a user-skipped fuzzy match require an
approved JSON batch preserving the previewed IDs, rather than applying the
original CSV with one global decision. `bea add transactions` validates that
batch but does not deduplicate it. Re-read existing IDs before any retry.
