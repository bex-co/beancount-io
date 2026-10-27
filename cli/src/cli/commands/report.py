"""Financial reports with explicit periods, accounting signs, and valuation.

Computation runs in `bea-engine` (`report` / `balance`); this module is the
option surface and the human/JSON rendering. Amounts arrive as strings, dates
as ISO, and trees as ordinary dicts — nothing here imports Beancount or Fava.
"""

from __future__ import annotations

import shlex
from collections.abc import Mapping
from decimal import ROUND_HALF_UP, Decimal, localcontext
from enum import StrEnum
from typing import Annotated, Any

import typer

from cli import context, output
from cli.engine import launch
from cli.errors import UsageError
from cli.single_value import SingleValueCommand
from cli.utils import account_filter, refuse_blank_filter, single_line, strip_padding

report_app = typer.Typer(help="Financial reports from a local ledger", no_args_is_help=True, rich_markup_mode=None)


class ReportInterval(StrEnum):
    monthly = "monthly"
    quarterly = "quarterly"
    yearly = "yearly"
    weekly = "weekly"
    daily = "daily"


class HoldingsGrouping(StrEnum):
    account = "account"
    commodity = "commodity"


ConversionOpt = Annotated[
    str | None,
    typer.Option(
        "--conversion",
        "-x",
        help="Currency or units/at_cost/at_value; defaults to the single operating currency, otherwise units",
    ),
]
TimeOpt = Annotated[
    str | None, typer.Option("--time", "-t", help='Time filter: year, month, 2026, 2026-08, or "2026-01 - 2026-06"')
]
AccountOpt = Annotated[
    str | None, typer.Option("--account", "-a", help="Account filter: a parent account or a regular expression")
]
FromDateOpt = Annotated[str | None, typer.Option("--from-date", help="Capital-gains sales on or after YYYY-MM-DD.")]
ToDateOpt = Annotated[str | None, typer.Option("--to-date", help="Capital-gains sales on or before YYYY-MM-DD.")]
CashFlowAccountOpt = Annotated[
    str | None,
    typer.Option(
        "--account",
        "-a",
        help="Account filter: a parent account or a regular expression. Refused (exit 2) when it keeps only some "
        "legs of a transaction in the period, since the cash it moved would no longer match the rows.",
    ),
]
CashFlowFromOpt = Annotated[str | None, typer.Option("--from-date", help="Cash-flow entries on or after YYYY-MM-DD.")]
CashFlowToOpt = Annotated[str | None, typer.Option("--to-date", help="Cash-flow entries on or before YYYY-MM-DD.")]
IntervalOpt = Annotated[ReportInterval, typer.Option("--interval", "-i", help="Reporting interval")]
GroupByOpt = Annotated[HoldingsGrouping, typer.Option("--group-by", help="Holdings grouping: account or commodity")]
AllowErrorsOpt = Annotated[
    bool,
    typer.Option(
        "--allow-errors",
        help="Show partial data with errors on stderr; opts strict reads into partial answers",
    ),
]


_FALLBACK_FRACTIONAL_DIGITS = 2
"""Fractional digits for a currency the ledger never names, usually a conversion target.

With no display context to infer from, human tables fall back to cents —
the same floor they use everywhere else — so a conversion can never print
an unbounded repeating expansion. JSON callers keep the exact value.
"""


def _quantize(number: Decimal, currency: str, precision: Mapping[str, int] | None) -> Decimal:
    """Round a text-report amount to the currency's display precision, half up.

    The precision is the finest the ledger itself uses for the currency
    (honoring `option "display_precision"`); money rounds half up, the way a
    person reading a total expects. Maximum, not most-common: a ledger of
    whole dollars with one cents purchase keeps its cents, while a converted
    `4.9050` still caps at the two decimals the ledger uses. A currency the
    ledger never names renders with the fallback cents. Non-finite values
    pass through unrounded. JSON is untouched: it keeps the full-precision
    decimal string.
    """
    if precision is None or not number.is_finite():
        return number
    fractional = precision.get(currency, _FALLBACK_FRACTIONAL_DIGITS)
    with localcontext() as ctx:
        ctx.prec = max(ctx.prec, len(number.as_tuple().digits) + fractional)
        return number.quantize(Decimal(1).scaleb(-fractional), rounding=ROUND_HALF_UP)


