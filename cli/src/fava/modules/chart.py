"""Provide data suitable for Fava's charts."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal
from typing import TYPE_CHECKING

from ..beans.abc import Transaction
from ..beans.account import account_tester
from ..beans.flags import FLAG_UNREALIZED
from ..beans.helpers import slice_entry_dates
from ..core.conversion import cost_or_value
from ..core.inventory import CounterInventory
from ..core.tree import Tree
from ..util import listify


if TYPE_CHECKING:  # pragma: no cover
    from collections.abc import Iterable, Mapping

    from ..core.conversion import Conversion
    from ..core.inventory import SimpleCounterInventory
    from ..core.tree import SerialisedTreeNode
    from ..ledger import FilteredLedger
    from ..util.date import Interval


ONE_DAY = timedelta(days=1)
ZERO = Decimal()


@dataclass(frozen=True)
class DateAndBalance:
    """Balance at a date."""

    date: date
    balance: SimpleCounterInventory


@dataclass(frozen=True)
class DateAndBalanceWithAccountBalance:
    """Balance at a date with per-account breakdown."""

    date: date
    balance: SimpleCounterInventory
    account_balances: Mapping[str, SimpleCounterInventory]


class ChartModule:
    """Return data for the various charts in Fava."""

    def hierarchy(
        self,
        filtered: FilteredLedger,
        account_name: str,
        conversion: str | Conversion,
        begin: date | None = None,
        end: date | None = None,
    ) -> SerialisedTreeNode:
        """Render an account tree."""
        if begin is not None and end is not None:
            tree = Tree(slice_entry_dates(filtered.entries, begin, end))
        else:
            tree = Tree(filtered.entries)
        return tree.get(account_name).serialise(
            conversion,
            filtered.ledger.prices,
            end - ONE_DAY if end is not None else None,
        )

    @listify
    def interval_totals(
        self,
        filtered: FilteredLedger,
        interval: Interval,
        accounts: str | tuple[str, ...],
        conversion: str | Conversion,
    ) -> Iterable[DateAndBalanceWithAccountBalance]:
        """Render per-interval totals (flow) for one or more accounts.

        This computes totals within each interval (not cumulative balances),
        returning both the aggregated total across the provided accounts and a
        per-account breakdown for the same interval. Useful for bar charts like
        monthly income/expenses. Limited to the last 100 intervals.

        Args:
            filtered: The filtered ledger.
            interval: An interval (e.g., month, quarter, year).
            accounts: A single account (str) or a tuple of account prefixes.
            conversion: The conversion to use.

        Yields:
            DateAndBalanceWithAccountBalance containing the interval end date,
            the aggregated total for the interval, and a per-account map for
            that interval.
        """
        prices = filtered.ledger.prices

        # limit the bar charts to 100 intervals
        intervals = filtered.interval_ranges(interval)[-100:]

        for date_range in intervals:
            inventory = CounterInventory()
            entries = slice_entry_dates(filtered.entries, date_range.begin, date_range.end)
            account_inventories: dict[str, CounterInventory] = defaultdict(
                CounterInventory,
            )
            for entry in entries:
                for posting in getattr(entry, "postings", []):
                    if posting.account.startswith(accounts):
                        account_inventories[posting.account].add_position(
                            posting,
                        )
                        inventory.add_position(posting)
            balance = cost_or_value(
                inventory,
                conversion,
                prices,
                date_range.end_inclusive,
            )
            account_balances = {
                account: cost_or_value(
                    acct_value,
                    conversion,
                    prices,
                    date_range.end_inclusive,
                )
                for account, acct_value in account_inventories.items()
            }
            yield DateAndBalanceWithAccountBalance(
                date_range.end_inclusive,
                balance,
                account_balances,
            )

    @listify
    def account_balance(
        self,
        filtered: FilteredLedger,
        interval: Interval,
        account_name: str,
        conversion: str | Conversion,
    ) -> Iterable[DateAndBalance]:
        """Get cumulative end-of-interval balance (stock) for an account.

        Computes the running balance for ``account_name`` (including child
        accounts) and yields the value at each interval end. Unrealized
        transactions are excluded. Use this for line charts of account balances
        over time. In contrast, :meth:`interval_totals` returns per-interval
        totals (flows), not cumulative balances.
        """
        transactions = (entry for entry in filtered.entries if (isinstance(entry, Transaction) and entry.flag != FLAG_UNREALIZED))

        is_child_account = account_tester(account_name, with_children=True)

        txn = next(transactions, None)
        inventory = CounterInventory()

        prices = filtered.ledger.prices
        for date_range in filtered.interval_ranges(interval):
            while txn and txn.date < date_range.end:
                for posting in txn.postings:
                    if is_child_account(posting.account):
                        inventory.add_position(posting)
                txn = next(transactions, None)
            yield DateAndBalance(
                date_range.end_inclusive,
                cost_or_value(
                    inventory,
                    conversion,
                    prices,
                    date_range.end_inclusive,
                ),
            )

    @listify
    def linechart(
        self,
        filtered: FilteredLedger,
        account_name: str,
        conversion: str | Conversion,
    ) -> Iterable[DateAndBalance]:
        """Get the balance of an account as a line chart.

        Args:
            filtered: The filtered ledger.
            account_name: A string.
            conversion: The conversion to use.

        Yields:
            Dicts for all dates on which the balance of the given
            account has changed containing the balance (in units) of the
            account at that date.
        """

        def _balances() -> Iterable[tuple[date, CounterInventory]]:
            last_date = None
            running_balance = CounterInventory()
            is_child_account = account_tester(account_name, with_children=True)

            for entry in filtered.entries:
                for posting in getattr(entry, "postings", []):
                    if is_child_account(posting.account):
                        new_date = entry.date
                        if last_date is not None and new_date > last_date:
                            yield (last_date, running_balance)
                        running_balance.add_position(posting)
                        last_date = new_date

            if last_date is not None:
                yield (last_date, running_balance)

        # When the balance for a commodity just went to zero, it will be
        # missing from the 'balance' so keep track of currencies that last had
        # a balance.
        last_currencies = None
        prices = filtered.ledger.prices

        for d, running_bal in _balances():
            balance = cost_or_value(running_bal, conversion, prices, d)
            currencies = set(balance.keys())
            if last_currencies:
                for currency in last_currencies - currencies:
                    balance[currency] = ZERO
            last_currencies = currencies
            yield DateAndBalance(d, balance)

    @listify
    def net_worth(
        self,
        filtered: FilteredLedger,
        interval: Interval,
        conversion: str | Conversion,
    ) -> Iterable[DateAndBalance]:
        """Compute net worth.

        Args:
            filtered: The filtered ledger.
            interval: A string for the interval.
            conversion: The conversion to use.

        Yields:
            Dicts for all ends of the given interval containing the
            net worth (Assets + Liabilities) separately converted to all
            operating currencies.
        """
        transactions = (entry for entry in filtered.entries if (isinstance(entry, Transaction) and entry.flag != FLAG_UNREALIZED))

        types = (
            filtered.ledger.options["name_assets"],
            filtered.ledger.options["name_liabilities"],
        )

        txn = next(transactions, None)
        inventory = CounterInventory()

        prices = filtered.ledger.prices
        for date_range in filtered.interval_ranges(interval):
            while txn and txn.date < date_range.end:
                for posting in txn.postings:
                    if posting.account.startswith(types):
                        inventory.add_position(posting)
                txn = next(transactions, None)
            yield DateAndBalance(
                date_range.end_inclusive,
                cost_or_value(
                    inventory,
                    conversion,
                    prices,
                    date_range.end_inclusive,
                ),
            )
