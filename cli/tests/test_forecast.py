"""Characterization tests for the forecast plugin.

These tests pin down the observable behaviour of ``fava.plugins.forecast``:
the ``[MONTHLY ...]``-style narration markers on ``#``-flagged transactions,
the generated recurrences, and the ordering of the plugin output.
"""

from __future__ import annotations

import datetime
import textwrap
from decimal import Decimal

import pytest
from beancount.core import data
from beancount.loader import load_string

from fava.plugins.forecast import forecast_plugin

OPENS = """\
    2010-01-01 open Assets:Checking
    2010-01-01 open Expenses:Electricity
    2010-01-01 open Expenses:Rent
"""


def _load(source: str) -> tuple[list[data.Directive], dict[str, object]]:
    entries, errors, options_map = load_string(textwrap.dedent(source))
    assert not errors, errors
    return entries, options_map


def _run(source: str) -> list[data.Directive]:
    entries, options_map = _load(source)
    new_entries, plugin_errors = forecast_plugin(entries, options_map)
    assert plugin_errors == []
    return new_entries


def _txns(entries: list[data.Directive]) -> list[data.Transaction]:
    return [e for e in entries if isinstance(e, data.Transaction)]


def _dates(entries: list[data.Directive]) -> list[datetime.date]:
    return [t.date for t in _txns(entries)]


# ---------------------------------------------------------------------------
# Recurrence expansion
# ---------------------------------------------------------------------------


def test_monthly_repeat() -> None:
    txns = _txns(
        _run(
            OPENS
            + """\
    2014-03-08 # "Electricity bill [MONTHLY REPEAT 3 TIMES]"
      Expenses:Electricity  50.10 USD
      Assets:Checking
    """
        )
    )
    assert [t.date for t in txns] == [
        datetime.date(2014, 3, 8),
        datetime.date(2014, 4, 8),
        datetime.date(2014, 5, 8),
    ]
    assert all(t.narration == "Electricity bill" for t in txns)


def test_yearly_repeat() -> None:
    dates = _dates(
        _run(
            OPENS
            + """\
    2014-03-08 # "Rent [YEARLY REPEAT 2 TIMES]"
      Expenses:Rent  500.00 USD
      Assets:Checking
    """
        )
    )
    assert dates == [datetime.date(2014, 3, 8), datetime.date(2015, 3, 8)]


def test_weekly_repeat() -> None:
    dates = _dates(
        _run(
            OPENS
            + """\
    2014-03-08 # "Bill [WEEKLY REPEAT 4 TIMES]"
      Expenses:Electricity  10.00 USD
      Assets:Checking
    """
        )
    )
    assert dates == [
        datetime.date(2014, 3, 8),
        datetime.date(2014, 3, 15),
        datetime.date(2014, 3, 22),
        datetime.date(2014, 3, 29),
    ]


def test_daily_repeat() -> None:
    dates = _dates(
        _run(
            OPENS
            + """\
    2014-03-08 # "Bill [DAILY REPEAT 5 TIMES]"
      Expenses:Electricity  1.00 USD
      Assets:Checking
    """
        )
    )
    assert dates == [datetime.date(2014, 3, 8) + datetime.timedelta(days=i) for i in range(5)]


def test_until_is_inclusive() -> None:
    dates = _dates(
        _run(
            OPENS
            + """\
    2014-03-08 # "Bill [WEEKLY UNTIL 2014-03-22]"
      Expenses:Electricity  10.00 USD
      Assets:Checking
    """
        )
    )
    assert dates == [
        datetime.date(2014, 3, 8),
        datetime.date(2014, 3, 15),
        datetime.date(2014, 3, 22),
    ]


def test_repeat_single_time_singular_keyword() -> None:
    dates = _dates(
        _run(
            OPENS
            + """\
    2014-03-08 # "Bill [MONTHLY REPEAT 1 TIME]"
      Expenses:Electricity  10.00 USD
      Assets:Checking
    """
        )
    )
    assert dates == [datetime.date(2014, 3, 8)]


