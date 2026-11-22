"""No test reads or writes the developer's own Beanquery history and init files (w1/356).

Beanquery keeps both under `~/.config/beanquery` and follows `HOME`, not XDG.
Query shells that tests started with a copy of `os.environ` appended `.quit` and
`.exit` to the developer's history, and every query replayed their init file.
The autouse `bea_config_dir` fixture now gives each test its own `HOME`.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

pytestmark = pytest.mark.skipif(sys.platform == "win32", reason="`~` follows USERPROFILE there, not HOME")

# The engine resolves both files exactly so (`bea_engine.query`).
PROBE = (
    "import beanquery.shell as shell\n"
    "from pathlib import Path\n"
    "print(Path(shell.HISTORY_FILENAME).expanduser())\n"
    "print(Path(shell.INIT_FILENAME).expanduser())\n"
)


def test_a_child_given_the_test_environment_keeps_beanquery_files_in_the_workspace(tmp_path: Path) -> None:
    probe = subprocess.run(
        [sys.executable, "-c", PROBE],
        env={**os.environ},
        capture_output=True,
        text=True,
        check=True,
        timeout=60,
    )

    history, init = (Path(line) for line in probe.stdout.splitlines())
    assert history.is_relative_to(tmp_path), history
    assert init.is_relative_to(tmp_path), init
