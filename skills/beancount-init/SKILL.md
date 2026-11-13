---
name: beancount-init
description: Scaffold a new local Beancount ledger with bea init and validation, with optional Fava browser setup when requested; or set up books already kept in Beancount for coding agents without changing them. Use for setting up a new ledger, initializing a bookkeeping repository, or preparing an existing Beancount ledger for an agent. Skip importing another tool's export (beancount-migrate), bank exports, edits to a populated ledger, questions about a ledger (beancount-ask), or ledgers hosted on Beancount.io.
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

Part of the [Beancount.io](https://beancount.io/) ledger skill suite.

Scaffold a fresh ledger in the current working directory with one `bea`
installation for create and validate, or set up a ledger the user already
keeps so a coding agent can work on it (the existing-ledger branch).

Run the steps in order. Stop if a preflight check fails — partial scaffolding
is worse than no scaffolding.

## Prefer `bea`

Read `references/bea-cli.md` for the shared command contract. Create and
validate the ledger through `bea init` and `bea check`. If `bea` is absent,
use the explicit template and developer path in `references/compatibility.md`.
Fava is a separate, optional browser runtime; run Step 4 only when requested.

## Step 1 — Preflight

Local ledger files only. For a ledger hosted on Beancount.io, stop this skill and offer a separately requested hosted workflow or local clone (`references/bea-cli.md`, Hosted ledgers).

Run `pwd && ls -A` to see the working directory.

**Existing ledger.** When the user says they already keep Beancount books
(set the agent up for them, use my existing ledger, bring my books), or the
folder already holds `.bean`/`.beancount` files and the user did not ask for a
new ledger beside them, follow [Existing ledger](#existing-ledger) instead of
the steps below. It never creates a ledger and never changes a ledger file.

**Hard-refuse** if any of these already exist: `main.bean`, `pyproject.toml`,
`Makefile`. Print which ones are present and stop. Do not overwrite. When the
present file is a ledger, offer the existing-ledger branch instead.

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

When FAVA is yes, verify `uv` is on PATH (`command -v uv`; PowerShell `Get-Command uv`). If missing, stop and tell
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
OPENING is non-empty. Check `bea init --help` before using setup-catalog
options: published `bea` 0.3.1 has neither `--preset` nor `--title`. When
`--preset` is listed and the user names a purpose the setup catalog covers
(freelance work, a business, investments, a rental, shared expenses, a
community organization), add `--preset <id>` with the matching preset
(`freelance@1`, `business@1`, `portfolio@1`, `rental@1`,
`shared-expenses@1`, `community@1`; `personal@1` is the household default and
`blank@1` an empty chart). Add `--title` only when help lists it and a preset
is selected; select `personal@1` when only a household ledger name was given.
When help also lists `--module` and a household ledger also holds
investments, a rental property, or side income, keep `--preset personal@1`
and add `--module investments@1`, `--module rental-property@1` (with
`--property-name <Name>`, an ASCII account part such as `OakSt`, for the
property the user named), or `--module side-business@1` for each one named;
those accounts then exist and Step 3b proposes only what the modules do not
open. Modules belong to a household's own books: a company, a club, or money
shared with other people gets its own ledger and preset, never a module.
Opening balances then name that preset's asset/liability accounts instead of
`Assets:Checking`. Without those options, use the base recipe and explain
that this CLI creates the standard chart; Step 3b can add the user's approved
investment/property accounts. Then bind `ledger` to the new root's absolute path and
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
`awk 'BEGIN{srand(); print 49152 + int(rand()*16384)}'`. On native Windows
(PowerShell has neither), use `python` or `Get-Random -Minimum 49152 -Maximum 65536`,
re-rolling a port in the excluded set.

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
- When FAVA: the port and `make start` (without `make`, e.g. native Windows, run `uv run fava main.bean -p <PORT>`) → `http://localhost:<PORT>`.
- Next steps: record an entry (beancount-add), import a bank export
  (beancount-import), or ask a question (beancount-ask); when Step 3b ran,
  also: seed existing holdings (beancount-import's opening lots) or record
  a trade (beancount-trade).

Keep the report tight — one short line per item.

## Existing ledger

For books the user already keeps. Read-only on the ledger: only `AGENTS.md`
and `CLAUDE.md` may be created, and only when absent.

1. **Root.** The ledger's root is the file that includes the others. Use the
   one the user names. Otherwise `bea init --existing` finds it in a folder
   (`main.bean`, `main.beancount`, or the one file nothing else there
   includes) and refuses, naming the candidates, when there are several; then
   ask the user which is the root. Never pick one yourself.
2. **Capability.** Check `bea` as `references/bea-cli.md` describes, then
   check that `bea init --help` lists `--existing`. Published `bea` 0.3.1
   does not: say the existing-ledger setup needs a newer `bea`, offer
   `bea upgrade`, run the check recipe on the root so the user sees the
   ledger's state, and stop. Do not write `AGENTS.md` by hand; its facts come
   from loading the ledger.
3. **Run it** from the ledger's folder, with the root bound to `ledger`
   (the recipe below). It changes no ledger file. It writes `AGENTS.md` and
   the `@AGENTS.md` `CLAUDE.md` only when each is absent (`data.agent_files`
   says `created`, `kept` or `skipped`) and exits 0 even when the ledger has
   errors.
4. **Report.** Show the user the root and file count, which agent files were
   written or kept, and each `data.attention` item as its `location`,
   `message` and `next`. Do not act on those next steps; removing a plugin or
   an option is the user's decision. When an item is `plugin-beside-ledger`,
   run later `bea` commands from the ledger's folder with `PYTHONPATH=.`, as
   the written `AGENTS.md` says.
5. **Git.** Report whether the folder is a Git repository (`git rev-parse
   --is-inside-work-tree`). Never run `git init` in it and never stage.

<!-- recipe: init-existing -->
```sh
bea --json --no-input init --existing "$ledger"
```

Next steps: ask a question about the ledger (beancount-ask), record an entry
(beancount-add), or import a bank export (beancount-import).