def _as_decimal(number: Decimal | str | int | None) -> Decimal | None:
    if number is None:
        return None
    if isinstance(number, Decimal):
        return number
    return Decimal(str(number))


def _amounts(
    balance: Mapping[str, Any], conversion: str | None = None, precision: Mapping[str, int] | None = None
) -> str:
    def render(currency: str, number: Any) -> str:
        value = _as_decimal(number)
        if value is None:
            return f"Unavailable {currency}"
        shown = _quantize(value, currency, precision)
        # `quantize` keeps the sign of what it rounded away: -0.40 at whole
        # dollars is `Decimal("-0")`, which would print as `-0 USD`. A
        # rounded zero has no sign.
        if shown.is_zero():
            shown = shown.copy_abs()
        # The floor is the currency's own precision: a zero-fraction ledger
        # prints whole dollars, while unknown currencies keep the fallback
        # floor the quantize just rounded them to.
        minimum = 2 if precision is None else precision.get(currency, _FALLBACK_FRACTIONAL_DIGITS)
        return f"{shown:,.{max(minimum, -int(shown.as_tuple().exponent))}f} {currency}"

    return "  ".join(render(currency, number) for currency, number in sorted(balance.items())) or "—"


def _money(
    amount: dict[str, Any] | None, conversion: str | None = None, precision: Mapping[str, int] | None = None
) -> str:
    """One `{number, currency}` object through the shared amount renderer."""
    if amount is None:
        return "—"
    return _amounts({str(amount["currency"]): amount["number"]}, conversion, precision)


def _valued(amount: dict[str, Any], group: dict[str, Any], conversion: str, precision: Mapping[str, int]) -> str:
    """A market value labelled when either quote behind it is stale.

    The value compounds the commodity quote with the conversion leg; one
    stale leg taints the cell. The heading already names the stale source,
    so the cell only says *that* it is stale (w22/m3/t004).
    """
    cell = _money(amount, conversion, precision)
    legs = [group.get("price_source"), group.get("conversion_source")]
    if any(isinstance(leg, dict) and leg.get("freshness") == "stale" for leg in legs):
        cell += " (stale)"
    return cell


def _print_tree(
    node: dict[str, Any],
    depth: int = 0,
    *,
    conversion: str | None = None,
    precision: Mapping[str, int] | None = None,
) -> None:
    # Escaped like every table cell (w5/148): a raw bidi override in a
    # component reordered the rest of the row on a bidi-aware terminal (w5/331).
    label = single_line(node["account"].rsplit(":", 1)[-1] if depth else node["account"])
    # Padded by display column, not code point: a CJK account component is
    # two columns per character and would otherwise push its amount right.
    row = output.pad("  " * depth + label, 46)
    typer.echo(f"  {row}  {_amounts(node['balance_children'], conversion, precision)}")
    for child in node["children"]:
        _print_tree(child, depth + 1, conversion=conversion, precision=precision)


def _filter_text(metadata: dict[str, Any]) -> str:
    """The account filter as typed: several `balance` terms each quoted, so two never read as one."""
    terms = metadata.get("account_filters") or []
    if len(terms) > 1:
        return " or ".join(repr(single_line(term)) for term in terms)
    return single_line(metadata.get("account_filter") or "all")


