# Categorization — few-shot from the ledger's own history

The ledger is the source of every suggestion: each run learns from what the user has already accepted, so the suggestions improve exactly as fast as the ledger grows. On the `bea` CSV path the reviewed categories are also encoded in the source's durable rules file; it must reproduce the reviewed per-row categories and is read before reuse (`references/bea-import.md`), so the ledger's history stays the authority.

## Procedure

1. **Collect history** — every existing transaction posting to the source account (plus, thinly weighted, the rest of the ledger): `(payee/description, counter-account, date)` triples.
2. **Match the candidate's description** against history payees:
   - *Exact/prefix merchant match* (`TRADER JOES #123` vs prior `TRADER JOES #089`) — strong.
   - *Token overlap* on distinctive words (ignore numbers, store codes, city/state suffixes) — medium.
   - Nothing similar — no match.
3. **Pick the account**: most frequent counter-account among matches; break ties by most recent. If the same merchant maps to multiple accounts inconsistently (e.g. AMAZON → sometimes `Expenses:Household`, sometimes `Expenses:Books`), that is a **medium** at best — say why in the reason column.
4. **Assign confidence**:

| Confidence | Criteria | Review-table behavior |
|---|---|---|
| high | ≥2 consistent priors for a strong match | pre-filled, reason cites the priors |
| medium | 1 prior, or consistent-but-weak match, or inconsistent priors | pre-filled, reason flags the doubt |
| low | no usable prior | `Expenses:Uncategorized`, reason "no prior match — refine" |

## Hard constraints

- **The candidate set is the ledger's open accounts. Period.** Never propose an account that has no `open` directive, however obviously named — an invented `Expenses:Coffee` that the user actually books under `Expenses:Food:Coffee` splits their history and poisons future few-shot matching. The single exception: `Expenses:Uncategorized`, whose `open` the skill proposes explicitly in the Confirm stage when missing.
- **Ignore the bank's own category column.** Bank taxonomies don't map to the user's chart of accounts; the ledger's history is the only authority.
- **Directional sanity check**: an inflow on an asset account suggesting an `Expenses:` counter-account (or an outflow suggesting `Income:`) is almost always wrong — a refund is the exception. When history says `Expenses:` for an inflow (refund pattern), keep it but say "refund?" in the reason; otherwise fall back to low confidence.
- **Transfers**: if the description matches another open asset/liability account's institution (e.g. "PAYMENT TO AMEX", "TRANSFER TO SAVINGS") and such an account exists, suggest the transfer counter-account (medium unless priors confirm). Write the source posting first, as `bea import` does. Warn the user that when they later import the *other* account's export, the mirrored row will surface as a suspected duplicate of this transfer (dedup.md Layer 2b; `bea import` reports it as a possible duplicate), however that bank words it — skip it there rather than double-booking the transfer.

## Payments of open invoices

When the ledger tracks invoices (open receivable balances from beancount-invoices' `invoice-open` recipe in its SKILL.md), an inflow equal to one open invoice's balance is offered as that invoice's payment instead of income: the other leg is the receivable with the invoice's `invoice:` and link, shown beside the invoice it would clear, and written only with the row's yes. An inflow equal to the sum of several open invoices, or matching two equally, is asked about. A deposit smaller than an invoice's balance is offered as a part payment only when the user names the invoice. Never apply a payment silently. Such rows take the normalized batch path, since the receivable posting carries the invoice's metadata.

## Client and project

When the source account's history attributes entries with `client:` or `project:` metadata (the suite's Business books convention), suggest a candidate's value from the same matches that suggest its account: a value every attributed match agrees on is proposed with its count, disagreeing matches are shown as a question, and no attributed match means no key. Never invent a value, and show it in the review table beside the account. On the `bea import --csv` path, a confirmed value goes into the matching rule's `client` or `project` key; where `bea` cannot take those keys, the attributed rows take the normalized batch path with the key in each transaction's `meta` (`references/bea-import.md`).

## What the user sees

Every review-table row: suggested account, confidence, and a one-line reason (`"6 prior TRADER JOES entries"`, `"1 prior only"`, `"inconsistent priors: Household ×3, Books ×2"`, `"no prior match — refine"`). The reason is the audit trail — never present a suggestion the user can't see the basis of.
