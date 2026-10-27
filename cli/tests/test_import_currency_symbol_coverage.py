"""Single-commodity currency signs contradict the wrong account (w5/924).

They were stripped like any currency sign and not read, so `-₾4.50` on a USD
account was booked as `-4.50 USD`, exit 0, where `€` is refused.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea, _written

SYMBOLS = {
    "₾": "GEL",
    "₸": "KZT",
    "₮": "MNT",
    "₼": "AZN",
    "₲": "PYG",
    "₿": "BTC",
    "₭": "LAK",
    "៛": "KHR",
    "֏": "AMD",
    "؋": "AFN",
    "₵": "GHS",
}
BASE = ["import", "bank.csv", "--default-account", "Expenses:Food"]


def _books(tmp_path: Path, symbol: str, code: str, *, layout: str = "amount") -> None:
    (tmp_path / "main.bean").write_text(
        'option "operating_currency" "USD"\n2024-01-01 open Assets:Cash USD\n'
        f"2024-01-01 open Assets:Local {code}\n2024-01-01 open Expenses:Food\n"
    )
    if layout == "amount":
        body = f"Date,Description,Amount\n2024-02-01,Coffee,-{symbol}4.50\n"
    else:
        body = f"Date,Description,Debit,Credit\n2024-02-01,Coffee,{symbol}4.50,\n"
    (tmp_path / "bank.csv").write_text(body, encoding="utf-8")


def _mapping(layout: str) -> str:
    columns = "amount=Amount" if layout == "amount" else "debit=Debit,credit=Credit"
    return f"date=Date,narration=Description,{columns}"


@pytest.mark.parametrize("layout", ["amount", "debit-credit"])
@pytest.mark.parametrize(("symbol", "code"), list(SYMBOLS.items()), ids=list(SYMBOLS.values()))
def test_a_mismatched_account_is_refused_and_nothing_is_written(
    tmp_path: Path, symbol: str, code: str, layout: str
) -> None:
    _books(tmp_path, symbol, code, layout=layout)
    before = (tmp_path / "main.bean").read_bytes()

    for flags in ([], ["--apply"]):
        refused = _bea(tmp_path, *BASE, "--account", "Assets:Cash", "--csv", _mapping(layout), *flags)

        assert refused.returncode == 2, refused.stdout
        message = json.loads(refused.stderr)["error"]["message"]
        assert symbol in message and code in message and "USD" in message
        assert (tmp_path / "main.bean").read_bytes() == before


@pytest.mark.parametrize(("symbol", "code"), list(SYMBOLS.items()), ids=list(SYMBOLS.values()))
def test_the_matching_account_imports_in_its_own_currency(tmp_path: Path, symbol: str, code: str) -> None:
    _books(tmp_path, symbol, code)

    applied = _bea(tmp_path, *BASE, "--account", "Assets:Local", "--csv", _mapping("amount"), "--apply")

    assert _written(applied) == 1
    assert f"-4.50 {code}" in (tmp_path / "main.bean").read_text()
    assert _bea(tmp_path, "check").returncode == 0


def test_the_cedi_sign_also_accepts_the_former_cedi(tmp_path: Path) -> None:
    _books(tmp_path, "₵", "GHC")

    applied = _bea(tmp_path, *BASE, "--account", "Assets:Local", "--csv", _mapping("amount"), "--apply")

    assert _written(applied) == 1
    assert "-4.50 GHC" in (tmp_path / "main.bean").read_text()
