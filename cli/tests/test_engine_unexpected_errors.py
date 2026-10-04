"""Unexpected engine exceptions keep their type and traceback; bad BQL literals are usage errors (w1/085).

The engine's catch-all wrapped any exception as its bare message, so a query
with `2020-99-01` exited 1 with "month must be in 1..12" — no exception type,
no query named — and `--debug` could only show the frontend's own frames.
"""

from __future__ import annotations

import io
import json
import os
import subprocess
import sys
from contextlib import redirect_stdout
from pathlib import Path

import pytest

from bea_engine import protocol

ROOT = Path(__file__).resolve().parents[1]


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    ledger = tmp_path / "main.bean"
    ledger.write_text("2024-01-01 open Assets:Cash USD\n", encoding="utf-8")
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", "--file", str(ledger), *args],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=60,
        stdin=subprocess.DEVNULL,
    )


@pytest.mark.parametrize(
    ("literal", "reason"),
    [("2020-99-01", "month must be in 1..12"), ("2020-02-30", "day is out of range for month")],
)
def test_an_impossible_date_literal_is_a_usage_error(tmp_path: Path, literal: str, reason: str) -> None:
    query = f"SELECT date WHERE date > {literal}"

    done = _bea(tmp_path, "--json", "query", query)

    assert done.returncode == 2, done.stderr
    error = json.loads(done.stderr)["error"]
    assert error["category"] == "usage"
    assert error["message"] == f"Cannot run this BQL query: invalid date literal: {reason}."
    assert f"  {query}" in error["details"]


def test_a_valid_date_literal_still_runs(tmp_path: Path) -> None:
    done = _bea(tmp_path, "--json", "query", "SELECT date WHERE date > 2020-02-29")

    assert done.returncode == 0, done.stderr


def test_the_catch_all_keeps_the_exception_type_and_engine_traceback() -> None:
    stdout = io.StringIO()

    def engine_bug() -> None:
        raise KeyError("missing")

    with redirect_stdout(stdout), pytest.raises(SystemExit) as exited, protocol.answering("probe"):
        engine_bug()

    assert exited.value.code == protocol.EXIT_VALIDATION
    error = json.loads(stdout.getvalue())["error"]
    assert error["message"] == "KeyError: 'missing'"
    assert "in engine_bug" in error["traceback"]
    assert "KeyError: 'missing'" in error["traceback"]
