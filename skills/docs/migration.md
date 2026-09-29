# Migrate a finance-app export, then keep importing

Use the installed Beancount skills to turn a synthetic Monarch export into a
fresh ledger, then keep importing bank exports that overlap the migrated
history, without double-booking either side of an internal transfer. The same
prompts work in Claude Code and Codex. Review each proposal before confirming
it. `verify-migration.py` checks the resulting files and Git state
independently.

This guide needs Git, Python 3.9+, **bea 0.3.1 or later**, and the customer suite from
[the installation guide](installation.md). It uses one `bea` installation and
the skills-only checkout, with no account, hosted service, or personal
financial data. The [sample-data contract](examples/migration/README.md) lists
every source row's disposition, the expected import IDs, and the balance
anchors.

> **bea version.** The overlap steps rely on `bea import` recognizing migrated
> IDs, which first shipped in 0.3.1. Check `"$BEA" --version` during setup, and
> upgrade with `brew upgrade bex-co/tap/bea` or `uv tool upgrade beancount-io`.
> With 0.3.0, migrated rows preview as new, and the overlap checkpoints fail
> rather than hide a double-booking.

## What the migration must prove

- **Row accounting.** Five source rows become four transactions. The
  2026-03-10 transfer appears once per account and merges into one
  transaction. Its checking row's ID is `import-id` and its savings row's ID
  is `import-id-2`. Count: `5 = 3 transactions + 2 × 1 pair + 0 skipped`.
- **Independent versus derived openings.** Checking's 500.00 USD opening
  comes from a statement, so its 2445.80 USD ending assertion checks the
  export. Savings only has a current balance, so its 1000.00 USD opening is
  derived, and its 1501.25 USD assertion confirms that arithmetic. It is not
  evidence that the export is complete.
- **Continuity.** Later bank exports carry the same raw descriptions Monarch
  shows as `Original Statement`, so each row keeps its identity. Rows already
  migrated are skipped, whichever transfer side the export comes from. Only
  genuinely new activity is written, exactly once.

## Prepare a fresh workspace

Adjust `SKILLS_SRC` if you installed elsewhere. Each run uses a fresh directory.

```sh
export SKILLS_SRC="${XDG_DATA_HOME:-$HOME/.local/share}/beancount-io"
export RUN="$(mktemp -d "${TMPDIR:-/tmp}/beancount-migration.XXXXXX")"
export BOOKS="$RUN/books"
export MIGRATION_INPUTS="$RUN/inputs"
export VERIFY="$SKILLS_SRC/skills/scripts/verify-migration.py"
export BEA="$(command -v bea)"
export BEA_CONFIG_DIR="$RUN/bea-config"
export GIT_OPTIONAL_LOCKS=0
export GIT_AUTHOR_NAME="Synthetic Ledger User" GIT_COMMITTER_NAME="Synthetic Ledger User"
export GIT_AUTHOR_EMAIL="synthetic@example.invalid" GIT_COMMITTER_EMAIL="synthetic@example.invalid"
mkdir -p "$BOOKS" "$MIGRATION_INPUTS" "$RUN/evidence"
for f in monarch-export.csv balances.md checking-overlap.csv savings-overlap.csv checking-april.csv; do
  cp "$SKILLS_SRC/skills/docs/examples/migration/$f" "$MIGRATION_INPUTS/"
done
git -C "$BOOKS" init -q
python3 "$SKILLS_SRC/skills/scripts/beancount-skills.py" install "$BOOKS/.claude/skills" "$BOOKS/.agents/skills"
python3 "$SKILLS_SRC/skills/scripts/beancount-skills.py" verify "$BOOKS/.claude/skills" "$BOOKS/.agents/skills"
printf '.claude/\n.agents/\n' > "$BOOKS/.gitignore"
git -C "$BOOKS" add .gitignore && git -C "$BOOKS" commit -q -m "Empty synthetic workspace"
"$BEA" --version
cd "$BOOKS"
```

`BEA_CONFIG_DIR` keeps this run's remembered CSV mappings, which `bea import`
saves even on a preview, out of your own bea configuration.

Start `claude` or `codex` from this terminal so it inherits these variables.
Use one agent per run and a new `RUN` for the other. Keep transcripts under
`$RUN/evidence`, outside `books`. Granting tool access does not approve a
ledger change: each write waits for its confirmation below. Never give blanket
future approval.

Send this at the start of **every** session:

<!-- prompt: runtime -->
```text
For every bea command, use the executable at the inherited BEA environment variable; login shells may resolve a different bea on PATH. Verify "$BEA" --version before continuing. Use this runtime for all ledger writes, checks, and queries in this session.
```

