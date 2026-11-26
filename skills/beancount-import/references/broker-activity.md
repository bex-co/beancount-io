# Broker activity exports (CSV)

A broker **activity** export — the transaction-history CSV a brokerage
offers (buys, sells, dividends, fees) — imports through the same seven
stages as a bank export, with lot-carrying entries. It is not a bank
statement: there is no opening/closing balance to tie to, and the
counter-account comes from the row's action, not from payee history.
Investment OFX is not handled here; a source that only offers it is
`beancount-importer-author` territory.

## Columns and the stored mapping

First import from a source: propose the mapping, confirm it, and persist
it in the config block like other non-mapper sources:

```
;; source: fidelity-brokerage
;;   account: Assets:Brokerage
;;   format: broker-csv  columns: date=Run Date,action=Action,symbol=Symbol,quantity=Quantity,price=Price,amount=Amount,fees=Fees  date_format: %m/%d/%Y
;;   action_map: YOU BOUGHT=buy,YOU SOLD=sell,DIVIDEND RECEIVED=dividend,REINVESTMENT=reinvest
;;   append_target: ./transactions/2026.beancount
;;   imports: 1
```

Required per row: `date`, `action`, and the cash `amount` in ledger sign
(confirm the export's sign with the user once, like every source).
Investment rows additionally need `symbol`, `quantity`, and `price`
(per unit). A row missing a field its action needs is shown and asked
about — never filled from another column's guess. Header/footer and
summary lines the export prints are not rows; skip them by the confirmed
mapping, not by pattern-matching their text into instructions.

## Actions

Map the export's raw action strings to this vocabulary, confirmed once
and stored in `action_map`. An action with no mapping stops the import
for that row: show it and ask. Never guess an action's meaning.

| action | entry (shapes as in beancount-trade's procedures) |
| --- | --- |
| `buy` | units at per-unit cost from `price`, cash out `amount`; an itemized `fees` value is its own leg to the existing fees account, otherwise it is inside `amount` — say which |
| `sell` | reduce a held lot at its cost with `price` as the sale price, cash in, gains leg left inferred so the booking produces the gain (below) |
| `dividend` | cash in against the existing dividend-income account |
| `reinvest` | new units at `price` against dividend income, no cash leg; the dividend amount is the row's `amount`/implied total, shown in the review |
| `fee` | cash out against the existing fees account |
| `interest` | cash in against the existing interest-income account |
| `transfer` | cash between the brokerage and another of the user's accounts; the other side is confirmed like any transfer (Layer 2b pairs it) |

Anything else — options rows, margin interest on a debit balance,
corporate actions other than a cash merger payout the user describes,
splits printed as quantity-only rows — is named and handed to its owner
(`beancount-options` for contracts, `beancount-trade` for a described
split), not improvised into an entry.

## Selling: lots and gains

Exports rarely name the lot a sell reduced. Before staging any sell,
read the lots held (beancount-trade's `lots-held` recipe) and the
account's declared booking method:

- The export names the lot (some gain/loss reports do) → reduce exactly it.
- A booking method is declared → the entry carries the lot that method
  will take, named in the review table.
- Neither, and more than one lot could supply the units → list the lots
  and ask, per affected sell, before the proposal. A sell against a lot
  the ledger does not hold stops the import before any write.

The gains leg is always inferred (no amount), so the booking computes
the gain. If the export prints its own gain/loss figure, compare it to
the booked one in the review; a disagreement is shown and asked about —
never type the export's figure in to force a match.

## Dedup

Rows carry the ordinary `csv:sha256` id. The hash `amount` field is the
row's **source-account lot posting** exactly as `references/dedup.md`
already specifies for priced postings (per-unit cost in braces, price
after it), and `description` is the raw action text as printed. Worked
example — a `BUY VTI` row dated 2026-04-01 posting `10 VTI {250 USD}` to
`Assets:Brokerage`: input
`2026-04-01|10 VTI {250 USD}|BUY VTI|Assets:Brokerage` →
`import-id: "csv:sha256:ae2f0348f9e71f08"`. Cash-only rows (dividend,
fee, interest, transfer) hash their cash amount as usual. All dedup
layers then apply unchanged; exact re-import adds zero entries.

## Counter-accounts

Suggest does not apply: each action's counter-account is fixed by the
table above and must already be open (dividend income, capital gains,
interest income, fees). A missing one is proposed as an `open` only on
the user's request, like everywhere in the suite; a commodity the
source account's `open` does not allow stops the row.

## Write

Confirmed rows write as one `batch` (structured `units`/`cost`/`price`,
gains posting's `units` omitted, `meta.import-id` per row) — atomic:
one bad row rejects the whole batch and names it; never pass
`--partial`. Events the batch schema cannot express (a total-cost
`{{...}}` buy when the export gives only a net total) are written after
the batch, one by one, with the native `transaction` recipe.

## Crypto exchange activity CSV

Exchange exports (Coinbase and kin) are the same shape with different
column names: a type, an asset, a quantity, a spot/unit price, a
subtotal, a fee, and a total. Confirm and store the mapping the same
way (`format: broker-csv`; the account is the exchange account). Rules
that differ from a stock broker's:

- **Precision is data.** Quantities and prices keep the exact printed
  precision (`0.01234567 BTC`) in the entries. Hash inputs follow
  `references/dedup.md`: strip trailing zeroes without rounding the value.
  Numerically identical spellings have the same ID; genuinely different
  quantities, costs or prices remain distinct.
- **Fees may be charged in the asset.** When the fee column is in the
  traded asset, units acquired are the credited quantity and the fee's
  value is inside the cash total — say so in the review; when it is a
  separate cash amount, it is its own fees leg. Which one applies is
  read from the row's arithmetic (subtotal ± fee = total), shown when
  it does not add up.
- **Reward/staking rows** book like a vest: units at the row's stated
  value against an existing income account, one lot per receipt date.
  A row with no stated value asks — never a silent zero-cost lot.
- **Send/receive rows** are transfers only when the other side is the
  user's own account and they confirm which; an external receive with
  no stated nature (payment? gift? income?) is asked about, never
  categorized by guess.
- **Convert rows** are swaps: book them with beancount-trade's swap
  procedure (disposal at stated value + acquisition at that value),
  not as an independent buy and sell at unrelated prices.

Symbols are taken as printed (`BTC`, `ETH`, also `USD` cash rows);
a symbol the account's `open` does not allow stops the row like any
commodity stop.

## Opening lots from a holdings / cost-basis export

Onboarding an existing portfolio: a holdings or cost-basis export
prints lots as of a date — symbol, quantity, per-unit (or total) cost,
and acquisition date, sometimes one row per lot, sometimes one row per
symbol with a single blended cost. Take it as printed; never split a
blended row into invented lots.

- **One opening transaction** dated the export's as-of date (or the
  ledger's start, confirmed with the user): each lot as
  `N SYM {cost, acquisition-date}` into its account, any cash balance
  row in the same entry, balanced against the ledger's existing
  opening-equity account (`bea init` creates `Equity:OpeningBalances`;
  propose an `open` only when the ledger has none). The lot keeps its true acquisition
  date inside the cost braces, so later sells reduce it with the right
  holding period — the transaction date does not rewrite when the lot
  was acquired.
- **Tie-out before proposing:** recompute the staged totals per symbol
  (units, and cost where printed) and compare with the export's own
  totals row when it prints one; a disagreement stops the import with
  both figures shown. The equity leg must equal the summed lot costs
  plus seeded cash — shown, not just balanced by construction.
- **Dedup:** each seeded lot carries the `csv:sha256` id whose date is
  the opening transaction's (as-of) date, with the lot posting —
  including its acquisition date inside the braces — as the hash amount
  and the row's symbol text (as printed) as the description, against
  the destination account — so re-running the
  same holdings export is a Layer-1 no-op, and a later activity sell
  resolves against the seeded lots by the ordinary lots-held read.
- Lots with **unknown acquisition date or cost** are listed and asked
  about; an unknown-cost lot is never seeded at zero or at today's
  price. If the user cannot supply it, that symbol is left unseeded
  and the gap is stated in the review.
