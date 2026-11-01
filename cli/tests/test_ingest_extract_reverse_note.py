"""`ingest extract` says Beangulp 0.2.0 ignores --reverse and shows the sort override (w5/1080)."""

from __future__ import annotations

from pathlib import Path

from typer.testing import CliRunner

from cli.main import app

DOCS = Path(__file__).resolve().parents[1] / "docs"


def test_extract_help_explains_the_ignored_reverse_flag() -> None:
    result = CliRunner().invoke(app, ["ingest", "extract", "--help"], terminal_width=100)

    assert result.exit_code == 0
    assert "Beangulp 0.2.0" in result.output
    assert "--reverse (-r) is accepted but ignored" in result.output
    assert "super().sort(entries, reverse=True)" in result.output
    # The native help stays visible beside bea's note.
    assert "Native interface" in result.output


def test_importing_guide_carries_the_same_override() -> None:
    guide = (DOCS / "IMPORTING.md").read_text()

    assert "ignores it: entries are\nstill serialized oldest first" in guide
    assert "return super().sort(entries, reverse=True)" in guide
