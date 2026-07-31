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

Other tools may use their own source prefixes (e.g. a bank-feed integration writing `plaid:<txn-id>`); the exact-match layer treats every `import-id` value as an opaque string, so foreign prefixes dedup correctly without this skill knowing them.

Migration prefixes (used by `beancount-migrate`, normative here): `mint:sha256:<16-hex>`, `monarch:sha256:<16-hex>`, `qbo:sha256:<16-hex>` — hash computed with exactly the normalization below, using the source's raw-description field (each migrate per-source reference names it). This is what lets a post-migration `beancount-import` run dedup against migrated history.

## Hash normalization (the `csv:sha256` form)

Hash input is the UTF-8 string:

```
<date>|<amount>|<description>|<source-account>
```

- `date` — ISO `YYYY-MM-DD`.
- `amount` — the **ledger-sign** amount with exactly two decimals, explicit `-` for negatives, no thousands separators: `-54.20`.
- `description` — the **raw** row description (not the cleaned payee), uppercased, runs of whitespace collapsed to one space, leading/trailing whitespace stripped. Raw, because payee-cleanup rules may improve over time and must not change hashes.
- `source-account` — the full account name, e.g. `Assets:Bank:Checking`.

Take the SHA-256 hex digest, keep the **first 16 hex chars** (64 bits — collision-safe at personal-ledger scale, short enough to read).

Example: `2026-05-07|-54.20|TRADER JOES #123 SEATTLE WA|Assets:Bank:Checking` → `import-id: "csv:sha256:<first-16-of-sha256>"`.

Compute it honestly (e.g. `printf '%s' '<input>' | shasum -a 256 | cut -c1-16`) — never fabricate a plausible-looking hash.

**Same-day identical rows** (two identical coffees on one card, same date/amount/description): they produce the same hash. Disambiguate by suffixing an occurrence counter to the hash input for the second and later duplicates within one file: `…|Assets:Bank:Checking|2`. This keeps N identical rows ↔ N entries while re-imports still match 1:1 (occurrence order is stable within a file).

## The two dedup layers

**Layer 1 — exact (import-id match).** Collect every `import-id` value already in the ledger (scan entry metadata). A candidate whose ID is present is *already imported*: drop it, count it in the review summary. This layer is mechanical — no user decision needed.

**Layer 2 — fuzzy (legacy entries without metadata).** Manual entries predate the convention. For each surviving candidate, look for existing entries **lacking** import-id metadata that post the **same amount** to the **source account** within **±3 days**, with similar descriptions (case-insensitive token overlap; a matching leading word like a shared merchant name counts). Each hit is a **suspected duplicate**: present the candidate and the existing entry side by side and ask *skip* (already recorded manually) or *import* (genuinely distinct). Never decide silently in either direction — a wrong skip loses a real transaction, a wrong import double-books one.

If the user chooses *skip*, offer to add the candidate's `import-id` onto the **existing** manual entry (one metadata line — the only edit-of-existing-entries this skill ever proposes, and only with explicit consent). This makes the next re-import exact-match it in layer 1 instead of re-asking.

## Ordering

Dedup runs **before** categorization (Suggest). Skipped rows must not consume categorization effort or clutter the review table beyond their counts.