## Initialize the destination

<!-- prompt: init -->
```text
Use beancount-migrate to migrate MIGRATION_INPUTS/monarch-export.csv into a fresh ledger in this workspace, root ./main.bean, currency USD. Balances are in MIGRATION_INPUTS/balances.md. Start by composing beancount-init only: propose the bea init with account opens dated 2026-03-04, the day before the earliest row, and no Fava or other runtime. The existing Git repository and installed skill directories are intentional. Show what you will create and wait for confirmation. Do not stage, commit, or push.
```

<!-- prompt: init-approve -->
```text
Yes. Run only that bea init and validate the ledger. Do not map, convert, stage, commit, or push yet.
```

Commit the initialized baseline yourself, then check it and snapshot the
pre-conversion workspace:

```sh
git -C "$BOOKS" add -- main.bean && git -C "$BOOKS" commit -q -m "Initialize synthetic ledger"
python3 "$VERIFY" verify --workspace "$BOOKS" --checkpoint initialized --bea "$BEA"
python3 "$VERIFY" snapshot --workspace "$BOOKS" --output "$RUN/evidence/before-conversion.json"
```

## Review the mapping, decline it, then approve it

<!-- prompt: map -->
```text
Continue with beancount-migrate for the same export and ./main.bean. Identify the source, then propose in one review: the account mapping, the category mapping, the transfer categories, each opening balance labelled independent or derived from MIGRATION_INPUTS/balances.md, the converted transactions with their import IDs (merged transfers keep the second row's ID as import-id-2), the row accounting, and the endpoint assertions with their dates. Reuse the accounts bea init already opened where they fit. Show the exact entries and destination, then wait. Write nothing before I confirm.
```

Mapping approval comes before conversion. Check that the proposal:

- maps Chase Checking to `Assets:Checking` and Ally Savings to `Assets:Savings`;
- maps Paycheck, Groceries, and Interest to `Income:Salary`,
  `Expenses:Groceries`, and `Income:Interest`, and treats Transfer as paired;
- shows 5 rows = 3 transactions + 2 × 1 pair + 0 skipped;
- labels checking's 500.00 opening independent and savings' 1000.00 derived;
- asserts 2445.80 and 1501.25 on 2026-03-16, the day after the last row.

Decline the first proposal:

<!-- prompt: map-decline -->
```text
No. Decline the mapping and the entire conversion. Leave every workspace file, the Git index, and HEAD unchanged.
```

```sh
python3 "$VERIFY" verify --workspace "$BOOKS" --checkpoint declined_conversion --before "$RUN/evidence/before-conversion.json" --bea "$BEA"
```

### Approve the migration

Send the map prompt again, review the new proposal, then approve it:

<!-- prompt: map-approve -->
```text
Yes. Use exactly the reviewed mapping: Chase Checking to Assets:Checking, Ally Savings to Assets:Savings, Paycheck to Income:Salary, Groceries to Expenses:Groceries, Interest to Income:Interest, Transfer paired. Write the two 2026-03-04 openings (checking 500.00 USD independent, savings 1000.00 USD derived) and the four converted transactions with their monarch import IDs, then the 2026-03-16 assertions for checking 2445.80 USD and savings 1501.25 USD. Validate and report the row accounting. Do not stage, commit, or push. If the proposal changes materially, stop for another review.
```

```sh
python3 "$VERIFY" verify --workspace "$BOOKS" --checkpoint migrated --bea "$BEA"
git -C "$BOOKS" add -- main.bean && git -C "$BOOKS" commit -q -m "Migrate Monarch history"
```

## Keep importing: overlapping exports

Each bank now exports its own CSV. Take a snapshot before each overlap-only
import; when every row is already migrated, nothing may change.

```sh
python3 "$VERIFY" snapshot --workspace "$BOOKS" --output "$RUN/evidence/before-checking-overlap.json"
```

<!-- prompt: import-checking-overlap -->
```text
Use beancount-import on MIGRATION_INPUTS/checking-overlap.csv for this workspace's root ./main.bean and Assets:Checking. It is the bank's own CSV: sign=bank, date format %Y-%m-%d, mapping date=Date,narration=Description,amount=Amount. Run the skill's duplicate review against the migrated history, including import-id-2. Show the preview. If no row is new, write nothing, including no rules file or config, and say so. Otherwise wait for my confirmation. Do not stage, commit, or push.
```

```sh
python3 "$VERIFY" verify --workspace "$BOOKS" --checkpoint checking_overlap --before "$RUN/evidence/before-checking-overlap.json" --bea "$BEA"
python3 "$VERIFY" snapshot --workspace "$BOOKS" --output "$RUN/evidence/before-savings-overlap.json"
```

