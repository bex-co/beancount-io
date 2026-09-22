"""A report blames the ledger date, not an absent `--time` (w3/407).

A report's period is exclusive at the end, so building one adds a day to the
last dated entry. `datetime.date` has no day after 9999-12-31, so a ledger
reaching that boundary overflows — and every `ValueError`/`OverflowError` out
of `get_filtered` was reported as `Invalid time filter None`, naming an option
the caller never passed and no ledger fact at all.

Scope, as the report set it: an accurate diagnostic and a working recovery.
Reporting through year 9999 without a period is *not* supported, and these
tests do not pretend otherwise — they pin that the refusal explains itself and
that `--time` gets an answer.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

BOUNDARY = """option "operating_currency" "USD"
9999-12-31 open Assets:Cash USD
9999-12-31 open Equity:Opening USD
9999-12-31 * "Boundary"
  Assets:Cash 1 USD
  Equity:Opening
"""
ORDINARY = BOUNDARY.replace("9999-12-31", "2026-12-31")

KINDS = ["overview", "income-statement", "balance-sheet", "trial-balance"]


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


@pytest.fixture
def boundary(tmp_path: Path) -> Path:
    path = tmp_path / "main.bean"
    path.write_text(BOUNDARY, encoding="utf-8")
    return path


@pytest.fixture
def ordinary(tmp_path: Path) -> Path:
    path = tmp_path / "ordinary.bean"
    path.write_text(ORDINARY, encoding="utf-8")
    return path


def _error(done: subprocess.CompletedProcess[str]) -> dict:
    assert done.returncode == 2, done.stdout
    return json.loads(done.stderr)["error"]


@pytest.mark.parametrize("kind", KINDS)
def test_every_report_kind_names_the_ledger_date(tmp_path: Path, boundary: Path, kind: str) -> None:
    """All four share `_load`; the report could only source-trace three."""
    error = _error(_bea(tmp_path, "--json", "--file", str(boundary), "report", kind))

    assert "9999-12-31" in error["message"], error["message"]
    assert "Invalid time filter" not in error["message"], "no filter was supplied"
    assert "None" not in error["message"]


def test_balance_names_it_too(tmp_path: Path, boundary: Path) -> None:
    error = _error(_bea(tmp_path, "--json", "--file", str(boundary), "balance"))

    assert "9999-12-31" in error["message"]
    assert "Invalid time filter" not in error["message"]


def test_the_recovery_hint_actually_works(tmp_path: Path, boundary: Path) -> None:
    """A hint that does not resolve the failure is worse than none."""
    error = _error(_bea(tmp_path, "--json", "--file", str(boundary), "report", "overview"))
    hint = next(detail for detail in error["details"] if "--time" in detail)
    assert "--time 9999" in hint, hint

    done = _bea(tmp_path, "--json", "--file", str(boundary), "report", "overview", "--time", "9999")

    assert done.returncode == 0, done.stderr


def test_reads_without_a_period_are_unaffected(tmp_path: Path, boundary: Path) -> None:
    """What the message tells the user, checked rather than asserted at them."""
    for args in (("check",), ("list", "transaction"), ("query", "SELECT count(*) AS n")):
        done = _bea(tmp_path, "--json", "--file", str(boundary), *args)
        assert done.returncode == 0, f"{args}: {done.stderr}"


@pytest.mark.parametrize("kind", KINDS)
def test_an_ordinary_ledger_reports_normally(tmp_path: Path, ordinary: Path, kind: str) -> None:
    done = _bea(tmp_path, "--json", "--file", str(ordinary), "report", kind)

    assert done.returncode == 0, done.stderr


@pytest.mark.parametrize("supplied", ["not-a-date", "2026-13", "2026-06 - 2026-01"])
def test_a_malformed_filter_keeps_its_own_diagnostic(tmp_path: Path, ordinary: Path, supplied: str) -> None:
    """The existing message is right when a filter really was supplied."""
    error = _error(_bea(tmp_path, "--json", "--file", str(ordinary), "report", "overview", "--time", supplied))

    assert f"Invalid time filter {supplied!r}" in error["message"]


def test_a_malformed_filter_on_the_boundary_ledger_still_blames_the_filter(tmp_path: Path, boundary: Path) -> None:
    """The date story is only for the no-filter case; a bad filter is a bad filter."""
    error = _error(_bea(tmp_path, "--json", "--file", str(boundary), "report", "overview", "--time", "not-a-date"))

    assert "Invalid time filter 'not-a-date'" in error["message"]


def test_the_boundary_is_detected_from_dated_entries_only(tmp_path: Path) -> None:
    """Open/Close/Commodity declare an account; the period bounds skip them too."""
    from datetime import date

    from beancount.core.data import Commodity, Open, Transaction

    from bea_engine.report import _unreportable_boundary

    meta: dict = {}
    declarations = [
        Open(meta, date.max, "Assets:Cash", None, None),
        Commodity(meta, date.max, "USD"),
    ]
    assert _unreportable_boundary(declarations) is None, "declarations alone are not reportable activity"

    dated = [*declarations, Transaction(meta, date(2026, 1, 1), "*", None, "x", frozenset(), frozenset(), [])]
    assert _unreportable_boundary(dated) is None, "an ordinary date has room for one more day"

    at_boundary = [*declarations, Transaction(meta, date.max, "*", None, "x", frozenset(), frozenset(), [])]
    assert _unreportable_boundary(at_boundary) == date.max
