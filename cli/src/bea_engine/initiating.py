"""Create a starter personal ledger — the accounting side of `bea init`.

The frontend owns prompts and next-step messaging; this module builds the
template, aligns it, validates it, and creates the file atomically.
"""

from __future__ import annotations

import datetime
import errno
import json
import os
from decimal import MAX_PREC, Decimal, localcontext
from pathlib import Path
from typing import Any

from bea_engine import stopping
from bea_engine.amounts import parse_decimal_number
from bea_engine.ledger import write as ledger_write
from bea_engine.paths import expand_path
from bea_engine.protocol import AuthError, ConflictError, LedgerError, UsageError

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
    (`claim_new_file` of a validated candidate) so a race never overwrites.
    """
    file = _prepare_new_file(file)

    currency = currency.strip().upper()
    try:
        day = datetime.date.fromisoformat(date)
    except ValueError as exc:
        raise UsageError(f"--date must be a date in YYYY-MM-DD form, not {date!r}.") from exc

    balances = _parse_opening_balances(opening_balances, list(ACCOUNTS), "template's")

    content = f'option "title" "Personal ledger"\noption "operating_currency" "{currency}"\n\n'
    content += "; Add more accounts with bea add open. Amounts on credit accounts are negative.\n"
    content += "; bea import books rows it cannot categorize to Expenses:Uncategorized with flag '!'.\n"
    # Only the accounts that hold money are limited to the operating currency.
    # A category records what was spent, and on a restricted one an ordinary
    # foreign charge (`45 EUR @ 1.10 USD`) was refused (w5/363).
    content += "".join(
        f"{day} open {account} {currency}\n"
        if account.startswith(("Assets:", "Liabilities:"))
        else f"{day} open {account}\n"
        for account in ACCOUNTS
    )
    nonzero = {account: amount for account, amount in balances.items() if amount}
    if nonzero:
        content += f'\n{day} * "Opening balances"\n'
        # Fixed-point text: str(Decimal) turns a one-satoshi balance into
        # `1E-8`, which Beancount cannot parse as an amount.
        content += "".join(f"  {account}  {amount:f} {currency}\n" for account, amount in nonzero.items())
        # Exact, like the typed legs: the default 28-digit context rounded a
        # wider balance's negation, so the equity leg did not cancel it (w5/310).
        with localcontext() as exact:
            exact.prec = MAX_PREC
            total = sum(nonzero.values(), Decimal(0))
        # copy_negate also changes zero's sign; a cancelling opening needs
        # ordinary zero without sacrificing the exact nonzero negation.
        equity = total.copy_negate() if total else Decimal(0)
        content += f"  Equity:OpeningBalances  {equity:f} {currency}\n"
    else:
        content += (
            "\n; Record opening balances with a transaction against Equity:OpeningBalances.\n"
            f'; {day} * "Opening balance"\n'
            f";   Assets:Checking          1000.00 {currency}\n"
            f";   Equity:OpeningBalances  -1000.00 {currency}\n"
        )

    _write_new_ledger(file, content)

    return {
        "created": str(file),
        "currency": currency,
        "date": day.isoformat(),
        "accounts": list(ACCOUNTS),
    }


def _write_new_ledger(file: Path, content: str) -> None:
    """Align, validate, and atomically create `file` with `content`."""
    from beancount.scripts.format import align_beancount

    content = align_beancount(content)  # type: ignore[no-untyped-call]
    created = _make_parent(file)
    try:
        with ledger_write.candidate_file(file, content) as candidate:
            ledger_write.validate_candidate(candidate, file)
            stopping.check()
            try:
                # Atomic creation without replacing a file another process created.
                ledger_write.claim_new_file(candidate, file)
            except FileExistsError as exc:
                raise ConflictError(f"Already exists: {file}; nothing was overwritten.") from exc
            except PermissionError as exc:
                raise AuthError(f"The filesystem refused to create {file}; nothing was written.") from exc
    except PermissionError as exc:
        # The candidate itself could not be created, under an unsearchable
        # or unwritable directory (w5/793).
        _remove_created(created)
        raise AuthError(f"The filesystem refused to create {file}; nothing was written.") from exc
    except OSError as exc:
        _remove_created(created)
        if exc.errno in _USAGE_ERRNOS:
            blocker = _blocking_component(file, exc.errno)
            raise UsageError(
                f"Cannot create {file}: {_uncreatable_reason(blocker, exc.errno)} Nothing was written."
            ) from exc
        raise
    except BaseException:
        # "Nothing was written" left the directories it had made (w5/610).
        _remove_created(created)
        raise


_CATALOG_PATH = Path(__file__).with_name("setup_catalog.json")
_CURRENCIES_PATH = Path(__file__).with_name("setup_currencies.json")


def _load_catalog() -> dict[str, Any]:
    return json.loads(_CATALOG_PATH.read_text(encoding="utf-8"))  # type: ignore[no-any-return]


def _load_currencies() -> dict[str, Any]:
    return json.loads(_CURRENCIES_PATH.read_text(encoding="utf-8"))  # type: ignore[no-any-return]


def _parse_opening_balances(
    opening_balances: list[str] | None, allowed: list[str] | tuple[str, ...], noun: str
) -> dict[str, Decimal]:
    balances: dict[str, Decimal] = {}
    for balance in opening_balances or []:
        parts = balance.split()
        if len(parts) != 2 or parts[0] not in allowed or not parts[0].startswith(("Assets:", "Liabilities:")):
            raise UsageError(
                f"Opening balance must be 'ACCOUNT NUMBER' for one of the {noun} asset/liability accounts."
            )
        account, number = parts
        if account in balances:
            raise UsageError(f"Opening balance specified twice for {account}.")
        try:
            balances[account] = parse_decimal_number(number)
        except ValueError as exc:
            raise UsageError(str(exc)) from exc
    return balances


def _prepare_new_file(file: Path) -> Path:
    file = expand_path(file, "--file")
    if not file.is_absolute():
        file = file.resolve()
    try:
        present = file.exists() or file.is_symlink()
    except OSError:
        # Unstatable, so uncreatable: creation below reports it (w5/793, w5/795).
        present = False
    if present:
        raise ConflictError(f"Already exists: {file}. Choose a new path; init never overwrites a ledger.")
    return file


#: Preset accounts opened for any commodity, because they hold instrument units.
_INSTRUMENT_ACCOUNTS = frozenset({"Assets:Holdings"})


def answer_preset(
    file: Path,
    *,
    preset: str,
    title: str | None = None,
    currency: str,
    date: str,
    opening_balances: list[str] | None = None,
) -> dict[str, Any]:
    """Write a new ledger from a setup-catalog preset (ADR021).

    Mirrors the hosted builder: preset accounts open with no balance claim,
    an explicit opening balance posts the day before the history boundary
    against Equity:OpeningBalances and asserts on the boundary, and the
    accounts open the day before the boundary when such a posting exists.
    """
    file = _prepare_new_file(file)

    catalog = _load_catalog()
    presets = {entry["id"]: entry for entry in catalog["presets"]}
    entry = presets.get(preset)
    if entry is None:
        raise UsageError(f"Unknown preset {preset!r}. Choose one of: {', '.join(sorted(presets))}.")

    currencies = _load_currencies()
    currency = currency.strip().upper()
    if currency not in currencies["supportedCurrencies"]:
        raise UsageError(f"Unsupported operating currency {currency!r} for a preset ledger.")

    try:
        day = datetime.date.fromisoformat(date)
    except ValueError as exc:
        raise UsageError(f"--date must be a date in YYYY-MM-DD form, not {date!r}.") from exc

    accounts = [account["name"] for account in entry["accounts"]]
    balances = _parse_opening_balances(opening_balances, accounts, "preset's")

    # A confirmed zero asserts the boundary without posting anything (w5/876).
    funded = sorted(account for account, amount in balances.items() if amount)
    if funded and day == datetime.date.min:
        raise UsageError(
            f"--date {day.isoformat()} cannot start a ledger with a known opening balance: an opening is recorded on "
            f"the day before the history starts, and {day.isoformat()} has no day before it. Use "
            f"{(day + datetime.timedelta(days=1)).isoformat()} or later, or leave the opening balance out. "
            "Nothing was created."
        )
    open_day = day - datetime.timedelta(days=1) if funded else day
    # Beancount string content: a quote or backslash left bare ended the string
    # early or began an escape, so the saved title was not the one supplied.
    saved_title = (title or entry["title"]).replace("\\", "\\\\").replace('"', '\\"')
    lines = [
        f'option "title" "{saved_title}"',
        f'option "operating_currency" "{currency}"',
        'option "inferred_tolerance_default" "*:0.001"',
        "",
        'plugin "beancount.plugins.auto_accounts"',
        "",
    ]
    opened = sorted(accounts)
    if funded and "Equity:OpeningBalances" not in opened:
        opened.append("Equity:OpeningBalances")
        opened.sort()
    for account in opened:
        # The portfolio preset's holdings hold instruments (HOOL, BTC), not
        # only cash: restricted to the operating currency, its first share
        # purchase was refused (w5/957).
        restriction = "" if account in _INSTRUMENT_ACCOUNTS else f" {currency}"
        lines.append(f"{open_day} open {account}{restriction}")
    if balances:
        lines.append("")
        for account in funded:
            amount = balances[account]
            lines.append(f'{day - datetime.timedelta(days=1)} * "Opening balance"')
            lines.append(f"  {account}  {amount:f} {currency}")
            # copy_negate keeps every digit: unary minus rounds a wide amount to the context (w5/901).
            lines.append(f"  Equity:OpeningBalances  {amount.copy_negate():f} {currency}")
            lines.append("")
        for account in sorted(balances):
            lines.append(f"{day} balance {account}  {balances[account]:f} {currency}")
        lines.append("")

    _write_new_ledger(file, "\n".join(lines) + "\n")
    return {
        "created": str(file),
        "currency": currency,
        "date": day.isoformat(),
        "preset": preset,
        "opened": open_day.isoformat(),
        "accounts": opened,
    }


def _quiet_exists(path: Path) -> bool:
    """Whether the path exists, counting an unstatable ancestor as absent.

    `Path.exists` raises `PermissionError` where `os.path.lexists` returns
    false, so the blocker walk below died raw on a path nested two levels
    under an unsearchable directory (w5/793).
    """
    try:
        return path.exists()
    except PermissionError:
        return False


#: Creation failures that are bad arguments, not a refusing filesystem (w5/795).
_USAGE_ERRNOS = frozenset({errno.ELOOP, errno.ENAMETOOLONG, errno.EILSEQ})


def _blocking_component(path: Path, number: int | None) -> Path:
    """The innermost path whose stat fails with this error number.

    A symlink loop, an overlong component and an illegal byte all fail
    every stat from the target outward to the link or bad name itself; the
    last failure before the first success names it.
    """
    blocker = path
    for candidate in (path, *path.parents):
        try:
            os.stat(candidate)
        except OSError as exc:
            if exc.errno != number:
                break
            blocker = candidate
        else:
            break
    return blocker


def _uncreatable_reason(blocker: Path, number: int | None) -> str:
    """Why the blocker cannot hold a ledger, as a usage error phrases it."""
    if number == errno.ELOOP:
        return f"{blocker} is a symbolic-link loop. Break the loop, or choose another directory."
    if number == errno.ENAMETOOLONG:
        return f"{blocker} exceeds the filesystem's name limit. Shorten the name, or choose another directory."
    return f"{blocker} is not a valid file name. Rename it, or choose another directory."


def _make_parent(file: Path) -> list[Path]:
    """Create the new ledger's directory, or say plainly what stands in the way.

    `mkdir` raised straight through: a regular file where a directory was
    named read as `FileExistsError: [Errno 17]`, and a read-only parent as
    `PermissionError: [Errno 13]`, each with exit 1 as if a ledger had failed
    validation. The first is a bad argument and the second the filesystem
    refusing — on the first command a newcomer runs.

    Returns the directories it made, outermost first, for removal when
    nothing is written after all.
    """
    parent = file.parent
    created = [path for path in (parent, *parent.parents) if not os.path.lexists(path)][::-1]
    try:
        parent.mkdir(parents=True, exist_ok=True)
    except (FileExistsError, NotADirectoryError) as exc:
        _remove_created(created)
        # `exists()` follows a link, so a dangling one (an unmounted drive) was
        # skipped and its parent, a real directory, blamed instead (w5/580).
        blocker = next((path for path in (parent, *parent.parents) if os.path.lexists(path)), parent)
        if blocker.is_symlink() and not blocker.exists():
            raise UsageError(
                f"Cannot create a ledger in {parent}: {blocker} is a broken symbolic link to "
                f"{os.readlink(blocker)}. Reconnect what it points to, or choose another directory. "
                "Nothing was written."
            ) from exc
        raise UsageError(
            f"Cannot create a ledger in {parent}: {blocker} is a file, not a directory. "
            "Choose another directory. Nothing was written."
        ) from exc
    except PermissionError as exc:
        _remove_created(created)
        existing = next((path for path in parent.parents if _quiet_exists(path)), parent)
        raise AuthError(
            f"Cannot create {parent}: the directory {existing} is not writable. Nothing was written."
        ) from exc
    except OSError as exc:
        _remove_created(created)
        if exc.errno in _USAGE_ERRNOS:
            blocker = _blocking_component(parent, exc.errno)
            raise UsageError(
                f"Cannot create a ledger in {parent}: {_uncreatable_reason(blocker, exc.errno)} Nothing was written."
            ) from exc
        # A full disk read as a raw `OSError: [Errno 28]` (w5/610).
        raise LedgerError(
            f"Cannot create {parent} ({exc.strerror or type(exc).__name__}); nothing was written."
        ) from exc
    return created


def _remove_created(created: list[Path]) -> None:
    """Remove the directories `_make_parent` made, innermost first, while each is empty."""
    for path in reversed(created):
        try:
            path.rmdir()
        except OSError:
            return
