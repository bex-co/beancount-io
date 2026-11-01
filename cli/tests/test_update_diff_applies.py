"""An update's diff applies to the file it describes (w5/1115).

`splitlines` broke the file at U+2028/U+2029 (ordinary characters in a quoted
memo), the patch lost the `\\ No newline at end of file` marker, and a leading
byte-order mark never reached the first line. `git apply --check` refused each.
"""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path
from typing import Any

import pytest

from tests.test_update_batch import batch

LEDGER = (
    'option "operating_currency" "USD"\n'
    "2026-01-01 open Assets:Cash USD\n"
    "2026-01-01 open Expenses:Food USD\n"
    '2026-01-02 * "First"\n'
    '  import-id: "t1"\n'
    "  Expenses:Food 5.00 USD\n"
    "  Assets:Cash\n"
    '    memo: "line{sep}two"\n'
    '2026-01-03 * "Second"\n'
    '  import-id: "t2"\n'
    "  Expenses:Food 7.00 USD\n"
    "  Assets:Cash"
)
ROWS = [{"id": "t2", "flag": "!"}]

pytestmark = pytest.mark.skipif(shutil.which("git") is None, reason="needs git to validate the patch")


def _applies(tmp_path: Path, ledger: Path, diff: str) -> None:
    repo = tmp_path / "repo"
    repo.mkdir(exist_ok=True)
    shutil.copy(ledger, repo / "main.bean")
    patch = diff.replace(str(ledger), "main.bean")
    checked = subprocess.run(
        ["git", "apply", "--check", "-"], cwd=repo, input=patch, capture_output=True, text=True, check=False
    )
    assert checked.returncode == 0, checked.stderr + patch


def _preview(ledger: Path, rows: list[dict[str, str]] = ROWS) -> dict[str, Any]:
    done = batch(ledger, rows)
    assert done.returncode == 0, done.stdout
    return json.loads(done.stdout)["data"]  # type: ignore[no-any-return]


@pytest.mark.parametrize("sep", [" ", " ", " "], ids=["u2028", "u2029", "space"])
def test_a_unicode_line_separator_in_a_memo_does_not_corrupt_the_patch(tmp_path: Path, sep: str) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER.format(sep=sep) + "\n", encoding="utf-8")

    data = _preview(ledger)

    _applies(tmp_path, ledger, data["diff"])
    _applies(tmp_path, ledger, data["rows"][0]["diff"])


def test_a_file_without_a_final_newline_gets_the_marker(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER.format(sep=" "), encoding="utf-8")

    data = _preview(ledger)

    assert "\\ No newline at end of file" in data["diff"]
    _applies(tmp_path, ledger, data["diff"])


def test_a_byte_order_mark_is_kept_on_the_first_line(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_bytes(b"\xef\xbb\xbf" + (LEDGER.format(sep=" ") + "\n").encode())

    # The first transaction sits within three lines of the first line, so that line is hunk context.
    data = _preview(ledger, [{"id": "t1", "flag": "!"}])

    assert "﻿option" in data["diff"]
    _applies(tmp_path, ledger, data["diff"])
