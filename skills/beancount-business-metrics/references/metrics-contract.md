# Business metrics contract

## Perimeter and time basis

- **Cash** is what `bea report cash-flow` treats as cash: Assets accounts named like cash (`Cash`, `Checking`, `Savings`, `Bank`) and their children, plus any account whose `open` declares `cash-flow-role: "cash"`. The script prints the accounts and whether each was declared or chosen by name; the user confirms them before the figures are relied on.
- **Transfers between cash accounts** are not flows: they never reach any section, so moving money to savings is neither burn nor income.
- **Time basis:** calendar months by `bea --time YYYY-MM`, at cost, in each currency separately. Months before the ledger's first dated entry are not counted.

## Definitions

| Measure | Definition |
| --- | --- |
| Operating cash flow | the cash-flow report's operating total for the month (inflow positive) |
| Net burn | minus operating cash flow; positive means cash was consumed, negative means operations produced cash |
| Investing, financing | shown beside burn and never included in it. An opening-balance entry against equity appears as financing in the first month |
| Closing cash | the cash-flow report's closing balance at the month end |
| Runway | closing cash at `--through` divided by the average net burn of the last R months (default 3), in months to one decimal |

A runway is **not stated** when: the ledger has fewer than R months of history in the window (`insufficient-history`); the average net burn is zero or negative (`not-burning`); or closing cash is not positive (`no-cash`). The script says which, with the basis.

## Refusals

ARR, MRR, CAC, LTV, churn, retention and cohort measures need a dated customer or subscription dataset and acquisition spend by channel. The ledger does not hold them, so none is computed or estimated; this skill does not compute them even from a dataset the user supplies.

## What can make a figure wrong

A misclassified account (see `heuristic` in the perimeter), an unrecorded payment, an undated or mis-dated entry, and rounding disclosed by the cash-flow report (the script notes a residual). The skill reports these as questions; it does not adjust a number.
