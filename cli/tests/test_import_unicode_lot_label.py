"""A cost label compares and hashes as the loader reads it, in NFC (w5/999).

The importer's decomposed `Café` stayed NFD while the loaded ledger read NFC,
so an unchanged native-ID import conflicted, a re-import under the other
spelling wrote a second purchase, and a hand-written twin was not seen.
"""

from __future__ import annotations

import csv
import json
import unicodedata
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

BASE = (
    'option "operating_currency" "USD"\n2024-01-01 open Assets:Cash USD\n'
    '2024-01-01 open Assets:Stock HOOL "FIFO"\n2024-01-01 open Equity:Opening USD\n'
    '2024-01-01 * "Capital"\n  Assets:Cash 1000.00 USD\n  Equity:Opening -1000.00 USD\n'
)
SEED = '2024-02-01 * "Purchase"\n  Assets:Stock 1 HOOL {100 USD, 2024-02-01, "Café"}\n  Assets:Cash -100.00 USD\n'
IMPORTER = """import csv, datetime
from decimal import Decimal as D
from beancount.core.amount import Amount
from beancount.core.data import Posting, Transaction, new_metadata
from beancount.core.position import CostSpec
class Broker:
    name = 'broker'
    def identify(self, file): return str(file).endswith('.csv')
    def account(self, file): return 'Assets:Stock'
    def extract(self, file, existing_entries=None):
        entries = []
        with open(file, encoding='utf-8', newline='') as stream:
            for row in csv.DictReader(stream):
                day = datetime.date.fromisoformat(row['Date'])
                meta = new_metadata(str(file), 1)
                if row['ID']:
                    meta['bank_id'] = row['ID']
                cost = CostSpec(D('100'), None, 'USD', day, row['Lot'], False)
                entries.append(Transaction(meta, day, '*', None, 'Purchase', frozenset(), frozenset(), [
                    Posting('Assets:Stock', Amount(D('1'), 'HOOL'), cost, None, None, None),
                    Posting('Assets:Cash', Amount(D('-100.00'), 'USD'), None, None, None, None)]))
        return entries
CONFIG = [Broker()]
"""


def _source(tmp_path: Path, form: str, *, native: bool) -> None:
    with (tmp_path / "broker.csv").open("w", encoding="utf-8", newline="") as stream:
        writer = csv.writer(stream)
        writer.writerow(["Date", "ID", "Lot"])
        writer.writerow(["2024-02-01", "B1" if native else "", unicodedata.normalize(form, "Café")])


def _run(tmp_path: Path, *flags: str) -> object:
    return _bea(tmp_path, "import", "broker.csv", "--config", "importer.py", *flags)


def _written(result: object) -> int:
    assert result.returncode == 0, result.stdout  # type: ignore[attr-defined]
    return int(json.loads(result.stdout)["data"]["written"])  # type: ignore[attr-defined]


@pytest.mark.parametrize(
    ("native", "first", "second"),
    [(True, "NFD", "NFD"), (True, "NFD", "NFC"), (False, "NFC", "NFD"), (False, "NFD", "NFC")],
    ids=["native-nfd", "native-switch", "hash-reverse", "hash-switch"],
)
def test_an_equivalent_label_is_the_same_purchase(tmp_path: Path, native: bool, first: str, second: str) -> None:
    (tmp_path / "main.bean").write_text(BASE)
    (tmp_path / "importer.py").write_text(IMPORTER)
    _source(tmp_path, first, native=native)
    assert _written(_run(tmp_path, "--apply")) == 1
    before = (tmp_path / "main.bean").read_bytes()
    _source(tmp_path, second, native=native)

    assert _written(_run(tmp_path, "--apply")) == 0
    assert (tmp_path / "main.bean").read_bytes() == before


def test_a_hand_written_purchase_is_seen_under_the_other_spelling(tmp_path: Path) -> None:
    (tmp_path / "main.bean").write_text(BASE + SEED)
    (tmp_path / "importer.py").write_text(IMPORTER)
    _source(tmp_path, "NFD", native=False)

    preview = _run(tmp_path)
    skipped = _run(tmp_path, "--duplicates", "skip", "--apply")

    assert [row["status"] for row in json.loads(preview.stdout)["data"]["rows"]] == ["possible_duplicate"]  # type: ignore[attr-defined]
    assert _written(skipped) == 0


def test_a_different_label_is_still_a_new_purchase(tmp_path: Path) -> None:
    (tmp_path / "main.bean").write_text(BASE + SEED)
    (tmp_path / "importer.py").write_text(IMPORTER)
    _source(tmp_path, "NFC", native=False)
    text = (tmp_path / "broker.csv").read_text().replace("Café", "Other")
    (tmp_path / "broker.csv").write_text(text)

    assert _written(_run(tmp_path, "--duplicates", "skip", "--apply")) == 1


def test_a_purchase_written_under_the_older_raw_label_id_still_matches(tmp_path: Path) -> None:
    """The id the release before this one wrote for a decomposed label is still found."""
    written = unicodedata.normalize("NFC", SEED).replace(
        '"Purchase"\n', '"Purchase"\n  import-id: "csv:sha256:faf60d58fec8de70"\n'
    )
    (tmp_path / "main.bean").write_text(BASE + written)
    (tmp_path / "importer.py").write_text(IMPORTER)
    _source(tmp_path, "NFD", native=False)
    before = (tmp_path / "main.bean").read_bytes()

    assert _written(_run(tmp_path, "--apply")) == 0
    assert (tmp_path / "main.bean").read_bytes() == before
