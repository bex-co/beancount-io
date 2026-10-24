"""A hand-written sale whose lots are not in booking order is still a twin of its import (w5/998).

Past twelve booked legs only runs of consecutive legs were tried for each
fill, so a manual sale listing thirteen lots by unit cost matched neither
fill, and importing the same sale as two statement fills wrote it a second time.
"""

from __future__ import annotations

import datetime as dt
import json
from pathlib import Path

import pytest

from tests.test_import_multi_fill_many_lots import IMPORTER
from tests.test_import_source_facts import _bea


def _books(tmp_path: Path, *, by_cost: bool, same_day: bool = False, reference: str = "", change: str = "") -> Path:
    lots = [
        {
            "qty": 2**i,
            "cost": 10 + i // 2 if i % 2 == 0 else 20 + i // 2,
            "date": dt.date(2023, 1, 2) + dt.timedelta(days=0 if same_day else i),
        }
        for i in range(13)
    ]
    quantity = sum(x["qty"] for x in lots)
    basis = sum(x["qty"] * x["cost"] for x in lots)
    base = (
        'option "operating_currency" "USD"\n2023-01-01 open Assets:Cash USD\n'
        '2023-01-01 open Assets:Stock HOOL "FIFO"\n2023-01-01 open Equity:Opening USD\n'
        '2023-01-01 open Income:Gains USD\n2023-01-01 * "Capital"\n'
        "  Assets:Cash 500000.00 USD\n  Equity:Opening -500000.00 USD\n"
    )
    for x in lots:
        base += f'{x["date"]} * "Buy"\n  Assets:Stock {x["qty"]} HOOL {{{x["cost"]} USD}}\n'
        base += f"  Assets:Cash -{x['qty'] * x['cost']}.00 USD\n"
    reserve = dt.date(2023, 1, 2) + dt.timedelta(days=13)
    base += (
        f'{reserve} * "Reserve"\n  Assets:Stock {quantity} HOOL {{10 USD}}\n  Assets:Cash -{quantity * 10}.00 USD\n'
        "2024-02-01 price HOOL 30 USD\n"
    )
    chosen = sorted(lots, key=lambda x: x["cost"]) if by_cost else lots
    manual = '2024-02-01 * "Sale"\n' + "".join(
        f"  Assets:Stock -{x['qty']} HOOL {{{x['cost']} USD, {x['date']}}} @ 30 USD\n" for x in chosen
    )
    manual += f"  Assets:Cash {quantity * 30}.00 USD\n  Income:Gains -{quantity * 30 - basis}.00 USD\n"
    header = '2024-02-01 * "Sale"\n' + (f'  bank_id: "{reference}"\n' if reference else "")
    (tmp_path / "main.bean").write_text(base + manual.replace('2024-02-01 * "Sale"\n', header))
    fills, proceeds, price = (63, quantity - 63), quantity * 30, 30
    if change == "quantity":
        fills, proceeds = (63, quantity - 62), proceeds + 30
    elif change == "price":
        price, proceeds = 31, quantity * 31
    (tmp_path / "sale.statement").write_text(
        header
        + "".join(f"  Assets:Stock -{q} HOOL {{USD}} @ {price} USD\n" for q in fills)
        + f"  Assets:Cash {proceeds}.00 USD\n  Income:Gains\n"
    )
    (tmp_path / "importer.py").write_text(IMPORTER)
    return tmp_path / "main.bean"


@pytest.mark.parametrize("same_day", [False, True], ids=["distinct-dates", "same-day"])
@pytest.mark.parametrize("by_cost", [False, True], ids=["acquisition-order", "cost-order"])
def test_the_already_booked_sale_is_a_possible_duplicate_not_new(tmp_path: Path, by_cost: bool, same_day: bool) -> None:
    """Thirteen lots bought one day and listed by cost put one fill's lots apart in every order (w5/998)."""
    ledger = _books(tmp_path, by_cost=by_cost, same_day=same_day)
    before = ledger.read_bytes()

    preview = _bea(tmp_path, "import", "sale.statement", "--config", "importer.py")
    applied = _bea(tmp_path, "import", "sale.statement", "--config", "importer.py", "--apply")
    skipped = _bea(tmp_path, "import", "sale.statement", "--config", "importer.py", "--duplicates", "skip", "--apply")

    assert [row["status"] for row in json.loads(preview.stdout)["data"]["rows"]] == ["possible_duplicate"]
    assert applied.returncode == 4, applied.stdout
    assert json.loads(skipped.stdout)["data"]["written"] == 0
    assert ledger.read_bytes() == before


