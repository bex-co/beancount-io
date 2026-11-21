"""The engine's descriptor-path spelling matches its frontend twin.

``-f /dev/stdin`` and ``<(…)`` spellings name a file descriptor rather than a
file on both sides of the engine boundary, whose environments cannot import
each other. This pins that the copies agree.
"""

from __future__ import annotations

import pytest

from bea_engine import paths as engine_paths
from cli import paths as frontend_paths

SAMPLES = [
    "/dev/stdin",
    "/dev/fd/0",
    "/dev/fd/63",
    "/proc/self/fd/3",
    "/dev/stdout",
    "/dev/null",
    "/dev/fd/",
    "/dev/fd/x",
    "/proc/self/fd/",
    "relative/path",
    "/dev/stdin2",
    "",
]


def test_the_shared_pattern_stays_one_pattern() -> None:
    # The two copies cannot import each other (ADR014), so pin them equal: a
    # spelling addition to one side must land in the other.
    assert engine_paths._DESCRIPTOR.pattern == frontend_paths._DESCRIPTOR.pattern
    assert engine_paths._DESCRIPTOR.flags == frontend_paths._DESCRIPTOR.flags


@pytest.mark.parametrize("path", SAMPLES)
def test_the_twins_recognize_the_same_spellings(path: str) -> None:
    assert engine_paths.is_descriptor_path(path) == frontend_paths.is_descriptor_path(path)


def test_the_samples_exercise_both_answers() -> None:
    """A sample set with only one answer would pass even if one side always agreed with it."""
    assert engine_paths.is_descriptor_path("/dev/stdin") is True
    assert frontend_paths.is_descriptor_path("/dev/fd/63") is True
    assert engine_paths.is_descriptor_path("/dev/null") is False
    assert frontend_paths.is_descriptor_path("relative/path") is False
