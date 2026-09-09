"""Financial reports with explicit periods, accounting signs, and valuation."""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal, localcontext
from enum import StrEnum
from pathlib import Path
from typing import TYPE_CHECKING, Annotated, Any

import typer

from cli import context, output
from cli.errors import LedgerError, UsageError

if TYPE_CHECKING:
    from fava.core.inventory import SimpleCounterInventory
    from fava.core.tree import SerialisedTreeNode
    from fava.ledger import FilteredLedger
    from fava.modules.chart import DateAndBalance, DateAndBalanceWithAccountBalance
    from fava.util.date import Interval


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
AccountOpt = Annotated[str | None, typer.Option("--account", "-a", help="Account filter (substring)")]
IntervalOpt = Annotated[ReportInterval, typer.Option("--interval", "-i", help="Reporting interval")]
AllowErrorsOpt = Annotated[
    bool,
    typer.Option(
        "--allow-errors",
        help="Show partial data with errors on stderr; opts strict reads into partial answers",
    ),
]


def _quantize(number: Decimal, currency: str, dcontext: Any | None) -> Decimal:
    """Round a text-report amount to the currency's display precision, half up.

    The precision is the finest the ledger itself uses for the currency
    (honoring `option "display_precision"`); money rounds half up, the way a
    person reading a total expects. Maximum, not most-common: a ledger of
    whole dollars with one cents purchase keeps its cents, while a converted
    `4.9050` still caps at the two decimals the ledger uses. A commodity the
    ledger never wrote has no precision to infer, so it keeps its own
    exponent. JSON is untouched: it keeps the full-precision decimal string.
    """
    if dcontext is None:
        return number
    ccontext = getattr(dcontext, "ccontexts", {}).get(currency)
    if ccontext is None:
        return number
    from beancount.core.display_context import Precision

    fractional = ccontext.get_fractional(Precision.MAXIMUM)
    if fractional is None:
        return number
    with localcontext() as ctx:
        ctx.prec = max(ctx.prec, len(number.as_tuple().digits) + fractional)
        return number.quantize(Decimal(1).scaleb(-fractional), rounding=ROUND_HALF_UP)


def _amounts(balance: Mapping[str, Decimal | None], conversion: str | None = None, dcontext: Any | None = None) -> str:
    def render(currency: str, number: Decimal | None) -> str:
        if number is None:
            return f"Unavailable {currency}"
        shown = _quantize(number, currency, dcontext)
        return f"{shown:,.{max(2, -int(shown.as_tuple().exponent))}f} {currency}"

    return "  ".join(render(currency, number) for currency, number in sorted(balance.items())) or (
        f"0.00 {conversion}" if conversion and conversion not in {"units", "at_cost", "at_value"} else "—"
    )


def _tree_json(node: SerialisedTreeNode) -> dict[str, Any]:
    return {
        "account": node.account,
        "balance": output.jsonable(node.balance),
        "balance_children": output.jsonable(node.balance_children),
        "has_txns": node.has_txns,
        "children": [_tree_json(child) for child in node.children],
    }


def _print_tree(
    node: SerialisedTreeNode, depth: int = 0, *, conversion: str | None = None, dcontext: Any | None = None
) -> None:
    label = node.account.rsplit(":", 1)[-1] if depth else node.account
    typer.echo(f"  {'  ' * depth + label:<46}  {_amounts(node.balance_children, conversion, dcontext)}")
    for child in node.children:
        _print_tree(child, depth + 1, conversion=conversion, dcontext=dcontext)


def _tree_balances(node: SerialisedTreeNode) -> Iterable[Mapping[str, Decimal]]:
    yield node.balance
    for child in node.children:
        yield from _tree_balances(child)


def _series_json(series: Iterable[DateAndBalance | DateAndBalanceWithAccountBalance]) -> list[dict[str, Any]]:
    return [{"date": point.date.isoformat(), "balance": output.jsonable(point.balance)} for point in series]


def _sum(*balances: Mapping[str, Decimal]) -> SimpleCounterInventory:
    from fava.core.inventory import SimpleCounterInventory

    result = SimpleCounterInventory()
    for balance in balances:
        for currency, amount in balance.items():
            result.add(currency, amount)
    return result


def _summary(balance: Mapping[str, Decimal], conversion: str, *, incomplete: bool = False) -> dict[str, Decimal | None]:
    if conversion in {"units", "at_cost", "at_value"}:
        return dict(balance.items())
    return {conversion: None if incomplete else balance.get(conversion, Decimal(0))}


