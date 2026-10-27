"""Two instances of one importer class can be told apart (w5/226).

`CONFIG = [Bank("Assets:Checking"), Bank("Assets:Savings")]` is the ordinary
way to reuse an importer for two accounts. Both instances carry the same
default name (`<run_path>.Bank` under Beangulp, the class name here), so the
error listed that name twice and `--importer` with it returned the same error:
the advice could not be followed.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

LEDGER = (
    'option "operating_currency" "USD"\n'
    "2026-01-01 open Assets:Checking USD\n"
    "2026-01-01 open Assets:Savings USD\n"
    "2026-01-01 open Expenses:Food\n"
)

IMPORTER = textwrap.dedent("""
    import datetime
    from decimal import Decimal as D
    from beancount.core import data
    from beancount.core.amount import Amount

    class Bank:
        def __init__(self, acct): self.acct = acct
        def identify(self, filepath): return filepath.endswith(".txt")
        def account(self, filepath): return self.acct
        def extract(self, filepath, existing):
            return [data.Transaction(
                data.new_metadata(filepath, 1), datetime.date(2026, 1, 5), "*", "Cafe", "Coffee",
                frozenset(), frozenset(), [
                    data.Posting(self.acct, Amount(D("-5.25"), "USD"), None, None, None, None),
                    data.Posting("Expenses:Food", Amount(D("5.25"), "USD"), None, None, None, None)])]

    class Named(Bank):
        @property
        def name(self): return "bank-" + self.acct.rsplit(":", 1)[1].lower()

    class Literal(Bank):
        name = "Bank#1"

    class Card(Bank):
        def identify(self, filepath): return filepath.endswith(".card")

    CONFIG = [BANKS]
""")

SAME = 'Bank("Assets:Checking"), Bank("Assets:Savings"), Card("Assets:Checking")'
DISTINCT = 'Named("Assets:Checking"), Named("Assets:Savings")'
COLLIDING = 'Bank("Assets:Checking"), Bank("Assets:Savings"), Literal("Assets:Broker")'


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_") and k != "CI"}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=120,
        stdin=subprocess.DEVNULL,
    )


def _books(tmp_path: Path, importers: str) -> tuple[Path, list[str]]:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER, encoding="utf-8")
    (tmp_path / "imp.py").write_text(IMPORTER.replace("BANKS", importers), encoding="utf-8")
    (tmp_path / "stmt.txt").write_text("statement\n", encoding="utf-8")
    return ledger, ["-f", "main.bean", "import", "stmt.txt", "--config", "imp.py"]


def test_same_named_importers_are_listed_with_a_working_selector(tmp_path: Path) -> None:
    ledger, args = _books(tmp_path, SAME)

    for extra in ([], ["--importer", "Bank"]):
        refused = _bea(tmp_path, *args, *extra, "--apply")
        assert refused.returncode == 2, refused.stderr
        assert "share a name" in refused.stderr
        assert "--importer NAME#N" in refused.stderr
        assert "Bank#1 (Assets:Checking)" in refused.stderr
        assert "Bank#2 (Assets:Savings)" in refused.stderr
        assert ledger.read_text(encoding="utf-8") == LEDGER

    applied = _bea(tmp_path, *args, "--importer", "Bank#2", "--apply")
    assert applied.returncode == 0, applied.stderr
    written = ledger.read_text(encoding="utf-8")
    assert "Assets:Savings  -5.25 USD" in written
    assert "Assets:Checking  -5.25 USD" not in written


def test_same_named_importers_json_error_names_each_selector(tmp_path: Path) -> None:
    _, args = _books(tmp_path, SAME)

    refused = _bea(tmp_path, "--json", *args)
    assert refused.returncode == 2
    error = json.loads(refused.stderr)["error"]
    assert error["details"] == ["Bank#1 (Assets:Checking)", "Bank#2 (Assets:Savings)"]

    preview = _bea(tmp_path, "--json", *args, "--importer", "Bank#1")
    assert preview.returncode == 0, preview.stderr
    assert json.loads(preview.stdout)["data"]["account"] == "Assets:Checking"


def test_a_selector_past_the_last_instance_lists_the_available_ones(tmp_path: Path) -> None:
    _, args = _books(tmp_path, SAME)

    unknown = _bea(tmp_path, *args, "--importer", "Bank#3")
    assert unknown.returncode == 2
    assert "No importer named 'Bank#3'" in unknown.stderr
    assert "Bank#1, Bank#2, Card" in unknown.stderr


def test_distinctly_named_importers_are_unchanged(tmp_path: Path) -> None:
    ledger, args = _books(tmp_path, DISTINCT)

    refused = _bea(tmp_path, *args)
    assert refused.returncode == 2
    assert "Multiple importers match; choose one with --importer." in refused.stderr
    assert "bank-checking" in refused.stderr and "bank-savings" in refused.stderr
    assert "#" not in refused.stderr

    applied = _bea(tmp_path, *args, "--importer", "bank-savings", "--apply")
    assert applied.returncode == 0, applied.stderr
    assert "Assets:Savings  -5.25 USD" in ledger.read_text(encoding="utf-8")


def test_a_generated_selector_skips_a_name_another_importer_declares(tmp_path: Path) -> None:
    # A third importer declared as `Bank#1` keeps that name; the listed
    # selector for Checking must not be one that chooses it.
    ledger, args = _books(tmp_path, COLLIDING)

    refused = _bea(tmp_path, "--json", *args, "--importer", "Bank")
    assert refused.returncode == 2
    assert json.loads(refused.stderr)["error"]["details"] == ["Bank#2 (Assets:Checking)", "Bank#3 (Assets:Savings)"]

    for selector, account in (("Bank#2", "Assets:Checking"), ("Bank#3", "Assets:Savings"), ("Bank#1", "Assets:Broker")):
        preview = _bea(tmp_path, "--json", *args, "--importer", selector)
        assert preview.returncode == 0, preview.stderr
        assert json.loads(preview.stdout)["data"]["account"] == account
    assert ledger.read_text(encoding="utf-8") == LEDGER
