"""Financial statements data assembly."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

from .chart import ChartModule, DateAndBalance, DateAndBalanceWithAccountBalance
from ..core.inventory import SimpleCounterInventory


if TYPE_CHECKING:  # pragma: no cover
    from ..core.conversion import Conversion
    from ..core.tree import SerialisedTreeNode
    from ..ledger import FilteredLedger
    from ..util.date import Interval


@dataclass(frozen=True)
class IncomeStatementData:
    """Data for the income statement report."""

    net_profit_data: list[DateAndBalanceWithAccountBalance]
    income_data: list[DateAndBalanceWithAccountBalance]
    expenses_data: list[DateAndBalanceWithAccountBalance]
    income_hierarchy: SerialisedTreeNode
    expenses_hierarchy: SerialisedTreeNode


@dataclass(frozen=True)
class TrialBalanceData:
    """Data for the trial balance report."""

    income_hierarchy: SerialisedTreeNode
    liabilities_hierarchy: SerialisedTreeNode
    equity_hierarchy: SerialisedTreeNode
    expenses_hierarchy: SerialisedTreeNode
    assets_hierarchy: SerialisedTreeNode


@dataclass(frozen=True)
class BalanceSheetData:
    """Data for the balance sheet report."""

    net_worth_data: list[DateAndBalance]
    assets_data: list[DateAndBalance]
    liabilities_data: list[DateAndBalance]
    equity_data: list[DateAndBalance]
    assets_hierarchy: SerialisedTreeNode
    liabilities_hierarchy: SerialisedTreeNode
    equity_hierarchy: SerialisedTreeNode
    current_earnings: SimpleCounterInventory
    valuation_adjustment: SimpleCounterInventory
    equity_total: SimpleCounterInventory


@dataclass(frozen=True)
class OverviewData:
    """Data for the overview report."""

    net_worth_data: list[DateAndBalance]
    assets_data: list[DateAndBalance]
    assets_hierarchy: SerialisedTreeNode
    liabilities_data: list[DateAndBalance]
    liabilities_hierarchy: SerialisedTreeNode
    income_data: list[DateAndBalance]
    income_interval_data: list[DateAndBalanceWithAccountBalance]
    income_hierarchy: SerialisedTreeNode
    expenses_data: list[DateAndBalance]
    expenses_interval_data: list[DateAndBalanceWithAccountBalance]
    expenses_hierarchy: SerialisedTreeNode


class FinancialStatementsModule:
    """Assemble data for financial statement reports."""

    def income_statement(
        self,
        filtered: FilteredLedger,
        interval: Interval,
        conversion: str | Conversion,
    ) -> IncomeStatementData:
        """Compute income statement data."""
        chart = ChartModule()
        options = filtered.ledger.options
        return IncomeStatementData(
            net_profit_data=chart.interval_totals(
                filtered,
                interval,
                (options["name_income"], options["name_expenses"]),
                conversion,
            ),
            income_data=chart.interval_totals(filtered, interval, options["name_income"], conversion),
            expenses_data=chart.interval_totals(filtered, interval, options["name_expenses"], conversion),
            income_hierarchy=chart.hierarchy(filtered, options["name_income"], conversion),
            expenses_hierarchy=chart.hierarchy(filtered, options["name_expenses"], conversion),
        )

    def trial_balance(
        self,
        filtered: FilteredLedger,
        conversion: str | Conversion,
    ) -> TrialBalanceData:
        """Compute trial balance data."""
        chart = ChartModule()
        options = filtered.ledger.options
        return TrialBalanceData(
            income_hierarchy=chart.hierarchy(filtered, options["name_income"], conversion),
            liabilities_hierarchy=chart.hierarchy(filtered, options["name_liabilities"], conversion),
            equity_hierarchy=chart.hierarchy(filtered, options["name_equity"], conversion),
            expenses_hierarchy=chart.hierarchy(filtered, options["name_expenses"], conversion),
            assets_hierarchy=chart.hierarchy(filtered, options["name_assets"], conversion),
        )

    def balance_sheet(
        self,
        filtered: FilteredLedger,
        interval: Interval,
        conversion: str | Conversion,
    ) -> BalanceSheetData:
        """Compute balance sheet data."""
        chart = ChartModule()
        options = filtered.ledger.options
        assets = chart.hierarchy(filtered, options["name_assets"], conversion)
        liabilities = chart.hierarchy(filtered, options["name_liabilities"], conversion)
        equity = chart.hierarchy(filtered, options["name_equity"], conversion)
        earnings = SimpleCounterInventory()
        for name in (options["name_income"], options["name_expenses"]):
            for currency, amount in chart.hierarchy(filtered, name, conversion).balance_children.items():
                earnings.add(currency, amount)
        # Valid books balance at their booking weights. The difference after
        # market conversion is separate from the period's booked P&L.
        adjustment = SimpleCounterInventory()
        for balance in (assets.balance_children, liabilities.balance_children, equity.balance_children, earnings):
            for currency, amount in balance.items():
                adjustment.add(currency, -amount)
        equity_total = SimpleCounterInventory(equity.balance_children)
        for balance in (earnings, adjustment):
            for currency, amount in balance.items():
                equity_total.add(currency, amount)
        return BalanceSheetData(
            net_worth_data=chart.net_worth(filtered, interval, conversion),
            assets_data=chart.account_balance(filtered, interval, options["name_assets"], conversion),
            liabilities_data=chart.account_balance(filtered, interval, options["name_liabilities"], conversion),
            equity_data=chart.account_balance(filtered, interval, options["name_equity"], conversion),
            assets_hierarchy=assets,
            liabilities_hierarchy=liabilities,
            equity_hierarchy=equity,
            current_earnings=earnings,
            valuation_adjustment=adjustment,
            equity_total=equity_total,
        )

    def overview(
        self,
        filtered: FilteredLedger,
        interval: Interval,
        conversion: str | Conversion,
    ) -> OverviewData:
        """Compute overview data."""
        chart = ChartModule()
        options = filtered.ledger.options
        return OverviewData(
            net_worth_data=chart.net_worth(filtered, interval, conversion),
            assets_data=chart.account_balance(filtered, interval, options["name_assets"], conversion),
            assets_hierarchy=chart.hierarchy(filtered, options["name_assets"], conversion),
            liabilities_data=chart.account_balance(filtered, interval, options["name_liabilities"], conversion),
            liabilities_hierarchy=chart.hierarchy(filtered, options["name_liabilities"], conversion),
            income_data=chart.account_balance(filtered, interval, options["name_income"], conversion),
            income_interval_data=chart.interval_totals(filtered, interval, (options["name_income"],), conversion),
            income_hierarchy=chart.hierarchy(filtered, options["name_income"], conversion),
            expenses_data=chart.account_balance(filtered, interval, options["name_expenses"], conversion),
            expenses_interval_data=chart.interval_totals(filtered, interval, (options["name_expenses"],), conversion),
            expenses_hierarchy=chart.hierarchy(filtered, options["name_expenses"], conversion),
        )
