"""Create a small, usable personal ledger without installing another tool.

Starter content, alignment, validation, and atomic creation run in
`bea-engine init`. This module owns prompts, option checks, and next-step UX.
"""

from __future__ import annotations

import datetime
import os
import re
import shlex
from decimal import Decimal
from pathlib import Path
from typing import Annotated

import typer

from cli import context, output
from cli.amounts import parse_decimal_number
from cli.errors import AuthError, ConflictError, UsageError
from cli.paths import expand_path
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


#: One Beancount commodity token, as the lexer accepts it on an `open` line:
#: one uppercase letter, optionally followed by the symbol alphabet and an
#: alphanumeric final character. The general-purpose `CURRENCY_RE` also
#: matches a trailing underscore, but the lexer refuses it (w5/693). Keep
#: single-letter tickers such as `F` and internal punctuation such as `NT.TO`.
#: The leading-`/` commodity-pair form is not an operating currency here.
#: Restated rather than imported: the frontend loads no Beancount, and
#: `tests/test_init_currency_symbols.py` verifies the ledger token boundary.
_CURRENCY_SYMBOL = re.compile(r"[A-Z](?:[A-Z0-9'._-]*[A-Z0-9])?")


#: The lexer reads these words as literals, never as commodity symbols, so an
#: `open ... TRUE` line is a syntax error. Only the exact words: `TRUE1` is a
#: symbol (w5/935).
_RESERVED_WORDS = frozenset({"TRUE", "FALSE", "NULL"})


def _currency(value: str) -> str:
    currency = value.strip().upper()
    if currency in _RESERVED_WORDS:
        raise typer.BadParameter(
            f"Invalid operating currency: {currency!r} is a reserved word in ledger syntax, not a commodity "
            "symbol. Use a symbol such as USD or EUR."
        )
    if not _CURRENCY_SYMBOL.fullmatch(currency):
        raise typer.BadParameter(f"Invalid operating currency: {currency!r}. Use a symbol such as USD or EUR.")
    return currency


def _refuse_uncreatable(file: Path) -> None:
    """Refuse, before the first question, a ledger whose directory cannot be made or written.

    The engine's creation check said so only after all three prompts were
    answered (w5/813); its messages are repeated here so the refusal reads
    the same either way.
    """
    parent = file.parent
    try:
        blocker = next((path for path in (parent, *parent.parents) if os.path.lexists(path)), None)
        if blocker is None:
            return
        try:
            os.stat(blocker)
        except FileNotFoundError:
            raise UsageError(
                f"Cannot create a ledger in {parent}: {blocker} is a broken symbolic link to "
                f"{os.readlink(blocker)}. Reconnect what it points to, or choose another directory. "
                "Nothing was written."
            ) from None
        if not blocker.is_dir():
            raise UsageError(
                f"Cannot create a ledger in {parent}: {blocker} is a file, not a directory. "
                "Choose another directory. Nothing was written."
            )
        if os.access(blocker, os.W_OK | os.X_OK):
            return
    except OSError:
        # Unstatable: the engine's creation check reports it (w5/793, w5/795).
        return
    if blocker == parent:
        raise AuthError(
            f"Cannot stage a copy of {file.name} in {parent}: the directory is not writable. bea validates a "
            "write on a staged copy beside each changed file; make the directory writable before retrying. "
            "Nothing was written."
        )
    raise AuthError(f"Cannot create {parent}: the directory {blocker} is not writable. Nothing was written.")


def _preset_accounts(preset: str) -> tuple[str, ...]:
    """Account names of a setup-catalog preset, from the engine's catalog copy.

    The frontend reads the same JSON the engine builds from, so the two can
    never disagree about which accounts a preset opens. An unknown preset is
    the caller's mistake, refused before anything is created.
    """
    import json

    from cli.engine.paths import helper_source_root

    catalog = json.loads((helper_source_root() / "bea_engine" / "setup_catalog.json").read_text(encoding="utf-8"))
    for entry in catalog["presets"]:
        if entry["id"] == preset:
            return tuple(account["name"] for account in entry["accounts"])
    known = ", ".join(sorted(entry["id"] for entry in catalog["presets"]))
    raise UsageError(f"--preset {preset!r}: Unknown preset. Choose one of: {known}. Nothing was created.")


def _preset_currency(value: str) -> str:
    """A currency the setup catalog supports, from the engine's copy of its list (w5/878).

    A preset ledger takes only catalog currencies; checking just the symbol
    grammar let `BTC` through to a refusal after every question was answered.
    """
    import json

    from cli.engine.paths import helper_source_root

    currency = _currency(value)
    path = helper_source_root() / "bea_engine" / "setup_currencies.json"
    if currency not in json.loads(path.read_text(encoding="utf-8"))["supportedCurrencies"]:
        raise typer.BadParameter(f"Unsupported operating currency {currency!r} for a preset ledger.")
    return currency


