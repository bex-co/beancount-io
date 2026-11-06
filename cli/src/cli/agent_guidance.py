"""The `AGENTS.md` / `CLAUDE.md` pair `bea init --agent-files` writes beside a new ledger (w21/1021).

The text is the template in the `beancount-init` skill
(`skills/beancount-init/references/agents-template.md`); `tests/test_init_agent_files.py`
fails when the two drift. Files are created exclusively, so an existing one is
never overwritten, even by a racing writer.
"""

from __future__ import annotations

from pathlib import Path

AGENTS_TEMPLATE = """\
# Ledger instructions

This folder is a Beancount ledger. The root file is `{root}`; put new
entries where its `include` lines point (today everything is in `{root}`
itself).

- Operating currency: {currency}. Accounts opened: {accounts}.
- Propose every write first and wait for an explicit yes before changing
  files.
- After any change, run `bea --file {root} check` from this folder. The
  root check must pass before anything counts as done.
- Import rules and per-source mappings live in the
  `;; beancount-import config` block at the top of `{root}`, recorded
  there when imports start.
- Ledger workflow skills (init, add, trade, property, import,
  importer-author, reconcile, migrate, ask, close, options, roll-forward,
  accruals, invoices, report-pack, business-metrics):
  https://github.com/bex-co/beancount-io/tree/main/skills
"""

CLAUDE_BRIDGE = "@AGENTS.md\n"


def _create(path: Path, text: str) -> bool:
    """Write `text` to a new file; False when the file already exists."""
    try:
        with path.open("x", encoding="utf-8") as handle:
            handle.write(text)
    except FileExistsError:
        return False
    return True


def write_agent_files(ledger: Path, currency: str, accounts: list[str]) -> dict[str, str]:
    """Create `AGENTS.md` and the one-line `CLAUDE.md` bridge beside `ledger`.

    An existing `AGENTS.md` is left untouched and the bridge is not written
    unasked; an existing `CLAUDE.md` is never replaced. The result maps each
    file to `created` or `kept`.
    """
    folder = ledger.parent
    agents = AGENTS_TEMPLATE.format(root=ledger.name, currency=currency, accounts=", ".join(accounts) or "none")
    if not _create(folder / "AGENTS.md", agents):
        return {"AGENTS.md": "kept", "CLAUDE.md": "skipped"}
    return {"AGENTS.md": "created", "CLAUDE.md": "created" if _create(folder / "CLAUDE.md", CLAUDE_BRIDGE) else "kept"}