@pytest.mark.parametrize("same_day", [False, True], ids=["distinct-dates", "same-day"])
def test_the_same_native_reference_repeats_as_a_duplicate(tmp_path: Path, same_day: bool) -> None:
    ledger = _books(tmp_path, by_cost=True, same_day=same_day, reference="B1")
    before = ledger.read_bytes()

    repeat = _bea(tmp_path, "import", "sale.statement", "--config", "importer.py", "--apply")

    assert repeat.returncode == 0, repeat.stdout
    assert [row["status"] for row in json.loads(repeat.stdout)["data"]["rows"]] == ["duplicate"]
    assert json.loads(repeat.stdout)["data"]["written"] == 0
    assert ledger.read_bytes() == before


@pytest.mark.parametrize("change", ["quantity", "price"])
def test_a_genuine_correction_under_the_reference_still_conflicts(tmp_path: Path, change: str) -> None:
    ledger = _books(tmp_path, by_cost=True, same_day=True, reference="B1", change=change)
    before = ledger.read_bytes()

    preview = _bea(tmp_path, "import", "sale.statement", "--config", "importer.py")
    applied = _bea(tmp_path, "import", "sale.statement", "--config", "importer.py", "--apply")

    assert [row["status"] for row in json.loads(preview.stdout)["data"]["rows"]] == ["conflict"]
    assert applied.returncode == 4, applied.stdout
    assert ledger.read_bytes() == before


ONE_LOT = """option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
2024-01-01 open Assets:Stock HOOL "FIFO"
2024-01-01 open Equity:Opening USD
2024-01-01 open Income:Gains USD
2024-01-01 * "Capital"
  Assets:Cash 1000.00 USD
  Equity:Opening -1000.00 USD
2024-01-02 * "Purchase"
  Assets:Stock 4 HOOL {10 USD}
  Assets:Cash -40.00 USD
2024-01-03 * "Reserve"
  Assets:Stock 4 HOOL {10 USD}
  Assets:Cash -40.00 USD
2024-02-01 price HOOL 20 USD
"""


def _one_lot(
    tmp_path: Path, written: tuple[int, ...], fills: tuple[int, ...], selector: str, reference: str, change: str = ""
) -> Path:
    header = '2024-02-01 * "Sale"\n' + (f'  bank_id: "{reference}"\n' if reference else "")
    manual = header + "".join(f"  Assets:Stock -{q} HOOL {{10 USD, 2024-01-02}} @ 20 USD\n" for q in written)
    price, proceeds = 20, 80
    if change == "quantity":
        fills, proceeds = (*fills[:-1], fills[-1] + 1), 100
    elif change == "price":
        price, proceeds = 21, 84
    sale = header + "".join(f"  Assets:Stock -{q} HOOL {{{selector}}} @ {price} USD\n" for q in fills)
    (tmp_path / "main.bean").write_text(ONE_LOT + manual + "  Assets:Cash 80.00 USD\n  Income:Gains -40.00 USD\n")
    (tmp_path / "sale.statement").write_text(sale + f"  Assets:Cash {proceeds}.00 USD\n  Income:Gains\n")
    (tmp_path / "importer.py").write_text(IMPORTER)
    return tmp_path / "main.bean"


