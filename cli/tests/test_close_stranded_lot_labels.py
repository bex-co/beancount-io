"""The stranded-lot close advice spells each lot's label exactly (w5/982).

The advice printed a lot with an empty label as the same cost as its twin, and
quotes or backslashes in a label unescaped, so following the displayed costs
wrote a valid no-op that drained nothing and the next close still refused.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

IMPORTER = """from beancount.parser import parser
class Broker:
    name = 'broker'
    def identify(self, file): return str(file).endswith('.statement')
    def account(self, file): return 'Assets:Stock'
    def extract(self, file, existing_entries=None):
        entries, errors, _ = parser.parse_file(str(file))
        assert not errors, errors
        return entries
CONFIG = [Broker()]
"""


def _books(tmp_path: Path, label: str | None) -> Path:
    suffix = "" if label is None else ", " + json.dumps(label)
    ledger = tmp_path / "main.bean"
    ledger.write_text(
        '2024-01-01 open Assets:Stock HOOL "NONE"\n2024-01-01 open Assets:Cash USD\n'
        '2024-01-02 * "First lot"\n  Assets:Stock 1 HOOL {100 USD, 2024-01-02}\n  Assets:Cash -100 USD\n'
        f'2024-01-02 * "Second lot"\n  Assets:Stock -1 HOOL {{100 USD, 2024-01-02{suffix}}}\n  Assets:Cash 100 USD\n'
    )
    return ledger


def _close_message(tmp_path: Path) -> str:
    closed = _bea(tmp_path, "add", "close", "--date", "2024-02-01", "--account", "Assets:Stock")
    assert closed.returncode != 0, closed.stdout
    return str(json.loads(closed.stderr)["error"]["message"])


@pytest.mark.parametrize("label", ["", 'a "quoted" lot', "back\\slash"], ids=["empty", "quotes", "backslash"])
def test_the_reported_cost_names_the_exact_lot(tmp_path: Path, label: str) -> None:
    _books(tmp_path, label)

    message = _close_message(tmp_path)

    spelled = '""' if label == "" else '"' + label.replace("\\", "\\\\").replace('"', '\\"') + '"'
    assert f"2024-01-02, {spelled}}}" in message, message


def test_following_the_reported_inverse_drains_the_lot(tmp_path: Path) -> None:
    _books(tmp_path, "")
    message = _close_message(tmp_path)
    held = re.findall(r"-1 HOOL (\{[^}\n]+\})", message)
    assert held, message

    drained = _bea(
        tmp_path,
        "add",
        "transaction",
        "--date",
        "2024-02-01",
        "--narration",
        "Drain lots",
        "--posting",
        "Assets:Stock -1 HOOL {100 USD, 2024-01-02}",
        "--posting",
        f"Assets:Stock 1 HOOL {held[0]}",
    )
    closed = _bea(tmp_path, "add", "close", "--date", "2024-02-01", "--account", "Assets:Stock")

    assert drained.returncode == 0, drained.stderr
    assert closed.returncode == 0, closed.stderr


def test_an_unlabelled_lot_is_spelled_without_a_label(tmp_path: Path) -> None:
    ledger = _books(tmp_path, None)
    ledger.write_text(
        ledger.read_text().replace(
            "{100 USD, 2024-01-02}\n  Assets:Cash 100 USD", "{100 USD, 2024-01-03}\n  Assets:Cash 100 USD"
        )
    )

    message = _close_message(tmp_path)

    assert '""' not in message


def test_the_import_close_warning_keeps_the_empty_label(tmp_path: Path) -> None:
    _books(tmp_path, "")
    (tmp_path / "close.statement").write_text("2024-02-01 close Assets:Stock\n")
    (tmp_path / "importer.py").write_text(IMPORTER)

    preview = _bea(tmp_path, "import", "close.statement", "--config", "importer.py")

    assert preview.returncode == 0, preview.stderr
    assert '""' in json.dumps(json.loads(preview.stdout))
