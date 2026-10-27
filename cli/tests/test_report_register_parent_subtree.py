"""A register selects its parent's whole subtree, however the parent is named (w5/1034).

`^Assets:Bank$` resolved the parent but listed only its own postings: the
account filter had already dropped child-only transactions. With no posting
of its own the parent answered `rows: []`. And a Turkish parent typed in
lowercase was refused as matching several accounts.
"""

from __future__ import annotations

import json
from decimal import Decimal
from pathlib import Path

import pytest

from tests.test_report_holdings_register_frontend import _bea, _write

ROOTS = ["Assets", "Liabilities", "Equity", "Income", "Expenses"]
RENAMED = ["Activos", "Pasivos", "Capital", "Ingresos", "Gastos"]


def _book(roots: list[str], parent_active: bool) -> str:
    a, _l, q, _i, _e = roots
    options = "".join(
        f'option "name_{role}" "{root}"\n'
        for role, root in zip(["assets", "liabilities", "equity", "income", "expenses"], roots, strict=True)
        if root != role.capitalize()
    )
    text = (
        options
        + f"""option "operating_currency" "USD"
2026-01-01 open {a}:Bank USD
2026-01-01 open {a}:Bank:Savings USD
2026-01-01 open {a}:Bank:Savings:Reserve USD
2026-01-01 open {a}:BankTwo USD
2026-01-01 open {q}:Opening USD
2026-01-03 * "Savings opening"
  {a}:Bank:Savings 200 USD
  {q}:Opening -200 USD
2026-01-04 * "Unrelated bank"
  {a}:BankTwo 500 USD
  {q}:Opening -500 USD
2026-01-05 * "Reserve opening"
  {a}:Bank:Savings:Reserve 20 USD
  {q}:Opening -20 USD
"""
    )
    if parent_active:
        text += f'2026-01-02 * "Bank opening"\n  {a}:Bank 100 USD\n  {q}:Opening -100 USD\n'
    return text


def _register(tmp_path: Path, text: str, pattern: str) -> tuple[int, dict[str, object]]:
    ledger = _write(tmp_path, text)
    proc = _bea(tmp_path, "--file", str(ledger), "--json", "report", "register", pattern, "--time", "2026-01")
    return proc.returncode, json.loads(proc.stdout or proc.stderr)


@pytest.mark.parametrize("roots", [ROOTS, RENAMED], ids=["default", "renamed"])
@pytest.mark.parametrize("parent_active", [True, False], ids=["parent-active", "children-only"])
@pytest.mark.parametrize("form", ["literal", "anchored", "subtree"])
def test_every_parent_selector_lists_the_whole_subtree(
    tmp_path: Path, roots: list[str], parent_active: bool, form: str
) -> None:
    bank = f"{roots[0]}:Bank"
    pattern = {"literal": bank, "anchored": f"^{bank}$", "subtree": f"^{bank}(?::.*)?$"}[form]

    code, payload = _register(tmp_path, _book(roots, parent_active), pattern)

    assert code == 0, payload
    data = payload["data"]
    assert data["account"] == bank  # type: ignore[index]
    rows = data["rows"]  # type: ignore[index]
    assert {row["account"] for row in rows} <= {bank, f"{bank}:Savings", f"{bank}:Savings:Reserve"}
    assert Decimal(rows[-1]["balance"]["USD"]) == (Decimal(320) if parent_active else Decimal(220))


def test_a_selector_spanning_two_trees_is_still_refused(tmp_path: Path) -> None:
    code, payload = _register(tmp_path, _book(ROOTS, True), "^Assets:(Bank:Savings|BankTwo)$")

    assert code == 2
    assert "matches several" in payload["error"]["message"]  # type: ignore[index]


TURKISH = """option "operating_currency" "USD"
2026-01-01 open Assets:{parent} USD
2026-01-01 open Assets:{parent}:Savings USD
2026-01-01 open Assets:{parent}:Reserve USD
2026-01-01 open Assets:Other USD
2026-01-01 open Equity:Opening USD
2026-01-02 * "Savings"
  Assets:{parent}:Savings 20 USD
  Equity:Opening -20 USD
2026-01-03 * "Reserve"
  Assets:{parent}:Reserve 30 USD
  Equity:Opening -30 USD
2026-01-04 * "Other"
  Assets:Other 90 USD
  Equity:Opening -90 USD
"""


@pytest.mark.parametrize(
    ("parent", "typed"), [("İstanbul", "istanbul"), ("ISPARTA", "ısparta"), ("Istanbul", "istanbul")]
)
def test_a_lowercase_turkish_parent_is_the_one_parent(tmp_path: Path, parent: str, typed: str) -> None:
    code, payload = _register(tmp_path, TURKISH.format(parent=parent), f"assets:{typed}")

    assert code == 0, payload
    data = payload["data"]
    assert data["account"] == f"Assets:{parent}"  # type: ignore[index]
    assert Decimal(data["rows"][-1]["balance"]["USD"]) == Decimal(50)  # type: ignore[index]
