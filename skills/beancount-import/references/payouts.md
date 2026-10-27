# Payment-processor payout exports (CSV)

A payment processor's balance or payout export (Stripe's balance history, a
Shopify payouts report, and their kin) imports through the same seven stages
as a bank export. It differs from a bank export in two ways: each sale arrives
**gross**, with the processor's fee and any collected tax beside it, and the
money reaches the bank later as a **payout** that bundles many sales. Booking
the bank deposit alone merges revenue and fees; booking both the sales and the
deposit as income counts the revenue twice. This reference keeps them apart.
The account names follow the suite's Business books convention
([ADR025](https://github.com/bex-co/beancount-io/blob/main/docs/adrs/ADR025-skills-business-books.md)).

## The model

- `Assets:Clearing:<Processor>` (for example `Assets:Clearing:Stripe`) holds
  money the processor has collected and not yet paid out. Sales and refunds
  move through it; each payout empties it into the bank.
- A sale credits the income account (or, when it settles an open invoice, the
  receivable with that invoice's `invoice:` — beancount-invoices' rules in
  `references/categorization.md`, Payments of open invoices) at the **gross**,
  the fee goes to the ledger's fees account, and the clearing account receives
  the net. A tax amount the row states goes to the collected-tax account
  (`Liabilities:SalesTax` unless the ledger names its own).
- A refund reverses its sale's legs at the amounts the row states.
- A payout moves the payout total from the clearing account to the bank
  account the user confirms.

Missing accounts are proposed as `open`s in the review, as everywhere in the
suite.

## Columns and the stored mapping

First import from a source: propose the mapping, confirm it, and persist it in
the config block like other non-mapper sources:

```
;; source: stripe-balance
;;   account: Assets:Clearing:Stripe
;;   format: payout-csv  columns: id=id,date=Created (UTC),type=Type,description=Description,gross=Amount,fee=Fee,net=Net,payout=Transfer  date_format: %Y-%m-%d %H:%M
;;   type_map: charge=sale,payment=sale,refund=refund,stripe_fee=fee,payout=payout,adjustment=adjustment
;;   bank_account: Assets:Checking
;;   append_target: ./transactions/2026.beancount
;;   imports: 1
```

Required per row: `date`, `type`, and the figures its type needs — `gross`,
`fee`, and `net` for a sale or refund, the amount for a fee or payout. A row
whose figures do not satisfy gross − fee = net (the export's own arithmetic)
is shown and asked about. Map each raw type once, confirmed and stored in
`type_map`; a type with no mapping stops the import for that row. `adjustment`
rows (disputes, reserves, corrections) are shown with the export's own wording
and the user names the account; they are never folded into a sale.

## Gate: every payout ties to its rows

When the export carries the payout each row belongs to, the rows of one payout
must add up to the payout's total before anything is staged. Compute it with
the engine's decimal arithmetic and quote the output — `$rows_net` is the
payout's rows' net figures as a parenthesized sum of decimal literals,
`$payout_total` the payout amount, both positive as paid out:

<!-- recipe: payout-tie -->
```sh
bea --file "$ledger" --json --no-input query "SELECT $rows_net AS rows_net, $payout_total - $rows_net AS gap FROM #accounts LIMIT 1"
```

A nonzero `gap` stops that payout: show its rows and the gap — a row outside
the export's date range, a reserve, a missing fee row. Never stage a payout
whose rows do not tie, and never add a balancing row.

## Dedup

Rows with a processor id take the native form, `import-id:
"<processor>:<id>"` (for example `"stripe:txn_1Q2w3e"`); rows without one take
the ordinary `csv:sha256` form from `references/dedup.md`. Exact re-import
adds zero entries. The payout row's transfer to the bank is the other side of
the deposit a later bank import will see: that import's Layer 2b
(`references/dedup.md`) offers the deposit as a suspected duplicate of the
payout transfer, and the user skips it there. After both imports, the
clearing account holds only sales whose payout has not yet arrived:

<!-- recipe: clearing-balance -->
```sh
bea --file "$ledger" --json --no-input query "SELECT sum(number) AS in_transit WHERE account = '$clearing' AND date < $as_of"
```

## Review

The review table shows, per payout: the payout total, its rows (date, type,
gross, fee, tax, net, and the account each lands in), the `payout-tie` output,
and the bank account the payout moves to. Write the confirmed rows as one
`batch` (structured units, `meta.import-id` per row); one bad row rejects the
whole batch and names it, and `--partial` is never passed.
