from __future__ import annotations

from decimal import Decimal
from pathlib import Path
from typing import TYPE_CHECKING, Annotated, Any

import typer

from cli import context, output

if TYPE_CHECKING:
    from fava.core.inventory import SimpleCounterInventory
    from fava.core.tree import SerialisedTreeNode
    from fava.ledger import FilteredLedger
    from fava.modules.chart import DateAndBalance
    from fava.util.date import Interval

report_app = typer.Typer(
    help="Financial reports from a local .bean file",
    no_args_is_help=True,
    rich_markup_mode=None,
)

ConversionOpt = Annotated[str, typer.Option("--conversion", "-x", help="Currency conversion (default: USD)")]
TimeOpt = Annotated[str | None, typer.Option("--time", "-t", help='Time filter, e.g. "2024" or "2024-01 - 2024-06"')]
AccountOpt = Annotated[str | None, typer.Option("--account", "-a", help="Account filter (substring)")]
IntervalOpt = Annotated[str, typer.Option("--interval", "-i", help="Interval: monthly|yearly|quarterly|weekly|daily")]
AllowErrorsOpt = Annotated[bool, typer.Option("--allow-errors", help="Report figures even if the ledger has errors")]

_ACCOUNT_COL = 46
_USD_COL = 14
_OTHER_COL = 20


def _format_balance(inv: SimpleCounterInventory, primary: str = "USD") -> tuple[str, str]:
    """Return (primary_str, other_str) from a SimpleCounterInventory."""
    primary_val = inv.get(primary)
    primary_str = f"{primary_val:,.2f} {primary}" if primary_val is not None else "–"
    others = [
        f"{v:,.2f} {c}" if isinstance(v, Decimal) else f"{v} {c}" for c, v in sorted(inv.items()) if c != primary and v
    ]
    return primary_str, "  ".join(others)


def _short_name(account: str) -> str:
    """Return the last component of an account name."""
    return account.rsplit(":", 1)[-1] if ":" in account else account


def _print_tree(
    node: SerialisedTreeNode,
    primary: str,
    depth: int = 0,
    *,
    use_short_name: bool = True,
) -> None:
    label = _short_name(node.account) if use_short_name and depth > 0 else node.account
    indent = "  " * depth
    usd_str, other_str = _format_balance(node.balance_children, primary)
    name_col = f"{indent}{label}"
    typer.echo(f"  {name_col:<{_ACCOUNT_COL}}  {usd_str:>{_USD_COL}}  {other_str}")
    for child in node.children:
        _print_tree(child, primary, depth + 1, use_short_name=use_short_name)


def _section(title: str, primary: str) -> None:
    typer.echo(f"\n{title}")
    typer.echo(f"  {'ACCOUNT':<{_ACCOUNT_COL}}  {'USD':>{_USD_COL}}  OTHER")
    typer.echo(f"  {'-' * _ACCOUNT_COL}  {'-' * _USD_COL}  {'-' * _OTHER_COL}")


def _tree_json(node: SerialisedTreeNode) -> dict[str, Any]:
    """Serialise the account tree the text renderer walks, not a rendering of it."""
    return {
        "account": node.account,
        "balance": output.jsonable(node.balance),
        "balance_children": output.jsonable(node.balance_children),
        "has_txns": node.has_txns,
        "children": [_tree_json(child) for child in node.children],
    }


def _series_json(series: list[DateAndBalance]) -> list[dict[str, Any]]:
    return [{"date": point.date.isoformat(), "balance": output.jsonable(point.balance)} for point in series]


def _load(account: str | None, time: str | None, allow_errors: bool) -> tuple[FilteredLedger, Path]:
    """Resolve the target, load it, and refuse to total a ledger that did not load cleanly."""
    file = context.current().entry_file()
    from fava.core.loader import load_file
    from fava.ledger import FavaLedger

    entries, errors, options = load_file(file)
    output.render_ledger_errors(list(errors), allow=allow_errors)
    ledger = FavaLedger(entries, errors, options)
    return ledger.get_filtered(account=account, time=time), file


def _interval(name: str) -> Interval:
    from fava.util.date import INTERVALS, Month

    return INTERVALS.get(name.lower(), Month)


@report_app.command("overview")
def overview(
    conversion: ConversionOpt = "USD",
    time: TimeOpt = None,
    account: AccountOpt = None,
    interval: IntervalOpt = "monthly",
    allow_errors: AllowErrorsOpt = False,
) -> None:
    """Financial snapshot: assets, liabilities, income, expenses, and net worth totals."""
    ctx = context.current()
    try:
        from fava.modules.financial_statements import FinancialStatementsModule

        filtered, file = _load(account, time, allow_errors)
        data = FinancialStatementsModule().overview(filtered, _interval(interval), conversion)

        # Totals from latest period
        def _total(series: list[DateAndBalance]) -> SimpleCounterInventory:
            from fava.core.inventory import SimpleCounterInventory

            return series[-1].balance if series else SimpleCounterInventory()

        assets_bal = _total(data.assets_data)
        liabilities_bal = _total(data.liabilities_data)
        income_bal = _total(data.income_data)
        expenses_bal = _total(data.expenses_data)

        def _usd(inv: SimpleCounterInventory) -> Decimal:
            return inv.get(conversion, Decimal(0))

        net_worth = _usd(assets_bal) + _usd(liabilities_bal)

        if ctx.json_output:
            output.emit(
                {
                    "conversion": conversion,
                    "interval": interval,
                    "totals": {
                        "assets": output.jsonable(assets_bal),
                        "liabilities": output.jsonable(liabilities_bal),
                        "income": output.jsonable(income_bal),
                        "expenses": output.jsonable(expenses_bal),
                        "net_worth": {conversion: str(net_worth)},
                    },
                    "series": {
                        "assets": _series_json(data.assets_data),
                        "liabilities": _series_json(data.liabilities_data),
                        "income": _series_json(data.income_data),
                        "expenses": _series_json(data.expenses_data),
                    },
                },
                target=output.file_target(file),
            )
            return

        typer.echo("Financial Overview")
        typer.echo(f"  {'Assets:':<16} {_usd(assets_bal):>14,.2f} {conversion}")
        typer.echo(f"  {'Liabilities:':<16} {_usd(liabilities_bal):>14,.2f} {conversion}")
        typer.echo(f"  {'Income:':<16} {_usd(income_bal):>14,.2f} {conversion}")
        typer.echo(f"  {'Expenses:':<16} {_usd(expenses_bal):>14,.2f} {conversion}")
        typer.echo(f"  {'Net Worth:':<16} {net_worth:>14,.2f} {conversion}")
    except typer.Exit:
        raise
    except Exception as e:
        output.error(e)


