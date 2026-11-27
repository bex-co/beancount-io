# Bring an existing Beancount ledger

Already keep your books in Beancount? Point `bea` and your coding agent at
them as they are. One command reads the ledger and writes an `AGENTS.md`
beside it that describes it: its root file, its includes, where new entries
go, its accounts and plugins, and how to check it. It also lists what needs
your attention before an agent works on it. No ledger file changes, and you
can prove it with a checksum.

This guide uses a small synthetic ledger shaped like long-running books: the
root is `household.beancount`, not `main.bean`; the entries live in included
files; and a plugin module sits beside the ledger. Run the same steps on your
own books afterwards.

## 1. Install

You need `bea` and the skills installed for Claude Code, Codex, or both.
Follow one method in [Install the Beancount skills](installation.md) through
its discovery check.

`bea init --existing` first shipped in `bea` 0.4.0. Check that yours has
it:

```sh
bea init --help | grep -q -- --existing && echo "ready" || echo "upgrade bea first: bea upgrade"
```

## 2. Copy the sample books and record their checksums

```sh
SKILLS_SRC="${XDG_DATA_HOME:-$HOME/.local/share}/beancount-io"
mkdir -p ~/beancount-existing-ledger && cd ~/beancount-existing-ledger
git init -q
cp -R "$SKILLS_SRC/docs/skills/examples/existing-ledger/." .
find . -name '*.beancount' -o -name '*.py' | sort | xargs shasum -a 256 > ../existing-ledger.sha256
```

The checksums are kept outside the folder so they never look like part of
the books. On your own books, skip the copy and run the last line from your
ledger's folder.

## 3. Let bea read the ledger

<!-- recipe: existing-ledger-describe -->
```sh
bea init --existing household.beancount
```

`bea` reads the books, writes `AGENTS.md` and a one-line `CLAUDE.md` that
imports it, and changes nothing else. For this ledger it prints:

```text
Read household.beancount: 4 files, 8 open accounts, USD. No ledger file was changed.
Wrote AGENTS.md and CLAUDE.md beside the ledger.
Needs attention before an agent works on this ledger:
  household.beancount:7: Plugin `household_rules` is the module `household_rules` in this folder. bea never imports from the working directory, so it loads only through PYTHONPATH.
    Next: Run bea from this folder with PYTHONPATH=. set: cd … && PYTHONPATH=. bea --file household.beancount check
```

That one item is expected here: your own plugin code runs only when you say
so. The `AGENTS.md` it wrote tells agents to run every check as
`PYTHONPATH=. bea --file household.beancount check` from this folder.

On your own books, the list may also name:

- a plugin under `beancount.` that Beancount 3 no longer ships (Beancount 2
  had several): remove or replace that `plugin` line. For
  `beancount.plugins.forecast`, `bea` bundles a drop-in replacement and the
  list says to change the line to `plugin "fava.plugins.forecast"`; removing
  it instead would book each forecast template as one real transaction;
- a plugin from a Python package `bea`'s engine does not include: no `bea`
  command installs one, so the plugin does not run under `bea` while the rest
  of the ledger loads;
- an option Beancount 3 does not know (a Beancount 2 option it removed or
  renamed): remove or rename it;
- any other error, with the check command that shows them all.

`bea` does not act on any of these. Fixing them is your decision, in your own
editor or with an agent once you approve each change.

If you already have an `AGENTS.md` or `CLAUDE.md`, it is kept byte for byte
and `bea` says so. To start over, move yours aside and run the command again.

When no root is named, `bea init --existing .` uses `main.bean` or
`main.beancount` in the folder, or the one ledger file there that no other
file includes. With several such files it stops and asks you to name the root.

## 4. Ask the agent about your books

Start `claude` or `codex` in `~/beancount-existing-ledger` and ask:

> How much did I spend on groceries in February 2026?

The agent reads `AGENTS.md`, uses `beancount-ask`, and answers **119.35 USD**:
78.25 USD at Green Market and 41.10 USD at Corner Grocer. It shows the query
it ran. This one returns the same figure:

<!-- recipe: existing-ledger-ask -->
```sh
PYTHONPATH=. bea --file household.beancount --json query "SELECT sum(position) AS total WHERE account = 'Expenses:Groceries' AND date >= 2026-02-01 AND date < 2026-03-01"
```

The plugin beside the ledger ran too: the train trip on 2026-02-11 carries the
`#travel` tag, which is in no ledger file.

