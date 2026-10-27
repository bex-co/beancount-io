"""A rules file refuses tables and keys it does not define (w5/338).

A misspelled `[[rules]]` dropped every rule under it and booked those rows to
the default account with exit 0; a rule's `field = "narration"` read like a
restriction and did nothing.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Checking USD
2026-01-01 open Expenses:Groceries USD
2026-01-01 open Expenses:Dining USD
2026-01-01 open Expenses:Uncategorized USD
"""
GOOD = '[[rule]]\nmatch = "whole foods"\naccount = "Expenses:Groceries"\n'
RULES = {
    "misspelled-table": (
        GOOD + '\n[[rules]]\nmatch = "diner"\naccount = "Expenses:Dining"\n',
        "unknown table [[rules]]; a rules file holds only [[rule]] entries — did you mean [[rule]]?",
    ),
    "capitalised-table": (
        '[[Rule]]\nmatch = "diner"\naccount = "Expenses:Dining"\n',
        "unknown table [[Rule]]; a rules file holds only [[rule]] entries — did you mean [[rule]]?",
    ),
    "unknown-rule-key": (
        '[[rule]]\nmatch = "diner"\naccount = "Expenses:Dining"\nfield = "narration"\n',
        "rule 1 has unknown key 'field'; each rule holds only match and account, and optionally client and project.",
    ),
}


def _import(tmp_path: Path, rules: Path, *flags: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    mapping = ["--csv", "date=Date,payee=Payee,narration=Narration,amount=Amount", "--account", "Assets:Checking"]
    return subprocess.run(
        [
            sys.executable,
            "-m",
            "cli.main",
            "--no-input",
            "-f",
            "main.bean",
            "import",
            "s.csv",
            *mapping,
            "--rules",
            str(rules),
            *flags,
        ],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=120,
        stdin=subprocess.DEVNULL,
    )


@pytest.fixture
def books(tmp_path: Path) -> Path:
    (tmp_path / "main.bean").write_text(LEDGER)
    (tmp_path / "s.csv").write_text(
        "Date,Payee,Narration,Amount\n"
        "2026-01-05,Whole Foods,lunch at cafe,-20.00\n"
        "2026-01-06,Joe Diner,groceries run,-10.00\n"
    )
    return tmp_path


@pytest.mark.parametrize("case", sorted(RULES))
def test_an_undefined_table_or_key_is_refused(books: Path, case: str) -> None:
    text, expected = RULES[case]
    (books / "rules.toml").write_text(text)
    result = _import(books, books / "rules.toml", "--apply")
    assert result.returncode == 2, result.stdout + result.stderr
    assert expected in " ".join(result.stderr.split())
    assert (books / "main.bean").read_text() == LEDGER
    assert not list((books / "config").rglob("*import*"))


def test_the_bundled_example_still_loads(books: Path) -> None:
    result = _import(books, ROOT / "docs" / "examples" / "rules.toml")
    assert result.returncode == 0, result.stderr
