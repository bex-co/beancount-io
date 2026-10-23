"""`bea list <type>` — read directives out of a local ledger.

The reading happens in the engine (`bea-engine list`); this module is the option
surface and the rendering. The eleven directive types differ only in how a row is
formatted and which filter they accept, so they are declared as data and
registered from three shared command shapes. Loading, error handling, limit
truncation, and the JSON envelope are then written once.

Rows arrive as the JSON the helper answered with, so nothing here knows a
Beancount type: a cell is a string in a dict, and `--details` renders the
Beancount syntax the helper already produced.
"""

from __future__ import annotations

import os
import re
import sys
from collections.abc import Callable
from dataclasses import dataclass
from enum import StrEnum
from pathlib import Path
from typing import Annotated, Any

import typer

from cli import context, output
from cli.errors import UsageError
from cli.single_value import SingleValueCommand
from cli.utils import account_filter, fold_account, inert_text, parse_opt_date, refuse_blank_filter, single_line

list_app = typer.Typer(help="List directives from a local .bean file", no_args_is_help=True, rich_markup_mode=None)

LimitOpt = Annotated[int, typer.Option("--limit", "-l", min=1, help="Max results (positive)")]
FromDateOpt = Annotated[str | None, typer.Option("--from-date", help="Start date YYYY-MM-DD")]
ToDateOpt = Annotated[str | None, typer.Option("--to-date", help="End date YYYY-MM-DD")]
AccountFilterOpt = Annotated[
    str | None, typer.Option("--account", "-a", help="Filter by account (case-insensitive substring)")
]
CurrencyFilterOpt = Annotated[str | None, typer.Option("--currency", "-c", help="Exact currency (case-insensitive)")]
TypeFilterOpt = Annotated[str | None, typer.Option("--type", "-t", help="Exact event/custom type (case-insensitive)")]
AllowErrorsOpt = Annotated[
    bool,
    typer.Option(
        "--allow-errors", help="Report partial data with errors on stderr; opts strict reads into partial answers"
    ),
]
OnDiskOpt = Annotated[
    bool,
    typer.Option("--on-disk", help="Only directives written in a ledger file (hide plugin-synthesized rows)"),
]


class ListSort(StrEnum):
    oldest = "oldest"
    newest = "newest"


SortOpt = Annotated[ListSort, typer.Option("--sort", help="Date order, applied before the limit")]


@dataclass(frozen=True)
class _Spec:
    """One directive type: how to show it, and what filter it takes."""

    headers: list[str]
    row: Callable[[dict[str, Any]], list[str]]
    empty: str
    filter: str | None = None  # "account", "currency", "type", or nothing but dates


def _format_custom_values(custom: dict[str, Any]) -> str:
    parts = []
    for value in custom["values"]:
        kind = value["kind"]
        if kind == "amount":
            parts.append(f"amount:{value['number']} {value['currency']}")
        elif kind == "bool":
            parts.append(f"bool:{'TRUE' if value['value'] else 'FALSE'}")
        elif kind == "date":
            parts.append(f"date:{value['value']}")
        elif kind == "number":
            parts.append(f"number:{value['value']}")
        elif kind == "account":
            parts.append(f"account:{value['value']}")
        else:
            parts.append(f"text:{value['value']}")
    return " ".join(parts)


def _amount(amount: dict[str, Any]) -> str:
    return f"{amount['number']} {amount['currency']}"


def _balance_amount(balance: dict[str, Any]) -> str:
    amount = _amount(balance["amount"])
    tolerance = balance.get("tolerance")
    if tolerance is None:
        return amount
    number, _, currency = amount.partition(" ")
    return f"{number} ~ {tolerance} {currency}"


def _currencies(currencies: list[str]) -> str:
    """The currencies an open restricts the account to, or that it restricts none.

    An `open` with no currency list accepts any commodity, which is a fact about
    the account rather than a cell the renderer failed to fill — so it says so
    instead of leaving whitespace. JSON keeps the empty list.
    """
    return ", ".join(currencies) or "(any)"


