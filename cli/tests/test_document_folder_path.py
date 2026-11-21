"""A document path that names a folder is refused, as a missing file is (w1/350).

Beancount checks a document with `os.path.exists`, so `--path receipts/`, or
`.` for the ledger's own folder, wrote with exit 0, passed `check`, and listed
like an attachment no viewer can open, while `receipts/feb.pdf` that is not
there was refused. An agent whose `"receipts/$FILE"` lost its file name was
told nothing.
"""

from __future__ import annotations

import json
from pathlib import Path
from types import SimpleNamespace

import pytest

from cli.ask.agent import BqlDeps, WritePermission, make_agent
from tests.test_import_document_relative_path import IMPORTER
from tests.test_import_source_facts import _bea

LEDGER = 'option "operating_currency" "USD"\n2026-01-01 open Assets:Checking\n'


@pytest.fixture
def books(tmp_path: Path) -> Path:
    books = tmp_path / "books"
    (books / "receipts").mkdir(parents=True)
    (books / "receipts" / "jan.pdf").write_text("pdf\n")
    (books / "main.bean").write_text(LEDGER)
    return books


def _add(tmp_path: Path, path: str) -> tuple[int, dict[str, object]]:
    result = _bea(
        tmp_path,
        "add",
        "document",
        "--date",
        "2026-01-31",
        "-a",
        "Assets:Checking",
        "--path",
        path,
        ledger="books/main.bean",
    )
    # A refusal's envelope is on stderr, a write's on stdout.
    return result.returncode, json.loads(result.stdout or result.stderr)


@pytest.mark.parametrize(
    ("path", "folder", "example"),
    [
        ("receipts/", "receipts", "receipts/<name>.pdf"),
        ("receipts", "receipts", "receipts/<name>.pdf"),
        (".", "", "<name>.pdf"),
    ],
)
def test_add_document_refuses_a_folder(tmp_path: Path, books: Path, path: str, folder: str, example: str) -> None:
    before = (books / "main.bean").read_bytes()

    code, answer = _add(tmp_path, path)

    assert code == 2, answer
    error = answer["error"]
    assert isinstance(error, dict)
    assert error["category"] == "usage"
    named = (books / folder) if folder else books
    assert error["message"] == (
        f"Document path {path!r} names the folder {named}, not a file; pass the file to attach, "
        f"such as {example}. Nothing was written."
    )
    assert (books / "main.bean").read_bytes() == before
    assert _bea(tmp_path, "check", ledger="books/main.bean").returncode == 0


def test_a_file_still_writes_and_a_missing_one_is_still_refused(tmp_path: Path, books: Path) -> None:
    before = (books / "main.bean").read_bytes()
    code, answer = _add(tmp_path, "receipts/feb.pdf")
    assert code == 1, answer
    assert "File does not exist" in json.dumps(answer)
    assert (books / "main.bean").read_bytes() == before

    code, answer = _add(tmp_path, "receipts/jan.pdf")

    assert code == 0, answer
    assert (books / "main.bean").read_text().endswith('2026-01-31 document Assets:Checking "receipts/jan.pdf"\n')


def test_a_folder_beside_an_include_is_judged_beside_it(tmp_path: Path, books: Path) -> None:
    """A relative path resolves against the file the directive lands in, so the folder is that file's."""
    (books / "entries" / "scans").mkdir(parents=True)
    (books / "entries" / "docs.bean").write_text("; documents\n")
    (books / "main.bean").write_text(LEDGER + 'include "entries/docs.bean"\n')
    before = (books / "entries" / "docs.bean").read_bytes()

    result = _bea(
        tmp_path,
        "add",
        "document",
        "--date",
        "2026-01-31",
        "-a",
        "Assets:Checking",
        "--path",
        "scans",
        "--into",
        str(books / "entries" / "docs.bean"),
        ledger="books/main.bean",
    )

    assert result.returncode == 2, result.stdout
    assert f"names the folder {books / 'entries' / 'scans'}," in json.loads(result.stderr)["error"]["message"]
    assert (books / "entries" / "docs.bean").read_bytes() == before


@pytest.mark.parametrize("filename", ["receipts/", "."])
def test_an_imported_folder_document_is_an_invalid_row(tmp_path: Path, books: Path, filename: str) -> None:
    (books / "main.bean").write_text("2024-01-01 open Assets:Cash USD\n")
    (tmp_path / "importers.py").write_text(IMPORTER)
    (tmp_path / "statement.json").write_text(json.dumps({"filename": filename}))
    before = (books / "main.bean").read_bytes()
    command = ["import", str(tmp_path / "statement.json"), "--config", str(tmp_path / "importers.py")]

    preview = _bea(tmp_path, *command, ledger="books/main.bean")
    applied = _bea(tmp_path, *command, "--apply", ledger="books/main.bean")

    assert preview.returncode == 0, preview.stderr
    [row] = json.loads(preview.stdout)["data"]["rows"]
    assert row["status"] == "invalid"
    assert row["reason"].startswith(f"Document path {filename!r} names the folder ")
    assert applied.returncode == 1, applied.stdout
    assert "names the folder" in applied.stderr
    assert (books / "main.bean").read_bytes() == before


def test_an_imported_file_document_still_writes(tmp_path: Path, books: Path) -> None:
    (books / "main.bean").write_text("2024-01-01 open Assets:Cash USD\n")
    (tmp_path / "importers.py").write_text(IMPORTER)
    (tmp_path / "statement.json").write_text(json.dumps({"filename": "receipts/jan.pdf"}))

    applied = _bea(
        tmp_path,
        "import",
        str(tmp_path / "statement.json"),
        "--config",
        str(tmp_path / "importers.py"),
        "--apply",
        ledger="books/main.bean",
    )

    assert applied.returncode == 0, applied.stdout
    assert '"receipts/jan.pdf"' in (books / "main.bean").read_text()


def test_an_ai_proposed_folder_document_is_refused_before_the_panel(books: Path) -> None:
    ledger = books / "main.bean"
    asked: list[str] = []
    deps = BqlDeps(
        file=ledger, write_permission=WritePermission(confirm_fn=lambda d, t, w, p: (asked.append(d), "n")[1])
    )
    write = make_agent("gpt-4o", "http://unused", "tok")._function_toolset.tools["write_directive"].function

    answer = write(SimpleNamespace(deps=deps), '2026-01-31 document Assets:Checking "receipts/"')

    assert answer == (
        f"Write rejected: Document path 'receipts' names the folder {books / 'receipts'}, not a file; "
        "pass the file to attach, such as receipts/<name>.pdf."
    )
    assert asked == []
    assert ledger.read_text() == LEDGER
