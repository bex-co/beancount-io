"""`price export` refuses dependencies an earlier snapshot could satisfy (w5/929).

A refresh after the last included source file vanished kept the active
`include "txns/*.bean"`, which then loaded the old `snapshot/txns/b.bean`, and a
plugin whose module vanished ran the old snapshot copy: both exited 0 and the
copy passed `check` while the source did not.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_price_export_blocked_directory import _bea

ROOT_BEAN = """option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
2024-01-01 open Income:Other USD
{include}
"""
PAYMENT = """2024-02-02 * "Old payment"
  Assets:Cash 2.00 USD
  Income:Other -2.00 USD
"""
PLUGIN_ROOT = """option "operating_currency" "USD"
option "insert_pythonpath" "TRUE"
plugin "qa_snapshot_adjust"
2024-01-01 open Assets:Cash USD
2024-01-01 open Income:Other USD
2024-02-01 * "Input"
  Assets:Cash 1.00 USD
  Income:Other -1.00 USD
"""
PLUGIN = """from decimal import Decimal as D
from beancount.core.data import Transaction
__plugins__ = ["adjust"]

def adjust(entries, options_map):
    out = []
    for entry in entries:
        if isinstance(entry, Transaction):
            posts = []
            for post in entry.postings:
                delta = D("{delta}") if post.account == "Assets:Cash" else -D("{delta}")
                posts.append(post._replace(units=post.units._replace(number=post.units.number + delta)))
            entry = entry._replace(postings=posts)
        out.append(entry)
    return out, []
