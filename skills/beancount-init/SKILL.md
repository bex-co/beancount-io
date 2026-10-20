---
name: beancount-init
description: Scaffold a new local Beancount ledger with bea init and validation, with optional Fava browser setup when requested. Use for setting up a new ledger or initializing a bookkeeping repository. Skip importing history (beancount-migrate), bank exports, edits to a populated ledger, or ledgers hosted on Beancount.io.
license: MIT-0
metadata:
  openclaw:
    homepage: 'https://github.com/bex-co/beancount-io/tree/main/skills'
    requires:
      anyBins:
        - bea
        - bean-check
    install:
      - id: brew
        kind: brew
        formula: bex-co/tap/bea
        bins:
          - bea
        label: Install bea (Homebrew)
      - id: uv
        kind: uv
        package: beancount-io
        bins:
          - bea
        label: Install bea (uv)
  hermes:
    category: finance
    tags:
      - beancount
      - accounting
      - setup
---

# beancount-init

Scaffold a fresh ledger in the current working directory with one `bea`
installation for create and validate.

Run the steps in order. Stop if a preflight check fails — partial scaffolding
is worse than no scaffolding.

## Prefer `bea`

Read `references/bea-cli.md` for the shared command contract. Create and
validate the ledger through `bea init` and `bea check`. If `bea` is absent,
use the explicit template and developer path in `references/compatibility.md`.
Fava is a separate, optional browser runtime; run Step 4 only when requested.

## Step 1 — Preflight

Local ledger files only. If the ledger is hosted on Beancount.io and its MCP server is connected, use that server's tools instead (`references/bea-cli.md`, Hosted ledgers).

Run `pwd && ls -A` to see the working directory.

**Hard-refuse** if any of these already exist: `main.bean`, `pyproject.toml`,
`Makefile`. Print which ones are present and stop. Do not overwrite.

If the directory contains other files but none of those markers, warn once and
ask for confirmation before continuing.

Check `bea` as `references/bea-cli.md` describes (installed, and at the
suite's minimum version) and remember BEA (yes/no). Ask for the operating
currency (default `USD`) and an optional checking opening balance; call the
answers CURRENCY and OPENING (empty when none). Also ask which of these the
household has — brokerage or retirement investment accounts, crypto
wallets/exchanges, a property (and mortgage) — and the name to use for each;
call the answers HOUSEHOLD (empty when none). They only shape Step 3b's
proposed opens; nothing is opened on the strength of this answer alone. Detect FAVA: yes when the
user asked for Fava / `make start` / "bootstrap fava", otherwise ask once
(default **no** when BEA is yes; default **yes** only when BEA is no and they
still want a browser — otherwise they can install `bea` later).

When FAVA is yes, verify `uv` with `command -v uv`. If missing, stop and tell
them to install it with their package manager (`brew install uv` on macOS),
or follow the [official uv installation guide](https://docs.astral.sh/uv/getting-started/installation/).

## Step 2 — Resolve the opening date

Use the historical start date supplied by the user or beancount-migrate when
present. It must be on/before the earliest entry, including any opening-balance
transaction. Otherwise run `date +%Y-%m-%d` and use today. Call it `OPEN_DATE`.
Settle the date before writing: the opens are written once, not rewritten
later for older history.

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

`bea init .` writes `./main.bean`, so on this path the file is exactly what
`bea init` produced and no template is written by hand. Continue to Step 3b
when HOUSEHOLD is non-empty, then Step 4 when FAVA is yes; otherwise Step 5.

When BEA is no, use the fourteen-account template in
`references/compatibility.md`, with the same currency, open date and optional
opening balance. Validate through the explicit developer path there; report
an unvalidated result if no checker is available.

## Step 3b — Investor and property accounts (only when HOUSEHOLD is non-empty)

The starter accounts cover everyday money only, so an investor's first trade
would stall on missing accounts. Propose the opens for exactly what the user
named in Step 1 — show every `open` line, get one yes for the set, then
write them dated OPEN_DATE (the `open` recipe, with `--currency` repeated
per allowed commodity and, for investment accounts, `--booking` as chosen
below; on the no-`bea` path append the same lines to the template in its
style). Suggested shape, names from the user:

- Each brokerage/retirement account: `Assets:<Name>` with the operating
  currency plus the symbols they actually hold, and — once, shared by all —
  `Income:Dividends` and `Income:CapitalGains` (operating currency) so a
  first dividend or sale has somewhere to land.
- Each crypto wallet/exchange: `Assets:Crypto:<Name>` with its coins (plus
  the operating currency on an exchange that holds cash).
- A property: `Assets:Property:<Name>` with its one property commodity,
  `Assets:Escrow:<Name>`, `Liabilities:Mortgage:<Name>` when there is a
  loan, `Income:Rent:<Name>` for a rental (the model beancount-property
  uses; it can also propose these at purchase time).

For every investment account, explain the **booking method** before writing
it — it decides which lot an unnamed sell reduces, and changing it later
rewrites gain history, so this is the cheap moment to choose. In plain
terms: `STRICT` (the default when none is written) makes every sell name
its exact lot, or the write is refused as ambiguous; `STRICT_WITH_SIZE`
also matches a sell that exactly empties one lot; `FIFO` sells the oldest
lot first, `LIFO` the newest, `HIFO` the highest-cost; `NONE` books no
gain at all. **Average cost is not supported by the engine** — if the user
asks for it (some tax regimes require it), say so plainly and let them pick
another method now rather than discover it at their first sell. Write only
the method they choose (`STRICT` may be left unwritten, as the default).

After the opens, run the check recipe again. Balances and holdings
themselves are not seeded here: existing positions come in through
beancount-import's opening-lots path, and new trades through beancount-trade.

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
environment, not a second customer CLI; `bea` operations need nothing more in it.

### Makefile

Tab-indent the recipe line. Substitute `{{PORT}}`:

```
.PHONY: start
PORT ?= {{PORT}}

start:
	uv run fava main.bean -p $(PORT)
```

### `.gitignore`

Overwrite whatever `uv init --bare` wrote with a `.gitignore` covering `.venv/`,
`.fava/`, Python build and cache artifacts, and common OS/editor files
(`.DS_Store`, `.idea/`, `.vscode/`).

## Step 5 — Write the ledger instructions

Write `AGENTS.md` from `references/agents-template.md`, substituting the
currency and the account names read back from `main.bean`, plus the one-line
`CLAUDE.md` (`@AGENTS.md`) — each only when that file does not already exist.
Never overwrite an existing `AGENTS.md` or `CLAUDE.md`; if `AGENTS.md`
pre-existed, leave it and offer the bridge instead of writing unasked. The
template reference holds the exact text and rules.

## Step 6 — `git init` (only if needed)

If `.git/` does not already exist, run `git init`. Don't stage anything.

## Step 7 — Report

Print:

- Files created (`main.bean`, `AGENTS.md`, `CLAUDE.md` when written; plus
  `Makefile`, `.gitignore`, `pyproject.toml`, `uv.lock`, `.venv/` when FAVA
  ran).
- When BEA validated: `bea check` passed.
- When FAVA: the port and `make start` → `http://localhost:<PORT>`.
- Next steps: record an entry (beancount-add), import a bank export
  (beancount-import), or ask a question (beancount-ask); when Step 3b ran,
  also: seed existing holdings (beancount-import's opening lots) or record
  a trade (beancount-trade).

Keep the report tight — one short line per item.
