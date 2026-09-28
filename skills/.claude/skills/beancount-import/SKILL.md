---
name: beancount-import
description: Import a bank or card CSV, OFX/QFX, or QIF export into an existing Beancount ledger. Normalize signs, suggest categories from existing accounts, review duplicates and confirm before writing through bea. Use for recording an export; skip statement reconciliation, full finance-app migrations, reusable importer authoring, and individual options trades.
---

# beancount-import

Turn a bank/card export file into categorized, deduplicated ledger entries — staged first, written only after explicit confirmation, idempotent on re-import.

This skill exists because the weekly export-to-ledger chore has three silent failure modes: a flipped sign convention corrupts every amount, a re-imported file double-books everything, and a guessed category buries mistakes the user won't find until tax time. The skill defuses all three the same way: it never guesses (ask once, persist the answer), it stamps every entry with an `import-id` so re-imports are no-ops, and it only ever suggests accounts that already exist in the ledger.

## Prefer `bea`

Read beancount-init's `references/bea-cli.md` before running ledger commands: it defines explicit root/destination paths, JSON batches, checks, and safe retries. Without `bea`, use beancount-init's `references/compatibility.md`.

- **CSV the mapper can represent:** read `references/bea-import.md`. Pass the
  confirmed sign, mapping, account, rules and destination on every preview
  and apply. Keep rules in the ledger repository after confirmation. Run the
  additional ±3-day manual-entry duplicate review; CLI duplicate detection
  alone does not cover it.
- **OFX/QIF or unsupported CSV semantics:** run the normalization, dedup,
  suggestion and confirmation stages below, then use the shared JSON batch
  recipe, preserving `import-id` and flags. This also handles mixed per-row
  duplicate decisions that a single `--duplicates` policy cannot express.
- **Tested Beangulp workflows:** enable with `bea engine enable beangulp`
  (requires system libmagic), then `bea ingest identify|extract|archive` with
  the actual runner supplied via `--config`. Ordinary CSV needs no Beangulp.

The agent interprets the source and reviews the rows; `bea` validates and
writes the approved directives. Do not append directive text on this path.

## Scope — what this skill does and does not touch

**Does:** parse one export file per run; stage, dedup, and categorize its rows; **append** confirmed transactions (with `import-id` metadata) and any needed `open` directives to one existing file.

**Does not:** edit or delete existing entries; create the target file (it must already exist and be reachable from the main file — a file nothing `include`s silently swallows entries); fetch data from banks (see `references/getting-data.md` for how users export, incl. SimpleFIN); reconcile balances (that is `beancount-reconcile` — suggest running it after a large import); touch `option`, `plugin`, or `include` directives.

Read `references/formats.md` before parsing any new or format-changed source (repeat imports with a stored config stanza apply the stored mapping directly) and `references/dedup.md` before the dedup pass. Both encode edge cases that are easy to get wrong.

## Workflow

Seven stages, in order: **Discover → Normalize → Stage → Dedup → Suggest → Confirm → Write + Verify.**

### 1. Discover

Find beancount files in the working directory:

```bash
fd -e beancount -e bean . | head -20
# fallback: find . -maxdepth 4 \( -name '*.beancount' -o -name '*.bean' \)
```

The "main" file has `option`/`plugin`/`include` directives at the top, or is the largest with `open` directives. Then establish:

- **Source account** — which open account this export belongs to (e.g. `Assets:Bank:Checking`, `Liabilities:CreditCard:Amex`). Map from the user's words or the file's contents; if ambiguous, ask — never guess which account an export feeds.
- **Config block** — for every source, including CSV through `bea`, a comment block at the top of the main file starting with `;; beancount-import config`. It records, per source, everything learned on the first import so repeat imports ask zero questions. Re-read it rather than re-detecting.
- **Append target** — the file where this account's transactions live (main file or an included sub-file, possibly year-bucketed). It must already exist.
- **Payee history** — the ledger's existing payee→account patterns (the Suggest stage's training data).

Config block format — one `source` stanza per export source:

```
;; beancount-import config
;; source: chase-checking
;;   account: Assets:Bank:Checking
;;   format: csv  columns: date=1,desc=2,amount=3  date_format: MDY  sign: negative=outflow
;;   append_target: ./transactions/2026.beancount
;;   imports: 3
;; source: amex-card
;;   account: Liabilities:CreditCard:Amex
;;   format: csv  columns: date=1,desc=2,debit=3,credit=4  date_format: MDY  sign: debit=outflow
;;   append_target: ./transactions/2026.beancount
;;   imports: 1
;; source: other-bank
;;   account: Assets:Bank:Savings
;;   format: csv  columns: date=1,desc=2,amount=3,type=4  date_format: MDY  sign: type=D|W=outflow,C=inflow
;;   append_target: ./transactions/2026.beancount
;;   imports: 1
```

Bump `imports:` only when entries are written (a fully-deduped no-op changes nothing). For sources requiring custom normalization, **when it reaches 3+, suggest once**: "you've imported this source N times — want me to codify it as a tested beangulp importer via `beancount-importer-author`?" Simple CSV mappings already provide repeatable imports and need no graduation nudge. For CSV, also record the exact `csv_mapping:` including `sign=bank|ledger`, `date_format:` as a strptime format, and durable `rules:` path. These supplement the human-readable source settings; `bea`'s cache does not preserve sign.

### 2. Normalize

Turn the file into normalized rows: `date, amount (ledger sign), payee/description, pending?, native-id?`. **Read `references/formats.md` first.** In brief:

