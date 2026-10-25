"""The no-importer hint lists columns only when the header splits into several (w5/627).

w5/470 made the refusal list the file's columns, but it listed whatever one
cell the header reader returned: a QIF file's `!Type:Bank`, an OFX header,
or a header the delimiter did not split, each with a mapping template.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from typer.testing import CliRunner

from cli.main import app

runner = CliRunner()


@pytest.mark.parametrize(
    ("name", "body", "options", "said"),
    [
        (
            "bank.qif",
            "!Type:Bank\nD02/01/2026\nT-1.00\nPA\n^\n",
            [],
            "bank.qif looks like a QIF file, not a CSV export",
        ),
        (
            "bank.ofx",
            "OFXHEADER:100\nDATA:OFXSGML\n\n<OFX>\n</OFX>\n",
            ["--csv", "auto"],
            "bank.ofx looks like an OFX file, not a CSV export, so it has no columns to map: import it without --csv.",
        ),
        (
            "bank2.ofx",
            '<?xml version="1.0"?>\n<OFX></OFX>\n',
            ["--csv", "auto"],
            "bank2.ofx looks like an OFX file, not a CSV export, so it has no columns to map: import it without --csv.",
        ),
        (
            "semi.csv",
            "When;What;HowMuch\n2026-02-01;A;-1,00\n",
            ["--delimiter", ","],
            "header was read as one column ('When;What;HowMuch') with delimiter ',', but it looks semicolon-separated",
        ),
    ],
    ids=["qif", "ofx-sgml", "ofx-xml", "unsplit-header"],
)
def test_a_one_cell_header_is_not_listed_as_columns(
    tmp_path: Path, bea_config_dir: Path, name: str, body: str, options: list[str], said: str
) -> None:
    (tmp_path / "main.bean").write_text("2026-01-01 open Assets:Savings USD\n")
    (tmp_path / name).write_text(body)

    result = runner.invoke(
        app,
        ["--no-input", "-f", str(tmp_path / "main.bean"), "import", str(tmp_path / name), "--account", "Assets:Savings"]
        + options,
    )

    assert result.exit_code == 2, result.output
    message = " ".join(result.stderr.split())
    assert said in message
    assert "Its columns are" not in message
    assert "Name them with --csv" not in message
