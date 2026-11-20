"""`list document` names the file each row's path is relative to (w5/833).

A filename is relative to the include that wrote the directive (w5/066), but
the row never named that file: two includes' `receipt.pdf` listed alike and
neither resolved from the root.
"""

from __future__ import annotations

import json
from pathlib import Path

from typer.testing import CliRunner

from cli.main import app

runner = CliRunner()


def _books(tmp_path: Path) -> Path:
    for year in ("2025", "2026"):
        (tmp_path / year).mkdir()
        (tmp_path / year / "books.bean").write_text(f'{year}-03-01 document Assets:Cash "receipt.pdf"\n')
        (tmp_path / year / "receipt.pdf").write_bytes(b"%PDF")
    root = tmp_path / "main.bean"
    root.write_text('2025-01-01 open Assets:Cash\ninclude "2025/books.bean"\ninclude "2026/books.bean"\n')
    return root


def test_json_rows_carry_their_source(tmp_path: Path) -> None:
    root = _books(tmp_path)

    result = runner.invoke(app, ["--json", "--file", str(root), "list", "document"])

    assert result.exit_code == 0, result.output
    rows = json.loads(result.stdout)["data"]
    assert [(row["filename"], row["source"]) for row in rows] == [
        ("receipt.pdf", {"filename": str(tmp_path / "2025" / "books.bean"), "lineno": 1}),
        ("receipt.pdf", {"filename": str(tmp_path / "2026" / "books.bean"), "lineno": 1}),
    ]
    for row in rows:
        assert (Path(row["source"]["filename"]).parent / row["filename"]).is_file()


def test_the_table_names_the_writing_file(tmp_path: Path) -> None:
    root = _books(tmp_path)

    result = runner.invoke(app, ["--file", str(root), "list", "document"])

    assert result.exit_code == 0, result.output
    assert "WRITTEN IN" in result.stdout
    assert "2025/books.bean:1" in result.stdout and "2026/books.bean:1" in result.stdout


def _discovering(tmp_path: Path) -> Path:
    """A written document beside one Beancount finds in the documents folder (w1/341)."""
    (tmp_path / "Documents" / "Assets" / "Bank").mkdir(parents=True)
    (tmp_path / "Documents" / "Assets" / "Bank" / "2026-01-31.statement.pdf").write_bytes(b"%PDF")
    (tmp_path / "manual.pdf").write_bytes(b"%PDF")
    root = tmp_path / "main.bean"
    root.write_text(
        'option "operating_currency" "USD"\n'
        'option "documents" "Documents"\n'
        "2026-01-01 open Assets:Bank USD\n"
        '2026-01-05 document Assets:Bank "manual.pdf"\n'
    )
    return root


def test_a_discovered_statement_names_no_written_location(tmp_path: Path) -> None:
    root = _discovering(tmp_path)

    result = runner.invoke(app, ["--json", "--file", str(root), "list", "document"])

    assert result.exit_code == 0, result.output
    written, found = json.loads(result.stdout)["data"]
    assert written["source"] == {"filename": str(root), "lineno": 4}
    assert "generated" not in written
    # Line 0 of the root is not where anything was written.
    assert found["source"] is None
    assert found["generated"] is True
    assert found["filename"] == "Documents/Assets/Bank/2026-01-31.statement.pdf"
    assert (tmp_path / found["filename"]).is_file()


def test_the_table_leaves_a_discovered_statements_file_empty(tmp_path: Path) -> None:
    root = _discovering(tmp_path)

    result = runner.invoke(app, ["--file", str(root), "list", "document"])

    assert result.exit_code == 0, result.output
    assert "main.bean:0" not in result.stdout
    lines = result.stdout.splitlines()
    header = next(line for line in lines if line.startswith("DATE"))
    start, end = header.index("WRITTEN IN"), header.index("SOURCE")
    cells = {line.split()[2]: line[start:end].strip() for line in lines if line.startswith("2026-")}
    assert cells == {"manual.pdf": "main.bean:4", "Documents/Assets/Bank/2026-01-31.statement.pdf": ""}
