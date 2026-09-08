"""Financial reports with explicit periods, accounting signs, and valuation."""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from datetime import date, timedelta
from decimal import Decimal
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
    bool, typer.Option("--allow-errors", help="Show partial data and explain loader errors or missing prices")
]


def _amounts(balance: Mapping[str, Decimal | None], conversion: str | None = None) -> str:
    return "  ".join(
        f"{number:,.{max(2, -int(number.as_tuple().exponent))}f} {currency}"
        if number is not None
        else f"Unavailable {currency}"
        for currency, number in sorted(balance.items())
    ) or (f"0.00 {conversion}" if conversion and conversion not in {"units", "at_cost", "at_value"} else "—")


def _tree_json(node: SerialisedTreeNode) -> dict[str, Any]:
    return {
        "account": node.account,
        "balance": output.jsonable(node.balance),
        "balance_children": output.jsonable(node.balance_children),
        "has_txns": node.has_txns,
        "children": [_tree_json(child) for child in node.children],
    }


def _print_tree(node: SerialisedTreeNode, depth: int = 0, *, conversion: str | None = None) -> None:
    label = node.account.rsplit(":", 1)[-1] if depth else node.account
    typer.echo(f"  {'  ' * depth + label:<46}  {_amounts(node.balance_children, conversion)}")
    for child in node.children:
        _print_tree(child, depth + 1, conversion=conversion)


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


def _missing_price_message(item: dict[str, Any]) -> str:
    when = f"on or before {item['date']}" if item["date"] else "at any date"
    return f"No {item['from']} → {item['to']} price {when}."


def _valuation(
    conversion: str, balances: Iterable[tuple[date | None, Mapping[str, Decimal]]], allow_errors: bool
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
    if pairs and not allow_errors:
        raise LedgerError(
            f"Missing prices for {', '.join(missing)} → {conversion}. "
            "Each report row uses its own valuation date. Add prices covering the dates below "
            "or pass --allow-errors for partial balances.",
            details=[_missing_price_message(item) for item in dated],
            result={"missing_prices": pairs, "missing_price_dates": dated},
        )
    return {"valuation": "partial" if pairs else "complete", "missing_prices": pairs, "missing_price_dates": dated}


def _heading(title: str, metadata: dict[str, Any]) -> None:
    period = metadata["period"]
    dates = f"{period['start']} through {metadata['as_of']}" if period["start"] else "no dated activity"
    typer.echo(f"{title} — {dates}")
    typer.echo(f"Valuation: {metadata['conversion']}; account: {metadata['account_filter'] or 'all'}")
    typer.echo("Account balances use Beancount signs (credits negative); profit is positive for a gain.")
    if metadata["missing_prices"]:
        typer.echo("Partial valuation: some prices are missing; combined totals are unavailable.")
        for item in metadata["missing_price_dates"]:
            output.note(_missing_price_message(item))


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
    valuation = _valuation(conversion, balances, allow_errors)
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
    for title, balance in totals.items():
        typer.echo(f"  {title.replace('_', ' ').title() + ':':<16} {_amounts(balance, conversion)}")
    typer.echo(f"\n{interval.value.title()} breakdown")
    output.table(
        ["DATE", "ASSETS", "LIABILITIES", "INCOME (CREDIT)", "EXPENSES"],
        [
            [
                str(a.date),
                _amounts(a.balance, conversion),
                _amounts(liability.balance, conversion),
                _amounts(i.balance, conversion),
                _amounts(e.balance, conversion),
            ]
            for a, liability, i, e in zip(
                data.assets_data,
                data.liabilities_data,
                data.income_interval_data,
                data.expenses_interval_data,
                strict=True,
            )
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
    valuation = _valuation(conversion, balances, allow_errors)
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
    for tree in trees:
        typer.echo("")
        _print_tree(tree, conversion=conversion)
    typer.echo(f"\nNet Profit: {_amounts(net, conversion)}")
    typer.echo(f"\n{interval.value.title()} breakdown")
    output.table(
        ["PERIOD END", "INCOME", "EXPENSES", "NET PROFIT"],
        [
            [
                str(period["date"]),
                _amounts(period["income"], conversion),
                _amounts(period["expenses"], conversion),
                _amounts(period["net_profit"], conversion),
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
    valuation = _valuation(conversion, balances, allow_errors)
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
    for tree in trees:
        typer.echo("")
        _print_tree(tree, conversion=conversion)
    typer.echo(f"  {'Current-period earnings (credit):':<46}  {_amounts(data.current_earnings, conversion)}")
    if reconciled:
        typer.echo(
            f"  {'Valuation/translation adjustment (credit):':<46}  {_amounts(data.valuation_adjustment, conversion)}"
        )
        typer.echo(f"  {'Total equity (credit):':<46}  {_amounts(data.equity_total, conversion)}")
    typer.echo(f"\nNet Worth: {_amounts(worth, conversion)}")
    typer.echo(f"\n{interval.value.title()} net worth")
    output.table(
        ["DATE", "NET WORTH"], [[str(point.date), _amounts(point.balance, conversion)] for point in data.net_worth_data]
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
    )
    if context.current().json_output:
        output.emit(
            metadata | {name: _tree_json(tree) for name, tree in sections.items()}, target=output.file_target(file)
        )
        return
    _heading("Trial Balance", metadata)
    for tree in sections.values():
        typer.echo("")
        _print_tree(tree, conversion=conversion)