def _heading(title: str, metadata: dict[str, Any], *, profit_line: bool = False, convention: str | None = None) -> None:
    output.utf8_stdout()
    period = metadata["period"]
    dates = f"{period['start']} through {metadata['as_of']}" if period["start"] else "no dated activity"
    typer.echo(f"{title} — {dates}")
    typer.echo(f"Valuation: {metadata['conversion']}; account: {_filter_text(metadata)}")
    # Only reports that print an explicit profit figure may promise its sign;
    # the balance sheet's earnings line carries the opposite (credit) sign and
    # explains itself where it is printed. Cash flow brings its own convention:
    # its rows are cash impact, only its bottom lines are balances.
    convention = convention or "Account balances use Beancount signs (credits negative)"
    typer.echo(f"{convention}; profit is positive for a gain." if profit_line else f"{convention}.")
    for source in metadata.get("price_sources", []):
        if source["freshness"] != "recent" or source["error"]:
            # The error is a sentence of its own; one full stop, not `..` (w5/484).
            detail = f"; {source['error'].rstrip('.')}" if source["error"] else ""
            output.note(
                f"Price source {source['alias']}: {source['freshness']}; "
                f"observed {source['observed_at'] or 'unknown'}; revision {source['revision'] or 'none'}{detail}."
            )
    if metadata.get("excluded_date"):
        output.note(
            f"Entries dated {metadata['excluded_date']} are not included: "
            "a report period cannot reach the calendar's last day."
        )
    unrooted = metadata.get("unrooted_accounts") or []
    if unrooted:
        output.note(
            f"Not shown: {len(unrooted)} account(s) outside the root ledger's account roots: "
            f'{", ".join(unrooted)}. Beancount applies an included file\'s option "name_*" only while '
            "it parses that file, so no report section holds them; query still lists their balances."
        )
    if metadata.get("account_filter_empty"):
        periods = metadata.get("account_filter_periods") or []
        hint = f" For the period {periods[0]}, pass -t {shlex.quote(periods[0])}." if periods else ""
        output.note(f"No accounts match {_filter_text(metadata)}.{hint}")
    if metadata["missing_prices"]:
        typer.echo("Partial valuation: some prices are missing; a total that cannot be valued reads Unavailable.")
        for line in metadata["missing_price_summary"]:
            output.note(line)


def _ask(
    kind: str,
    *,
    conversion: str | None,
    time: str | None,
    account: str | None = None,
    interval: ReportInterval | None = None,
    accounts: list[str] | None = None,
    group_by: HoldingsGrouping | None = None,
    from_date: str | None = None,
    to_date: str | None = None,
    allow_errors: bool,
) -> tuple[Any, dict[str, Any]]:
    """Ask the engine for one report payload and surface tolerated load errors."""
    account = account_filter("--account", account)
    refuse_blank_filter("--conversion", conversion)
    refuse_blank_filter("--time", time)
    refuse_blank_filter("--from-date", from_date)
    refuse_blank_filter("--to-date", to_date)
    for position, term in enumerate(accounts or [], start=1):
        # A positional has no flag to drop: "drop accounts" named the Typer
        # parameter, which no user can type (w5/305).
        if not term.strip():
            raise UsageError(f"ACCOUNT argument {position} is empty; remove it, or pass an account name or substring.")
    # The terms checked are the terms matched: `" Assets:Cash"` matched no account (w5/626).
    accounts = [strip_padding(term) for term in accounts] if accounts else accounts
    ctx = context.current()
    file = ctx.entry_file()
    argv: list[str]
    if kind == "balances":
        argv = ["balance", "--file", str(file)]
    else:
        argv = ["report", "--file", str(file), "--kind", kind]
        if account is not None:
            argv += ["--account", account]
        if interval is not None:
            argv += ["--interval", interval.value]
        if group_by is not None:
            argv += ["--group-by", group_by.value]
    if conversion is not None:
        argv += ["--conversion", conversion]
    if time is not None:
        argv += ["--time", time]
    if from_date is not None:
        argv += ["--from-date", from_date]
    if to_date is not None:
        argv += ["--to-date", to_date]
    if allow_errors or not ctx.strict_reads():
        argv.append("--allow-errors")
    if kind == "balances" and accounts:
        # Terms last and after `--`: a term the user passed after `--`
        # (`-Balances`, `-f other.bean`) reached the engine as its own option,
        # failing the call or reporting another ledger (w5/503).
        argv += ["--", *accounts]

    data = launch.helper_json(argv)
    output.render_ledger_errors([str(error) for error in data.get("ledger_errors", [])], allow=True)
    return file, data