def _load(
    account: str | None, time: str | None, conversion: str | None, allow_errors: bool
) -> tuple[FilteredLedger, Path, str]:
    file = context.current().entry_file()
    from fava.core.filters import FilterError
    from fava.core.loader import load_file
    from fava.ledger import FavaLedger

    entries, errors, options = load_file(file)
    output.render_ledger_errors(list(errors), allow=allow_errors)
    ledger = FavaLedger(entries, errors, options)
    try:
        filtered = ledger.get_filtered(account=account, time=time)
    except (ValueError, OverflowError, FilterError) as exc:
        raise UsageError(
            f"Invalid time filter {time!r}. Use month, year, YYYY, YYYY-MM, "
            f"or a date range such as '2026-01 - 2026-06'. {exc}"
        ) from exc
    currencies = options["operating_currency"]
    return filtered, file, conversion or (currencies[0] if len(currencies) == 1 else "units")


def _interval(value: ReportInterval) -> Interval:
    from fava.util.date import INTERVALS

    return INTERVALS[value.value]


def _metadata(filtered: FilteredLedger, conversion: str, interval: ReportInterval | None = None) -> dict[str, Any]:
    from fava.beans.abc import Price, Transaction

    start: date | None
    end: date | None
    if filtered.date_range:
        start, end = filtered.date_range.begin, filtered.date_range.end
    else:
        dates = [entry.date for entry in filtered.entries if isinstance(entry, Transaction | Price)]
        start = min(dates) if dates else None
        end = max(dates) + timedelta(days=1) if dates else None
    data: dict[str, Any] = {
        "conversion": conversion,
        "period": {"start": start, "end_exclusive": end},
        "as_of": end - timedelta(days=1) if end else None,
        "account_filter": filtered.account,
        "balance_signs": "beancount",
        "ledger_valid": not filtered.ledger.load_errors,
        "ledger_errors": [output.format_ledger_error(error) for error in filtered.ledger.load_errors],
    }
    if interval:
        data["interval"] = interval.value
    return data


def _price_summary_lines(
    missing: list[str], dated: list[dict[str, Any]], conversion: str, prices: Any | None
) -> list[str]:
    """One line per unconverted commodity: never one line per interval date."""
    lines = []
    for currency in missing:
        if prices is not None:
            all_prices = prices.get_all_prices((currency, conversion))
            if not all_prices:
                lines.append(f"{currency} has no {conversion} price at any date; shown in units")
                continue
            earliest = min(point[0] for point in all_prices)
            lines.append(f"{currency} → {conversion} has no price before {earliest}; earlier rows shown in {currency}")
            continue
        dates = [item["date"] for item in dated if item["from"] == currency and item["date"]]
        if dates:
            lines.append(
                f"{currency} → {conversion} has no price before {min(dates)}; earlier rows shown in {currency}"
            )
        else:
            lines.append(f"{currency} has no {conversion} price at any date; shown in units")
    return lines


def _valuation(
    conversion: str,
    balances: Iterable[tuple[date | None, Mapping[str, Decimal]]],
    allow_errors: bool,
    prices: Any | None = None,
) -> dict[str, Any]:
    missing_dates = {
        (currency, when)
        for when, balance in balances
        for currency, amount in balance.items()
        if amount and currency != conversion and conversion not in {"units", "at_cost", "at_value"}
    }
    missing = sorted({currency for currency, _ in missing_dates})
    pairs = [{"from": currency, "to": conversion} for currency in missing]
    dated = [
        {"from": currency, "to": conversion, "date": when}
        for currency, when in sorted(missing_dates, key=lambda item: (item[1] or date.min, item[0]))
    ]
    summary = _price_summary_lines(missing, dated, conversion, prices)
    if pairs and not allow_errors and context.current().strict_reads():
        raise LedgerError(
            f"Missing prices for {', '.join(missing)} → {conversion}. "
            "Each report row uses its own valuation date. Add prices covering the dates below "
            "or pass --allow-errors for partial balances.",
            details=summary,
            result={"missing_prices": pairs, "missing_price_dates": dated},
        )
    return {
        "valuation": "partial" if pairs else "complete",
        "missing_prices": pairs,
        "missing_price_dates": dated,
        "missing_price_summary": summary,
    }


def _heading(title: str, metadata: dict[str, Any]) -> None:
    period = metadata["period"]
    dates = f"{period['start']} through {metadata['as_of']}" if period["start"] else "no dated activity"
    typer.echo(f"{title} — {dates}")
    typer.echo(f"Valuation: {metadata['conversion']}; account: {metadata['account_filter'] or 'all'}")
    typer.echo("Account balances use Beancount signs (credits negative); profit is positive for a gain.")
    if metadata["missing_prices"]:
        typer.echo("Partial valuation: some prices are missing; combined totals are unavailable.")
        for line in metadata["missing_price_summary"]:
            output.note(line)