def _cost(cost: dict[str, Any]) -> str:
    """A cost basis in Beancount's own `{…}` spelling, lot date and label included."""
    parts = [_amount(cost)]
    if cost.get("date"):
        parts.append(str(cost["date"]))
    if cost.get("label") is not None:
        # Beancount's string escaping, so a label holding a quote or a
        # backslash still reads as one string — the spelling `--details` shows.
        label = str(cost["label"]).replace("\\", "\\\\").replace('"', '\\"')
        parts.append(f'"{label}"')
    return "{" + ", ".join(parts) + "}"


def _posting_amount(posting: dict[str, Any]) -> str:
    """Units, with the cost and price that tell one lot from another.

    The same text `--details` renders, so the table and the Beancount source
    agree. Booking normalises a `@@ total` into a per-unit `@`, so what shows
    is what the ledger holds rather than what was typed.
    """
    text = _amount(posting["units"])
    if posting.get("cost"):
        text += f" {_cost(posting['cost'])}"
    if posting.get("price"):
        text += f" @ {_amount(posting['price'])}"
    return text


def _matching_postings(item: dict[str, Any], account: str) -> list[dict[str, Any]]:
    """The postings `--account` selected, in entry order.

    `account` is already folded, so the empty filter matches every posting and
    the human column and the JSON envelope always agree on what "matching" is.
    """
    return [p for p in item["postings"] if account in fold_account(p["account"])]


SPECS: dict[str, _Spec] = {
    "transaction": _Spec(
        headers=["DATE", "FLAG", "PAYEE", "NARRATION", "POSTINGS"],
        row=lambda t: [t["date"], t["flag"], t["payee"] or "", t["narration"] or "", str(len(t["postings"]))],
        empty="No transactions found.",
        filter="account",
    ),
    "note": _Spec(
        headers=["DATE", "ACCOUNT", "COMMENT", "TAGS", "LINKS"],
        row=lambda n: [
            n["date"],
            n["account"],
            n["comment"],
            " ".join(f"#{tag}" for tag in n.get("tags") or []),
            " ".join(f"^{link}" for link in n.get("links") or []),
        ],
        empty="No notes found.",
        filter="account",
    ),
    "balance": _Spec(
        headers=["DATE", "ACCOUNT", "AMOUNT"],
        row=lambda b: [b["date"], b["account"], _balance_amount(b)],
        empty="No balance assertions found.",
        filter="account",
    ),
    "open": _Spec(
        headers=["DATE", "ACCOUNT", "CURRENCIES", "BOOKING"],
        row=lambda o: [o["date"], o["account"], _currencies(o["currencies"]), o.get("booking") or ""],
        empty="No open directives found.",
        filter="account",
    ),
    "close": _Spec(
        headers=["DATE", "ACCOUNT"],
        row=lambda c: [c["date"], c["account"]],
        empty="No close directives found.",
        filter="account",
    ),
    "document": _Spec(
        headers=["DATE", "ACCOUNT", "FILENAME", "TAGS", "LINKS"],
        row=lambda d: [
            d["date"],
            d["account"],
            d["filename"],
            " ".join(f"#{tag}" for tag in d.get("tags") or []),
            " ".join(f"^{link}" for link in d.get("links") or []),
        ],
        empty="No documents found.",
        filter="account",
    ),
    "pad": _Spec(
        headers=["DATE", "ACCOUNT", "FROM"],
        row=lambda p: [p["date"], p["account"], p["source_account"]],
        empty="No pad directives found.",
        filter="account",
    ),
    "price": _Spec(
        headers=["DATE", "CURRENCY", "AMOUNT"],
        row=lambda p: [p["date"], p["currency"], _amount(p["amount"])],
        empty="No prices found.",
        filter="currency",
    ),
    "commodity": _Spec(
        headers=["DATE", "CURRENCY"],
        row=lambda c: [c["date"], c["currency"]],
        empty="No commodity directives found.",
        filter="currency",
    ),
    "event": _Spec(
        headers=["DATE", "TYPE", "DESCRIPTION"],
        row=lambda e: [e["date"], e["type"], e["description"]],
        empty="No events found.",
        filter="type",
    ),
    "custom": _Spec(
        headers=["DATE", "TYPE", "VALUES"],
        row=lambda c: [c["date"], c["type"], _format_custom_values(c)],
        empty="No custom directives found.",
        filter="type",
    ),
}