"""


def _tree(root: Path) -> dict[str, bytes]:
    return {str(p.relative_to(root)): p.read_bytes() for p in sorted(root.rglob("*")) if p.is_file()}


def _cash(tmp_path: Path, ledger: Path) -> object:
    result = _bea(tmp_path, "--json", "-f", str(ledger), "query", "SELECT sum(number) WHERE account='Assets:Cash'")
    return json.loads(result.stdout)["data"]["rows"]


@pytest.mark.parametrize("include", ['include "txns/*.bean"', 'include "txns/b.bean"'])
@pytest.mark.parametrize("flags", [[], ["--allow-errors"]])
def test_a_missing_include_does_not_bind_to_the_old_snapshot(tmp_path: Path, include: str, flags: list[str]) -> None:
    books = tmp_path / "books"
    (books / "txns").mkdir(parents=True)
    (books / "main.bean").write_text(ROOT_BEAN.format(include=include))
    (books / "txns" / "b.bean").write_text(PAYMENT)
    snap = tmp_path / "snapshot"
    assert _bea(tmp_path, "-f", str(books / "main.bean"), "price", "export", "-o", str(snap)).returncode == 0
    (books / "txns" / "b.bean").unlink()
    before = _tree(snap)

    refreshed = _bea(tmp_path, "-f", str(books / "main.bean"), "price", "export", "-o", str(snap), "--force", *flags)

    assert refreshed.returncode != 0, refreshed.stdout
    assert "main.bean:4" in refreshed.stderr + refreshed.stdout
    assert "Nothing was written" in refreshed.stderr + refreshed.stdout
    assert _tree(snap) == before


def test_a_missing_include_is_refused_for_a_fresh_destination(tmp_path: Path) -> None:
    books = tmp_path / "books"
    books.mkdir()
    (books / "main.bean").write_text(ROOT_BEAN.format(include='include "txns/*.bean"'))

    refreshed = _bea(tmp_path, "-f", str(books / "main.bean"), "price", "export", "-o", str(tmp_path / "snap"))

    assert refreshed.returncode != 0
    assert not (tmp_path / "snap").exists()


def test_a_valid_refresh_after_one_source_disappears_loads_only_current_files(tmp_path: Path) -> None:
    books = tmp_path / "books"
    (books / "txns").mkdir(parents=True)
    (books / "main.bean").write_text(ROOT_BEAN.format(include='include "txns/*.bean"'))
    (books / "txns" / "a.bean").write_text(PAYMENT.replace("2.00", "1.00").replace("Old", "Kept"))
    (books / "txns" / "b.bean").write_text(PAYMENT)
    snap = tmp_path / "snapshot"
    assert _bea(tmp_path, "-f", str(books / "main.bean"), "price", "export", "-o", str(snap)).returncode == 0
    (books / "txns" / "b.bean").unlink()

    refreshed = _bea(tmp_path, "-f", str(books / "main.bean"), "price", "export", "-o", str(snap), "--force")

    assert refreshed.returncode == 0, refreshed.stderr
    assert _cash(tmp_path, snap / "main.bean") == _cash(tmp_path, books / "main.bean")
    assert _bea(tmp_path, "-f", str(snap / "main.bean"), "check").returncode == 0


@pytest.mark.parametrize("flags", [[], ["--allow-errors"]])
def test_a_missing_plugin_module_does_not_run_the_old_snapshot_copy(tmp_path: Path, flags: list[str]) -> None:
    books = tmp_path / "books"
    books.mkdir()
    (books / "main.bean").write_text(PLUGIN_ROOT)
    (books / "qa_snapshot_adjust.py").write_text(PLUGIN.format(delta="2.00"))
    snap = tmp_path / "snapshot"
    assert _bea(tmp_path, "-f", str(books / "main.bean"), "price", "export", "-o", str(snap)).returncode == 0
    (books / "qa_snapshot_adjust.py").unlink()
    before = _tree(snap)

    refreshed = _bea(tmp_path, "-f", str(books / "main.bean"), "price", "export", "-o", str(snap), "--force", *flags)

    assert refreshed.returncode != 0, refreshed.stdout
    assert "qa_snapshot_adjust" in refreshed.stderr + refreshed.stdout
    assert _tree(snap) == before


def test_a_replacement_plugin_module_refreshes_the_snapshot(tmp_path: Path) -> None:
    books = tmp_path / "books"
    books.mkdir()
    (books / "main.bean").write_text(PLUGIN_ROOT)
    (books / "qa_snapshot_adjust.py").write_text(PLUGIN.format(delta="2.00"))
    snap = tmp_path / "snapshot"
    assert _bea(tmp_path, "-f", str(books / "main.bean"), "price", "export", "-o", str(snap)).returncode == 0
    (books / "qa_snapshot_adjust.py").write_text(PLUGIN.format(delta="4.00"))

    refreshed = _bea(tmp_path, "-f", str(books / "main.bean"), "price", "export", "-o", str(snap), "--force")

    assert refreshed.returncode == 0, refreshed.stderr
    assert _cash(tmp_path, snap / "main.bean") == _cash(tmp_path, books / "main.bean")
    assert _bea(tmp_path, "-f", str(snap / "main.bean"), "check").returncode == 0


def test_an_installed_global_plugin_still_exports(tmp_path: Path) -> None:
    books = tmp_path / "books"
    books.mkdir()
    (books / "main.bean").write_text('plugin "beancount.plugins.check_drained"\n2024-01-01 open Assets:Cash USD\n')

    exported = _bea(tmp_path, "-f", str(books / "main.bean"), "price", "export", "-o", str(tmp_path / "snap"))

    assert exported.returncode == 0, exported.stderr


FEE_ROOT = """option "operating_currency" "USD"
option "insert_pythonpath" "TRUE"
plugin "qa_fee_rules"
2024-01-01 open Assets:Cash USD
2024-01-01 open Expenses:Fees USD
2024-01-01 open Equity:Opening USD
2024-01-01 * "Capital"
  Assets:Cash 1000.00 USD
  Equity:Opening -1000.00 USD
"""
FEE_PLUGIN = """import json
from datetime import timedelta
from decimal import Decimal as D
from importlib.resources import files
from beancount.core import amount, data
__plugins__ = ("fees",)

def fees(entries, options):
    rules = files(__package__).joinpath("rules")
    fee = sum((D(json.loads(p.read_text())["fee"]) for p in rules.iterdir() if p.name.endswith(".json")), D(0))
    out = list(entries)
    for e in entries:
        if isinstance(e, data.Transaction) and e.narration == "Capital":
            out.append(data.Transaction(data.new_metadata("<fees>", 0), e.date + timedelta(days=1), "*", None,
                "Bank fees", frozenset(), frozenset(), [
                data.Posting("Assets:Cash", amount.Amount(-fee, "USD"), None, None, None, None),
                data.Posting("Expenses:Fees", amount.Amount(fee, "USD"), None, None, None, None)]))
    return out, []
