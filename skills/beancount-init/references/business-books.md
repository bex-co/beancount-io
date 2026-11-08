# Business books: shared suite convention

Read this when recording or matching business activity. The ledger's own
accounts and the user's confirmed values take precedence over proposed names.
The design rationale is [ADR025](https://github.com/bex-co/beancount-io/blob/main/docs/adrs/ADR025-skills-business-books.md);
this installed reference supplies the convention without requiring that file.

## Accounts

Read existing open accounts first. When a required role has no account, show
the proposed `open` with the entries and wait for the same confirmation.
Keep existing account names; never rename them to fit this table.

| Role | Proposed name when absent |
| --- | --- |
| Money clients owe | `Assets:AccountsReceivable` |
| Money owed to suppliers | `Liabilities:AccountsPayable` |
| Collected sales tax or VAT | `Liabilities:SalesTax`, or `Liabilities:SalesTax:<Registration>` for each registration the user names |
| Payroll liabilities | `Liabilities:Payroll:<Item>`, one per printed provider-summary line |
| Payroll costs | `Expenses:Payroll:Wages`, `Expenses:Payroll:EmployerTaxes` |
| Money held by a processor | `Assets:Clearing:<Processor>` |
| Processor or bank fees | `Expenses:Fees` |
| Owner funding and withdrawals | The ledger's equity accounts, such as `Equity:OwnerContributions` / `Equity:OwnerDrawings` or `Equity:Capital`; confirm a missing role with the user |

## Documents and payments

- An invoice's identity is `invoice: "<number as printed>"`; a supplier bill's
  is `bill: "<supplier>:<number as printed>"`. A single-document entry carries
  it on the transaction. An entry settling several documents has one receivable
  or payable posting per document, each with its own identity in posting metadata.
- Carry a navigation link on every transaction touching a document:
  `^inv-<number>` or `^bill-<supplier>-<number>`, lowercased and using characters
  Beancount links allow (spaces become hyphens). Metadata assigns amounts;
  links collect the document's history.
- An issuing invoice carries its confirmed `client:` and its stated `due:`
  date. A received bill carries its stated `due:`. Read the client and due date
  from the issuing entry when reporting aging; payment entries need not repeat
  them. Open balances group `any_meta('invoice')` or `any_meta('bill')` on the
  receivable/payable account, never by client.
- `import-id` identifies an imported source row, independently of its invoice
  or bill identity. Preserve both when a bank or processor row pays a document.
  An accrual schedule retains its own `accrual:<slug>:<period>` identity.

For a bank inflow, read `invoice-open` in beancount-init's
`references/bea-cli.md`. An inflow equal to one open invoice's balance is a
suggested payment, shown beside that invoice in the proposal; its other leg
reduces the receivable instead of recording income again. When several invoices
match, or their sum matches, ask which documents it pays. Offer a smaller amount
as a part payment only when the user names the invoice. Write only after the
row's confirmation, through the batch recipe when the receivable posting
carries document metadata. An empty identity in the open-balance read is
unexplained receivable money: report it rather than assigning it to a document.

## Client and project

`client:` and `project:` are optional string metadata, with values explicitly
named by the user or proposed from the ledger's attributed merchant/payee
history. Manual entries use the `dimension-prior` read; imports use the same
merchant matches as their category suggestions. For each key, propose a value
when every attributed match agrees, citing the count; ask when they disagree.
With no attributed match, leave the key unset unless the user names a value.
Show the unset attribution in the proposal or review table when the ledger
uses these keys elsewhere. The proposal's yes approves the final values.

Put a key on the transaction by default; a split posting overrides it with its
own metadata through the batch recipe. Reports read `any_meta('client')` and
`any_meta('project')`, including the unattributed bucket so totals tie. Tags or
new accounts per client/project do not represent this dimension.

## Figures and workflow boundaries

Tax comes from the document's printed amount or a rate the user explicitly
states; calculate a stated rate with the engine's decimal arithmetic and show
it for confirmation. Payroll withholdings and employer taxes come from printed
provider figures, never calculated rates. A summary or payout whose figures do
not tie is a question, never a balancing adjustment. Processor receipts retain
gross, fees, tax and net; a payout to the bank is a transfer, not more income.

Record documents in `beancount-invoices`, described everyday entries and payroll
summaries in `beancount-add`, and export files in `beancount-import`.
`beancount-reconcile` applies the same document identity when proposing a
missing payment. Each workflow retains its own scope, proposal, confirmation,
deduplication and root-check rules. This convention does not authorize sending
invoices, calculating payroll or tax due, or changing existing entries.
