from __future__ import annotations

from datetime import date, timedelta
from functools import cached_property
from typing import TYPE_CHECKING

from .beans.abc import Directive, Price, Transaction
from .beans.account import account_tester, get_entry_accounts
from .beans.prices import FavaPriceMap
from .core.bcio_options import BcioOptionError, BcioOptions, parse_bcio_options
from .core.conversion import cost_or_value
from .core.fava_options import parse_options
from .core.filters import AccountFilter, AdvancedFilter, TimeFilter
from .core.group_entries import group_entries_by_type
from .core.inventory import CounterInventory
from .modules.accounts import AccountsModule
from .modules.attributes import AttributesModule
from .modules.budgets import BudgetModule
from .modules.query_shell import QueryShellModule
from .modules.source_slice import SourceSliceModule
from .util import listify
from .util.date import dateranges


if TYPE_CHECKING:  # pragma: no cover
    from collections.abc import Iterable, Sequence

    from .beans.prices import PricePoint
    from .beans.types import BeancountOptions
    from .core.conversion import Conversion
    from .core.fava_options import FavaOptions, OptionError
    from .core.filters import DateRange
    from .core.group_entries import EntriesByType
    from .core.inventory import SimpleCounterInventory
    from .helpers import BeancountError
    from .util.date import Interval


class FavaLedger:
    all_entries: Sequence[Directive]
    load_errors: list[BeancountError]
    options: BeancountOptions
    all_entries_by_type: EntriesByType
    fava_options: FavaOptions
    fava_options_errors: list[OptionError]
    bcio_options: BcioOptions
    bcio_options_errors: list[BcioOptionError]

    def __init__(
        self,
        all_entries: Sequence[Directive],
        load_errors: list[BeancountError],
        options: BeancountOptions,
    ):
        self.all_entries = all_entries
        self.load_errors = load_errors
        self.options = options

        self.all_entries_by_type = group_entries_by_type(all_entries)
        self.fava_options, self.fava_options_errors = parse_options(self.all_entries_by_type.Custom)
        self.bcio_options, self.bcio_options_errors = parse_bcio_options(self.all_entries_by_type.Custom)

    @cached_property
    def attributes(self) -> AttributesModule:
        return AttributesModule(self)

    def get_filtered(
        self,
        account: str | None = None,
        filter: str | None = None,
        time: str | None = None,
    ) -> FilteredLedger:
        return FilteredLedger(self, account=account, filter=filter, time=time)

    @cached_property
    def prices(self) -> FavaPriceMap:
        return FavaPriceMap(self.all_entries_by_type.Price)

    @cached_property
    def budget(self) -> BudgetModule:
        return BudgetModule(self)

    @property
    def errors(self) -> list[BeancountError]:
        return self.load_errors + self.fava_options_errors

    @property
    def root_accounts(self) -> list[str]:
        options = self.options
        return [
            options["name_assets"],
            options["name_liabilities"],
            options["name_equity"],
            options["name_income"],
            options["name_expenses"],
        ]

    @property
    def accounts(self) -> AccountsModule:
        # Builds a new AccountsModule (groups all entries + builds a Tree) on every access — cache the result if called in a loop.
        return AccountsModule(self)

    @cached_property
    def shell(self) -> QueryShellModule:
        return QueryShellModule(self)

    @cached_property
    def source_slice(self) -> SourceSliceModule:
        return SourceSliceModule(self)

    @listify
    def account_journal(
        self,
        filtered: FilteredLedger,
        account_name: str,
        conversion: str | Conversion,
        *,
        with_children: bool,
    ) -> Iterable[tuple[Directive, SimpleCounterInventory, SimpleCounterInventory]]:
        """Journal for an account.

        Args:
            filtered: The currently filtered ledger.
            account_name: An account name.
            conversion: The conversion to use.
            with_children: Whether to include postings of subaccounts of
                           the account.

        Yields:
            Tuples of ``(entry, change, balance)``.
        """
        relevant_account = account_tester(account_name, with_children=with_children)

        prices = self.prices
        balance = CounterInventory()
        for entry in filtered.entries:
            change = CounterInventory()
            entry_is_relevant = False
            postings = getattr(entry, "postings", None)
            if postings is not None:
                for posting in postings:
                    if relevant_account(posting.account):
                        entry_is_relevant = True
                        balance.add_position(posting)
                        change.add_position(posting)
            elif any(relevant_account(a) for a in get_entry_accounts(entry)):
                entry_is_relevant = True

            if entry_is_relevant:
                yield (
                    entry,
                    cost_or_value(change, conversion, prices, entry.date),
                    cost_or_value(balance, conversion, prices, entry.date),
                )


class FilteredLedger:
    def __init__(
        self,
        ledger: FavaLedger,
        *,
        account: str | None = None,
        filter: str | None = None,
        time: str | None = None,
    ):
        self.ledger = ledger
        self.account = account
        self.filter = filter
        self.time = time

        self.date_range: DateRange | None = None
        self._date_first: date | None
        self._date_last: date | None

        entries = ledger.all_entries

        if account:
            entries = AccountFilter(account).apply(entries)
        if filter and filter.strip():
            entries = AdvancedFilter(filter).apply(entries)
        if time:
            time_filter = TimeFilter(ledger.options, ledger.fava_options, time)
            entries = time_filter.apply(entries)
            self.date_range = time_filter.date_range

        self.entries = entries

        if self.date_range:
            self._date_first = self.date_range.begin
            self._date_last = self.date_range.end
            return

        self._date_first = None
        self._date_last = None
        for entry in self.entries:
            if isinstance(entry, Transaction):
                self._date_first = entry.date
                break
        for entry in reversed(self.entries):
            if isinstance(entry, Transaction | Price):
                self._date_last = entry.date + timedelta(1)
                break

    @property
    def end_date(self) -> date | None:
        """The date to use for prices."""
        date_range = self.date_range
        if date_range:
            return date_range.end_inclusive
        return None

    def interval_ranges(self, interval: Interval) -> Sequence[DateRange]:
        """Yield date ranges corresponding to interval boundaries."""
        if not self._date_first or not self._date_last:
            return []
        complete = not self.date_range
        return dateranges(self._date_first, self._date_last, interval, complete=complete)

    def prices(self, base: str, quote: str) -> Sequence[PricePoint]:
        """List all prices."""
        all_prices = self.ledger.prices.get_all_prices((base, quote))
        if all_prices is None:
            return []

        date_range = self.date_range
        if date_range:
            return [price_point for price_point in all_prices if date_range.begin <= price_point[0] < date_range.end]
        return all_prices
