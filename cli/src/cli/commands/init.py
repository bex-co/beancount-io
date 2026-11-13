"""Create a small, usable personal ledger without installing another tool.

Starter content, alignment, validation, and atomic creation run in
`bea-engine init`. This module owns prompts, option checks, and next-step UX.
"""

from __future__ import annotations

import datetime
import functools
import os
import re
import shlex
from decimal import Decimal
from pathlib import Path
from typing import Annotated, Any, NamedTuple

import typer

from cli import context, existing_report, output
from cli.agent_guidance import (
    beside_ledger_plugins,
    check_command,
    error_count,
    write_agent_files,
    write_existing_agent_files,
)
from cli.amounts import parse_decimal_number
from cli.errors import AuthError, ConflictError, UsageError
from cli.paths import expand_path
from cli.utils import inert_text, parse_date

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


@functools.cache
def _setup_catalog() -> dict[str, Any]:
    """The engine's copy of the setup catalog, read once per process."""
    import json

    from cli.engine.paths import helper_source_root

    path = helper_source_root() / "bea_engine" / "setup_catalog.json"
    return json.loads(path.read_text(encoding="utf-8"))  # type: ignore[no-any-return]


def _preset_accounts(preset: str) -> tuple[str, ...]:
    """Account names of a setup-catalog preset, from the engine's catalog copy.

    The frontend reads the same JSON the engine builds from, so the two can
    never disagree about which accounts a preset opens. An unknown preset is
    the caller's mistake, refused before anything is created.
    """
    catalog = _setup_catalog()
    for entry in catalog["presets"]:
        if entry["id"] == preset:
            return tuple(account["name"] for account in entry["accounts"])
    known = ", ".join(sorted(entry["id"] for entry in catalog["presets"]))
    raise UsageError(f"--preset {preset!r}: Unknown preset. Choose one of: {known}. Nothing was created.")


_PROPERTY_WITHOUT_RENTAL = (
    "--property-name names the rental-property@1 module; add --module rental-property@1. Nothing was created."
)


class ModuleSelection(NamedTuple):
    """The accounts the selected modules add, and the module that takes `--property-name`."""

    accounts: tuple[str, ...]
    property_module: str | None


def module_accounts(preset: str | None, modules: list[str] | None, property_name: str | None) -> ModuleSelection:
    """The setup-catalog modules' accounts, refusing a bad selection before anything is created.

    Reads the engine's catalog copy, like `_preset_accounts`, and applies the
    hosted builder's rules (ADR026): modules only with a preset that lists
    them, each once, and `--property-name` only with the module that declares
    it. Shared by `bea init` and `bea cloud ledger create`.
    """
    if not modules:
        if property_name is not None:
            raise UsageError(_PROPERTY_WITHOUT_RENTAL)
        return ModuleSelection((), None)
    if preset is None:
        raise UsageError(
            "--module adds accounts to a --preset personal@1 ledger; add --preset personal@1. Nothing was created."
        )
    known = {entry["id"]: entry for entry in _setup_catalog()["modules"]}
    names: list[str] = []
    seen: set[str] = set()
    property_module = None
    for module_id in modules:
        entry = known.get(module_id)
        if entry is None:
            choices = ", ".join(sorted(known))
            raise UsageError(f"--module {module_id!r}: Unknown module. Choose one of: {choices}. Nothing was created.")
        if preset not in entry["allowedPresets"]:
            allowed = ", ".join(entry["allowedPresets"])
            raise UsageError(
                f"--module {module_id!r} is accepted only with --preset {allowed}, not {preset!r}. Nothing was created."
            )
        if module_id in seen:
            raise UsageError(f"--module {module_id!r} is given more than once. Nothing was created.")
        seen.add(module_id)
        parameter = next((p for p in entry["parameters"] if p["id"] == "propertyName"), None)
        if parameter is None:
            names += [account["name"] for account in entry["accounts"]]
            continue
        property_module = module_id
        name = property_name if property_name is not None else parameter["default"]
        if not re.fullmatch(parameter["pattern"], name):
            raise UsageError(f"--property-name {name!r}: {parameter['description']}. Nothing was created.")
        names += [account["name"].replace(parameter["placeholder"], name) for account in entry["accounts"]]
    if property_name is not None and property_module is None:
        raise UsageError(_PROPERTY_WITHOUT_RENTAL)
    return ModuleSelection(tuple(names), property_module)


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


