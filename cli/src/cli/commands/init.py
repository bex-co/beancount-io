"""Create a small, usable personal ledger without installing another tool."""

from __future__ import annotations

import datetime
import os
import re
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


def init(
    directory: Annotated[Path, typer.Argument(help="New ledger directory, or a .bean/.beancount file")] = Path("."),
    currency: Annotated[
        str | None, typer.Option("--currency", "-c", help="Operating currency, e.g. USD or EUR")
    ] = None,
    date: Annotated[str | None, typer.Option("--date", help="Opening date (YYYY-MM-DD); defaults to today")] = None,
    opening_balance: Annotated[
        list[str] | None,
        typer.Option("--opening-balance", help="'ACCOUNT NUMBER' in the operating currency; repeat for each account"),
    ] = None,
) -> None:
    """Create main.bean with common accounts and optional opening balances.

    For unattended use: bea --no-input init books --currency USD.
    Credit card debt uses a negative opening balance.
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
        currency = typer.prompt("Operating currency", default="USD")
    currency = currency.strip().upper()
    if not re.fullmatch(r"[A-Z][A-Z0-9'._-]*[A-Z0-9]", currency):
        raise UsageError(f"Invalid operating currency: {currency!r}.")
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
        try:
            amount = Decimal(number)
        except InvalidOperation as exc:
            raise UsageError(f"Invalid opening amount: {number!r}.") from exc
        if not amount.is_finite():
            raise UsageError("Opening balances must be finite numbers.")
        balances[account] = amount
    if not ctx.no_input and opening_balance is None:
        amount_text = typer.prompt("Checking opening balance (negative for an overdraft)", default="0")
        try:
            amount = Decimal(amount_text)
        except InvalidOperation as exc:
            raise UsageError(f"Invalid opening amount: {amount_text!r}.") from exc
        if not amount.is_finite():
            raise UsageError("Opening balances must be finite numbers.")
        balances["Assets:Checking"] = amount

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
    with ledger_write.candidate_file(file, content) as candidate:
        ledger_write.validate_candidate(candidate, file)
        try:
            # Atomic creation without replacing a file another process created.
            os.link(candidate, file)
        except FileExistsError as exc:
            raise ConflictError(f"Already exists: {file}; nothing was overwritten.") from exc
    data = {"created": str(file), "currency": currency, "date": day, "accounts": list(_ACCOUNTS)}
    if ctx.json_output:
        output.emit(data, target=output.file_target(file))
    else:
        output.success(f"Created {file} with {len(_ACCOUNTS)} accounts in {currency}.")
        typer.echo(f"Next: bea --file '{file}' check")
        typer.echo("Record purchases with bea add transaction, or preview a bank export with bea import.")
