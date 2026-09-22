"""Changing a CSV amount's sign does not change the amount (w3/408).

Unary minus is arithmetic: it applies the active decimal context and rounds to
its precision, 28 significant digits by default. A bank amount is parsed
exactly from its source text, so every sign-only step — parentheses, a
trailing minus, a debit column, `sign=ledger`, and the generated
counterposting — silently rewrote a wider value on its way to the ledger.
`bea check` then confirmed the rounded figure as valid, and a BQL read
reported it, so nothing downstream exposed the change.

`Decimal.copy_negate` flips the sign and copies the coefficient untouched.

The expected opposite is written out as a literal rather than computed with
`-value`, because that is the operation under test: deriving it the same way
would make these tests agree with the bug.
"""

from __future__ import annotations

import os
import subprocess
import sys
from decimal import Decimal
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Cash USD
2026-01-01 open Expenses:Food USD
"""

# 31 significant digits: wider than the default 28-digit context, so an
# arithmetic negation rounds it and a copied one does not.
WIDE = "1234567890.123456789012345678901"
WIDE_NEGATIVE = "-1234567890.123456789012345678901"


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        XDG_DATA_HOME=str(tmp_path / "data"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=120,
    )


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    path = tmp_path / "main.bean"
    path.write_text(LEDGER, encoding="utf-8")
    return path


def _apply(tmp_path: Path, ledger: Path, header: str, row: str, mapping: str) -> list[tuple[str, str]]:
    """Import one row and return its written postings as (account, amount)."""
    source = tmp_path / "bank.csv"
    source.write_text(f"{header}\n{row}\n", encoding="utf-8")
    done = _bea(
        tmp_path,
        "--json",
        "--no-input",
        "--file",
        str(ledger),
        "import",
        str(source),
        "--csv",
        mapping,
        "--account",
        "Assets:Cash",
        "--default-account",
        "Expenses:Food",
        "--apply",
    )
    assert done.returncode == 0, done.stderr
    postings: list[tuple[str, str]] = []
    for line in ledger.read_text(encoding="utf-8").splitlines():
        # Indented, so the `open` declarations at column 0 stay out of it.
        if not line.startswith("  ") or not line.rstrip().endswith(" USD"):
            continue
        account, amount, _currency = line.split()
        postings.append((account, amount))
    return postings


AMOUNT_MAPPING = "date=Date,amount=Amount,narration=Description"


@pytest.mark.parametrize(
    ("header", "row", "mapping", "source_posting", "counter_posting"),
    [
        pytest.param(
            "Date,Amount,Description",
            f"2026-01-02,({WIDE}),Exact",
            AMOUNT_MAPPING,
            WIDE_NEGATIVE,
            WIDE,
            id="parentheses",
        ),
        pytest.param(
            "Date,Amount,Description",
            f"2026-01-02,{WIDE}-,Exact",
            AMOUNT_MAPPING,
            WIDE_NEGATIVE,
            WIDE,
            id="trailing-minus",
        ),
        pytest.param(
            "Date,Amount,Description",
            f"2026-01-02,-{WIDE},Exact",
            AMOUNT_MAPPING,
            WIDE_NEGATIVE,
            WIDE,
            id="leading-minus-counterposting",
        ),
        pytest.param(
            "Date,Amount,Description",
            f"2026-01-02,{WIDE},Exact",
            AMOUNT_MAPPING,
            WIDE,
            WIDE_NEGATIVE,
            id="positive-counterposting",
        ),
        pytest.param(
            "Date,Amount,Description",
            f"2026-01-02,{WIDE},Exact",
            AMOUNT_MAPPING + ",sign=ledger",
            WIDE_NEGATIVE,
            WIDE,
            id="sign-ledger",
        ),
        pytest.param(
            "Date,Debit,Credit,Description",
            f"2026-01-02,{WIDE},,Exact",
            "date=Date,debit=Debit,credit=Credit,narration=Description",
            WIDE_NEGATIVE,
            WIDE,
            id="debit-column",
        ),
    ],
)
def test_every_sign_path_writes_the_exact_amount(
    tmp_path: Path,
    ledger: Path,
    header: str,
    row: str,
    mapping: str,
    source_posting: str,
    counter_posting: str,
) -> None:
    postings = _apply(tmp_path, ledger, header, row, mapping)

    assert postings == [("Assets:Cash", source_posting), ("Expenses:Food", counter_posting)]


def test_an_ordinary_amount_is_unchanged(tmp_path: Path, ledger: Path) -> None:
    """The control: nothing about short amounts may move."""
    postings = _apply(tmp_path, ledger, "Date,Amount,Description", "2026-01-02,(1234.56),Coffee", AMOUNT_MAPPING)

    assert postings == [("Assets:Cash", "-1234.56"), ("Expenses:Food", "1234.56")]


def test_the_written_ledger_still_checks(tmp_path: Path, ledger: Path) -> None:
    """An exact pair must still balance; exactness is not bought with validity."""
    _apply(tmp_path, ledger, "Date,Amount,Description", f"2026-01-02,({WIDE}),Exact", AMOUNT_MAPPING)

    done = _bea(tmp_path, "--json", "--file", str(ledger), "check")

    assert done.returncode == 0, done.stderr


class TestNegation:
    """The helper alone, so a failure says whether it or the importer broke."""

    @pytest.mark.parametrize(
        ("value", "expected"),
        [
            pytest.param(WIDE, WIDE_NEGATIVE, id="wide-positive"),
            pytest.param(WIDE_NEGATIVE, WIDE, id="wide-negative"),
            pytest.param("1234.56", "-1234.56", id="ordinary"),
            pytest.param("0.00", "-0.00", id="zero-keeps-its-scale"),
            pytest.param("-0.00", "0.00", id="negative-zero"),
        ],
    )
    def test_the_sign_flips_and_nothing_else_does(self, value: str, expected: str) -> None:
        from bea_engine.csv_mapper import _negated

        assert str(_negated(Decimal(value))) == expected

    def test_arithmetic_negation_is_what_used_to_round(self) -> None:
        """Pin the mechanism, so the reason for `copy_negate` stays legible."""
        wide = Decimal(WIDE)

        assert str(-wide) != WIDE_NEGATIVE, "unary minus applies the context"
        assert str(-wide) == "-1234567890.123456789012345679"
