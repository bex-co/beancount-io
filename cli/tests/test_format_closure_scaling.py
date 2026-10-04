"""`format --check` walks an include chain once, not once per member (w1/087).

Every member of a root's closure used to re-walk the closure from itself to
find missing includes, so a chain of N files cost about N²/2 file reads —
86 s for 1,500 files. Counting reads instead of timing keeps this exact and
immune to a loaded machine.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from typer.testing import CliRunner

from cli import output
from cli.main import app

runner = CliRunner()

CHAIN = 60


def _chain(directory: Path, length: int, *, missing_at_end: bool = False) -> Path:
    for index in range(length):
        name = directory / f"f{index:03d}.bean"
        follow = f'include "f{index + 1:03d}.bean"\n' if index + 1 < length else ""
        if missing_at_end and index + 1 == length:
            follow = 'include "nowhere.bean"\n'
        name.write_text(f"{follow}2020-01-01 open Assets:A{index} USD\n")
    return directory / "f000.bean"


def _count_lookups(monkeypatch: pytest.MonkeyPatch) -> list[int]:
    calls = [0]
    original = output._include_matches

    def counted(source: Path, raw: str) -> list[Path]:
        calls[0] += 1
        return original(source, raw)

    monkeypatch.setattr(output, "_include_matches", counted)
    return calls


def test_a_long_chain_is_walked_a_constant_number_of_times(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    root = _chain(tmp_path, CHAIN)
    calls = _count_lookups(monkeypatch)

    result = runner.invoke(app, ["format", str(root), "--check"])

    assert result.exit_code == 0, result.output
    # Linear: a couple of walks over CHAIN include lines. Quadratic was ~CHAIN²/2.
    assert calls[0] <= 3 * CHAIN, calls[0]


def test_a_missing_include_at_the_end_of_a_chain_is_still_reported_once(tmp_path: Path) -> None:
    root = _chain(tmp_path, 5, missing_at_end=True)

    result = runner.invoke(app, ["format", str(root), "--check"])

    assert result.exit_code == 1, result.output
    assert result.output.count('missing include: "nowhere.bean"') == 1


def test_a_directory_walk_still_reports_includes_missing_beside_its_files(tmp_path: Path) -> None:
    books = tmp_path / "books"
    books.mkdir()
    _chain(books, 5, missing_at_end=True)

    result = runner.invoke(app, ["format", str(books), "--check"])

    assert result.exit_code == 1, result.output
    assert result.output.count('missing include: "nowhere.bean"') == 1