def _folds_case(directory: Path) -> bool:
    """Whether names in this existing directory differ only by case and still name one file.

    On a case-insensitive volume `main.BEAN` is `main.bean`, so creating it
    takes the default name beside an existing `main.beancount`; where case
    counts it is just another file (w5/945). Probed on a name that exists.
    """
    try:
        for entry in directory.iterdir():
            swapped = entry.name.swapcase()
            if swapped != entry.name:
                return (directory / swapped).exists()
    except OSError:
        pass
    return False


#: Ledger file suffixes a directory is searched for under `--existing`.
_LEDGER_SUFFIXES = (".bean", ".beancount")


def _existing_root(directory: Path) -> Path:
    """The root ledger `--existing` describes: named outright, or the one a directory holds.

    `--file` or a file argument names it. A directory uses bea's own discovery
    (`main.bean`, then `main.beancount`), then its only top-level ledger file;
    with several and no default name it is never guessed (w1/m42/t001).
    """
    from cli.config import DEFAULT_ENTRY_FILE_FALLBACKS

    ctx = context.current()
    if ctx.file is not None:
        if directory != Path("."):
            raise UsageError("Choose either --file or an init directory, not both.")
        candidate = expand_path(ctx.file, "--file").absolute()
        source = "--file"
    else:
        target = expand_path(directory, "init directory").absolute()
        source = "the init argument"
        if target.is_dir():
            for name in DEFAULT_ENTRY_FILE_FALLBACKS:
                if os.path.lexists(target / name):
                    candidate = target / name
                    break
            else:
                found = sorted(
                    entry
                    for entry in target.iterdir()
                    if entry.suffix in _LEDGER_SUFFIXES and entry.is_file() and not entry.name.startswith(".")
                )
                shown = _shell_path(str(target))
                if not found:
                    raise UsageError(
                        f"No .bean or .beancount ledger in {target}. Name the root file: bea init --existing PATH."
                    )
                # A file another candidate includes is not a root; what is
                # left is read from the include lines, not guessed.
                included = {
                    os.path.abspath(member)
                    for entry in found
                    for member in output.ledger_closure(entry)
                    if os.path.abspath(member) != os.path.abspath(entry)
                }
                roots = [entry for entry in found if os.path.abspath(entry) not in included] or found
                if len(roots) > 1:
                    names = ", ".join(entry.name for entry in roots[:10])
                    more = f", and {len(roots) - 10} more" if len(roots) > 10 else ""
                    raise UsageError(
                        f"{target} holds several ledger files that no other file includes ({names}{more}) and no "
                        f"main.bean. Name the root: bea init --existing {shown}/{_shell_path(roots[0].name)}"
                    )
                candidate = roots[0]
        else:
            candidate = target
    if not candidate.exists():
        raise UsageError(f"No ledger file at '{candidate}' (from {source}). Nothing was written.")
    if not candidate.is_file():
        raise UsageError(f"Ledger path '{candidate}' (from {source}) is not a regular file. Nothing was written.")
    return candidate


def _init_existing(directory: Path) -> None:
    """`bea init --existing`: describe a ledger bea did not create and write its agent files."""
    from cli.engine import launch

    ctx = context.current()
    root = _existing_root(directory)
    description = launch.helper_json(["describe", "--file", str(root)])
    if beside_ledger_plugins(description):
        check = f"cd {_shell_path(str(root.parent))} && {check_command(root.name, description)}"
    else:
        check = f"bea --file {_shell_path(str(root))} check"
    items = existing_report.attention(description, check)
    data: dict[str, Any] = {
        **description,
        "attention": items,
        "agent_files": write_existing_agent_files(description, today=datetime.date.today().isoformat()),
    }
    if ctx.json_output:
        output.emit(data, target=output.file_target(root))
        return
    files = len(description["files"]) + 1
    accounts = len(description["open_accounts"])
    currencies = ", ".join(description["operating_currencies"]) or "no operating currency set"
    output.success(
        f"Read {root.name}: {files} file{'s' if files != 1 else ''}, {accounts} open "
        f"account{'s' if accounts != 1 else ''}, {currencies}. No ledger file was changed."
    )
    _report_agent_files(data["agent_files"])
    count = error_count(description)
    if count:
        output.note(
            f"The ledger loads with {count} error{'s' if count != 1 else ''} today; AGENTS.md asks agents to add none."
        )
    for line in existing_report.render(items, check):
        # Paths and plugin names come from the user's files (w5/887).
        typer.echo(inert_text(line))


