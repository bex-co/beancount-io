"""An imported close over a balance says so, and still writes (w5/913).

`add close` refuses a close that strands money, but a Python importer's close
row was shown ready and written with no word that the account still held
100 USD (later transactions to it are refused as inactive).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

LEDGER = (
    'option "operating_currency" "USD"\n2024-01-01 open Assets:Cash USD\n2024-01-01 open Equity:Opening USD\n'
    '2024-01-02 * "Fund"\n  Assets:Cash 100 USD\n  Equity:Opening -100 USD\n'
)
IMPORTER = """from beancount.parser import parser

class Imp:
    def identify(self, file): return str(file).endswith(".txt")
    def account(self, file): return "Assets:Cash"
    def extract(self, file, existing_entries=None):
        entries, errors, _ = parser.parse_string({text!r})
        assert not errors, errors
        return entries

CONFIG = [Imp()]
"""
CLOSE = "2024-02-01 close Assets:Cash\n"
DRAIN = '2024-02-01 * "Drain"\n  Assets:Cash -100 USD\n  Equity:Opening 100 USD\n'


def _import(tmp_path: Path, text: str, *flags: str, ledger: str = LEDGER) -> object:
    (tmp_path / "main.bean").write_text(ledger)
    (tmp_path / "importers.py").write_text(IMPORTER.replace("{text!r}", repr(text)))
    (tmp_path / "bank.txt").write_text("synthetic\n")
    return _bea(tmp_path, "import", "bank.txt", "--config", "importers.py", *flags)


def _warnings(result: object) -> list[str]:
    assert result.returncode == 0, result.stderr  # type: ignore[attr-defined]
    return list(json.loads(result.stdout)["data"]["validation_warnings"])  # type: ignore[attr-defined]


@pytest.mark.parametrize("flags", [[], ["--apply"]], ids=["preview", "apply"])
def test_a_funded_close_warns_in_preview_and_apply(tmp_path: Path, flags: list[str]) -> None:
    (warning,) = _warnings(_import(tmp_path, CLOSE, *flags))

    assert "Assets:Cash is closed on 2024-02-01 while it still holds 100 USD" in warning
    assert "later transactions cannot move it out" in warning


def test_apply_still_writes_the_close(tmp_path: Path) -> None:
    _import(tmp_path, CLOSE, "--apply")

    assert "2024-02-01 close Assets:Cash" in (tmp_path / "main.bean").read_text()


def test_a_preview_leaves_the_ledger_alone(tmp_path: Path) -> None:
    _import(tmp_path, CLOSE)

    assert (tmp_path / "main.bean").read_text() == LEDGER


def test_an_empty_account_closes_quietly(tmp_path: Path) -> None:
    empty = LEDGER.split('2024-01-02 * "Fund"')[0]

    assert _warnings(_import(tmp_path, CLOSE, ledger=empty)) == []


def test_a_same_day_drain_in_the_same_import_keeps_it_quiet(tmp_path: Path) -> None:
    assert _warnings(_import(tmp_path, DRAIN + CLOSE, "--apply")) == []


TREE = (
    'option "operating_currency" "USD"\n{plugin}2024-01-01 open Assets:Bank USD\n'
    "2024-01-01 open {child} {currency}\n2024-01-01 open Equity:Opening {currency}\n"
    '2024-01-02 * "Capital"\n  {child} {number} {currency}\n  Equity:Opening -{number} {currency}\n'
)
CLOSE_TREE = 'plugin "beancount.plugins.close_tree"\n'
PARENT = "2024-02-01 close Assets:Bank\n"


def _tree(
    *,
    plugin: str = CLOSE_TREE,
    child: str = "Assets:Bank:Checking",
    currency: str = "USD",
    number: str = "100.00",
) -> str:
    return TREE.format(plugin=plugin, child=child, currency=currency, number=number)


@pytest.mark.parametrize("flags", [[], ["--apply"]], ids=["preview", "apply"])
@pytest.mark.parametrize(
    ("child", "held"),
    [("Assets:Bank:Checking", "100.00 USD"), ("Assets:Bank:Checking:Foreign", "125.50 EUR")],
    ids=["child", "grandchild"],
)
def test_close_tree_warns_for_the_funded_descendant_it_closes(
    tmp_path: Path, flags: list[str], child: str, held: str
) -> None:
    number, currency = held.split()
    ledger = _tree(child=child, currency=currency, number=number)

    (warning,) = _warnings(_import(tmp_path, PARENT, *flags, ledger=ledger))

    assert f"{child} is closed on 2024-02-01 while it still holds {held}" in warning


def test_close_tree_apply_writes_only_the_parent_close(tmp_path: Path) -> None:
    _import(tmp_path, PARENT, "--apply", ledger=_tree())

    assert (tmp_path / "main.bean").read_text() == _tree() + "\n" + PARENT


def test_without_close_tree_the_funded_child_stays_open_and_quiet(tmp_path: Path) -> None:
    assert _warnings(_import(tmp_path, PARENT, ledger=_tree(plugin=""))) == []


def test_a_child_the_ledger_already_closed_stays_quiet(tmp_path: Path) -> None:
    ledger = _tree() + "2024-01-15 close Assets:Bank:Checking\n"

    assert _warnings(_import(tmp_path, PARENT, ledger=ledger)) == []
