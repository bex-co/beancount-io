"""`python -m bea_engine`, which is how the frontend launches the helper.

The frontend spawns the module rather than the `bea-engine` console script so a
managed environment works whether or not its `bin/` is on `PATH`, and so a
checkout works without installing the engine distribution at all.
"""

from __future__ import annotations

from bea_engine.main import app

app()
