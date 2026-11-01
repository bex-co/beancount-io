"""An unposted row cannot veto a remembered date format (w5/1087).

The recalled-format check re-inferred without the status column, so an ignored
day-first authorization eliminated the saved US format for a posted `10/11`
and the replacement hint would have booked it on November 10.
"""

from __future__ import annotations

import json
from pathlib import Path

from tests.test_import_source_facts import _bea, _written

LEDGER = 'option "operating_currency" "USD"\n2020-01-01 open Assets:Cash USD\n2020-01-01 open Expenses:Food USD\n'
SEED = ["import", "seed.csv", "--csv", "auto", "--account", "Assets:Cash", "--default-account", "Expenses:Food"]


def _seed(tmp_path: Path) -> None:
    (tmp_path / "main.bean").write_text(LEDGER)
    (tmp_path / "seed.csv").write_text("Date,Description,Amount,Status\n09/28/2026,Seed purchase,-10.00,Posted\n")
    assert _written(_bea(tmp_path, *SEED, "--date-format", "%m/%d/%Y", "--apply")) == 1


def _later(tmp_path: Path, status: str) -> list[str]:
    (tmp_path / "later.csv").write_text(
        "Date,Description,Amount,Status\n"
        "10/11/2026,Posted purchase,-12.50,Posted\n"
        f"14/11/2026,Ignored authorization,-999.99,{status}\n"
    )
    return ["import", "later.csv", "--apply"]


def test_a_pending_row_does_not_refuse_the_remembered_format(tmp_path: Path) -> None:
    _seed(tmp_path)

    applied = _bea(tmp_path, *_later(tmp_path, "Pending"))

    assert applied.returncode == 0, applied.stderr
    assert _written(applied) == 1
    dates = _bea(tmp_path, "query", "SELECT DISTINCT date WHERE narration = 'Posted purchase'")
    assert json.loads(dates.stdout)["data"]["rows"] == [["2026-10-11"]]


def test_a_posted_row_in_another_convention_is_still_refused(tmp_path: Path) -> None:
    _seed(tmp_path)

    refused = _bea(tmp_path, *_later(tmp_path, "Posted"))

    assert refused.returncode == 2, refused.stdout
    assert "does not match" in refused.stderr
