# Install the Beancount skills

Install the fourteen `beancount-*` ledger skills for Claude Code, Codex, or both, from any directory. You keep one Git checkout of the skills and link it into each agent's skill directory. Updating the checkout updates every agent, and the helper script never touches skills it did not install. [OpenClaw and Hermes Agent](#openclaw-and-hermes-agent) have the suite route and host limits described below, including migration from the retired standalone listings.

Rehearsed on macOS with Claude Code and Codex (see [tested with](first-query.md#tested-with)). Linux uses the same commands but has not been rehearsed. On native Windows, the [PowerShell steps](#windows-powershell) were rehearsed with Windows PowerShell 5.1. Claude Code and Codex there discovered a workspace install and answered the first query, with the [Windows-specific corrections](#agents-on-windows) listed in that section. WSL is not covered.

## Prerequisites

- Git and Python 3.
- [`bea`](../../cli/README.md) 0.3.1 or later (`brew install bex-co/tap/bea` or `uv tool install beancount-io`; `bea upgrade` updates an older one). The skills use it for checks, queries, and ledger writes.
- [Claude Code](https://code.claude.com/docs/en/skills) and/or [Codex](https://developers.openai.com/codex/skills).

## 1. Get the skills

On native Windows, use the [Windows (PowerShell)](#windows-powershell) section for the link installer (install, verify, update, conflicts and removal) instead of the `sh` blocks.

Fetch only the `skills/` directory of this repository into a stable location:

```sh
SKILLS_SRC="${XDG_DATA_HOME:-$HOME/.local/share}/beancount-io"
git clone --depth 1 --filter=blob:none --sparse https://github.com/bex-co/beancount-io.git "$SKILLS_SRC"
git -C "$SKILLS_SRC" sparse-checkout set skills scripts/skills docs/skills
```

The checkout contains the customer suite only. The repository's development skills live elsewhere and are not fetched.

## 2. Link them into your agents

Pick the skill directory for each agent you use:

| Agent | Every ledger on this machine | One ledger workspace |
| ----- | ---------------------------- | -------------------- |
| Claude Code | `~/.claude/skills` | `<workspace>/.claude/skills` |
| Codex | `~/.agents/skills` | `<workspace>/.agents/skills` |

Then link the suite into those directories (omit the one you don't use):

```sh
SKILLS_SRC="${XDG_DATA_HOME:-$HOME/.local/share}/beancount-io"
python3 "$SKILLS_SRC/scripts/skills/beancount-skills.py" install ~/.claude/skills ~/.agents/skills
```

For each directory, `install` creates one link per skill (`beancount-ask -> $SKILLS_SRC/skills/beancount-ask`, and so on), prints the source revision, and runs `verify`. It leaves every other entry in the directory alone. Both agents follow symlinked skill folders. If a link cannot be created, for example because permission is denied, `install` prints a `FAIL` line with a remedy and exits with a nonzero code. It removes the links and empty directories that the same run created and keeps everything that was already there. Then it moves on to the next directory.

Links for a single workspace are absolute paths on your machine. Keep them out of a shared ledger repository, for example by adding `.claude/skills/beancount-*` and `.agents/skills/beancount-*` to its `.gitignore`.

## 3. Confirm the agents see them

Check the files first. `verify` only reads, and it exits nonzero with one line per missing skill, supporting reference, or sibling workflow:

```sh
python3 "$SKILLS_SRC/scripts/skills/beancount-skills.py" verify ~/.claude/skills ~/.agents/skills
```

Then ask each agent from your ledger directory. Both should name the same fourteen skills listed in the [skills catalog](../../skills/README.md).

```sh
claude -p "List the names of the skills available to you that start with beancount-, one per line, nothing else."
codex exec --skip-git-repo-check "List the names of the skills available to you that start with beancount-, one per line, nothing else."
```

In an interactive session, Claude Code lists skills with `/skills` and runs one with `/beancount-ask`. In Codex, mention a skill as `$beancount-ask`. Both agents also pick a skill on their own when your request matches its description.

Next: get a first answer from a sample ledger with the [first-query walkthrough](first-query.md), then complete a synthetic month with the [first-month guide](first-month.md). The latter uses the same `bea` and includes [verified Claude Code and Codex rehearsals](first-month-rehearsal.md).

### When a skill does not appear

1. Run `verify` and fix what its `FAIL` lines name. `install` repairs missing links. A skill whose directory is incomplete needs its checkout restored (`git -C "$SKILLS_SRC" restore skills`).
2. Start a new agent session. A running session may not pick up newly added skill directories.
3. Check that no setting hides the skill. For Claude Code, look for a `skillOverrides` entry set to `"off"`. For Codex, look for a `[[skills.config]]` entry with `enabled = false` in `~/.codex/config.toml`.
4. For a single-workspace install, launch the agent inside that workspace. Codex reads `.agents/skills` from the working directory up to the Git repository root.
5. If `install` reported a conflict, see [Existing copies and name conflicts](#existing-copies-and-name-conflicts).

## Install from a standard channel instead

For one versioned install and update, use the [Beancount.io plugin](#plugin-both-clients) on Claude Code/Codex or the [suite package](#one-suite-release) on OpenClaw. The Git channels below also install the whole suite, but copy individual workflow directories rather than installing a versioned plugin. Confirm all fourteen skills with the client listing in step 3 and the [first-query walkthrough](first-query.md). Skills hand off to siblings and share one command contract, so install them together. These channels read this repository; their per-skill catalog pages are not separate releases maintained by Beancount.io.

### `npx skills` (skills.sh)

```sh
# every ledger on this machine (drop -g inside one ledger workspace)
npx skills add https://github.com/bex-co/beancount-io/tree/main/skills -g -a claude-code codex -y
# repeat the same command to refresh the complete suite
```

The explicit `skills/` source selects the customer suite. Skills CLI 1.5.23 installs and refreshes exactly thirteen customer workflows for both clients at project scope (2026-10-23 UTC); the global form adds only `-g`. A separate `skills update -p -y` run did not finish within its 240-second check window, so the exercised whole-suite refresh above repeats the install command. The [channel audit](suite-distribution.md#other-distribution-channels--2026-10-23-utc) retains that limit. Do **not** add `--skill '*'` or `--all` when installing from the repository root: explicit all-skill selection included internal development skills in the earlier 1.5.18 rehearsal. To remove: `npx skills remove -g` and select the installed `beancount-*` names (or pass them as arguments).

### `gh skill`

This compatibility route requires a GitHub CLI build with the preview `gh skill` commands (the original rehearsal used 2.96.0). Older builds such as 2.74.0 do not expose them. Check `gh skill install --help` first; the plugin route above is available independently.

```sh
gh skill install bex-co/beancount-io --all --pin main --agent claude-code --scope user
gh skill install bex-co/beancount-io --all --pin main --agent codex --scope user
```

`--pin main` is required today, not decoration: without it, `gh` resolves this repository's *latest release* (a mobile-app tag from before the flat `skills/` layout) and reports "no standard skills found". Pinned skills are skipped by `gh skill update`, so update by re-running the install commands with `--force` added. There is no `gh skill remove`: run `gh skill list` to see the install directories, then delete the installed `beancount-*` folders from them.

### Plugin (both clients)

The suite also ships as one plugin, `beancount-io`, from this repository's marketplace manifests. Plugin skills are namespaced: invoke one as `/beancount-io:beancount-ask`, against `/beancount-ask` from a linked install (in Codex, `$beancount-io:beancount-ask`).

```sh
# Claude Code — fetch only the manifest and skills/, never the whole repo
claude plugin marketplace add bex-co/beancount-io --sparse .claude-plugin skills
claude plugin install beancount-io@beancount-io
claude plugin update beancount-io@beancount-io   # later updates
claude plugin uninstall beancount-io@beancount-io # remove
```

```sh
# Codex
codex plugin marketplace add bex-co/beancount-io --sparse .agents/plugins --sparse plugin.json --sparse skills
codex plugin add beancount-io@beancount-io
codex plugin marketplace upgrade beancount-io     # refresh, then re-run the add to update
codex plugin add beancount-io@beancount-io
codex plugin remove beancount-io@beancount-io     # remove
```

Both manifests carry one shared suite version; a client delivers a new copy only when that version changes, and every shipped skill change bumps it. Confirm with each client's skill listing (step 3): the fourteen skills appear under the `beancount-io:` namespace.

### Hermes and raw GitHub folders

Hermes supports direct GitHub skill paths, but a single raw folder can omit the shared references its instructions read. An earlier direct `beancount-ask` install was SAFE yet lacked its CLI contract. The self-contained standalone ClawHub listings used in that rehearsal are now retired; do not substitute a raw folder for the complete suite. Full Hermes suite installation remains unavailable because of the [actual host admission limits](suite-distribution.md#hermes-admission-limits). Existing local copies are retained, and the [dated standalone results](clawhub-rehearsal.md) remain historical evidence.

### Choosing a method

- **Plugin:** one versioned Beancount.io suite managed by the client, with namespaced skills and one update. Default when you do not edit skill sources.
- **Link installer (steps 1–3):** one checkout shared by both agents, updated by one `git pull`, with `verify` and conflict detection. Use it to keep local skill edits in Git.
- **A channel (`npx`/`gh`):** one command, no checkout to keep. You trade `verify` and the single update point for per-agent copies that each channel updates its own way.

Keep **one method per client**. A client holding the suite twice (say, linked into `~/.claude/skills` and installed as the plugin) lists both copies with the same descriptions; which one answers a given request is the client's choice, not something either installer controls. `verify` prints a note (not a failure) when it can tell the plugin also provides the suite. Moving from a linked install to the plugin: `uninstall` the links (see [Remove](#remove), keep the checkout only if you want it), then install the plugin.

### Switching methods

Remove the old install **before** installing by another method — two copies of one skill name leave the agent choosing between duplicates, and the link installer refuses a name a copy already holds. Removal per method: link installer — `python3 "$SKILLS_SRC/scripts/skills/beancount-skills.py" uninstall <dirs>` (see [Remove](#remove)); `npx skills` — `remove` above; `gh skill` — delete the folders `gh skill list` shows; Hermes — `uninstall` per name. Then install by the new method and re-run step 3's listing.

## OpenClaw and Hermes Agent

### One suite release

Install the complete suite from one public ClawHub plugin entry,
**[`@puncsky/beancount-io`](https://clawhub.ai/plugins/@puncsky/beancount-io)**,
sharing the Claude Code/Codex suite version **0.4.0**. All thirteen workflows
keep their names, instructions and sibling references.

```sh
openclaw plugins install clawhub:@puncsky/beancount-io --accept-capabilities
openclaw plugins update beancount-io
openclaw skills list --json
```

These exact commands pass on OpenClaw 2026.10.5. The accepted surface contains
only skills; normal registry trust is Safe. All thirteen skills are visible and
callable, all 53 authored files match, and the managed update preserves the
package and unrelated skills. The [suite record](suite-distribution.md) gives
source hashes, search, migration, update limits and the resolved scanner timeout.
Legacy workspace copies take precedence over plugin copies: preserve edits and
remove them through their owning installer before switching to the suite.

Hermes v0.22.4 cannot currently admit the complete portable suite: it rejects nested host metadata and its plugin scanner blocks init's intended instruction-file creation. Existing Hermes standalone copies can remain in use, but their old ClawHub install/update route is retired. The full-suite limitation is tracked by w6/m6.5, alongside the existing init-policy finding w6/039; no forced install or scanner configuration change is part of this route.

### Legacy standalone releases

The thirteen `@puncsky/beancount-*` skill listings were retired through owner
soft-delete on 2026-10-22, after the unified suite became public. Their old
online installation and update commands no longer resolve. Current ClawHub
installation uses only the [one suite entry](#one-suite-release).

Existing local copies and edits are retained. In OpenClaw, workspace skill
copies take precedence over plugin skills: inspect
`openclaw skills info <name> --json`, preserve edits, then remove each old copy through its owning installer
when migrating. For ClawHub-owned copies, the previously exercised removal is:

```sh
clawhub --workdir <workspace> uninstall @puncsky/<skill-name> --yes
```

Check the selected source again after migration. Do not delete unrelated or
manually edited skills automatically. The [migration evidence and retirement
record](suite-distribution.md#legacy-installs-and-migration) retain the exact
scope of these checks.

Earlier releases reached 1.0.4 for all thirteen workflows, with verified
OpenClaw installs, twelve supported Hermes installs and retained first queries.
Those [dated results](clawhub-rehearsal.md#final-current-version-verification--2026-10-22-utc)
are historical evidence, not a fresh standalone installation route. Hermes
cannot currently install the complete suite; its metadata and default-scanner
admission requirements remain open. The [Claude Code/Codex suite](#plugin-both-clients)
and the OpenClaw suite above remain available.

## Update

```sh
SKILLS_SRC="${XDG_DATA_HOME:-$HOME/.local/share}/beancount-io"
git -C "$SKILLS_SRC" status --short skills
git -C "$SKILLS_SRC" pull --ff-only
python3 "$SKILLS_SRC/scripts/skills/beancount-skills.py" install ~/.claude/skills ~/.agents/skills
```

The pull updates every linked agent at once. Running `install` again keeps existing links, links any skill added to the suite since your last install, and prints the revision you are now on (`source … at <commit> <date>`).

### Upgrading from the old layout

Installs made before 2026-10-19 link into the checkout's old `skills/.claude/skills/<name>` folders, and their sparse checkout fetches `skills` only. After a pull those links point at nothing, so the skills disappear from both agents without an error. Upgrade once, from Git:

<!-- upgrade -->
```sh
SKILLS_SRC="${XDG_DATA_HOME:-$HOME/.local/share}/beancount-io"
git -C "$SKILLS_SRC" pull --ff-only
git -C "$SKILLS_SRC" sparse-checkout set skills scripts/skills docs/skills
python3 "$SKILLS_SRC/scripts/skills/beancount-skills.py" install ~/.claude/skills ~/.agents/skills
```

`install` replaces each old link that points into this checkout with a link to `skills/<name>` (`relinked … (moved from skills/.claude/skills)`), then runs `verify`. A link into a different checkout is left alone and reported as a conflict. List your workspace skill directories too if you installed into any.

This upgrade does not apply to the [Windows steps](#windows-powershell). They were first published on 2026-10-28 and have always linked the current `skills/<name>` layout.

### Local edits

`status` shows any edits you made to the checkout, and `install` lists them too, because every linked agent uses them. `git pull --ff-only` keeps edits that the update does not touch. If the update changes a file you edited, Git stops with `Your local changes to the following files would be overwritten` and changes nothing. Then choose one:

```sh
git -C "$SKILLS_SRC" stash && git -C "$SKILLS_SRC" pull --ff-only && git -C "$SKILLS_SRC" stash pop   # keep your edits on top
git -C "$SKILLS_SRC" diff > ~/beancount-skills-edits.patch && git -C "$SKILLS_SRC" restore skills   # save them aside, take the update
```

### Existing copies and name conflicts

If a skill directory already holds a `beancount-*` entry that is not a link into this checkout, such as an earlier manual copy or a link to another checkout, `install` changes nothing in that directory. It prints a `CONFLICT` line for each entry, saying whether a copy is identical to the checkout or listing the files that differ. To keep an entry, move it out of the skill directory, then run `install` again. A renamed copy left inside the directory would still load as a second skill.

```sh
mkdir -p ~/beancount-skill-backups
mv ~/.claude/skills/beancount-ask ~/beancount-skill-backups/
```

## Remove

```sh
SKILLS_SRC="${XDG_DATA_HOME:-$HOME/.local/share}/beancount-io"
python3 "$SKILLS_SRC/scripts/skills/beancount-skills.py" uninstall ~/.claude/skills ~/.agents/skills
git -C "$SKILLS_SRC" status --short skills
rm -rf "$SKILLS_SRC"
```

`uninstall` removes only the links that point into this checkout. It reports anything else with a suite skill's name as kept, and it never touches other skills, agent settings, or ledgers. Check the `status` output for edits you want to keep before deleting the checkout.

## Windows (PowerShell)

The commands in this section were run as written on native Windows 11 (build
26300, ARM64) in Windows PowerShell 5.1, with python.org Python 3.12 and Git
for Windows 2.56. The run covered a symlink-denied account and, after
Developer Mode was turned on, a non-elevated account allowed to create links.
Paths contained spaces and non-ASCII characters. See the
[Windows rehearsal](windows-rehearsal.md). The skills CI also runs this
section's blocks as written in Windows PowerShell 5.1 on a hosted Windows
runner, using a local copy of the suite in place of the clone URL. That is
evidence for the installer, not for agent discovery.

On 2026-10-28, Claude Code 2.1.312 and Codex 0.165.0 on the same host each
listed all fourteen skills from a workspace install and answered the
[first query](first-query.md) through `beancount-ask` and published `bea`
0.3.1, with the corrections in [bea on Windows](#bea-on-windows) and
[Agents on Windows](#agents-on-windows). User-scope discovery on Windows,
PowerShell 7, Microsoft Store Python, and the account right without Developer
Mode have not been tried. WSL is a separate Linux environment: use the
commands above there.

### Prerequisites on Windows

- Git for Windows and Python 3 from python.org. Use `python` (or `py -3`), not
  `python3`. On a default Windows install, `python3` can be the Microsoft Store
  alias, which only prints "Python was not found".
- **Permission to create symbolic links without elevation.** The installer
  links each skill directory into place. Either turn on Developer Mode
  (Settings → System → For developers), or use an account that holds the
  "Create symbolic links" right (`SeCreateSymbolicLinkPrivilege`). Do not run
  the installer from an elevated window instead. Check before installing:

  ```powershell
  python -c "import os,tempfile; d=tempfile.TemporaryDirectory(); t=os.path.join(d.name,'t'); os.mkdir(t); os.symlink(t, os.path.join(d.name,'link'), True); print('directory symlinks: allowed')"
  ```

  `directory symlinks: allowed` means you can continue. `WinError 1314` means
  the permission is missing. Until it is fixed, `install` prints a `FAIL` line
  for each skill directory with this remedy, and exits with a nonzero code. It
  removes any links and empty directories that the same run created, keeps
  everything that was already there, says what state it left, and goes on to
  the next directory. Turning on Developer Mode took effect in the rehearsal
  without signing out or restarting. Open a new PowerShell window afterwards.

Quote every path. Paths with spaces and non-ASCII characters work as long as
they are quoted. Windows PowerShell 5.1 has no `&&`, so run commands one at a
time.

### Get the skills and link them

```powershell
$SKILLS_SRC = Join-Path $env:LOCALAPPDATA 'beancount-io'
git clone --depth 1 --filter=blob:none --sparse https://github.com/bex-co/beancount-io.git "$SKILLS_SRC"
git -C "$SKILLS_SRC" sparse-checkout set skills scripts/skills docs/skills
python "$SKILLS_SRC/scripts/skills/beancount-skills.py" install "$HOME\.claude\skills" "$HOME\.agents\skills"
```

Omit the directory for an agent you do not use. For one ledger workspace, use
`"<workspace>\.claude\skills"` and `"<workspace>\.agents\skills"` instead
(rehearsed with both agents). Git
progress output appears as red `NativeCommandError` text if you redirect it
(`2>&1`, `*>`). Check `$LASTEXITCODE`, which is `0` on success.

### Verify

```powershell
$SKILLS_SRC = Join-Path $env:LOCALAPPDATA 'beancount-io'
python "$SKILLS_SRC/scripts/skills/beancount-skills.py" verify "$HOME\.claude\skills" "$HOME\.agents\skills"
```

Then ask each agent, as in [step 3](#3-confirm-the-agents-see-them).

### bea on Windows

Install `bea` with `uv tool install beancount-io`. The first command that needs
the ledger engine installs it with uv, so uv must be on `PATH` (or `BEA_UV`
must name it). A `bea` installed with `pip` on a machine without uv stops with
`The Beancount engine needs uv to install`.

On the rehearsal host, `bea` 0.3.1's one-time engine install failed with
`[WinError 5] Access is denied: '…\engine\0.3.1.partial.<pid>' -> '…\engine\0.3.1'`.
Windows kept the newly built environment locked for about 30 seconds, and
`bea` does not retry the final rename. Retrying `bea` fails the same way. If
you see this error, delete the leftover `0.3.1.partial.*` folders in
`$HOME\.local\share\bea\engine`, then build the engine with the same uv
commands and wait before renaming it:

```powershell
$engine = Join-Path $HOME '.local\share\bea\engine\0.3.1'
$lock = Join-Path (uv tool dir) 'beancount-io\Lib\site-packages\cli\engine-requirements.lock'
uv venv --relocatable --python 3.12 "$engine.manual"
uv pip install --python "$engine.manual\Scripts\python.exe" --require-hashes --only-binary :all: -r "$lock"
Start-Sleep -Seconds 60
Rename-Item "$engine.manual" '0.3.1'
bea engine status
```

`bea engine status` should then report `Provisioned: yes`. This block is
specific to `bea` 0.3.1 and its default engine location.

### Agents on Windows

These differences from the macOS commands were needed on the rehearsal host:

- **Claude Code** runs `bea` through its PowerShell tool as well as Bash, so
  allow both. With a workspace install, the skill links point outside the
  workspace. Add the checkout's `skills` folder with `--add-dir` so Claude Code
  can read each skill's `references`:

  ```powershell
  $SKILLS_SRC = Join-Path $env:LOCALAPPDATA 'beancount-io'
  claude -p "What were my biggest expenses in June 2026? Ledger is ./ledger.beancount." --allowedTools "Skill" "Read" "Bash(bea:*)" "PowerShell(bea:*)" --add-dir "$SKILLS_SRC\skills"
  ```

- **Codex** with `--sandbox read-only` rejected every command
  (`blocked by policy`) until a Windows sandbox was selected. The unelevated
  sandbox needs no administrator setup:

  ```powershell
  codex exec --sandbox read-only -c 'windows.sandbox="unelevated"' "What were my biggest expenses in June 2026? Ledger is ./ledger.beancount."
  ```

  To make that permanent, set `sandbox = "unelevated"` under `[windows]` in
  `~\.codex\config.toml`. See the
  [Codex Windows sandbox](https://learn.chatgpt.com/docs/windows/windows-sandbox)
  documentation for the elevated option. Only the unelevated sandbox was
  rehearsed.

Only these non-interactive commands were rehearsed. For an interactive
session, start `claude` with the same `--add-dir` and allow `bea` when it asks,
or start `codex` with the same `-c` option (or the `config.toml` setting).
Discovery needed no extra flags in either client: the
[step 3](#3-confirm-the-agents-see-them) listing prompts worked as written. In
the first query, both clients chose `beancount-ask` on their own from the
prompt. Explicit invocation is the same as on macOS: `/beancount-ask` in Claude
Code and `$beancount-ask` in Codex.

### Update

```powershell
$SKILLS_SRC = Join-Path $env:LOCALAPPDATA 'beancount-io'
git -C "$SKILLS_SRC" status --short skills
git -C "$SKILLS_SRC" pull --ff-only
python "$SKILLS_SRC/scripts/skills/beancount-skills.py" install "$HOME\.claude\skills" "$HOME\.agents\skills"
```

Edits to the checkout show up immediately through every link. To keep local
edits when an update touches them, run these one at a time and stop if any of
them fails:

```powershell
git -C "$SKILLS_SRC" stash
git -C "$SKILLS_SRC" pull --ff-only
git -C "$SKILLS_SRC" stash pop
```

### Existing copies and name conflicts

Move a conflicting entry out of the skill directory, then run `install` again.
On Windows the installer prints its hint in this PowerShell form:

```powershell
New-Item -ItemType Directory -Force "$HOME\beancount-skill-backups" | Out-Null
Move-Item "$HOME\.claude\skills\beancount-ask" "$HOME\beancount-skill-backups\"
```

### Remove

```powershell
$SKILLS_SRC = Join-Path $env:LOCALAPPDATA 'beancount-io'
git -C "$SKILLS_SRC" status --short skills
python "$SKILLS_SRC/scripts/skills/beancount-skills.py" uninstall "$HOME\.claude\skills" "$HOME\.agents\skills"
if ($LASTEXITCODE -eq 0) { Remove-Item -Recurse -Force "$SKILLS_SRC" }
```

Run `status` first and save any edits you want to keep (see
[Local edits](#local-edits)) before you run the last two lines. `uninstall`
removes only links into this checkout and keeps everything else. The last line
deletes the checkout only if `uninstall` succeeded.