@pytest.mark.parametrize("reference", ["", "B1"], ids=["no-id", "native-id"])
@pytest.mark.parametrize(
    ("written", "fills", "selector"),
    [
        ((4,), (1, 3), "USD"),
        ((4,), (1, 3), "10 USD"),
        ((1, 3), (1, 3), "USD"),
        ((4,), (4,), "USD"),
        ((1, 3), (4,), "USD"),
    ],
    ids=["split-open", "split-known", "recorded-split", "source-one", "recorded-split-one"],
)
def test_fills_of_one_lot_match_however_the_sale_groups_them(
    tmp_path: Path, written: tuple[int, ...], fills: tuple[int, ...], selector: str, reference: str
) -> None:
    """One written -4 HOOL reduction is the -1 and -3 fills its statement lists, and back (w5/998)."""
    ledger = _one_lot(tmp_path, written, fills, selector, reference)
    before = ledger.read_bytes()
    args = ["import", "sale.statement", "--config", "importer.py"]

    preview = _bea(tmp_path, *args)
    applied = _bea(tmp_path, *args, "--apply")
    skipped = _bea(tmp_path, *args, "--duplicates", "skip", "--apply")

    status = "duplicate" if reference else "possible_duplicate"
    assert [row["status"] for row in json.loads(preview.stdout)["data"]["rows"]] == [status]
    assert applied.returncode == (0 if reference else 4), applied.stdout
    assert json.loads(skipped.stdout)["data"]["written"] == 0
    assert ledger.read_bytes() == before


@pytest.mark.parametrize("change", ["quantity", "price"])
def test_a_changed_fill_of_one_lot_still_conflicts(tmp_path: Path, change: str) -> None:
    ledger = _one_lot(tmp_path, (4,), (1, 3), "USD", "B1", change=change)
    before = ledger.read_bytes()

    preview = _bea(tmp_path, "import", "sale.statement", "--config", "importer.py")
    applied = _bea(tmp_path, "import", "sale.statement", "--config", "importer.py", "--apply")

    assert [row["status"] for row in json.loads(preview.stdout)["data"]["rows"]] == ["conflict"]
    assert applied.returncode == 4, applied.stdout
    assert ledger.read_bytes() == before


CASH = """option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
2024-01-01 open Assets:Broker USD
2024-01-01 open Expenses:Fees USD
2024-01-01 open Equity:Opening USD
2024-01-01 * "Capital"
  Assets:Cash 1000.00 USD
  Equity:Opening -1000.00 USD
"""
BANK = """from beancount.parser import parser
class Bank:
    name = "local-cash"
    def identify(self, file): return str(file).endswith(".statement")
    def account(self, file): return "Assets:Cash"
    def extract(self, file, existing_entries=None):
        entries, errors, _ = parser.parse_file(str(file)); assert not errors, errors; return entries
CONFIG = [Bank()]
"""


def _funding(parts: tuple[int, ...], reference: str, fee: int = 4) -> str:
    header = '2024-02-01 * "Funding with fee"\n' + (f'  bank_id: "{reference}"\n' if reference else "")
    cash = "".join(f"  Assets:Cash -{n}.00 USD\n" for n in parts)
    return header + cash + f"  Assets:Broker 100.00 USD\n  Expenses:Fees {fee}.00 USD\n"


@pytest.mark.parametrize("reference", ["", "B1"], ids=["no-id", "native-id"])
@pytest.mark.parametrize(
    ("written", "statement"),
    [((104,), (100, 4)), ((100, 4), (104,)), ((100, 4), (100, 4)), ((104,), (104,))],
    ids=["source-split", "recorded-split", "both-split", "both-single"],
)
def test_a_withdrawal_matches_however_its_cash_is_grouped(
    tmp_path: Path, written: tuple[int, ...], statement: tuple[int, ...], reference: str
) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(CASH + _funding(written, reference))
    (tmp_path / "payment.statement").write_text(_funding(statement, reference))
    (tmp_path / "importer.py").write_text(BANK)
    before = ledger.read_bytes()
    args = ["import", "payment.statement", "--config", "importer.py"]

    preview = _bea(tmp_path, *args)
    applied = _bea(tmp_path, *args, "--apply")
    skipped = _bea(tmp_path, *args, "--duplicates", "skip", "--apply")

    status = "duplicate" if reference else "possible_duplicate"
    assert [row["status"] for row in json.loads(preview.stdout)["data"]["rows"]] == [status]
    assert applied.returncode == (0 if reference else 4), applied.stdout
    assert json.loads(skipped.stdout)["data"]["written"] == 0
    assert ledger.read_bytes() == before


