# Native Windows installation rehearsal

This record covers the link installer (`scripts/skills/beancount-skills.py`) on
native Windows through Windows PowerShell 5.1. It is evidence for the
[installation guide](installation.md#windows-powershell). It has two phases on
the same host. In phase 1, link creation was denied. Phase 2 ran after
Developer Mode was turned on and used a non-elevated account that could create
links. Agent discovery and the first query are not covered here; they belong
to a later task. Every path here is synthetic or uses `<user>` in place of the real
account name. WSL was not used, and nothing here is WSL evidence.

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
  is task t004.

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
  with no explanation. This could not be built without link permission, so it
  belongs in t002's tests (mocked `os.symlink`).
- **Mid-run failure after a successful link.** If a link fails after others on
  the same run succeeded (on another host or for another cause), the run is
  left partly installed without cleanup or explanation. The code path
  (`install`, lines 258–268) supports this; it was not observed.
- **`Remove-Item -Recurse` through a directory symlink.** In Windows PowerShell
  5.1 this may delete the link target's contents, in this case the shared
  checkout. That is why the drafted guide removes links only with `uninstall`.
  Phase 2 refuted this on build 5.1.26100.9711 (see below).
- **Codex discovery on Windows.** Codex is assumed to read
  `%USERPROFILE%\.agents\skills` and follow directory symlinks there; Claude
  Code is assumed to follow them in `%USERPROFILE%\.claude\skills`. That is t004.

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

- Agent discovery: Claude Code reading `%USERPROFILE%\.claude\skills` and Codex
  reading `%USERPROFILE%\.agents\skills` through these links, and the first
  query. That is task t004.
- A Git update that actually touches a locally edited file. In phase 2 the pull
  was already up to date, so `stash`/`pop` ran without a real merge. Phase 1
  showed that a real fast-forward works on a shallow sparse clone, but without
  links in place.
- An account holding `SeCreateSymbolicLinkPrivilege` without Developer Mode;
  PowerShell 7; Microsoft Store Python; workspace scope inside a real ledger
  repository; OneDrive-redirected profiles; older `Remove-Item` builds.
- A denied run in the middle of an install that already has some links
  (phase 1 hypotheses). These still need t002's mocked tests.

### Elapsed time (phase 2)

All steps took about 3.5 minutes of wall time. Running the guide's clone and
install blocks took 10.4 s.

## Limitations

- Both phases used one host and one account, with Windows PowerShell 5.1 only.
- No agent sessions were run, so this record is not evidence of skill discovery
  or a first query.
- Phase 2 used stand-in profile directories by overriding `USERPROFILE` and
  `LOCALAPPDATA`. The real profile's skill directories were never touched.
- WSL was not used and is not native evidence.