@report_app.command("income-statement")
def income_statement(
    conversion: ConversionOpt = "USD",
    time: TimeOpt = None,
    account: AccountOpt = None,
    interval: IntervalOpt = "monthly",
    allow_errors: AllowErrorsOpt = False,
) -> None:
    """P&L report: income and expenses breakdown with net profit."""
    ctx = context.current()
    try:
        from fava.modules.financial_statements import FinancialStatementsModule

        filtered, file = _load(account, time, allow_errors)
        data = FinancialStatementsModule().income_statement(filtered, _interval(interval), conversion)

        def _usd(node: SerialisedTreeNode) -> Decimal:
            return node.balance_children.get(conversion, Decimal(0))

        net = _usd(data.income_hierarchy) + _usd(data.expenses_hierarchy)

        if ctx.json_output:
            output.emit(
                {
                    "conversion": conversion,
                    "interval": interval,
                    "income": _tree_json(data.income_hierarchy),
                    "expenses": _tree_json(data.expenses_hierarchy),
                    "net_profit": {conversion: str(net)},
                },
                target=output.file_target(file),
            )
            return

        _section("Income", conversion)
        _print_tree(data.income_hierarchy, conversion)

        _section("Expenses", conversion)
        _print_tree(data.expenses_hierarchy, conversion)

        typer.echo(f"\nNet Profit: {net:,.2f} {conversion}")
    except typer.Exit:
        raise
    except Exception as e:
        output.error(e)


@report_app.command("balance-sheet")
def balance_sheet(
    conversion: ConversionOpt = "USD",
    time: TimeOpt = None,
    account: AccountOpt = None,
    interval: IntervalOpt = "monthly",
    allow_errors: AllowErrorsOpt = False,
) -> None:
    """Position report: assets, liabilities, and equity with net worth."""
    ctx = context.current()
    try:
        from fava.modules.financial_statements import FinancialStatementsModule

        filtered, file = _load(account, time, allow_errors)
        data = FinancialStatementsModule().balance_sheet(filtered, _interval(interval), conversion)

        net_worth = data.net_worth_data[-1].balance.get(conversion, Decimal(0)) if data.net_worth_data else Decimal(0)

        if ctx.json_output:
            output.emit(
                {
                    "conversion": conversion,
                    "interval": interval,
                    "assets": _tree_json(data.assets_hierarchy),
                    "liabilities": _tree_json(data.liabilities_hierarchy),
                    "equity": _tree_json(data.equity_hierarchy),
                    "net_worth": {conversion: str(net_worth)},
                    "net_worth_series": _series_json(data.net_worth_data),
                },
                target=output.file_target(file),
            )
            return

        _section("Assets", conversion)
        _print_tree(data.assets_hierarchy, conversion)

        _section("Liabilities", conversion)
        _print_tree(data.liabilities_hierarchy, conversion)

        _section("Equity", conversion)
        _print_tree(data.equity_hierarchy, conversion)

        typer.echo(f"\nNet Worth: {net_worth:,.2f} {conversion}")
    except typer.Exit:
        raise
    except Exception as e:
        output.error(e)


@report_app.command("trial-balance")
def trial_balance(
    conversion: ConversionOpt = "USD",
    time: TimeOpt = None,
    account: AccountOpt = None,
    allow_errors: AllowErrorsOpt = False,
) -> None:
    """Comprehensive view of all accounts across all 5 account types."""
    ctx = context.current()
    try:
        from fava.modules.financial_statements import FinancialStatementsModule

        filtered, file = _load(account, time, allow_errors)
        data = FinancialStatementsModule().trial_balance(filtered, conversion)

        sections = [
            ("Assets", data.assets_hierarchy),
            ("Liabilities", data.liabilities_hierarchy),
            ("Equity", data.equity_hierarchy),
            ("Income", data.income_hierarchy),
            ("Expenses", data.expenses_hierarchy),
        ]

        if ctx.json_output:
            output.emit(
                {
                    "conversion": conversion,
                    **{title.lower(): _tree_json(tree) for title, tree in sections},
                },
                target=output.file_target(file),
            )
            return

        for title, tree in sections:
            _section(title, conversion)
            _print_tree(tree, conversion)
    except typer.Exit:
        raise
    except Exception as e:
        output.error(e)