def test_skip_widens_interval() -> None:
    # SKIP 1 TIME with WEEKLY means every second week.
    dates = _dates(
        _run(
            OPENS
            + """\
    2014-03-08 # "Bill [WEEKLY SKIP 1 TIME REPEAT 10 TIMES]"
      Expenses:Electricity  10.00 USD
      Assets:Checking
    """
        )
    )
    assert dates == [datetime.date(2014, 3, 8) + datetime.timedelta(days=14 * i) for i in range(10)]


def test_skip_with_single_repeat() -> None:
    dates = _dates(
        _run(
            OPENS
            + """\
    2014-03-08 # "Bill [DAILY SKIP 3 TIMES REPEAT 1 TIME]"
      Expenses:Electricity  10.00 USD
      Assets:Checking
    """
        )
    )
    assert dates == [datetime.date(2014, 3, 8)]


def test_skip_with_until() -> None:
    dates = _dates(
        _run(
            OPENS
            + """\
    2014-03-08 # "Bill [DAILY SKIP 1 TIME UNTIL 2014-03-14]"
      Expenses:Electricity  10.00 USD
      Assets:Checking
    """
        )
    )
    assert dates == [
        datetime.date(2014, 3, 8),
        datetime.date(2014, 3, 10),
        datetime.date(2014, 3, 12),
        datetime.date(2014, 3, 14),
    ]


def test_repeat_takes_precedence_over_until() -> None:
    dates = _dates(
        _run(
            OPENS
            + """\
    2014-03-08 # "Bill [MONTHLY REPEAT 12 TIMES UNTIL 2014-04-30]"
      Expenses:Electricity  10.00 USD
      Assets:Checking
    """
        )
    )
    assert len(dates) == 12
    assert dates[-1] == datetime.date(2015, 2, 8)


def test_monthly_from_month_end_skips_short_months() -> None:
    dates = _dates(
        _run(
            OPENS
            + """\
    2014-01-31 # "Bill [MONTHLY REPEAT 3 TIMES]"
      Expenses:Electricity  10.00 USD
      Assets:Checking
    """
        )
    )
    assert dates == [
        datetime.date(2014, 1, 31),
        datetime.date(2014, 3, 31),
        datetime.date(2014, 5, 31),
    ]


def test_default_horizon_is_end_of_current_year() -> None:
    year = datetime.date.today().year
    dates = _dates(
        _run(
            OPENS
            + f"""\
    {year}-01-15 # "Bill [MONTHLY]"
      Expenses:Electricity  10.00 USD
      Assets:Checking
    """
        )
    )
    assert dates == [datetime.date(year, month, 15) for month in range(1, 13)]


def test_default_horizon_yearly_single_occurrence() -> None:
    year = datetime.date.today().year
    dates = _dates(
        _run(
            OPENS
            + f"""\
    {year}-01-15 # "Rent [YEARLY]"
      Expenses:Rent  500.00 USD
      Assets:Checking
    """
        )
    )
    assert dates == [datetime.date(year, 1, 15)]


def test_default_horizon_start_after_year_end_yields_nothing() -> None:
    year = datetime.date.today().year
    entries = _run(
        OPENS
        + f"""\
    {year + 1}-01-15 # "Bill [MONTHLY]"
      Expenses:Electricity  10.00 USD
      Assets:Checking
    """
    )
    assert _txns(entries) == []


# ---------------------------------------------------------------------------
# Marker parsing and narration handling
# ---------------------------------------------------------------------------


def test_text_after_marker_is_dropped() -> None:
    txns = _txns(
        _run(
            OPENS
            + """\
    2014-03-08 # "Bill [MONTHLY REPEAT 2 TIMES] trailing note"
      Expenses:Electricity  10.00 USD
      Assets:Checking
    """
        )
    )
    assert len(txns) == 2
    assert all(t.narration == "Bill" for t in txns)


