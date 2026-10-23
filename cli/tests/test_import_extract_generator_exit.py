"""An exit inside a generator returned by `extract()` is the method's, not the configuration's (w5/953).

`SystemExit` was caught only around the call to `extract`, so a generator body
that exited while being consumed fell to the configuration-load handler, which
advised guarding an `Ingest(CONFIG)()` call the configuration never made.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

LEDGER = "2024-01-01 open Assets:Cash USD\n2024-01-01 open Expenses:Food USD\n"
IMPORTER = """from datetime import date
from decimal import Decimal
from beancount.core.data import Transaction, Posting, new_metadata
from beancount.core.amount import Amount

class Rows:
    def identify(self, file):
        return str(file).endswith(".bank")
    def account(self, file):
        return "Assets:Cash"
    def extract(self, file, existing=None):
        entry = Transaction(
            new_metadata(file, 1), date(2024, 1, 2), "*", None, "Coffee",
            frozenset(), frozenset(), [
                Posting("Assets:Cash", Amount(Decimal("-7.75"), "USD"), None, None, None, None),
                Posting("Expenses:Food", Amount(Decimal("7.75"), "USD"), None, None, None, None),
            ],
        )
        yield entry
        {tail}

CONFIG = [Rows()]
"""


def _books(tmp_path: Path, tail: str) -> None:
    (tmp_path / "main.bean").write_text(LEDGER)
    (tmp_path / "importer.py").write_text(IMPORTER.format(tail=tail))
    (tmp_path / "statement.bank").write_text("Synthetic statement\n")


def _message(result: object) -> str:
    return " ".join(json.loads(result.stderr)["error"]["message"].split())  # type: ignore[attr-defined]


@pytest.mark.parametrize("status", ["0", "2"])
@pytest.mark.parametrize("flags", [[], ["--apply"]], ids=["preview", "apply"])
def test_a_generator_exit_names_extract_not_the_configuration(tmp_path: Path, status: str, flags: list[str]) -> None:
    _books(tmp_path, f"raise SystemExit({status})")
    before = (tmp_path / "main.bean").read_bytes()

    result = _bea(tmp_path, "import", "statement.bank", "--config", "importer.py", *flags)

    assert result.returncode == 1, result.stdout
    message = _message(result)
    assert f"Importer Rows extract() called sys.exit ({status})" in message
    assert "Ingest(CONFIG)" not in message
    assert (tmp_path / "main.bean").read_bytes() == before


def test_a_finite_generator_still_imports(tmp_path: Path) -> None:
    _books(tmp_path, "pass")

    preview = _bea(tmp_path, "import", "statement.bank", "--config", "importer.py")
    applied = _bea(tmp_path, "import", "statement.bank", "--config", "importer.py", "--apply")

    assert preview.returncode == 0, preview.stderr
    assert json.loads(applied.stdout)["data"]["written"] == 1


def test_a_module_level_exit_keeps_the_configuration_hint(tmp_path: Path) -> None:
    _books(tmp_path, "pass")
    (tmp_path / "importer.py").write_text(IMPORTER.format(tail="pass") + "\nimport sys\nsys.exit(0)\n")

    result = _bea(tmp_path, "import", "statement.bank", "--config", "importer.py")

    assert result.returncode == 1, result.stdout
    assert "Ingest(CONFIG)" in _message(result)
