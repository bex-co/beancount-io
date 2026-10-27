"""A funded close on the calendar's last day is refused or warned about, not crashed (w5/1070).

The drained-coverage check computed the day after the close, which 9999-12-31
does not have: `add close` raised OverflowError and the import of the same
native-valid close failed in preview and apply.
"""

from __future__ import annotations

import json
from pathlib import Path

from tests.test_import_funded_close_warning import IMPORTER
from tests.test_import_source_facts import _bea

LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
2024-01-01 open Equity:Opening USD
2024-01-02 * "Fund"
  Assets:Cash 100.00 USD
  Equity:Opening -100.00 USD
"""


def test_the_direct_close_keeps_its_funded_refusal(tmp_path: Path) -> None:
    (tmp_path / "main.bean").write_text(LEDGER)

    refused = _bea(tmp_path, "add", "close", "--account", "Assets:Cash", "--date", "9999-12-31")

    assert refused.returncode == 1, refused.stdout
    message = json.loads(refused.stderr)["error"]["message"]
    assert "OverflowError" not in message and "100.00 USD" in message
    assert (tmp_path / "main.bean").read_text() == LEDGER
    forced = _bea(tmp_path, "add", "close", "--account", "Assets:Cash", "--date", "9999-12-31", "--force")
    assert forced.returncode == 0, forced.stderr


def test_the_import_keeps_its_warning(tmp_path: Path) -> None:
    (tmp_path / "main.bean").write_text(LEDGER)
    (tmp_path / "importers.py").write_text(IMPORTER.replace("{text!r}", repr("9999-12-31 close Assets:Cash\n")))
    (tmp_path / "bank.txt").write_text("synthetic\n")

    for flags in ([], ["--apply"]):
        result = _bea(tmp_path, "import", "bank.txt", "--config", "importers.py", *flags)
        assert result.returncode == 0, result.stderr
        (warning,) = json.loads(result.stdout)["data"]["validation_warnings"]
        assert "Assets:Cash" in warning and "100" in warning
