"""Remember only validated CSV settings without re-reading an already imported source."""

from __future__ import annotations

import hashlib
import json
import os
from collections.abc import Sequence
from pathlib import Path
from typing import Any

import pytest
from typer.testing import CliRunner

from cli.engine import launch
from cli.main import app

MAPPING = "date=Date,amount=Amount,narration=Description"


@pytest.fixture
def csv_import(tmp_path: Path) -> tuple[Path, Path, list[str]]:
    ledger = tmp_path / "main.bean"
    ledger.write_text(
        'option "operating_currency" "USD"\n'
        "2026-01-01 open Assets:Checking USD\n"
        "2026-01-01 open Expenses:Uncategorized USD\n"
        "2026-01-01 open Expenses:Food USD\n"
    )
    source = tmp_path / "bank.csv"
    source.write_text("Date,Description,Amount\n2026-02-01,Coffee,-4.50\n")
    args = [
        "--json",
        "--no-input",
        "--file",
        str(ledger),
        "import",
        str(source),
        "--csv",
        MAPPING,
        "--account",
        "Assets:Checking",
    ]
    return ledger, source, args


def _record(ledger: Path, config: Path) -> Path:
    key = hashlib.sha256(str(ledger.resolve()).encode()).hexdigest()
    return config / "importers" / f"csv-{key}.json"


@pytest.mark.parametrize("source_change", ["remove", "replace"])
def test_applied_import_remembers_validated_headers_when_source_changes(
    csv_import: tuple[Path, Path, list[str]],
    bea_config_dir: Path,
    monkeypatch: pytest.MonkeyPatch,
    source_change: str,
) -> None:
    ledger, source, args = csv_import
    real_helper = launch.helper_json

    def launch_then_change_source(
        args: Sequence[str], *, stdin: str | None = None, writes: bool = False
    ) -> dict[str, Any]:
        result = real_helper(args, stdin=stdin, writes=writes)
        assert writes and "--apply" in args
        assert result["written"] == 1
        if source_change == "remove":
            source.unlink()
        else:
            source.write_text("Different,Headers\nreplacement,source\n")
        return result

    monkeypatch.setattr(launch, "helper_json", launch_then_change_source)

    result = CliRunner().invoke(app, [*args, "--apply"])

    assert result.exit_code == 0, result.output
    data = json.loads(result.stdout)["data"]
    assert data["written"] == 1
    assert data["validation_errors"] == []
    assert ledger.read_text().count('"Coffee"') == 1
    (stored,) = json.loads(_record(ledger, bea_config_dir).read_text())["sources"]
    assert stored["headers"] == ["Date", "Description", "Amount"]
    assert stored["mapping"] == MAPPING
    assert stored["account"] == "Assets:Checking"
    assert stored["source"] == "bank.csv"


@pytest.mark.skipif(os.name != "posix", reason="POSIX file permissions")
def test_unsaved_refresh_warns_without_claiming_remembered_settings_were_discarded(
    csv_import: tuple[Path, Path, list[str]], bea_config_dir: Path
) -> None:
    ledger, source, args = csv_import
    before_ledger = ledger.read_bytes()
    rules = source.with_suffix(".toml")
    rules.write_text('[[rule]]\nmatch = "Coffee"\naccount = "Expenses:Food"\n')
    runner = CliRunner()
    seeded = runner.invoke(app, [*args, "--rules", str(rules)])
    assert seeded.exit_code == 0, seeded.output
    assert json.loads(seeded.stdout)["data"]["ready"] == 1
    record = _record(ledger, bea_config_dir)
    original = record.read_bytes()
    record.chmod(0o444)

    try:
        refreshed = runner.invoke(app, args[1:])

        assert refreshed.exit_code == 0, refreshed.output
        assert "1 ready" in refreshed.stdout
        assert "Could not remember the column mapping" in refreshed.stderr
        assert record.read_bytes() == original
        assert ledger.read_bytes() == before_ledger
        assert "Discarded remembered" not in refreshed.stderr
        refreshed_json = runner.invoke(app, args)
        assert refreshed_json.exit_code == 0, refreshed_json.output
        data = json.loads(refreshed_json.stdout)["data"]
        assert data["ready"] == 1
        assert all("Discarded remembered" not in note for note in data.get("notes", []))
        assert record.read_bytes() == original
        assert ledger.read_bytes() == before_ledger
    finally:
        record.chmod(0o600)


@pytest.mark.parametrize(
    "corrupt",
    [
        {"sources": 5},
        {"sources": "abc"},
        {"sources": [{"headers": [1, 2], "account": "Assets:Checking", "mapping": "x"}]},
        {"sources": [{"headers": "Date", "account": "Assets:Checking", "mapping": "x"}, 7]},
        [1, 2],
    ],
    ids=["int-sources", "str-sources", "int-headers", "str-headers", "list-record"],
)
def test_corrupt_record_reads_as_no_memory_and_is_rewritten(
    csv_import: tuple[Path, Path, list[str]], bea_config_dir: Path, corrupt: object
) -> None:
    ledger, source, args = csv_import
    record = _record(ledger, bea_config_dir)
    record.parent.mkdir(parents=True, exist_ok=True)
    record.write_text(json.dumps(corrupt))
    runner = CliRunner()

    # A flag-free run over the corrupt record recalls nothing and does not crash.
    flag_free = ["--json", "--no-input", "--file", str(ledger), "import", str(source), "--account", "Assets:Checking"]
    recalled_nothing = runner.invoke(app, flag_free)
    assert recalled_nothing.exit_code == 0, recalled_nothing.output
    assert json.loads(recalled_nothing.stdout)["data"]["remembered"] is None

    applied = runner.invoke(app, [*args, "--apply"])

    assert applied.exit_code == 0, applied.output
    assert json.loads(applied.stdout)["data"]["written"] == 1
    (stored,) = json.loads(record.read_text())["sources"]
    assert stored["headers"] == ["Date", "Description", "Amount"]
    assert stored["mapping"] == MAPPING
    recalled = runner.invoke(app, flag_free)
    assert recalled.exit_code == 0, recalled.output
    assert json.loads(recalled.stdout)["data"]["remembered"]["mapping"] == MAPPING
