"""A row without a payee is a possible duplicate only when its narration matches (w1/148).

The possible-duplicate key was date + normalized payee + source amount. The
documented one-description CSV mapping puts the bank text in `narration` and
leaves the payee empty, so the key collapsed to date + amount: two different
same-day -5.00 purchases were flagged, and `--duplicates skip` silently dropped
the real one. A payee-less row is now named by its narration instead.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest
from typer.testing import CliRunner

from cli.main import app

LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Checking USD
2026-01-01 open Expenses:Uncategorized USD
"""


@pytest.fixture
def ledger(tmp_path: Path, bea_config_dir: Path) -> Path:
    path = tmp_path / "main.bean"
    path.write_text(LEDGER)
    return path


def _import(ledger: Path, body: str, *extra: str, name: str = "bank.csv") -> tuple[int, dict[str, Any]]:
    source = ledger.parent / name
    source.write_text(body)
    result = CliRunner().invoke(
        app,
        ["--json", "--no-input", "--file", str(ledger), "import", str(source), "--account", "Assets:Checking", *extra],
    )
    stream = result.stdout if result.exit_code == 0 else result.stderr
    payload = json.loads(stream)
    return result.exit_code, payload["data"] if result.exit_code == 0 else payload["error"]["result"]


def _statuses(data: dict[str, Any]) -> list[tuple[str, str]]:
    return [(row["narration"], row["status"]) for row in data["rows"]]


def test_skip_keeps_a_different_same_day_same_amount_row(ledger: Path) -> None:
    code, _ = _import(ledger, "Date,Description,Amount\n2026-08-02,COFFEE SHOP,-5.00\n", "--apply", name="a.csv")
    assert code == 0
    body = (
        "Date,Description,Amount\n"
        "2026-08-02,COFFEE SHOP,-5.00\n"
        "2026-08-02,PARKING METER,-5.00\n"
        "2026-08-03,BOOKS,-12.00\n"
    )

    code, data = _import(ledger, body, "--apply", "--duplicates", "skip", name="b.csv")

    assert code == 0
    assert _statuses(data) == [("COFFEE SHOP", "duplicate"), ("PARKING METER", "new"), ("BOOKS", "new")]
    assert data["written"] == 2
    assert "PARKING METER" in ledger.read_text()


def test_two_different_rows_in_one_file_apply_without_review(ledger: Path) -> None:
    body = "Date,Description,Amount\n2026-08-02,COFFEE SHOP,-5.00\n2026-08-02,PARKING METER,-5.00\n"

    code, data = _import(ledger, body, "--apply")

    assert code == 0
    assert _statuses(data) == [("COFFEE SHOP", "new"), ("PARKING METER", "new")]
    assert data["written"] == 2


def test_a_payee_less_row_with_the_same_narration_is_still_a_possible_duplicate(ledger: Path) -> None:
    """A different bank id must not hide the same purchase."""
    mapping = ("--csv", "date=Date,amount=Amount,narration=Description,id=Ref")
    code, _ = _import(ledger, "Date,Description,Amount,Ref\n2026-08-02,COFFEE SHOP,-5.00,r1\n", *mapping, "--apply")
    assert code == 0

    code, data = _import(ledger, "Date,Description,Amount,Ref\n2026-08-02,coffee  shop,-5.00,r2\n", *mapping)

    assert code == 0
    (row,) = data["rows"]
    assert row["status"] == "possible_duplicate"
    assert row["reason"].startswith("Date, narration and source amount match")


def test_rows_with_a_payee_still_match_on_payee_alone(ledger: Path) -> None:
    mapping = ("--csv", "date=Date,payee=Name,narration=Description,amount=Amount")
    body = "Date,Name,Description,Amount\n2026-08-02,ACME,first,-5.00\n2026-08-02,ACME,second,-5.00\n"

    code, data = _import(ledger, body, *mapping)

    assert code == 0
    assert _statuses(data) == [("first", "new"), ("second", "possible_duplicate")]
    assert data["rows"][1]["reason"].startswith("Date, payee and source amount match")
