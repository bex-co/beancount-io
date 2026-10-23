"""A plugin copy that swaps a tag or link is not the written transaction (w5/1012).

The copy kept the source's date, header, flag and amounts, so both rows were
called written and `--on-disk --tag derived` returned an annotation the file
never declares.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

PLUGIN = """from beancount.core.data import Transaction
__plugins__ = ('derive',)
def derive(entries, options, mode):
    out = []
    for e in entries:
        out.append(e)
        if isinstance(e, Transaction) and e.narration == 'Source row':
            tags = frozenset({'derived'}) if mode in ('tag', 'both') else e.tags
            links = frozenset({'receiptB'}) if mode in ('link', 'both') else e.links
            out.append(e._replace(meta=e.meta.copy(), tags=tags, links=links))
    return out, []
"""
SOURCE = (
    '2024-01-01 open Assets:Cash USD\n2024-01-01 open Expenses:Food USD\n'
    '2024-02-01 * "Source row" #source ^receiptA\n  Assets:Cash -10.00 USD\n  Expenses:Food 10.00 USD\n'
)


def _books(tmp_path: Path, mode: str) -> None:
    (tmp_path / "qa_derive.py").write_text(PLUGIN)
    (tmp_path / "main.bean").write_text(f'option "insert_pythonpath" "TRUE"\nplugin "qa_derive" "{mode}"\n' + SOURCE)


def _rows(tmp_path: Path, *flags: str) -> list[dict]:
    result = _bea(tmp_path, "list", "transaction", "--limit", "100", *flags)
    return json.loads(result.stdout)["data"]


@pytest.mark.parametrize("mode", ["tag", "link", "both"])
def test_a_copy_with_other_tags_or_links_is_not_on_disk(tmp_path: Path, mode: str) -> None:
    _books(tmp_path, mode)

    assert len(_rows(tmp_path)) == 2
    on_disk = _rows(tmp_path, "--on-disk")
    assert len(on_disk) == 1
    assert on_disk[0]["tags"] == ["source"]
    assert on_disk[0]["links"] == ["receiptA"]
    assert _rows(tmp_path, "--on-disk", "--tag", "derived") == []
    assert len(_rows(tmp_path, "--on-disk", "--tag", "source")) == (1 if mode != "link" else 1)


def test_a_transaction_a_plugin_tags_in_place_stays_written(tmp_path: Path) -> None:
    (tmp_path / "qa_tag.py").write_text(
        "from beancount.core.data import Transaction\n__plugins__ = ('tag',)\n"
        "def tag(entries, options):\n    return [e._replace(tags=e.tags | {'extra'}) if isinstance(e, Transaction)"
        " else e for e in entries], []\n"
    )
    (tmp_path / "main.bean").write_text('option "insert_pythonpath" "TRUE"\nplugin "qa_tag"\n' + SOURCE)

    assert len(_rows(tmp_path, "--on-disk")) == 1
