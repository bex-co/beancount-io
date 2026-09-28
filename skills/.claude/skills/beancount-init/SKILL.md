---
name: beancount-init
description: Scaffold a new Beancount ledger with bea init and validation, with optional Fava browser setup when requested. Use for setting up a new ledger or initializing a bookkeeping repository. Skip importing history (beancount-migrate), bank exports, or edits to a populated ledger.
---

# beancount-init

Scaffold a fresh ledger in the current working directory. Prefer a single
`bea` installation for create + validate. Fava's browser UI is optional and
has its own runtime — it is not a prerequisite for `bea` ledger work.

Run the steps in order. Stop if a preflight check fails — partial scaffolding
is worse than no scaffolding.

## Prefer `bea`

Read `references/bea-cli.md` for the shared command contract. Create and
validate the ledger through `bea init` and `bea check`. If `bea` is absent,
use the explicit template and developer path in `references/compatibility.md`.
Fava is a separate, optional browser runtime; run Step 4 only when requested.

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

## Step 2 — Resolve the opening date

Use the historical start date supplied by the user or beancount-migrate when
present. It must be on/before the earliest entry, including any opening-balance
transaction. Otherwise run `date +%Y-%m-%d` and use today. Call it `OPEN_DATE`.
Do not scaffold with today's opens and then rewrite them for old history.

## Step 3 — Write `main.bean`

When BEA is yes, set `directory` to the current directory, `currency` to
CURRENCY, and `open_date` to OPEN_DATE:

<!-- recipe: init -->
```sh
bea --json --no-input init "$directory" --currency "$currency" --date "$open_date"
```

Add `--opening-balance "Assets:Checking OPENING"` to that command only when
OPENING is non-empty. Then bind `ledger` to the new root's absolute path and
run the check recipe in `references/bea-cli.md`.

`bea init .` writes `./main.bean`. Do not write any template on this path — the
file equals `bea init` byte-for-byte. Skip to Step 4 when FAVA is yes; otherwise
Step 5.

When BEA is no, use the fourteen-account template in
`references/compatibility.md`, with the same currency, open date and optional
opening balance. Validate through the explicit developer path there; report
an unvalidated result if no checker is available.

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
