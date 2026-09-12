"""Create a starter personal ledger — the accounting side of `bea init`.

The frontend owns prompts and next-step messaging; this module builds the
template, aligns it, validates it, and creates the file atomically.
"""

from __future__ import annotations

import datetime
import os
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

from bea_engine.ledger import write as ledger_write
from bea_engine.protocol import ConflictError, UsageError

ACCOUNTS = (
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
    # `bea import` books every uncategorized row here, so a fresh ledger can
    # take an export without a second `bea add open` first.
    "Expenses:Uncategorized",
    "Equity:OpeningBalances",
)


def answer(
    file: Path,
    *,
    currency: str,
    date: str,
    opening_balances: list[str] | None = None,
) -> dict[str, Any]:
    """Write a new starter ledger at `file` and answer what was created.

    `opening_balances` are `'ACCOUNT NUMBER'` strings for template asset or
    liability accounts. The file must not already exist; creation is atomic
    (`os.link` of a validated candidate) so a race never overwrites.
    """
    file = file.expanduser()
    if not file.is_absolute():
        file = file.resolve()
    if file.exists() or file.is_symlink():
        raise ConflictError(f"Already exists: {file}. Choose a new path; init never overwrites a ledger.")

    currency = currency.strip().upper()
    try:
        day = datetime.date.fromisoformat(date)
    except ValueError as exc:
        raise UsageError(f"--date must be a date in YYYY-MM-DD form, not {date!r}.") from exc

    balances: dict[str, Decimal] = {}
    for balance in opening_balances or []:
        parts = balance.split()
        if len(parts) != 2 or parts[0] not in ACCOUNTS or not parts[0].startswith(("Assets:", "Liabilities:")):
            raise UsageError(
                "Opening balance must be 'ACCOUNT NUMBER' for one of the template's asset/liability accounts."
            )
        account, number = parts
        if account in balances:
            raise UsageError(f"Opening balance specified twice for {account}.")
        try:
            amount = Decimal(number)
        except InvalidOperation as exc:
            raise UsageError(f"Invalid opening amount: {number!r}. Enter a number such as 1538.25.") from exc
        if not amount.is_finite():
            raise UsageError("Opening balances must be finite numbers.")
        balances[account] = amount

    content = f'option "title" "Personal ledger"\noption "operating_currency" "{currency}"\n\n'
    content += "; Add more accounts with bea add open. Amounts on credit accounts are negative.\n"
    content += "; bea import books rows it cannot categorize to Expenses:Uncategorized with flag '!'.\n"
    content += "".join(f"{day} open {account} {currency}\n" for account in ACCOUNTS)
    nonzero = {account: amount for account, amount in balances.items() if amount}
    if nonzero:
        content += f'\n{day} * "Opening balances"\n'
        # Fixed-point text: str(Decimal) turns a one-satoshi balance into
        # `1E-8`, which Beancount cannot parse as an amount.
        content += "".join(f"  {account}  {amount:f} {currency}\n" for account, amount in nonzero.items())
        content += f"  Equity:OpeningBalances  {-sum(nonzero.values()):f} {currency}\n"
    else:
        content += (
            "\n; Record opening balances with a transaction against Equity:OpeningBalances.\n"
            f'; {day} * "Opening balance"\n'
            f";   Assets:Checking          1000.00 {currency}\n"
            f";   Equity:OpeningBalances  -1000.00 {currency}\n"
        )

    from beancount.scripts.format import align_beancount

    content = align_beancount(content)  # type: ignore[no-untyped-call]
    file.parent.mkdir(parents=True, exist_ok=True)
    with ledger_write.candidate_file(file, content) as candidate:
        ledger_write.validate_candidate(candidate, file)
        try:
            # Atomic creation without replacing a file another process created.
            os.link(candidate, file)
        except FileExistsError as exc:
            raise ConflictError(f"Already exists: {file}; nothing was overwritten.") from exc

    return {
        "created": str(file),
        "currency": currency,
        "date": day.isoformat(),
        "accounts": list(ACCOUNTS),
    }
