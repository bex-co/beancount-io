---
name: beancount-migrate
description: Migrate full transaction history from Mint, Monarch, QuickBooks Online or another category-tagged finance-app export into a fresh Beancount ledger. Confirm account/category mappings, pair transfers, preserve source IDs, write through bea and reconcile source counts and balances. Skip ongoing bank imports, populated-ledger merges and investment lot reconstruction.
---

# beancount-migrate

Turn a finance-app export into a complete, verified beancount ledger — mapped accounts, full history, deduplicated transfers, opening balances, and a migration report that proves nothing was dropped.

This skill exists because every app shutdown (Mint, Bench, …) strands users with one CSV and no way to trust a conversion: categories don't map 1:1 to double-entry accounts, transfers appear twice (once per account), and a silently dropped row is invisible until a balance is wrong months later. The skill converts *with receipts*: every count and balance is reconciled against the source, and everything unmappable is surfaced, never guessed.

## Prefer `bea`

Read beancount-init's `references/bea-cli.md` before running ledger commands: it defines explicit root/destination paths, JSON batches, checks, and safe retries. Without `bea`, use beancount-init's `references/compatibility.md`.

Compose beancount-init, then write approved accounts, transaction batches and
endpoint assertions through `bea`. Fava is optional. Mapping, transfer pairing,
source identities, and the migration report remain this skill's work.

## Scope — what this skill does and does not touch

**Does:** convert one export (possibly covering many source accounts) into a fresh ledger; propose and confirm the account hierarchy before converting; pair transfers; construct opening balances; emit a migration report; run the root-ledger `bea check`.

**Does not:** talk to any app's API (exports only); backfill investment lots/prices (holdings rows are surfaced as follow-up work, not converted); merge into an existing populated ledger (offer `beancount-import` for that); invent category mappings the user didn't confirm.

Read `references/mapping.md` before proposing any hierarchy, and the per-source reference (`references/mint.md`, `references/monarch.md`, `references/qbo.md`) before parsing. Unknown source? Inspect the header, then follow `mapping.md`'s generic path.

## Workflow

Six phases, in order: **Identify → Scaffold → Map → Convert → Verify → Report.**

### 1. Identify

Inspect the export's header row and a few data rows. Recognize the source (Mint / Monarch / QBO — see references) or fall back to the generic category-tagged-CSV path. Establish: the distinct **source accounts** in the file, the **distinct categories**, the **date range**, the **row count**, and the sign/type convention. Ask for anything ambiguous — never guess signs or dates.

Also ask up front for each source account's **current balance** (from the old app or the real bank) — opening balances depend on it (see mapping.md). If the user also knows the balance at the **start of the export period**, collect it: anchoring on a stated opening (instead of back-deriving one) makes the endpoint assertion a real check rather than a tautology.

### 2. Scaffold

If there is no ledger, compose **beancount-init** with an explicit historical open date: the day before the earliest source row, so account opens also cover the opening-balance transactions. Run `bea --no-input init . --currency CURRENCY --date OPEN_DATE` through that flow. Do not initialize with today's date and patch the opens afterward. If a populated ledger already exists, offer beancount-import instead; this skill targets fresh starts.

### 3. Map

Propose, then **confirm before converting**:

