# w5 · m13 — Install the ledger skills and reach a first query on native Windows

**Worker:** worker1 **Goal:** a native Windows user installs the eight customer ledger skills, maintains that installation, and reaches a verified first answer through either agent **Status:** blocked

**Estimate:** 3h30m implementation; 5h30m including standing closing tasks (8 tasks). Priority 2 in the approved proposal; no hard dependency on m12.

## Blocked

**Blocked 2026-09-29** — The available execution host is macOS 26.5.1 (arm64), and no accessible native Windows host has been provided to this session. t001 requires observed PowerShell installation and both allowed/denied symlink behavior on a named native Windows environment. The current installation and first-query guides explicitly leave Windows untested; this is missing platform evidence, not a reproduced Windows defect. No installer repair or Windows implementation was started, and no partial code needs recovery.

**Owner:** the user or workstation operator who can provide access to a native Windows host.

**Unblock:** provide usable access to a native Windows workspace for the t001 baseline, with PowerShell, Python, Git, and an observable symlink-permission configuration. Do not automatically enable Developer Mode, elevate the agent, or change machine policy. t004 additionally requires authenticated native Claude Code and Codex plus published bea; those credentials stay outside the repository. Host access clears the first prerequisite so t001–t003 can proceed even if client authentication still needs arranging for t004.

**Deferred dependents:** t002 requires t001; t003 requires t002; t004 requires t003; t005 requires t004; t006 requires t005; t007 requires t005/t006; t008 requires t006/t007. Thus all eight pending tasks are currently blocked directly or transitively. Native installer CI or WSL cannot replace the specified live native-client acceptance. No test or acceptance requirement has been waived.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Rehearse native installation and document PowerShell prerequisites | 45m | — |
| t002 | Make installer link failures actionable and preserve existing state | 60m | w5/m13/t001 |
| t003 | Add the native Windows installer lifecycle CI job | 45m | w5/m13/t002 |
| t004 | Verify discovery and the first query through both native Windows agents | 60m | w5/m13/t003 |
| t005 | Adoption surface | 30m | w5/m13/t004 |
| t006 | Simplify | 30m | w5/m13/t005 |
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

- **Source:** `/pm-brainstorm for w5`, both proposals approved with `$pm for all for w5` on 2026-09-28. Builds on [w5/m3's installed-suite baseline](../../done/m3/README.md), the [installation guide](../../../../skills/docs/installation.md), and [the current installer](../../../../skills/scripts/beancount-skills.py). Platform references: [Codex native Windows](https://learn.chatgpt.com/docs/windows/windows-sandbox), [Claude Code setup](https://code.claude.com/docs/en/setup#set-up-on-windows), and [Python symlink prerequisites](https://docs.python.org/3/library/os.html#os.symlink).
- **Goal linkage:** **A2 — Frictionless onboarding** and **A3 — Community & distribution**. Native Windows users can install the existing customer suite and obtain their first verified ledger answer through documented commands.
- **Expected outcome:** Both native Windows agents discover all eight installed skills and answer the existing synthetic first-query example correctly. Record installation success, time to first query, and manual corrections as rehearsal signals; preserve the installer lifecycle in Windows CI.
- **Why now:** Published CLI installation checks already cover Windows, while the customer-skills installation and first-query guides explicitly leave it uncovered. w5 has capacity and this extends the shipped installer instead of inventing a new distribution system.
- **Adoption surface:** included because the shipped assets are customer- and agent-facing. Preserve equivalent discovery and workflow semantics for Claude Code and Codex and document actual platform limits.

## Boundaries and dependencies

- Implementation belongs in skills/, plus the package-owned .github/workflows/ci-skills.yml job and root discovery pointers as needed. Keep synthetic workspaces and raw logs under skills/tmp/ or the equivalent job-owned temporary directory on Windows.
- Retain one source checkout and directory symlinks; do not add junction/copy fallback modes, a plugin distribution system, new dependencies, or changes to the repository's shared development-skill link.
- Document required symlink capability and verify it on the target host. Do not silently enable Developer Mode, change machine policy, or elevate agent sessions. A host that lacks permission should receive a clear remedy and no false success.
- The approved deliverable is native Windows onboarding through PowerShell. WSL is a distinct environment and cannot substitute for native acceptance. Reuse the existing first-query fixture rather than building a new accounting journey.
- Use run-owned agent skill destinations where possible and preserve unrelated skills and user configuration. Authenticated agent access and a native Windows host are required for the live rehearsal; if unavailable at execution time, record the exact blocker, owner, and unblock condition rather than claiming the CI run proves usability.
- The current Windows gap is documented scope, not an already reproduced native defect. Reproduce installation and failure behavior before choosing the minimal repair. Keep deterministic Windows lifecycle checks independent of paid model calls.
- m12 is independent; m5 and inbox 015 retain their existing external blockers. No hosted accounting deployment, bank connection, ledger export, or duplicate MCP stack is needed.
