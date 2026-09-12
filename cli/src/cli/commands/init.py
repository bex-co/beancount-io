"""Create a small, usable personal ledger without installing another tool.

Starter content, alignment, validation, and atomic creation run in
`bea-engine init`. This module owns prompts, option checks, and next-step UX.
"""

from __future__ import annotations

import datetime
import re
import shlex
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Annotated

import typer

from cli import context, output
from cli.errors import ConflictError, UsageError
from cli.utils import parse_date

# Must match `bea_engine.initiating.ACCOUNTS` — the engine builds the template;
# the frontend only uses this list to validate interactive opening balances.
_ACCOUNTS = (
    "Assets:Checking",
    "Assets:Savings",
    "Assets:Cash",
    "Liabilities:CreditCard",
    "Income:Salary",
    "Income:Interest",
    "Expenses:Groceries",
    "Expenses:Dining",
    "Expenses:Rent",
    "Expenses:Transport",
    "Expenses:Utilities",
    "Expenses:Fees",
    "Expenses:Uncategorized",
    "Equity:OpeningBalances",
)


def _currency(value: str) -> str:
    currency = value.strip().upper()
    if not re.fullmatch(r"[A-Z][A-Z0-9'._-]*[A-Z0-9]", currency):
        raise typer.BadParameter(f"Invalid operating currency: {currency!r}. Use a symbol such as USD or EUR.")
    return currency


def _opening_amount(value: str) -> Decimal:
    try:
        amount = Decimal(value)
    except InvalidOperation as exc:
        raise typer.BadParameter(f"Invalid opening amount: {value!r}. Enter a number such as 1538.25.") from exc
    if not amount.is_finite():
        raise typer.BadParameter("Opening balances must be finite numbers.")
    return amount


def init(
    directory: Annotated[Path, typer.Argument(help="New ledger directory, or a .bean/.beancount file")] = Path("."),
    currency: Annotated[
        str | None, typer.Option("--currency", "-c", help="Operating currency, e.g. USD or EUR")
    ] = None,
    date: Annotated[
        str | None,
        typer.Option("--date", help="Earliest history/opening date YYYY-MM-DD; prompts interactively, otherwise today"),
    ] = None,
    opening_balance: Annotated[
        list[str] | None,
        typer.Option("--opening-balance", help="'ACCOUNT NUMBER' in the operating currency; repeat for each account"),
    ] = None,
) -> None:
    """Create main.bean with common accounts.

    Optional opening balances included. For unattended use:
    bea --no-input init books --currency USD.
    Credit card debt uses a negative opening balance.
    New ledger files are private (0600 on POSIX); chmod explicitly to share.
    """
    from cli.engine import launch

    ctx = context.current()
    if ctx.file is not None:
        if directory != Path("."):
            raise UsageError("Choose either --file or an init directory, not both.")
        file = ctx.file.expanduser().absolute()
    else:
        directory = directory.expanduser().absolute()
        file = directory if directory.suffix in {".bean", ".beancount"} else directory / "main.bean"
    if file.exists() or file.is_symlink():
        raise ConflictError(f"Already exists: {file}. Choose a new path; init never overwrites a ledger.")
    if currency is None:
        if ctx.no_input:
            raise UsageError("Choose an operating currency with --currency USD (or EUR, etc.).")
        currency = typer.prompt("Operating currency", default="USD", value_proc=_currency)
    currency = _currency(currency)
    warnings = []
    if not re.fullmatch(r"[A-Z]{3}", currency):
        warnings.append(
            f"Operating currency {currency!r} is a valid Beancount symbol but is not three uppercase letters. "
            "Check for a typo (for example, USD). Custom and crypto symbols are supported."
        )
    if date is None and not ctx.no_input:
        day = typer.prompt(
            "Earliest date you will record (opening balances must be as of this date)",
            default=datetime.date.today().isoformat(),
            value_proc=parse_date,
        )
    else:
        day = parse_date(date) if date else datetime.date.today()
    balances: dict[str, Decimal] = {}
    for balance in opening_balance or []:
        parts = balance.split()
        if len(parts) != 2 or parts[0] not in _ACCOUNTS or not parts[0].startswith(("Assets:", "Liabilities:")):
            raise UsageError(
                "Opening balance must be 'ACCOUNT NUMBER' for one of the template's asset/liability accounts."
            )
        account, number = parts
        if account in balances:
            raise UsageError(f"Opening balance specified twice for {account}.")
        balances[account] = _opening_amount(number)
    if not ctx.no_input and opening_balance is None:
        balances["Assets:Checking"] = typer.prompt(
            f"Checking opening balance on {day} (negative for an overdraft)", default="0", value_proc=_opening_amount
        )

    argv = ["init", "--file", str(file), "--currency", currency, "--date", day.isoformat()]
    for account, amount in balances.items():
        if amount:
            argv += ["--opening-balance", f"{account} {amount:f}"]
    data = launch.helper_json(argv)
    if warnings:
        data["warnings"] = warnings
    if ctx.json_output:
        output.emit(data, target=output.file_target(file))
    else:
        for warning in warnings:
            output.note(warning)
        accounts = data.get("accounts") or list(_ACCOUNTS)
        output.success(f"Created {file} with {len(accounts)} accounts in {currency}.")
        try:
            shown = f"~/{file.relative_to(Path.home())}"
        except ValueError:
            shown = str(file)
        if file == Path.cwd() / "main.bean":
            next_command = "bea check"
        elif file.name == "main.bean":
            parent = shown.rpartition("/")[0]
            # Keep `~` unquoted so the shell still expands it.
            parent = "~/" + shlex.quote(parent[2:]) if parent.startswith("~/") else shlex.quote(parent)
            next_command = f"cd {parent} && bea check"
        else:
            next_command = f"bea --file {shlex.quote(shown)} check"
        typer.echo(f"Next: {next_command}")
        typer.echo(
            f"Accounts open on {day}. To record earlier history, edit their open dates; "
            "new ledgers can use init --date YYYY-MM-DD."
        )
        typer.echo("Record purchases with bea add transaction, or preview a bank export with bea import.")
