"""Fullwidth pound and won signs contradict the wrong account like their ordinary forms (w5/1064).

`￡` (U+FFE1) and `￦` (U+FFE6) were stripped from CSV amounts without being
read, so `-￡4.50` on a USD account was booked as `-4.50 USD`.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_currency_symbol_coverage import BASE, _books, _mapping
from tests.test_import_source_facts import _bea, _written


@pytest.mark.parametrize("layout", ["amount", "debit-credit"])
@pytest.mark.parametrize(("symbol", "code"), [("￡", "GBP"), ("￦", "KRW")], ids=["pound", "won"])
def test_a_fullwidth_sign_on_a_usd_account_is_refused(tmp_path: Path, symbol: str, code: str, layout: str) -> None:
    _books(tmp_path, symbol, code, layout=layout)
    before = (tmp_path / "main.bean").read_bytes()

    for flags in ([], ["--apply"]):
        refused = _bea(tmp_path, *BASE, "--account", "Assets:Cash", "--csv", _mapping(layout), *flags)
        assert refused.returncode == 2, refused.stdout
        assert symbol in json.loads(refused.stderr)["error"]["message"]
    assert (tmp_path / "main.bean").read_bytes() == before


@pytest.mark.parametrize(("symbol", "code"), [("￡", "GBP"), ("￡", "EGP"), ("￦", "KRW"), ("￦", "KPW")])
def test_a_fullwidth_sign_on_its_own_currency_imports(tmp_path: Path, symbol: str, code: str) -> None:
    _books(tmp_path, symbol, code)

    applied = _bea(tmp_path, *BASE, "--account", "Assets:Local", "--csv", _mapping("amount"), "--apply")

    assert _written(applied) == 1
    assert f"-4.50 {code}" in (tmp_path / "main.bean").read_text()
