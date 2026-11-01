"""An import preview's diff applies to the ledger it describes (w5/1116).

`splitlines` broke the ledger tail at a quoted U+2028/U+2029 and the patch had
no `\\ No newline at end of file` marker, so `git apply --check` refused it.
"""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

LEDGER = (
    'option "operating_currency" "USD"\n'
    "2026-01-01 open Assets:Cash USD\n"
    "2026-01-01 open Expenses:Food USD\n"
    "2026-01-01 open Equity:Opening USD\n"
    '2026-01-02 * "Opening"\n'
    "  Assets:Cash 100.00 USD\n"
    "  Equity:Opening -100.00 USD\n"
    '    memo: "line{sep}two"'
)
IMPORT = ["import", "bank.csv", "--csv", "auto", "--account", "Assets:Cash", "--default-account", "Expenses:Food"]

pytestmark = pytest.mark.skipif(shutil.which("git") is None, reason="needs git to validate the patch")


def _diff(tmp_path: Path, sep: str, final_newline: bool, *flags: str) -> tuple[str, Path]:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER.format(sep=sep) + ("\n" if final_newline else ""), encoding="utf-8")
    (tmp_path / "bank.csv").write_text("Date,Description,Amount\n2026-01-05,Groceries,-5.00\n")
    result = _bea(tmp_path, *IMPORT, *flags)
    assert result.returncode == 0, result.stdout + result.stderr
    return json.loads(result.stdout)["data"]["diff"], ledger


def _applies(tmp_path: Path, ledger: Path, diff: str) -> None:
    repo = tmp_path / "repo"
    repo.mkdir(exist_ok=True)
    shutil.copy(ledger, repo / "main.bean")
    patch = diff.replace(str(ledger), "main.bean")
    checked = subprocess.run(
        ["git", "apply", "--check", "-"], cwd=repo, input=patch, capture_output=True, text=True, check=False
    )
    assert checked.returncode == 0, checked.stderr + patch


@pytest.mark.parametrize("sep", [" ", " ", " "], ids=["u2028", "u2029", "space"])
def test_a_quoted_unicode_separator_in_the_tail_leaves_a_valid_patch(tmp_path: Path, sep: str) -> None:
    diff, ledger = _diff(tmp_path, sep, True)

    _applies(tmp_path, ledger, diff)


def test_a_ledger_without_a_final_newline_gets_the_marker(tmp_path: Path) -> None:
    diff, ledger = _diff(tmp_path, " ", False)

    assert "\\ No newline at end of file" in diff
    _applies(tmp_path, ledger, diff)


def test_the_apply_answer_carries_the_same_valid_patch(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    original = LEDGER.format(sep=" ") + "\n"
    ledger.write_text(original, encoding="utf-8")
    (tmp_path / "bank.csv").write_text("Date,Description,Amount\n2026-01-05,Groceries,-5.00\n")
    result = _bea(tmp_path, *IMPORT, "--apply")
    assert result.returncode == 0, result.stdout + result.stderr
    diff = json.loads(result.stdout)["data"]["diff"]

    ledger.write_text(original, encoding="utf-8")
    _applies(tmp_path, ledger, diff)
