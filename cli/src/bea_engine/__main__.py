"""`python -m bea_engine`, which is how the frontend launches the helper.

The frontend spawns the module rather than the `bea-engine` console script so a
managed environment works whether or not its `bin/` is on `PATH`, and so a
checkout works without installing the engine distribution at all.
"""

from __future__ import annotations

import signal
from types import FrameType

from bea_engine.main import app


def _terminate(number: int, _frame: FrameType | None) -> None:
    """Unwind staged files and locks before reporting the shell's signal status."""
    raise SystemExit(128 + number)


_previous_handlers = {
    number: signal.signal(number, _terminate)
    for name in ("SIGTERM", "SIGHUP")
    if (number := getattr(signal, name, None)) is not None
}
try:
    app()
finally:
    for number, handler in _previous_handlers.items():
        signal.signal(number, handler)
