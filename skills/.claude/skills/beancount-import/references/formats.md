# Export formats — detection, parsing, column mapping

## Detection

| Signal | Format |
|---|---|
| Starts with `OFXHEADER:` or contains `<OFX>` | OFX (or QFX — same parsing) |
| Lines starting `!Type:`, fields prefixed `D`/`T`/`P`/`^` | QIF |
| Delimited rows, first line usually a header | CSV |

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

Sources mark pending as a status column (`Pending`/`Posted`), OFX by omission (pending usually absent), or a separate file section. Pending rows: flag `!`, import normally — but warn the user that when the transaction settles, the bank may re-export it with a different date/amount (and for OFX a different FITID), which will surface as a fuzzy suspected duplicate; resolving those is exactly what the suspected-duplicates review is for. `beancount-reconcile` is the tool that later flips `!` confidence into a proven balance.

## Multi-currency

If a row carries a currency different from the source account's, stop and ask — currency conversion postings (`@@`) are out of scope for auto-staging; propose the row with the user's explicit price or skip it.
