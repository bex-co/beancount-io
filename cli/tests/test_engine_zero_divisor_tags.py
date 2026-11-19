"""The engine's zero-divisor scan must blank tags and links like its frontend twin (w5/759).

`cli.amounts.zero_divisor_line` blanks `#tag` and `^link` tokens because a
hierarchical `#proj/0` holds a `/0` that is not a divisor; the engine copy in
`bea_engine.amounts` guards the same scan for text already read by the engine
(`render_file`, including piped formatter input) and must agree with it.
"""

from __future__ import annotations

import pytest

from bea_engine import amounts as engine_amounts
from bea_engine.amounts import zero_divisor_line
from cli import amounts as frontend_amounts


@pytest.mark.parametrize(
    "line",
    [
        '2020-01-05 * "a" #proj/0 ^inv/0',
        '2020-01-05 * "a" #a/0/b ^c/0',
        "2020-01-05 pushtag #proj/0",
    ],
)
def test_tags_and_links_hold_no_divisor(line: str) -> None:
    assert zero_divisor_line(f"{line}\n    Assets:Cash  1 USD\n") is None


def test_a_literal_divisor_beside_a_tag_reports_its_own_line() -> None:
    text = '2020-01-05 * "a" #proj/0 ^inv/0\n    Assets:Cash  100/0 USD\n'
    assert zero_divisor_line(text) == 2


def test_a_literal_divisor_still_flags() -> None:
    assert zero_divisor_line('2020-01-05 * "a"\n  Assets:Cash  100/0 USD\n') == 2


def test_a_divisor_in_a_comment_still_passes() -> None:
    assert zero_divisor_line('2020-01-05 * "a" ; /0 in comment\n  Assets:Cash  1 USD\n') is None


def test_the_twins_blank_the_same_text() -> None:
    # The two copies cannot import each other (ADR014), so pin them equal: the
    # tag/link blanking drifted once when only the frontend twin changed.
    assert engine_amounts._NOT_ARITHMETIC.pattern == frontend_amounts._NOT_ARITHMETIC.pattern
    assert engine_amounts._NOT_ARITHMETIC.flags == frontend_amounts._NOT_ARITHMETIC.flags
    assert engine_amounts._ZERO_DIVISOR.pattern == frontend_amounts._ZERO_DIVISOR.pattern
