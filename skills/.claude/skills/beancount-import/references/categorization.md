# Categorization — few-shot from the ledger's own history

The ledger is the rules database. No separate rules file: every run learns from what the user has already accepted, so the suggestions improve exactly as fast as the ledger grows, and there is no second artifact to drift out of sync.

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
- **Transfers**: if the description matches another open asset/liability account's institution (e.g. "PAYMENT TO AMEX", "TRANSFER TO SAVINGS") and such an account exists, suggest the transfer counter-account (medium unless priors confirm). Warn the user that when they later import the *other* account's export, the mirrored row will surface as a fuzzy suspected duplicate — skip it there rather than double-booking the transfer.

## What the user sees

Every review-table row: suggested account, confidence, and a one-line reason (`"6 prior TRADER JOES entries"`, `"1 prior only"`, `"inconsistent priors: Household ×3, Books ×2"`, `"no prior match — refine"`). The reason is the audit trail — never present a suggestion the user can't see the basis of.
