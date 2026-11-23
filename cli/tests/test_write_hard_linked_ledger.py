"""A ledger write refuses to split a hard link instead of silently diverging (w5/391).

Every write installs a validated copy by rename, so the written name got a new
inode and any other hard link kept the old ledger, with exit 0. Like a group
bea cannot keep (w1/099), a property the write would drop is refused: exit 3,
naming the extra link, with both names unchanged.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
LEDGER = (
    'option "operating_currency" "USD"\n2026-01-01 open Assets:Cash USD\n'
    "2026-01-01 open Expenses:Food USD\n2026-01-01 open Expenses:Uncategorized USD\n"
    '2026-01-02 * "misaligned"\n  Expenses:Food      2 USD\n  Assets:Cash  -2 USD\n'
)
ROW = [{"date": "2026-01-06", "narration": "bulk", "postings": [
    {"account": "Expenses:Food", "amount": "3 USD"}, {"account": "Assets:Cash"}]}]  # fmt: skip
WRITES = {
    "add": ("add", "transaction", "X", "--date", "2026-01-05", "-p", "Expenses:Food 1 USD", "-p", "Assets:Cash"),
    "bulk-add": ("add", "transactions", "--from", "rows.json"),
    "import-apply": (
        *("import", "s.csv", "--csv", "date=Date,narration=Description,amount=Amount"),
        *("--account", "Assets:Cash", "--apply"),
    ),
    "format": ("format", "-i", "main.bean"),
    # Updates resolve the entry's file through a symbolic link (w1/363); a hard link is still refused.
    "update": ("update", "transaction", "--id", "main.bean:5", "--flag", "!", "--apply"),
    "bulk-update": ("update", "transactions", "--from", "updates.json", "--apply"),
}


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", "-f", "main.bean", *args],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=120,
        stdin=subprocess.DEVNULL,
    )


def _books(tmp_path: Path) -> Path:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    (tmp_path / "rows.json").write_text(json.dumps(ROW))
    (tmp_path / "updates.json").write_text(json.dumps([{"id": "main.bean:5", "flag": "!"}]))
    (tmp_path / "s.csv").write_text("Date,Description,Amount\n2026-01-07,Shop,-3.00\n")
    return ledger


@pytest.mark.parametrize("write", sorted(WRITES))
def test_a_write_to_a_hard_linked_ledger_is_refused(tmp_path: Path, write: str) -> None:
    ledger = _books(tmp_path)
    twin = tmp_path / "twin.bean"
    os.link(ledger, twin)

    result = _bea(tmp_path, *WRITES[write])

    assert result.returncode == 3, result.stdout + result.stderr
    assert "has 1 other hard link" in result.stderr
    assert ledger.read_text() == LEDGER and twin.read_text() == LEDGER
    assert ledger.stat().st_ino == twin.stat().st_ino
    assert ledger.stat().st_nlink == 2


@pytest.mark.parametrize("write", sorted(WRITES))
def test_a_ledger_with_one_name_is_written_as_before(tmp_path: Path, write: str) -> None:
    ledger = _books(tmp_path)

    result = _bea(tmp_path, *WRITES[write])

    assert result.returncode == 0, result.stderr
    assert ledger.read_text() != LEDGER
