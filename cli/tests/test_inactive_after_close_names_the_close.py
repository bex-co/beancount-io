"""An entry dated after a written close is told to move that close, not to run `bea init` (w1/359).

The refusal named the account's open and its close, then ended with the remedy
for an account that opens too late: "edit that directive; for new books use bea
init --date". Either line could be "that directive", only the close can move to
make the write valid, and `bea init` refuses a ledger that already exists.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Old USD
2026-01-01 open Assets:Cash USD
2026-01-01 open Equity:Opening USD
2026-03-01 close Assets:Old
"""
INIT = "bea init --date"


def _refused(tmp_path: Path, *args: str, content: str = LEDGER) -> tuple[str, list[str]]:
    """Run a refused write in human and JSON modes; return the flattened text and the JSON details."""
    ledger = tmp_path / "books" / "main.bean"
    ledger.parent.mkdir(exist_ok=True)
    ledger.write_text(content)
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_") and k != "CI"}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
        COLUMNS="4000",
    )
    outputs = []
    for mode in ((), ("--json",)):
        result = subprocess.run(
            [sys.executable, "-m", "cli.main", *mode, "--file", str(ledger), *args],
            cwd=tmp_path,
            env=env,
            stdin=subprocess.DEVNULL,
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
        )
        assert result.returncode == 1, result.stdout + result.stderr
        assert ledger.read_text() == content
        outputs.append(result.stderr)
    human, envelope = outputs
    return " ".join(human.split()), json.loads(envelope)["error"]["details"]


def _moved(tmp_path: Path, noun: str, date: str) -> str:
    ledger = tmp_path / "books" / "main.bean"
    return (
        f"Account opened 2026-01-01 at {ledger}:2. Account closed 2026-03-01 at {ledger}:5. "
        f"Correct the {noun} date, or move the close at {ledger}:5 to on or after {date}."
    )


def test_a_transaction_after_the_close_is_told_to_move_the_close(tmp_path: Path) -> None:
    flat, details = _refused(
        tmp_path, "add", "transaction", "late", "--date", "2026-03-05", "-p", "Assets:Old 1.00 USD", "-p", "Assets:Cash"
    )

    assert _moved(tmp_path, "transaction", "2026-03-05") in flat
    assert INIT not in flat and "edit that directive" not in flat
    assert details == [
        f"Proposed append (not written): Invalid reference to inactive account 'Assets:Old' "
        f"{_moved(tmp_path, 'transaction', '2026-03-05')}"
    ]


def test_a_pad_after_the_close_is_told_to_move_the_close(tmp_path: Path) -> None:
    flat, details = _refused(
        tmp_path, "add", "pad", "--date", "2026-03-05", "-a", "Assets:Old", "--source", "Equity:Opening"
    )

    assert _moved(tmp_path, "pad", "2026-03-05") in flat
    assert "Pad accounts must be open on the pad date, 2026-03-05." in flat
    assert INIT not in " ".join(details) and "edit that directive" not in " ".join(details)


def test_bulk_rows_after_the_close_name_the_date_that_admits_every_row(tmp_path: Path) -> None:
    rows = tmp_path / "rows.json"
    rows.write_text(
        json.dumps(
            [
                {
                    "date": day,
                    "narration": day,
                    "postings": [{"account": "Assets:Old", "amount": "1.00 USD"}, {"account": "Assets:Cash"}],
                }
                for day in ("2026-03-05", "2026-03-10")
            ]
        )
    )
    flat, details = _refused(tmp_path, "add", "transactions", "--from", str(rows))

    assert len(details) == 2
    assert all(_moved(tmp_path, "transaction", "2026-03-10") in detail for detail in details)
    assert INIT not in flat


def test_an_update_onto_the_closed_account_is_told_to_move_the_close(tmp_path: Path) -> None:
    content = LEDGER + '\n2026-03-05 * "late"\n  ref: "late-1"\n  Assets:Cash  1.00 USD\n  Equity:Opening\n'
    flat, _ = _refused(
        tmp_path,
        "update",
        "transaction",
        "--id",
        "late-1",
        "--account",
        "Assets:Cash=Assets:Old",
        "--apply",
        content=content,
    )

    assert _moved(tmp_path, "transaction", "2026-03-05") in flat
    assert INIT not in flat


def test_an_entry_before_the_open_keeps_the_init_remedy(tmp_path: Path) -> None:
    flat, _ = _refused(
        tmp_path,
        "add",
        "transaction",
        "early",
        "--date",
        "2025-12-05",
        "-p",
        "Assets:Cash 1.00 USD",
        "-p",
        "Equity:Opening",
    )

    ledger = tmp_path / "books" / "main.bean"
    assert (
        f"Account opened 2026-01-01 at {ledger}:3. "
        "Correct the transaction date or edit that directive; for new books use bea init --date YYYY-MM-DD."
    ) in flat
    assert "move the close" not in flat
