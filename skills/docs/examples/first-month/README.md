# First-month sample data

All names, amounts, and IDs here are synthetic. Copy these files into a separate
run-owned workspace; never rehearse against personal books. They ship inside the
skills-only checkout alongside the installed customer workflows.

The period is **August 2026**, in USD. Initialize `main.bean` with account opens
and an opening transaction on **2026-08-01**, using **1000.00 USD** in
`Assets:Checking` against `Equity:OpeningBalances`. Both these accounts and every
category below already exist in the standard `bea init` template.

| File | Purpose |
| --- | --- |
| `bank-export.csv` | Three transactions downloaded before the monthly fee posted |
| `import-rules.toml` | Proposed salary, groceries, and dining mappings; approve before persisting |
| `statement.md` | Complete statement including the missing 3.00 USD service fee |
| `statement-unresolved.md` | Alternative inconsistent statement; use from the imported checkpoint |
| `expectations.json` | Exact transaction/posting identities, checkpoint amounts, and branch expectations |

The CSV sign setting is `sign=bank`: positive deposits and negative withdrawals
keep their source signs. The complete mapping and date format are in
`expectations.json`. Native bank IDs become `bank:<ID>` import IDs. Payees and
narrations stay as supplied so the expected identities remain reproducible.
Do not insert the expected transactions directly as a shortcut: the journey
exercises the installed skills' review, confirmation, and supported `bea` writes.

## Checkpoints

The JSON amounts are decimal strings; compare numerical value without rounding.
Transaction identity includes date, flag, payee, narration, import ID, and both
postings. Additional importer metadata such as `bank_id` is allowed. No extra
transactions, postings, or balance assertions belong to these checkpoints.

| Checkpoint | Transactions | Checking USD | Income / expenses / net USD | Assertions |
| --- | ---: | ---: | --- | --- |
| initialized | 1 | 1000.00 | 0.00 / 0.00 / 0.00 | none |
| imported | 4 | 2945.00 | 2000.00 / 55.00 / 1945.00 | none |
| reimported | 4 | 2945.00 | 2000.00 / 55.00 / 1945.00 | none |
| reconciled | 5 | 2942.00 | 2000.00 / 58.00 / 1942.00 | 2026-09-01, checking 2942.00 USD |
| asked | 5 | 2942.00 | 2000.00 / 58.00 / 1942.00 | unchanged |
| closed | 5 | 2942.00 | 2000.00 / 58.00 / 1942.00 | unchanged |

Source arithmetic: `1000 + 2000 - 50 - 5 = 2945`; after the statement's fee,
`2945 - 3 = 2942`. Expense categories are Groceries 50, Dining 5, Fees 3.
The opening equity movement is not income. Derive observed figures with `bea`
queries and reports and compare them to these independent expected facts.
A passing `bea check` is required at every completed checkpoint.

Exact reimport writes zero entries and preserves ledger bytes. The analytical
question (for example, August expenses by category) and checkpoint verification
preserve all ledger bytes, the Git index, and HEAD. Snapshot these before and after
read-only actions. Keep reference data, rules, and snapshots outside the approved
close-file set; initialize/commit the synthetic Git baseline before rehearsing
writes, with no real remote configured.

## Declines and unresolved branches

Run each branch from its named checkpoint in a fresh workspace or isolated Git
branch, not on top of a successful close. Preserve a byte-for-byte snapshot of
ledger files plus Git HEAD and index before the action under test.

- **Decline import:** start initialized, refuse the proposed mutation; no ledger
  or config/rules write, staging, or commit occurs.
- **Decline reconciliation:** start imported, show the complete statement, then
  refuse the proposed fee/assertion; no ledger bytes or Git state change.
- **Decline close commit:** start asked, with reconciliation already complete;
  refuse only the commit. Existing approved reconciliation writes stay present;
  the agent neither stages files nor changes HEAD. The report stays in conversation.
- **Unresolved statement:** start imported and supply `statement-unresolved.md`.
  Its claimed balance is 4.00 USD below its own rows. Report partial reconciliation
  and an unpinned account; append no invented correction, padding, or assertion.
- **Missing statement:** start imported and decline to supply a statement. Report
  checking as unverified and unpinned; do not infer a fee from this fixture bundle.

For the latter two branches, the default checkpoint stops before committing and
preserves ledger and Git state. The existing close skill also permits a separately
confirmed partial-close commit: disclose unresolved/unverified accounts and
unpinned assertions in its report. Such a commit must contain only explicitly
approved, actually changed ledger files. If none changed, explain that there is
nothing to commit; never fabricate a ledger change or empty commit to meet a count.
A partial-close branch does not satisfy the fully reconciled `closed` checkpoint.

## Approved close

Before the final approval, show the exact staged-file proposal and commit message.
For this single-file scenario only `main.bean` is approved; do not include the
CSV, statement, import rules, verifier output, or unrelated files. The approved
close adds exactly one commit from the pre-close HEAD and never pushes.

The commit body retains the period report: checking reconciled, one assertion
pinned, no unverified accounts or carried flags, income 2000.00 USD, expenses
58.00 USD, net 1942.00 USD, and `bea check` passing. With no prior months supplied,
report that recurring-history coverage is unavailable; zero detected gaps is not
proof of recurring completeness. Its subject is
`close: 2026-08 — 1 reconciled, 0 unverified`.
