"""A literal zero divisor in a bulk amount fragment is a row rejection, not an engine crash (w5/057).

Flag input passes the frontend's zero-divisor check, but a bulk row's
multi-token `amount` went straight to Beancount's parser inside the engine,
which dies on SIGSEGV for `100/0`. The batch exited 4 with "the outcome is
unknown", named no row, and `--partial` could not append the valid rows.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

LEDGER = """2026-01-01 open Assets:Cash USD
2026-01-01 open Assets:Brokerage
2026-01-01 open Expenses:Food USD
"""


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
        timeout=120,
    )


def _row(narration: str, account: str, amount: str) -> dict[str, object]:
    return {
        "date": "2026-02-01",
        "narration": narration,
        "postings": [{"account": account, "amount": amount}, {"account": "Assets:Cash"}],
    }


def _add(tmp_path: Path, rows: list[dict[str, object]], *flags: str) -> subprocess.CompletedProcess[str]:
    ledger = tmp_path / "main.bean"
    if not ledger.exists():
        ledger.write_text(LEDGER, encoding="utf-8")
    batch = tmp_path / "batch.json"
    batch.write_text(json.dumps(rows), encoding="utf-8")
    return _bea(tmp_path, "--json", "--file", str(ledger), "add", "transactions", "--from", str(batch), *flags)


ZERO_DIVISORS = [
    ("Expenses:Food", "100/0 USD @ 1 USD"),
    ("Expenses:Food", "100 / 0.0 USD @ 1 USD"),
    ("Assets:Brokerage", "1 HOOL {100/0 USD}"),
    ("Assets:Brokerage", "1 HOOL {100 USD} @ 300/.0 USD"),
    ("Assets:Brokerage", "1 HOOL {100 USD} @@ 300/00 USD"),
]


@pytest.mark.parametrize(("account", "amount"), ZERO_DIVISORS, ids=[amount for _, amount in ZERO_DIVISORS])
def test_atomic_batch_rejects_the_row_and_writes_nothing(tmp_path: Path, account: str, amount: str) -> None:
    result = _add(tmp_path, [_row("valid", "Expenses:Food", "1 USD"), _row("bad", account, amount)])

    assert result.returncode == 1, result.stderr or result.stdout
    assert result.stdout == ""
    error = json.loads(result.stderr)["error"]
    assert error["result"] == {"written": 0, "written_rows": [], "rejected_rows": [1]}
    assert any("Row 2, postings.0" in detail and "Division by zero" in detail for detail in error["details"])
    assert (tmp_path / "main.bean").read_text(encoding="utf-8") == LEDGER


def test_partial_batch_appends_the_valid_row_and_names_the_rejected_one(tmp_path: Path) -> None:
    rows = [_row("valid", "Expenses:Food", "1 USD"), _row("bad", "Expenses:Food", "100/0 USD @ 1 USD")]
    result = _add(tmp_path, rows, "--partial")

    assert result.returncode == 1, result.stderr or result.stdout
    error = json.loads(result.stderr)["error"]
    assert error["result"] == {"written": 1, "written_rows": [0], "rejected_rows": [1]}
    assert any("Row 2, postings.0" in detail and "Division by zero" in detail for detail in error["details"])
    text = (tmp_path / "main.bean").read_text(encoding="utf-8")
    assert text.startswith(LEDGER)
    assert '"valid"' in text
    assert '"bad"' not in text
    check = _bea(tmp_path, "--json", "--file", str(tmp_path / "main.bean"), "check")
    assert check.returncode == 0, check.stderr or check.stdout


def test_safe_divisors_and_zero_like_labels_still_write(tmp_path: Path) -> None:
    rows = [
        _row("half", "Expenses:Food", "100/0.5 USD @ 1 USD"),
        _row("tenth", "Expenses:Food", "100/10 USD @ 1 USD"),
        _row("label", "Assets:Brokerage", '1 HOOL {100 USD, "lot 1/0"}'),
    ]
    result = _add(tmp_path, rows)

    assert result.returncode == 0, result.stderr or result.stdout
    text = (tmp_path / "main.bean").read_text(encoding="utf-8")
    assert "200 USD @ 1 USD" in text
    assert "10 USD @ 1 USD" in text
    assert '"lot 1/0"' in text
    check = _bea(tmp_path, "--json", "--file", str(tmp_path / "main.bean"), "check")
    assert check.returncode == 0, check.stderr or check.stdout
