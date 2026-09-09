---
name: beancount-init
description: >-
  Scaffold a brand-new beancount + fava personal ledger repository in the
  current working directory. Builds main.bean on `bea init` when the bea
  CLI is installed (same fourteen accounts, same file), otherwise writes
  that template directly; plus a Makefile whose `make start` boots Fava on
  a randomized unusual port, an initialized uv Python project with beancount
  and fava installed, and a .gitignore tuned for Python/uv/fava. Trigger
  this skill whenever the user types /beancount-init, or asks to "set up a
  new beancount repo", "scaffold a beancount ledger", "start a new ledger",
  "bootstrap fava", "initialize a beancount project", or anything similar
  about beginning a fresh accounting repository. Do NOT trigger for
  questions about an existing ledger or for editing transactions.
---

# beancount-init

Scaffold a fresh beancount + fava ledger in the current working directory. Goal: from empty dir to running Fava in two commands (`/beancount-init`, then `make start`).

Run the steps in order. Stop if a preflight check fails — partial scaffolding is worse than no scaffolding.

## Step 1 — Preflight

Run `pwd && ls -A` to see the working directory.

**Hard-refuse** if any of these already exist: `main.bean`, `pyproject.toml`, `Makefile`. Print which ones are present and stop. Do not overwrite — the user almost certainly didn't mean to scaffold over an existing project.

If the directory contains other files but none of those markers, warn the user and ask once for confirmation before continuing.

Verify `uv` is on PATH with `command -v uv`. If it isn't, stop and tell the user to install it:

- macOS: `brew install uv`
- Otherwise: `curl -LsSf https://astral.sh/uv/install.sh | sh`

Check whether the `bea` CLI is installed with `command -v bea` and remember
the answer as BEA (yes/no) for Step 5. Either way, ask the user for the
operating currency (default `USD`) and an optional checking opening balance,
and call the answers CURRENCY and OPENING (empty when the user gave none).

## Step 2 — Pick a random port

Run this once and capture stdout:

```
python3 -c "import random; bad={50000,55555,60000,65000}; ps=[p for p in range(49152,65536) if p not in bad and p%1000]; print(random.choice(ps))"
```

That gives an integer in IANA dynamic range (49152–65535), excluding round thousands and a few obvious "memorable" values. Each scaffolded ledger gets a different port — useful when running multiple ledgers concurrently. Call this value `PORT`.

If `python3` is somehow not available (very rare on macOS):

```
awk 'BEGIN{srand(); print 49152 + int(rand()*16384)}'
```

## Step 3 — Capture today's date

Run `date +%Y-%m-%d` and call the result `TODAY`. Used as the open-date for all root accounts.

## Step 4 — Initialize the uv project

```
uv init --bare
uv add fava beancount
```

`--bare` skips the `hello.py` / `README.md` / `src/` boilerplate that doesn't belong in a ledger repo. The two commands produce `pyproject.toml` and `uv.lock` and download fava and beancount into `.venv/`.

## Step 5 — Write `main.bean`: prefer `bea`, fall back to the template

When BEA is yes, the ledger comes from the CLI so it can never drift from
`bea init`. Substitute CURRENCY, TODAY, and OPENING:

```
bea --no-input init . --currency CURRENCY --date TODAY \
  --opening-balance "Assets:Checking OPENING"    # only when OPENING is non-empty
```

`bea init .` writes `./main.bean` in the working directory. Do not write any
template yourself on this path — the produced file equals `bea init`'s output
byte-for-byte. Skip to Step 6.

When BEA is no, write the same fourteen-account template `bea init` writes,
substituting `{{TODAY}}`, `{{CURRENCY}}`, and the `{{TAIL}}` block:

