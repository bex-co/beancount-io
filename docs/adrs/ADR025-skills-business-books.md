# ADR 025: Business books in the customer skill suite

- Status: Proposed
- Date: 2026-10-26
- Decision owners: Customer-facing skills (`skills/`); the `bea` CLI for the import-rule key in [w2/m55](../../.pm/w2/blocked/m55/README.md)
- Scope: The names, identities, and boundaries every business-books procedure in the suite shares: receivables and payables, invoice and bill identity, the client/project dimension, collected tax, payroll liabilities, processor clearing, owner equity, where each procedure lives, and what the suite will not do. This record implements nothing; [w2/m55–m59](../../.pm/w2/README.md) build on it.

## Context

A small-business owner reviewed the suite in October 2026 as a five-person services company: client invoices, two contractors, business checking and cards, payroll through a provider, and quarterly tax remittances. Capture, reconciliation, and close worked. Everything that makes business books differ from household books was missing: money owed in and out, payroll, collected tax, a client/project dimension, and a business chart of accounts.

Verified on `main` (2026-10-26):

- No customer skill has an invoice, bill, receivable, payable, payroll-run, or collected-tax procedure. `beancount-migrate`'s QuickBooks reference converts payments and skips invoice and bill rows ([`qbo.md`](../../skills/beancount-migrate/references/qbo.md)).
- No skill proposes a client or project attribution, and no `beancount-ask` recipe reports by one. `bea import` rules accept only `match` and `account` and refuse other keys ([`csv_mapper.py`](../../cli/src/bea_engine/csv_mapper.py)).
- The setup catalog ([ADR021](./ADR021-backend-v2-ledger-creation-experience.md), [`catalog.json`](../../backend-cluster/backend-v2/src/features/ledger/setup/catalog.json)) already names business accounts: `freelance@1` (`Income:Services`, `Equity:OwnerContributions`, `Equity:OwnerDrawings`, and `Assets:AccountsReceivable` behind its invoices question) and `business@1` (`Equity:Capital`, `Equity:RetainedEarnings`, and `Assets:AccountsReceivable` with `Liabilities:AccountsPayable` behind its invoices-bills question). Neither opens collected-tax or payroll liabilities. `freelance@1` already asks "Review income and costs by client or project?" with no convention behind it.
- `beancount-accruals` drafts period-end accrual schedules and treats an invoice in a schedule's scope as evidence, not a second subtraction ([`schedule-contract.md`](../../skills/beancount-accruals/references/schedule-contract.md)). It does not record invoices issued to clients.

What `bea` 0.3.1 already supports, checked in source at the `cli-v0.3.1` tag and on a scratch ledger with the checkout's `bea` (HEAD `ab72f5c36`):

| Need | Support |
| --- | --- |
| Transaction metadata, tags, links on a one-off write | `bea add transaction --meta 'key:value' --tag … --link …` |
| Posting-level metadata | Batch JSON (`add transactions --from -`): each posting takes `meta`. The native `--posting` text is one posting line and carries none. |
| Reading metadata | Beanquery `meta(key)` (posting), `entry_meta(key)` (transaction), `any_meta(key)` (posting, falling back to the transaction) |
| Age of an open item | Local date subtraction (`2026-02-01 - min(date)`); hosted query surfaces lack it ([w6/blocked/017](../../.pm/w6/blocked/017.md)) |

On the scratch ledger, an invoice of 1,080 (1,000 services plus 80 stated tax) and a second of 500, then one processor payout applying 400 to the first and 500 to the second with a 26.40 fee, left one open invoice of 680.00. That figure equals the receivable balance. An invoice written with the native recipe and its identity at transaction level aged the same way. A software charge split 30.00/20.00 across two projects reported per project. The per-project totals plus the unattributed bucket equalled the income and expense totals.

## Decision

### 1. Account names

Procedures use the ledger's own existing accounts first: the suite's categorization rule (suggest only accounts already opened) applies unchanged. The names below are what a procedure proposes, as an `open` the user approves, when the ledger has no account for the role.

| Role | Proposed name | Source |
| --- | --- | --- |
| Money clients owe | `Assets:AccountsReceivable` | `freelance@1`, `business@1` |
| Money owed to suppliers | `Liabilities:AccountsPayable` | `business@1` |
| Collected sales tax or VAT | `Liabilities:SalesTax`; with more than one registration, `Liabilities:SalesTax:<Registration>` named as the user's filings name it | New; input to `business@2` ([w2/097](../../.pm/w2/blocked/097.md)) |
| Payroll withholdings and employer taxes owed | `Liabilities:Payroll:<Item>`, one per line the provider's summary prints | New; input to `business@2` |
| Payroll cost | `Expenses:Payroll:Wages`, `Expenses:Payroll:EmployerTaxes` | New |
| Money a payment processor holds before payout | `Assets:Clearing:<Processor>` | New |
| Processor and bank fees | The ledger's fees account; `Expenses:Fees` when it has none | `freelance@1`, the household template |
| Owner funding and withdrawals | The ledger's own equity accounts: `Equity:OwnerContributions` / `Equity:OwnerDrawings`, or `Equity:Capital` | The presets; `business@1` has no draws account yet (`business@2` input) |

Rejected: the review's `Assets:Receivables` and `Liabilities:Payables`, because they differ from the shipped catalog; one account per client or project, because it explodes the chart; renaming an existing account to match this table, because skills do not edit `open` directives.

### 2. Invoice and bill identity

