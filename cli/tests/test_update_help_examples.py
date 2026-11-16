"""`bea update transaction(s) --help` keeps every example line verbatim (w1/271).

Click re-wrapped the indented examples as prose: it joined the three CSV
lines of `update transactions` into one, and broke the OLD=NEW command of
`update transaction` between `--account` and its value.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
EXAMPLES = {
    "transactions": [
        '[{"id": "9f2c", "account": "Expenses:Groceries", "flag": "*"}]',
        "id,account,flag",
        "9f2c,Expenses:Groceries,*",
        "71ab,,*",
    ],
    "transaction": [
        "bea update transaction --id 9f2c --account Expenses:Groceries --flag '*'",
        "bea update transaction --id 9f2c \\",
        "--account 'Expenses:Dining=Expenses:Coffee'",
    ],
}


@pytest.mark.parametrize("columns", ["60", "120"])
@pytest.mark.parametrize("command", sorted(EXAMPLES))
def test_each_example_line_renders_verbatim(tmp_path: Path, command: str, columns: str) -> None:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        COLUMNS=columns,
        TERM="dumb",
        NO_COLOR="1",
    )
    result = subprocess.run(
        [sys.executable, "-m", "cli.main", "update", command, "--help"],
        env=env,
        capture_output=True,
        text=True,
        timeout=60,
        stdin=subprocess.DEVNULL,
    )
    assert result.returncode == 0, result.stderr
    lines = [line.strip() for line in result.stdout.splitlines()]
    for example in EXAMPLES[command]:
        assert example in lines, result.stdout
