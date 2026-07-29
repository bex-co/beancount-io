"""Recurring-transaction forecasting via narration markers.

Transactions flagged ``#`` act as templates for recurring activity. When the
narration ends with a bracketed recurrence marker, the template is removed
from the ledger and replaced by one concrete copy per occurrence::

    2014-03-08 # "Electricity bill [MONTHLY]"
      Expenses:Electricity   50.10 USD
      Assets:Checking       -50.10 USD

The marker grammar is::

    [FREQUENCY]
    [FREQUENCY SKIP <n> TIMES]
    [FREQUENCY REPEAT <n> TIMES]
    [FREQUENCY UNTIL <YYYY-MM-DD>]

where FREQUENCY is one of DAILY, WEEKLY, MONTHLY or YEARLY, and the optional
clauses must appear in the order above (they can be combined). ``SKIP n
TIMES`` stretches the interval to every (n+1)-th period. ``REPEAT n TIMES``
caps the number of occurrences and wins over ``UNTIL`` when both are given.
Without either bound, occurrences run through the end of the current calendar
year. Generated copies keep every field of the template (flag, payee,
postings, tags, links, metadata); only the date and the narration (with the
marker stripped) change. ``#``-flagged transactions without a valid marker
are passed through untouched.

This is a from-scratch MIT-licensed reimplementation of the marker
convention established by the ``beancount.plugins.forecast`` example plugin
that shipped with Beancount v2; it is drop-in compatible with ledgers that
use that syntax.

Copyright (c) 2019-2026 Beancount.io
License: MIT
"""

from __future__ import annotations

import datetime
import re
from dataclasses import dataclass
from typing import TYPE_CHECKING

from beancount.core import data
from dateutil import rrule


if TYPE_CHECKING:  # pragma: no cover
    from typing import Literal

    from fava.beans.types import BeancountOptions
    from fava.helpers import BeancountError

    _Frequency = Literal[0, 1, 2, 3]


__plugins__ = ("forecast_plugin",)


FORECAST_FLAG = "#"

_FREQUENCIES: dict[str, _Frequency] = {
    "DAILY": rrule.DAILY,
    "WEEKLY": rrule.WEEKLY,
    "MONTHLY": rrule.MONTHLY,
    "YEARLY": rrule.YEARLY,
}

_MARKER = re.compile(
    r"(?P<narration>^.*)"
    r"\[(?P<frequency>DAILY|WEEKLY|MONTHLY|YEARLY)"
    r"(?:\s+SKIP\s+(?P<skip>[1-9]\d*)\s+TIMES?)?"
    r"(?:\s+REPEAT\s+(?P<repeat>[1-9]\d*)\s+TIMES?)?"
    r"(?:\s+UNTIL\s+(?P<until>[\d-]+))?"
    r"\]"
)


@dataclass(frozen=True)
class _Recurrence:
    """A parsed narration recurrence marker."""

    narration: str
    frequency: _Frequency
    interval: int
    count: int | None
    until: datetime.date | None


def _parse_marker(narration: str) -> _Recurrence | None:
    """Parse the trailing ``[...]`` recurrence marker, if there is one."""
    match = _MARKER.search(narration)
    if match is None:
        return None
    count = int(match["repeat"]) if match["repeat"] else None
    until: datetime.date | None = None
    if count is None:
        if match["until"]:
            until = datetime.datetime.strptime(match["until"], "%Y-%m-%d").date()
        else:
            until = datetime.date(datetime.date.today().year, 12, 31)
    skips = int(match["skip"]) if match["skip"] else 0
    return _Recurrence(
        narration=match["narration"].strip(),
        frequency=_FREQUENCIES[match["frequency"]],
        interval=skips + 1,
        count=count,
        until=until,
    )


def _occurrences(template: data.Transaction, recurrence: _Recurrence) -> list[data.Transaction]:
    """Instantiate the template once per recurrence date."""
    rule = rrule.rrule(
        recurrence.frequency,
        dtstart=template.date,
        interval=recurrence.interval,
        count=recurrence.count,
        until=recurrence.until,
    )
    return [template._replace(date=occurrence.date(), narration=recurrence.narration) for occurrence in rule]


def forecast_plugin(entries: list[data.Directive], _options_map: BeancountOptions) -> tuple[list[data.Directive], list[BeancountError]]:
    """Expand ``#``-flagged template transactions into recurring copies."""
    regular: list[data.Directive] = []
    generated: list[data.Directive] = []
    for entry in entries:
        if not (isinstance(entry, data.Transaction) and entry.flag == FORECAST_FLAG):
            regular.append(entry)
            continue
        recurrence = _parse_marker(entry.narration or "")
        if recurrence is None:
            # Markerless `#` transactions sort in with the generated entries,
            # after all regular ones — matches the ordering of the original
            # beancount v2 plugin, which downstream consumers rely on.
            generated.append(entry)
            continue
        generated.extend(_occurrences(entry, recurrence))
    generated.sort(key=data.entry_sortkey)
    return regular + generated, []
