"""A plugin copy of an opening, assertion or note is compared with every field its line states (w5/1015).

When a plugin put a second directive of the same type at the line's location,
the comparison skipped the booking method, the tolerance and all metadata,
and took allowed currencies as an ordered list. A rewritten FIFO opening read
LIFO yet passed as written, an R2 copy of an R1 note passed beside it, and a
genuine opening whose currencies came back reordered was dropped.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

FIELDS = """from decimal import Decimal as D
from beancount.core.data import Balance, Open, Booking
__plugins__ = ('derive',)
def derive(entries, options, mode):
    out = []
    for e in entries:
        if isinstance(e, Open) and e.account == 'Assets:Stock':
            if mode == 'booking': e = e._replace(booking=Booking.LIFO)
            if mode == 'reordered': e = e._replace(currencies=list(reversed(e.currencies)))
            if mode == 'empty': e = e._replace(currencies=[])
            if mode == 'changed': e = e._replace(currencies=['GBP'])
        if isinstance(e, Balance) and mode == 'tolerance':
            e = e._replace(tolerance=D('0.02'))
        out.append(e)
        if isinstance(e, Open) and e.account == 'Assets:Stock':
            out.append(e._replace(meta=e.meta.copy(), account='Assets:GeneratedMarker'))
        if isinstance(e, Balance):
            equity = e.amount._replace(number=D('-100'))
            out.append(e._replace(meta=e.meta.copy(), account='Equity:Opening', amount=equity))
    return out, []
"""


def _books(tmp_path: Path, mode: str, *, stock: str = 'HOOL "FIFO"', tolerance: str = " ~ 0.01") -> None:
    (tmp_path / "qa_fields.py").write_text(FIELDS)
    (tmp_path / "main.bean").write_text(
        f'option "insert_pythonpath" "TRUE"\nplugin "qa_fields" "{mode}"\n'
        f"2024-01-01 open Assets:Cash USD\n2024-01-01 open Assets:Stock {stock}\n2024-01-01 open Equity:Opening USD\n"
        '2024-01-02 * "Capital"\n  Assets:Cash 100.00 USD\n  Equity:Opening -100.00 USD\n'
        f"2024-01-03 balance Assets:Cash 100.00{tolerance} USD\n"
    )


def _rows(tmp_path: Path, kind: str, account: str, *flags: str) -> list[dict]:
    result = _bea(tmp_path, "list", kind, "--account", account, *flags)
    assert result.returncode == 0, result.stderr or result.stdout
    return json.loads(result.stdout)["data"]


@pytest.mark.parametrize(
    ("mode", "kind", "account", "tolerance"),
    [
        ("booking", "open", "Assets:Stock", " ~ 0.01"),
        ("tolerance", "balance", "Assets:Cash", " ~ 0.01"),
        ("tolerance", "balance", "Assets:Cash", " ~ 0"),
    ],
    ids=["fifo-read-lifo", "tolerance-changed", "zero-tolerance-changed"],
)
def test_a_changed_stated_field_is_not_on_disk(
    tmp_path: Path, mode: str, kind: str, account: str, tolerance: str
) -> None:
    _books(tmp_path, mode, tolerance=tolerance)

    assert len(_rows(tmp_path, kind, account)) == 1
    assert _rows(tmp_path, kind, account, "--on-disk") == []


@pytest.mark.parametrize("mode", ["booking", "tolerance"])
def test_an_omitted_field_agrees_with_whatever_the_view_holds(tmp_path: Path, mode: str) -> None:
    _books(tmp_path, mode, stock="HOOL", tolerance="")

    assert len(_rows(tmp_path, "open", "Assets:Stock", "--on-disk")) == 1
    assert len(_rows(tmp_path, "balance", "Assets:Cash", "--on-disk")) == 1


@pytest.mark.parametrize(
    ("mode", "stock", "kept"),
    [
        ("reordered", 'HOOL, GLD "FIFO"', 1),
        ("empty", '"FIFO"', 1),
        ("changed", 'HOOL "FIFO"', 0),
    ],
)
def test_allowed_currencies_compare_as_a_set(tmp_path: Path, mode: str, stock: str, kept: int) -> None:
    _books(tmp_path, mode, stock=stock)

    assert len(_rows(tmp_path, "open", "Assets:Stock", "--on-disk")) == kept


METADATA = """from beancount.core.data import Note
__plugins__ = ('derive',)
def derive(entries, options, mode):
    out = []
    for e in entries:
        target = isinstance(e, Note)
        out.append(e._replace(meta={**e.meta, 'reviewed': True}) if target and mode == 'enrich' else e)
        if target:
            out.append(e._replace(meta={**e.meta, 'receipt_id': 'R2'}))
    if mode == 'reverse':
        out.reverse()
    return out, []
"""


@pytest.mark.parametrize("mode", ["copy", "reverse", "enrich"])
def test_a_copy_changing_stated_metadata_is_not_on_disk(tmp_path: Path, mode: str) -> None:
    (tmp_path / "qa_meta.py").write_text(METADATA)
    (tmp_path / "main.bean").write_text(
        f'option "insert_pythonpath" "TRUE"\nplugin "qa_meta" "{mode}"\n'
        '2024-01-01 open Assets:Cash USD\n2024-02-01 note Assets:Cash "Annotation"\n  receipt_id: "R1"\n'
    )

    assert len(_rows(tmp_path, "note", "Assets:Cash")) == 2
    (written,) = _rows(tmp_path, "note", "Assets:Cash", "--on-disk")
    assert written["meta"]["receipt_id"] == "R1"