def _precision(data: dict[str, Any]) -> dict[str, int]:
    raw = data.get("display_precision") or {}
    return {str(currency): int(digits) for currency, digits in raw.items()}


def _emit_json(file: Any, data: dict[str, Any]) -> None:
    payload = {key: value for key, value in data.items() if key != "display_precision"}
    output.emit(payload, target=output.file_target(file))


@report_app.command("overview", cls=SingleValueCommand)
def overview(
    conversion: ConversionOpt = None,
    time: TimeOpt = None,
    account: AccountOpt = None,
    interval: IntervalOpt = ReportInterval.monthly,
    allow_errors: AllowErrorsOpt = False,
) -> None:
    """Assets, liabilities, income, expenses, and net worth."""
    file, data = _ask(
        "overview", conversion=conversion, time=time, account=account, interval=interval, allow_errors=allow_errors
    )
    if context.current().json_output:
        _emit_json(file, data)
        return
    conversion = str(data["conversion"])
    _heading("Financial Overview", data)
    precision = _precision(data)
    for title, balance in data["totals"].items():
        typer.echo(f"  {title.replace('_', ' ').title() + ':':<16} {_amounts(balance, conversion, precision)}")
    typer.echo(f"\n{data['interval'].title()} breakdown")
    # Join flow and balance series by their valuation date. The balance series
    # span the whole filtered period; a flow series stops one bucket earlier
    # when the filter clipped the last interval into a quiet fragment, so the
    # dates are the union and a missing cell renders empty.
    by_date = {name: {point["date"]: point["balance"] for point in series} for name, series in data["series"].items()}
    dates = sorted({date for series in by_date.values() for date in series})
    output.table(
        ["DATE", "ASSETS", "LIABILITIES", "INCOME (CREDIT)", "EXPENSES"],
        [
            [
                str(date),
                *(
                    _amounts(by_date[name].get(date, {}), conversion, precision)
                    for name in ("assets", "liabilities", "income", "expenses")
                ),
            ]
            for date in dates
        ],
    )


@report_app.command("income-statement", cls=SingleValueCommand)
def income_statement(
    conversion: ConversionOpt = None,
    time: TimeOpt = None,
    account: AccountOpt = None,
    interval: IntervalOpt = ReportInterval.monthly,
    allow_errors: AllowErrorsOpt = False,
) -> None:
    """Income, expenses, and profit by interval."""
    file, data = _ask(
        "income-statement",
        conversion=conversion,
        time=time,
        account=account,
        interval=interval,
        allow_errors=allow_errors,
    )
    if context.current().json_output:
        _emit_json(file, data)
        return
    conversion = str(data["conversion"])
    _heading("Income Statement", data, profit_line=True)
    precision = _precision(data)
    for tree in (data["income"], data["expenses"]):
        if tree is None:
            continue
        typer.echo("")
        _print_tree(tree, conversion=conversion, precision=precision)
    typer.echo(f"\nNet Profit: {_amounts(data['net_profit'], conversion, precision)}")
    typer.echo(f"\n{data['interval'].title()} breakdown")
    output.table(
        ["PERIOD END", "INCOME", "EXPENSES", "NET PROFIT"],
        [
            [
                str(period["date"]),
                _amounts(period["income"], conversion, precision),
                _amounts(period["expenses"], conversion, precision),
                _amounts(period["net_profit"], conversion, precision),
            ]
            for period in data["periods"]
        ],
    )


