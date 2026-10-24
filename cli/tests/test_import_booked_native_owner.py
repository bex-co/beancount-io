"""A written native-ID row whose source amount booking infers keeps its ID when a plugin hides it (w5/974).

The written-view index completed a row's omitted Cash amount by summing its
other postings, and dropped the row when that could not say what booking
would: an open lot selector (`{}`) leaves the repaid lot's cost to booking,
and a bare Cash posting beside counter-postings in two currencies books one
Cash leg per currency. With a display filter hiding the row, nothing owned
the bank ID, so the identical statement was written again (Cash 1,045 to 980,
B1 twice) and a correction under the same ID was written as new.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

SPEC = "date=Date,narration=Description,amount=Amount,id=Reference"
VIEW = """from beancount.core.data import Transaction
__plugins__ = ("view",)
def view(entries, options, mode):
    return [e for e in entries if not (mode == "filter" and isinstance(e, Transaction) and e.narration == "Source")], []
"""
SETTINGS = 'option "insert_pythonpath" "TRUE"\nplugin "qa_view" "filter"\n'
LOAN = """option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
2024-01-01 open Liabilities:Loan EUR "FIFO"
2024-01-01 open Expenses:FX USD
2024-01-01 open Equity:Opening USD
2024-01-01 * "Capital"
  Assets:Cash 1000.00 USD
  Equity:Opening -1000.00 USD
2024-01-02 * "Borrow"
  Liabilities:Loan -100 EUR {1.10 USD, 2024-01-02, "Loan"}
  Assets:Cash 110.00 USD
2024-02-01 * "Source"
  bank_id: "B1"
  CASH
  Liabilities:Loan 50 EUR COST @ 1.30 USD
  Expenses:FX 10.00 USD
"""
SALE = """option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
2024-01-01 open Assets:Stock HOOL "FIFO"
2024-01-01 open Income:Gains USD
2024-01-01 open Equity:Opening USD
2024-01-01 * "Capital"
  Assets:Cash 5000.00 USD
  Equity:Opening -5000.00 USD
2024-01-02 * "Buy"
  Assets:Stock 10 HOOL {100 USD, 2024-01-02, "Lot"}
  Assets:Cash -1000.00 USD
2024-02-01 * "Source"
  bank_id: "B1"
  Assets:Cash
  Assets:Stock -2 HOOL {} @ 150 USD
  Income:Gains -100.00 USD
"""
SELECTORS = {"open": "{}", "currency": "{USD}", "label": '{USD, 2024-01-02, "Loan"}'}
CASH = {"bare": "Assets:Cash", "currency-only": "Assets:Cash USD"}
PURCHASE = """option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD, EUR
2024-01-01 open Expenses:Food USD, EUR
2024-01-01 open Equity:Opening USD, EUR
2024-01-01 * "Capital"
  Assets:Cash 100.00 USD
  Assets:Cash 200.00 EUR
  Equity:Opening -100.00 USD
  Equity:Opening -200.00 EUR
2024-02-01 * "Source"
  bank_id: "B1"
"""
# The authored Cash posting, the counter-postings, and the Cash legs booking gives it.
LAYOUTS = {
    "two-currencies": (
        "  Assets:Cash\n",
        "  Expenses:Food 10.00 USD\n  Expenses:Food 20.00 EUR\n",
        "  Assets:Cash -10.00 USD\n  Assets:Cash -20.00 EUR\n",
    ),
    "cancelling-counter": (
        "  Assets:Cash\n",
        "  Expenses:Food 10.00 USD\n  Expenses:Food -10.00 USD\n  Expenses:Food 20.00 EUR\n",
        "  Assets:Cash -20.00 EUR\n",
    ),
    "cancelling-counter-currency-only": (
        "  Assets:Cash EUR\n",
        "  Expenses:Food 10.00 USD\n  Expenses:Food -10.00 USD\n  Expenses:Food 20.00 EUR\n",
        "  Assets:Cash -20.00 EUR\n",
    ),
}
IMPORTER = """from beancount.parser import parser
class R:
    def identify(self, path): return str(path).endswith(".statement")
    def account(self, path): return "Assets:Cash"
    def extract(self, path, existing_entries=None):
        entries, errors, _ = parser.parse_file(str(path))
        assert not errors, errors
        return entries