def _transaction_table(headers: list[str], rows: list[tuple[list[str], list[tuple[str, str]]]]) -> None:
    """Print transactions, wrapping long posting cells under their row in a terminal.

    Piped output keeps the single-line form byte-for-byte; only a terminal
    whose width the single-line row would exceed gets one posting per line,
    with the other columns on the first line.
    """
    import shutil
    import sys

    headers = [single_line(header) for header in headers]
    rows = [
        ([single_line(cell) for cell in cells], [(single_line(account), single_line(amount)) for account, amount in p])
        for cells, p in rows
    ]
    single = [[*cells, "; ".join(f"{account}: {amount}" for account, amount in postings)] for cells, postings in rows]
    try:
        terminal = sys.stdout.isatty()
    except (AttributeError, ValueError):
        terminal = False
    if not terminal:
        output.table(headers, single)
        return
    width = shutil.get_terminal_size().columns
    # The table pads every column to its widest cell, so it is the padded
    # width that has to fit, not each row by itself (w5/164).
    padded = [max(output.display_width(cell) for cell in column) for column in zip(headers, *single, strict=True)]
    if sum(padded) + 2 * (len(headers) - 1) <= width:
        output.table(headers, single)
        return
    # Columns, not code points: a CJK character takes two (w1/106).
    widths = [output.display_width(header) for header in headers]
    for cells, _ in rows:
        for i, cell in enumerate([*cells, ""]):
            widths[i] = max(widths[i], output.display_width(cell))
    # The table reads in the terminal it prints to: shrink narration, then
    # payee, with an ellipsis so the first line fits the width. Piped output
    # and --details keep the full text.
    for i in (3, 2):
        total = sum(widths) + 2 * (len(headers) - 1)
        if total <= width:
            break
        shrink = min(widths[i] - output.display_width(headers[i]), total - width)
        if shrink > 0:
            widths[i] -= shrink
    rows = [
        (
            [output.truncate(cell, widths[i]) for i, cell in enumerate(cells)],
            postings,
        )
        for cells, postings in rows
    ]
    single = [[*cells, "; ".join(f"{account}: {amount}" for account, amount in postings)] for cells, postings in rows]
    sep = "  "
    typer.echo(sep.join(output.pad(header, widths[i]) for i, header in enumerate(headers)))
    typer.echo(sep.join("-" * widths[i] for i in range(len(headers))))
    for (cells, postings), row in zip(rows, single, strict=True):
        line = sep.join(output.pad(cell, widths[i]) for i, cell in enumerate(row))
        if output.display_width(line) <= width or not postings:
            typer.echo(line)
            continue
        typer.echo(sep.join(output.pad(cell, widths[i]) for i, cell in enumerate([*cells, ""])))
        pad = max(output.display_width(account) for account, _ in postings)
        for account, amount in postings:
            typer.echo(f"{sep}{output.pad(account, pad)}: {amount}")


# Beancount's lexer rules for a tag or link body and a commodity, as the engine
# holds writers to them (`bea_engine.ledger.text`): a filter value outside them
# can never match, and answered "No transactions found." with exit 0 (w5/340).
_TAG_OR_LINK = re.compile(r"[A-Za-z0-9\-_/.]+")
_COMMODITY = re.compile(r"[A-Z](?:[A-Z0-9'._-]*[A-Z0-9])?|/[A-Z0-9'._-]*[A-Z](?:[A-Z0-9'._-]*[A-Z0-9])?")
_FLAGS = frozenset("*!&#?%ABCDEFGHIJKLMNOPQRSTUVWXYZ")


def _several(value: str, advice: str) -> str:
    return f" {advice[:1].upper()}{advice[1:]}." if re.search(r"[,\s]", value) else ""


def _refuse_non_token(flag: str, value: str, sigil: str) -> None:
    body = value[1:] if value.startswith(sigil) else value
    if _TAG_OR_LINK.fullmatch(body):
        return
    noun = "tags" if flag == "--tag" else "links"
    raise UsageError(
        f"{flag}: {value!r} is not one tag or link; use only ASCII letters, digits and - _ / . after an optional "
        # Repeats are ANDed: "repeat --tag for several tags" then found nothing (w5/835).
        f"leading {sigil}.{_several(value, f'repeat {flag} to require several {noun} on one transaction')}"
    )