- The identity is metadata: `invoice: "<number as printed>"` and `bill: "<supplier>:<number as printed>"`. A supplier's number is unique only for that supplier, hence the prefix. A document's open balance is the sum of the receivable (or payable) postings carrying its identity, read as `any_meta('invoice')` (or `'bill'`) grouped on that account.
- An entry about one document carries the key on the transaction, so the native one-off recipe can write it (`--meta 'invoice:INV-016'`). An entry that settles several documents, such as one processor payout covering two invoices, carries one receivable or payable posting per document with the key on each posting, written through the batch recipe.
- Every transaction that touches a document also carries a link (`^inv-<number>`, `^bill-<supplier>-<number>`, lowercase, with characters Beancount links allow) so Fava's link view shows the document's history. Links are for navigation; the metadata decides amounts.
- Document identity is not `import-id`. A payment row from a bank or processor export keeps its own `import-id` under the existing dedup convention; `beancount-accruals` keeps `accrual:<slug>:<period>` for schedules.

Rejected: links as the identity, because one transaction can carry several links but only posting metadata says which amount belongs to which document; sub-accounts per invoice.

### 3. Client and project

- Two optional metadata keys, `client:` and `project:`, with string values the user chooses. They are set on the transaction; a split posting overrides with its own posting metadata. Reports read `any_meta('client')` and `any_meta('project')`, and always show the unattributed bucket, so per-key totals plus that bucket equal the account totals.
- A procedure proposes a key only from the payee's history in the same ledger, as it does a category, and writes it only after the proposal's yes. No confident prior means no key, flagged; never an invented one.
- Invoices carry `client:` too, so the aging can group by client.

Rejected: tags, because a Beancount tag belongs to the whole transaction (a split expense cannot attribute its parts) and a transaction tagged with two clients counts twice in a per-client total.

### 4. Tax and payroll figures

Tax and payroll amounts come from the user's documents: the tax line an invoice prints, the provider's gross-to-net summary, a filed return. When the user states only a tax rate, the leg is computed with the engine's decimal arithmetic from that stated rate and shown for confirmation. A rate is never looked up. Withholdings and employer taxes are never computed. A summary that does not tie (printed gross minus withholdings is not the printed net) is a question, never an adjusted entry. This is the discipline `beancount-property` applies to a mortgage statement's printed split.

Rejected: rate tables or jurisdiction rules supplied by the skill, because a stale or wrong rate books a plausible, silently wrong liability, and tax determination is outside the suite ([PRFAQ001](../prfaqs/PRFAQ001-ledger-creation.md) defers it).

### 5. Where each procedure lives

Placement follows [ADR020](./ADR020-skills-accounting-workflow-candidates.md)'s test (distinct trigger, input contract, deliverable, eval set). The first task of each milestone confirms it with a routing probe and may revise it there, recording why.

| Capability | Proposed home | Milestone |
| --- | --- | --- |
| The client/project keys and per-key profit | Shared suite convention; `beancount-add` and `beancount-import` propose keys; `beancount-ask` reports | [w2/m55](../../.pm/w2/blocked/m55/README.md) |
| Invoices, bills, collected tax, payment application, aging | A new skill, `beancount-invoices` | [w2/m56](../../.pm/w2/blocked/m56/README.md) |
| Payroll runs and remittances | Decided by the milestone's routing probe: a procedure in an existing skill unless its trigger and evals stand apart | [w2/m57](../../.pm/w2/blocked/m57/README.md) |
| Processor payout exports | `beancount-import` reference, in the broker-activity mapper pattern | [w2/m58](../../.pm/w2/blocked/m58/README.md) |
| The accountant's page at month end | A section of `beancount-close`, shown only when business accounts exist | [w2/m59](../../.pm/w2/blocked/m59/README.md) |

Rejected: one `beancount-business` skill for every business event, because its trigger would overlap `beancount-add`, `beancount-import`, and `beancount-close` on every request and its evals would mix unrelated deliverables; and folding invoices into `beancount-accruals`, whose input is a stated schedule, not a document.

The boundary with `beancount-accruals`: it drafts expense recognized before or across documents under a stated schedule. `beancount-invoices` records documents issued and received. An invoice inside an accrual schedule's scope is recorded once, by whichever workflow the user is running, and is evidence in the other.

### 6. What the suite will not do

- Render, number, send, or chase invoices.
- Calculate payroll, withholdings, employer taxes, or tax due; determine which tax applies; prepare or file returns; give tax advice.
- Track inventory or cost of goods sold until product-seller demand is validated ([w2/099](../../.pm/w2/blocked/099.md)).
- Consolidate several entities; each entity keeps its own ledger, as [PRFAQ001](../prfaqs/PRFAQ001-ledger-creation.md) advises.

Proposed for `.pm/DO_NOT_DO.md`, pending the owner's decision:

- **No invoicing documents.** Skills record invoices and bills the user issued or received; they do not render, number, send, or remind.
- **No payroll or tax calculation.** Withholdings, employer taxes, and tax due come from the user's provider summaries and filed documents, never from rates or tables an agent supplies.

## Consequences

- Every business procedure shares one set of names and identities, so receivables, aging, collected tax, and the close page compose without a translation layer. A ledger that already uses other names keeps them: procedures read the ledger's accounts before proposing any of these.
- A payment that spans several documents must go through the batch recipe, because only batch postings carry their own metadata. A future native posting-metadata option would lift that without changing the convention.
- The catalog needs a new preset version to open collected-tax and payroll liabilities and a draws account for `business@1` users ([w2/097](../../.pm/w2/blocked/097.md)). Until then, procedures propose those opens at first use.
- Aging works on local `bea` only until hosted queries support date subtraction ([w6/blocked/017](../../.pm/w6/blocked/017.md)).
