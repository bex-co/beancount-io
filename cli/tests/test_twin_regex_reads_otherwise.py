"""The engine's ``regex_reads_otherwise`` matches its frontend twin.

Account and import-rule filters compile user patterns inside the engine
process, whose environment has no ``cli`` package, so the engine carries its
own copy of the POSIX-class/nested-set warning reader. The boundary forbids
sharing the code; this pins that the copies agree.
"""

from __future__ import annotations

import pytest

from bea_engine.ledger import text as engine_text
from cli import utils as frontend_utils

SAMPLES = [
    "[[:alpha:]]",
    "[[a]",
    "[a&&b]",
    "[a~~b]",
    "[a||b]",
    "a[--b]",
    "([)",
    "[abc",
    "a[bc",
    "*",
    "",
    "(?P<n>a)",
    "Assets:Cash",
    "expenses:food and [drink]",
]


def test_the_shared_pattern_stays_one_pattern() -> None:
    # The two copies cannot import each other (ADR014), so pin them equal: a
    # warning-class addition to one side must land in the other.
    assert engine_text._POSIX_CLASS.pattern == frontend_utils._POSIX_CLASS.pattern
    assert engine_text._POSIX_CLASS.flags == frontend_utils._POSIX_CLASS.flags


@pytest.mark.parametrize("pattern", SAMPLES)
@pytest.mark.parametrize("flags", [0, 2])
def test_the_twins_read_the_same_patterns(pattern: str, flags: int) -> None:
    assert engine_text.regex_reads_otherwise(pattern, flags) == frontend_utils.regex_reads_otherwise(pattern, flags)


def test_the_samples_exercise_the_warning_path() -> None:
    """A sample set that never warned would pass even if one side stopped warning."""
    assert engine_text.regex_reads_otherwise("[[:alpha:]]") is not None
    assert "POSIX class" in (engine_text.regex_reads_otherwise("[[:alpha:]]") or "")
    assert frontend_utils.regex_reads_otherwise("Assets:Cash") is None
