"""`list transaction --details` keeps its source heading out of the ledger syntax (w5/985).

The heading was a bare `/path/main.bean:4`, so redirecting the output to a ledger
failed `bea check` on the heading line even though the transaction body was
valid. It is a Beancount comment now.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from tests.test_init_creates_missing_ledger import _bea

BASE = 'option "operating_currency" "USD"\n2024-01-01 open Assets:Cash USD\n2024-01-01 open Expenses:Food USD\n'


@pytest.mark.parametrize("flag", ["*", "P"])
def test_redirected_details_check_clean(tmp_path: Path, flag: str) -> None:
    source = tmp_path / "main.bean"
    source.write_text(
        BASE + f'2024-01-02 {flag} "Lunch"\n  receipt: "R-1"\n  Assets:Cash -7.50 USD\n  Expenses:Food 7.50 USD\n'
    )
    original = source.read_bytes()

    details = _bea(tmp_path, "--no-input", "-f", str(source), "list", "transaction", "--details", "--on-disk")
    redirected = tmp_path / "details.bean"
    redirected.write_text(BASE + details.stdout)
    checked = _bea(tmp_path, "--no-input", "-f", str(redirected), "check")

    assert details.returncode == 0, details.stderr
    assert details.stdout.splitlines()[0].startswith("; ") and "main.bean:4" in details.stdout.splitlines()[0]
    assert checked.returncode == 0, checked.stdout + checked.stderr
    assert 'receipt: "R-1"' in details.stdout and "Lunch" in details.stdout
    assert source.read_bytes() == original
