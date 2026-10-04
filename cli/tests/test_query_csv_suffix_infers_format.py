"""query -o out.csv without --format writes CSV (w3/324)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2020-01-01 open Assets:Cash USD
2020-01-01 open Expenses:Food USD
2020-01-02 * "Coffee"
  Expenses:Food 1 USD
  Assets:Cash
"""


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        XDG_DATA_HOME=str(tmp_path / "data"),
        HOME=str(tmp_path / "home"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=30,
    )


def test_query_output_csv_suffix_infers_csv_format(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    out = tmp_path / "out.csv"
    result = _bea(
        tmp_path,
        "--file",
        str(ledger),
        "query",
        "SELECT date, narration LIMIT 3",
        "-o",
        str(out),
    )
    assert result.returncode == 0, result.stderr or result.stdout
    text = out.read_text()
    assert "----" not in text
    assert "date" in text.splitlines()[0].lower()
    assert "," in text.splitlines()[0]


@pytest.mark.parametrize("name", ["r.tsv", "E.TSV", "r.csv"])
def test_json_exports_ignore_the_destination_suffix(tmp_path: Path, name: str) -> None:
    """`--json -o r.tsv` writes the envelope; the TSV advice it got could only be refused (w1/146)."""
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    out = tmp_path / name
    result = _bea(tmp_path, "--json", "--file", str(ledger), "query", "SELECT narration", "-o", str(out))

    assert result.returncode == 0, result.stderr or result.stdout
    assert json.loads(out.read_text())["data"]["rows"] == [["Coffee"], ["Coffee"]]


def test_a_text_export_to_a_tsv_name_is_still_refused(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    result = _bea(tmp_path, "--file", str(ledger), "query", "SELECT narration", "-o", str(tmp_path / "r.tsv"))

    assert result.returncode == 2
    assert "looks like TSV" in result.stderr
    assert not (tmp_path / "r.tsv").exists()
