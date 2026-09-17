"""The rendered transaction header is a validated model, not a raw construct.

`bea add transaction` renders the header and appends the user's native posting
lines as text, so it builds a header before any posting exists. Skipping
validation to allow that also skipped the validators that strip a tag's `#` and
a link's `^`, and formatting then wrote the sigil a second time (`^^inv-001`),
which no longer parses.
"""

from __future__ import annotations

import datetime

import pytest
from pydantic import ValidationError

from bea_engine.ledger.models import TransactionDirective, TransactionHeader


@pytest.mark.parametrize(
    ("tag", "link"),
    [("#trip", "^inv-001"), ("trip", "inv-001")],
    ids=["with-sigils", "without-sigils"],
)
def test_header_strips_sigils_either_spelling(tag: str, link: str) -> None:
    header = TransactionHeader(date=datetime.date(2026, 4, 30), narration="Coffee", tags=[tag], links=[link])
    assert header.tags == ["trip"]
    assert header.links == ["inv-001"]


def test_header_rejects_what_the_directive_rejects() -> None:
    """The bypass skipped every validator, not only the sigil ones."""
    with pytest.raises(ValidationError):
        TransactionHeader(date=datetime.date(2026, 4, 30), unknown_option="x")  # type: ignore[call-arg]


def test_header_needs_no_postings_but_a_directive_does() -> None:
    assert TransactionHeader(date=datetime.date(2026, 4, 30)).postings == []
    with pytest.raises(ValidationError):
        TransactionDirective(date=datetime.date(2026, 4, 30), postings=[])
