"""note/event/custom string fields flatten CR/LF like narration (w3/252)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
2024-01-01 open Expenses:Transport USD
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
        timeout=30,
    )


def test_note_event_custom_flatten_newlines(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)

    note = _bea(
        tmp_path,
        "--json",
        "--file",
        str(ledger),
        "add",
        "note",
        "--date",
        "2024-04-01",
        "--account",
        "Assets:Cash",
        "--comment",
        "line1\nline2",
    )
    assert note.returncode == 0, note.stderr
    assert json.loads(note.stdout)["data"]["directive"]["comment"] == "line1 line2"
    assert 'note Assets:Cash "line1 line2"' in ledger.read_text()
    assert "\nline2" not in ledger.read_text().split("note", 1)[-1][:40]

    event = _bea(
        tmp_path,
        "--json",
        "--file",
        str(ledger),
        "add",
        "event",
        "--date",
        "2024-04-11",
        "--type",
        "location",
        "--description",
        "SF\nCA",
    )
    assert event.returncode == 0, event.stderr
    assert json.loads(event.stdout)["data"]["directive"]["description"] == "SF CA"

    custom = _bea(
        tmp_path,
        "--json",
        "--file",
        str(ledger),
        "add",
        "custom",
        "--date",
        "2024-04-20",
        "--type",
        "budget",
        "--value",
        "text:hello\nworld",
    )
    assert custom.returncode == 0, custom.stderr
    text = ledger.read_text()
    assert 'custom "budget" "hello world"' in text
    assert _bea(tmp_path, "--file", str(ledger), "check").returncode == 0


def test_bulk_json_flattens_narration_like_the_flag_path(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    rows = tmp_path / "rows.json"
    rows.write_text(
        json.dumps(
            [
                {
                    "date": "2024-05-01",
                    "narration": "bulk1\nbulk2",
                    "postings": [
                        {"account": "Expenses:Transport", "amount": "3 USD"},
                        {"account": "Assets:Cash", "amount": "-3 USD"},
                    ],
                }
            ]
        )
    )

    result = _bea(tmp_path, "--file", str(ledger), "add", "transactions", "--from", str(rows))

    assert result.returncode == 0, result.stderr
    assert '"bulk1 bulk2"' in ledger.read_text()
    assert _bea(tmp_path, "--file", str(ledger), "check").returncode == 0
