# First month: from an empty ledger to a confirmed close

Use the installed Beancount skills to keep one synthetic August 2026 ledger:
initialize, import, reimport, reconcile, ask, and close. The same prompts work in
Claude Code and Codex. Review each proposal before confirming it; the verifier
checks the resulting files and Git state independently.

This guide needs Git, Python 3.9+, **bea 0.3.0 or later**, and the customer suite
from [the installation guide](installation.md). It uses one published `bea`
installation and the skills-only checkout. No account, hosted service, CLI source
checkout, or personal financial data is involved. See the [sample-data contract](examples/first-month/README.md)
for the independent expected transactions and the intentionally inconsistent statement.

## Prepare a fresh workspace

Run this in a terminal. Adjust `SKILLS_SRC` if you installed elsewhere. Each run
uses a fresh directory; keep it until you have reviewed the results.

```sh
export SKILLS_SRC="${XDG_DATA_HOME:-$HOME/.local/share}/beancount-io"
export RUN="$(mktemp -d "${TMPDIR:-/tmp}/beancount-first-month.XXXXXX")"
export BOOKS="$RUN/books"
export FIRST_MONTH_INPUTS="$RUN/inputs"
export VERIFY="$SKILLS_SRC/skills/scripts/verify-first-month.py"
export BEA="$(command -v bea)"
export GIT_OPTIONAL_LOCKS=0
export GIT_AUTHOR_NAME="Synthetic Ledger User" GIT_COMMITTER_NAME="Synthetic Ledger User"
export GIT_AUTHOR_EMAIL="synthetic@example.invalid" GIT_COMMITTER_EMAIL="synthetic@example.invalid"
mkdir -p "$BOOKS" "$FIRST_MONTH_INPUTS" "$RUN/evidence"
cp "$SKILLS_SRC/skills/docs/examples/first-month/bank-export.csv" "$FIRST_MONTH_INPUTS/"
cp "$SKILLS_SRC/skills/docs/examples/first-month/import-rules.toml" "$FIRST_MONTH_INPUTS/"
cp "$SKILLS_SRC/skills/docs/examples/first-month/statement.md" "$FIRST_MONTH_INPUTS/"
cp "$SKILLS_SRC/skills/docs/examples/first-month/statement-unresolved.md" "$FIRST_MONTH_INPUTS/"
git -C "$BOOKS" init -q
git -C "$BOOKS" config user.name "Synthetic Ledger User"
git -C "$BOOKS" config user.email "synthetic@example.invalid"
python3 "$SKILLS_SRC/skills/scripts/beancount-skills.py" install "$BOOKS/.claude/skills" "$BOOKS/.agents/skills"
python3 "$SKILLS_SRC/skills/scripts/beancount-skills.py" verify "$BOOKS/.claude/skills" "$BOOKS/.agents/skills"
"$BEA" --version
cd "$BOOKS"
```

Start `claude` or `codex` from this terminal, so it inherits the paths and
`GIT_OPTIONAL_LOCKS=0`. The latter prevents Git status reads from refreshing
index bytes during unchanged-state checks. Pick one agent per run; use a new
`RUN` for the other. Confirm that the agent discovers the eight installed
`beancount-*` skills. Keep any saved transcripts or tool logs under
`$RUN/evidence`, outside `books`.

The prompts below refer to the current workspace's `./main.bean`. The input
folder is available to the agent through `FIRST_MONTH_INPUTS`. Tool permission
prompts and the skill's accounting confirmation are separate: granting tool
access does not approve a proposed ledger mutation. The agent must still wait
for the corresponding confirmation below. Never use blanket future approval.

Send this runtime instruction at the start of **every** session, including the
fresh unresolved/missing-statement sessions. Some agents launch login shells
that reset `PATH`; the exported absolute `BEA` path keeps the selected version
consistent.

<!-- prompt: runtime -->
```text
For every bea command, use the executable at the inherited BEA environment variable; login shells may resolve a different bea on PATH. Verify "$BEA" --version before continuing. Use this runtime for all ledger writes, checks, and queries in this session.
```

## Initialize and record the baseline

<!-- prompt: init -->
```text
Use beancount-init to propose a synthetic ledger in the current workspace, root ./main.bean. Currency USD; account opens and checking opening balance dated 2026-08-01; Assets:Checking starts with 1000.00 USD against Equity:OpeningBalances. Use the standard bea accounts. No Fava or other runtime. The existing Git and installed skill directories are intentional. First show the files/settings you propose and wait for confirmation. Use installed bea for ledger writes/checks. Do not stage, commit, or push.
```

