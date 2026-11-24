"""The engine's `JsonFloat` transport marker matches its frontend twin.

A refused JSON float crosses the request pipe as `{marker: <literal>`: the
frontend encodes it with `json_float_default` and the engine restores it
with `restore_json_float`. The two environments cannot import each other's
modules (ADR014), so each carries its own copy of the marker string. A
marker changed on one side but not the other would silently stop floats
being restored — the engine would read the dict as a plain object — so
this pins that the copies agree and the round trip holds.
"""

from __future__ import annotations

import pytest

from bea_engine import amounts as engine_amounts
from cli import amounts as frontend_amounts


def test_the_marker_strings_stay_one_string() -> None:
    # The two copies cannot import each other (ADR014), so pin them equal: a
    # marker change on one side must land in the other.
    assert engine_amounts.JSON_FLOAT_MARKER == frontend_amounts.JSON_FLOAT_MARKER


@pytest.mark.parametrize("literal", ["1.10", "1.234567890123456789", "12345678901234567890.123456789"])
def test_a_float_literal_round_trips_through_the_marker(literal: str) -> None:
    encoded = frontend_amounts.json_float_default(frontend_amounts.JsonFloat(literal))
    assert encoded == {frontend_amounts.JSON_FLOAT_MARKER: literal}
    restored = engine_amounts.restore_json_float(encoded)
    assert isinstance(restored, engine_amounts.JsonFloat)
    assert restored.literal == literal


def test_an_ordinary_dict_is_not_a_marked_float() -> None:
    """A sample set of only marker dicts would pass even if the hook matched everything."""
    assert engine_amounts.restore_json_float({"number": "1.10"}) == {"number": "1.10"}
    assert engine_amounts.JSON_FLOAT_MARKER
