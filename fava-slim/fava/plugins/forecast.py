"""An example of adding a forecasting feature to Beancount via a plugin.
This entry filter plugin uses existing syntax to define and automatically
inserted transactions in the future based on a convention. It serves mostly as
an example of how you can experiment by creating and installing a local filter,
and not so much as a serious forecasting feature (though the experiment is a
good way to get something more general kickstarted eventually, I think the
concept would generalize nicely and should eventually be added as a common
feature of Beancount).
A user can create a transaction like this:
    2014-03-08 # "Electricity bill [MONTHLY]"
      Expenses:Electricity 			50.10 USD
      Assets:Checking			       -50.10 USD
and new transactions will be created monthly for the following year.
Note the use of the '#' flag and the word 'MONTHLY' which defines the
periodicity.
The number of recurrences can optionally be specified either by providing an
end date or by specifying the number of times that the transaction will be
repeated. For example:
    2014-03-08 # "Electricity bill [MONTHLY UNTIL 2019-12-31]"
      Expenses:Electricity 			50.10 USD
      Assets:Checking			       -50.10 USD
    2014-03-08 # "Electricity bill [MONTHLY REPEAT 10 TIMES]"
      Expenses:Electricity 			50.10 USD
      Assets:Checking			       -50.10 USD
Transactions can also be repeated at yearly intervals, e.g.:
    2014-03-08 # "Electricity bill [YEARLY REPEAT 10 TIMES]"
      Expenses:Electricity 			50.10 USD
      Assets:Checking			       -50.10 USD
Other examples:
    2014-03-08 # "Electricity bill [WEEKLY SKIP 1 TIME REPEAT 10 TIMES]"
      Expenses:Electricity 			50.10 USD
      Assets:Checking			       -50.10 USD
    2014-03-08 # "Electricity bill [DAILY SKIP 3 TIMES REPEAT 1 TIME]"
      Expenses:Electricity 			50.10 USD
      Assets:Checking			       -50.10 USD

Copyright (C) 2014-2017  Martin Blais
License: GNU GPLv2
"""

from __future__ import annotations

import datetime
import re
from typing import TYPE_CHECKING, TypedDict

from beancount.core import data
from dateutil import rrule


if TYPE_CHECKING:  # pragma: no cover
    from fava.beans.types import BeancountOptions
    from fava.helpers import BeancountError


class _ForecastPeriodicity(TypedDict, total=False):
    """Typed dict for rrule periodicity parameters."""

    dtstart: datetime.date
    count: int
    until: datetime.date
    interval: int


__plugins__ = ("forecast_plugin",)


def forecast_plugin(entries: list[data.Directive], _options_map: BeancountOptions) -> tuple[list[data.Directive], list[BeancountError]]:
    """An example filter that piggybacks on top of the Beancount input syntax to
    insert forecast entries automatically. This functions accepts the return
    value of beancount.loader.load_file() and must return the same type of output.
    Args:
      entries: a list of entry instances
      _options_map: a dict of options parsed from the file
    Returns:
      A tuple of entries and errors.
    """

    # Filter out forecast entries from the list of valid entries.
    forecast_entries: list[data.Transaction] = []
    filtered_entries: list[data.Directive] = []
    for entry in entries:
        if isinstance(entry, data.Transaction) and entry.flag == "#":
            forecast_entries.append(entry)
        else:
            filtered_entries.append(entry)

    # Generate forecast entries up to the end of the current year.
    new_entries: list[data.Directive] = []
    for entry in forecast_entries:
        # Parse the periodicity.
        narration = entry.narration or ""
        match = re.search(
            r"(^.*)\[(MONTHLY|YEARLY|WEEKLY|DAILY)"
            r"(\s+SKIP\s+([1-9][0-9]*)\s+TIME.?)"
            r"?(\s+REPEAT\s+([1-9][0-9]*)\s+TIME.?)"
            r"?(\s+UNTIL\s+([0-9\-]+))?\]",
            narration,
        )
        if not match:
            new_entries.append(entry)
            continue
        forecast_narration = match.group(1).strip()
        forecast_interval = (
            rrule.YEARLY
            if match.group(2).strip() == "YEARLY"
            else rrule.WEEKLY
            if match.group(2).strip() == "WEEKLY"
            else rrule.DAILY
            if match.group(2).strip() == "DAILY"
            else rrule.MONTHLY
        )
        forecast_periodicity: _ForecastPeriodicity = {"dtstart": entry.date}
        if match.group(6):  # e.g., [MONTHLY REPEAT 3 TIMES]:
            forecast_periodicity["count"] = int(match.group(6))
        elif match.group(8):  # e.g., [MONTHLY UNTIL 2020-01-01]:
            forecast_periodicity["until"] = datetime.datetime.strptime(match.group(8), "%Y-%m-%d").date()
        else:
            # e.g., [MONTHLY]
            forecast_periodicity["until"] = datetime.date(datetime.date.today().year, 12, 31)

        if match.group(4):
            # SKIP
            forecast_periodicity["interval"] = int(match.group(4)) + 1

        # Generate a new entry for each forecast date.
        forecast_dates = [dt.date() for dt in rrule.rrule(forecast_interval, **forecast_periodicity)]  # type: ignore[arg-type]
        for forecast_date in forecast_dates:
            forecast_entry = entry._replace(date=forecast_date, narration=forecast_narration)
            new_entries.append(forecast_entry)

    # Make sure the new entries inserted are sorted.
    new_entries.sort(key=data.entry_sortkey)

    return (filtered_entries + new_entries, [])
