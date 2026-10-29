# w5 · m13 — Install the ledger skills and reach a first query on native Windows

**Worker:** worker1 **Goal:** a native Windows user installs the eight customer ledger skills, maintains that installation, and reaches a verified first answer through either agent **Status:** in progress (unblocked 2026-10-28; t001, t002, t004–t006 done; t003 awaiting a GitHub runner run)

**Estimate:** 3h30m implementation; 5h30m including standing closing tasks (8 tasks). Priority 2 in the approved proposal; no hard dependency on m12.

## Unblocked

**Blocked 2026-09-29 → unblocked 2026-10-28.** It was parked because the only execution host was macOS. A native Windows 11 Pro workspace (build 26300, arm64) with Windows PowerShell 5.1, Python and Git is now available, and its symlink configuration is observable: a non-elevated `os.symlink` is refused with `WinError 1314` (Developer Mode off, `SeCreateSymbolicLinkPrivilege` not held). That clears the first prerequisite for t001–t003. The same day, with the user's approval, Developer Mode was turned on through a user-confirmed elevated prompt (the agent session stayed non-elevated), so t001 recorded both the denied and the allowed case; see [the Windows rehearsal](../../../docs/skills/windows-rehearsal.md). Codex CLI 0.165.0 and Claude Code are installed and signed in on the host for t004; published bea is still to be installed there.

## Blocked

- **t003** (blocked in place 2026-10-28): the Windows installer job is implemented and passes locally on native Windows, but neither CI (skills) job has run on GitHub runners because nothing has been pushed. **Unblock:** the maintainer pushes and both jobs pass. t004 proceeds meanwhile: it depends on t003's documented commands and installer, which are final; only the runner confirmation is outstanding.

**Skill count.** The suite grew from eight to fourteen customer skills after this milestone was approved; t004 verified discovery of all fourteen, and the definition of done applies to the whole suite.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Rehearse native installation and document PowerShell prerequisites — **DONE** | 45m | — |
| t002 | Make installer link failures actionable and preserve existing state — **DONE** | 60m | w5/m13/t001 |
| t003 | Add the native Windows installer lifecycle CI job | 45m | w5/m13/t002 |
| t004 | Verify discovery and the first query through both native Windows agents — **DONE** | 60m | w5/m13/t003 |
| t005 | Adoption surface — **DONE** | 30m | w5/m13/t004 |
| t006 | Simplify — **DONE** | 30m | w5/m13/t005 |
| t007 | Test coverage | 45m | w5/m13/t005, w5/m13/t006 |
| t008 | Closeout | 15m | w5/m13/t006, w5/m13/t007 |

## Definition of done

- Copyable PowerShell instructions install all eight customer skills from the shared source checkout under explicitly documented native Windows and symlink prerequisites.
- Repeat installation, source updates, verification, conflict recovery, and removal work with spaces and Unicode in paths. Existing unrelated skills, local edits, source files, and ledgers remain intact.
- Unsupported link permissions produce a clear nonzero result and actionable remedy. Interrupted creation does not leave an unexplained partial installation or remove any pre-existing entry; cleanup is limited to links created by the failed invocation.
- Real native Windows Claude Code and Codex sessions discover the suite and answer the existing first-query fixture correctly through the installed skill and published bea. The ledger remains byte-identical.
- Rehearsal evidence records Windows, shell, Python, Git, agent, CLI, and source versions, the installation scope, symlink prerequisites, elapsed time, corrections, and limitations. CI alone cannot satisfy agent usability acceptance.
- A focused Windows CI job covers the installer lifecycle and the relevant PowerShell instructions while existing skills checks remain green. Successful linking and denied/failed linking are both covered without globally weakening assertions.
- Customer documentation states the tested native Windows scope accurately, preserves the shared-source symlink model, and remains usable for existing macOS/Linux readers.

## Source + Goal linkage

- **Source:** `/pm-brainstorm for w5`, both proposals approved with `$pm for all for w5` on 2026-09-28. Builds on [w5/m3's installed-suite baseline](../done/m3/README.md), the [installation guide](../../../docs/skills/installation.md), and [the current installer](../../../scripts/skills/beancount-skills.py). Platform references: [Codex native Windows](https://learn.chatgpt.com/docs/windows/windows-sandbox), [Claude Code setup](https://code.claude.com/docs/en/setup#set-up-on-windows), and [Python symlink prerequisites](https://docs.python.org/3/library/os.html#os.symlink).
- **Goal linkage:** **A2 — Frictionless onboarding** and **A3 — Community & distribution**. Native Windows users can install the existing customer suite and obtain their first verified ledger answer through documented commands.
- **Expected outcome:** Both native Windows agents discover all eight installed skills and answer the existing synthetic first-query example correctly. Record installation success, time to first query, and manual corrections as rehearsal signals; preserve the installer lifecycle in Windows CI.
- **Why now:** Published CLI installation checks already cover Windows, while the customer-skills installation and first-query guides explicitly leave it uncovered. w5 has capacity and this extends the shipped installer instead of inventing a new distribution system.
- **Adoption surface:** included because the shipped assets are customer- and agent-facing. Preserve equivalent discovery and workflow semantics for Claude Code and Codex and document actual platform limits.

## Boundaries and dependencies

- Implementation belongs in skills/, plus the package-owned .github/workflows/ci-skills.yml job and root discovery pointers as needed. Keep synthetic workspaces and raw logs under scripts/skills/tmp/ or the equivalent job-owned temporary directory on Windows.
- Retain one source checkout and directory symlinks; do not add junction/copy fallback modes, a plugin distribution system, new dependencies, or changes to the repository's shared development-skill link.
- Document required symlink capability and verify it on the target host. Do not silently enable Developer Mode, change machine policy, or elevate agent sessions. A host that lacks permission should receive a clear remedy and no false success.
- The approved deliverable is native Windows onboarding through PowerShell. WSL is a distinct environment and cannot substitute for native acceptance. Reuse the existing first-query fixture rather than building a new accounting journey.
- Use run-owned agent skill destinations where possible and preserve unrelated skills and user configuration. Authenticated agent access and a native Windows host are required for the live rehearsal; if unavailable at execution time, record the exact blocker, owner, and unblock condition rather than claiming the CI run proves usability.
- The current Windows gap is documented scope, not an already reproduced native defect. Reproduce installation and failure behavior before choosing the minimal repair. Keep deterministic Windows lifecycle checks independent of paid model calls.
- m12 is independent; m5 and inbox 015 retain their existing external blockers. No hosted accounting deployment, bank connection, ledger export, or duplicate MCP stack is needed.