def test_earlier_brackets_stay_in_narration() -> None:
    txns = _txns(
        _run(
            OPENS
            + """\
    2014-03-08 # "Rent [important] pay [MONTHLY REPEAT 2 TIMES]"
      Expenses:Rent  500.00 USD
      Assets:Checking
    """
        )
    )
    assert len(txns) == 2
    assert all(t.narration == "Rent [important] pay" for t in txns)


def test_marker_only_narration_becomes_empty() -> None:
    txns = _txns(
        _run(
            OPENS
            + """\
    2014-03-08 # "[MONTHLY REPEAT 2 TIMES]"
      Expenses:Electricity  10.00 USD
      Assets:Checking
    """
        )
    )
    assert len(txns) == 2
    assert all(t.narration == "" for t in txns)


@pytest.mark.parametrize(
    "narration",
    [
        "Bill",  # no marker at all
        "Bill [monthly]",  # keywords are case-sensitive
        "Bill [QUARTERLY]",  # unknown frequency
        "Bill [MONTHLY REPEAT TIMES]",  # missing count
        "Bill [MONTHLY SKIP 0 TIMES]",  # zero not allowed
    ],
)
def test_unparseable_markers_pass_through_unchanged(narration: str) -> None:
    txns = _txns(
        _run(
            OPENS
            + f"""\
    2014-03-08 # "{narration}"
      Expenses:Electricity  10.00 USD
      Assets:Checking
    """
        )
    )
    assert len(txns) == 1
    assert txns[0].narration == narration
    assert txns[0].date == datetime.date(2014, 3, 8)


def test_invalid_until_date_raises() -> None:
    entries, options_map = _load(
        OPENS
        + """\
    2014-03-08 # "Bill [MONTHLY UNTIL 2014-99-99]"
      Expenses:Electricity  10.00 USD
      Assets:Checking
    """
    )
    with pytest.raises(ValueError):
        forecast_plugin(entries, options_map)


# ---------------------------------------------------------------------------
# Preservation of transaction fields
# ---------------------------------------------------------------------------


def test_postings_are_preserved() -> None:
    txns = _txns(
        _run(
            OPENS
            + """\
    2014-03-08 # "Bill [MONTHLY REPEAT 2 TIMES]"
      Expenses:Electricity  50.10 USD
      Assets:Checking
    """
        )
    )
    for txn in txns:
        assert [p.account for p in txn.postings] == ["Expenses:Electricity", "Assets:Checking"]
        assert txn.postings[0].units.number == Decimal("50.10")
        assert txn.postings[1].units.number == Decimal("-50.10")
        assert {p.units.currency for p in txn.postings} == {"USD"}


def test_flag_payee_tags_links_are_preserved() -> None:
    txns = _txns(
        _run(
            OPENS
            + """\
    2014-03-08 # "Acme Power" "Bill [MONTHLY REPEAT 2 TIMES]" #utilities ^rent-2014
      Expenses:Electricity  50.10 USD
      Assets:Checking
    """
        )
    )
    assert len(txns) == 2
    for txn in txns:
        assert txn.flag == "#"
        assert txn.payee == "Acme Power"
        assert txn.tags == frozenset({"utilities"})
        assert txn.links == frozenset({"rent-2014"})


def test_metadata_is_preserved() -> None:
    txns = _txns(
        _run(
            OPENS
            + """\
    2014-03-08 # "Bill [MONTHLY REPEAT 2 TIMES]"
      category: "utilities"
      Expenses:Electricity  50.10 USD
      Assets:Checking
    """
        )
    )
    assert len(txns) == 2
    for txn in txns:
        assert txn.meta["category"] == "utilities"


# ---------------------------------------------------------------------------
# Filtering and output ordering
# ---------------------------------------------------------------------------


def test_regular_transactions_with_marker_text_are_untouched() -> None:
    txns = _txns(
        _run(
            OPENS
            + """\
    2014-03-08 * "Bill [MONTHLY REPEAT 3 TIMES]"
      Expenses:Electricity  10.00 USD
      Assets:Checking
    """
        )
    )
    assert len(txns) == 1
    assert txns[0].flag == "*"
    assert txns[0].narration == "Bill [MONTHLY REPEAT 3 TIMES]"


