"""A canonical source-row identity takes precedence over mutable native-ID comparisons."""

from __future__ import annotations

import hashlib
import textwrap
from pathlib import Path

from bea_engine import importing


def test_canonical_generated_id_wins_over_native_id_after_ledger_edits(tmp_path: Path) -> None:
    digest = hashlib.sha256(b"2026-02-02|-20 USD|RAW DESCRIPTION|Assets:Checking").hexdigest()[:16]
    identifier = f"csv:sha256:{digest}"
    ledger = tmp_path / "main.bean"
    ledger.write_text(
        "2026-01-01 open Assets:Checking USD\n"
        "2026-01-01 open Expenses:Food USD\n\n"
        '2026-02-03 * "Cleaned merchant" "Reviewed description"\n'
        f'  import-id: "{identifier}"\n'
        '  bank_id: "bank-1"\n'
        "  Assets:Checking  -21 USD\n"
        "  Expenses:Food     21 USD\n",
        encoding="utf-8",
    )
    before = ledger.read_bytes()
    source = tmp_path / "source.bean"
    source.write_text(
        '2026-02-02 ! "Raw merchant" "Raw description"\n'
        f'  import-id: "{identifier}"\n'
        '  bank_id: "bank-1"\n'
        "  Assets:Checking  -20 USD\n"
        "  Expenses:Food     20 USD\n\n"
        '2026-02-10 ! "Cafe" "New coffee"\n'
        '  bank_id: "bank-2"\n'
        "  Assets:Checking  -3 USD\n"
        "  Expenses:Food     3 USD\n",
        encoding="utf-8",
    )
    config = tmp_path / "importer.py"
    config.write_text(
        textwrap.dedent("""
            from beancount.parser import parser

            class SourceRows:
                name = "Canonical and native identities"

                def identify(self, filepath):
                    return True

                def account(self, filepath):
                    return "Assets:Checking"

                def extract(self, filepath, existing):
                    entries, errors, _ = parser.parse_file(filepath)
                    assert not errors, errors
                    return entries

            CONFIG = [SourceRows()]
        """),
        encoding="utf-8",
    )

    preview = importing.answer(ledger, source, config=config)

    assert [row["status"] for row in preview["rows"]] == ["duplicate", "new"]
    assert preview["rows"][0]["reason"] == f"import-id {identifier} is already in the ledger."
    assert preview["conflicts"] == 0
    assert ledger.read_bytes() == before

    applied = importing.answer(ledger, source, config=config, apply=True)

    assert applied["duplicates"] == 1
    assert applied["written"] == 1
    assert ledger.read_bytes().startswith(before)
    assert ledger.read_text().count(f'import-id: "{identifier}"') == 1
    assert ledger.read_text().count('"New coffee"') == 1

    after = ledger.read_bytes()
    repeated = importing.answer(ledger, source, config=config, apply=True)
    assert repeated["duplicates"] == 2
    assert repeated["written"] == 0
    assert ledger.read_bytes() == after