Review the date, accounts, opening amount, and absence of optional Fava setup.
Then send:

<!-- prompt: init-approve -->
```text
Yes. Create only the proposed main.bean ledger with those settings and validate it. The existing Git and skill directories may stay. Do not stage, commit, or push.
```

Back in the same terminal, make the synthetic baseline commit yourself, then
check the initialized checkpoint. The verifier requires its own Git root and
an existing HEAD; it does not create either.

```sh
git -C "$BOOKS" add -- main.bean
git -C "$BOOKS" commit -m "Initialize synthetic August ledger"
python3 "$VERIFY" verify --workspace "$BOOKS" --checkpoint initialized --bea "$BEA"
python3 "$VERIFY" snapshot --workspace "$BOOKS" --output "$RUN/evidence/before-import-decline.json"
```

Expected: one opening transaction, checking **1000.00 USD**, no assertion.

## Preview import, decline it, then approve it

<!-- prompt: import -->
```text
Use beancount-import on FIRST_MONTH_INPUTS/bank-export.csv from the inherited environment, targeting this workspace's root ./main.bean and Assets:Checking. This synthetic CSV keeps positive deposits and negative withdrawals: use sign=bank, date format %Y-%m-%d, and date=Date,payee=Payee,narration=Narration,amount=Amount,id=ID. Read only the export and import-rules.toml in that input folder; do not read either statement yet. Preserve source payees, narrations, and native IDs. Propose the supplied rules at the durable workspace path ./import-rules.toml, the per-source config block, and the three ledger entries. Perform the skill's duplicate review. Show the actual preview and exact files to change, then wait. Do not write any files, stage, commit, or push before I confirm.
```

The preview should show salary **+2000**, groceries **−50**, coffee **−5**; their
counteraccounts are `Income:Salary`, `Expenses:Groceries`, and `Expenses:Dining`.
All are already open. First decline:

<!-- prompt: import-decline -->
```text
No. Decline the entire proposed import, rules file, and config changes. Leave every workspace file, the Git index, and HEAD unchanged.
```

```sh
python3 "$VERIFY" verify --workspace "$BOOKS" --checkpoint declined_import --before "$RUN/evidence/before-import-decline.json" --bea "$BEA"
```

Ask for the same proposal again using the import prompt. After reviewing it,
approve this specific batch:

<!-- prompt: import-approve -->
```text
Yes. Apply exactly the reviewed three CSV entries to main.bean, preserve their native import IDs, persist the reviewed rules at ./import-rules.toml and the reviewed per-source config block, and validate the ledger. Do not stage, commit, or push. If the preview changes materially, stop for another review.
```

```sh
python3 "$VERIFY" verify --workspace "$BOOKS" --checkpoint imported --bea "$BEA"
python3 "$VERIFY" snapshot --workspace "$BOOKS" --output "$RUN/evidence/before-reimport.json"
```

Expected: four transactions including opening; checking **2945.00 USD**.

<!-- prompt: reimport -->
```text
Use beancount-import to preview the exact same bank-export.csv with the same explicit account, mapping, date format, sign=bank, durable ./import-rules.toml, and main.bean destination. Repeat both duplicate-review layers. All three source IDs should already exist. Report the result and leave every file, Git index, and HEAD unchanged; do not rewrite config or rules for a no-op. No new entries are approved.
```

```sh
python3 "$VERIFY" verify --workspace "$BOOKS" --checkpoint reimported --before "$RUN/evidence/before-reimport.json" --bea "$BEA"
```

## Exercise unresolved and missing statements separately

Do this **before showing the complete statement** to the agent. Copy the imported
workspace into two run-owned branches; these copies include their independent Git
histories and installed skill links. They do not modify the main journey. Their input folders physically omit the
complete statement and fixture expectations; start each session only after
setting its separate `FIRST_MONTH_INPUTS` below.

```sh
export UNRESOLVED_BOOKS="$RUN/unresolved-books"
export MISSING_BOOKS="$RUN/missing-books"
export MAIN_INPUTS="$FIRST_MONTH_INPUTS"
mkdir -p "$RUN/unresolved-inputs" "$RUN/missing-inputs"
cp "$MAIN_INPUTS/bank-export.csv" "$MAIN_INPUTS/import-rules.toml" "$MAIN_INPUTS/statement-unresolved.md" "$RUN/unresolved-inputs/"
cp "$MAIN_INPUTS/bank-export.csv" "$MAIN_INPUTS/import-rules.toml" "$RUN/missing-inputs/"
cp -R "$BOOKS" "$UNRESOLVED_BOOKS"
cp -R "$BOOKS" "$MISSING_BOOKS"
python3 "$VERIFY" snapshot --workspace "$UNRESOLVED_BOOKS" --output "$RUN/evidence/before-unresolved.json"
python3 "$VERIFY" snapshot --workspace "$MISSING_BOOKS" --output "$RUN/evidence/before-missing.json"
export FIRST_MONTH_INPUTS="$RUN/unresolved-inputs"
cd "$UNRESOLVED_BOOKS"
```