<!-- prompt: import-savings-overlap -->
```text
Use beancount-import on MIGRATION_INPUTS/savings-overlap.csv for this workspace's root ./main.bean and Assets:Savings. It is the bank's own CSV: sign=bank, date format %Y-%m-%d, mapping date=Date,narration=Description,amount=Amount. Run the skill's duplicate review against the migrated history, including import-id-2. Show the preview. If no row is new, write nothing, including no rules file or config, and say so. Otherwise wait for my confirmation. Do not stage, commit, or push.
```

```sh
python3 "$VERIFY" verify --workspace "$BOOKS" --checkpoint savings_overlap --before "$RUN/evidence/before-savings-overlap.json" --bea "$BEA"
```

The savings export's transfer row matches the migrated transfer through its
`import-id-2`. Both checkpoints require unchanged files, HEAD, and index.

## Keep importing: new activity

<!-- prompt: import-april -->
```text
Use beancount-import on MIGRATION_INPUTS/checking-april.csv for this workspace's root ./main.bean and Assets:Checking. It is the bank's own CSV: sign=bank, date format %Y-%m-%d, mapping date=Date,narration=Description,amount=Amount. Run the skill's duplicate review against the migrated history, including import-id-2. Categorize new rows from the ledger's existing history. Show the preview, the exact entries, and any rules or config you would persist, then wait. Do not stage, commit, or push.
```

Expected: the 2026-03-10 transfer row is already migrated. The 2026-04-03
TRADER JOES row, −61.10, is new and goes to `Expenses:Groceries`, like the
migrated purchase.

<!-- prompt: import-april-approve -->
```text
Yes. Write exactly the one new 2026-04-03 entry to main.bean with its generated import ID, persist only the reviewed rules and config, and validate. Do not stage, commit, or push.
```

```sh
python3 "$VERIFY" verify --workspace "$BOOKS" --checkpoint imported_new --bea "$BEA"
git -C "$BOOKS" add -A && git -C "$BOOKS" commit -q -m "Import April checking"
python3 "$VERIFY" snapshot --workspace "$BOOKS" --output "$RUN/evidence/before-reimport.json"
```

Send the `import-april` prompt again; nothing is new this time.

```sh
python3 "$VERIFY" verify --workspace "$BOOKS" --checkpoint reimported_new --before "$RUN/evidence/before-reimport.json" --bea "$BEA"
```

## Branch: a balance that does not tie out

In a new `RUN`, repeat [Prepare a fresh workspace](#prepare-a-fresh-workspace).
Then replace the balances file:

```sh
rm "$MIGRATION_INPUTS/balances.md"
cp "$SKILLS_SRC/skills/docs/examples/migration/balances-conflicting.md" "$MIGRATION_INPUTS/"
```

Send the runtime, init, and init-approve prompts, with `balances-conflicting.md`
in place of `balances.md`, and commit the baseline as above. Then send:

<!-- prompt: conflict -->
```text
Continue with beancount-migrate for MIGRATION_INPUTS/monarch-export.csv into ./main.bean, with balances from MIGRATION_INPUTS/balances-conflicting.md. Use this mapping: Chase Checking to Assets:Checking, Ally Savings to Assets:Savings, Paycheck to Income:Salary, Groceries to Expenses:Groceries, Interest to Income:Interest, Transfer paired. I approve writing the openings and converted history once you have shown them. I do not accept any residual, pad, or adjustment. If an account's stated ending disagrees with its opening plus rows, leave that account unasserted and report the signed residual. Show the proposal and wait for my confirmation. Do not stage, commit, or push.
```

<!-- prompt: conflict-approve -->
```text
Yes. Write the reviewed openings and history, and only the assertions that tie out. Validate and report each account's result. Do not stage, commit, or push.
```

```sh
python3 "$VERIFY" verify --workspace "$BOOKS" --checkpoint conflicting_balance --bea "$BEA"
```

The checkpoint requires the full history, the savings assertion, no checking
assertion, and no adjustment entry. The transcript must separately report
checking as unresolved: the statement claims 10.00 USD more than the migrated
rows, and nothing in the export explains the difference.

## Limits

The verifier checks files, Git state, and ledger contents. It cannot judge
whether a transcript explained the numbers honestly; review that yourself.
This journey covers one Monarch export with cash accounts. Mint and
QuickBooks exports, populated-ledger merges, and investment lots are outside
it. See the [rehearsal record](migration-rehearsal.md) for observed runs.
