# w1 · m42 — Bring an existing Beancount ledger to `bea` and a coding agent

**Worker:** worker1 **Goal:** someone who already keeps a Beancount ledger, with their own root file name, `include` tree and plugins, installs `bea`, runs one documented command, and has a coding agent answer a question about that ledger in minutes, without a single ledger file changing. **Status:** in progress (t001–t005, t007 done; t006 blocked on Codex sign-in)

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Write the existing-ledger contract — **DONE** | 30m | — |
| t002 | `bea` writes agent files for a ledger it did not create — **DONE** | 75m | t001 |
| t003 | Report what in an existing ledger needs attention before an agent uses it — **DONE** | 60m | t001 |
| t004 | `beancount-init` adopts an existing ledger without changing it — **DONE** | 60m | t002, t003 |
| t005 | Existing-ledger guide with an executable recipe, linked from every entry point — **DONE** | 60m | t002, t004 |
| t006 | Rehearse the guide on Claude Code and Codex from a fresh install — **BLOCKED** (Codex sign-in; Claude Code passed) | 45m | t005 |
| t007 | Adoption surface — **DONE** | 30m | t005 |
| t008 | Simplify | 15m | t007 |
| t009 | Test coverage | 45m | t007, t008 |
| t010 | Closeout | 15m | t006, t009 |

Re-sequenced 2026-11-13: Adoption surface (t007) now follows t005, and Closeout (t010) waits on t006. Adoption surface, Simplify and Test coverage do not need the Codex run, so only closing the milestone waits on it, as w1/m41 did with its production check.

## Blocked

- **t006 (2026-11-13)** — the Codex half of the rehearsal. Claude Code passed and is recorded in `docs/skills/existing-ledger-rehearsal.md`. Codex CLI 0.163.0 cannot refresh its expired sign-in on this host, and the Linux container route reuses that credential. **Unblock:** the user signs Codex in again (`codex login`); the worker then runs the guide's setup and question turns with Codex and records them. **Who can clear it:** the user.

## Definition of done

On a synthetic ledger whose root is not `main.bean`, which `include`s other files and loads a plugin module kept beside it:

- The command t001 names writes an `AGENTS.md` that states that ledger's real root, its `include` layout and where new entries go, its operating currency, and its open accounts, plus the one-line `@AGENTS.md` `CLAUDE.md`. An existing `AGENTS.md` or `CLAUDE.md` is kept byte for byte, and the JSON result says `created`, `kept` or `skipped` for each.
- Every ledger file's checksum is unchanged after the command, after the compatibility report, and after `beancount-init`'s existing-ledger branch.
- A plugin that cannot be imported is reported with its `file:line` and a one-line next step. Nothing is installed to make it load.
- `bea doctor guidance` on a ledger with no `AGENTS.md` names the new command instead of a skill that refuses existing ledgers.
- In `scripts/skills/routing.json`, "I already keep my books in Beancount, set my agent up for it" routes to `beancount-init` on both clients, and near-misses route to `beancount-migrate` (another tool's export) and `beancount-ask` (a question only).
- `docs/skills/existing-ledger.md` exists. Its `<!-- recipe -->` blocks run in `test_beancount_skills.py`, and the root `README.md`, `cli/README.md` and `docs/skills/installation.md` link to it.
- A Claude Code and a Codex run of the guide are recorded with client versions and dates.

## Source + Goal linkage

- **Source:** `/pm-brainstorm for w1`, 2026-11-13, item 1; routed by the user via `/pmx` the same day. Evidence from `main`:
  - Every entry point starts from an empty or bundled ledger: the root `README.md` quickstart and `cli/README.md` start with `bea init`, and `docs/skills/first-query.md` copies a bundled fixture.
  - `skills/beancount-init/SKILL.md` Step 1 hard-refuses when `main.bean` exists.
  - `bea init --agent-files` is the only writer of agent files (`cli/docs/USAGE.md`, "init --agent-files"), and its template (`cli/src/cli/agent_guidance.py`) says "today everything is in `{root}` itself", which is false for a multi-file ledger.
  - `bea doctor guidance` (`cli/src/cli/commands/doctor.py`) warns that `AGENTS.md` is missing and says "the beancount-init skill writes it", which is exactly the skill that refuses an existing ledger.
- **Goal linkage:** **A2 — Frictionless onboarding**, for the largest group likely to adopt the project: people who already keep Beancount books. **A1** too, since the agent reads the ledger's real conventions instead of guessing.
- **Expected outcome:** an existing Beancount user goes from `brew install bex-co/tap/bea` to an agent answering a question about their own ledger in a few minutes, and can confirm by checksum that nothing was rewritten. Signals: `bea` installs, `beancount-ask` invocations, time to first answer on a user's own ledger.
- **Why now:** sixteen customer skills and `bea mcp` have shipped, but every path into them assumes a new ledger. Nothing here waits on a deploy or on blocked work. The third-party plugin dependency question stays with [w5/015](../../w5/blocked/015.md); this milestone only cites its current answer. Adoption surface is included because this adds a user-facing command, a skill branch and a guide.

## Out of scope

- Upgrading a Beancount v2 ledger, its plugins or importers to v3. The report names what fails; rewriting it is separate work.
- Deciding how a third-party package gets into the managed engine (w5/015).
- Editing any ledger file, including adding an `include` or an import-config block.
