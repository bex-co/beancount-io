"""`add balance` offers `--force` only where it can land (w1/366).

Beancount allows one balance number per account, currency and day: its
duplicate-balance validation compares the amounts and ignores tolerance. The
same-day refusal still advised `--force` for a different number, and the forced
write then always failed, the tolerance-covered case with only a bare
"Duplicate balance assertion with different amounts". A different number is now
refused, forced or not, pointing at the line to correct; the same number at
another precision or tolerance still needs `--force` and is written with it.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Checking USD
2026-01-01 open Equity:Opening USD
2026-01-02 * "Opening"
  Assets:Checking 100.00 USD
  Equity:Opening
2026-01-31 balance Assets:Checking 100.00 USD
"""
BALANCE = ("add", "balance", "--date", "2026-01-31", "-a", "Assets:Checking", "--amount")


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_") and k != "CI"}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", "--json", "-f", str(tmp_path / "main.bean"), *args],
        cwd=tmp_path,
        env=env,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )


def _books(tmp_path: Path) -> Path:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    return ledger


@pytest.mark.parametrize(
    "extra",
    [
        (),
        ("--force",),
        ("--force", "--allow-errors"),
        ("--pad-from", "Equity:Opening"),
        ("--pad-from", "Equity:Opening", "--force"),
    ],
    ids=["plain", "forced", "forced-allow-errors", "pad-from", "pad-from-forced"],
)
@pytest.mark.parametrize("amount", ["120.00 USD", "100.03 ~ 0.05 USD"], ids=["different", "within-tolerance"])
def test_a_different_number_is_refused_forced_or_not(tmp_path: Path, amount: str, extra: tuple[str, ...]) -> None:
    ledger = _books(tmp_path)

    result = _bea(tmp_path, *BALANCE, amount, *extra)

    assert result.returncode == 4, result.stdout + result.stderr
    error = json.loads(result.stderr)["error"]
    assert error["category"] == "conflict", error
    assert error["message"] == (
        f"Assets:Checking already has a 2026-01-31 balance of 100.00 USD (at {ledger}:7); refusing {amount}. "
        "Beancount allows one balance per account, currency and day, so correct or delete the "
        f"assertion at {ledger}:7 instead."
    )
    assert "--force" not in result.stderr
    assert "Duplicate balance assertion" not in result.stderr
    assert ledger.read_text() == LEDGER


@pytest.mark.parametrize("amount", ["100.00 ~ 0.01 USD", "100.0 USD"], ids=["tolerance", "precision"])
def test_the_same_number_needs_force_and_is_written_with_it(tmp_path: Path, amount: str) -> None:
    ledger = _books(tmp_path)

    refused = _bea(tmp_path, *BALANCE, amount)

    assert refused.returncode == 4, refused.stdout + refused.stderr
    message = json.loads(refused.stderr)["error"]["message"]
    assert f"(at {ledger}:7); refusing {amount}. Pass --force to record another assertion." in message
    assert ledger.read_text() == LEDGER

    forced = _bea(tmp_path, *BALANCE, amount, "--force")

    assert forced.returncode == 0, forced.stdout + forced.stderr
    assert json.loads(forced.stdout)["data"]["written"] == 1
    assert f"2026-01-31 balance Assets:Checking {amount}" in " ".join(ledger.read_text().split())
    checked = _bea(tmp_path, "check")
    assert checked.returncode == 0, checked.stdout + checked.stderr


def test_an_exact_repeat_is_still_a_duplicate(tmp_path: Path) -> None:
    ledger = _books(tmp_path)

    result = _bea(tmp_path, *BALANCE, "100.00 USD")

    assert result.returncode == 0, result.stdout + result.stderr
    data = json.loads(result.stdout)["data"]
    assert data["duplicate"] is True and data["written"] == 0, data
    assert data["source"]["lineno"] == 7, data
    assert ledger.read_text() == LEDGER