```
option "title" "Personal ledger"
option "operating_currency" "{{CURRENCY}}"

; Add more accounts with bea add open. Amounts on credit accounts are negative.
; bea import books rows it cannot categorize to Expenses:Uncategorized with flag '!'.
{{TODAY}} open Assets:Checking {{CURRENCY}}
{{TODAY}} open Assets:Savings {{CURRENCY}}
{{TODAY}} open Assets:Cash {{CURRENCY}}
{{TODAY}} open Liabilities:CreditCard {{CURRENCY}}
{{TODAY}} open Income:Salary {{CURRENCY}}
{{TODAY}} open Income:Interest {{CURRENCY}}
{{TODAY}} open Expenses:Groceries {{CURRENCY}}
{{TODAY}} open Expenses:Dining {{CURRENCY}}
{{TODAY}} open Expenses:Rent {{CURRENCY}}
{{TODAY}} open Expenses:Transport {{CURRENCY}}
{{TODAY}} open Expenses:Utilities {{CURRENCY}}
{{TODAY}} open Expenses:Fees {{CURRENCY}}
{{TODAY}} open Expenses:Uncategorized {{CURRENCY}}
{{TODAY}} open Equity:OpeningBalances {{CURRENCY}}

{{TAIL}}
```

When OPENING is non-empty, `{{TAIL}}` is the live opening transaction for a
single checking balance, with the amount exactly as the user wrote it (bea
renders the Decimal verbatim, so `100` stays `100`):

```
{{TODAY}} * "Opening balances"
  Assets:Checking          100 {{CURRENCY}}
  Equity:OpeningBalances  -100 {{CURRENCY}}
```

For several balances, align the amounts one space past the longest account
name instead. When OPENING is empty, `{{TAIL}}` is the commented example:

```
; Record opening balances with a transaction against Equity:OpeningBalances.
; {{TODAY}} * "Opening balance"
;   Assets:Checking          1000.00 {{CURRENCY}}
;   Equity:OpeningBalances  -1000.00 {{CURRENCY}}
```

The equity account is always `Equity:OpeningBalances` — constrained to the
operating currency, matching `bea init`.

## Step 6 — Write `Makefile`

Substitute `{{PORT}}` with the integer from Step 2. **The recipe line must be tab-indented**, not spaces — `make` rejects spaces with a "missing separator" error. Write the file verbatim; do not re-format.

```
.PHONY: start
PORT ?= {{PORT}}

start:
	uv run fava main.bean -p $(PORT)
```

`PORT ?=` lets users override at runtime — e.g., `make start PORT=49999` if the baked-in port collides with something later.

## Step 7 — Write `.gitignore`

Overwrite whatever `uv init --bare` may have written. Sections cover Python, macOS, Linux, JetBrains IDEs, VS Code, and Fava — the entries every personal repo on a mac with a JetBrains/VS Code setup tends to need:

```
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
dist/
*.egg-info/
.eggs/
.pytest_cache/
.mypy_cache/
.ruff_cache/
.coverage
htmlcov/
.tox/
.venv/
venv/
env/

# macOS
.DS_Store
.AppleDouble
.LSOverride
._*
.Spotlight-V100
.Trashes

# Linux
*~
.fuse_hidden*
.directory
.Trash-*
.nfs*

# JetBrains
.idea/
*.iml
*.iws
*.ipr
out/

# VS Code
.vscode/
*.code-workspace
.history/

# Fava
.fava/
```

`uv.lock` and `pyproject.toml` are intentionally tracked — reproducible installs and dep declarations both belong in version control.

## Step 8 — `git init` (only if needed)

If `.git/` does not already exist, run `git init`. Don't stage anything — the user should review the scaffold before committing. If `.git/` already exists, skip silently.

## Step 9 — Report

Print to the user:

- Files created (e.g., `main.bean`, `Makefile`, `.gitignore`, `pyproject.toml`, `uv.lock`, plus `.git/` and `.venv/` if just created).
- The chosen port.
- Next step: run `make start`, then open `http://localhost:<PORT>` in a browser.

Keep the report tight — one short line per item, no narration.