@report_app.command("balance-sheet", cls=SingleValueCommand)
def balance_sheet(
    conversion: ConversionOpt = None,
    time: TimeOpt = None,
    account: AccountOpt = None,
    interval: IntervalOpt = ReportInterval.monthly,
    allow_errors: AllowErrorsOpt = False,
) -> None:
    """Assets, liabilities, and equity.

    Includes current earnings and valuation adjustments.
    """
    file, data = _ask(
        "balance-sheet",
        conversion=conversion,
        time=time,
        account=account,
        interval=interval,
        allow_errors=allow_errors,
    )
    if context.current().json_output:
        _emit_json(file, data)
        return
    conversion = str(data["conversion"])
    _heading("Balance Sheet", data)
    precision = _precision(data)
    for tree in (data["assets"], data["liabilities"], data["equity"]):
        if tree is None:
            continue
        typer.echo("")
        _print_tree(tree, conversion=conversion, precision=precision)
    earnings = _amounts(data["current_earnings"], conversion, precision)
    typer.echo(f"  {'Current-period earnings (credit):':<46}  {earnings}")
    if data.get("equity_reconciled"):
        adjustment = _amounts(data["valuation_adjustment"] or {}, conversion, precision)
        typer.echo(f"  {'Valuation/translation adjustment (credit):':<46}  {adjustment}")
        equity_total = _amounts(data["equity_total"] or {}, conversion, precision)
        typer.echo(f"  {'Total equity (credit):':<46}  {equity_total}")
    # The credit lines above carry the opposite sign to the income statement's
    # Net Profit, which is the same quantity. Say so, and say what it equals.
    profit = _amounts(data["net_profit"], conversion, precision)
    typer.echo(f"\nCredit lines above are negative for a gain; the same period's Net Profit is {profit}.")
    typer.echo(f"Net Worth: {_amounts(data['net_worth'], conversion, precision)}")
    typer.echo(f"\n{str(data['interval']).title()} net worth")
    output.table(
        ["DATE", "NET WORTH"],
        [[str(point["date"]), _amounts(point["balance"], conversion, precision)] for point in data["net_worth_series"]],
    )


@report_app.command("trial-balance", cls=SingleValueCommand)
def trial_balance(
    conversion: ConversionOpt = None,
    time: TimeOpt = None,
    account: AccountOpt = None,
    allow_errors: AllowErrorsOpt = False,
) -> None:
    """All five account types, with signed balances."""
    file, data = _ask("trial-balance", conversion=conversion, time=time, account=account, allow_errors=allow_errors)
    if context.current().json_output:
        _emit_json(file, data)
        return
    conversion = str(data["conversion"])
    _heading("Trial Balance", data)
    precision = _precision(data)
    for name in ("assets", "liabilities", "equity", "income", "expenses"):
        tree = data[name]
        if tree is None:
            continue
        typer.echo("")
        _print_tree(tree, conversion=conversion, precision=precision)


@report_app.command("holdings", cls=SingleValueCommand)
def holdings(
    conversion: ConversionOpt = None,
    time: TimeOpt = None,
    account: AccountOpt = None,
    group_by: GroupByOpt = HoldingsGrouping.account,
    allow_errors: AllowErrorsOpt = False,
) -> None:
    """What the ledger holds: units, cost, and market value."""
    file, data = _ask(
        "holdings",
        conversion=conversion,
        time=time,
        account=account,
        group_by=group_by,
        allow_errors=allow_errors,
    )
    if context.current().json_output:
        _emit_json(file, data)
        return
    conversion = str(data["conversion"])
    _heading("Holdings", data)
    precision = _precision(data)
    groups = data["groups"]
    if not groups:
        typer.echo("No holdings.")
        return
    by_account = data["group_by"] == "account"
    headers = ["ACCOUNT" if by_account else "ACCOUNTS", "COMMODITY", "UNITS", "AVG COST", "COST BASIS", "MARKET VALUE"]
    output.table(
        headers,
        [
            [
                group["account"] if by_account else ", ".join(group["accounts"]),
                group["commodity"],
                _money(group["units"], conversion, precision),
                _money(group["average_cost"], conversion, precision),
                _money(group["cost_basis"], conversion, precision),
                _valued(group["market_value"], group, conversion, precision),
            ]
            for group in groups
        ],
    )
    totals = data["totals"]
    typer.echo("")
    typer.echo(f"  {'Cost basis:':<16} {_amounts(totals['cost_basis'], conversion, precision)}")
    typer.echo(f"  {'Market value:':<16} {_amounts(totals['market_value'], conversion, precision)}")