1. **Account mapping** — each source account → `Assets:…` or `Liabilities:…` (type from the source metadata or the user).
2. **Category mapping** — each distinct source category → an `Expenses:…` or `Income:…` account, as a reviewable table (`Groceries → Expenses:Food:Groceries`). Follow `references/mapping.md`'s shaping rules. Categories with no sensible mapping go to `Expenses:Uncategorized` — listed explicitly, never silently absorbed.
3. **Transfer categories** — which source categories mean "transfer between my own accounts" (e.g. Mint's `Transfer`, `Credit Card Payment`). These pair up, not double-book (mapping.md).

Present all three tables together as one review; the user edits them in place and a **single explicit yes** covers all three — only then does Convert run.

### 4. Convert

- One transaction per non-transfer row: source-account posting at the row amount (ledger sign), counter-account from the confirmed category mapping.
- **Transfer pairs** (same amount, opposite direction, ≤3 days apart, transfer-mapped categories, different source accounts) merge into **one** two-posting transaction. Unpaired transfer rows go to a `transfers to review` list, converted against `Equity:Transfers-Review` so totals still tie.
- Every entry carries `import-id` metadata per the `beancount-import` convention (`references/dedup.md` there): native row ID if the export has one, else `<source>:sha256:<16-hex>` with the same normalization. A merged transfer pair covers **two** source rows — record one row's id as `import-id` and the other as `import-id-2` so a later `beancount-import` of either account exact-matches its side and doesn't double-book the transfer.
- **Opening balances**: prefer a stated opening when available; otherwise derive `opening = stated current balance − Σ(converted rows)` and label it as derived. Date it the day before the earliest row and post against the existing opening-equity account (`bea init` creates `Equity:OpeningBalances`). An endpoint assertion **dated the day after the last row** pins the stated ending balance; with a derived opening this is a consistency check, not independent evidence that source rows are complete.
- Open each missing mapped account with `bea --file "$ledger" --json --no-input add open --date "$open_date" --account "$account" --into "$open_target"`; do not duplicate accounts already opened by init.
- Build one approved JSON batch containing the opening transactions and converted history, including both IDs on merged transfers. Write it with `bea --file "$ledger" --json --no-input add transactions --from "$batch" --into "$target"`.
- Then write each passing endpoint assertion with `bea --file "$ledger" --json --no-input add balance --date "$assertion_date" --account "$account" --amount "$amount" --into "$target"`. These are separate commands; a failed assertion does not undo the history batch. Inspect the ledger before resuming to avoid duplicating it.

### 5. Verify

Run the checks; a migration that can't show its math didn't happen:

- **Row count**: source rows = non-transfer transactions written + 2×(transfer pairs merged) + skipped rows (each listed with a reason) — a merged pair is 2 source rows but 1 transaction, so count it on the pairs side, not the transactions side.
- **Balances**: per account, opening + Σ(rows) must equal the stated current balance — this is what the appended `balance` assertion enforces via `bea check`.
- **`bea --file "$ledger" --json --no-input check`** on the root ledger. Any failure: surface the exact output, do not report success.

If a stated opening plus the movements disagrees with the stated ending, the attempted `balance` assertion is refused before it is written — **surface the delta and its likely causes** (rows missing from the export, pending transactions, wrong stated balance); never adjust numbers to force a pass, never delete the assertion to hide it. Offer the residual as an explicit `Equity:Migration-Residual` posting **only** if the user explicitly accepts the discrepancy.

### 6. Report

End with the migration report (also saved as `MIGRATION.md` in the repo if the user wants):

```
Source: Mint export, 2023-01-05 … 2026-07-15, 2 accounts, 1,214 rows
Converted: 1,180 transactions   Transfer pairs merged: 16 (32 rows)
Skipped: 2 rows (listed below, with reasons)
Unmapped categories → Expenses:Uncategorized: "Misc" (14 rows), "Stuff" (3 rows)
Balances: Assets:Bank:Checking ✓ ties to 3,412.55   Liabilities:CC:Amex ✓ ties to -210.40
bea check: PASS
Next steps: refine Expenses:Uncategorized rows; optional `make start` for Fava if scaffolded; use beancount-import for ongoing weekly imports.
```

## What NOT to do

- Don't convert before the account and category mappings are explicitly confirmed.
- Don't guess a mapping — unmapped means `Expenses:Uncategorized`, visibly reported.
- Don't double-book transfers, and don't silently drop unpaired transfer rows.
- Don't hide a count or balance delta — surface it; never force a tie-out.
- Don't convert investment holdings/lots — flag as follow-up.
- Don't write anything outside the fresh ledger repo (the user-approved beancount-init scaffold excepted), and no transactions before the mapping confirm.
