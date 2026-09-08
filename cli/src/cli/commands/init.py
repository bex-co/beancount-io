"""Create a small, usable personal ledger without installing another tool."""

from __future__ import annotations

import datetime
import os
import re
import shlex
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Annotated

import typer

from cli import context, ledger_write, output
from cli.errors import ConflictError, UsageError
from cli.utils import parse_date

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
    """Create main.bean with common accounts and optional opening balances.

    For unattended use: bea --no-input init books --currency USD.
    Credit card debt uses a negative opening balance.
    New ledger files are private (0600 on POSIX); chmod explicitly to share.
    """
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

    content = f'option "title" "Personal ledger"\noption "operating_currency" "{currency}"\n\n'
    content += "; Add more accounts with bea add open. Amounts on credit accounts are negative.\n"
    content += "".join(f"{day} open {account} {currency}\n" for account in _ACCOUNTS)
    nonzero = {account: amount for account, amount in balances.items() if amount}
    if nonzero:
        content += f'\n{day} * "Opening balances"\n'
        content += "".join(f"  {account}  {amount} {currency}\n" for account, amount in nonzero.items())
        content += f"  Equity:OpeningBalances  {-sum(nonzero.values())} {currency}\n"
    else:
        content += (
            "\n; Record opening balances with a transaction against Equity:OpeningBalances.\n"
            f'; {day} * "Opening balance"\n'
            f";   Assets:Checking          1000.00 {currency}\n"
            f";   Equity:OpeningBalances  -1000.00 {currency}\n"
        )
    file.parent.mkdir(parents=True, exist_ok=True)
    from beancount.scripts.format import align_beancount

    content = align_beancount(content)  # type: ignore[no-untyped-call]
    with ledger_write.candidate_file(file, content) as candidate:
        ledger_write.validate_candidate(candidate, file)
        try:
            # Atomic creation without replacing a file another process created.
            os.link(candidate, file)
        except FileExistsError as exc:
            raise ConflictError(f"Already exists: {file}; nothing was overwritten.") from exc
    data = {"created": str(file), "currency": currency, "date": day, "accounts": list(_ACCOUNTS)}
    if warnings:
        data["warnings"] = warnings
    if ctx.json_output:
        output.emit(data, target=output.file_target(file))
    else:
        for warning in warnings:
            output.note(warning)
        output.success(f"Created {file} with {len(_ACCOUNTS)} accounts in {currency}.")
        relative = Path(os.path.relpath(file, Path.cwd()))
        if relative == Path("main.bean"):
            next_command = "bea check"
        elif file.name == "main.bean":
            next_command = f"cd {shlex.quote(str(relative.parent))} && bea check"
        else:
            next_command = f"bea --file {shlex.quote(str(relative))} check"
        typer.echo(f"Next: {next_command}")
        typer.echo(
            f"Accounts open on {day}. To record earlier history, edit their open dates; "
            "new ledgers can use init --date YYYY-MM-DD."
        )
        typer.echo("Record purchases with bea add transaction, or preview a bank export with bea import.")
