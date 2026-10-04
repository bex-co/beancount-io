"""A loaded transaction with no postings lists instead of failing (w1/047).

Beancount accepts a posting-less transaction, so `bea check` passes; the
"at least one posting" rule belongs to input (`add transactions`), not to
reads. Applying it to every loaded row made the whole ledger unlistable.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Cash USD
2026-03-01 * "Reminder" "renew passport" #todo
"""
# Booking empties the sale's postings; strict reads must still report the
# loader's own diagnostic, and --allow-errors must still list the row.
SHORT_LOTS = """option "operating_currency" "USD"
2026-01-01 open Assets:Cash USD
2026-01-01 open Assets:Stock HOOL "FIFO"
2026-02-01 * "Buy"
  Assets:Stock  1 HOOL {100 USD}
  Assets:Cash  -100 USD
2026-03-01 * "Sell"
  Assets:Stock  -5 HOOL {}
  Assets:Cash  500 USD
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
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=60,
    )


def test_postingless_transaction_lists_with_empty_postings(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)

    assert _bea(tmp_path, "--file", str(ledger), "check").returncode == 0

    human = _bea(tmp_path, "--file", str(ledger), "list", "transaction")
    assert human.returncode == 0, human.stderr
    assert "renew passport" in human.stdout

    result = _bea(tmp_path, "--json", "--file", str(ledger), "list", "transaction", "--tag", "todo")
    assert result.returncode == 0, result.stderr
    [row] = json.loads(result.stdout)["data"]
    assert row["narration"] == "renew passport"
    assert row["postings"] == []
    assert row["tags"] == ["todo"]
    assert ledger.read_text() == LEDGER


def test_emptied_by_booking_keeps_loader_diagnostic(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(SHORT_LOTS)

    strict = _bea(tmp_path, "--json", "--file", str(ledger), "list", "transaction")
    assert strict.returncode != 0
    error = json.loads(strict.stdout or strict.stderr)["error"]
    assert "Not enough lots" in " ".join(error.get("details") or [])
    assert "too_short" not in strict.stdout + strict.stderr

    partial = _bea(tmp_path, "--json", "--file", str(ledger), "list", "transaction", "--allow-errors")
    assert partial.returncode == 0, partial.stderr
    sell = [row for row in json.loads(partial.stdout)["data"] if row["narration"] == "Sell"]
    assert sell and sell[0]["postings"] == []