Start a **fresh agent session** in `unresolved-books`, then send:

<!-- prompt: unresolved-statement -->
```text
Use beancount-close to review August 2026 for this workspace's ./main.bean. The only supplied statement is FIRST_MONTH_INPUTS/statement-unresolved.md; do not read statement.md or other reference expectations. Use beancount-reconcile for checking. I cannot explain the statement discrepancy and do not approve corrective entries, padding, or assertions. Report unresolved accounts and missing assertions honestly; leave all files, Git index, and HEAD unchanged. Do not stage, commit, or push.
```

Expect a **4.00 USD unexplained difference**, checking partial/unresolved, and
an unpinned account. The statement's own rows imply 2945, but it claims 2941;
no source supports a corrective entry. Check:

```sh
python3 "$VERIFY" verify --workspace "$UNRESOLVED_BOOKS" --checkpoint unresolved_statement --before "$RUN/evidence/before-unresolved.json" --bea "$BEA"
export FIRST_MONTH_INPUTS="$RUN/missing-inputs"
cd "$MISSING_BOOKS"
```

Start a fresh session in `missing-books`:

<!-- prompt: missing-statement -->
```text
Use beancount-close to review August 2026 for this workspace's ./main.bean. I have no statement to supply. Do not read either statement file or infer missing entries from other examples. Report checking as unverified and its period-end assertion as unpinned. Leave all files, Git index, and HEAD unchanged. Do not stage, commit, or push.
```

```sh
python3 "$VERIFY" verify --workspace "$MISSING_BOOKS" --checkpoint missing_statement --before "$RUN/evidence/before-missing.json" --bea "$BEA"
export FIRST_MONTH_INPUTS="$MAIN_INPUTS"
cd "$BOOKS"
```

The verifier proves the ledger/Git effects; review each transcript separately for
the honest unresolved/unverified report. A passing `bea check` alone is not a
tied statement. These branches stop before committing. A separately approved
partial close must retain unresolved findings; if no approved ledger files
changed, there is nothing to commit. Never create a fake correction or empty
commit to make a branch appear complete.

## Reconcile the main journey

Return to the main `books` session. Capture the imported state before asking
for the complete-statement proposal:

```sh
python3 "$VERIFY" snapshot --workspace "$BOOKS" --output "$RUN/evidence/before-reconcile-decline.json"
```

Now supply the complete statement:

<!-- prompt: reconcile -->
```text
Use beancount-reconcile for Assets:Checking in this workspace's ./main.bean, August 2026, using FIRST_MONTH_INPUTS/statement.md. Preserve the statement's payee, narration, and native source ID on any proposed missing transaction. Propose only supported corrections against already-open accounts and the correct day-after-period-end assertion. Show amounts, assertion date, config changes, and destination; wait for confirmation before writing. Do not stage, commit, or push.
```

Review the missing **3.00 USD** monthly fee to `Expenses:Fees`, source ID
`bank:august-fee`, and checking assertion **2942.00 USD on 2026-09-01**.
First decline the entire proposed reconciliation:

<!-- prompt: reconcile-decline -->
```text
No. Decline the fee, assertion, and reconciliation config changes. Leave every workspace file, the Git index, and HEAD unchanged. Do not stage, commit, or push.
```

```sh
python3 "$VERIFY" verify --workspace "$BOOKS" --checkpoint declined_reconcile --before "$RUN/evidence/before-reconcile-decline.json" --bea "$BEA"
```

Ask for the same proposal again using the reconcile prompt. Review its amounts,
source identity, date, and destination before approving:

<!-- prompt: reconcile-approve -->
```text
Yes. Add exactly the reviewed 2026-08-31 Synthetic Bank / Monthly service fee transaction, native import-id bank:august-fee, checking -3.00 USD and Expenses:Fees +3.00 USD, and the 2026-09-01 checking assertion for 2942.00 USD to main.bean. Persist only the reviewed reconciliation config and validate. Do not stage, commit, or push.
```

```sh
python3 "$VERIFY" verify --workspace "$BOOKS" --checkpoint reconciled --bea "$BEA"
python3 "$VERIFY" snapshot --workspace "$BOOKS" --output "$RUN/evidence/before-ask.json"
```

