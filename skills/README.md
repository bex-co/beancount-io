# Beancount Skills

Skills for Beancount users working with a ledger through a coding agent. The eight workflows below support Claude Code and Codex; their source files live in [`.claude/skills/`](.claude/skills).

| Skill | Use it to |
| ----- | --------- |
| [beancount-init](.claude/skills/beancount-init/SKILL.md) | Create a ledger repository with Beancount, Fava, and uv. |
| [beancount-import](.claude/skills/beancount-import/SKILL.md) | Import and categorize bank exports with duplicate detection. |
| [beancount-importer-author](.claude/skills/beancount-importer-author/SKILL.md) | Write or repair a reusable, tested bank importer. |
| [beancount-reconcile](.claude/skills/beancount-reconcile/SKILL.md) | Compare an account with a bank or broker statement. |
| [beancount-migrate](.claude/skills/beancount-migrate/SKILL.md) | Migrate transaction history from another finance app. |
| [beancount-ask](.claude/skills/beancount-ask/SKILL.md) | Answer ledger questions with reproducible queries. |
| [beancount-close](.claude/skills/beancount-close/SKILL.md) | Reconcile and close an accounting period. |
| [beancount-options](.claude/skills/beancount-options/SKILL.md) | Record options trades and lifecycle events. |

Keep each skill's directory intact when installing it into your agent's skill directory: its references, scripts, and fixtures belong with `SKILL.md`. Install the full `beancount-*` suite for workflows that compose other skills, such as migration and month-end close.

Repository contributors use a separate set of [development skills](../.agents/CLAUDE.md) in [`.agents/skills/`](../.agents/skills). Development conventions for this customer-facing package live in [CLAUDE.md](CLAUDE.md).
