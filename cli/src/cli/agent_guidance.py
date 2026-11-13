"""The `AGENTS.md` / `CLAUDE.md` pair `bea init` writes beside a ledger.

`bea init --agent-files` writes `AGENTS_TEMPLATE` beside a new ledger
(w21/1021); `bea init --existing` writes `EXISTING_TEMPLATE` beside a ledger
bea did not create, from what `bea-engine describe` read out of it (w1/m42).
Both texts are the templates in the `beancount-init` skill
(`skills/beancount-init/references/agents-template.md`); `tests/test_init_agent_files.py`
and `tests/test_init_existing.py` fail when they drift. Files are created
exclusively, so an existing one is never overwritten, even by a racing writer.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from cli.utils import shell_path

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

EXISTING_TEMPLATE = """\
# Ledger instructions

This folder holds an existing Beancount ledger. The root file is
`{root}`{files}. {destination}

- Operating currency: {currencies}. Open accounts: {accounts}.
- Plugins: {plugins}.
- Propose every write first and wait for an explicit yes before changing
  files.
- After any change, run `{check}` from this folder. {baseline}
- Import rules and per-source mappings live in the
  `;; beancount-import config` block at the top of `{root}`, recorded
  there when imports start.
- Ledger workflow skills (init, add, trade, property, import,
  importer-author, reconcile, migrate, ask, close, options, roll-forward,
  accruals, invoices, report-pack, business-metrics):
  https://github.com/bex-co/beancount-io/tree/main/skills
"""

CLAUDE_BRIDGE = "@AGENTS.md\n"

#: How many included files and open accounts `AGENTS.md` names before it
#: counts the rest and says how to list them.
LISTED_FILES = 10
LISTED_ACCOUNTS = 30


def _create(path: Path, text: str) -> bool:
    """Write `text` to a new file; False when the file already exists."""
    try:
        with path.open("x", encoding="utf-8") as handle:
            handle.write(text)
    except FileExistsError:
        return False
    return True


def write_agent_files(ledger: Path, currency: str, accounts: list[str]) -> dict[str, str]:
    """Create `AGENTS.md` and the one-line `CLAUDE.md` bridge beside a new `ledger`."""
    agents = AGENTS_TEMPLATE.format(root=ledger.name, currency=currency, accounts=", ".join(accounts) or "none")
    return _write_pair(ledger.parent, agents)


def _write_pair(folder: Path, agents: str) -> dict[str, str]:
    """Create `AGENTS.md`, then the bridge; never replace either.

    An existing `AGENTS.md` is left untouched and the bridge is not written
    unasked; an existing `CLAUDE.md` is never replaced. The result maps each
    file to `created`, `kept` or `skipped`.
    """
    if not _create(folder / "AGENTS.md", agents):
        return {"AGENTS.md": "kept", "CLAUDE.md": "skipped"}
    return {"AGENTS.md": "created", "CLAUDE.md": "created" if _create(folder / "CLAUDE.md", CLAUDE_BRIDGE) else "kept"}


def beside_ledger_plugins(description: dict[str, Any]) -> list[str]:
    """Plugins whose module is in the ledger's folder, so a check needs `PYTHONPATH=.` there."""
    return [plugin["name"] for plugin in description["plugins"] if plugin["source"] == "beside-ledger"]


def check_command(root: str, *, pythonpath: bool) -> str:
    """The command `AGENTS.md` gives for checking this ledger from its folder."""
    return f"{_bea(root, pythonpath=pythonpath)} check"


def _bea(root: str, *, pythonpath: bool) -> str:
    """`bea --file ROOT`, run from the ledger's folder, with `PYTHONPATH=.` when a plugin lives there."""
    command = f"bea --file {shell_path(root)}"
    return f"PYTHONPATH=. {command}" if pythonpath else command


def error_count(description: dict[str, Any]) -> int:
    """The described load's errors, each plugin that did not load included: what `bea check` counts."""
    return len(description["errors"]) + sum(1 for plugin in description["plugins"] if not plugin["loaded"])


def baseline_errors(description: dict[str, Any]) -> int | None:
    """The error count `AGENTS.md` and `bea init --existing` may state, or None when it was not measured.

    A plugin kept beside the ledger that failed to import loads only under the
    `PYTHONPATH=.` the check command sets, so whatever it reports there was
    never counted here. One that imported and then raised was measured.
    """
    unmeasured = any(
        plugin["source"] == "beside-ledger" and not plugin["loaded"] and not plugin["failed_while_running"]
        for plugin in description["plugins"]
    )
    return None if unmeasured else error_count(description)


def existing_agents_text(description: dict[str, Any], *, today: str) -> str:
    """`EXISTING_TEMPLATE` filled in from `bea-engine describe`'s answer."""
    root = Path(description["root"]).name
    files = description["files"]
    if not files:
        listed = ", which includes no other files"
        destination = f"Put new entries in `{root}`."
    else:
        names = ", ".join(f"`{name}`" for name in files[:LISTED_FILES])
        more = f", and {len(files) - LISTED_FILES} more" if len(files) > LISTED_FILES else ""
        listed = f"; it includes {len(files)} other file{'s' if len(files) != 1 else ''}: {names}{more}"
        destination = (
            f"New entries go into `{root}` unless a write names an included file with `--into` "
            f"(for example `--into {shell_path(files[0])}`)."
        )
    currencies = ", ".join(description["operating_currencies"]) or 'none set (no `option "operating_currency"` line)'
    beside = beside_ledger_plugins(description)
    accounts = description["open_accounts"]
    if len(accounts) > LISTED_ACCOUNTS:
        shown = ", ".join(accounts[:LISTED_ACCOUNTS])
        # Not `list open`: it also lists the opens of accounts closed since.
        every = f'{_bea(root, pythonpath=bool(beside))} query "SELECT account FROM #accounts WHERE close IS NULL"'
        account_text = f"{len(accounts)}, including {shown} (run `{every}` for all)"
    else:
        account_text = ", ".join(accounts) or "none"
    plugins = ", ".join(f"`{plugin['name']}`" for plugin in description["plugins"]) or "none"
    if beside:
        tops = list(dict.fromkeys(name.split(".", 1)[0] for name in beside))
        modules = ", ".join(f"`{top}`" for top in tops)
        kind = "is a module" if len(tops) == 1 else "are modules"
        plugins += f" ({modules} {kind} in this folder, loaded through `PYTHONPATH=.`)"
    count = baseline_errors(description)
    if count is None:
        baseline = "Run it before the first change; afterwards it must report no error it did not report then."
    elif count:
        baseline = f"On {today} it reported {count} error{'s' if count != 1 else ''}; a change must not add any."
    else:
        baseline = "The root check must pass before anything counts as done."
    return EXISTING_TEMPLATE.format(
        root=root,
        files=listed,
        destination=destination,
        currencies=currencies,
        accounts=account_text,
        plugins=plugins,
        check=check_command(root, pythonpath=bool(beside)),
        baseline=baseline,
    )


def write_existing_agent_files(description: dict[str, Any], *, today: str) -> dict[str, str]:
    """Create the pair beside an existing ledger's root, describing that ledger."""
    return _write_pair(Path(description["root"]).parent, existing_agents_text(description, today=today))
