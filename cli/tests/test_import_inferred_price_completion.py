"""Posting prices booking infers are completed as native booking completes them (w5/995).

The import helper solved an omitted `@ USD` / `@@ USD` only beside plain cash
legs in the price's own currency, only when it was the transaction's single
open price, only when the quotient multiplied back exactly, and never when it
was zero. Each left a native-determined price out of the row's identity, so a
second purchase at another price was skipped as a duplicate (exit 0, even with
`--duplicates include`), a repricing under one bank ID was skipped instead of
conflicting, and an explicit `@ 0 USD` restatement of a free acquisition
conflicted with the inferred original.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from tests.test_add_import_inferred_cost_completion import IMPORTER, OPENS, _trade, _written
from tests.test_import_source_facts import _bea

LEDGER = OPENS + "2024-01-01 open Expenses:Fees EUR\n"
MARKERS = ["@", "@@"]


def _import(tmp_path: Path, name: str, legs: list[str], *flags: str, bank: bool = False) -> Any:
    (tmp_path / "importer.py").write_text(IMPORTER)
    (tmp_path / f"{name}.trade").write_text(_trade(legs, bank=bank))
    return _bea(tmp_path, "import", f"{name}.trade", "--config", "importer.py", *flags)


def _two_trades(tmp_path: Path, first: list[str], second: list[str], *, bank: bool) -> None:
    """Two trades the cash prices differently are two rows, or a conflict under one bank ID."""
    (tmp_path / "main.bean").write_text(LEDGER)
    assert _written(_import(tmp_path, "a", first, "--apply", bank=bank)) == 1
    assert _written(_import(tmp_path, "a", first, "--apply", bank=bank)) == 0
    before = (tmp_path / "main.bean").read_bytes()
    result = _import(tmp_path, "b", second, "--apply", bank=bank)
    if bank:
        assert result.returncode == 4, result.stdout
        assert (tmp_path / "main.bean").read_bytes() == before
    else:
        assert json.loads(result.stdout)["data"]["rows"][0]["status"] == "new", result.stdout
        assert _written(result) == 1
        assert _written(_import(tmp_path, "b", second, "--apply")) == 0
        assert _bea(tmp_path, "check").returncode == 0


def _cash(tmp_path: Path) -> list[Any]:
    result = _bea(tmp_path, "query", "SELECT currency, sum(number) WHERE account = 'Assets:Cash' GROUP BY currency")
    return sorted(json.loads(result.stdout)["data"]["rows"])


@pytest.mark.parametrize("bank", [False, True], ids=["generated", "bank"])
@pytest.mark.parametrize("marker", MARKERS)
@pytest.mark.parametrize("other", ["cost", "price"])
def test_a_price_is_solved_beside_costed_and_priced_legs(tmp_path: Path, other: str, marker: str, bank: bool) -> None:
    def legs(index: int) -> list[str]:
        source = f"Assets:Broker 2 HOOL {marker} USD"
        if other == "cost":
            return [source, "Assets:Bond 1 BOND {1.00 USD}", f"Assets:Cash {('-11.50', '-21.50')[index]} USD"]
        return [source, f"Assets:Cash {('-10.00', '-20.00')[index]} EUR @ 1.25 USD"]

    _two_trades(tmp_path, legs(0), legs(1), bank=bank)
    if not bank:
        expected = (
            [["EUR", "1000.00"], ["USD", "967.00"]] if other == "cost" else [["EUR", "970.00"], ["USD", "1000.00"]]
        )
        assert _cash(tmp_path) == expected


@pytest.mark.parametrize("bank", [False, True], ids=["generated", "bank"])
@pytest.mark.parametrize("marker", MARKERS)
def test_a_repeating_unit_price_is_the_one_booking_infers(tmp_path: Path, marker: str, bank: bool) -> None:
    # 1 / 3 and 4 / 3 do not multiply back to the cash, and booking keeps them.
    _two_trades(
        tmp_path,
        [f"Assets:Broker 3 HOOL {marker} USD", "Assets:Cash -1.00 USD"],
        [f"Assets:Broker 3 HOOL {marker} USD", "Assets:Cash -4.00 USD"],
        bank=bank,
    )
    if not bank:
        assert _cash(tmp_path) == [["EUR", "1000.00"], ["USD", "995.00"]]


@pytest.mark.parametrize("marker", MARKERS)
def test_an_inferred_zero_price_is_its_explicit_restatement(tmp_path: Path, marker: str) -> None:
    (tmp_path / "main.bean").write_text(LEDGER)
    assert (
        _written(
            _import(
                tmp_path, "a", [f"Assets:Broker 3 HOOL {marker} USD", "Assets:Cash -0.00 USD"], "--apply", bank=True
            )
        )
        == 1
    )
    before = (tmp_path / "main.bean").read_bytes()
    explicit = [f"Assets:Broker 3 HOOL {marker} 0 USD", "Assets:Cash -0.00 USD"]
    preview = _import(tmp_path, "b", explicit, bank=True)
    assert json.loads(preview.stdout)["data"]["rows"][0]["status"] == "duplicate", preview.stdout
    assert _written(_import(tmp_path, "b", explicit, "--apply", bank=True)) == 0
    assert (tmp_path / "main.bean").read_bytes() == before


@pytest.mark.parametrize("bank", [False, True], ids=["generated", "bank"])
@pytest.mark.parametrize("marker", MARKERS)
def test_independent_price_groups_each_complete(tmp_path: Path, marker: str, bank: bool) -> None:
    def legs(usd: str, eur: str) -> list[str]:
        return [
            f"Assets:Broker 2 HOOL {marker} USD",
            f"Assets:Broker 3 GLD {marker} EUR",
            f"Assets:Cash -{usd} USD",
            f"Assets:Cash -{eur} EUR",
        ]

    _two_trades(tmp_path, legs("10.00", "30.00"), legs("20.00", "60.00"), bank=bank)
    if not bank:
        assert _cash(tmp_path) == [["EUR", "910.00"], ["USD", "970.00"]]


@pytest.mark.parametrize("bank", [False, True], ids=["generated", "bank"])
@pytest.mark.parametrize("marker", MARKERS)
def test_a_balanced_foreign_fee_leaves_the_price_determined(tmp_path: Path, marker: str, bank: bool) -> None:
    def legs(usd: str) -> list[str]:
        return [
            f"Assets:Broker 2 HOOL {marker} USD",
            f"Assets:Cash -{usd} USD",
            "Assets:Cash -1.00 EUR",
            "Expenses:Fees 1.00 EUR",
        ]

    _two_trades(tmp_path, legs("10.00"), legs("20.00"), bank=bank)
    if not bank:
        assert _cash(tmp_path) == [["EUR", "998.00"], ["USD", "970.00"]]


@pytest.mark.parametrize(
    ("legs", "changed", "old_id"),
    [
        (["Assets:Broker 3 HOOL @ USD", "Assets:Cash -1.00 USD"], "Assets:Cash -4.00 USD", "576cd7fd4e7fcb22"),
        (
            ["Assets:Broker 2 HOOL @ USD", "Assets:Bond 1 BOND {1.00 USD}", "Assets:Cash -11.50 USD"],
            "Assets:Cash -21.50 USD",
            "02279585a029ffa0",
        ),
        (
            ["Assets:Broker 2 HOOL @ USD", "Assets:Cash -1.00 EUR", "Expenses:Fees 1.00 EUR", "Assets:Cash -10.00 USD"],
            "Assets:Cash -20.00 USD",
            "02279585a029ffa0",
        ),
    ],
    ids=["repeating", "costed-leg", "foreign-fee"],
)
def test_an_id_written_with_the_price_open_still_matches_only_its_own_trade(
    tmp_path: Path, legs: list[str], changed: str, old_id: str
) -> None:
    # The id bea wrote for this trade while the price stayed open (before w5/995).
    old = _trade(legs).replace('"Trade"\n', f'"Trade"\n  import-id: "csv:sha256:{old_id}"\n', 1)
    (tmp_path / "main.bean").write_text(LEDGER + old)
    before = (tmp_path / "main.bean").read_bytes()
    repeat = _import(tmp_path, "a", legs, "--apply")
    assert _written(repeat) == 0
    assert json.loads(repeat.stdout)["data"]["rows"][0]["status"] == "duplicate"
    assert (tmp_path / "main.bean").read_bytes() == before

    other = [*legs[:-1], changed]
    preview = _import(tmp_path, "b", other)
    assert json.loads(preview.stdout)["data"]["rows"][0]["status"] != "duplicate", preview.stdout
    assert _written(_import(tmp_path, "b", other, "--apply", "--duplicates", "include")) == 1
    assert _bea(tmp_path, "check").returncode == 0
