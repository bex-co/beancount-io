"""`bea add open` refuses a `cash-flow-role` value the cash-flow report ignores (w1/329).

ADR003 defines the key with four case-sensitive values; the report falls
back to the name heuristic for anything else and only flags it. `add open`
wrote any value with exit 0 and empty warnings, so a declared bank read as
an investing outflow. The write is refused instead (exit 2, nothing
written), and the duplicate-open hint never echoes an invalid value back as
a hand edit.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from typer.testing import CliRunner

from cli.main import app

runner = CliRunner()
LEDGER = 'option "operating_currency" "USD"\n\n2026-01-01 open Income:Salary USD\n'


def _bea(*args: str) -> tuple[int, str, str]:
    result = runner.invoke(app, list(args))
    return result.exit_code, result.stdout, result.stderr


def _ledger(tmp_path: Path, text: str = LEDGER) -> Path:
    ledger = tmp_path / "main.bean"
    ledger.write_text(text)
    return ledger


def _add_open(ledger: Path, *meta: str) -> tuple[int, str, str]:
    args = ["--file", str(ledger), "add", "open", "--date", "2026-01-01", "-a", "Assets:Revolut", "-c", "USD"]
    for item in meta:
        args += ["--meta", item]
    return _bea(*args)


def test_a_wrong_case_role_is_refused_naming_the_four(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)
    before = ledger.read_bytes()

    code, out, err = _add_open(ledger, "cash-flow-role:Cash")

    assert code == 2, out + err
    text = out + err
    for role in ("cash", "operating", "investing", "financing"):
        assert role in text
    assert "'cash'" in text
    assert ledger.read_bytes() == before


def test_an_unknown_role_is_refused_without_writing(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)
    before = ledger.read_bytes()

    code, out, err = _add_open(ledger, "cash-flow-role:bank")

    assert code == 2, out + err
    assert "cash-flow-role" in out + err
    assert ledger.read_bytes() == before


@pytest.mark.parametrize("raw", ["cash-flow-role:TRUE", "cash-flow-role:1", 'cash-flow-role:""'])
def test_a_non_string_or_empty_role_is_refused(tmp_path: Path, raw: str) -> None:
    ledger = _ledger(tmp_path)
    before = ledger.read_bytes()

    code, out, err = _add_open(ledger, raw)

    assert code == 2, out + err
    assert "cash-flow-role" in out + err
    assert ledger.read_bytes() == before


def test_the_duplicate_open_hint_never_suggests_an_invalid_role(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path, LEDGER + "2026-01-01 open Assets:Revolut USD\n")
    before = ledger.read_bytes()

    code, out, err = _add_open(ledger, "cash-flow-role:Investing")

    assert code == 2, out + err
    assert "To add cash-flow-role" not in out + err
    assert ledger.read_bytes() == before


@pytest.mark.parametrize("role", ["cash", "operating", "investing", "financing"])
def test_each_valid_role_still_writes(tmp_path: Path, role: str) -> None:
    ledger = _ledger(tmp_path)

    code, out, err = _add_open(ledger, f"cash-flow-role:{role}")

    assert code == 0, out + err
    assert ledger.read_text().endswith(f'2026-01-01 open Assets:Revolut USD\n  cash-flow-role: "{role}"\n')


def test_other_metadata_keys_are_unaffected(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)

    code, out, err = _add_open(ledger, "note:Cash")

    assert code == 0, out + err
    assert "note:" in ledger.read_text()
