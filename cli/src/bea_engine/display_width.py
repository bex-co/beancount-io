"""Terminal display width, for padding text tables by columns rather than code points.

The engine twin of ``cli.output.display_width`` and ``cli.output.pad``. Keep it
identical: the two execution environments cannot import one another, and the
engine runs in a child process whose environment has no ``cli`` package.
``tests/test_display_width_twins.py`` pins that the copies agree.
"""

from __future__ import annotations

import unicodedata


def display_width(text: str) -> int:
    """How many terminal columns this text occupies.

    `len()` counts code points, which is not what a terminal lays out: an East
    Asian Wide or Fullwidth character takes two columns, and a combining mark
    takes none because it renders onto the character before it. Padding a
    Japanese payee by character count left every column to its right shifted —
    worst in the import preview, where the amount slid out from under its own
    header while the user was deciding whether to commit the write.

    Precomposed accented Latin (`Ünïcödé`) is one column per character and was
    always fine, which is what makes the rule precise: the issue is display
    width, not "non-ASCII".

    Format characters — a zero-width space or joiner, a directional mark — draw
    nothing either, so they take no column; the soft hyphen is the one terminals
    do give a cell.

    "Combining" is the general category, not the canonical combining class: the
    class is 0 for many marks that still draw onto their base — Thai and
    Devanagari vowel signs, the emoji variation selector — and a payee holding
    them was padded short (w5/246). An emoji skin-tone modifier recolours the
    emoji before it and takes no column either.
    """
    return sum(_columns(c) for c in text)


def _columns(char: str) -> int:
    if char == "\u00ad":
        return 1
    if unicodedata.combining(char) or unicodedata.category(char) in {"Mn", "Me", "Cf"}:
        return 0
    if "\U0001f3fb" <= char <= "\U0001f3ff":
        return 0
    return 2 if unicodedata.east_asian_width(char) in "WF" else 1


def pad(text: str, width: int) -> str:
    """`str.ljust` measured in columns rather than code points."""
    return text + " " * max(0, width - display_width(text))
