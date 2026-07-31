# Monarch export format

Monarch's transactions CSV (Settings → Data → Download transactions):

```
"Date","Merchant","Category","Account","Original Statement","Notes","Amount","Tags"
"2026-05-07","Trader Joes","Groceries","Chase Checking","TRADER JOES #123 SEATTLE WA","","-54.20",""
```

Parsing rules:

- **Dates are ISO** (`YYYY-MM-DD`) — no ambiguity.
- **Amounts are signed**: negative = money out, positive = money in, from the account's perspective. Verify once against a recognizable row, then map to ledger signs.
- **`Merchant`** → payee; **`Original Statement`** → narration when different, and the `import-id` hash input.
- **`Account`** — drives account mapping; one file covers all accounts.
- **Transfers**: category `Transfer` (Monarch also auto-pairs "Credit Card Payment" under Transfer in most setups). Both sides appear; pair per mapping.md.
- **`Tags`** — carry as `#tag` beancount tags (sanitize to beancount tag charset) if present.
- Categories are user-editable in Monarch, so expect a messier distinct-category list than Mint; the merge-near-duplicates rule in mapping.md matters here.
- **No balances in the file** — ask for current balances per mapping.md. If the user still has Monarch access, the account screen shows them; if the subscription lapsed, use the real bank's current balance and expect pending-transaction deltas (surface per mapping.md).
