# Beancount Skills

Skills for Beancount users working with a ledger through a coding agent. The eight workflows below support Claude Code and Codex; their source files live in [`.claude/skills/`](.claude/skills).

Install **`bea`** once ([Homebrew](https://github.com/bex-co/homebrew-tap) or `uv tool install beancount-io`). Skills use that single install for check, query, report, import, and writes — they do not ask you to `pip install beancount`. Optional Beangulp/Beanprice features: `bea engine enable beangulp|beanprice`. Fava's browser UI is optional and separate from `bea` ledger operations.

| Skill | Use it to |
| ----- | --------- |
| [beancount-init](.claude/skills/beancount-init/SKILL.md) | Create a ledger with `bea init` (optional Fava browser setup). |
| [beancount-import](.claude/skills/beancount-import/SKILL.md) | Import and categorize bank exports with duplicate detection. |
| [beancount-importer-author](.claude/skills/beancount-importer-author/SKILL.md) | Write or repair a reusable, tested bank importer. |
| [beancount-reconcile](.claude/skills/beancount-reconcile/SKILL.md) | Compare an account with a bank or broker statement. |
| [beancount-migrate](.claude/skills/beancount-migrate/SKILL.md) | Migrate transaction history from another finance app. |
| [beancount-ask](.claude/skills/beancount-ask/SKILL.md) | Answer ledger questions with reproducible queries. |
| [beancount-close](.claude/skills/beancount-close/SKILL.md) | Reconcile and close an accounting period. |
| [beancount-options](.claude/skills/beancount-options/SKILL.md) | Record options trades and lifecycle events. |

## Install

Install the whole suite, not individual skills: migration and month-end close depend on sibling workflows, and each skill's `references/` and fixtures belong with its `SKILL.md`. One Git checkout serves Claude Code (`~/.claude/skills`) and Codex (`~/.agents/skills`):

```sh
SKILLS_SRC="${XDG_DATA_HOME:-$HOME/.local/share}/beancount-io"
git clone --depth 1 --filter=blob:none --sparse https://github.com/bex-co/beancount-io.git "$SKILLS_SRC"
git -C "$SKILLS_SRC" sparse-checkout set skills
python3 "$SKILLS_SRC/skills/scripts/beancount-skills.py" install ~/.claude/skills ~/.agents/skills
```

- [Installation guide](docs/installation.md): workspace-only installs, discovery checks, `verify`, updates, local edits and name conflicts, and removal.
- [First query](docs/first-query.md): ask a synthetic ledger a question through `beancount-ask` and check the known answer. No account needed.

Repository contributors use a separate set of [development skills](../.agents/CLAUDE.md) in [`.agents/skills/`](../.agents/skills). Development conventions for this customer-facing package live in [CLAUDE.md](CLAUDE.md).
