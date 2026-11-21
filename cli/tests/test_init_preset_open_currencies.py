"""`bea init --preset` opens every account with no currency constraint (w1/343).

Each preset and module account opened for the operating currency alone, so
the new books refused their first foreign purchase (a 12.00 EUR lunch in a
`personal@1` dollar ledger), while hosted Create Ledger opens the same preset
bare: the operating currency neither converts amounts nor prohibits others
(ADR026, w21/687).
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

from tests.test_init_preset import _bea

ROOT = Path(__file__).resolve().parents[1]
CATALOG = json.loads((ROOT / "src" / "bea_engine" / "setup_catalog.json").read_text(encoding="utf-8"))
PRESETS = {entry["id"]: [account["name"] for account in entry["accounts"]] for entry in CATALOG["presets"]}
PERSONAL_MODULES = [m["id"] for m in CATALOG["modules"] if "personal@1" in m["allowedPresets"]]

#: An open line with no currency list: the account, then at most a booking method.
BARE_OPEN = re.compile(r'\d{4}-\d{2}-\d{2} open [A-Z][\w:-]*(?: "[A-Z_]+")?')


def _init(tmp_path: Path, preset: str, *extra: str) -> Path:
    books = tmp_path / "books"
    args = ["--no-input", "init", str(books), "--preset", preset, "--currency", "USD", "--date", "2026-01-01", *extra]
    created = _bea(tmp_path, *args)
    assert created.returncode == 0, created.stderr or created.stdout
    return books / "main.bean"


def _opens(ledger: Path) -> list[str]:
    return [line for line in ledger.read_text(encoding="utf-8").splitlines() if " open " in line]


def _modules() -> list[str]:
    return [arg for module in PERSONAL_MODULES for arg in ("--module", module)]


@pytest.mark.parametrize("preset", PRESETS)
def test_every_preset_account_opens_with_no_currency(tmp_path: Path, preset: str) -> None:
    ledger = _init(tmp_path, preset, *(_modules() if preset == "personal@1" else []))

    opens = _opens(ledger)
    assert {f"2026-01-01 open {name}" for name in PRESETS[preset]} <= {line.split(' "')[0] for line in opens}
    assert [line for line in opens if not BARE_OPEN.fullmatch(line)] == []


@pytest.mark.parametrize("funded", [False, True], ids=["unfunded", "funded"])
def test_a_personal_ledger_takes_a_euro_lunch_and_euro_cash(tmp_path: Path, funded: bool) -> None:
    ledger = _init(
        tmp_path,
        "personal@1",
        "--module",
        "investments@1",
        *(["--opening-balance", "Assets:Bank 1000"] if funded else []),
    )
    # A known opening posts, and so opens, the day before the history starts.
    day = "2025-12-31" if funded else "2026-01-01"
    opens = _opens(ledger)
    assert [line for line in opens if not BARE_OPEN.fullmatch(line)] == []
    assert f'{day} open Assets:Brokerage "FIFO"' in opens
    assert f"{day} open Equity:OpeningBalances" in opens

    for narration, posting, counter in [
        ("Lunch in Paris", "Expenses:Food 12.00 EUR @ 1.10 USD", "Liabilities:CreditCard"),
        ("Euro cash", "Assets:Cash 50.00 EUR @ 1.10 USD", "Assets:Bank"),
    ]:
        added = _bea(
            tmp_path, "--no-input", "--file", str(ledger), "add", "transaction", narration,
            "--date", "2026-01-05", "-p", posting, "-p", counter,
        )  # fmt: skip
        assert added.returncode == 0, added.stderr or added.stdout

    checked = _bea(tmp_path, "--file", str(ledger), "check")
    assert checked.returncode == 0, checked.stderr or checked.stdout
    query = "SELECT currency, sum(number) WHERE account = 'Expenses:Food' GROUP BY currency"
    food = _bea(tmp_path, "--json", "--file", str(ledger), "query", query)
    assert json.loads(food.stdout)["data"]["rows"] == [["EUR", "12.00"]]