def _report_agent_files(result: dict[str, str]) -> None:
    """Say which agent files were written and which already existed."""
    made = [name for name, state in result.items() if state == "created"]
    if made:
        output.success(f"Wrote {' and '.join(made)} beside the ledger.")
    if result["AGENTS.md"] == "kept":
        output.note("AGENTS.md already exists; left unchanged, and CLAUDE.md was not written.")
    elif result["CLAUDE.md"] == "kept":
        output.note("CLAUDE.md already exists; left unchanged.")


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
        typer.Option("--preset", help="Setup-catalog preset id, e.g. personal@1 (ADR026); replaces the fixed chart"),
    ] = None,
    title: Annotated[str | None, typer.Option("--title", help="Ledger title; only with --preset")] = None,
    module: Annotated[
        list[str] | None,
        typer.Option(
            "--module",
            help="Also track investments@1, rental-property@1, or side-business@1 in a --preset personal@1 ledger; "
            "repeat for each",
        ),
    ] = None,
    property_name: Annotated[
        str | None,
        typer.Option("--property-name", help="Account name for the rental property, e.g. OakSt (default Property1)"),
    ] = None,
    agent_files: Annotated[
        bool,
        typer.Option(
            "--agent-files",
            help="Also write AGENTS.md (and a CLAUDE.md that imports it) for coding agents; "
            "an existing file is never replaced",
        ),
    ] = False,
    existing: Annotated[
        bool,
        typer.Option(
            "--existing",
            help="Set up a ledger bea did not create: describe it and write AGENTS.md and CLAUDE.md beside its "
            "root; no ledger file is changed",
        ),
    ] = False,
) -> None:
    """Create main.bean with common accounts.

    Optional opening balances included. For unattended use:
    bea --no-input init books --currency USD.
    Credit card debt uses a negative opening balance.
    New ledger files are private (0600 on POSIX); chmod explicitly to share.
    With --existing, describe an existing ledger instead and write only its agent files.
    """
    from cli.config import DEFAULT_ENTRY_FILE_FALLBACKS
    from cli.engine import launch

    ctx = context.current()
    if existing:
        new_ledger_options = {
            "--currency": currency,
            "--date": date,
            "--opening-balance": opening_balance,
            "--preset": preset,
            "--title": title,
            "--module": module,
            "--property-name": property_name,
        }
        given = [name for name, value in new_ledger_options.items() if value is not None]
        if given:
            raise UsageError(
                f"{', '.join(given)} only {'applies' if len(given) == 1 else 'apply'} to a new ledger; "
                "--existing describes the ledger as it is. Nothing was written."
            )
        _init_existing(directory)
        return
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
            raise ConflictError(
                f"Already exists: {file}. Choose a new path; init never overwrites a ledger. "
                f"To set up this ledger for bea and coding agents without changing it: "
                f"bea init --existing {_shell_path(str(file))}"
            )
        # Refuse shadowing a sibling default root ledger (cwd discovery prefers main.bean).
        default_names = {name.name for name in DEFAULT_ENTRY_FILE_FALLBACKS}
        if file.name in default_names or (file.name.casefold() in default_names and _folds_case(file.parent)):
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
    added = module_accounts(preset, module, property_name).accounts
    allowed_opening = (*preset_accounts, *added) if preset_accounts is not None else _ACCOUNTS
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
        for module_id in module or []:
            argv += ["--module", module_id]
        if property_name is not None:
            argv += ["--property-name", property_name]
    for account, amount in balances.items():
        # A preset keeps a confirmed zero as a zero assertion; the fixed
        # template only ever posts nonzero openings (w5/876).
        if amount or preset is not None:
            argv += ["--opening-balance", f"{account} {amount:f}"]
    data = launch.helper_json(argv, writes=True)
    if warnings:
        data["warnings"] = warnings
    if agent_files:
        data["agent_files"] = write_agent_files(
            file, currency, list(data["accounts"] if "accounts" in data else _ACCOUNTS)
        )
    if ctx.json_output:
        output.emit(data, target=output.file_target(file))
    else:
        if not prompted:
            for warning in warnings:
                output.note(warning)
        # A preset may open nothing; only a result without the key is the fixed chart.
        accounts = data["accounts"] if "accounts" in data else list(_ACCOUNTS)
        output.success(f"Created {file} with {len(accounts)} accounts in {currency}.")
        if agent_files:
            _report_agent_files(data["agent_files"])
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
