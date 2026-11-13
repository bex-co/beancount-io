# Ledger instructions template

After the new ledger validates, `beancount-init` writes a short `AGENTS.md`
into the ledger folder (plus a one-line `CLAUDE.md` importing it), so the next
agent that opens the folder — in any client, with or without this suite
installed — finds the root file, the conventions, and the check rule without
rediscovering them.

Write both files only for a ledger this skill just created. If `AGENTS.md`
already exists, never overwrite it: leave it untouched and offer the
`CLAUDE.md` bridge below when `CLAUDE.md` is missing. If `CLAUDE.md` exists,
never overwrite it either. (This suite's own repository forbids `CLAUDE.md`;
that rule governs the repository, not customer ledgers, where the one-line
import is how Claude Code picks `AGENTS.md` up.)

`bea init --agent-files` writes the same two files from the same text
(`cli/src/cli/agent_guidance.py`; a test fails if they drift), with the same
no-overwrite rule. Use it when `bea` created the ledger; otherwise write the
files from this template.

For a ledger this skill did not create, `bea init --existing ROOT` writes the
pair from the [existing-ledger text](#existing-ledger-agentsmd) below, filled in
from the ledger itself, with the same no-overwrite rule. Never write that text
by hand: its facts come from loading the ledger.

Substitute into the template:

- `{{CURRENCY}}` — the operating currency from Step 1.
- `{{ACCOUNTS}}` — the account names opened in `main.bean`, comma-separated,
  read back from the file just written.

## `AGENTS.md`

```markdown
# Ledger instructions

This folder is a Beancount ledger. The root file is `main.bean`; put new
entries where its `include` lines point (today everything is in `main.bean`
itself).

- Operating currency: {{CURRENCY}}. Accounts opened: {{ACCOUNTS}}.
- Propose every write first and wait for an explicit yes before changing
  files.
- After any change, run `bea --file main.bean check` from this folder. The
  root check must pass before anything counts as done.
- Import rules and per-source mappings live in the
  `;; beancount-import config` block at the top of `main.bean`, recorded
  there when imports start.
- Ledger workflow skills (init, add, trade, property, import,
  importer-author, reconcile, migrate, ask, close, options, roll-forward,
  accruals, invoices, report-pack, business-metrics):
  https://github.com/bex-co/beancount-io/tree/main/skills
```

## `CLAUDE.md`

One line, written only when `CLAUDE.md` does not already exist:

```markdown
@AGENTS.md
```

## Existing-ledger `AGENTS.md`

What `bea init --existing` writes. Each `{{…}}` is read from the loaded
ledger: `{{FILES}}` lists the included files, `{{DESTINATION}}` says new
entries go into the root unless a write names an included file with `--into`,
`{{PLUGINS}}` notes a plugin module kept in the folder, `{{CHECK}}` gains
`PYTHONPATH=.` when one is, and `{{BASELINE}}` states whether the check passed
when the file was written.

```markdown
# Ledger instructions

This folder holds an existing Beancount ledger. The root file is
`{{ROOT}}`{{FILES}}. {{DESTINATION}}

- Operating currency: {{CURRENCIES}}. Open accounts: {{ACCOUNTS}}.
- Plugins: {{PLUGINS}}.
- Propose every write first and wait for an explicit yes before changing
  files.
- After any change, run `{{CHECK}}` from this folder. {{BASELINE}}
- Import rules and per-source mappings live in the
  `;; beancount-import config` block at the top of `{{ROOT}}`, recorded
  there when imports start.
- Ledger workflow skills (init, add, trade, property, import,
  importer-author, reconcile, migrate, ask, close, options, roll-forward,
  accruals, invoices, report-pack, business-metrics):
  https://github.com/bex-co/beancount-io/tree/main/skills
```