def _opening_amount(value: str) -> Decimal:
    try:
        return parse_decimal_number(value)
    except UsageError as exc:
        # Typer retries this question for an invalid interactive answer.
        raise typer.BadParameter(str(exc)) from exc


_ANY_CONTROL = re.compile(r"[\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]")


def _quoted(path: str) -> str:
    """One shell word for `path`; a control byte is rebuilt by `printf` from its octal escape.

    The hint is replayed from a pipe, where Click strips ANSI sequences from
    what it prints, and on a terminal a raw control would repaint the screen
    (w5/887). `shlex.quote` alone keeps the byte, so the line named another
    path or acted on the terminal. The spelling is plain ASCII.
    """
    if not _ANY_CONTROL.search(path):
        return shlex.quote(path)
    spelled = "".join(
        "".join(f"\\{byte:03o}" for byte in char.encode())
        if _ANY_CONTROL.fullmatch(char)
        else {"\\": "\\\\", "%": "%%"}.get(char, char)
        for char in path
    )
    return f'"$(printf {shlex.quote(spelled)})"'


def _shell_path(shown: str) -> str:
    """Quote a path for a copy-pasteable command, leaving a leading `~` for the shell to expand."""
    if shown == "~":
        return shown
    if shown.startswith("~/"):
        return "~/" + _quoted(shown[2:])
    return _quoted(shown)


