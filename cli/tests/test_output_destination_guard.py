"""One output-destination rule: no `-o` replaces a file the command was not given (w3/m48).

`ingest extract -o` and `treeify -o` used to forward the destination straight to
the native writer, which truncated the root ledger or one of its includes and
exited 0 (`w3/431`). The refusal happens in the frontend, before the native
writer is launched, so these tests need no optional engine feature.
"""

from __future__ import annotations

import os
from pathlib import Path

import pytest
from typer.testing import CliRunner

from cli.main import app

runner = CliRunner()

LEDGER = 'option "operating_currency" "USD"\n2024-01-01 open Assets:Cash USD\ninclude "sub/extra.bean"\n'
INCLUDED = '2024-02-01 * "included"\n  Assets:Cash  -1.00 USD\n  Equity:Opening\n'


def _books(tmp_path: Path) -> Path:
    """A root ledger with an include, a symlink to the root, and a hard link to it."""
    root = tmp_path / "main.bean"
    root.write_text(LEDGER)
    (tmp_path / "sub").mkdir()
    (tmp_path / "sub" / "extra.bean").write_text(INCLUDED)
    (tmp_path / "link.bean").symlink_to(root)
    os.link(root, tmp_path / "hard.bean")
    return root


def _tree(directory: Path) -> dict[str, bytes]:
    """Every file under a directory with its bytes, so a refusal can be proved inert."""
    return {
        str(path.relative_to(directory)): path.read_bytes()
        for path in sorted(directory.rglob("*"))
        if path.is_file() and not path.is_symlink()
    }


# Every spelling the downstream parser accepts, plus the two links no spelling reveals.
SPELLINGS = [
    ["-o", "main.bean"],
    ["-omain.bean"],
    ["--output", "main.bean"],
    ["--output=main.bean"],
    ["-o", "sub/extra.bean"],
    ["-o", "link.bean"],
    ["-o", "hard.bean"],
]


@pytest.mark.parametrize("spelling", SPELLINGS, ids=lambda spelling: " ".join(spelling))
def test_ingest_extract_refuses_a_destination_in_the_ledger_closure(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, spelling: list[str]
) -> None:
    root = _books(tmp_path)
    (tmp_path / "ingest.py").write_text("from beangulp import Ingest\n\nIngest([])()\n")
    downloads = tmp_path / "in"
    downloads.mkdir()
    (downloads / "statement.csv").write_text("2024-03-01,-5.00,Coffee\n")
    monkeypatch.chdir(tmp_path)
    before = _tree(tmp_path)

    result = runner.invoke(app, ["--file", str(root), "ingest", "extract", *spelling, str(downloads)])

    assert result.exit_code == 2, result.output
    assert "would overwrite the ledger it reads" in result.output
    assert _tree(tmp_path) == before


@pytest.mark.parametrize("spelling", SPELLINGS, ids=lambda spelling: " ".join(spelling))
def test_treeify_refuses_a_destination_in_the_ledger_closure(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, spelling: list[str]
) -> None:
    root = _books(tmp_path)
    monkeypatch.chdir(tmp_path)
    before = _tree(tmp_path)

    result = runner.invoke(app, ["--file", str(root), "treeify", *spelling], input="Assets:Bank:Checking  100\n")

    assert result.exit_code == 2, result.output
    assert "would overwrite the ledger it reads" in result.output
    assert _tree(tmp_path) == before


def test_ingest_extract_refuses_the_existing_ledger_it_deduplicates_against(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Beangulp's own `-e` ledger is read by the run, so it is a destination too."""
    other = tmp_path / "ledger.bean"
    other.write_text(LEDGER.replace('include "sub/extra.bean"\n', ""))
    (tmp_path / "ingest.py").write_text("from beangulp import Ingest\n\nIngest([])()\n")
    downloads = tmp_path / "in"
    downloads.mkdir()
    monkeypatch.chdir(tmp_path)
    before = _tree(tmp_path)

    for existing in (["-e", "ledger.bean"], ["-eledger.bean"], ["--existing=ledger.bean"]):
        result = runner.invoke(app, ["ingest", "extract", *existing, "-o", "ledger.bean", str(downloads)])
        assert result.exit_code == 2, result.output
        assert "would overwrite the ledger it reads" in result.output
    assert _tree(tmp_path) == before


def test_example_keeps_its_own_existing_destination_code(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """`example -o` documents exit 4 for an existing destination; that stays its case."""
    (tmp_path / "taken.bean").write_text("keep me\n")
    monkeypatch.chdir(tmp_path)

    result = runner.invoke(app, ["example", "-o", "taken.bean"])

    assert result.exit_code == 4, result.output
    assert (tmp_path / "taken.bean").read_text() == "keep me\n"


def test_query_and_format_still_refuse_the_ledger(tmp_path: Path) -> None:
    root = _books(tmp_path)
    before = _tree(tmp_path)

    for args in (
        ["--file", str(root), "query", "SELECT account", "-o", str(root)],
        ["--file", str(root), "format", str(root), "-o", str(root)],
    ):
        result = runner.invoke(app, args)
        assert result.exit_code == 2, result.output
        assert "would overwrite the ledger it reads" in result.output
    assert _tree(tmp_path) == before