def _run(name: str, spec: _Spec, limit: int, allow_errors: bool, *, details: bool = False, **filters: Any) -> None:
    """Ask the engine for one directive type, and render it for the active mode."""
    from cli.engine import launch

    filters["account"] = account_filter("--account", filters.get("account"))
    for flag, value in (
        ("--currency", filters.get("currency")),
        ("--type", filters.get("kind")),
        ("--flag", filters.get("flag")),
    ):
        refuse_blank_filter(flag, value)
    # A tag or link is tested without its sigil, as the engine strips it: a
    # bare `#` or `^` (`"#${TAG}"` with TAG unset) names nothing, and would
    # otherwise match no transaction at all rather than be reported.
    for flag, values, sigil in (
        ("--search", filters.get("search"), ""),
        ("--tag", filters.get("tags"), "#"),
        ("--link", filters.get("links"), "^"),
    ):
        for value in values or []:
            refuse_blank_filter(flag, value.lstrip(sigil) if sigil else value)
            if sigil:
                _refuse_non_token(flag, value, sigil)
    currency = filters.get("currency")
    if currency is not None and not _COMMODITY.fullmatch(currency.strip().upper()):
        raise UsageError(
            f"--currency: {currency!r} is not one commodity; a commodity is a capital letter followed by capitals, "
            f"digits and ' . _ -.{_several(currency, 'filter one commodity per command')}"
        )
    if currency is not None:
        # The value checked is the value matched: `" HOOL"` passed the check
        # and then matched no price, an empty answer with exit 0 (w5/473).
        filters["currency"] = currency.strip()
    ctx = context.current()
    if filters.get("from_date") and filters.get("to_date") and filters["from_date"] > filters["to_date"]:
        raise UsageError("--from-date must be on or before --to-date.")
    file = ctx.entry_file()

    # --details only feeds the human rendering, and the JSON envelope returns
    # before it is used; asking for it there would render Beancount for nothing.
    rendering = details and not ctx.json_output
    argv = ["list", "--file", str(file), "--type", name, "--limit", str(limit)]
    for option, value in (("--from-date", filters.get("from_date")), ("--to-date", filters.get("to_date"))):
        if value is not None:
            argv += [option, value.isoformat()]
    for option, value in (
        ("--account", filters.get("account")),
        ("--currency", filters.get("currency")),
        ("--kind", filters.get("kind")),
        ("--flag", filters.get("flag")),
    ):
        if value is not None:
            argv += [option, str(value)]
    for option, values in (
        ("--search", filters.get("search")),
        ("--tag", filters.get("tags")),
        ("--link", filters.get("links")),
    ):
        for value in values or []:
            argv += [option, str(value)]
    if filters.get("newest"):
        argv.append("--newest")
    if filters.get("on_disk"):
        argv.append("--on-disk")
    if rendering:
        argv.append("--details")

    data = launch.helper_json(argv)
    ledger_errors = data.get("errors") or []
    output.render_ledger_errors(ledger_errors, allow=allow_errors, hint=data.get("root_hint"))
    items: list[dict[str, Any]] = list(data["items"])
    truncated = bool(data["truncated"])

    if ctx.json_output:
        # `postings` stays the whole entry — an agent needs the counterparty legs
        # to read it. `--account` adds the narrowed list the human column shows.
        if name == "transaction" and (folded := fold_account(filters.get("account") or "")):
            items = [{**item, "matching_postings": _matching_postings(item, folded)} for item in items]
        output.emit(
            items,
            target=output.file_target(file),
            truncated=truncated,
            limit=limit,
            ledger_errors=[output.format_ledger_error(error) for error in ledger_errors],
        )
        return

    output.utf8_stdout()
    if not items:
        # On stderr, as `query`'s `(no rows)` and `balance`'s notice are: on
        # stdout a `| head` or `> file` read it as a row (w5/843).
        typer.echo(spec.empty, err=True)
        return
    # A plugin can add rows the ledger file never declares. They read as
    # `generated`, and the column only exists when one does — a plugin-free
    # table renders exactly as before.
    generated = [bool(item.get("generated")) for item in items]
    show_source = any(generated)
    if rendering:
        output.note("Transactions rendered in Beancount syntax: all postings, with source locations.")
        for item, rendered in zip(items, data["rendered"], strict=True):
            if item.get("source"):
                suffix = " (generated)" if item.get("generated") else ""
                # A comment, so the redirected stream is still a ledger (w5/985).
                typer.echo("; " + single_line(f"{item['source']['filename']}:{item['source']['lineno']}{suffix}"))
            # A terminal shows control characters inert; a redirect gets the
            # ledger's own strings, so the text parses back (w5/834).
            typer.echo(inert_text(rendered) if sys.stdout is not None and sys.stdout.isatty() else rendered)
    elif name == "transaction":
        account = fold_account(filters.get("account") or "")
        amounts = "MATCHING POSTING AMOUNTS" if account else "POSTING AMOUNTS"
        _transaction_table(
            ["DATE", "FLAG", "PAYEE", "NARRATION", *(["SOURCE"] if show_source else []), amounts],
            [
                (
                    [
                        item["date"],
                        item["flag"],
                        item["payee"] or "",
                        item["narration"] or "(no narration)",
                        *(["generated" if item.get("generated") else ""] if show_source else []),
                    ],
                    [
                        (
                            (f"{p['flag']} {p['account']}" if p.get("flag") else p["account"]),
                            _posting_amount(p),
                        )
                        for p in _matching_postings(item, account)
                        if p["units"]
                    ],
                )
                for item in items
            ],
        )
    else:
        headers, rows = spec.headers, [spec.row(item) for item in items]
        if name == "document":
            # Each filename is relative to the file that wrote it; name that file,
            # or two includes' `receipt.pdf` read alike (w5/833).
            headers = [*headers, "WRITTEN IN"]
            rows = [[*row, _written_in(item, file)] for row, item in zip(rows, items, strict=True)]
        if show_source:
            headers = [*headers, "SOURCE"]
            rows = [[*row, "generated" if marker else ""] for row, marker in zip(rows, generated, strict=True)]
        output.table(headers, rows)
    if truncated:
        advice = "raise --limit for more" if _limit_was_given() else "pass --limit for more"
        output.note(f"Showing the first {limit}; {advice}.")