"""


def _fee_books(tmp_path: Path) -> tuple[Path, Path]:
    books = tmp_path / "books"
    rules = books / "qa_fee_rules" / "rules"
    rules.mkdir(parents=True)
    (books / "main.bean").write_text(FEE_ROOT)
    (books / "qa_fee_rules" / "__init__.py").write_text(FEE_PLUGIN)
    (rules / "old.json").write_text('{"fee": "2.00"}\n')
    (rules / "current.json").write_text('{"fee": "3.00"}\n')
    snap = tmp_path / "snapshot"
    assert _bea(tmp_path, "-f", str(books / "main.bean"), "price", "export", "-o", str(snap)).returncode == 0
    (snap / "keep.txt").write_text("Unrelated note.\n")
    return books, snap


@pytest.mark.parametrize("retire", ["remove", "rename"])
def test_a_resource_retired_from_the_source_package_is_not_left_active(tmp_path: Path, retire: str) -> None:
    books, snap = _fee_books(tmp_path)
    old = books / "qa_fee_rules" / "rules" / "old.json"
    if retire == "remove":
        old.unlink()
    else:
        old.rename(old.with_name("retired.txt"))
    before = _tree(snap)

    refreshed = _bea(tmp_path, "-f", str(books / "main.bean"), "price", "export", "-o", str(snap), "--force")

    assert refreshed.returncode == 2, refreshed.stdout
    assert str(snap / "qa_fee_rules" / "rules" / "old.json") in refreshed.stderr
    assert "fresh output directory" in refreshed.stderr and "Nothing was written" in refreshed.stderr
    assert _tree(snap) == before
    fresh = tmp_path / "fresh"
    assert _bea(tmp_path, "-f", str(books / "main.bean"), "price", "export", "-o", str(fresh)).returncode == 0
    assert _cash(tmp_path, fresh / "main.bean") == _cash(tmp_path, books / "main.bean") == [["997.00"]]


def test_a_changed_resource_still_refreshes_the_snapshot(tmp_path: Path) -> None:
    books, snap = _fee_books(tmp_path)
    (books / "qa_fee_rules" / "rules" / "old.json").write_text('{"fee": "4.00"}\n')

    refreshed = _bea(tmp_path, "-f", str(books / "main.bean"), "price", "export", "-o", str(snap), "--force")

    assert refreshed.returncode == 0, refreshed.stderr
    assert _cash(tmp_path, snap / "main.bean") == _cash(tmp_path, books / "main.bean")
    assert (snap / "keep.txt").read_text() == "Unrelated note.\n"


SWITCH_PLUGIN = """from datetime import timedelta
from decimal import Decimal as D
from importlib.resources import files
from beancount.core import amount, data
__plugins__ = ("fees",)

def fees(entries, options):
    active = files(__package__).joinpath("active")
    if not active.joinpath("fee-on").is_dir():
        return entries, []
    out = list(entries)
    for e in entries:
        if isinstance(e, data.Transaction) and e.narration == "Capital":
            out.append(data.Transaction(data.new_metadata("<fees>", 0), e.date + timedelta(days=1), "*", None,
                "Bank fees", frozenset(), frozenset(), [
                data.Posting("Assets:Cash", amount.Amount(D("-10"), "USD"), None, None, None, None),
                data.Posting("Expenses:Fees", amount.Amount(D("10"), "USD"), None, None, None, None)]))
    return out, []
"""


@pytest.mark.parametrize("retire", ["remove", "rename"])
def test_an_empty_directory_retired_from_the_source_package_is_refused(tmp_path: Path, retire: str) -> None:
    """A removed empty `active/fee-on/` stayed in the copy and kept its fee on (w5/1065)."""
    books = tmp_path / "books"
    switch = books / "qa_fee_rules" / "active" / "fee-on"
    switch.mkdir(parents=True)
    (books / "main.bean").write_text(FEE_ROOT)
    (books / "qa_fee_rules" / "__init__.py").write_text(SWITCH_PLUGIN)
    snap = tmp_path / "snapshot"
    assert _bea(tmp_path, "-f", str(books / "main.bean"), "price", "export", "-o", str(snap)).returncode == 0
    if retire == "remove":
        switch.rmdir()
    else:
        switch.rename(switch.with_name("fee-off"))
    before = sorted(str(p.relative_to(snap)) for p in snap.rglob("*") if "__pycache__" not in p.parts)

    refreshed = _bea(tmp_path, "-f", str(books / "main.bean"), "price", "export", "-o", str(snap), "--force")

    assert refreshed.returncode == 2, refreshed.stdout
    assert str(snap / "qa_fee_rules" / "active" / "fee-on") in refreshed.stderr
    assert sorted(str(p.relative_to(snap)) for p in snap.rglob("*") if "__pycache__" not in p.parts) == before
