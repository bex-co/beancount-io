"""`list custom --allow-errors` reads a `custom` directive that has no values (w5/172).

Beancount parses `custom "marker"` with `values=None`. The ledger fails `check`
at that line (w1/299), but `--allow-errors` is the documented way to read it;
the reader iterated the missing values and died with a raw `TypeError`.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """\
2024-01-01 open Assets:Cash
2024-01-02 custom "marker"
2024-01-03 custom "budget" "x"
2024-01-04 event "location" "Paris"
"""


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    (tmp_path / "main.bean").write_text(LEDGER)
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        XDG_DATA_HOME=str(tmp_path / "data"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=tmp_path,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=60,
    )


def test_valueless_custom_is_listed_with_no_values(tmp_path: Path) -> None:
    result = _bea(tmp_path, "-f", "main.bean", "list", "custom", "--allow-errors")
    assert result.returncode == 0, result.stderr or result.stdout
    rows = [line.split() for line in result.stdout.splitlines()[2:] if line.strip()]
    assert rows == [["2024-01-02", "marker"], ["2024-01-03", "budget", "text:x"]]
    assert "TypeError" not in result.stdout
    assert f'{tmp_path / "main.bean"}:2: custom "marker" has no values' in result.stderr


def test_valueless_custom_json_has_empty_values(tmp_path: Path) -> None:
    result = _bea(tmp_path, "--json", "-f", "main.bean", "list", "custom", "--allow-errors")
    assert result.returncode == 0, result.stderr or result.stdout
    customs = {row["type"]: row["values"] for row in json.loads(result.stdout)["data"]}
    assert customs["marker"] == []
    assert [value["value"] for value in customs["budget"]] == ["x"]


def test_without_allow_errors_the_loader_error_is_reported(tmp_path: Path) -> None:
    result = _bea(tmp_path, "-f", "main.bean", "list", "custom")
    assert result.returncode == 1
    assert "Pass --allow-errors" in result.stderr
    assert "--debug" not in result.stderr


def test_event_control_still_lists(tmp_path: Path) -> None:
    result = _bea(tmp_path, "-f", "main.bean", "list", "event", "--allow-errors")
    assert result.returncode == 0, result.stderr or result.stdout
    assert "Paris" in result.stdout
    assert f'{tmp_path / "main.bean"}:2: custom "marker" has no values' in result.stderr
