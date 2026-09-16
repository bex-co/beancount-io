"""Header option errors must not blame postings (w3/223)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Bank:Checking USD
2024-01-01 open Expenses:Food:Groceries USD
2024-01-01 open Equity:Opening-Balances USD
2024-01-01 * "seed"
  Assets:Bank:Checking  100 USD
  Equity:Opening-Balances
"""


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    file = tmp_path / "main.bean"
    file.write_text(LEDGER)
    return file


def _env(tmp_path: Path) -> dict[str, str]:
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
    return env


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=_env(tmp_path),
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=30,
    )


def _base(ledger: Path) -> list[str]:
    return [
        "--json",
        "--file",
        str(ledger),
        "add",
        "transaction",
        "--date",
        "2024-03-01",
        "--narration",
        "x",
        "--posting",
        "Expenses:Food:Groceries 1 USD",
        "--posting",
        "Assets:Bank:Checking",
    ]


@pytest.mark.parametrize(
    ("extra", "needle"),
    [
        (["--tag", "has space"], "Invalid token: 'space'"),
        (["--link", "bad link"], "Invalid token: 'link'"),
        (["--flag", "??"], "FLAG"),
    ],
)
def test_bad_header_options_do_not_recommend_postings(ledger: Path, extra: list[str], needle: str) -> None:
    result = _bea(ledger.parent, *_base(ledger), *extra)
    assert result.returncode == 2, result.stderr
    error = json.loads(result.stderr)["error"]
    assert error["category"] == "usage"
    assert "transaction header" in error["message"]
    assert "Assets:Checking -30 USD" not in error["message"]
    assert any(needle in detail for detail in error["details"])
    assert all(detail.startswith("Transaction options:") for detail in error["details"])


def test_bad_posting_still_recommends_posting_examples(ledger: Path) -> None:
    result = _bea(
        ledger.parent,
        "--json",
        "--file",
        str(ledger),
        "add",
        "transaction",
        "--date",
        "2024-03-01",
        "--narration",
        "x",
        "--posting",
        "Assets:Bank:Checking {",
        "--posting",
        "Expenses:Food:Groceries 1 USD",
    )
    assert result.returncode == 2, result.stderr
    error = json.loads(result.stderr)["error"]
    assert "Assets:Checking -30 USD" in error["message"]
    assert any(detail.startswith("--posting ") for detail in error["details"])