def _in_working_directory(file: Path) -> bool:
    """Whether `file` is the `main.bean` a bare `bea` run here would discover.

    A working directory that was deleted or cannot be read holds no ledger;
    the one just created is then reached by its path.
    """
    try:
        return file == Path.cwd() / "main.bean"
    except OSError:
        return False


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
    preset: Annotated[
        str | None,
        typer.Option("--preset", help="Setup-catalog preset id, e.g. personal@1 (ADR021); replaces the fixed chart"),
    ] = None,
    title: Annotated[str | None, typer.Option("--title", help="Ledger title; only with --preset")] = None,
) -> None:
    """Create main.bean with common accounts.

    Optional opening balances included. For unattended use:
    bea --no-input init books --currency USD.
    Credit card debt uses a negative opening balance.
    New ledger files are private (0600 on POSIX); chmod explicitly to share.
    """
    from cli.config import DEFAULT_ENTRY_FILE_FALLBACKS
    from cli.engine import launch

    ctx = context.current()
    if ctx.file is not None:
        if directory != Path("."):
            raise UsageError("Choose either --file or an init directory, not both.")
        file = expand_path(ctx.file, "--file").absolute()
    else:
        directory = expand_path(directory, "init directory").absolute()
        try:
            directory_is_dir = directory.is_dir()
        except OSError:
            # Unstatable, so uncreatable under: the engine's creation check
            # reports it (w5/793, w5/795).
            directory_is_dir = False
        file = (
            directory
            if directory.suffix in {".bean", ".beancount"} and not directory_is_dir
            else directory / "main.bean"
        )
    # Before anything is created: every later command refuses such a path
    # (w5/315), and `$HOME/books` left an empty `./$HOME/books/` behind (w5/579).
    context.refuse_expanding_ledger_path(str(file))
    try:
        if ctx.file is not None and file.is_dir():
            raise UsageError(
                f"Ledger path '{file}' (from --file) is a directory; expected a ledger file. "
                f"Use bea init {shlex.quote(str(file))} for a directory target, "
                f"or --file {shlex.quote(str(file / 'main.bean'))} for a file target."
            )
        if file.exists() or file.is_symlink():
            raise ConflictError(f"Already exists: {file}. Choose a new path; init never overwrites a ledger.")
        # Refuse shadowing a sibling default root ledger (cwd discovery prefers main.bean).
        if file.name in {name.name for name in DEFAULT_ENTRY_FILE_FALLBACKS}:
            for sibling_name in DEFAULT_ENTRY_FILE_FALLBACKS:
                sibling = file.with_name(sibling_name.name)
                if sibling == file:
                    continue
                if sibling.exists() or sibling.is_symlink():
                    raise ConflictError(
                        f"Already exists: {sibling}. Init would create {file} and cwd discovery "
                        f"would prefer main.bean over main.beancount — choose a new path; init never "
                        f"shadows an existing root ledger."
                    )
    except OSError:
        # Unstatable (an ancestor without search permission, a symlink
        # loop, an overlong or illegal name): nothing here can be checked,
        # and nothing can be created under it either, so the engine's
        # creation check reports it (w5/793, w5/795).
        pass
    _refuse_uncreatable(file)
    # Every option is checked before the first question, naming itself: a bad
    # `--date` or `--opening-balance` was refused only after the prompts were
    # answered, as `Invalid value: …` with no option named (w5/588).
    check_currency = _currency if preset is None else _preset_currency
    if currency is not None:
        try:
            currency = check_currency(currency)
        except typer.BadParameter as exc:
            raise UsageError(f"--currency {currency!r}: {exc.message}") from None
    given_day = None
    if date is not None:
        try:
            given_day = parse_date(date)
        except typer.BadParameter as exc:
            raise UsageError(f"--date {date!r}: {exc.message}") from None
    preset_accounts: tuple[str, ...] | None = None
    if preset is not None:
        preset_accounts = _preset_accounts(preset)
    elif title is not None:
        raise UsageError("--title is only meaningful with --preset. Nothing was created.")
    allowed_opening = preset_accounts if preset_accounts is not None else _ACCOUNTS
    balances: dict[str, Decimal] = {}
    for balance in opening_balance or []:
        parts = balance.split()
        if len(parts) != 2 or parts[0] not in allowed_opening or not parts[0].startswith(("Assets:", "Liabilities:")):
            raise UsageError(
                f"--opening-balance {balance!r}: Opening balance must be 'ACCOUNT NUMBER' for one of the "
                "template's asset/liability accounts."
            )
        account, number = parts
        if account in balances:
            raise UsageError(f"--opening-balance {balance!r}: Opening balance specified twice for {account}.")
        try:
            balances[account] = _opening_amount(number)
        except typer.BadParameter as exc:
            raise UsageError(f"--opening-balance {balance!r}: {exc.message}") from None
    prompted = currency is None
    if currency is None:
        if not ctx.can_prompt:
            raise UsageError("Choose an operating currency with --currency USD (or EUR, etc.).")
        currency = ctx.prompt("Operating currency", default="USD", value_proc=check_currency)
    currency = check_currency(currency)
    warnings = []
    if not re.fullmatch(r"[A-Z]{3}", currency):
        warnings.append(
            f"Operating currency {currency!r} is a valid Beancount symbol but is not three uppercase letters. "
            "Check for a typo (for example, USD). Custom and crypto symbols are supported."
        )
        if prompted:
            # Beside the answer it is about, before the next question, so a
            # typo can be caught before the ledger exists.
            output.note(warnings[-1])
    if date is None and ctx.can_prompt:
        day = ctx.prompt(
            "Earliest date you will record (opening balances must be as of this date)",
            default=datetime.date.today().isoformat(),
            value_proc=parse_date,
        )
    else:
        day = given_day or datetime.date.today()
    if ctx.can_prompt and opening_balance is None and preset is None:
        balances["Assets:Checking"] = ctx.prompt(
            f"Checking opening balance on {day} (negative for an overdraft)", default="0", value_proc=_opening_amount
        )

    argv = ["init", "--file", str(file), "--currency", currency, "--date", day.isoformat()]
    if preset is not None:
        argv += ["--preset", preset]
        if title is not None:
            argv += ["--title", title]
    for account, amount in balances.items():
        # A preset keeps a confirmed zero as a zero assertion; the fixed
        # template only ever posts nonzero openings (w5/876).
        if amount or preset is not None:
            argv += ["--opening-balance", f"{account} {amount:f}"]
    data = launch.helper_json(argv, writes=True)
    if warnings:
        data["warnings"] = warnings
    if ctx.json_output:
        output.emit(data, target=output.file_target(file))
    else:
        if not prompted:
            for warning in warnings:
                output.note(warning)
        # A preset may open nothing; only a result without the key is the fixed chart.
        accounts = data["accounts"] if "accounts" in data else list(_ACCOUNTS)
        output.success(f"Created {file} with {len(accounts)} accounts in {currency}.")
        try:
            shown = f"~/{file.relative_to(Path.home())}"
        except ValueError:
            shown = str(file)
        # Use the same target in every hint. A custom filename needs --file,
        # as does BEA_FILE overriding discovery after the suggested cd.
        bea = f"bea --file {_shell_path(shown)}" if os.environ.get("BEA_FILE") or file.name != "main.bean" else "bea"
        if bea != "bea":
            next_command = f"{bea} check"
        elif _in_working_directory(file):
            next_command = "bea check"
        else:
            next_command = f"cd {_shell_path(shown.rpartition('/')[0])} && bea check"
        typer.echo(f"Next: {next_command}")
        if accounts:
            # The preset builder opens accounts the day before the boundary when it posts an opening balance.
            typer.echo(
                f"Accounts open on {data.get('opened', day)}. To record earlier history, edit their open dates; "
                "new ledgers can use init --date YYYY-MM-DD."
            )
        typer.echo(f"Record purchases with {bea} add transaction, or preview a bank export with {bea} import.")