@report_app.command("register", cls=SingleValueCommand)
def register(
    account: Annotated[str, typer.Argument(help="Account to list; names the register's subtree")],
    conversion: ConversionOpt = None,
    time: TimeOpt = None,
    allow_errors: AllowErrorsOpt = False,
) -> None:
    """Dated postings with a running balance for one account."""
    if not account.strip():
        raise UsageError("ACCOUNT argument is empty; pass the account to list, such as Assets:Checking.")
    file, data = _ask("register", conversion=conversion, time=time, account=account, allow_errors=allow_errors)
    if context.current().json_output:
        _emit_json(file, data)
        return
    conversion = str(data["conversion"])
    _heading("Register", data)
    precision = _precision(data)
    rows = data["rows"]
    if not rows:
        typer.echo("No entries.")
        return
    show_account = len({row["account"] for row in rows}) > 1
    headers = ["DATE", *(["ACCOUNT"] if show_account else []), "DESCRIPTION", "AMOUNT", "COST", "BALANCE"]
    output.table(
        headers,
        [_row_cells(row, conversion, precision, show_account) for row in rows],
    )


def _row_cells(row: dict[str, Any], conversion: str, precision: Mapping[str, int], show_account: bool) -> list[str]:
    """One register row's cells; the account column appears only across accounts."""
    if row["entry"] == "balance":
        description = "Balance check"
    else:
        description = " ".join(part for part in (row["payee"], row["narration"]) if part)
    cost = row["cost"]
    cost_cell = ""
    if cost is not None:
        cost_cell = _money(cost, conversion, precision)
        if cost["date"]:
            cost_cell += f" ({cost['date']})"
    cells = [str(row["date"])]
    if show_account:
        cells.append(row["account"])
    cells += [
        description,
        _money(row["amount"], conversion, precision),
        cost_cell,
        _amounts(row["balance"], conversion, precision),
    ]
    return cells


@report_app.command("capital-gains", cls=SingleValueCommand)
def capital_gains(
    time: TimeOpt = None,
    account: AccountOpt = None,
    from_date: FromDateOpt = None,
    to_date: ToDateOpt = None,
    allow_errors: AllowErrorsOpt = False,
) -> None:
    """Realized gain and loss per sale lot."""
    file, data = _ask(
        "capital-gains",
        conversion=None,
        time=time,
        account=account,
        from_date=from_date,
        to_date=to_date,
        allow_errors=allow_errors,
    )
    if context.current().json_output:
        _emit_json(file, data)
        return
    conversion = str(data["conversion"])
    _heading("Capital Gains", data)
    precision = _precision(data)
    rows = data["rows"]
    if not rows:
        typer.echo("No sales.")
        return
    output.table(
        ["SOLD", "ACCOUNT", "COMMODITY", "ACQUIRED", "HELD", "QTY", "PROCEEDS", "BASIS", "GAIN"],
        [
            [
                str(row["sold"]),
                row["account"],
                row["commodity"],
                "" if row["acquired"] is None else str(row["acquired"]),
                _held(row),
                _money(row["quantity"], conversion, precision),
                _money(row["proceeds"], conversion, precision),
                _money(row["basis"], conversion, precision),
                _money(row["gain"], conversion, precision),
            ]
            for row in rows
        ],
    )
    totals = data["totals"]
    typer.echo("")
    typer.echo(f"  {'One year or less:':<20} {_amounts(totals['one_year_or_less'], conversion, precision)}")
    typer.echo(f"  {'More than one year:':<20} {_amounts(totals['more_than_one_year'], conversion, precision)}")
    if totals["holding_unknown"]:
        typer.echo(f"  {'Holding unknown:':<20} {_amounts(totals['holding_unknown'], conversion, precision)}")


