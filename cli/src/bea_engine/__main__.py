"""`python -m bea_engine`, which is how the frontend launches the helper.

The frontend spawns the module rather than the `bea-engine` console script so a
managed environment works whether or not its `bin/` is on `PATH`, and so a
checkout works without installing the engine distribution at all.
"""

from __future__ import annotations

import signal

from bea_engine import stopping
from bea_engine.main import app

# Unwind staged files and locks before reporting the shell's signal status.
_previous_handlers = stopping.install()
try:
    app()
finally:
    for number, handler in _previous_handlers.items():
        signal.signal(number, handler)
