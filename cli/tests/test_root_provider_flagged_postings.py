"""A leaf whose postings carry flags still routes through the root that provides its accounts (w5/989).

The posted-account scan expected an account at the start of a posting line, so
`* Assets:Cash` and its siblings read as posting to nothing: the leaf looked
self-sufficient, the `auto_accounts` root that supplies the opens was not
chosen, and `add note` refused the account as unknown.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

OPENS = "2024-01-01 open Assets:Cash USD\n2024-01-01 open Equity:Opening USD\n"
PLUGIN = 'plugin "beancount.plugins.auto_accounts"\n'


def _books(tmp_path: Path, prefix: str, second: str | None = None) -> Path:
    second = prefix if second is None else second
    leaf = tmp_path / "entries.bean"
    leaf.write_text(f'2024-01-02 * "Capital"\n  {prefix}Assets:Cash 100.00 USD\n  {second}Equity:Opening -100.00 USD\n')
    (tmp_path / "main.bean").write_text(PLUGIN + 'include "entries.bean"\n')
    return leaf


@pytest.mark.parametrize(
    ("prefix", "second"),
    [("* ", None), ("! ", None), ("*", None), ("P ", None), ("", None), ("", "! ")],
    ids=["star", "bang", "glued-star", "capital-P", "plain", "one-flagged"],
)
def test_a_note_routes_through_the_root_whatever_the_posting_flags(
    tmp_path: Path, prefix: str, second: str | None
) -> None:
    leaf = _books(tmp_path, prefix, second)

    noted = _bea(
        tmp_path,
        "add",
        "note",
        "--date",
        "2024-02-01",
        "--account",
        "Assets:Cash",
        "--comment",
        "Reviewed",
        ledger="entries.bean",
    )

    assert noted.returncode == 0, noted.stdout + noted.stderr  # type: ignore[attr-defined]
    assert "Reviewed" in leaf.read_text()
    assert _bea(tmp_path, "check").returncode == 0


def test_a_root_that_hard_opens_the_accounts_is_still_the_provider(tmp_path: Path) -> None:
    leaf = _books(tmp_path, "* ")
    (tmp_path / "main.bean").write_text(OPENS + PLUGIN + 'include "entries.bean"\n')

    noted = _bea(
        tmp_path,
        "add",
        "note",
        "--date",
        "2024-02-01",
        "--account",
        "Assets:Cash",
        "--comment",
        "Reviewed",
        ledger="entries.bean",
    )

    assert noted.returncode == 0, noted.stdout + noted.stderr  # type: ignore[attr-defined]
    assert "Reviewed" in leaf.read_text()
