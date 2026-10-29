# Native Windows installation rehearsal

This record covers the link installer (`scripts/skills/beancount-skills.py`) on
native Windows through Windows PowerShell 5.1. It is evidence for the
[installation guide](installation.md#windows-powershell). It has two phases on
the same host. In phase 1, link creation was denied. Phase 2 ran after
Developer Mode was turned on and used a non-elevated account that could create
links. A third run, on the same host, covers
[agent discovery and the first query](#agent-discovery-and-first-query)
through Claude Code and Codex. Every path here is synthetic or uses `<user>` in
place of the real account name. WSL was not used, and nothing here is WSL evidence.

## Environment

- Run date: 2026-10-28 (America/Los_Angeles). Phase 1 ran 08:36–08:40 UTC and
  phase 2 ran 08:44–08:48 UTC.
- Windows 11 Pro, version 26H2, build 26300.9711, ARM64. The registry
  `ProductName` value still reads "Windows 10 Pro". `Win32_OperatingSystem`
  reports Windows 11 Pro.
- Shell: Windows PowerShell 5.1.26100.9711. Console code page 65001 (UTF-8).
- Python: `python` resolves to python.org CPython 3.12.10 (an AMD64 build running
  under ARM64 emulation). `py -3` resolves to 3.13.15. `python3` resolves to the
  Microsoft Store alias stub in `WindowsApps`. It prints "Python was not found…"
  and exits 9009.
- Git 2.56.0.windows.3, with `core.symlinks=false` (the Git for Windows
  default; the installer does not depend on it).
- Source: fresh sparse clones of `https://github.com/bex-co/beancount-io.git`.
  Phase 1 cloned `43d0149` and later fast-forwarded it to `79cc7cd`. Phase 2
  cloned `4dd6ec2`. All three revisions are from 2026-10-28, and each contains
  14 `beancount-*` skills.
- `bea` was not on `PATH`. That does not affect installation; `verify` prints a
  note about it.
- Agents: none were run in this phase. Discovery through Claude Code and Codex
  is covered by the [third run](#agent-discovery-and-first-query).

## Installation scope

- Source checkout:
  `<repo>\scripts\skills\tmp\win rehearsal ü\src\beancount-io`. The path has a
  space and a non-ASCII character in a parent directory.
- Destinations, standing in for user scope: `<R>\home\.claude\skills` and
  `<R>\home\.agents\skills`, where `<R>` is the rehearsal root above. The real
  `C:\Users\<user>\.claude\skills`, `.agents\skills` and `.codex` directories
  were not touched.
- Each destination already held an unrelated skill, `my-own-skill\SKILL.md`, and
  an unrelated file, `notes ü.txt`. Their SHA-256 hashes were recorded before
  the first command and compared after the last.
- Additional destinations covered a directory that did not exist yet
  (`<R>\home\new dest\skills`) and a workspace that already held a locally
  edited copy of `beancount-ask` (`<R>\home\conflict ws\.claude\skills`).
- Untested: workspace scope inside a real ledger repository, real user-scope
  directories, OneDrive-redirected profiles, PowerShell 7, and Python from the
  Microsoft Store.

## Symlink configuration observed

### Phase 1: denied

- Developer Mode was off: `HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock`
  exists, but it has no `AllowDevelopmentWithoutDevLicense` value.
- The session was not elevated: the token is not in the Administrators role.
- `whoami /priv` does not list `SeCreateSymbolicLinkPrivilege`.
- A probe that creates a directory symlink in a temporary directory fails with
  `OSError: [WinError 1314] A required privilege is not held by the client` and
  exits 1. It leaves no temporary directory behind:

  ```powershell
  python -c "import os,tempfile; d=tempfile.TemporaryDirectory(); t=os.path.join(d.name,'t'); os.mkdir(t); os.symlink(t, os.path.join(d.name,'link'), True); print('directory symlinks: allowed')"
  ```

No machine setting, policy or privilege was changed during this phase.

### Transition and phase 2: allowed

- **Before:** Developer Mode off. There was no `AllowDevelopmentWithoutDevLicense`
  value, so the account could not create links without elevation (phase 1).
- **Change:** on 2026-10-28, the operator set
  `HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock\AllowDevelopmentWithoutDevLicense = 1`.
  This is the same setting as Settings → System → For developers → Developer
  Mode. It was set with `reg.exe` from a separate elevated prompt, which the
  user approved through UAC. The agent session was neither elevated nor used to
  make the change.
- **After:** the value reads `1`. The agent session is still not elevated, and
  `whoami /priv` still does not list `SeCreateSymbolicLinkPrivilege`. The probe
  printed `directory symlinks: allowed` and exited 0 without a sign-out or
  reboot. Python's `os.symlink` succeeded through the unprivileged-create flag
  that Developer Mode honours.

## Denied-link results (phase 1)

The commands are the documented macOS/Linux steps translated to PowerShell. The
script path and destinations were quoted. Exit codes come from
`Start-Process -Wait -PassThru` with stdout and stderr captured to separate files.

| # | Command (`python <src>\scripts\skills\beancount-skills.py …`) | Exit | Outcome |
| - | --- | - | --- |
| 1 | `git clone --depth 1 --filter=blob:none --sparse …` + `sparse-checkout set skills scripts/skills docs/skills` | 0, 0 | Clone and sparse checkout succeeded into the space/`ü` path (9.2 s for both). |
| 2 | `install "<R>\home\.claude\skills" "<R>\home\.agents\skills"` | 1 | **Raw Python traceback** ending in `OSError: [WinError 1314] A required privilege is not held by the client: '<src>\skills\beancount-accruals' -> '<R>\home\.claude\skills\beancount-accruals'`. Nothing on stdout (1.1 s). |
| 3 | `verify` (both) | 1 | 14 `FAIL beancount-*: not installed` lines per destination (28 in all), then the repair hint. |
| 4 | `install` repeated (both) | 1 | Same traceback; the result was identical and nothing changed. |
| 5 | `install "<R>\home\.agents\skills"` alone | 1 | Same traceback for the second destination. |
| 6 | `uninstall` (both) | 0 | No output. Nothing was removed. |
| 7 | `verify "<R>\home\new dest\skills"` (missing) | 1 | `FAIL …: directory does not exist; run install first`. |
| 8 | `install "<R>\home\new dest\skills"` (missing) | 1 | Same traceback, after `install` **created** `new dest\skills`. The empty directories remain. |
| 9 | `install` into a workspace holding an edited `beancount-ask` copy | 1 | Clean refusal before any link was attempted: `CONFLICT … is a copy with local changes: modified SKILL.md`, then `Nothing was changed`. The copy's hashes were unchanged. |
| 10 | `uninstall` on that workspace | 0 | `kept … is a copy with local changes: modified SKILL.md`. The copy stays. |
| 11 | `py -3 … install "<R>\home\.claude\skills"` (Python 3.13.15) | 1 | Same `WinError 1314` traceback. |
| 12 | `verify ~/.claude/skills`, with `USERPROFILE` pointed at `<R>\home` for that process only | 1 | PowerShell 5.1 passes `~` through unchanged and Python expands it from `USERPROFILE`. The check reached the run-owned directory as expected. |
| 13 | `git -C <src> status --short skills`; `git -C <src> pull --ff-only` | 0, 0 | The shallow sparse checkout fast-forwarded `43d0149..79cc7cd`. |

### Confirmed

- When link creation is denied, `install` exits 1 with an unhandled traceback.
  The message names neither the cause (no symlink permission) nor a remedy.
- The failure happens on the first missing link (`beancount-accruals`, the
  first name in sorted order) of the first destination. Later destinations on
  the same command line are never attempted, and there is no summary.
- No link was created and no partial installation was left behind in the
  destinations tried. There were 0 reparse points under `<R>\home` afterwards.
- Pre-existing entries survived every command with identical SHA-256 hashes:
  the unrelated skill, the unrelated file and the edited conflicting copy.
- `install` creates a missing destination directory, including missing parents,
  before it tries the first link. A denied run leaves those new empty
  directories in place.
- Conflict detection, `verify`, and `uninstall` behave on Windows as documented.
  They run before or without symlink creation.
- Several remedies that the installer prints are not runnable as printed in
  Windows PowerShell 5.1:
  - The conflict hint
    `mkdir -p C:\Users\<user>\beancount-skill-backups && mv <dest>/<name> …/` is
    rejected by the parser (`The token '&&' is not a valid statement separator
    in this version.`). It also leaves paths containing spaces unquoted and
    mixes `\` with `/`.
  - The `verify` repair hint starts with `python3`. On this host `python3` is
    the Store stub, which exits 9009. The hint also leaves the script and
    destination paths unquoted, although both contain spaces.
- In Windows PowerShell 5.1, redirecting or merging Git's progress output
  (`*>`, `2>&1`) wraps it in a `NativeCommandError` record even though Git
  exits 0. This is cosmetic: check `$LASTEXITCODE` rather than the red text.

### Hypotheses (not reproduced here)

- **Interrupted run with some links in place.** A destination can already hold
  links when a run is denied, for example after a new skill was added upstream
  of a permitted install. A denied run there would print `kept` lines and then
  the traceback. Earlier links would survive and the new one would be missing,
  with no explanation. This could not be built without link permission.
- **Mid-run failure after a successful link.** If a link fails after others on
  the same run succeeded (on another host or for another cause), the run is
  left partly installed without cleanup or explanation. It was not observed.
- **`Remove-Item -Recurse` through a directory symlink** may delete the link
  target's contents, in this case the shared checkout. Phase 2 refuted this
  (see below).
- **Agent discovery on Windows** through these links was not tried in this
  phase.

Since then, the installer reports and rolls back denied and interrupted runs,
which `TestLinkFailures` in `scripts/skills/test_beancount_skills.py` covers
with a mocked `os.symlink`, and the [third run](#agent-discovery-and-first-query) covered
workspace-scope discovery. The printed conflict and repair remedies now use
PowerShell commands with single-quoted literal paths (`Move-Item -LiteralPath`,
`python '…\beancount-skills.py' install '<dest>'`), because double quotes
expand `$` and backticks. On this host,
`TestLinkFailures.test_printed_windows_remedies_run_in_windows_powershell` runs
them as printed in `powershell.exe` under a home named
``home $x `t 'q' it’s [b] ü``: the edited copy is moved, the suite verifies,
and nothing is created under another spelling of the path.

### Elapsed time

The rehearsal took about four minutes of wall time, from seeding the
destinations to the final integrity check. The clone and sparse checkout took
9.2 s. Each denied `install` returned in about 1 s.

## Allowed-link results (phase 2)

Method: the guide's `powershell` code blocks were extracted from
`installation.md` and run **verbatim**, line by line, in one
`powershell.exe -NoProfile` session. That session had `USERPROFILE` (and so
`$HOME`) set to `<R2>\home` and `LOCALAPPDATA` set to `<R2>\LocalAppData`, where
`<R2>` is `<repo>\scripts\skills\tmp\win rehearsal ü\phase2`. As a result,
`$SKILLS_SRC` was `<R2>\LocalAppData\beancount-io`, and both the source and the
destinations had a space and `ü` in their paths. As in phase 1, each
destination was seeded with `my-own-skill\SKILL.md` and `notes ü.txt` and their
hashes were recorded. The exit code is `$LASTEXITCODE` after each line.

| # | Step (guide block) | Exit | Outcome |
| - | --- | - | --- |
| P1 | Symlink check (prerequisites) | 0 | `directory symlinks: allowed`. |
| P2 | `$SKILLS_SRC = …`, `git clone …`, `sparse-checkout set …` (Get the skills) | 0, 0, 0 | Fresh sparse clone at `4dd6ec2`. Together with P3 this took 10.4 s, including the check. |
| P3 | `python "$SKILLS_SRC/…/beancount-skills.py" install "$HOME\.claude\skills" "$HOME\.agents\skills"` | 0 | 28 `linked` lines (14 per destination), `source … at 4dd6ec2 2026-10-28`, and `OK 14 customer skills complete` for each destination. Each entry is a `SymbolicLink` (`<SYMLINKD>` in `dir /AL`) with an absolute target `<R2>\LocalAppData\beancount-io\skills\<name>`. |
| P4 | `verify` (Verify) | 0 | `OK 14 customer skills complete` for both destinations, plus the `bea` note. |
| P5 | `status`, `pull --ff-only`, `install` (Update) | 0, 0, 0 | `Already up to date.` The repeat install printed 28 `kept` lines and `OK` for both. |
| P6 | Appended a line to `skills\beancount-ask\SKILL.md` in the checkout | — | The edit was visible through both links at once. `status` showed ` M skills/beancount-ask/SKILL.md`. |
| P7 | `stash`, `pull --ff-only`, `stash pop` (Update, local edits) | 0, 0, 0 | The edit survived, and `install` then listed it under `note: local changes in the source checkout`. `git restore skills` reverted it, both links showed the original hash again, and the stash list was empty. |
| P8 | Replaced the `.claude\skills\beancount-ask` link with an edited copy, then ran `install` | 1 | `CONFLICT … is a copy with local changes: modified SKILL.md` and `Nothing was changed`. The other 13 links stayed. |
| P9 | `New-Item … beancount-skill-backups`, `Move-Item …\beancount-ask …\beancount-skill-backups\` (Existing copies) | 0, 0 | Copy moved. The backup's file hashes match the copy. |
| P10 | `install` again | 0 | `linked …\beancount-ask`, `OK 14 customer skills complete`. |
| P11 | `$SKILLS_SRC = …`, `uninstall`, `status`, `Remove-Item -Recurse -Force "$SKILLS_SRC"` (Remove) | 0, 0, 0, 0 | 28 `removed` lines and a clean status; the checkout was deleted. |
| P12 | Integrity check | — | 0 reparse points under `<R2>\home`. Each destination holds only `my-own-skill` and `notes ü.txt`, and their SHA-256 hashes match the seed. The backup copy is intact. |

### Confirmed (phase 2)

- The guide's Windows install, verify, update, local-edit, conflict-recovery and
  removal commands work as written in Windows PowerShell 5.1 when Developer Mode
  is on. This was tested with quoted paths containing spaces and `ü`, at
  stand-in user scope.
- The installer creates absolute directory symlinks, not junctions or copies.
  Repeat runs keep them, and `uninstall` removes exactly the links into this
  checkout.
- Source edits reach every linked agent directory at once. That is the
  shared-checkout model the macOS guide describes.
- Pre-existing unrelated entries, a moved local copy, and the checkout's own
  files (until it was deliberately deleted) stayed byte-identical.
- **`Remove-Item -Recurse` through a directory symlink did not delete the
  target** on Windows PowerShell 5.1.26100.9711. This was tested only on a
  throwaway target containing two files and a subdirectory. Running
  `Remove-Item -Recurse -Force` on the link itself removed just the link.
  Running it on a directory containing the link removed that directory and the
  link. In both cases both target files remained. The phase 1 hypothesis is
  refuted for this build. The guide still removes links with `uninstall`,
  which touches only links into this checkout.

### Corrections made to the draft guide

- The Verify block now defines `$SKILLS_SRC` itself, like Update and Remove do.
  Without it, the block only works in the same session that ran the install.
- The Remove block no longer says to avoid `Remove-Item -Recurse`, because the
  phase 2 check refuted that concern on this build.
- The Git progress note now says the red `NativeCommandError` text appears only
  when output is redirected. Unredirected progress in the console is not an
  error.

### Not verified (hypotheses or open)

- User-scope agent discovery (`%USERPROFILE%\.claude\skills`,
  `%USERPROFILE%\.agents\skills`). The [third run](#agent-discovery-and-first-query) covered
  workspace scope only.
- A Git update that actually touches a locally edited file. In phase 2 the pull
  was already up to date, so `stash`/`pop` ran without a real merge. Phase 1
  showed that a real fast-forward works on a shallow sparse clone, but without
  links in place.
- An account holding `SeCreateSymbolicLinkPrivilege` without Developer Mode;
  PowerShell 7; Microsoft Store Python; workspace scope inside a real ledger
  repository; OneDrive-redirected profiles; older `Remove-Item` builds.

### Elapsed time (phase 2)

All steps took about 3.5 minutes of wall time. Running the guide's clone and
install blocks took 10.4 s.

## Limitations

- Both phases used one host and one account, with Windows PowerShell 5.1 only.
- Phases 1 and 2 ran no agent sessions. Discovery and the first query are
  covered only by the [third run](#agent-discovery-and-first-query), with
  its own limitations.
- Phase 2 used stand-in profile directories by overriding `USERPROFILE` and
  `LOCALAPPDATA`. The real profile's skill directories were never touched.

## Agent discovery and first query

On 2026-10-28, from about 09:45 to 10:30 UTC, published `bea`, the linked
suite, real Claude Code and Codex sessions, and the
[first-query](first-query.md) fixture were used on the same host and account.
Both clients listed exactly the suite's fourteen skills, and both returned the
expected June figures through `beancount-ask` and `bea`. The ledger stayed
byte-identical. Neither client got there without corrections; they are listed
below.

### Environment and versions

- Host, shell, Python and Git as in [Environment](#environment). Developer Mode
  was on (phase 2 state). The session was not elevated, and no machine setting
  was changed.
- Claude Code 2.1.312 (`C:\Users\<user>\.local\bin\claude.exe`), signed in.
  The model reported in the session was `claude-opus-5-5`.
- Codex CLI 0.165.0, the npm `@openai/codex-win32-arm64` build, signed in with
  ChatGPT. `codex doctor` reported `sandbox backend disabled` under the default
  configuration. Its default model was used.
- Suite source: a fresh sparse clone of `bex-co/beancount-io` at `d3a01d6`
  (2026-10-28), with fourteen `beancount-*` skills.
- `bea` 0.3.1 from PyPI, installed with `uv tool install beancount-io` (uv
  0.13.6, aarch64). It resolves to `C:\Users\<user>\.local\bin\bea.exe`, the
  only `bea` on `PATH`. The tool environment is
  `%APPDATA%\uv\tools\beancount-io`, and its engine is
  `C:\Users\<user>\.local\share\bea\engine\0.3.1` (Python 3.12, x64 under
  emulation).

### Installation scope

**Workspace scope**, run for the first time on Windows. The workspace was
`<repo>\scripts\skills\tmp\t004 rehearsal ü\first query ü`. It is a fresh
`git init` repository holding only `ledger.beancount` and `ledger.sha256`.
The guide's Windows `install` command, with the workspace's
`.claude\skills` and `.agents\skills` as destinations, created 28 absolute
directory symlinks into `<repo>\scripts\skills\tmp\t004 rehearsal ü\src\beancount-io`.
It printed `OK 14 customer skills complete` twice, and `verify` exited 0. The
checkout was in that run directory, not in `%LOCALAPPDATA%`; the commands were
otherwise as written. User-scope directories were not used. The user's
`~\.claude\skills` (three unrelated entries) and the missing
`~\.agents\skills` were inventoried before the run and compared after it.

### Discovery

The prompt was the [step 3 listing prompt](installation.md#3-confirm-the-agents-see-them),
run from the workspace with no extra flags:
`claude -p "…"` and `codex exec --skip-git-repo-check "…"`.

| Client | Time | Result |
| --- | --- | --- |
| Claude Code | 9.2 s | Exactly `beancount-accruals`, `-add`, `-ask`, `-close`, `-import`, `-importer-author`, `-init`, `-invoices`, `-migrate`, `-options`, `-property`, `-reconcile`, `-roll-forward`, `-trade`. The session's startup skill catalog lists the same fourteen. The repository's own development skills did not leak in from the enclosing checkout. |
| Codex | 30.6 s | The same fourteen names, with no tool calls. They came from the session's skill catalog. |

### First query

The prompt was the first-query prompt, verbatim:
`What were my biggest expenses in June 2026? Ledger is ./ledger.beancount.`

| Client and invocation | Time | Result |
| --- | --- | --- |
| Claude Code: `claude -p "…" --allowedTools "Skill" "Read" "Bash(bea:*)"`, as documented | 78.2 s | **Correct.** It called `Skill(beancount-ask)`, then ran `bea --file ledger.beancount --json --no-input query "SELECT account, sum(weight) AS total WHERE account ~ '^Expenses:' AND date >= 2026-06-01 AND date < 2026-07-01 GROUP BY account ORDER BY total DESC"` through Bash. The answer showed Groceries 141.60, Gas 50.00 and Streaming 17.99 USD, excluded the savings transfer, and showed the query. Its first attempt used the PowerShell tool, which `Bash(bea:*)` does not allow, so that call was denied. Glob found no files under the linked `references\`, so the skill's tested recipe was not read. |
| Claude Code, as above plus `"PowerShell(bea:*)"` and `--add-dir "<src>\skills"` | 62.3 s | **Correct**, with no permission denials. It read `beancount-ask/references/bql-recipes.md` through the link and ran that file's `top-expenses` recipe with `bea`. |
| Codex: `codex exec --sandbox read-only "…"`, as documented | 28.9 s | **Failed, no answer.** It chose `beancount-ask`, but its first command (`Get-Content` on the skill's `SKILL.md`) was `rejected: blocked by policy`, because no Windows sandbox was configured. It then asked for the ledger to be pasted. |
| Codex: `codex exec --sandbox read-only -c 'windows.sandbox="unelevated"' "…"` | 74.6 s | **Correct.** In the unelevated Windows sandbox it read `.agents/skills/beancount-ask/SKILL.md`, `beancount-init/references/bea-cli.md` and `beancount-ask/references/bql-recipes.md`, checked `Get-Command bea` (`C:\Users\<user>\.local\bin\bea.exe`, `bea 0.3.1`), and ran the same `bea --json --no-input query` through PowerShell. It answered 141.60, 50.00 and 17.99 USD and showed the query. |

These figures match the [expected answer](first-query.md#4-check-the-answer)
exactly.

### Ledger checksum

SHA-256 of `ledger.beancount` was
`2b317c05fe19611193a0936cc8cb3d3748a78111cde7376df5ed75c756efcc9b` before the
first session. It was the same after every one of the eight recorded sessions,
including the failed ones, and after cleanup. The workspace's `git status`
showed only the two untracked fixture files.

### Corrective interventions

1. **`bea` installed with pip found no uv.** The first `bea` install used
   `python -m pip install --user beancount-io`, because neither uv nor pipx was
   present. The documented channels are `uv tool install` and pipx. That put
   `bea.exe` in `%APPDATA%\Python\Python312\Scripts`, which is not on `PATH`.
   With that directory added for the session, the first Claude query stopped
   at engine provisioning: `The Beancount engine needs uv to install, and uv
   was not found on PATH.` Fix: uv was installed with its official PowerShell
   installer into `~\.local\bin`, which was already on `PATH`
   (`UV_NO_MODIFY_PATH=1`, so the user's `PATH` was not changed). The pip copy
   was uninstalled, and `bea` was reinstalled with `uv tool install
   beancount-io`.
2. **The engine's first-use install fails on this host.** The first local
   command (an agent's `bea … query`, then `bea --file ledger.beancount check`
   in a plain terminal) failed after the packages installed:
   `[WinError 5] Access is denied: '…\engine\0.3.1.partial.<pid>' -> '…\engine\0.3.1'`.
   A standalone reproduction with uv showed that a freshly built venv cannot be
   renamed for about 29 s after `uv pip install` finishes. One retry loop
   succeeded after 28.8 s and another after 28.7 s. A venv with no installed
   packages renamed at once. Published `bea` 0.3.1 renames once and does not
   retry. Each failed attempt also left a `0.3.1.partial.<pid>` directory
   behind, which it could not delete either. Fix: the stale partial
   directories were deleted, and the engine was built with the same uv
   commands and the shipped hash lock, followed by a 60-second wait and then
   the rename. That workaround is the block now in the
   [installation guide](installation.md#bea-on-windows). It was rerun as
   written in a fresh `powershell -NoProfile` (90 s), and `bea engine status`
   then reported `Provisioned: yes`.
3. **Claude Code on Windows reaches for the PowerShell tool.** The documented
   allow-list covers only `Bash(bea:*)`. Adding `"PowerShell(bea:*)"` removed
   the denied first attempt.
4. **Claude Code could not read the linked skill's references at workspace
   scope.** The links resolve outside the working directory, so Read and Grep
   on `references\bql-recipes.md` were refused ("resolves through a symlink
   to … but you haven't granted it yet"), and Glob found nothing. Adding
   `--add-dir "<checkout>\skills"` fixed it. The answer was correct either
   way, because the query is also printed in `SKILL.md`.
5. **Codex `--sandbox read-only` rejected every command** until the Windows
   sandbox implementation was chosen for the run with
   `-c 'windows.sandbox="unelevated"'`. This needs no administrator setup, and
   no `config.toml` was written. The elevated implementation was not tried,
   because it needs administrator-approved setup.
6. **Runner script encoding.** A rehearsal helper script (not part of the
   guide) containing `ü` failed in Windows PowerShell 5.1 because the file had
   no BOM. The working directory could not be set, so that one discovery
   attempt ran from the previous directory and its output was lost. It sent
   only the read-only listing prompt, and it was discarded and not counted.
   The helper was rewritten as ASCII. This is not a guide issue.

### Elapsed time

About 45 minutes of wall time, from the first `bea` install to cleanup. Most
of it went to diagnosing interventions 1 and 2. Without them, the measured
steps were: `uv tool install beancount-io` 10.7 s, clone plus sparse checkout
4.9 s, install plus verify about 2 s, engine workaround 90 s, Claude Code
discovery 9.2 s and query 62–78 s, Codex discovery 30.6 s and query 74.6 s.

### Cleanup and preserved state

- `uninstall` on both workspace directories printed 28 `removed` lines and
  exited 0. No reparse points remained under the run directory. The run's
  checkout and workspace were deleted afterwards.
- `~\.claude\skills`, `~\.claude\settings.json` and `~\.codex\auth.json` are
  byte-identical to the pre-run inventory. `~\.agents\skills` still does not
  exist, and `~\.codex\config.toml` was never created. Two files changed
  because the clients maintain them: `~\.claude.json` (Claude Code's session
  state) and the `.last-complete-round` marker in a Claude-managed synced
  skill folder. Codex's first sessions on this host created its own state in
  `~\.codex`: sessions, SQLite stores, `skills\.system`, `.sandbox` and
  `cap_sid`.
- Left installed: uv 0.13.6 and uvx in `~\.local\bin`, `bea` 0.3.1 as a uv
  tool, and its provisioned engine. The pip `--user` dependencies from
  intervention 1 remain in `%APPDATA%\Python\Python312\site-packages`; only
  `beancount-io` itself was uninstalled there.

### Limitations (third run)

- One host and account, Windows 11 ARM64, Windows PowerShell 5.1. Each prompt
  ran once per invocation, so this is not evidence of model reliability.
- Workspace scope only. User-scope discovery (`~\.claude\skills`,
  `~\.agents\skills`) was not run on Windows.
- Codex was verified only with the unelevated Windows sandbox. The elevated
  and MXC implementations were not tried.
- The engine-rename failure was reproduced on this host only. It may depend on
  this machine's real-time scanning (`codex doctor` flagged Microsoft Defender
  as active), and it was not tested elsewhere. The CLI fix belongs to the
  `cli/` package and a new `bea` release.