def _written_in(item: dict[str, Any], root: Path) -> str:
    """`FILE:LINE` of the directive behind a row, relative to the root's folder when inside it."""
    source = item.get("source") or {}
    filename, lineno = source.get("filename"), source.get("lineno")
    if not filename:
        return ""
    folder, path = Path(os.path.abspath(root)).parent, Path(filename)
    # As the ledger spells it first, so a symlinked root keeps its own names.
    shown = next(
        (
            str(target.relative_to(base))
            for base, target in ((folder, path), (folder.resolve(), path.resolve()))
            if target.is_relative_to(base)
        ),
        filename,
    )
    return single_line(f"{shown}:{lineno}")


def _limit_was_given() -> bool:
    """Whether `--limit` was typed, whatever its value: an explicit `-l 50` was told to pass it (w5/836)."""
    from typer._click.core import ParameterSource
    from typer._click.globals import get_current_context

    ctx = get_current_context(silent=True)
    source = ctx.get_parameter_source("limit") if ctx is not None else None
    return source is not None and source is not ParameterSource.DEFAULT


def _account_command(name: str, spec: _Spec) -> Callable[..., None]:
    def command(
        limit: LimitOpt = 50,
        from_date: FromDateOpt = None,
        to_date: ToDateOpt = None,
        account: AccountFilterOpt = None,
        allow_errors: AllowErrorsOpt = False,
        on_disk: OnDiskOpt = False,
        sort: SortOpt = ListSort.oldest,
    ) -> None:
        _run(
            name,
            spec,
            limit,
            allow_errors,
            from_date=parse_opt_date(from_date),
            to_date=parse_opt_date(to_date),
            account=account,
            on_disk=on_disk,
            newest=sort == ListSort.newest,
        )

    return command


def _currency_command(name: str, spec: _Spec) -> Callable[..., None]:
    def command(
        limit: LimitOpt = 50,
        from_date: FromDateOpt = None,
        to_date: ToDateOpt = None,
        currency: CurrencyFilterOpt = None,
        allow_errors: AllowErrorsOpt = False,
        on_disk: OnDiskOpt = False,
        sort: SortOpt = ListSort.oldest,
    ) -> None:
        _run(
            name,
            spec,
            limit,
            allow_errors,
            from_date=parse_opt_date(from_date),
            to_date=parse_opt_date(to_date),
            currency=currency,
            on_disk=on_disk,
            newest=sort == ListSort.newest,
        )

    return command


