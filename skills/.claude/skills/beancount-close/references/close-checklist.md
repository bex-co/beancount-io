# Close checklist — procedures and reportable statuses

Every phase ends in a one-line status. A close report with a gap is a *successful close that found things*; a report that hides a gap is a failed close.

## Active-account enumeration

Active = an `Assets:` or `Liabilities:` account with (a) any posting dated in the period, or (b) a nonzero balance at period end:

```sql
SELECT account, sum(cost(position)) as balance
WHERE account ~ '^Assets:|^Liabilities:' GROUP BY account ORDER BY account
```

plus a period-posting check (`WHERE date >= <start> AND date < <end>`). Equity/Income/Expenses accounts are never "reconciled" — they're outputs of the P&L, not statements.

## Reconciliation delegation

Per account with a statement: run the **beancount-reconcile** skill's full flow (Discover → Normalize → Match → Propose → Verify), one account per pass, its confirm gate intact. Statuses:

- **tied** — reconcile appended its period-end assertion and bean-check passes.
- **partial** — reconcile reported suspects/mismatches and (correctly) withheld the assertion; carry its residual into the close report.
- **unverified** — no statement available. Listed, never silently passed. (Cash accounts are perpetually unverified — note "cash, no statement source" so the line doesn't read as an error.)

## Assertion check

For each active account, find the latest `balance` assertion dated ≥ period end + 1 (the day-after rule — see beancount-reconcile). Present → **pinned**; absent → **unpinned**. Don't write assertions here — they come from reconciliation (or the user); an assertion without a statement behind it is a guess wearing a checkmark.

## Recurring completeness

Candidate subscriptions = payees present in each of the prior 2–3 months with steady amounts:

```sql
SELECT payee, year(date) as year, month(date) as month, sum(cost(position)) as total
WHERE account ~ '^Expenses:' GROUP BY payee, year, month ORDER BY payee, year, month
```

Read the month-grid per payee: present in all prior months of the window, absent in the close month, amounts steady (±20%) → **recurring gap** finding. Variable-amount recurrers (groceries, gas) are *not* gaps — mention only subscriptions-like patterns. For each gap ask: charge missing from import? cancelled? moved cards? The answer routes to `beancount-import` (missing data) or nothing (genuinely cancelled — note it).

## Flag sweep

```sql
SELECT date, flag, payee, narration WHERE flag = '!' AND date < <period-end+1> ORDER BY date
```

Each `!` is either resolved by the user during the close (their edit, not this skill's) or **carried** — counted in the report. A close can complete with carried flags; it cannot complete with uncounted ones.

## Report numbers

Income statement for the period, via the beancount-ask recipes (sum over `^Income:` negated, `^Expenses:` by account and total). Balance sheet = the account-balance query at period end. State book-value caveats exactly as beancount-ask does.

## Commit convention

- Stage only the files the close touched (ledger + any statement archive the user keeps in-repo).
- Subject: `close: <YYYY-MM> — <n> reconciled, <m> unverified` — greppable close history.
- Body: the close report verbatim.
- Refuse to propose the commit while bean-check is red; on user decline, leave the tree untouched — a declined close commit must be losslessly resumable.