def test_non_transaction_directives_pass_through() -> None:
    entries = _run(
        OPENS
        + """\
    2014-01-01 note Assets:Checking "a note"
    2014-03-08 # "Bill [MONTHLY REPEAT 2 TIMES]"
      Expenses:Electricity  10.00 USD
      Assets:Checking
    """
    )
    assert len([e for e in entries if isinstance(e, data.Open)]) == 3
    assert len([e for e in entries if isinstance(e, data.Note)]) == 1


def test_generated_entries_come_after_regular_ones() -> None:
    entries = _run(
        OPENS
        + """\
    2014-06-01 * "June groceries"
      Expenses:Rent  100.00 USD
      Assets:Checking
    2014-03-08 # "Bill [MONTHLY REPEAT 3 TIMES]"
      Expenses:Electricity  10.00 USD
      Assets:Checking
    """
    )
    txns = _txns(entries)
    # The regular June transaction stays in the filtered section, ahead of
    # the generated March-May entries, even though it is dated later.
    assert [t.date for t in txns] == [
        datetime.date(2014, 6, 1),
        datetime.date(2014, 3, 8),
        datetime.date(2014, 4, 8),
        datetime.date(2014, 5, 8),
    ]


def test_generated_entries_from_multiple_templates_are_sorted_together() -> None:
    entries = _run(
        OPENS
        + """\
    2014-03-20 # "B [MONTHLY REPEAT 2 TIMES]"
      Expenses:Electricity  10.00 USD
      Assets:Checking
    2014-03-08 # "A [MONTHLY REPEAT 2 TIMES]"
      Expenses:Rent  10.00 USD
      Assets:Checking
    """
    )
    assert [(t.date, t.narration) for t in _txns(entries)] == [
        (datetime.date(2014, 3, 8), "A"),
        (datetime.date(2014, 3, 20), "B"),
        (datetime.date(2014, 4, 8), "A"),
        (datetime.date(2014, 4, 20), "B"),
    ]


def test_unmatched_hash_transaction_sorts_with_generated_entries() -> None:
    entries = _run(
        OPENS
        + """\
    2014-06-01 * "June groceries"
      Expenses:Rent  100.00 USD
      Assets:Checking
    2014-01-02 # "No marker here"
      Expenses:Electricity  10.00 USD
      Assets:Checking
    """
    )
    txns = _txns(entries)
    # A `#` transaction without a marker is moved to the generated section
    # (after all regular entries), not kept in its original position.
    assert [t.date for t in txns] == [
        datetime.date(2014, 6, 1),
        datetime.date(2014, 1, 2),
    ]
    assert txns[1].narration == "No marker here"


def test_plugin_reports_no_errors() -> None:
    entries, options_map = _load(
        OPENS
        + """\
    2014-03-08 # "Bill [MONTHLY REPEAT 2 TIMES]"
      Expenses:Electricity  10.00 USD
      Assets:Checking
    """
    )
    _new_entries, errors = forecast_plugin(entries, options_map)
    assert errors == []


# ---------------------------------------------------------------------------
# End-to-end via the beancount loader
# ---------------------------------------------------------------------------


def test_end_to_end_via_plugin_directive() -> None:
    entries, errors, _options_map = load_string(
        textwrap.dedent(
            '    plugin "fava.plugins.forecast"\n'
            + OPENS
            + """\
    2014-03-08 # "Electricity bill [MONTHLY REPEAT 3 TIMES]"
      Expenses:Electricity  50.10 USD
      Assets:Checking
    """
        )
    )
    assert not errors, errors
    txns = _txns(entries)
    assert len(txns) == 3
    assert all(t.narration == "Electricity bill" for t in txns)
    assert {t.date for t in txns} == {
        datetime.date(2014, 3, 8),
        datetime.date(2014, 4, 8),
        datetime.date(2014, 5, 8),
    }
