"""A cover keeps its label selector when its short lot is opened in the same batch (w5/983).

925 recognized short lots already on disk. Lots the current batch or import
opens were unknown to the normalizer, so a cover's multiline selector was
flattened to the other lot's `First Lot` and booked the wrong lot (120 USD,
profit 30 instead of 10).
"""

from __future__ import annotations

import json
from decimal import Decimal
from pathlib import Path

from tests.test_import_source_facts import _bea

BASE = (
    'option "operating_currency" "USD"\n2024-01-01 open Assets:Stock HOOL "FIFO"\n'
    "2024-01-01 open Assets:Cash USD\n2024-01-01 open Income:Gains USD\n"
)
FIRST = '2024-01-02 * "First short lot"\n  Assets:Stock -2 HOOL {100 USD, "First\nLot"}\n  Assets:Cash 200.00 USD\n'
SECOND = '2024-01-03 * "Second short lot"\n  Assets:Stock -2 HOOL {120 USD, "First Lot"}\n  Assets:Cash 240.00 USD\n'
COVER = (
    '2024-02-01 * "Cover first short lot"\n  Assets:Stock 1 HOOL {"First\nLot"}\n'
    "  Assets:Cash -90.00 USD\n  Income:Gains\n"
)
BATCH = [
    {
        "date": "2024-01-02",
        "narration": "First short lot",
        "postings": [
            {
                "account": "Assets:Stock",
                "units": {"number": "-2", "currency": "HOOL"},
                "cost": {"number": "100", "currency": "USD", "label": "First\nLot"},
            },
            {"account": "Assets:Cash", "units": {"number": "200.00", "currency": "USD"}},
        ],
    },
    {
        "date": "2024-01-03",
        "narration": "Second short lot",
        "postings": [
            {
                "account": "Assets:Stock",
                "units": {"number": "-2", "currency": "HOOL"},
                "cost": {"number": "120", "currency": "USD", "label": "First Lot"},
            },
            {"account": "Assets:Cash", "units": {"number": "240.00", "currency": "USD"}},
        ],
    },
    {
        "date": "2024-02-01",
        "narration": "Cover first short lot",
        "postings": [
            {"account": "Assets:Stock", "units": {"number": "1", "currency": "HOOL"}, "cost": {"label": "First\nLot"}},
            {"account": "Assets:Cash", "units": {"number": "-90.00", "currency": "USD"}},
            {"account": "Income:Gains"},
        ],
    },
]
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


def _gains(tmp_path: Path) -> Decimal:
    result = _bea(tmp_path, "query", "SELECT sum(number) WHERE account = 'Income:Gains'")
    return Decimal(str(json.loads(result.stdout)["data"]["rows"][0][0]))


def test_a_bulk_cover_books_the_lot_its_batch_opened(tmp_path: Path) -> None:
    (tmp_path / "main.bean").write_text(BASE)
    (tmp_path / "batch.json").write_text(json.dumps(BATCH))

    added = _bea(tmp_path, "add", "transactions", "--from", str(tmp_path / "batch.json"))

    assert added.returncode == 0, added.stderr
    assert _gains(tmp_path) == Decimal("-10.00")
    assert _bea(tmp_path, "check").returncode == 0
    written = (tmp_path / "main.bean").read_text().split("Cover first short lot")[1]
    assert '{"First\nLot"}' in written


def test_the_seeded_ledger_control_still_covers_correctly(tmp_path: Path) -> None:
    (tmp_path / "main.bean").write_text(BASE + FIRST + SECOND)
    (tmp_path / "batch.json").write_text(json.dumps(BATCH[2:]))

    added = _bea(tmp_path, "add", "transactions", "--from", str(tmp_path / "batch.json"))

    assert added.returncode == 0, added.stderr
    assert _gains(tmp_path) == Decimal("-10.00")


def test_an_import_cover_books_the_lot_its_statement_opened(tmp_path: Path) -> None:
    (tmp_path / "main.bean").write_text(BASE)
    (tmp_path / "statement.statement").write_text(FIRST + "\n" + SECOND + "\n" + COVER)
    (tmp_path / "importer.py").write_text(IMPORTER)

    applied = _bea(tmp_path, "import", "statement.statement", "--config", "importer.py", "--apply")

    assert applied.returncode == 0, applied.stdout + applied.stderr
    assert _gains(tmp_path) == Decimal("-10.00")
    assert _bea(tmp_path, "check").returncode == 0
