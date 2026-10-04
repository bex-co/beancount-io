"""Dates are written only from `YYYY-MM-DD` input (w1/111).

Pydantic read numeric strings as Unix timestamps and `date.fromisoformat`
reads ISO basic and week dates, so `"1769904000"`, `"20260201"` or
`2026-W01-1` silently became some other day.
"""

from __future__ import annotations

import datetime
import json
import os
import subprocess
import sys
from pathlib import Path

import pytest
import typer
from pydantic import ValidationError

from bea_engine import protocol
from bea_engine.ledger.models import WRITE_INPUT, TransactionDirective
from bea_engine.ledger.write import metadata_for_write
from cli.utils import parse_date

ROOT = Path(__file__).resolve().parents[1]
LEDGER = "1970-01-01 open Expenses:Food USD\n1970-01-01 open Assets:Cash USD\n"
LOOSE = ["1769904000", "1769904000000", "0", "20260201", "2026-W05-7", "2026-02-01 00:00", "2026-02-01T00:00:00+05:00"]


def _row(date: str, meta: dict[str, object] | None = None) -> dict[str, object]:
    return {
        "date": date,
        "narration": "x",
        "meta": meta or {},
        "postings": [{"account": "Expenses:Food", "amount": "1 USD"}, {"account": "Assets:Cash"}],
    }


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
        stdin=subprocess.DEVNULL,
    )


@pytest.mark.parametrize("date", LOOSE)
def test_bulk_transaction_date_must_be_iso(date: str) -> None:
    with pytest.raises(ValidationError) as raised:
        TransactionDirective.model_validate(_row(date), context=WRITE_INPUT)
    errors = raised.value.errors(include_url=False, include_input=False)
    assert [error["loc"] for error in errors] == [("date",)]
    assert "YYYY-MM-DD" in errors[0]["msg"]


@pytest.mark.parametrize("value", ["2026-W05-7", "20260201", "2026-02-01T00:00"])
def test_tagged_meta_date_must_be_iso(value: str) -> None:
    with pytest.raises(protocol.LedgerError, match="YYYY-MM-DD"):
        metadata_for_write({"when": {"kind": "date", "value": value}})


def test_iso_dates_still_read() -> None:
    directive = TransactionDirective.model_validate(_row("2026-02-01"), context=WRITE_INPUT)
    assert directive.date == datetime.date(2026, 2, 1)
    assert metadata_for_write({"when": {"kind": "date", "value": "2026-02-01"}}) == {"when": datetime.date(2026, 2, 1)}
    assert parse_date("2026-02-01") == datetime.date(2026, 2, 1)


@pytest.mark.parametrize("date", ["2026-W53-4", "20260102", "2026-01-02T00:00", "２０２６-01-02"])
def test_flag_dates_must_be_iso(date: str) -> None:
    with pytest.raises(typer.BadParameter, match="YYYY-MM-DD"):
        parse_date(date)


def test_bulk_unix_timestamp_string_writes_nothing(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    rows = tmp_path / "rows.json"
    rows.write_text(json.dumps([_row("1769904000")]))

    result = _bea(tmp_path, "--json", "--file", str(ledger), "add", "transactions", "--from", str(rows))

    assert result.returncode == 1, result.stdout
    details = json.loads(result.stderr)["error"]["details"]
    assert any(d.startswith("Row 1, date:") and "YYYY-MM-DD" in d for d in details), details
    assert ledger.read_text() == LEDGER


def test_init_refuses_a_week_date(tmp_path: Path) -> None:
    ledger = tmp_path / "i.bean"
    result = _bea(tmp_path, "--no-input", "init", str(ledger), "--currency", "USD", "--date", "2026-W01-1")
    assert result.returncode == 2, result.stdout + result.stderr
    assert not ledger.exists()
