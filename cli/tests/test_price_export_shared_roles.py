"""One file in two export roles is planned and copied once (w5/971).

A document that points at an included ledger file, or an included settings file
inside a copied plugin package, was planned as an include and again as an
attachment, and the export refused it as "the same destination" as itself, in a
new directory and under `--force`.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from tests.test_price_export_plugin_siblings import _bea

ACCOUNTS = "2024-01-01 open Assets:Cash USD\n2024-01-01 open Income:Services USD\n"
INVOICE = '2024-01-02 * "Invoice"\n  Assets:Cash 100 USD\n  Income:Services -100 USD\n'


def _shipped(out: Path) -> set[str]:
    return {str(p.relative_to(out)) for p in out.rglob("*") if p.is_file()}


def _check_hidden(tmp_path: Path, books: Path, out: Path) -> int:
    books.rename(tmp_path / "hidden")
    try:
        return _bea(tmp_path, "-f", str(out / "main.bean"), "check").returncode
    finally:
        (tmp_path / "hidden").rename(books)


def _export(tmp_path: Path, books: Path, *flags: str) -> object:
    return _bea(tmp_path, "-f", str(books / "main.bean"), "price", "export", "-o", str(tmp_path / "exp"), *flags)


@pytest.mark.parametrize("flags", [[], ["--force"]], ids=["plain", "force"])
def test_a_document_that_is_also_an_include_exports_once(tmp_path: Path, flags: list[str]) -> None:
    books = tmp_path / "books"
    books.mkdir()
    (books / "accounts.bean").write_text(ACCOUNTS)
    (books / "receipt.txt").write_text("Synthetic statement\n")
    (books / "main.bean").write_text(
        'option "operating_currency" "USD"\ninclude "accounts.bean"\n'
        + INVOICE
        + '2024-01-03 document Assets:Cash "accounts.bean"\n'
    )

    exported = _export(tmp_path, books, *flags)

    assert exported.returncode == 0, exported.stderr  # type: ignore[attr-defined]
    assert _shipped(tmp_path / "exp") == {"main.bean", "accounts.bean"}
    assert _check_hidden(tmp_path, books, tmp_path / "exp") == 0


def test_a_separate_receipt_is_still_an_attachment(tmp_path: Path) -> None:
    books = tmp_path / "books"
    books.mkdir()
    (books / "accounts.bean").write_text(ACCOUNTS)
    (books / "receipt.txt").write_text("Synthetic statement\n")
    (books / "main.bean").write_text(
        'option "operating_currency" "USD"\ninclude "accounts.bean"\n'
        + INVOICE
        + '2024-01-03 document Assets:Cash "receipt.txt"\n'
    )

    exported = _export(tmp_path, books)

    assert exported.returncode == 0, exported.stderr  # type: ignore[attr-defined]
    assert _shipped(tmp_path / "exp") == {"main.bean", "accounts.bean", "receipt.txt"}


@pytest.mark.parametrize("package", ["regular", "namespace"])
def test_an_included_settings_file_inside_a_copied_package_exports_once(tmp_path: Path, package: str) -> None:
    books = tmp_path / "books"
    (books / "plugins").mkdir(parents=True)
    (books / "main.bean").write_text(
        'option "operating_currency" "USD"\ninclude "plugins/settings.bean"\nplugin "qa_plugin"\n' + ACCOUNTS + INVOICE
    )
    (books / "plugins" / "settings.bean").write_text('option "insert_pythonpath" "TRUE"\n')
    (books / "plugins" / "qa_helper.py").write_text("VALUE = 100\n")
    if package == "regular":
        (books / "plugins" / "__init__.py").write_text("")
    (books / "qa_plugin.py").write_text(
        "from plugins import qa_helper\n__plugins__ = ['run']\n"
        "def run(entries, options):\n    assert qa_helper.VALUE == 100\n    return entries, []\n"
    )
    (books / "main.bean").write_text('option "insert_pythonpath" "TRUE"\n' + (books / "main.bean").read_text())

    exported = _export(tmp_path, books)

    assert exported.returncode == 0, exported.stderr  # type: ignore[attr-defined]
    shipped = _shipped(tmp_path / "exp")
    assert {"main.bean", "plugins/settings.bean", "plugins/qa_helper.py", "qa_plugin.py"} <= shipped
    assert _check_hidden(tmp_path, books, tmp_path / "exp") == 0
