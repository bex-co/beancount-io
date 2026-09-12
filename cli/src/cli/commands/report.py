"""Financial reports with explicit periods, accounting signs, and valuation.

Computation runs in `bea-engine` (`report` / `balance`); this module is the
option surface and the human/JSON rendering. Amounts arrive as strings, dates
as ISO, and trees as ordinary dicts — nothing here imports Beancount or Fava.
"""

from __future__ import annotations

from collections.abc import Mapping
from decimal import ROUND_HALF_UP, Decimal, localcontext
from enum import StrEnum
from typing import Annotated, Any

import typer

from cli import context, output
from cli.engine import launch

report_app = typer.Typer(help="Financial reports from a local ledger", no_args_is_help=True, rich_markup_mode=None)


class ReportInterval(StrEnum):
    monthly = "monthly"
    quarterly = "quarterly"
    yearly = "yearly"
    weekly = "weekly"
    daily = "daily"


ConversionOpt = Annotated[
    str | None,
    typer.Option("--conversion", "-x", help="Currency; defaults to the single operating currency, otherwise units"),
]
TimeOpt = Annotated[
    str | None, typer.Option("--time", "-t", help='Time filter: year, month, 2026, 2026-08, or "2026-01 - 2026-06"')
]
AccountOpt = Annotated[
    str | None, typer.Option("--account", "-a", help="Account filter: a parent account or a regular expression")
]
IntervalOpt = Annotated[ReportInterval, typer.Option("--interval", "-i", help="Reporting interval")]
AllowErrorsOpt = Annotated[
    bool,
    typer.Option(
        "--allow-errors",
        help="Show partial data with errors on stderr; opts strict reads into partial answers",
    ),
]


def _quantize(number: Decimal, currency: str, precision: Mapping[str, int] | None) -> Decimal:
    """Round a text-report amount to the currency's display precision, half up.

    The precision is the finest the ledger itself uses for the currency
    (honoring `option "display_precision"`); money rounds half up, the way a
    person reading a total expects. Maximum, not most-common: a ledger of
    whole dollars with one cents purchase keeps its cents, while a converted
    `4.9050` still caps at the two decimals the ledger uses. A commodity the
    ledger never wrote has no precision to infer, so it keeps its own
    exponent. JSON is untouched: it keeps the full-precision decimal string.
    """
    if precision is None or currency not in precision:
        return number
    fractional = precision[currency]
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
        return f"{shown:,.{max(2, -int(shown.as_tuple().exponent))}f} {currency}"

    return "  ".join(render(currency, number) for currency, number in sorted(balance.items())) or (
        f"0.00 {conversion}" if conversion and conversion not in {"units", "at_cost", "at_value"} else "—"
    )


def _negated(balance: Mapping[str, Any]) -> dict[str, Decimal | None]:
    """The same balance in the opposite sign convention, for translating a credit."""
    result: dict[str, Decimal | None] = {}
    for currency, number in balance.items():
        value = _as_decimal(number)
        result[currency] = None if value is None else -value
    return result


def _print_tree(
    node: dict[str, Any],
    depth: int = 0,
    *,
    conversion: str | None = None,
    precision: Mapping[str, int] | None = None,
) -> None:
    label = node["account"].rsplit(":", 1)[-1] if depth else node["account"]
    typer.echo(f"  {'  ' * depth + label:<46}  {_amounts(node['balance_children'], conversion, precision)}")
    for child in node["children"]:
        _print_tree(child, depth + 1, conversion=conversion, precision=precision)