Expected: five transactions, one dated assertion, checking **2942.00 USD**.

## Ask a read-only question

<!-- prompt: ask -->
```text
Use beancount-ask on this workspace's ./main.bean. What were my August 2026 expenses by category, total income, total expenses, and net income? Show the actual rerunnable bea queries/reports supplying the figures. Do not change files, stage, commit, or push.
```

Expect groceries **50**, dining **5**, fees **3**; income **2000**, expenses
**58**, net income **1942 USD**. Opening equity is not income. Re-run the agent's
shown reads rather than trusting its arithmetic, then verify no state changed:

```sh
python3 "$VERIFY" verify --workspace "$BOOKS" --checkpoint asked --before "$RUN/evidence/before-ask.json" --bea "$BEA"
python3 "$VERIFY" snapshot --workspace "$BOOKS" --output "$RUN/evidence/before-close-decline.json"
```

## Review the close, decline the commit, then approve it

<!-- prompt: close -->
```text
Use beancount-close for August 2026 on this workspace's ./main.bean. The supplied complete statement is FIRST_MONTH_INPUTS/statement.md. Checking is already reconciled and asserted; inspect existing entries and do not duplicate them or rewrite config. No other asset/liability account has activity or a nonzero balance. Review all close phases and actual bea reports. No prior months are supplied, so recurring-history completeness is unavailable, not certified complete. Run bea check. Propose a commit containing only main.bean; do not stage or commit until I explicitly approve. Never push.

For a reproducible checkpoint, use these labeled fields in the proposed commit body, deriving each value from the actual ledger checks and reports: Checking: <amount> USD; Income: <amount> USD; Expenses: <amount> USD; Net: <amount> USD; Unverified: <count>; Assertions: <count> pinned, <count> unpinned; Flags carried: <count>; Recurring gaps: <count>; Recurring history: unavailable; check: <result>. Name the reconciled account and state the August period. Use the skill's close subject with the actual reconciled/unverified counts. Show the proposed message and exact files first.
```

Review the report, `bea check`, and file list. The expected subject is
`close: 2026-08 — 1 reconciled, 0 unverified`; checking is 2942, income 2000,
expenses 58, net +1942 USD. Expect one pinned assertion, zero unpinned, zero
unverified accounts, and zero carried flags. Zero detected recurring gaps must
still disclose unavailable history. The durable import rules and skill
links remain outside the approved commit; do not use `git add .`.

<!-- prompt: close-decline -->
```text
No. Decline the commit. Leave every workspace file, the Git index, and HEAD exactly as they are now. Keep the close report in this conversation; do not stage, commit, or push.
```

```sh
python3 "$VERIFY" verify --workspace "$BOOKS" --checkpoint declined_commit --before "$RUN/evidence/before-close-decline.json" --bea "$BEA"
python3 "$VERIFY" snapshot --workspace "$BOOKS" --output "$RUN/evidence/before-close-approved.json"
```

Ask for the close proposal again using the close prompt. After checking the
unchanged file list and report, approve:

<!-- prompt: close-approve -->
```text
Yes. Stage only main.bean and make the one proposed August close commit with the reviewed subject and report. Preserve every other workspace file. Do not stage import-rules.toml, skill links, inputs, logs, or other files. Never push. Report the resulting commit ID.
```

```sh
python3 "$VERIFY" verify --workspace "$BOOKS" --checkpoint closed --before "$RUN/evidence/before-close-approved.json" --bea "$BEA"
git -C "$BOOKS" show --stat --oneline HEAD
```

A passing closed checkpoint verifies exactly one commit after the snapshot,
only `main.bean` committed, matching working/committed ledger bytes, and the
report's labeled facts. Untracked local rules and skill links are expected;
this synthetic repository need not have a clean status.

## If a checkpoint fails

Stop and read its `FAIL` explanation. An unavailable command, incomplete `bea`
response, changed file, wrong transaction, or unexpected commit is a failure,
not permission to skip the check. Preserve the failing workspace and transcript
under this run. Inspect current transactions before retrying a write: some
commands may already have succeeded, and replaying a batch can duplicate entries.

The verifier intentionally accepts this single-file scenario only: no includes,
external ledger files, or alternative accounting examples. Snapshot filenames
are created exclusively; use a fresh name for a new action rather than replacing
old evidence. Snapshots and transcripts stay outside each inspected workspace.
Do not delete unexpected files merely to obtain a pass; explain and correct their
cause, or begin another run in a new directory. Record agent/CLI versions, source
revision, elapsed time, interventions, and checkpoint output if sharing a rehearsal.
