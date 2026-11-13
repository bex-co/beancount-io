# Existing-ledger rehearsal

Real-client runs of [Bring an existing Beancount ledger](existing-ledger.md).
Deterministic coverage is separate: `TestExistingLedgerGuide` in
`scripts/skills/test_beancount_skills.py` runs the guide's shell steps on every
change, and `TestBeaRecipes.test_existing_ledger_recipe_describes_the_books_and_changes_none`
runs `beancount-init`'s recipe.

## Claude Code, macOS — 2026-11-13

**Pass.**

- **Client:** Claude Code 2.1.322 on macOS, its default model, non-interactive
  `claude -p`. The client's configured reply language was Chinese, so both
  answers are in Chinese; the figures and commands are the same.
- **bea:** the checkout's CLI at `76c9457aa`, which reports `bea` 0.3.1 but
  carries the unreleased `init --existing`. Published 0.3.1 does not have it,
  so the guide's capability check would send a reader on that release to
  `bea upgrade`.
- **Workspace:** a fresh folder outside the repository (so no repository
  instructions were in scope), `git init`, the guide's sample books copied in,
  checksums recorded outside the folder, and the sixteen customer skills linked
  into the workspace's `.claude/skills` by `scripts/skills/beancount-skills.py install`
  (source `8a645730b`).

**Setup turn.** Prompt: "I already keep my finances in a Beancount ledger in
this folder. Set things up so you can work with it." Allowed tools: `Skill`,
`Read`, `Bash(bea:*)`, `Bash(pwd:*)`, `Bash(ls:*)`, `Bash(git rev-parse:*)`,
`Bash(git status:*)`.

- The transcript shows `Skill beancount-init`, then `pwd && ls -A`, a read of
  `references/bea-cli.md`, `bea init --help`, and
  `bea --json --no-input init --existing .`.
- The reply named the root and its three included files, USD, the eight open
  accounts, and the one attention item (`household.beancount:7`, the plugin
  module in the folder, with the `PYTHONPATH=.` command). It said the folder is
  already a Git repository and that nothing was staged.
- The agent then tried `PYTHONPATH=. bea --file household.beancount --json --no-input check`,
  as the new `AGENTS.md` says. The allowlist above had no rule for it, so it was
  refused, and the agent said so and gave the command to run. The guide's
  non-interactive command for the question turn allows `Bash(PYTHONPATH=. bea:*)`
  for this reason.
- Afterwards only `AGENTS.md` and `CLAUDE.md` were new; every ledger checksum
  matched, and `git status --short` listed untracked files only.

**Question turn.** Prompt: "How much did I spend on groceries in February
2026?" Allowed tools exactly as the guide gives them: `Skill`, `Read`,
`Bash(bea:*)`, `Bash(PYTHONPATH=. bea:*)`.

- The transcript shows `Skill beancount-ask`, then `PYTHONPATH=. bea --file household.beancount --json --no-input query …`
  for the total and the rows.
- The answer was **119.35 USD**, from Green Market 78.25 USD on 2026-02-06 and
  Corner Grocer 41.10 USD on 2026-02-20, with the re-runnable query.
- The ledger checksums matched afterwards.

## Codex — not yet run

Codex CLI 0.163.0 on this macOS host started, but could not refresh its
sign-in: "Your access token could not be refreshed because your refresh token
has expired." The Linux container used for the [2026-11-08 Codex runs](routing-rehearsal.md#linux-codex-execution-restored--2026-11-08)
reuses the same credential. The Codex setup and question turns wait until the
account is signed in again. No ledger file changed in the attempt.

## Not covered

- The guide's Windows PowerShell block has not been run.
- A published `bea` release with `init --existing` does not exist yet.
