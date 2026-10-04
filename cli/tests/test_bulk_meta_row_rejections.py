"""A bad bulk metadata value rejects its own row, with a field path (w1/109).

An array value used to escape per-row handling from Beancount's printer and
abort the whole batch with no row number, ignoring `--partial`; reserved
source-location keys were dropped silently; and a malformed tagged number
surfaced Decimal's bare exception class list.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest

ROOT = Path(__file__).resolve().parents[1]
LEDGER = "2026-01-01 open Expenses:Food USD\n2026-01-01 open Assets:Cash USD\n"


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
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
        capture_output=True,
        text=True,
        timeout=60,
    )


def _row(n: int, meta: dict[str, Any] | None = None, posting_meta: dict[str, Any] | None = None) -> dict[str, Any]:
    food: dict[str, Any] = {"account": "Expenses:Food", "amount": "10 USD"}
    if posting_meta is not None:
        food["meta"] = posting_meta
    row: dict[str, Any] = {"date": "2026-02-01", "narration": f"r{n}", "postings": [food, {"account": "Assets:Cash"}]}
    if meta is not None:
        row["meta"] = meta
    return row


CASES = [
    (_row(2, {"bad": {"x": 1}}), "Row 2, meta.bad: Unsupported metadata value"),
    (_row(2, {"arr": [1, 2]}), "Row 2, meta.arr: Unsupported metadata value of type list"),
    (_row(2, None, {"arr": [1, 2]}), "Row 2, postings.0.meta.arr: Unsupported metadata value of type list"),
    (
        _row(2, None, {"qty": {"kind": "number", "value": "abc"}}),
        "Row 2, postings.0.meta.qty: Invalid 'number' metadata for 'qty': expected a decimal string",
    ),
    (
        _row(2, {"qty": {"kind": "number", "value": "1", "unit": "x"}}),
        "Row 2, meta.qty: A 'number' metadata object takes exactly the keys kind, value.",
    ),
    (_row(2, {"filename": "x", "when": "2026-02-01"}), "Row 2, meta.filename: Metadata key 'filename' is reserved"),
    (_row(2, None, {"lineno": 3}), "Row 2, postings.0.meta.lineno: Metadata key 'lineno' is reserved"),
]
IDS = ["object", "array", "posting-array", "bad-number", "tagged-extra-key", "filename", "lineno"]


def _run(tmp_path: Path, bad: dict[str, Any], *extra: str) -> tuple[subprocess.CompletedProcess[str], Path]:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    rows = tmp_path / "rows.json"
    rows.write_text(json.dumps([_row(1), bad, _row(3)]))
    args = ("--json", "--file", str(ledger), "add", "transactions", "--from", str(rows), *extra)
    return _bea(tmp_path, *args), ledger


@pytest.mark.parametrize(("bad", "detail"), CASES, ids=IDS)
def test_the_batch_is_refused_naming_the_row_and_field(tmp_path: Path, bad: dict[str, Any], detail: str) -> None:
    result, ledger = _run(tmp_path, bad)

    assert result.returncode == 1, result.stdout
    error = json.loads(result.stderr)["error"]
    assert any(d.startswith(detail) for d in error["details"]), error
    assert error["result"]["rejected_rows"] == [1]
    assert ledger.read_text() == LEDGER


@pytest.mark.parametrize(("bad", "detail"), CASES, ids=IDS)
def test_partial_writes_the_other_rows(tmp_path: Path, bad: dict[str, Any], detail: str) -> None:
    result, ledger = _run(tmp_path, bad, "--partial")

    assert result.returncode == 1, result.stdout
    error = json.loads(result.stderr)["error"]
    assert any(d.startswith(detail) for d in error["details"]), error
    assert error["result"] == {"written": 2, "written_rows": [0, 2], "rejected_rows": [1]}
    text = ledger.read_text()
    assert '"r1"' in text and '"r3"' in text and '"r2"' not in text
    assert "filename:" not in text and "when:" not in text


def test_supported_values_still_write(tmp_path: Path) -> None:
    good = _row(2, {"note": "x", "ok": True, "count": 3, "none": None}, {"qty": {"kind": "number", "value": "1.5"}})
    result, ledger = _run(tmp_path, good)

    assert result.returncode == 0, result.stderr
    text = ledger.read_text()
    assert 'note: "x"' in text and "ok: TRUE" in text and "count: 3" in text and "qty: 1.5" in text
