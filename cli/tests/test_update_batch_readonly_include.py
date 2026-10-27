"""A batch update stopped by a read-only include reports what it already wrote (w5/1040).

Files are written one at a time; when a later include was read-only the
refusal said "nothing was written" and carried no result, although the first
include had already been rewritten.
"""

from __future__ import annotations

import json
import os
import stat
import sys
from pathlib import Path

import pytest

from tests.test_update_batch import batch

ROOT = 'option "operating_currency" "USD"\ninclude "a.bean"\ninclude "b.bean"\ninclude "c.bean"\n'


def _include(name: str, ref: str) -> str:
    opens = (
        "2026-01-01 open Assets:Cash USD\n2026-01-01 open Expenses:Travel USD\n"
        "2026-01-01 open Expenses:Uncategorized USD\n"
        if name == "a"
        else ""
    )
    return (
        opens
        + f'\n2026-01-0{ord(name) - 96} ! "{name}"\n  ref: "{ref}"\n  Expenses:Uncategorized 10 USD\n  Assets:Cash\n'
    )


@pytest.mark.skipif(sys.platform == "win32" or os.geteuid() == 0, reason="needs POSIX modes a non-root user obeys")
@pytest.mark.parametrize("order", ["forward", "reverse"])
def test_the_written_rows_are_reported_beside_the_refusal(tmp_path: Path, order: str) -> None:
    root = tmp_path / "main.bean"
    root.write_text(ROOT)
    for name, ref in (("a", "R1"), ("b", "R2"), ("c", "R3")):
        (tmp_path / f"{name}.bean").write_text(_include(name, ref))
    rows = [{"id": ref, "account": "Expenses:Uncategorized=Expenses:Travel", "flag": "*"} for ref in ("R1", "R2", "R3")]
    if order == "reverse":
        rows.reverse()
    readonly = tmp_path / "b.bean"
    readonly.chmod(stat.S_IRUSR)
    try:
        completed = batch(root, rows, "--apply")
    finally:
        readonly.chmod(stat.S_IRUSR | stat.S_IWUSR)

    assert completed.returncode == 3, completed.stdout
    error = json.loads(completed.stdout)["error"]
    assert "nothing was written" not in error["message"]
    first = 0 if order == "forward" else 2
    assert error["result"]["written"] == 1
    assert error["result"]["written_rows"] == [first]
    assert error["result"]["unwritten_rows"] == sorted({0, 1, 2} - {first})
    assert "Expenses:Travel 10 USD" in (tmp_path / "a.bean").read_text()
    assert "Expenses:Travel" not in (tmp_path / "b.bean").read_text().split("open")[-1]
    assert "Expenses:Uncategorized 10 USD" in (tmp_path / "c.bean").read_text()
