"""A directive word or flag glued to its neighbours is still on disk (w1/114).

Beancount's lexer needs no whitespace between tokens, so `2024-01-05 *"Payee"`,
`2024-01-06 txn"T"`, `2024-01-07*"P"` and `2024-01-01open` all declare real
directives. `entry_generated()` demanded whitespace after the date and compared
the whole whitespace-delimited token with the directive word, so those entries
were reported `generated` and vanished from `--on-disk`.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

from bea_engine.ledger.reader import entry_generated

ROOT = Path(__file__).resolve().parents[1]
LEDGER = (
    "2024-01-01 open Assets:Cash USD\n"
    "2024-01-01open Expenses:Food USD\n"
    '2024-01-05 *"Payee" "nospace"\n  Expenses:Food  1 USD\n  Assets:Cash\n'
    '2024-01-06 txn"T" "txnglued"\n  Expenses:Food  1 USD\n  Assets:Cash\n'
    '2024-01-07*"P" "dateglued"\n  Expenses:Food  1 USD\n  Assets:Cash\n'
    '2024-01-08 * "ok" "control"\n  Expenses:Food  1 USD\n  Assets:Cash\n'
    '2024-01-09note Assets:Cash"glued"\n'
    "2024-01-10price USD 1.0 EUR\n"
)


def _bea(work: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {key: value for key, value in os.environ.items() if not key.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(work / "config"),
        XDG_CACHE_HOME=str(work / "cache"),
        XDG_DATA_HOME=str(work / "data"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=work,
        capture_output=True,
        text=True,
        stdin=subprocess.DEVNULL,
        timeout=60,
    )


def _entry(tmp_path: Path, line: str) -> object:
    source = tmp_path / "main.bean"
    source.write_text(line + "\n", encoding="utf-8")
    return type("E", (), {"meta": {"filename": str(source), "lineno": 1}})()


@pytest.mark.parametrize(
    ("line", "kind"),
    [
        ('2024-01-05 *"Payee" "n"', "transaction"),
        ('2024-01-06 txn"T" "n"', "transaction"),
        ('2024-01-07*"P" "n"', "transaction"),
        ('2024-01-07 !"P" "n"', "transaction"),
        ('2024-01-07 P "P" "n"', "transaction"),
        ("2024-01-01open Assets:Cash USD", "open"),
        ('2024-01-01 note Assets:Cash"x"', "note"),
    ],
)
def test_a_glued_declaration_is_written(tmp_path: Path, line: str, kind: str) -> None:
    assert entry_generated(_entry(tmp_path, line), kind) is False


@pytest.mark.parametrize(
    ("line", "kind"),
    [
        ('2024-01-05 *"Payee" "n"', "price"),
        ('2024-01-05 P"Payee" "n"', "transaction"),
        ('2024-01-05 PX "Payee" "n"', "transaction"),
        ("2024-01-01open Assets:Cash USD", "transaction"),
        ("2024-01-01open Assets:Cash USD", "close"),
    ],
)
def test_a_line_declaring_something_else_is_still_generated(tmp_path: Path, line: str, kind: str) -> None:
    assert entry_generated(_entry(tmp_path, line), kind) is True


def test_no_written_row_is_generated_and_on_disk_keeps_them_all(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER, encoding="utf-8")
    assert _bea(tmp_path, "--file", str(ledger), "check").returncode == 0

    for kind, count in {"transaction": 4, "open": 2, "note": 1, "price": 1}.items():
        listed = _bea(tmp_path, "--json", "--file", str(ledger), "list", kind)
        on_disk = _bea(tmp_path, "--json", "--file", str(ledger), "list", kind, "--on-disk")
        assert listed.returncode == 0, listed.stderr
        assert on_disk.returncode == 0, on_disk.stderr
        rows = json.loads(listed.stdout)["data"]
        assert len(rows) == count, kind
        assert not any(row.get("generated") for row in rows), (kind, rows)
        assert len(json.loads(on_disk.stdout)["data"]) == count, kind
