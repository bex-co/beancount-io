"""Same-day value disagreements are conflicts across add and import (w5/677)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
HEADER = (
    'option "operating_currency" "USD"\n'
    'include "values.bean"\n'
    "2026-01-01 open Assets:Cash USD\n"
    "2026-01-01 open Equity:Opening USD\n"
    "2026-01-01 commodity EUR\n"
    "2026-01-01 commodity USD\n"
)
VALUES = "2026-01-03 price EUR 1.10 USD\n2026-01-03 balance Assets:Cash 0.00 USD\n"
IMPORTER = """\
import datetime
from decimal import Decimal
from beancount.core import amount, data


class Quotes:
    name = "quotes"

    def identify(self, filepath):
        return filepath.endswith("quotes.txt")

    def account(self, filepath):
        return "Assets:Cash"

    def extract(self, filepath, existing):
        return [data.Price(
            data.new_metadata(filepath, 1), datetime.date(2026, 1, 3),
            "EUR", amount.Amount(Decimal("1.20"), "USD"),
        )]


CONFIG = [Quotes()]
"""


def _books(tmp_path: Path, *, values: str = VALUES, plugin: bool = False) -> Path:
    root = tmp_path / "main.bean"
    root.write_text(('plugin "beancount.plugins.unique_prices"\n' if plugin else "") + HEADER)
    (tmp_path / "values.bean").write_text(values)
    return root


def _bea(root: Path, json_output: bool, *args: str) -> subprocess.CompletedProcess[str]:
    env = {
        key: value
        for key, value in os.environ.items()
        if not key.startswith("BEA_") and key not in {"CI", "BEANCOUNT_LOAD_CACHE_FILENAME"}
    }
    env.update(
        BEA_CONFIG_DIR=str(root.parent / "config"),
        XDG_CACHE_HOME=str(root.parent / "cache"),
        XDG_DATA_HOME=str(root.parent / "data"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return subprocess.run(
        [
            sys.executable,
            "-m",
            "cli.main",
            "--no-input",
            *(["--json"] if json_output else []),
            "--file",
            str(root),
            *args,
        ],
        env=env,
        cwd=root.parent,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=120,
    )


def _error(result: subprocess.CompletedProcess[str], json_output: bool, code: int = 4) -> str:
    assert result.returncode == code, result.stdout + result.stderr
    assert not result.stdout, result.stdout
    if json_output:
        error = json.loads(result.stderr)["error"]
        assert error["category"] == ("conflict" if code == 4 else "usage"), error
        assert error["exit_code"] == code, error
        return json.dumps(error, ensure_ascii=False)
    assert "Error:" in result.stderr, result.stderr
    return " ".join(result.stderr.split())


def _snapshot(root: Path) -> dict[Path, bytes]:
    return {path: path.read_bytes() for path in root.parent.glob("*.bean")}


def _price(amount: str, *, currency: str = "EUR") -> list[str]:
    return ["add", "price", "--date", "2026-01-03", "--currency", currency, "--amount", amount]


def _balance(amount: str) -> list[str]:
    return ["add", "balance", "--date", "2026-01-03", "--account", "Assets:Cash", "--amount", amount]


@pytest.mark.parametrize("json_output", [False, True], ids=["text", "json"])
@pytest.mark.parametrize("operation", ["add", "import"])
def test_add_and_import_apply_report_the_same_price_conflict(tmp_path: Path, json_output: bool, operation: str) -> None:
    root = _books(tmp_path)
    before = _snapshot(root)
    if operation == "add":
        command = _price("1.20 USD")
    else:
        config = tmp_path / "imp.py"
        config.write_text(IMPORTER)
        statement = tmp_path / "quotes.txt"
        statement.write_text("one quote\n")
        command = ["import", str(statement), "--config", str(config)]
        preview = _bea(root, json_output, *command)
        assert preview.returncode == 0, preview.stdout + preview.stderr
        if json_output:
            [row] = json.loads(preview.stdout)["data"]["rows"]
            assert row["status"] == "conflict", row
        assert _snapshot(root) == before
        command.append("--apply")

    message = _error(_bea(root, json_output, *command), json_output)

    assert "1.10 USD" in message and "1.20 USD" in message, message
    assert "values.bean:1" in message, message
    assert _snapshot(root) == before


@pytest.mark.parametrize("json_output", [False, True], ids=["text", "json"])
@pytest.mark.parametrize("pad", [False, True], ids=["plain", "pad"])
@pytest.mark.parametrize(
    ("amount", "remedy"),
    # Only the same number at another precision can land with --force (w1/366).
    [("7 USD", "so correct or delete the assertion at"), ("0.000 USD", "Pass --force to record another assertion")],
    ids=["value", "precision"],
)
def test_balance_disagreement_is_a_conflict_before_any_pad_write(
    tmp_path: Path, json_output: bool, pad: bool, amount: str, remedy: str
) -> None:
    root = _books(tmp_path)
    before = _snapshot(root)
    extra = ["--pad-from", "Equity:Opening", "--pad-date", "2026-01-02"] if pad else []

    message = _error(_bea(root, json_output, *_balance(amount), *extra), json_output)

    assert "balance of 0.00 USD" in message and f"refusing {amount}" in message, message
    assert "values.bean:2" in message and remedy in message, message
    assert _snapshot(root) == before


@pytest.mark.parametrize("json_output", [False, True], ids=["text", "json"])
@pytest.mark.parametrize(
    ("written", "currency", "amount"),
    [("USD 0.80 EUR", "EUR", "1.20 USD"), ("EUR 1.10 USD", "USD", "0.80 EUR")],
    ids=["usd-to-eur", "eur-to-usd"],
)
def test_disagreeing_reciprocal_quote_is_also_a_conflict(
    tmp_path: Path, json_output: bool, written: str, currency: str, amount: str
) -> None:
    root = _books(tmp_path, values=f"2026-01-03 price {written}\n")
    before = _snapshot(root)

    message = _error(_bea(root, json_output, *_price(amount, currency=currency)), json_output)

    assert "other direction of this pair" in message and "disagrees" in message, message
    assert written.split(" ", 1)[1] in message and amount in message, message
    assert "values.bean:1" in message and "--force" in message, message
    assert _snapshot(root) == before


@pytest.mark.parametrize("json_output", [False, True], ids=["text", "json"])
@pytest.mark.parametrize("force", [False, True], ids=["plain", "forced"])
def test_unique_prices_policy_conflict_keeps_code_four_even_with_force(
    tmp_path: Path, json_output: bool, force: bool
) -> None:
    root = _books(tmp_path, plugin=True)
    before = _snapshot(root)

    message = _error(_bea(root, json_output, *_price("1.20 USD"), *(["--force"] if force else [])), json_output)

    assert "unique_prices" in message and "edit the existing price" in message, message
    assert "values.bean:1" in message and "--force" not in message, message
    assert _snapshot(root) == before


@pytest.mark.parametrize("json_output", [False, True], ids=["text", "json"])
def test_duplicates_force_and_malformed_input_keep_their_distinct_outcomes(tmp_path: Path, json_output: bool) -> None:
    root = _books(tmp_path)
    before = _snapshot(root)
    for command in (_price("1.100 USD"), _balance("0.00 USD")):
        duplicate = _bea(root, json_output, *command)
        assert duplicate.returncode == 0, duplicate.stdout + duplicate.stderr
        if json_output:
            data = json.loads(duplicate.stdout)["data"]
            assert data["duplicate"] is True and data["written"] == 0, data
        else:
            assert "already recorded" in duplicate.stdout, duplicate.stdout
        assert _snapshot(root) == before

    for command in (_price("not-a-number USD"), _balance("not-a-number USD")):
        _error(_bea(root, json_output, *command), json_output, code=2)
        assert _snapshot(root) == before

    # Beancount allows one balance number per day, so --force cannot land a
    # different one: it stays a conflict, not a failed write (w1/366).
    forced_balance = _error(_bea(root, json_output, *_balance("7 USD"), "--force"), json_output)
    assert "values.bean:2" in forced_balance and "--force" not in forced_balance, forced_balance
    assert _snapshot(root) == before

    forced = _bea(root, json_output, *_price("1.20 USD"), "--force")
    assert forced.returncode == 0, forced.stdout + forced.stderr
    if json_output:
        assert json.loads(forced.stdout)["data"]["written"] == 1
    assert root.read_bytes() != before[root]
    assert (tmp_path / "values.bean").read_bytes() == before[tmp_path / "values.bean"]
    assert "2026-01-03 price EUR 1.20 USD" in " ".join(root.read_text().split())
