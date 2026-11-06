"""The engine's ``display_width``/``pad`` match the frontend's.

The query text table pads by display width inside the engine process, whose
environment has no ``cli`` package, so the engine carries its own copy. The
boundary forbids sharing the code; this pins that the copies agree.
"""

from __future__ import annotations

import pytest

from bea_engine import display_width as engine
from cli import output as frontend

SAMPLES = [
    "",
    "Groceries",
    "Ünïcödé",
    "日本語の支払先",
    "ＦＵＬＬ　ＷＩＤＴＨ",
    "é",  # a base and a combining acute
    "กิ",  # Thai vowel sign
    "a​b",  # zero-width space
    "a­b",  # soft hyphen takes the one column terminals give it
    "👍🏽",  # emoji and skin-tone modifier
    "👨‍👩‍👧",  # a ZWJ family
    "❤️",  # emoji variation selector
    "mixed 日本 text",
]


@pytest.mark.parametrize("text", SAMPLES)
def test_display_width_agrees(text: str) -> None:
    assert engine.display_width(text) == frontend.display_width(text)


@pytest.mark.parametrize("text", SAMPLES)
@pytest.mark.parametrize("width", [0, 3, 10, 40])
def test_pad_agrees(text: str, width: int) -> None:
    assert engine.pad(text, width) == frontend.pad(text, width)


def test_the_samples_exercise_wide_and_zero_width_characters() -> None:
    """A copy that counted code points would pass the samples above if they held only ASCII."""
    assert engine.display_width("日本語") == 6
    assert engine.display_width("é") == 1
    assert engine.display_width("a​b") == 2
    assert engine.pad("日", 4) == "日  "
