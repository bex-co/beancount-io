"""An id copied from the ledger or a listing resolves in Update (w5/1030).

A small decimal `ref` is printed fixed-point (`0.00000001`) in the file and in
`bea list`, but the locator compared `str()`'s `1E-8`; and a decomposed
`référence-1` copied from the file did not match the NFC form the loader keeps.
Both were refused as unknown.
"""

from __future__ import annotations

import json
import unicodedata
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

BASE = """option "operating_currency" "USD"
2026-01-01 open Assets:Cash USD
2026-01-01 open Expenses:Food USD
2026-01-02 ! "Coffee"
  {key}: {value}
  Assets:Cash -9.99 USD
  Expenses:Food 9.99 USD
2026-01-03 ! "Taxi"
  {key}: "neighbor-2"
  Assets:Cash -5.01 USD
  Expenses:Food 5.01 USD
"""


def _flagged(tmp_path: Path) -> list[str]:
    listed = _bea(tmp_path, "list", "transaction", "--sort", "oldest")
    return [row["flag"] for row in json.loads(listed.stdout)["data"]]


@pytest.mark.parametrize(
    ("key", "value", "selector"),
    [
        ("ref", "0.00000001", "0.00000001"),
        ("ref", "-0.0000000123", "-0.0000000123"),
        ("ref", "0.00000001", "1E-8"),
        ("ref", "42", "42"),
        ("ref", '"' + unicodedata.normalize("NFD", "référence-1") + '"', unicodedata.normalize("NFD", "référence-1")),
        ("ref", '"' + unicodedata.normalize("NFD", "référence-1") + '"', "référence-1"),
        (
            "import-id",
            '"' + unicodedata.normalize("NFD", "external:référence-1") + '"',
            unicodedata.normalize("NFD", "external:référence-1"),
        ),
    ],
    ids=["small", "negative-small", "exponent", "integer", "nfd", "nfc", "import-id-nfd"],
)
@pytest.mark.parametrize("batch", [False, True], ids=["single", "batch"])
def test_the_copied_id_updates_only_its_transaction(
    tmp_path: Path, key: str, value: str, selector: str, batch: bool
) -> None:
    (tmp_path / "main.bean").write_text(BASE.format(key=key, value=value), encoding="utf-8")
    if batch:
        (tmp_path / "map.json").write_text(json.dumps([{"id": selector, "flag": "*"}]), encoding="utf-8")
        args = ["update", "transactions", "--from", str(tmp_path / "map.json"), "--apply"]
    else:
        args = ["update", "transaction", "--id", selector, "--flag", "*", "--apply"]

    applied = _bea(tmp_path, *args)

    assert applied.returncode == 0, applied.stderr
    assert _flagged(tmp_path) == ["*", "!"]
    assert _bea(tmp_path, "check").returncode == 0
