# Beancount Skills

Skills for Beancount users working with a ledger through a coding agent. The ten workflows below support Claude Code and Codex; their source files live in [`skills/`](.).

The skills work on ledger files on your machine. For a ledger hosted on Beancount.io, connect the Beancount.io MCP server instead; the skills hand hosted requests to its tools and prompts.

Install **`bea`** 0.3.1 or later once ([Homebrew](https://github.com/bex-co/homebrew-tap) or `uv tool install beancount-io`). Skills use that single install for check, query, report, import, and writes — they do not ask you to `pip install beancount`. Optional Beangulp/Beanprice features: `bea engine enable beangulp|beanprice`. Fava's browser UI is optional and separate from `bea` ledger operations.

The suite shares [command recipes](beancount-init/references/bea-cli.md) that select the root ledger and approved write destination explicitly. CSV imports preserve confirmed signs and durable categorization rules on every run, and add a three-day duplicate review for manual entries. [Compatibility paths](beancount-init/references/compatibility.md) cover existing developer tools and the separate Fava/Beangulp authoring runtimes.

| Skill | Use it to |
| ----- | --------- |
| [beancount-init](beancount-init/SKILL.md) | Create a ledger with `bea init` (optional Fava browser setup). |
| [beancount-add](beancount-add/SKILL.md) | Record a purchase, transfer, new or closed account, price, or note you describe. |
| [beancount-trade](beancount-trade/SKILL.md) | Record stock, fund, and crypto trades with correct lots, and report realized gains. |
| [beancount-import](beancount-import/SKILL.md) | Import and categorize bank exports with duplicate detection. |
| [beancount-importer-author](beancount-importer-author/SKILL.md) | Write or repair a reusable, tested bank importer. |
| [beancount-reconcile](beancount-reconcile/SKILL.md) | Compare an account with a bank or broker statement. |
| [beancount-migrate](beancount-migrate/SKILL.md) | Migrate transaction history from another finance app. |
| [beancount-ask](beancount-ask/SKILL.md) | Answer ledger questions with reproducible queries. |
| [beancount-close](beancount-close/SKILL.md) | Reconcile and close an accounting period. |
| [beancount-options](beancount-options/SKILL.md) | Record options trades and lifecycle events. |

## Install

Install the whole suite, not individual skills: migration and month-end close depend on sibling workflows, and each skill's `references/` and fixtures belong with its `SKILL.md`. One Git checkout serves Claude Code (`~/.claude/skills`) and Codex (`~/.agents/skills`):

```sh
SKILLS_SRC="${XDG_DATA_HOME:-$HOME/.local/share}/beancount-io"
git clone --depth 1 --filter=blob:none --sparse https://github.com/bex-co/beancount-io.git "$SKILLS_SRC"
git -C "$SKILLS_SRC" sparse-checkout set skills scripts/skills docs/skills
python3 "$SKILLS_SRC/scripts/skills/beancount-skills.py" install ~/.claude/skills ~/.agents/skills
```

- [Installation guide](../docs/skills/installation.md): workspace-only installs, discovery checks, `verify`, updates, local edits and name conflicts, and removal. Installed before 2026-10-19? Follow its [one-time upgrade](../docs/skills/installation.md#upgrading-from-the-old-layout). Prefer a standard channel? The guide also covers [`npx skills`, `gh skill`, and the `beancount-io` plugin for both clients](../docs/skills/installation.md#install-from-a-standard-channel-instead) (Hermes cannot install the whole suite yet — the guide says why), with choosing and switching between methods.
- [First query](../docs/skills/first-query.md): ask a synthetic ledger a question through `beancount-ask` and check the known answer. No account needed.
- [First month](../docs/skills/first-month.md): initialize, import, reconcile, ask, and close one synthetic month with explicit approvals and independent ledger/Git checkpoints. See the [real-client rehearsal results](../docs/skills/first-month-rehearsal.md).
- [Migrate, then keep importing](../docs/skills/migration.md): convert a synthetic Monarch export with approved mappings and balance anchors, then import overlapping bank exports without double-booking either side of a transfer. See the [real-client rehearsal results](../docs/skills/migration-rehearsal.md).
- [Graduate a CSV workflow into an importer](../docs/skills/importer-graduation.md): reuse confirmed settings and source IDs, review golden files, wire a tested importer, and repair changed bank headers without duplicating history. See the [Claude Code and Codex rehearsal results](../docs/skills/importer-graduation-rehearsal.md), tested on macOS with published `bea` 0.3.1 and Beangulp 0.2.0.

Repository contributors use a separate set of [development skills](../.agents/AGENTS.md) in [`.agents/skills/`](../.agents/skills). Development conventions for this customer-facing package live in [AGENTS.md](AGENTS.md).

## License

The contents of `skills/`, including each customer skill's instructions, references, and fixtures, are licensed under [MIT No Attribution (MIT-0)](LICENSE). The bundle command includes this shared license in every standalone skill package. Package tooling in `scripts/skills/` and guides in `docs/skills/` follow the repository's [MIT license](../LICENSE).