def _heading(title: str, metadata: dict[str, Any], *, profit_line: bool = False) -> None:
    period = metadata["period"]
    dates = f"{period['start']} through {metadata['as_of']}" if period["start"] else "no dated activity"
    typer.echo(f"{title} — {dates}")
    typer.echo(f"Valuation: {metadata['conversion']}; account: {metadata['account_filter'] or 'all'}")
    # Only reports that print an explicit profit figure may promise its sign;
    # the balance sheet's earnings line carries the opposite (credit) sign and
    # explains itself where it is printed.
    convention = "Account balances use Beancount signs (credits negative)"
    typer.echo(f"{convention}; profit is positive for a gain." if profit_line else f"{convention}.")
    if metadata["missing_prices"]:
        typer.echo("Partial valuation: some prices are missing; combined totals are unavailable.")
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
    allow_errors: bool,
) -> tuple[Any, dict[str, Any]]:
    """Ask the engine for one report payload and surface tolerated load errors."""
    ctx = context.current()
    file = ctx.entry_file()
    argv: list[str]
    if kind == "balances":
        argv = ["balance", "--file", str(file)]
        for term in accounts or []:
            argv.append(term)
    else:
        argv = ["report", "--file", str(file), "--kind", kind]
        if account is not None:
            argv += ["--account", account]
        if interval is not None:
            argv += ["--interval", interval.value]
    if conversion is not None:
        argv += ["--conversion", conversion]
    if time is not None:
        argv += ["--time", time]
    if allow_errors or not ctx.strict_reads():
        argv.append("--allow-errors")

    data = launch.helper_json(argv)
    output.render_ledger_errors([str(error) for error in data.get("ledger_errors", [])], allow=True)
    return file, data


def _precision(data: dict[str, Any]) -> dict[str, int]:
    raw = data.get("display_precision") or {}
    return {str(currency): int(digits) for currency, digits in raw.items()}


def _emit_json(file: Any, data: dict[str, Any]) -> None:
    payload = {key: value for key, value in data.items() if key != "display_precision"}
    output.emit(payload, target=output.file_target(file))


@report_app.command("overview")
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
    # Join flow and balance series by their valuation date.
    assets_by_date = {point["date"]: point["balance"] for point in data["series"]["assets"]}
    liabilities_by_date = {point["date"]: point["balance"] for point in data["series"]["liabilities"]}
    output.table(
        ["DATE", "ASSETS", "LIABILITIES", "INCOME (CREDIT)", "EXPENSES"],
        [
            [
                str(flow["date"]),
                _amounts(assets_by_date.get(flow["date"], {}), conversion, precision),
                _amounts(liabilities_by_date.get(flow["date"], {}), conversion, precision),
                _amounts(flow["balance"], conversion, precision),
                _amounts(expense["balance"], conversion, precision),
            ]
            for flow, expense in zip(data["series"]["income"], data["series"]["expenses"], strict=True)
        ],
    )


@report_app.command("income-statement")
def income_statement(
    conversion: ConversionOpt = None,
    time: TimeOpt = None,
    account: AccountOpt = None,
    interval: IntervalOpt = ReportInterval.monthly,
    allow_errors: AllowErrorsOpt = False,
) -> None:
    """Income, expenses, and profit, with an interval breakdown."""
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


@report_app.command("balance-sheet")
def balance_sheet(
    conversion: ConversionOpt = None,
    time: TimeOpt = None,
    account: AccountOpt = None,
    interval: IntervalOpt = ReportInterval.monthly,
    allow_errors: AllowErrorsOpt = False,
) -> None:
    """Assets, liabilities, and equity including current earnings and valuation adjustments."""
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
    profit = _amounts(_negated(data["current_earnings"]), conversion, precision)
    typer.echo(f"\nCredit lines above are negative for a gain; the same period's Net Profit is {profit}.")
    typer.echo(f"Net Worth: {_amounts(data['net_worth'], conversion, precision)}")
    typer.echo(f"\n{str(data['interval']).title()} net worth")
    output.table(
        ["DATE", "NET WORTH"],
        [[str(point["date"]), _amounts(point["balance"], conversion, precision)] for point in data["net_worth_series"]],
    )


@report_app.command("trial-balance")
def trial_balance(
    conversion: ConversionOpt = None,
    time: TimeOpt = None,
    account: AccountOpt = None,
    allow_errors: AllowErrorsOpt = False,
) -> None:
    """All five account types, retaining signed ledger balances."""
    file, data = _ask("trial-balance", conversion=conversion, time=time, account=account, allow_errors=allow_errors)
    if context.current().json_output:
        _emit_json(file, data)
        return
    conversion = str(data["conversion"])
    _heading("Trial Balance", data)
    precision = _precision(data)
    for name in ("assets", "liabilities", "equity", "income", "expenses"):
        typer.echo("")
        _print_tree(data[name], conversion=conversion, precision=precision)


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
    if not any(trees):
        output.note(f"No accounts match {' '.join(accounts or [])}.")
        return
    for tree in trees:
        if tree is not None:
            typer.echo("")
            _print_tree(tree, conversion=conversion, precision=precision)
