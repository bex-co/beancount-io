"""An include glob spelled in decomposed (NFD) text finds its NFD files (w5/202).

Ledger text is read as NFC so account names merge, and that once reached the
include pattern too: `include "été-*.bean"` written decomposed was globbed in
composed form, wildcard matching compares directory entries code point for
code point, and every loading command failed with "File glob ... does not
match any files" on a ledger stock `bean-check` accepts. Decomposed names are
what older macOS volumes, unzip and rsync from macOS leave behind.
"""

from __future__ import annotations

import os
import unicodedata
from pathlib import Path
from typing import Any

import pytest
from typer.testing import CliRunner

from cli.main import app

runner = CliRunner()

ROOT = """\
option "operating_currency" "USD"
2024-01-01 open Assets:Bank USD
2024-01-01 open Expenses:Food USD
include "{stem}-*.bean"
"""
YEAR = """\
2024-01-02 * "lunch"
  Expenses:Food  5.00 USD
  Assets:Bank
"""


#: The second is the control: composed text and a composed file name.
@pytest.fixture(params=["NFD", "NFC"])
def books(request: pytest.FixtureRequest, tmp_path: Path, bea_config_dir: Path) -> Path:
    stem = unicodedata.normalize(request.param, "été")
    assert len(stem) == (5 if request.param == "NFD" else 3)
    root = tmp_path / "main.bean"
    root.write_text(ROOT.format(stem=stem), encoding="utf-8")
    (tmp_path / f"{stem}-2024.bean").write_text(YEAR)
    # The volume kept the spelling it was given, so the glob has to match it.
    assert f"{stem}-2024.bean" in os.listdir(tmp_path)
    return root


def _bea(root: Path, *args: str) -> Any:
    return runner.invoke(app, ["--file", str(root), *args])


@pytest.mark.parametrize("mode", [(), ("--json",)], ids=["native", "helper"])
def test_check_loads_the_globbed_include(books: Path, mode: tuple[str, ...]) -> None:
    # Plain `check` hands this closure to bean-check; `--json` loads it in the
    # helper, where the ledger text is read as NFC.
    result = runner.invoke(app, [*mode, "--file", str(books), "check"])

    assert result.exit_code == 0, result.output
    assert "does not match any files" not in result.output
    assert "matches no file" not in result.output


def test_balance_shows_the_included_expense(books: Path) -> None:
    result = _bea(books, "balance")

    flat = " ".join(result.output.split())
    assert result.exit_code == 0, result.output
    assert "Food 5.00 USD" in flat, flat
