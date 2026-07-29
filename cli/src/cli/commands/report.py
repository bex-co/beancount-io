from __future__ import annotations

from decimal import Decimal
from pathlib import Path
from typing import TYPE_CHECKING, Annotated

import typer

from cli import output
from cli.config import DEFAULT_ENTRY_FILE

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


def _load(file: Path, account: str | None, time: str | None) -> FilteredLedger:
    from fava.core.loader import load_file
    from fava.ledger import FavaLedger

    entries, errors, options = load_file(file)
    ledger = FavaLedger(entries, errors, options)
    return ledger.get_filtered(account=account, time=time)


def _interval(name: str) -> Interval:
    from fava.util.date import INTERVALS, Month

    return INTERVALS.get(name.lower(), Month)


@report_app.command("overview")
def overview(
    conversion: ConversionOpt = "USD",
    time: TimeOpt = None,
    account: AccountOpt = None,
    interval: IntervalOpt = "monthly",
) -> None:
    """Financial snapshot: assets, liabilities, income, expenses, and net worth totals."""
    file = DEFAULT_ENTRY_FILE
    try:
        from fava.modules.financial_statements import FinancialStatementsModule

        filtered = _load(file, account, time)
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

        typer.echo("Financial Overview")
        typer.echo(f"  {'Assets:':<16} {_usd(assets_bal):>14,.2f} {conversion}")
        typer.echo(f"  {'Liabilities:':<16} {_usd(liabilities_bal):>14,.2f} {conversion}")
        typer.echo(f"  {'Income:':<16} {_usd(income_bal):>14,.2f} {conversion}")
        typer.echo(f"  {'Expenses:':<16} {_usd(expenses_bal):>14,.2f} {conversion}")
        typer.echo(f"  {'Net Worth:':<16} {net_worth:>14,.2f} {conversion}")

    except Exception as e:
        output.error(str(e))


@report_app.command("income-statement")
def income_statement(
    conversion: ConversionOpt = "USD",
    time: TimeOpt = None,
    account: AccountOpt = None,
    interval: IntervalOpt = "monthly",
) -> None:
    """P&L report: income and expenses breakdown with net profit."""
    file = DEFAULT_ENTRY_FILE
    try:
        from fava.modules.financial_statements import FinancialStatementsModule

        filtered = _load(file, account, time)
        data = FinancialStatementsModule().income_statement(filtered, _interval(interval), conversion)

        _section("Income", conversion)
        _print_tree(data.income_hierarchy, conversion)

        _section("Expenses", conversion)
        _print_tree(data.expenses_hierarchy, conversion)

        def _usd(node: SerialisedTreeNode) -> Decimal:
            return node.balance_children.get(conversion, Decimal(0))

        net = _usd(data.income_hierarchy) + _usd(data.expenses_hierarchy)
        typer.echo(f"\nNet Profit: {net:,.2f} {conversion}")

    except Exception as e:
        output.error(str(e))


@report_app.command("balance-sheet")
def balance_sheet(
    conversion: ConversionOpt = "USD",
    time: TimeOpt = None,
    account: AccountOpt = None,
    interval: IntervalOpt = "monthly",
) -> None:
    """Position report: assets, liabilities, and equity with net worth."""
    file = DEFAULT_ENTRY_FILE
    try:
        from fava.modules.financial_statements import FinancialStatementsModule

        filtered = _load(file, account, time)
        data = FinancialStatementsModule().balance_sheet(filtered, _interval(interval), conversion)

        _section("Assets", conversion)
        _print_tree(data.assets_hierarchy, conversion)

        _section("Liabilities", conversion)
        _print_tree(data.liabilities_hierarchy, conversion)

        _section("Equity", conversion)
        _print_tree(data.equity_hierarchy, conversion)

        net_worth = data.net_worth_data[-1].balance.get(conversion, Decimal(0)) if data.net_worth_data else Decimal(0)
        typer.echo(f"\nNet Worth: {net_worth:,.2f} {conversion}")

    except Exception as e:
        output.error(str(e))


@report_app.command("trial-balance")
def trial_balance(
    conversion: ConversionOpt = "USD",
    time: TimeOpt = None,
    account: AccountOpt = None,
) -> None:
    """Comprehensive view of all accounts across all 5 account types."""
    file = DEFAULT_ENTRY_FILE
    try:
        from fava.modules.financial_statements import FinancialStatementsModule

        filtered = _load(file, account, time)
        data = FinancialStatementsModule().trial_balance(filtered, conversion)

        _section("Assets", conversion)
        _print_tree(data.assets_hierarchy, conversion)

        _section("Liabilities", conversion)
        _print_tree(data.liabilities_hierarchy, conversion)

        _section("Equity", conversion)
        _print_tree(data.equity_hierarchy, conversion)

        _section("Income", conversion)
        _print_tree(data.income_hierarchy, conversion)

        _section("Expenses", conversion)
        _print_tree(data.expenses_hierarchy, conversion)

    except Exception as e:
        output.error(str(e))