- Detect CSV vs OFX vs QIF. OFX rows carry a `FITID` (the native ID — feeds dedup); CSV/QIF usually don't.
- First time seeing a source: propose the column mapping, **confirm it with the user, persist it after the write confirmation** to the config block. Repeat imports: apply the stored mapping silently.
- Map amounts to the ledger's sign convention for the source account — the full sign rules live in `references/formats.md` (canonical; same convention as beancount-reconcile). Debit/credit split columns, all-positive amounts with a type column, DMY vs MDY — when ambiguous, **ask, never guess**. A wrong guess here corrupts every row.

### 3. Stage

Build candidate transactions in memory — **nothing touches the ledger yet**. One candidate per normalized row: date, flag (`!` if the source marks it pending, else `*`), payee, source-account posting at the exact row amount, counter-account left for Suggest, `import-id` computed per `references/dedup.md`.

### 4. Dedup

**Read `references/dedup.md` first.** Two layers, in order:

1. **Exact** — scan existing entries for `import-id` metadata matching a candidate's ID. Match → drop the candidate, count it as *already imported*.
2. **Fuzzy** — for surviving candidates, look for existing entries **without** import-id metadata (manual or pre-convention entries) posting the same amount to the source account within ±3 days with a similar description. Each hit becomes a *suspected duplicate*: shown in the review table for the user to decide keep/skip — never silently skipped, never silently double-entered.

Use the same confirmed sign, account, and source identities on every run. Exact reimports yield **zero** new entries; unresolved or previously skipped fuzzy matches still need review. Read `references/bea-import.md` before treating a CLI preview as complete deduplication.

### 5. Suggest

Categorize each candidate's counter-account from the ledger's own history. **Read `references/categorization.md` first.** The hard rules:

- The candidate set is **exactly the accounts already opened in the ledger**. Never invent an account, however plausible.
- Confident prior for the payee → reuse it, cite it as the reason. No confident prior → `Expenses:Uncategorized` (propose its `open` if missing) and flag for refinement.
- Every suggestion carries a confidence (high / medium / low) and a one-line reason, shown in the review table.

### 6. Confirm

Show the user everything, then ask. **Never write before an explicit yes.**

**Nothing to import** (every row already imported, no suspected-duplicate decisions open): skip the review table and the yes/no prompt entirely — report the no-op ("4 already imported, 0 new — nothing to do") and write nothing, not even the config block.

1. **Target file** — one explicit path.
2. **Summary counts** — rows in file / already imported (skipped) / suspected duplicates (awaiting decision) / to import.
3. **Suspected duplicates** — each with the existing entry it may duplicate; ask keep or skip.
4. **New `open` directives** — only if needed (typically `Expenses:Uncategorized`).
5. **Review table** — one line per candidate: date, payee, amount, suggested account, confidence, reason.
6. A clear **yes/no** prompt; on partial disagreement, let the user correct specific rows and re-present.

Example:

```
Target file: ./transactions/2026.beancount
Source: chase-checking → Assets:Bank:Checking (May 2026 export, 12 rows)

Already imported (skipped):  4
Suspected duplicates:        1   → 2026-05-03 "ACME REFUND" 25.00 may duplicate the manual
                                   entry dated 2026-05-04 — import anyway, or skip? (skip/import)
To import:                   7

New account opens:
2026-05-01 open Expenses:Uncategorized

| date       | payee              | amount  | account                  | conf | reason                     |
|------------|--------------------|---------|--------------------------|------|----------------------------|
| 2026-05-07 | TRADER JOES #123   | -54.20  | Expenses:Food:Groceries  | high | 6 prior TRADER JOES entries|
| 2026-05-22 | CITY PARKING AUTH  | -12.00  | Expenses:Uncategorized   | low  | no prior match — refine    |
| …          |                    |         |                          |      |                            |

Append these 7 transactions to ./transactions/2026.beancount? (yes/no)
```

### 7. Write + Verify

After the user's yes:

1. Create the approved durable rules file and open any approved missing
   accounts using the shared root-scoped `add open` recipe.
2. Re-preview CSV with the complete confirmed options and final rules path.
   Apply using `references/bea-import.md`, or write the approved normalized
   batch with the shared `add transactions` recipe and explicit `--into`.
   Preserve every external row's `import-id`; batch writes do not deduplicate.
3. Update only the reviewed config comment block, then run
   `bea --file "$ledger" --json --no-input check` on the **root**.

On success report imported/skipped counts, duplicate decisions, and flagged
uncategorized rows. Suggest beancount-reconcile after a large import.
On failure surface the exact error and any earlier successful steps. Inspect
current IDs before retrying; a failed assertion or later command does not
undo a successful transaction batch. Never report an unvalidated success.

The no-`bea` write/check procedure is in beancount-init's
`references/compatibility.md`; keep the same proposal and dedup semantics.

## What NOT to do

- Don't write anything without an explicit yes, and never to a file that doesn't already exist.
- Don't guess column semantics, sign conventions, or date formats — ask once, persist to the config block.
- Don't invent account names — existing accounts or `Expenses:Uncategorized`, nothing else.
- Don't silently skip or silently import a suspected duplicate — the user decides.
- Don't edit existing entries, and don't import the same file's rows twice (import-id is the guarantee).
- Don't reconcile, migrate full SaaS history, or build reusable importers — route to `beancount-reconcile`, `beancount-migrate`, `beancount-importer-author`.
