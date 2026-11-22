"""A legal camelCase `--id-key` is used verbatim, and an illegal one is refused first (w5/604).

w5/469 folded every key whose lowercase form is a default, so `fitId`, a
key a ledger may carry, became `fitid`. Native-ID matching on it went off:
a reused id with changed data was written beside its entry with exit 0.
The refusal of a key no entry can carry ran only after the importer's
`extract()`, whose side effects stayed behind.
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
2026-01-01 open Expenses:Uncategorized USD

2026-02-01 * "COFFEE"
  fitId: "F1"
  Assets:Checking          -4.50 USD
  Expenses:Uncategorized    4.50 USD
"""
IMPORTER = """import csv, datetime, pathlib
from decimal import Decimal
from beancount.core import amount, data


class Bank:
    name = "bank"

    def identify(self, filepath):
        return filepath.endswith(".csv")

    def account(self, filepath):
        return "Assets:Checking"

    def extract(self, filepath, existing):
        pathlib.Path(filepath).with_name("extracted.marker").write_text("ran\\n")
        out = []
        with open(filepath) as handle:
            for index, row in enumerate(csv.DictReader(handle), start=2):
                meta = data.new_metadata(filepath, index)
                meta["fitId"] = row["Ref"]
                number = Decimal(row["Amount"])
                postings = [
                    data.Posting("Assets:Checking", amount.Amount(number, "USD"), None, None, None, None),
                    data.Posting("Expenses:Uncategorized", amount.Amount(-number, "USD"), None, None, None, None),
                ]
                out.append(data.Transaction(meta, datetime.date.fromisoformat(row["Date"]), "*", None,
                                            row["Description"], frozenset(), frozenset(), postings))
        return out


CONFIG = [Bank()]
"""


@pytest.fixture
def books(tmp_path: Path) -> Path:
    (tmp_path / "main.bean").write_text(LEDGER)
    (tmp_path / "importers.py").write_text(IMPORTER)
    return tmp_path


def _import(books: Path, amount: str, *args: str) -> subprocess.CompletedProcess[str]:
    (books / "s.csv").write_text(f"Date,Description,Amount,Ref\n2026-02-01,COFFEE,{amount},F1\n")
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_") and k != "CI"}
    env.update(
        BEA_CONFIG_DIR=str(books / "config"),
        XDG_CACHE_HOME=str(books / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return subprocess.run(
        [
            sys.executable,
            "-m",
            "cli.main",
            "-f",
            str(books / "main.bean"),
            "import",
            "s.csv",
            "--config",
            "importers.py",
            "--apply",
            *args,
        ],
        cwd=books,
        env=env,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )


def test_a_camel_case_key_keeps_the_conflict(books: Path) -> None:
    result = _import(books, "-9.99", "--id-key", "fitId")

    assert result.returncode == 4, result.stdout + result.stderr
    assert "Row 1 (conflict): Stable ID matches an entry with different transaction data." in result.stderr
    assert (books / "main.bean").read_text() == LEDGER


def test_a_camel_case_key_re_import_is_an_exact_duplicate(books: Path) -> None:
    result = _import(books, "-4.50", "--id-key", "fitId")

    assert result.returncode == 0, result.stdout + result.stderr
    assert "0 ready, 1 exact duplicates" in result.stdout
    assert (books / "main.bean").read_text() == LEDGER


def test_an_illegal_key_is_refused_before_the_importer_runs(books: Path) -> None:
    result = _import(books, "-9.99", "--id-key", "Ref")

    assert result.returncode == 2, result.stdout + result.stderr
    assert "--id-key 'Ref' is not a metadata key" in result.stderr
    assert not (books / "extracted.marker").exists()
