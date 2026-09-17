"""Ledgers saved with a UTF-8 BOM behave like plain UTF-8 ones (w3/257)."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from typer.testing import CliRunner

from bea_engine import compat
from bea_engine.ledger.text import decode_error_message as engine_decode_error_message
from cli.commands.check import _closure_needs_compat
from cli.commands.format import _raw, _strip_bom, _would_change
from cli.errors import BeaError, LedgerError
from cli.main import app
from cli.utils import decode_error_message as cli_decode_error_message
from cli.utils import has_bom

runner = CliRunner()
BOM = b"\xef\xbb\xbf"
ENTRY = (
    'option "operating_currency" "USD"\ninclude "sub.bean"\n'
    "2020-01-01 open Assets:Cash USD\n2020-01-01 open Expenses:Food USD\n"
)
SUB = '2026-01-01 * "Lunch"\n  Expenses:Food 10.00 USD\n  Assets:Cash\n'


@pytest.fixture
def marked(tmp_path: Path) -> Path:
    file = tmp_path / "main.bean"
    file.write_bytes(BOM + ENTRY.encode("utf-8"))
    (tmp_path / "sub.bean").write_bytes(BOM + SUB.encode("utf-8"))
    return file


def test_check_accepts_bom_entry_and_include(marked: Path) -> None:
    assert runner.invoke(app, ["--file", str(marked), "check"]).exit_code == 0

    result = runner.invoke(app, ["--json", "--file", str(marked), "check"])

    assert result.exit_code == 0, result.output
    assert json.loads(result.stdout)["data"] == {"valid": True, "errors": []}


def test_reads_see_through_the_mark(marked: Path) -> None:
    result = runner.invoke(app, ["--json", "--file", str(marked), "list", "transaction"])

    assert result.exit_code == 0, result.output
    assert json.loads(result.stdout)["data"][0]["narration"] == "Lunch"

    query = runner.invoke(app, ["--file", str(marked), "query", "SELECT account LIMIT 1"])
    assert query.exit_code == 0, query.output
    assert "Expenses:Food" in query.stdout

    report = runner.invoke(app, ["--file", str(marked), "report", "trial-balance"])
    assert report.exit_code == 0, report.output
    assert "Trial Balance" in report.stdout


def test_errors_still_name_the_real_file(tmp_path: Path) -> None:
    file = tmp_path / "main.bean"
    file.write_bytes(BOM + b'2020-01-01 open Assets:Cash USD\n2026-01-01 * "X"\n  Assets:Cash 1 USD\n  Expenses:Food\n')

    result = runner.invoke(app, ["--json", "--file", str(file), "check"])

    assert result.exit_code == 1, result.output
    (detail,) = json.loads(result.stderr)["error"]["details"]
    assert detail.startswith(f"{file}:2: "), detail


def test_add_preserves_the_mark_and_stays_valid(marked: Path) -> None:
    before = marked.read_bytes()

    result = runner.invoke(
        app,
        [
            "--file",
            str(marked),
            "add",
            "transaction",
            "--date",
            "2026-03-01",
            "--narration",
            "Tea",
            "-p",
            "Expenses:Food 2 USD",
            "-p",
            "Assets:Cash",
        ],
    )

    assert result.exit_code == 0, result.output
    after = marked.read_bytes()
    assert after.startswith(BOM)
    assert after[len(BOM) :].startswith(before[len(BOM) :])
    assert runner.invoke(app, ["--file", str(marked), "check"]).exit_code == 0


def test_format_in_place_removes_the_mark_and_converges(marked: Path) -> None:
    sub = marked.parent / "sub.bean"

    first = runner.invoke(app, ["format", str(marked), str(sub), "-i"])

    assert first.exit_code == 0, first.output
    assert not marked.read_bytes().startswith(BOM)
    assert not sub.read_bytes().startswith(BOM)

    again = runner.invoke(app, ["format", str(marked), str(sub), "-i"])

    assert again.exit_code == 0, again.output
    assert "0/2" in again.stdout


def test_format_check_reports_a_marked_file_as_needing_formatting(marked: Path) -> None:
    result = runner.invoke(app, ["format", str(marked), "--check"])

    assert result.exit_code == 1, result.output
    assert "need formatting" in result.stderr
    assert marked.read_bytes().startswith(BOM)


def test_writes_never_introduce_a_mark(tmp_path: Path) -> None:
    file = tmp_path / "main.bean"
    file.write_text(ENTRY.replace('include "sub.bean"\n', "") + SUB)

    result = runner.invoke(
        app,
        [
            "--file",
            str(file),
            "add",
            "transaction",
            "--date",
            "2026-03-01",
            "--narration",
            "Tea",
            "-p",
            "Expenses:Food 2 USD",
            "-p",
            "Assets:Cash",
        ],
    )

    assert result.exit_code == 0, result.output
    assert not file.read_bytes().startswith(BOM)


def test_check_refuses_native_flags_on_a_marked_ledger(marked: Path) -> None:
    result = runner.invoke(app, ["--file", str(marked), "check", "-v"])

    assert result.exit_code == 2, result.output
    assert "cannot pass bean-check options (-v)" in result.stderr
    assert "bea format -i" in result.stderr


def test_closure_probe_tolerates_an_unreadable_closure(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    def _unreachable(root: Path) -> list[Path]:
        raise OSError("ledger tree is gone")

    monkeypatch.setattr("cli.output.ledger_closure", _unreachable)

    assert _closure_needs_compat(tmp_path / "main.bean") is None


def test_closure_probe_skips_a_member_that_vanished(tmp_path: Path) -> None:
    assert _closure_needs_compat(tmp_path / "missing.bean") is None
    assert has_bom(tmp_path / "missing.bean") is False


def test_strip_bom_ignores_a_missing_file(tmp_path: Path) -> None:
    assert _strip_bom(tmp_path / "missing.bean") is None


def test_strip_bom_keeps_an_unwritable_mark_for_upstream(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    file = tmp_path / "main.bean"
    file.write_bytes(BOM + ENTRY.encode("utf-8"))

    def _deny(self: Path, data: bytes) -> int:
        raise OSError("read-only filesystem")

    monkeypatch.setattr(Path, "write_bytes", _deny)

    assert _strip_bom(file) is None
    assert file.read_bytes().startswith(BOM)


def test_raw_reports_an_unreadable_file(tmp_path: Path) -> None:
    with pytest.raises(LedgerError, match="Could not read"):
        _raw(tmp_path / "missing.bean")


def test_would_change_falls_through_to_upstream_when_unreadable(tmp_path: Path) -> None:
    with pytest.raises(BeaError, match="bean-format could not read"):
        _would_change(tmp_path / "missing.bean", [])


def test_decode_failures_report_path_offset_and_remedy(tmp_path: Path) -> None:
    with pytest.raises(UnicodeDecodeError) as error:
        b"\xff\xfe bad".decode("utf-8")
    exc = error.value

    engine = engine_decode_error_message(tmp_path / "main.bean", exc)
    cli = cli_decode_error_message(tmp_path / "main.bean", exc)

    assert engine == cli
    assert "main.bean" in engine
    assert "byte 0" in engine
    assert "Re-save the file as UTF-8" in engine


def test_compat_install_is_idempotent() -> None:
    compat.install()
    compat.install()

    from beancount.parser import parser as beancount_parser

    assert getattr(beancount_parser.parse_file, "__bea_bom_wrapped__", False) is True