Or ask without an interactive session (on Windows, use the
[Windows variants](installation.md#agents-on-windows)):

```sh
claude -p "How much did I spend on groceries in February 2026?" \
  --allowedTools "Skill" "Read" "Bash(bea:*)" "Bash(PYTHONPATH=. bea:*)"
```

For Codex, `--sandbox read-only` stops `bea` from creating the temporary
files its query engine needs, on macOS as well as Linux. Grant writes only to
a fresh scratch directory instead; the books stay read-only and network
access stays off. [Allow scratch files](first-query.md#codex-allow-scratch-files-while-keeping-the-ledger-read-only)
explains this profile and the older Codex settings that override it.

```sh
BEA_QUERY_TMP="$(mktemp -d)"
TMPDIR="$BEA_QUERY_TMP" XDG_CACHE_HOME="$BEA_QUERY_TMP/cache" \
BEA_CONFIG_DIR="$BEA_QUERY_TMP/config" \
codex exec -c 'default_permissions="bea_query"' \
  -c 'permissions.bea_query={filesystem={":root"="read",":tmpdir"="write"},network={enabled=false}}' \
  "How much did I spend on groceries in February 2026?"
rm -rf "$BEA_QUERY_TMP"
```

## 5. Confirm nothing changed

```sh
shasum -a 256 -c ../existing-ledger.sha256 --quiet && echo "unchanged"
git status --short   # ?? only: nothing was staged
```

Only `AGENTS.md` and `CLAUDE.md` are new. They are yours to edit or commit.

## Windows (PowerShell)

The same steps in Windows PowerShell 5.1. A plugin module beside the ledger
needs `PYTHONPATH` set for the session:

```powershell
$SKILLS_SRC = Join-Path $env:LOCALAPPDATA 'beancount-io'
$WS = Join-Path $HOME 'beancount-existing-ledger'
New-Item -ItemType Directory -Force "$WS" | Out-Null
Set-Location "$WS"
git init -q
Copy-Item -Recurse "$SKILLS_SRC/docs/skills/examples/existing-ledger/*" .
$sums = Get-ChildItem -Recurse -Include *.beancount, *.py | ForEach-Object { (Get-FileHash $_ -Algorithm SHA256).Hash }
bea init --existing household.beancount
$env:PYTHONPATH = '.'
bea --file household.beancount check
$after = Get-ChildItem -Recurse -Include *.beancount, *.py | ForEach-Object { (Get-FileHash $_ -Algorithm SHA256).Hash }
(Compare-Object $sums $after) -eq $null   # True: no ledger file changed
```

## If something goes wrong

- **`No such option: --existing`:** your `bea` predates it; run `bea upgrade`.
- **"holds several ledger files that no other file includes":** name the root,
  the file that includes the others: `bea init --existing PATH`.
- **The agent says a plugin cannot be imported:** run it from the ledger's
  folder with `PYTHONPATH=.`, as `AGENTS.md` says.
- **Codex says `bea` could not install its engine packages:** a `bea`
  installed with `uv tool install` sets up its engine the first time a
  command reads a ledger, and that needs the network, which Codex's sandbox
  turns off. Run step 3 in your own terminal first, then ask again.
- **Codex says `bea` found no usable temporary directory:** use the
  scratch-only command in step 4 instead of `--sandbox read-only`.
- **The agent does not use the skill:** run `verify` from
  [the installation guide](installation.md#3-confirm-the-agents-see-them),
  then start a new session.

## Tested with

On 2026-11-13 on macOS, Claude Code 2.1.322 with a workspace install took the
setup prompt to `beancount-init`'s existing-ledger branch and answered the
February question with 119.35 USD through `beancount-ask`, running `bea` with
`PYTHONPATH=.` as the written `AGENTS.md` says. Every ledger checksum was
unchanged. It ran the checkout's `bea`, since no release had `init --existing`
yet.

On 2026-11-25 on macOS, Codex CLI 0.171.0 (`gpt-6.2-sol`) with a workspace
install and published `bea` 0.5.0 from `uv tool install` took the same setup
prompt to that branch, which ran `bea init --existing` and wrote `AGENTS.md`
and `CLAUDE.md`. It answered the February question with 119.35 USD through
`beancount-ask` under the scratch-only command in step 4. Every ledger
checksum was unchanged, and nothing was staged. The run found the two Codex
items under "If something goes wrong": `--sandbox read-only` blocks `bea`'s
temporary files on macOS too, and a first-use engine install cannot run
inside Codex's sandbox. The PowerShell block has not been run.

## Next

Record an entry with `beancount-add`, import a bank export with
`beancount-import`, or follow the [first-month guide](first-month.md) for a
month of imports, reconciliation and a close.
