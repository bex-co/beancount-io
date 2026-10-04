"""A stored query run with `.run` is explained exactly like its direct form (w1/161).

The explanation was built from the `.run NAME` text rather than from the BQL
the shell actually executed, so a stored `SELECT DISTINCT tags` or `GROUP BY
tags` lost the set-column advice the direct query gets.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
STORED = {
    "dt": "SELECT DISTINCT tags",
    "gt": "SELECT tags, count(*) AS n GROUP BY tags",
    "typo": "SELECT acount",
}
LEDGER = (
    'option "operating_currency" "USD"\n2024-01-01 open Assets:Cash\n2024-01-01 open Expenses:Food\n'
    + "".join(f'2024-01-01 query "{name}" "{sql}"\n' for name, sql in STORED.items())
    + '2024-02-01 * "x" #t\n  Expenses:Food 5 USD\n  Assets:Cash\n'
)


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_") and k != "CI"}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        HOME=str(tmp_path / "home"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=tmp_path,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=120,
    )


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    path = tmp_path / "q.bean"
    path.write_text(LEDGER, encoding="utf-8")
    return path


@pytest.mark.parametrize("name", ["dt", "gt"])
@pytest.mark.parametrize("json_mode", [False, True], ids=["text", "json"])
def test_a_stored_set_column_query_matches_its_direct_form(
    tmp_path: Path, ledger: Path, name: str, json_mode: bool
) -> None:
    prefix = ["--json"] if json_mode else []
    stored = _bea(tmp_path, *prefix, "--file", str(ledger), "query", f".run {name}")
    direct = _bea(tmp_path, *prefix, "--file", str(ledger), "query", STORED[name])

    assert stored.returncode == direct.returncode == 2
    assert stored.stderr == direct.stderr
    assert "a whole set per entry" in stored.stderr


def test_a_stored_query_gets_the_column_suggestion(tmp_path: Path, ledger: Path) -> None:
    done = _bea(tmp_path, "--file", str(ledger), "query", ".run typo")

    assert done.returncode == 2
    assert "Did you mean account" in done.stderr


def test_a_native_stored_query_is_explained_too(tmp_path: Path, ledger: Path) -> None:
    done = _bea(tmp_path, "query", "--source", str(ledger), ".run gt")

    assert done.returncode == 2
    assert "a whole set per entry" in done.stderr