@pytest.mark.parametrize("written", [(104,), (100, 4)], ids=["single", "split"])
def test_a_changed_fee_under_the_reference_still_conflicts(tmp_path: Path, written: tuple[int, ...]) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(CASH + _funding(written, "B1"))
    changed = (105,) if written == (104,) else (100, 5)
    (tmp_path / "payment.statement").write_text(_funding(changed, "B1", fee=5))
    (tmp_path / "importer.py").write_text(BANK)
    before = ledger.read_bytes()

    applied = _bea(tmp_path, "import", "payment.statement", "--config", "importer.py", "--apply")

    assert applied.returncode == 4, applied.stdout
    assert ledger.read_bytes() == before


MIXED_SELECTORS = {
    "open-known": ("USD", "10 USD, 2024-01-02"),
    "empty-known": ("", "10 USD, 2024-01-02"),
    "known-date": ("10 USD", "10 USD, 2024-01-02"),
    "same-known": ("10 USD, 2024-01-02", "10 USD, 2024-01-02"),
    "recorded-mixed": ("USD", "10 USD, 2024-01-02"),
    "changed-date": ("USD", "10 USD, 2024-01-03"),
}


def _mixed(tmp_path: Path, mode: str, reference: str) -> Path:
    written = (1, 3) if mode == "recorded-mixed" else (4,)
    header = '2024-02-01 * "Sale"\n' + (f'  bank_id: "{reference}"\n' if reference else "")
    manual = header + "".join(f"  Assets:Stock -{q} HOOL {{10 USD, 2024-01-02}} @ 20 USD\n" for q in written)
    sale = header + "".join(
        f"  Assets:Stock -{q} HOOL {{{selector}}} @ 20 USD\n"
        for q, selector in zip((1, 3), MIXED_SELECTORS[mode], strict=True)
    )
    books = ONE_LOT.replace(
        "4 HOOL {10 USD}\n  Assets:Cash -40.00 USD\n2024-01-03", "8 HOOL {10 USD}\n  Assets:Cash -80.00 USD\n2024-01-03"
    )
    (tmp_path / "main.bean").write_text(books + manual + "  Assets:Cash 80.00 USD\n  Income:Gains -40.00 USD\n")
    (tmp_path / "sale.statement").write_text(sale + "  Assets:Cash 80.00 USD\n  Income:Gains\n")
    (tmp_path / "importer.py").write_text(IMPORTER)
    return tmp_path / "main.bean"


@pytest.mark.parametrize("reference", ["", "B1"], ids=["no-id", "native-id"])
@pytest.mark.parametrize("mode", [mode for mode in MIXED_SELECTORS if mode != "changed-date"])
def test_differently_selected_fills_of_one_lot_share_its_written_reduction(
    tmp_path: Path, mode: str, reference: str
) -> None:
    """An open fill takes what a dated fill leaves of the one written -4 HOOL reduction (w5/998)."""
    ledger = _mixed(tmp_path, mode, reference)
    before = ledger.read_bytes()
    args = ["import", "sale.statement", "--config", "importer.py"]

    preview = _bea(tmp_path, *args)
    applied = _bea(tmp_path, *args, "--apply")

    status = "duplicate" if reference else "possible_duplicate"
    assert [row["status"] for row in json.loads(preview.stdout)["data"]["rows"]] == [status]
    assert applied.returncode == (0 if reference else 4), applied.stdout
    assert ledger.read_bytes() == before


@pytest.mark.parametrize(("reference", "status"), [("", "new"), ("B1", "conflict")], ids=["no-id", "native-id"])
def test_a_fill_from_another_dated_lot_is_still_a_different_sale(tmp_path: Path, reference: str, status: str) -> None:
    _mixed(tmp_path, "changed-date", reference)

    preview = _bea(tmp_path, "import", "sale.statement", "--config", "importer.py")

    assert [row["status"] for row in json.loads(preview.stdout)["data"]["rows"]] == [status]
