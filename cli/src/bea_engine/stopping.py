"""Termination signals in the engine process: a stopped write never commits.

`python -m bea_engine` turns SIGTERM, SIGHUP and SIGINT into an exception so
staged files and locks unwind in their `finally` blocks. That is not enough on
its own (w1/074): Beancount's C parser catches any exception a builder callback
raises — the handler runs inside one most of the time a ledger is parsing —
records it as a syntax error and keeps going. A stopped `--allow-errors` write
then committed, and a stopped write on a large ledger outran the frontend's
grace period and was killed with its staging copies still on disk.

So the handler also records the signal, removes every live staging copy at
once, and — while a ledger is loading, where an exception cannot be trusted to
propagate — exits on the spot. Write paths call `check()` immediately before
they replace or create a destination, so a signal that was swallowed anyway
still stops the commit.
"""

from __future__ import annotations

import os
import signal
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from types import FrameType
from typing import Any

_received: int | None = None
_loading = 0
_staged: set[Path] = set()


def install() -> dict[int, Any]:
    """Handle the termination signals; return the previous handlers for restoring."""
    previous: dict[int, Any] = {}
    for name in ("SIGTERM", "SIGHUP", "SIGINT"):
        number = getattr(signal, name, None)
        if number is not None:
            previous[number] = signal.signal(number, _terminate)
    return previous


def interactive() -> None:
    """Give Ctrl-C back to an interactive session, which cancels a line with it."""
    sigint = getattr(signal, "SIGINT", None)
    if sigint is not None and signal.getsignal(sigint) is _terminate:
        signal.signal(sigint, signal.default_int_handler)


def _terminate(number: int, _frame: FrameType | None) -> None:
    global _received
    _received = number
    _discard_staged()
    if _loading:
        # The parser would swallow an exception raised here and keep parsing.
        os._exit(128 + number)
    if number == getattr(signal, "SIGINT", None):
        raise KeyboardInterrupt
    raise SystemExit(128 + number)


def check() -> None:
    """Refuse to go on once a termination signal arrived, even if something swallowed it."""
    if _received is not None:
        raise SystemExit(128 + _received)


@contextmanager
def loading() -> Iterator[None]:
    """Mark a ledger load, during which a termination signal exits at once."""
    global _loading
    _loading += 1
    try:
        yield
    finally:
        _loading -= 1
    check()


@contextmanager
def staged(path: Path) -> Iterator[None]:
    """Register a staging copy, or its pickle-cache sidecar, for removal on a signal."""
    _staged.add(path)
    try:
        yield
    finally:
        _staged.discard(path)


def _discard_staged() -> None:
    for path in list(_staged):
        try:
            path.unlink(missing_ok=True)
        except OSError:
            continue
