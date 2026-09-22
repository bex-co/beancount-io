"""A string `SystemExit` code from upstream is a message, not a traceback (w3/382).

`scoped._invoke` runs `doctor region`/`linked` in-process and assumed
`SystemExit.code` was int-or-None. Upstream `bean-doctor linked` validates the
location itself and raises `SystemExit("Invalid line number or link format for
location.")` — a *string* code, which CPython prints to stderr before exiting
1. `int()` on it raised `ValueError`, and the engine's rich traceback handler
printed 118 lines of bea internals in place of upstream's one sentence.

Only reachable with a value that passes click's argument parsing but fails
upstream's `parse_location` — a bare date for `linked`. A mistyped `region`
fails earlier in click with a clean usage error, which is pinned here as the
control.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

from bea_engine.scoped import _status

ROOT = Path(__file__).resolve().parents[1]

LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Checking USD
2026-01-01 open Expenses:Food USD
2026-01-02 * "Lunch" ^coffee-jan
  Assets:Checking  -5 USD
  Expenses:Food  5 USD
"""

UPSTREAM_COMPLAINT = "Invalid line number or link format for location."


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    path = tmp_path / "books.bean"
    path.write_text(LEDGER, encoding="utf-8")
    return path


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


def test_malformed_location_prints_upstreams_sentence_and_nothing_else(tmp_path: Path, ledger: Path) -> None:
    failed = _bea(tmp_path, "doctor", "linked", str(ledger), "2026-01-10")

    assert failed.returncode == 1
    assert failed.stderr.strip() == UPSTREAM_COMPLAINT
    for frame in ("Traceback", "ValueError", "invalid literal for int", "bea_engine"):
        assert frame not in failed.stderr, f"{frame!r} is bea's internals, not the user's problem"


def test_mistyped_region_still_fails_in_click(tmp_path: Path, ledger: Path) -> None:
    """The control: this never reaches upstream's own validation."""
    failed = _bea(tmp_path, "doctor", "region", str(ledger), "nonsense")

    assert failed.returncode == 2
    assert "is not a valid region" in failed.stderr
    assert "Traceback" not in failed.stderr


def test_valid_link_paths_keep_their_documented_status(tmp_path: Path, ledger: Path) -> None:
    """Match and miss are 0 and 1 per the doctor exit table, unchanged by this fix."""
    matched = _bea(tmp_path, "doctor", "linked", str(ledger), "^coffee-jan")
    assert matched.returncode == 0, matched.stderr
    assert "Net Income" in matched.stdout

    missed = _bea(tmp_path, "doctor", "linked", str(ledger), "^nope")
    assert missed.returncode == 1
    assert "matched no entries" in missed.stderr


class TestStatus:
    """CPython's own `sys.exit(code)` rule, which is what upstream is written against."""

    def test_none_is_success(self) -> None:
        assert _status(None) == 0

    @pytest.mark.parametrize("code", [0, 1, 2, 42])
    def test_int_passes_through(self, code: int) -> None:
        assert _status(code) == code

    def test_string_reports_1(self, capsys: pytest.CaptureFixture[str]) -> None:
        assert _status(UPSTREAM_COMPLAINT) == 1
        assert capsys.readouterr().err.strip() == UPSTREAM_COMPLAINT

    def test_string_zero_is_still_a_message_not_a_success(self, capsys: pytest.CaptureFixture[str]) -> None:
        """`SystemExit("0")` is a message; only the int 0 means success."""
        assert _status("0") == 1
        assert capsys.readouterr().err.strip() == "0"
