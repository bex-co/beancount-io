"""One-shot query help/parse must stay inside the engine JSON envelope (w3/233)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Bank:Checking USD
2024-01-01 open Equity:Opening-Balances USD
2024-01-01 * "seed"
  Assets:Bank:Checking  1 USD
  Equity:Opening-Balances
"""


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


def _engine(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "bea_engine", *args],
        env=_env(tmp_path),
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=30,
    )


def test_query_help_and_parse_stay_in_envelope(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)

    help_result = _bea(tmp_path, "--file", str(ledger), "query", ".help")
    assert help_result.returncode == 0, help_result.stderr
    assert "Shell utility commands" in help_result.stdout
    assert "did not answer" not in help_result.stderr

    parse_result = _bea(tmp_path, "--file", str(ledger), "query", ".parse SELECT account")
    assert parse_result.returncode == 0, parse_result.stderr
    assert parse_result.stdout.strip()
    assert "did not answer" not in parse_result.stderr

    tables = _bea(tmp_path, "--file", str(ledger), "query", ".tables")
    assert tables.returncode == 0, tables.stderr
    assert "entries" in tables.stdout


def test_engine_help_json_puts_text_in_envelope(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    result = _engine(tmp_path, "query", "--file", str(ledger), ".help", "--format", "text")
    assert result.returncode == 0, result.stderr
    # Exactly one JSON object on stdout — no prepended help banner.
    payload = json.loads(result.stdout)
    assert payload["ok"] is True
    text = payload["data"]["text"]
    assert "Shell utility commands" in text
    assert "tables" in text.casefold()


def test_help_select_answers_without_crash(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    for query in ("help select", ".help select"):
        result = _bea(tmp_path, "--file", str(ledger), "query", query)
        assert result.returncode == 0, result.stderr
        assert "SELECT" in result.stdout
        assert "NoneType" not in result.stderr


def test_help_select_stays_in_json_envelope(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    result = _bea(tmp_path, "--json", "--file", str(ledger), "query", "help select")
    assert result.returncode == 0, result.stderr
    data = json.loads(result.stdout)["data"]
    assert "SELECT" in data["text"]