@report_app.command("overview")
def overview(
    conversion: ConversionOpt = None,
    time: TimeOpt = None,
    account: AccountOpt = None,
    interval: IntervalOpt = ReportInterval.monthly,
    allow_errors: AllowErrorsOpt = False,
) -> None:
    """Assets, liabilities, income, expenses, and net worth."""
    from fava.modules.financial_statements import FinancialStatementsModule

    filtered, file, conversion = _load(account, time, conversion, allow_errors)
    data = FinancialStatementsModule().overview(filtered, _interval(interval), conversion)
    trees = (data.assets_hierarchy, data.liabilities_hierarchy, data.income_hierarchy, data.expenses_hierarchy)
    balances = [(filtered.end_date, balance) for tree in trees for balance in _tree_balances(tree)]
    for series in (data.assets_data, data.liabilities_data, data.income_interval_data, data.expenses_interval_data):
        balances.extend((point.date, point.balance) for point in series)
    valuation = _valuation(conversion, balances, allow_errors, filtered.ledger.prices)
    metadata = _metadata(filtered, conversion, interval) | valuation
    assets, liabilities, income, expenses = (tree.balance_children for tree in trees)
    worth = _summary(_sum(assets, liabilities), conversion, incomplete=bool(valuation["missing_prices"]))
    totals: dict[str, Mapping[str, Decimal | None]] = {
        "assets": assets,
        "liabilities": liabilities,
        "income": income,
        "expenses": expenses,
        "net_worth": worth,
    }
    if context.current().json_output:
        output.emit(
            metadata
            | {
                "totals": totals,
                "series": {
                    "assets": _series_json(data.assets_data),
                    "liabilities": _series_json(data.liabilities_data),
                    "income": _series_json(data.income_interval_data),
                    "expenses": _series_json(data.expenses_interval_data),
                },
            },
            target=output.file_target(file),
        )
        return
    _heading("Financial Overview", metadata)
    dcontext = filtered.ledger.options["dcontext"]
    for title, balance in totals.items():
        typer.echo(f"  {title.replace('_', ' ').title() + ':':<16} {_amounts(balance, conversion, dcontext)}")
    typer.echo(f"\n{interval.value.title()} breakdown")
    # Flow series are capped at the 100 most recent intervals while balance
    # series cover every interval, so rows join on the interval date rather
    # than zipping positions that no longer line up on a long ledger.
    assets_by_date = {point.date: point.balance for point in data.assets_data}
    liabilities_by_date = {point.date: point.balance for point in data.liabilities_data}
    output.table(
        ["DATE", "ASSETS", "LIABILITIES", "INCOME (CREDIT)", "EXPENSES"],
        [
            [
                str(flow.date),
                _amounts(assets_by_date.get(flow.date, {}), conversion, dcontext),
                _amounts(liabilities_by_date.get(flow.date, {}), conversion, dcontext),
                _amounts(flow.balance, conversion, dcontext),
                _amounts(expense.balance, conversion, dcontext),
            ]
            for flow, expense in zip(data.income_interval_data, data.expenses_interval_data, strict=True)
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
    from fava.modules.financial_statements import FinancialStatementsModule

    filtered, file, conversion = _load(account, time, conversion, allow_errors)
    data = FinancialStatementsModule().income_statement(filtered, _interval(interval), conversion)
    trees = (data.income_hierarchy, data.expenses_hierarchy)
    balances = [(filtered.end_date, balance) for tree in trees for balance in _tree_balances(tree)]
    for series in (data.income_data, data.expenses_data):
        balances.extend((point.date, point.balance) for point in series)
    valuation = _valuation(conversion, balances, allow_errors, filtered.ledger.prices)
    metadata = _metadata(filtered, conversion, interval) | valuation
    net = _summary(
        -_sum(*(tree.balance_children for tree in trees)), conversion, incomplete=bool(valuation["missing_prices"])
    )
    periods: list[dict[str, Any]] = [
        {
            "date": profit.date,
            "income": income.balance,
            "expenses": expenses.balance,
            "net_profit": _summary(
                -profit.balance,
                conversion,
                incomplete=bool(
                    _valuation(conversion, [(income.date, income.balance), (expenses.date, expenses.balance)], True)[
                        "missing_prices"
                    ]
                ),
            ),
        }
        for income, expenses, profit in zip(data.income_data, data.expenses_data, data.net_profit_data, strict=True)
    ]
    if context.current().json_output:
        output.emit(
            metadata
            | {"net_profit_signs": "positive_for_gain"}
            | {"income": _tree_json(trees[0]), "expenses": _tree_json(trees[1]), "net_profit": net, "periods": periods},
            target=output.file_target(file),
        )
        return
    _heading("Income Statement", metadata)
    dcontext = filtered.ledger.options["dcontext"]
    for tree in trees:
        typer.echo("")
        _print_tree(tree, conversion=conversion, dcontext=dcontext)
    typer.echo(f"\nNet Profit: {_amounts(net, conversion, dcontext)}")
    typer.echo(f"\n{interval.value.title()} breakdown")
    output.table(
        ["PERIOD END", "INCOME", "EXPENSES", "NET PROFIT"],
        [
            [
                str(period["date"]),
                _amounts(period["income"], conversion, dcontext),
                _amounts(period["expenses"], conversion, dcontext),
                _amounts(period["net_profit"], conversion, dcontext),
            ]
            for period in periods
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
    from fava.modules.financial_statements import FinancialStatementsModule

    filtered, file, conversion = _load(account, time, conversion, allow_errors)
    data = FinancialStatementsModule().balance_sheet(filtered, _interval(interval), conversion)
    trees = (data.assets_hierarchy, data.liabilities_hierarchy, data.equity_hierarchy)
    balances = [(filtered.end_date, balance) for tree in trees for balance in _tree_balances(tree)]
    balances.append((filtered.end_date, data.current_earnings))
    balances.extend((point.date, point.balance) for point in data.net_worth_data)
    valuation = _valuation(conversion, balances, allow_errors, filtered.ledger.prices)
    metadata = _metadata(filtered, conversion, interval) | valuation
    incomplete = bool(valuation["missing_prices"])
    worth = _summary(_sum(trees[0].balance_children, trees[1].balance_children), conversion, incomplete=incomplete)
    reconciled = not incomplete and not filtered.ledger.load_errors and conversion != "units"
    if context.current().json_output:
        output.emit(
            metadata
            | {
                "assets": _tree_json(trees[0]),
                "liabilities": _tree_json(trees[1]),
                "equity": _tree_json(trees[2]),
                "current_earnings": data.current_earnings,
                "valuation_adjustment": data.valuation_adjustment if reconciled else None,
                "equity_total": data.equity_total if reconciled else None,
                "equity_reconciled": reconciled,
                "net_worth": worth,
                "net_worth_series": _series_json(data.net_worth_data),
            },
            target=output.file_target(file),
        )
        return
    _heading("Balance Sheet", metadata)
    dcontext = filtered.ledger.options["dcontext"]
    for tree in trees:
        typer.echo("")
        _print_tree(tree, conversion=conversion, dcontext=dcontext)
    typer.echo(f"  {'Current-period earnings (credit):':<46}  {_amounts(data.current_earnings, conversion, dcontext)}")
    if reconciled:
        adjustment = _amounts(data.valuation_adjustment, conversion, dcontext)
        typer.echo(f"  {'Valuation/translation adjustment (credit):':<46}  {adjustment}")
        typer.echo(f"  {'Total equity (credit):':<46}  {_amounts(data.equity_total, conversion, dcontext)}")
    typer.echo(f"\nNet Worth: {_amounts(worth, conversion, dcontext)}")
    typer.echo(f"\n{interval.value.title()} net worth")
    output.table(
        ["DATE", "NET WORTH"],
        [[str(point.date), _amounts(point.balance, conversion, dcontext)] for point in data.net_worth_data],
    )


@report_app.command("trial-balance")
def trial_balance(
    conversion: ConversionOpt = None,
    time: TimeOpt = None,
    account: AccountOpt = None,
    allow_errors: AllowErrorsOpt = False,
) -> None:
    """All five account types, retaining signed ledger balances."""
    from fava.modules.financial_statements import FinancialStatementsModule

    filtered, file, conversion = _load(account, time, conversion, allow_errors)
    data = FinancialStatementsModule().trial_balance(filtered, conversion)
    sections = {
        name: getattr(data, f"{name}_hierarchy") for name in ("assets", "liabilities", "equity", "income", "expenses")
    }
    metadata = _metadata(filtered, conversion) | _valuation(
        conversion,
        ((filtered.end_date, balance) for tree in sections.values() for balance in _tree_balances(tree)),
        allow_errors,
        filtered.ledger.prices,
    )
    if context.current().json_output:
        output.emit(
            metadata | {name: _tree_json(tree) for name, tree in sections.items()}, target=output.file_target(file)
        )
        return
    _heading("Trial Balance", metadata)
    dcontext = filtered.ledger.options["dcontext"]
    for tree in sections.values():
        typer.echo("")
        _print_tree(tree, conversion=conversion, dcontext=dcontext)