CONFIG = [R()]
"""


def _loan(tmp_path: Path, selector: str, cash: str) -> Path:
    (tmp_path / "qa_view.py").write_text(VIEW)
    ledger = tmp_path / "main.bean"
    ledger.write_text(SETTINGS + LOAN.replace("CASH", cash).replace("COST", selector))
    return ledger


def _repay(tmp_path: Path, amount: str, *flags: str) -> object:
    (tmp_path / "bank.csv").write_text(f"Date,Description,Amount,Reference\n2024-02-01,Loan repayment,{amount},B1\n")
    return _bea(
        tmp_path, "import", "bank.csv", "--csv", SPEC, "--account", "Assets:Cash",
        "--default-account", "Expenses:FX", *flags,
    )  # fmt: skip


def _purchase(tmp_path: Path, layout: str) -> Path:
    cash, counter, _ = LAYOUTS[layout]
    (tmp_path / "qa_view.py").write_text(VIEW)
    (tmp_path / "importer.py").write_text(IMPORTER)
    ledger = tmp_path / "main.bean"
    ledger.write_text(SETTINGS + PURCHASE + cash + counter)
    return ledger


def _statement(tmp_path: Path, layout: str, *flags: str, change: bool = False) -> object:
    _, counter, booked = LAYOUTS[layout]
    if change:
        booked = booked.replace("-20.00 EUR", "-21.00 EUR")
        counter += "  Expenses:Food 1.00 EUR\n"
    (tmp_path / "bank.statement").write_text('2024-02-01 * "Imported purchase"\n  bank_id: "B1"\n' + booked + counter)
    return _bea(tmp_path, "import", "bank.statement", "--config", "importer.py", *flags)


def _written(result: object) -> int:
    assert result.returncode == 0, result.stderr or result.stdout  # type: ignore[attr-defined]
    return int(json.loads(result.stdout)["data"]["written"])  # type: ignore[attr-defined]


@pytest.mark.parametrize("flags", [["--apply"], ["--apply", "--duplicates", "skip"]], ids=["default", "skip"])
@pytest.mark.parametrize("cash", list(CASH))
@pytest.mark.parametrize("selector", list(SELECTORS))
def test_a_hidden_repayment_whose_cash_the_lot_infers_is_not_written_again(
    tmp_path: Path, selector: str, cash: str, flags: list[str]
) -> None:
    ledger = _loan(tmp_path, SELECTORS[selector], CASH[cash])
    before = ledger.read_bytes()

    assert _written(_repay(tmp_path, "-65.00", *flags)) == 0
    assert ledger.read_bytes() == before


def test_a_hidden_sale_receipt_whose_cash_the_lot_infers_is_not_written_again(tmp_path: Path) -> None:
    (tmp_path / "qa_view.py").write_text(VIEW)
    ledger = tmp_path / "main.bean"
    ledger.write_text(SETTINGS + SALE)
    before = ledger.read_bytes()

    def receive(amount: str) -> object:
        (tmp_path / "bank.csv").write_text(f"Date,Description,Amount,Reference\n2024-02-01,Stock sale,{amount},B1\n")
        return _bea(
            tmp_path, "import", "bank.csv", "--csv", SPEC, "--account", "Assets:Cash",
            "--default-account", "Income:Gains", "--apply",
        )  # fmt: skip

    assert _written(receive("300.00")) == 0
    assert receive("301.00").returncode == 4  # type: ignore[attr-defined]
    assert ledger.read_bytes() == before


def test_a_first_correction_under_the_hidden_reference_conflicts(tmp_path: Path) -> None:
    ledger = _loan(tmp_path, "{}", "Assets:Cash")
    before = ledger.read_bytes()

    preview = _repay(tmp_path, "-66.00")
    changed = _repay(tmp_path, "-66.00", "--apply")

    assert json.loads(preview.stdout)["data"]["rows"][0]["status"] == "conflict"  # type: ignore[attr-defined]
    assert changed.returncode == 4, changed.stdout  # type: ignore[attr-defined]
    assert ledger.read_bytes() == before


def test_a_new_reference_beside_the_hidden_one_is_still_written(tmp_path: Path) -> None:
    _loan(tmp_path, "{}", "Assets:Cash")
    (tmp_path / "bank.csv").write_text("Date,Description,Amount,Reference\n2024-02-01,Loan repayment,-65.00,B2\n")

    result = _bea(
        tmp_path, "import", "bank.csv", "--csv", SPEC, "--account", "Assets:Cash",
        "--default-account", "Expenses:FX", "--apply",
    )  # fmt: skip

    assert _written(result) == 1


@pytest.mark.parametrize("layout", list(LAYOUTS))
def test_a_hidden_purchase_whose_cash_books_by_currency_is_not_written_again(tmp_path: Path, layout: str) -> None:
    ledger = _purchase(tmp_path, layout)
    before = ledger.read_bytes()

    assert _written(_statement(tmp_path, layout, "--apply")) == 0
    changed = _statement(tmp_path, layout, "--apply", change=True)

    assert changed.returncode == 4, changed.stdout  # type: ignore[attr-defined]
    assert ledger.read_bytes() == before
