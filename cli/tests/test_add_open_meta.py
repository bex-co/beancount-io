"""`bea add open --meta` declares what an account is, such as its cash-flow role (w1/320)."""

from __future__ import annotations

import json
from pathlib import Path

from typer.testing import CliRunner

from cli.main import app

runner = CliRunner()
REMEDY = "(bea add open cannot change an existing open)"
LEDGER = 'option "operating_currency" "USD"\n\n2026-01-01 open Income:Salary USD\n'


def _bea(*args: str) -> tuple[int, str, str]:
    result = runner.invoke(app, list(args))
    return result.exit_code, result.stdout, result.stderr


def _ledger(tmp_path: Path, text: str = LEDGER) -> Path:
    ledger = tmp_path / "main.bean"
    ledger.write_text(text)
    return ledger


def test_declared_role_is_written_and_read_by_cash_flow(tmp_path: Path) -> None:
    # A bank named after its institution is not cash by name; declaring the
    # role at opening is what the cash-flow report tells an agent to do.
    ledger = _ledger(tmp_path)
    code, out, err = _bea(
        "--file",
        str(ledger),
        "add",
        "open",
        "--date",
        "2026-01-01",
        "--account",
        "Assets:Revolut",
        "-c",
        "USD",
        "--meta",
        "cash-flow-role:cash",
    )
    assert code == 0, out + err
    assert ledger.read_text().endswith('2026-01-01 open Assets:Revolut USD\n  cash-flow-role: "cash"\n')

    code, out, err = _bea(
        "--file", str(ledger), "add", "transaction", "Pay", "--date", "2026-01-15",
        "-p", "Assets:Revolut 3000.00 USD", "-p", "Income:Salary",
    )  # fmt: skip
    assert code == 0, out + err
    code, out, err = _bea("--json", "--file", str(ledger), "report", "cash-flow")
    assert code == 0, out + err
    data = json.loads(out)["data"]
    assert [entry["account"] for entry in data["cash_accounts"]] == ["Assets:Revolut"]
    assert data["closing"] == {"USD": "3000.00"}


def test_typed_meta_keeps_its_type_on_disk_and_in_json(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)
    code, out, err = _bea(
        "--json", "--file", str(ledger), "add", "open", "--date", "2026-01-02", "-a", "Assets:Wise",
        "--meta", "cash-flow-role:cash", "--meta", "since:2019-05-01", "--meta", "priority:2",
    )  # fmt: skip
    assert code == 0, out + err
    meta = json.loads(out)["data"]["directive"]["meta"]
    # The tagged shape `add transaction` and `add commodity` answer with.
    assert meta == {
        "cash-flow-role": "cash",
        "since": {"kind": "date", "value": "2019-05-01"},
        "priority": {"kind": "number", "value": "2"},
    }
    text = ledger.read_text()
    assert '  cash-flow-role: "cash"\n  since: 2019-05-01\n  priority: 2\n' in text
    assert _bea("--file", str(ledger), "check")[0] == 0


def test_an_open_without_meta_is_unchanged(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)
    code, out, err = _bea("--file", str(ledger), "add", "open", "--date", "2026-01-03", "-a", "Assets:Cash")
    assert code == 0, out + err
    assert ledger.read_text().endswith("\n2026-01-03 open Assets:Cash\n")


def test_an_invalid_meta_key_is_refused_before_writing(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)
    before = ledger.read_bytes()
    code, out, err = _bea(
        "--file", str(ledger), "add", "open", "--date", "2026-01-04", "-a", "Assets:Cash", "--meta", "Role:cash"
    )
    assert code == 2, out + err
    assert "Invalid --meta key 'Role'" in out + err
    assert ledger.read_bytes() == before


def test_meta_for_an_open_account_names_the_line_to_add(tmp_path: Path) -> None:
    # The account the report misclassified is already open, and an account
    # opens once: the refusal says what to put under the existing open.
    ledger = _ledger(tmp_path, LEDGER + "2026-01-01 open Assets:Revolut USD\n")
    before = ledger.read_bytes()
    code, out, err = _bea(
        "--json", "--file", str(ledger), "add", "open", "--date", "2026-01-01", "-a", "Assets:Revolut",
        "--meta", "cash-flow-role:cash",
    )  # fmt: skip
    assert code == 1, out + err
    assert ledger.read_bytes() == before
    details = json.loads(err)["error"]["details"]
    assert (
        f"Assets:Revolut is already opened at {ledger}:4; an account opens once. "
        f'To add cash-flow-role: "cash", edit that open\'s metadata {REMEDY}.'
    ) in details


def test_widening_and_meta_are_one_edit_to_the_existing_open(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path, LEDGER + '2026-01-01 open Assets:Revolut USD\n  cash-flow-role: "operating"\n')
    code, out, err = _bea(
        "--file", str(ledger), "add", "open", "--date", "2026-01-01", "-a", "Assets:Revolut",
        "-c", "USD", "-c", "EUR", "--meta", "cash-flow-role:cash",
    )  # fmt: skip
    assert code == 1, out + err
    text = " ".join((out + err).split())
    assert (
        "To allow EUR too, edit that open to '2026-01-01 open Assets:Revolut USD,EUR' and set "
        f'cash-flow-role: "cash" under it {REMEDY}.'
    ) in text


def test_meta_the_existing_open_already_has_adds_nothing_to_the_hint(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path, LEDGER + '2026-01-01 open Assets:Revolut\n  cash-flow-role: "cash"\n')
    code, out, err = _bea(
        "--file", str(ledger), "add", "open", "--date", "2026-01-01", "-a", "Assets:Revolut",
        "--meta", "cash-flow-role:cash",
    )  # fmt: skip
    assert code == 1, out + err
    text = " ".join((out + err).split())
    assert f"Assets:Revolut is already opened at {ledger}:4 for any currency; an account opens once." in text
    assert "edit that open's metadata" not in text
