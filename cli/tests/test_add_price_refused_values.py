"""`add price` and import refuse quotes with no valid value (w1/277).

A negative quote would value a holding below zero — Beancount itself refuses
one on a posting, and `add transaction` passes that refusal on — and a
commodity priced in itself values nothing. Both writers refused neither: each
wrote with exit 0. The refusal lives in one helper both writers share
(`bad_quote_reason`), so `--force` cannot bless a bad value on either path,
and zero stays allowed for a delisted security.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea as _json_bea

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2024-01-01 commodity VTI
2024-01-01 open Assets:Broker:VTI VTI
2024-01-01 open Assets:Cash USD
2024-01-02 * "buy"
  Assets:Broker:VTI  10 VTI {100 USD}
  Assets:Cash  -1000 USD
"""


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
        [sys.executable, "-m", "cli.main", *args],
        cwd=ROOT,
        env=env,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )


def _add_price(tmp_path: Path, ledger: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return _bea(tmp_path, "-f", str(ledger), "add", "price", *args)


@pytest.mark.parametrize("force", [[], ["--force"]], ids=["plain", "forced"])
@pytest.mark.parametrize(
    ("commodity", "amount", "message"),
    [
        ("VTI", "-250 USD", "Negative prices are not allowed: -250 USD."),
        ("USD", "1 USD", "USD cannot be priced in itself."),
    ],
    ids=["negative", "self-quote"],
)
def test_refused_quote_writes_nothing(
    tmp_path: Path, force: list[str], commodity: str, amount: str, message: str
) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    before = ledger.read_bytes()

    result = _add_price(tmp_path, ledger, "--date", "2024-01-03", "-c", commodity, "--amount", amount, *force)

    assert result.returncode == 2, result.stderr
    flat = " ".join(result.stderr.split())
    assert message in flat
    assert "Nothing was written" in flat
    assert ledger.read_bytes() == before


@pytest.mark.parametrize(
    ("date", "amount", "spelling"),
    [("2024-01-05", "0 USD", "0 USD"), ("2024-01-06", "250 USD", "250 USD")],
    ids=["zero", "positive"],
)
def test_zero_and_positive_quotes_still_write(tmp_path: Path, date: str, amount: str, spelling: str) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)

    result = _add_price(tmp_path, ledger, "--date", date, "-c", "VTI", "--amount", amount)

    assert result.returncode == 0, result.stderr
    assert "price VTI" in ledger.read_text() and spelling in ledger.read_text()


IMPORTER = """from datetime import date
from decimal import Decimal
from beancount.core.data import Price, new_metadata
from beancount.core.amount import Amount

class Quotes:
    def identify(self, file): return str(file).endswith('.txt')
    def account(self, file): return 'Assets:Cash'
    def extract(self, file, existing_entries=None):
        return [Price(new_metadata(file, 1), date(2024, 2, 1), '{currency}', Amount(Decimal('{number}'), '{quote}'))]

CONFIG = [Quotes()]
"""
IMPORT_LEDGER = (
    'option "operating_currency" "USD"\n2024-01-01 open Assets:Cash USD\n2024-01-01 open Equity:Opening USD\n'
    '2024-01-02 * "Opening"\n  Assets:Cash 100 USD\n  Equity:Opening -100 USD\n'
)


def _import_books(tmp_path: Path, currency: str, number: str, quote: str) -> None:
    (tmp_path / "main.bean").write_text(IMPORT_LEDGER)
    (tmp_path / "importers.py").write_text(IMPORTER.format(currency=currency, number=number, quote=quote))
    (tmp_path / "quotes.txt").write_text("synthetic\n")


def _rows(result: subprocess.CompletedProcess[str]) -> dict:
    assert result.returncode == 0, result.stderr or result.stdout
    return json.loads(result.stdout)["data"]


@pytest.mark.parametrize(
    ("currency", "number", "quote", "message"),
    [
        ("HOOL", "-5", "USD", "Negative prices are not allowed: -5 USD."),
        ("USD", "1", "USD", "USD cannot be priced in itself."),
    ],
    ids=["negative", "self-quote"],
)
def test_import_marks_a_valueless_quote_conflict(
    tmp_path: Path, currency: str, number: str, quote: str, message: str
) -> None:
    _import_books(tmp_path, currency, number, quote)

    preview = _rows(_json_bea(tmp_path, "import", "quotes.txt", "--config", "importers.py"))

    assert preview["conflicts"] == 1
    (row,) = [row for row in preview["rows"] if row["status"] == "conflict"]
    assert message in " ".join(row["reason"].split())

    before = (tmp_path / "main.bean").read_bytes()
    result = _json_bea(tmp_path, "import", "quotes.txt", "--config", "importers.py", "--apply")

    assert result.returncode == 4, result.stdout
    assert "Import needs review; nothing was written." in " ".join(
        json.loads(result.stderr)["error"]["message"].split()
    )
    assert (tmp_path / "main.bean").read_bytes() == before


def test_import_still_writes_a_good_quote(tmp_path: Path) -> None:
    _import_books(tmp_path, "HOOL", "120", "USD")

    preview = _rows(_json_bea(tmp_path, "import", "quotes.txt", "--config", "importers.py"))

    assert preview["conflicts"] == 0
    assert preview["ready"] == 1
    result = _json_bea(tmp_path, "import", "quotes.txt", "--config", "importers.py", "--apply")

    assert result.returncode == 0, result.stderr or result.stdout
    assert "price HOOL" in (tmp_path / "main.bean").read_text()
