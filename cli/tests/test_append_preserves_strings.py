"""Appends write string content exactly: no foreign line breaks, no re-indented continuations (w1/136).

`appended_content` split appended text with `str.splitlines`, which also
breaks on U+2028/U+2029, so a narration typed as one line was written as two;
and it re-indented and aligned every indented line, including the lines of a
multi-line string, so approved note text came back changed.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

from bea_engine.ledger import write

ROOT = Path(__file__).resolve().parents[1]

HEADER = (
    'option "operating_currency" "USD"\n'
    "2020-01-01 open Assets:Cash USD\n"
    "2020-01-01 open Expenses:Food USD\n"
    "2020-01-01 open Expenses:Uncategorized USD\n"
)


def _ledger(tmp_path: Path) -> Path:
    ledger = tmp_path / "u.bean"
    ledger.write_text(HEADER, encoding="utf-8")
    return ledger


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
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


def _rows(tmp_path: Path, ledger: Path, kind: str) -> list[dict]:
    done = _bea(tmp_path, "--json", "--file", str(ledger), "list", kind)
    assert done.returncode == 0, done.stderr
    return list(json.loads(done.stdout)["data"])


def test_add_note_keeps_a_paragraph_separator_inside_its_string(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)
    comment = "a\u2029      Assets:Cash     9 USD"

    done = _bea(
        tmp_path, "--file", str(ledger), "add", "note", "--date", "2020-02-01", "-a", "Assets:Cash", "-m", comment
    )

    assert done.returncode == 0, done.stderr
    assert [row["comment"] for row in _rows(tmp_path, ledger, "note")] == [comment]
    assert len(ledger.read_text(encoding="utf-8").split("\n")) == len(HEADER.split("\n")) + 2


def test_add_transaction_keeps_a_line_separator_inside_its_narration(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)
    narration = "first\u2028second"

    done = _bea(
        tmp_path,
        "--file",
        str(ledger),
        "add",
        "transaction",
        "--date",
        "2020-02-02",
        "--narration",
        narration,
        "-p",
        "Expenses:Food 1 USD",
        "-p",
        "Assets:Cash",
    )

    assert done.returncode == 0, done.stderr
    assert [row["narration"] for row in _rows(tmp_path, ledger, "transaction")] == [narration]


def test_import_keeps_a_line_separator_inside_a_description(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)
    csv = tmp_path / "bank.csv"
    csv.write_text("Date,Description,Amount\n2020-03-01,COFFEE\u2028SHOP,-4.00\n", encoding="utf-8")

    done = _bea(
        tmp_path,
        "--file",
        str(ledger),
        "import",
        str(csv),
        "--csv",
        "date=Date,narration=Description,amount=Amount",
        "--account",
        "Assets:Cash",
        "--apply",
    )

    assert done.returncode == 0, done.stderr
    assert [row["narration"] for row in _rows(tmp_path, ledger, "transaction")] == ["COFFEE\u2028SHOP"]


def test_append_keeps_multi_line_string_content_verbatim(tmp_path: Path) -> None:
    """The helper `bea ask` writes through: continuation lines are content, not postings."""
    ledger = _ledger(tmp_path)
    note = '2020-02-03 note Assets:Cash "refund details\n      Assets:Cash      10 USD refunded\n   keep this indent"\n'

    write.append(ledger, [note])

    assert ledger.read_text(encoding="utf-8").endswith("\n" + note)
