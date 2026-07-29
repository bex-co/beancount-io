"""Financial statements data assembly."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

from .chart import ChartModule, DateAndBalance, DateAndBalanceWithAccountBalance


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
        return BalanceSheetData(
            net_worth_data=chart.net_worth(filtered, interval, conversion),
            assets_data=chart.account_balance(filtered, interval, options["name_assets"], conversion),
            liabilities_data=chart.account_balance(filtered, interval, options["name_liabilities"], conversion),
            equity_data=chart.account_balance(filtered, interval, options["name_equity"], conversion),
            assets_hierarchy=chart.hierarchy(filtered, options["name_assets"], conversion),
            liabilities_hierarchy=chart.hierarchy(filtered, options["name_liabilities"], conversion),
            equity_hierarchy=chart.hierarchy(filtered, options["name_equity"], conversion),
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
