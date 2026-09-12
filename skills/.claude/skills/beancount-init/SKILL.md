---
name: beancount-init
description: >-
  Scaffold a brand-new personal ledger in the current working directory.
  With `bea` installed, creates and validates `main.bean` through `bea init`
  and `bea check` — no separate Beancount install. Optional Fava browser
  setup (uv + Makefile) is a separate workflow when the user asks for it.
  Without `bea`, writes the same fourteen-account template. Trigger on
  /beancount-init, "set up a new beancount repo", "scaffold a beancount
  ledger", "start a new ledger", "bootstrap fava", or "initialize a
  beancount project". Do NOT trigger for questions about an existing ledger
  or for editing transactions.
---

# beancount-init

Scaffold a fresh ledger in the current working directory. Prefer a single
`bea` installation for create + validate. Fava's browser UI is optional and
has its own runtime — it is not a prerequisite for `bea` ledger work.

Run the steps in order. Stop if a preflight check fails — partial scaffolding
is worse than no scaffolding.

## Prefer `bea`; Fava and no-`bea` are explicit side paths

Check once with `command -v bea`. When `bea` is installed:

- Create the starter with `bea init` and validate with `bea check`.
- Do **not** `pip install beancount`, `uv add beancount`, or set `BEA_ENGINE` /
  manual engine venvs. The managed engine provisions on first use.
- If provisioning or `bea check` fails: fix network/`uv` availability and
  retry `bea check` (or `bea upgrade`). Do **not** silently fall back to a
  global `bean-check` while `bea` is installed.

Without `bea`, write the template below (developer / no-bea fallback). Suggest
installing `bea` (`brew install bex-co/tap/bea` or
`uv tool install beancount-io`) rather than a second Beancount CLI. If the
user already has a developer `bean-check`, they may use it to validate the
template — that is an independent developer environment, not the customer path.

Fava setup runs only when the user asks for a browser UI (`make start`,
"bootstrap fava", "with Fava"). It needs `uv` and installs Fava into a local
project venv; it does not replace `bea` for check/query/import.

## Step 1 — Preflight

Run `pwd && ls -A` to see the working directory.

**Hard-refuse** if any of these already exist: `main.bean`, `pyproject.toml`,
`Makefile`. Print which ones are present and stop. Do not overwrite.

If the directory contains other files but none of those markers, warn once and
ask for confirmation before continuing.

Check `command -v bea` and remember BEA (yes/no). Ask for the operating
currency (default `USD`) and an optional checking opening balance; call the
answers CURRENCY and OPENING (empty when none). Detect FAVA: yes when the
user asked for Fava / `make start` / "bootstrap fava", otherwise ask once
(default **no** when BEA is yes; default **yes** only when BEA is no and they
still want a browser — otherwise they can install `bea` later).

When FAVA is yes, verify `uv` with `command -v uv`. If missing, stop and tell
them to install it (`brew install uv` on macOS, or
`curl -LsSf https://astral.sh/uv/install.sh | sh`).

## Step 2 — Capture today's date

Run `date +%Y-%m-%d` and call the result `TODAY` (open-date for all root accounts).

## Step 3 — Write `main.bean`

When BEA is yes, substitute CURRENCY, TODAY, and OPENING:

```
bea --no-input init . --currency CURRENCY --date TODAY \
  --opening-balance "Assets:Checking OPENING"    # only when OPENING is non-empty
bea --file ./main.bean check
```

`bea init .` writes `./main.bean`. Do not write any template on this path — the
file equals `bea init` byte-for-byte. Skip to Step 4 when FAVA is yes; otherwise
Step 5.

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

When OPENING is non-empty, `{{TAIL}}` is the live opening transaction (amount
exactly as the user wrote it — `100` stays `100`):

```
{{TODAY}} * "Opening balances"
  Assets:Checking          100 {{CURRENCY}}
  Equity:OpeningBalances  -100 {{CURRENCY}}
```

When OPENING is empty, `{{TAIL}}` is the commented example:

```
; Record opening balances with a transaction against Equity:OpeningBalances.
; {{TODAY}} * "Opening balance"
;   Assets:Checking          1000.00 {{CURRENCY}}
;   Equity:OpeningBalances  -1000.00 {{CURRENCY}}
```

The equity account is always `Equity:OpeningBalances`.

## Step 4 — Optional Fava browser setup

Skip this entire step when FAVA is no.

### Port

```
python3 -c "import random; bad={50000,55555,60000,65000}; ps=[p for p in range(49152,65536) if p not in bad and p%1000]; print(random.choice(ps))"
```

Call the integer `PORT`. If `python3` is missing:
`awk 'BEGIN{srand(); print 49152 + int(rand()*16384)}'`.

### uv project + Fava

```
uv init --bare
uv add fava
```

`--bare` skips hello-world boilerplate. `uv add fava` pulls Fava's own runtime
deps (including Beancount for the browser) into `.venv/` — that is Fava's
environment, not a second customer CLI. Do **not** also `uv add beancount` for
`bea` operations.

### Makefile

Tab-indent the recipe line. Substitute `{{PORT}}`:

```
.PHONY: start
PORT ?= {{PORT}}

start:
	uv run fava main.bean -p $(PORT)
```

### `.gitignore`

Overwrite whatever `uv init --bare` wrote:

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

## Step 5 — `git init` (only if needed)

If `.git/` does not already exist, run `git init`. Don't stage anything.

## Step 6 — Report

Print:

- Files created (`main.bean`; plus `Makefile`, `.gitignore`, `pyproject.toml`,
  `uv.lock`, `.venv/` when FAVA ran).
- When BEA validated: `bea check` passed.
- When FAVA: the port and `make start` → `http://localhost:<PORT>`.
- When BEA only: next steps such as `bea check`, `bea import`, or
  `bea --json query`.

Keep the report tight — one short line per item.
