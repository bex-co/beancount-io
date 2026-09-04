from __future__ import annotations

import pytest

from cli.output import table


def test_table_aligns_columns_to_widest_cell(capsys: pytest.CaptureFixture[str]) -> None:
    table(["A", "BB"], [["1", "2"], ["333", "4"]])
    out = capsys.readouterr().out
    assert out.splitlines() == ["A    BB", "---  --", "1    2 ", "333  4 "]


def test_table_header_only_when_no_rows(capsys: pytest.CaptureFixture[str]) -> None:
    table(["DATE", "ACCOUNT"], [])
    out = capsys.readouterr().out
    assert out.splitlines() == ["DATE  ACCOUNT", "----  -------"]
