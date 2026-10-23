"""Import judges a note, event or custom directive by what the files declare (w5/1000).

The duplicate index held the loaded view, so a plugin that filtered those
directives made an identical import append every run, and one that rewrote
them made a genuinely changed import read as already there.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

PLUGIN = """from beancount.core.data import Event, Note, Custom
__plugins__ = ("apply_view",)
def apply_view(entries, options_map, mode):
    result = []
    for entry in entries:
        if isinstance(entry, (Event, Note, Custom)):
            if mode == "filter":
                continue
            if isinstance(entry, Event):
                entry = entry._replace(description="Rome")
            elif isinstance(entry, Note):
                entry = entry._replace(comment="Pending")
            else:
                entry = entry._replace(values=[entry.values[0]._replace(value="Pending")])
        result.append(entry)
    return result, []
"""
IMPORTER = """from beancount.parser import parser
class Reader:
    name = 'local-directives'
    def identify(self, file): return str(file).endswith('.statement')
    def account(self, file): return 'Assets:Cash'
    def extract(self, file, existing_entries=None):
        entries, errors, _ = parser.parse_file(str(file))
        assert not errors, errors
        return entries
CONFIG = [Reader()]
"""
BASE = (
    "2024-01-01 open Assets:Cash USD\n2024-01-01 open Equity:Opening USD\n"
    '2024-01-01 * "Capital"\n  Assets:Cash 1000.00 USD\n  Equity:Opening -1000.00 USD\n'
)


def _statement(changed: bool) -> str:
    return (
        f'2024-02-01 event "location" "{"Rome" if changed else "Paris"}"\n'
        f'2024-02-01 note Assets:Cash "{"Pending" if changed else "Reviewed"}"\n'
        f'2024-02-01 custom "review-note" "{"Pending" if changed else "Paid"}"\n'
    )


def _setup(tmp_path: Path, mode: str | None) -> list[str]:
    settings = "" if mode is None else f'option "insert_pythonpath" "TRUE"\nplugin "qa_view" "{mode}"\n'
    (tmp_path / "main.bean").write_text(settings + BASE)
    (tmp_path / "qa_view.py").write_text(PLUGIN)
    (tmp_path / "importer.py").write_text(IMPORTER)
    (tmp_path / "entries.statement").write_text(_statement(False))
    return ["import", "entries.statement", "--config", "importer.py", "--apply"]


def _written(result: object) -> int:
    assert result.returncode == 0, result.stderr  # type: ignore[attr-defined]
    return int(json.loads(result.stdout)["data"]["written"])  # type: ignore[attr-defined]


@pytest.mark.parametrize("mode", ["filter", "transform", None])
def test_an_unchanged_repeat_writes_nothing(tmp_path: Path, mode: str | None) -> None:
    args = _setup(tmp_path, mode)

    assert _written(_bea(tmp_path, *args)) == 3
    after_first = (tmp_path / "main.bean").read_bytes()

    assert _written(_bea(tmp_path, *args)) == 0
    assert _written(_bea(tmp_path, *args, "--duplicates", "skip")) == 0
    assert (tmp_path / "main.bean").read_bytes() == after_first


def test_a_change_matching_only_the_rewritten_view_is_written_once(tmp_path: Path) -> None:
    args = _setup(tmp_path, "transform")
    assert _written(_bea(tmp_path, *args)) == 3
    (tmp_path / "entries.statement").write_text(_statement(True))

    assert _written(_bea(tmp_path, *args)) == 3
    assert _written(_bea(tmp_path, *args)) == 0