def _held(row: dict[str, Any]) -> str:
    """Holding period as days with its one-year bucket; unknown when undated."""
    if row["held_days"] is None:
        return "unknown"
    return f"{row['held_days']} days ({'long' if row['long_held'] else 'short'})"


@report_app.command("cash-flow", cls=SingleValueCommand)
def cash_flow(
    time: TimeOpt = None,
    account: CashFlowAccountOpt = None,
    from_date: CashFlowFromOpt = None,
    to_date: CashFlowToOpt = None,
    allow_errors: AllowErrorsOpt = False,
) -> None:
    """Operating, investing, and financing flows."""
    file, data = _ask(
        "cash-flow",
        conversion=None,
        time=time,
        account=account,
        from_date=from_date,
        to_date=to_date,
        allow_errors=allow_errors,
    )
    if context.current().json_output:
        _emit_json(file, data)
        return
    conversion = str(data["conversion"])
    _heading(
        "Cash Flow",
        data,
        convention="Row amounts are cash impact (positive for an inflow); "
        "opening/closing balances use Beancount signs (credits negative)",
    )
    precision = _precision(data)
    sections = data["sections"]
    activities = ("operating", "investing", "financing")
    if not any(sections[activity] for activity in activities):
        typer.echo("No cash flows in this period.")
    for activity in activities:
        rows = sections[activity]
        if not rows:
            continue
        typer.echo("")
        typer.echo(activity.title())
        output.table(
            ["ACCOUNT", "AMOUNT"],
            [[row["account"], _amounts(row["amounts"], conversion, precision)] for row in rows],
        )
    totals = data["totals"]
    typer.echo("")
    for activity in activities:
        if sections[activity]:
            typer.echo(f"  {f'Total {activity}:':<20} {_amounts(totals[activity], conversion, precision)}")
    typer.echo(f"  {'Net change in cash:':<20} {_amounts(data['net_change'], conversion, precision)}")
    typer.echo(f"  {'Opening cash:':<20} {_amounts(data['opening'], conversion, precision)}")
    typer.echo(f"  {'Closing cash:':<20} {_amounts(data['closing'], conversion, precision)}")
    cash_accounts = [entry["account"] for entry in data["cash_accounts"]]
    if cash_accounts:
        typer.echo(f"\nCash accounts: {', '.join(cash_accounts)}")
    for invalid in data["invalid_role_values"]:
        output.note(f"{invalid['account']}: unknown cash-flow-role value {invalid['value']!r}; using the default.")


def balance(
    accounts: Annotated[list[str] | None, typer.Argument(help="Account substrings; case-insensitive")] = None,
    conversion: ConversionOpt = None,
    time: TimeOpt = None,
    allow_errors: AllowErrorsOpt = False,
) -> None:
    """Balances for matching accounts.

    With no filter, prints the trial balance.
    """
    file, data = _ask("balances", conversion=conversion, time=time, accounts=accounts, allow_errors=allow_errors)
    if context.current().json_output:
        _emit_json(file, data)
        return
    conversion = str(data["conversion"])
    _heading("Trial Balance", data)
    precision = _precision(data)
    trees = [data[name] for name in ("assets", "liabilities", "equity", "income", "expenses")]
    # `_heading` already said "No accounts match …" from `account_filter_empty`.
    for tree in trees:
        if tree is not None:
            typer.echo("")
            _print_tree(tree, conversion=conversion, precision=precision)
