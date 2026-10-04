"""Query cells never carry the loader's internal metadata keys (w1/145).

Beancount stamps every directive's and posting's metadata with `filename`,
`lineno` and `__*` bookkeeping such as `__tolerances__`. Upstream's text
renderer hides them for an entry-metadata column; bea's CSV cells went through
the JSON walk and `str()` instead, so an export carried the ledger's absolute
path in every row, as a Python dict repr.
"""

from __future__ import annotations

import csv
import io
import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

LEDGER = """2024-01-01 open Assets:Cash
2024-01-01 open Equity:Opening
2024-01-02 * "P" "n"
  note: "hi"
  Assets:Cash  1.00 USD
  Equity:Opening
"""
INTERNAL = ("filename", "lineno", "__tolerances__", "__automatic__")


def _env(tmp_path: Path) -> dict[str, str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_") and k != "CI"}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        HOME=str(tmp_path / "home"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
    )
    return env


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    path = tmp_path / "min.bean"
    path.write_text(LEDGER, encoding="utf-8")
    return path


def _query(tmp_path: Path, ledger: Path, query: str, *args: str, json_mode: bool = False) -> str:
    done = subprocess.run(
        [
            sys.executable,
            "-m",
            "cli.main",
            *(["--json"] if json_mode else []),
            "--file",
            str(ledger),
            "query",
            *args,
            query,
        ],
        env=_env(tmp_path),
        cwd=tmp_path,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=120,
    )
    assert done.returncode == 0, done.stderr
    return done.stdout


def _csv_cells(text: str) -> list[str]:
    rows = list(csv.reader(io.StringIO(text)))
    return [row[0] for row in rows[1:]]


def _text_cells(text: str) -> list[str]:
    return [line.strip() for line in text.splitlines()[2:] if line.strip()]


@pytest.mark.parametrize(
    ("query", "expected"),
    [
        ("SELECT entry.meta AS m WHERE account = 'Assets:Cash'", "{'note': 'hi'}"),
        ("SELECT meta WHERE account = 'Assets:Cash'", "{}"),
    ],
    ids=["entry-meta", "posting-meta"],
)
def test_a_csv_metadata_cell_is_the_text_cell_with_user_keys_only(
    tmp_path: Path, ledger: Path, query: str, expected: str
) -> None:
    csv_cells = _csv_cells(_query(tmp_path, ledger, query, "-f", "csv"))
    text_cells = _text_cells(_query(tmp_path, ledger, query, "-f", "text"))

    assert csv_cells == [expected]
    assert text_cells == [expected]
    for key in (*INTERNAL, str(ledger)):
        assert key not in "".join(csv_cells + text_cells)


def test_json_metadata_cells_keep_user_keys_only(tmp_path: Path, ledger: Path) -> None:
    out = _query(tmp_path, ledger, "SELECT entry.meta AS m, meta, entry WHERE account = 'Assets:Cash'", json_mode=True)
    (row,) = json.loads(out)["data"]["rows"]

    assert row[0] == {"note": "hi"}
    assert row[1] == {}
    assert row[2]["meta"] == {"note": "hi"}
    assert all(posting["meta"] == {} for posting in row[2]["postings"])
    assert str(ledger) not in json.dumps(row), "the envelope's target names the ledger; the cells must not"


def test_a_csv_directive_cell_is_beancount_text(tmp_path: Path, ledger: Path) -> None:
    (cell,) = _csv_cells(_query(tmp_path, ledger, "SELECT entry WHERE account = 'Assets:Cash'", "-f", "csv"))

    assert cell.splitlines()[:3] == ['2024-01-02 * "P" "n"', '  note: "hi"', "  Assets:Cash      1.00 USD"]
    for key in (*INTERNAL, str(ledger)):
        assert key not in cell
