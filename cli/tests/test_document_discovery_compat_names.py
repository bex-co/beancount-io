"""Document discovery names a folder's account in NFC, not NFKC (w5/984).

Upstream's `account.walk` rewrote `Ofﬁce` (a ligature) as `Office` and
`AＢank` (a full-width letter) as `ABank`, names no account carries: the
receipts under the declared account were skipped by automatic discovery and
`doctor directories` called the folder undeclared.
"""

from __future__ import annotations

import json
import unicodedata
from pathlib import Path

import pytest

from tests.test_init_creates_missing_ledger import _bea

PROFILES = {
    "ligature": ("Ofﬁce", "Ofﬁce"),
    "width": ("AＢank", "AＢank"),
    "ascii": ("Office", "Office"),
    "nfd-folder": ("Café", unicodedata.normalize("NFD", "Café")),
}


def _books(tmp_path: Path, name: str, folder: str) -> Path:
    receipt = tmp_path / "receipts" / "Assets" / folder / "2024-02-01.txt"
    receipt.parent.mkdir(parents=True)
    receipt.write_text("synthetic receipt\n", encoding="utf-8")
    ledger = tmp_path / "auto.bean"
    ledger.write_text(f'option "documents" "receipts"\n2024-01-01 open Assets:{name} USD\n', encoding="utf-8")
    return ledger


@pytest.mark.parametrize("profile", list(PROFILES))
def test_automatic_discovery_finds_the_receipt(tmp_path: Path, profile: str) -> None:
    name, folder = PROFILES[profile]
    ledger = _books(tmp_path, name, folder)

    listed = _bea(tmp_path, "--json", "-f", str(ledger), "list", "document")
    on_disk = _bea(tmp_path, "--json", "-f", str(ledger), "list", "document", "--on-disk")

    assert listed.returncode == 0, listed.stderr
    rows = json.loads(listed.stdout)["data"]
    assert [unicodedata.normalize("NFC", row["account"]) for row in rows] == [
        unicodedata.normalize("NFC", f"Assets:{name}")
    ]
    assert json.loads(on_disk.stdout)["data"] == []


@pytest.mark.parametrize("profile", list(PROFILES))
def test_doctor_directories_accepts_the_declared_folder(tmp_path: Path, profile: str) -> None:
    name, folder = PROFILES[profile]
    ledger = _books(tmp_path, name, folder)

    checked = _bea(tmp_path, "--no-input", "doctor", "directories", str(ledger), str(tmp_path / "receipts"))

    assert checked.returncode == 0, checked.stdout + checked.stderr


def test_a_genuinely_undeclared_folder_is_still_reported(tmp_path: Path) -> None:
    ledger = _books(tmp_path, "Office", "Tax")

    checked = _bea(tmp_path, "--no-input", "doctor", "directories", str(ledger), str(tmp_path / "receipts"))

    assert checked.returncode == 1, checked.stdout + checked.stderr