def _type_command(name: str, spec: _Spec) -> Callable[..., None]:
    def command(
        limit: LimitOpt = 50,
        from_date: FromDateOpt = None,
        to_date: ToDateOpt = None,
        type: TypeFilterOpt = None,
        allow_errors: AllowErrorsOpt = False,
        on_disk: OnDiskOpt = False,
        sort: SortOpt = ListSort.oldest,
    ) -> None:
        _run(
            name,
            spec,
            limit,
            allow_errors,
            from_date=parse_opt_date(from_date),
            to_date=parse_opt_date(to_date),
            kind=type,
            on_disk=on_disk,
            newest=sort == ListSort.newest,
        )

    return command


def _plain_command(name: str, spec: _Spec) -> Callable[..., None]:
    def command(
        limit: LimitOpt = 50,
        from_date: FromDateOpt = None,
        to_date: ToDateOpt = None,
        allow_errors: AllowErrorsOpt = False,
        on_disk: OnDiskOpt = False,
        sort: SortOpt = ListSort.oldest,
    ) -> None:
        _run(
            name,
            spec,
            limit,
            allow_errors,
            from_date=parse_opt_date(from_date),
            to_date=parse_opt_date(to_date),
            on_disk=on_disk,
            newest=sort == ListSort.newest,
        )

    return command


# Four signatures rather than one: Typer reads the option list off the literal
# signature, so a single shared one would advertise --currency on `list event`.
_COMMANDS = {
    "account": _account_command,
    "currency": _currency_command,
    "type": _type_command,
    None: _plain_command,
}

for _name, _spec in SPECS.items():
    if _name == "transaction":
        continue
    # A repeated scalar filter kept only its last value: `-a Food -a Rent`
    # listed Rent alone with exit 0 (w5/381).
    list_app.command(_name, cls=SingleValueCommand, help=f"List {_name} directives from a .bean file.")(
        _COMMANDS[_spec.filter](_name, _spec)
    )


@list_app.command("transaction", cls=SingleValueCommand)
def transactions(
    limit: LimitOpt = 50,
    from_date: FromDateOpt = None,
    to_date: ToDateOpt = None,
    account: AccountFilterOpt = None,
    flag: Annotated[str | None, typer.Option("--flag", help="Transaction flag, e.g. '!' for entries to review")] = None,
    search: Annotated[
        list[str] | None,
        typer.Option(
            "--search",
            help="Case-insensitive text in payee or narration; repeatable (AND — every term must match)",
        ),
    ] = None,
    tag: Annotated[
        list[str] | None,
        typer.Option("--tag", help="Tag with or without '#', case-sensitive; repeat to require every tag"),
    ] = None,
    link: Annotated[
        list[str] | None,
        typer.Option("--link", help="Link with or without '^', case-sensitive; repeat to require every link"),
    ] = None,
    allow_errors: AllowErrorsOpt = False,
    on_disk: OnDiskOpt = False,
    details: Annotated[
        bool,
        typer.Option("--details", help="Render Beancount syntax with every posting, metadata, and source location"),
    ] = False,
    sort: Annotated[
        ListSort, typer.Option("--sort", help="Transaction date order, applied before the limit")
    ] = ListSort.newest,
) -> None:
    """List recent transactions and their amounts."""
    if flag == "txn":
        # `add --flag txn` writes it and Beancount reads it as `*`: the shared
        # flag grammar includes it, so the filter does too (w5/526).
        flag = "*"
    if flag is not None and flag.strip() and flag not in _FLAGS:
        raise UsageError(
            f"--flag {flag!r} is not a transaction flag; use one of * ! & # ? %, a capital letter or txn, such as '!'."
        )
    _run(
        "transaction",
        SPECS["transaction"],
        limit,
        allow_errors,
        details=details,
        from_date=parse_opt_date(from_date),
        to_date=parse_opt_date(to_date),
        account=account,
        flag=flag,
        search=search,
        tags=tag,
        links=link,
        newest=sort == ListSort.newest,
        on_disk=on_disk,
    )
