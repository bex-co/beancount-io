# Export formats — detection, parsing, column mapping

## Detection

| Signal | Format |
|---|---|
| Starts with `OFXHEADER:` or contains `<OFX>` | OFX (or QFX — same parsing) |
| Lines starting `!Type:`, fields prefixed `D`/`T`/`P`/`^` | QIF |
| Delimited rows, first line usually a header | CSV |
| A `.pdf` the user names as a bank/card statement | PDF statement (agent extraction, below) |

## CSV

The dominant and least standardized format. First import of a new source: inspect the header + first 3 data rows, propose a mapping, **confirm with the user, persist to the config block**. Repeat imports apply the stored mapping with zero questions — but if the header no longer matches the stored mapping, stop and re-confirm (the bank changed the format; also mention `beancount-importer-author` can codify + test the new format).

**Columns to establish:** date, description/payee, amount (or debit + credit pair), optional: pending/status, balance (ignore — reconcile's job), category (ignore — the ledger's history is the authority, bank categories are noise).

**Amount conventions** (ask when not provable from the data):

- *Signed single column* — usually negative = money out. Verify against a recognizable row (a known purchase should be an outflow).
- *Debit/credit split columns* — two columns, both positive, one empty per row. Debit/credit meaning **flips by account type**: on a bank (asset) export debit usually = money out; card exports vary. Confirm once.
- *All-positive with a type column* (`Type: DEBIT/CREDIT`, `Sale/Payment`) — map the type values, confirm once.

After sign interpretation, map to the **ledger's** convention for the source account: asset in = `+`, out = `−`; liability charge = `−`, payment = `+` (same rule as beancount-reconcile — keep the two skills' config stanzas consistent).

**Dates:** `05/07/2026` is ambiguous (MDY vs DMY). Prove it from the data when possible (a day > 12 disambiguates); otherwise ask once and persist. ISO `2026-05-07` needs no confirmation.

**Payee cleanup:** strip trailing store numbers/reference codes for the *payee* field but keep the raw description as the narration when they differ meaningfully: `payee "TRADER JOES"`, narration `"TRADER JOES #123 SEATTLE WA"`. When in doubt keep the raw string as payee — dedup hashes use the raw description (see dedup.md), not the cleaned payee.

**With `bea`:** follow `references/bea-import.md`. Record the confirmed `--csv` mapping, sign decision, date format, account, durable rules path and destination in the source config. Pass them explicitly on every preview and apply: `bea` does not remember `sign`, and it remembers only the rules file's path. `sign=bank` preserves the source signs; `sign=ledger` negates them. Check the resulting postings against an actual purchase/payment before approval. Use a normalized JSON batch when a type column or pending status cannot be expressed by the mapper.

## OFX / QFX

XML-ish; each transaction is an `<STMTTRN>` block:

```
<STMTTRN>
  <TRNTYPE>DEBIT</TRNTYPE>
  <DTPOSTED>20260507120000</DTPOSTED>
  <TRNAMT>-54.20</TRNAMT>
  <FITID>2026050701</FITID>
  <NAME>TRADER JOES #123</NAME>
</STMTTRN>
```

- `DTPOSTED` — take the first 8 digits as YYYYMMDD.
- `TRNAMT` — already signed from the account's perspective; still verify direction against one recognizable row.
- **`FITID` — the bank's stable unique ID. Always use it as the import-id (`ofx:<FITID>`)**; this is the strongest dedup signal available anywhere.
- `NAME` (+ optional `MEMO`) — payee/narration.

## QIF

Line-tagged records terminated by `^`: `D` date, `T` amount, `P` payee, `M` memo, `C` cleared status. No native ID → hash-based import-id. Date format inside QIF is still locale-ambiguous — same MDY/DMY rule as CSV.

## Pending rows

Sources mark pending as a status column (`Pending`/`Posted`), OFX by omission (pending usually absent), or a separate file section. Pending rows: use the pending flag (an exclamation mark) and import normally — but warn the user that when the transaction settles, the bank may re-export it with a different date/amount (and for OFX a different FITID), which will surface as a fuzzy suspected duplicate; resolving those is exactly what the suspected-duplicates review is for. `beancount-reconcile`'s balance assertion later proves the account's total; it does not clear pending flags — the user does.

## PDF statement

No delimiter structure and usually no machine-readable alternative — the bank offers only this. Extraction (period, opening/closing balances, dated transaction lines, sign tables, the sanity walk) is **shared with beancount-reconcile**: follow its `references/statement-formats.md` (`../../beancount-reconcile/references/statement-formats.md`), do not keep a second copy here. The import-specific rules:

- Capture each row's **page and line** while extracting; the review table shows them.
- Skip lines that are not transactions: page subtotals, "balance brought/carried forward", interest-summary and fee-summary totals, and the opening/closing balance lines themselves.
- The sanity walk is a **gate**, not a warning: opening + movements must equal the printed closing balance before any row is staged. On a gap, stop and show the figures read — a misread digit is the usual cause.
- The description hashed for `import-id` is the line **as printed** (`pdf:sha256`, see `dedup.md`) — copy it, joining wrapped lines with one space; never paraphrase.
- A statement covering several accounts at once, or brokerage holdings/lots, is out of scope: say so and stop rather than splitting it by guesswork.
- When your client cannot open the PDF, ask the user to paste its text or export CSV instead; the pasted text follows the same rules, minus page numbers (use pasted-line numbers).

## Multi-currency

If a row carries a currency different from the source account's, stop and ask — currency conversion postings (`@@`) are out of scope for auto-staging; propose the row with the user's explicit price or skip it.
