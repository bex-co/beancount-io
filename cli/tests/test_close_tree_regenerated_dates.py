"""A close that moves a generated descendant close earlier is judged at the new date (w5/1062).

`close_tree` regenerates descendants' closes from the explicit closes on each
load. Closing an empty grandparent on February 1 moved a funded grandchild's
generated close from December 31 (its branch's explicit close) to February 1.
`add close` read the grandchild as already closed and wrote unforced, and an
imported close skipped its funded-close warning; a March transfer the original
ledger allows was then refused.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from tests.test_add_close_drained_uncovered import _bea

OPTIONS = (
    'option "name_assets" "Activos"\noption "name_liabilities" "Pasivos"\noption "name_equity" "Capital"\n'
    'option "name_income" "Ingresos"\noption "name_expenses" "Gastos"\n'
)
TREE = 'plugin "beancount.plugins.close_tree"\n'


def _ledger(
    *,
    roots: str = "Assets",
    equity: str = "Equity",
    currency: str = "USD",
    number: str = "100.00",
    plugin: str = TREE,
    branch_close: str | None = "2024-12-31",
    extra: str = "",
) -> str:
    bank = f"{roots}:Bank"
    lines = [
        *([OPTIONS] if roots != "Assets" else []),
        f'option "operating_currency" "{currency}"\n',
        plugin,
        *(f"2024-01-01 open {account} {currency}\n" for account in _accounts(roots, equity)),
        f'2024-01-02 * "Fund"\n  {bank}:Branch:Checking {number} {currency}\n  {equity}:Opening -{number} {currency}\n',
        *([f"{branch_close} close {bank}:Branch\n"] if branch_close else []),
        extra,
    ]
    return "".join(lines)


def _accounts(roots: str, equity: str) -> list[str]:
    bank = f"{roots}:Bank"
    return [bank, f"{bank}:Branch", f"{bank}:Branch:Checking", f"{roots}:Other", f"{equity}:Opening"]


def _book(tmp_path: Path, ledger: str) -> Path:
    path = tmp_path / "main.bean"
    path.write_text(ledger)
    return path


def _close(tmp_path: Path, *flags: str, account: str = "Assets:Bank", json_output: bool = True) -> Any:
    return _bea(
        tmp_path,
        *(["--json"] if json_output else []),
        "-f",
        str(tmp_path / "main.bean"),
        "add",
        "close",
        "--date",
        "2024-02-01",
        "--account",
        account,
        *flags,
    )


def _march_transfer(tmp_path: Path, roots: str = "Assets", amount: str = "100.00 USD") -> Any:
    number, currency = amount.split()
    return _bea(
        tmp_path,
        "--json",
        "-f",
        str(tmp_path / "main.bean"),
        "add",
        "transaction",
        "--date",
        "2024-03-01",
        "--narration",
        "March account activity",
        "--posting",
        f"{roots}:Bank:Branch:Checking -{number} {currency}",
        "--posting",
        f"{roots}:Other {number} {currency}",
    )


def _message(result: Any) -> str:
    return " ".join(str(json.loads(result.stderr)["error"]["message"]).split())


def test_an_earlier_regenerated_close_refuses_the_unforced_close(tmp_path: Path) -> None:
    path = _book(tmp_path, _ledger())
    before = path.read_bytes()

    result = _close(tmp_path)

    assert result.returncode == 1, result.stdout
    message = _message(result)
    assert "Assets:Bank:Branch:Checking still holds 100.00 USD on 2024-02-01" in message
    assert "close_tree plugin closes it with Assets:Bank" in message
    assert "--force" in message and "Nothing was written." in message
    assert path.read_bytes() == before
    # The refused close left the account open for the activity the ledger allows.
    moved = _march_transfer(tmp_path)
    assert moved.returncode == 0, moved.stderr


def test_human_output_refuses_with_renamed_roots(tmp_path: Path) -> None:
    path = _book(tmp_path, _ledger(roots="Activos", equity="Capital", currency="EUR", number="125.50"))
    before = path.read_bytes()

    result = _close(tmp_path, account="Activos:Bank", json_output=False)

    assert result.returncode == 1, result.stdout
    assert result.stdout == ""
    error = " ".join(result.stderr.split())
    assert "Activos:Bank:Branch:Checking still holds 125.50 EUR on 2024-02-01" in error
    assert "--force" in error
    assert path.read_bytes() == before


def test_force_still_closes_the_tree(tmp_path: Path) -> None:
    path = _book(tmp_path, _ledger())

    result = _close(tmp_path, "--force")

    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout)["data"]["written"] == 1
    assert path.read_text().endswith("2024-02-01 close Assets:Bank\n")
    assert _march_transfer(tmp_path).returncode == 1


@pytest.mark.parametrize(
    "ledger",
    [
        # The generated close is already earlier: this close does not move it.
        _ledger(branch_close="2024-01-15"),
        # An explicit close is left untouched by the plugin.
        _ledger(extra="2025-01-15 close Assets:Bank:Branch:Checking\n"),
        _ledger(extra="2024-01-15 close Assets:Bank:Branch:Checking\n"),
        # Without the plugin the parent closes alone.
        _ledger(plugin=""),
        # A drained child has nothing to strand.
        _ledger(extra='2024-01-31 * "Drain"\n  Assets:Bank:Branch:Checking -100.00 USD\n  Assets:Other 100.00 USD\n'),
    ],
    ids=["earlier-generated", "explicit-future", "already-closed", "no-plugin", "drained"],
)
def test_unmoved_or_empty_descendants_close_quietly(tmp_path: Path, ledger: str) -> None:
    path = _book(tmp_path, ledger)

    result = _close(tmp_path)

    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout)["data"]["warnings"] == []
    assert path.read_text() == ledger + "\n2024-02-01 close Assets:Bank\n"


def test_explicit_future_child_close_keeps_march_activity(tmp_path: Path) -> None:
    _book(tmp_path, _ledger(extra="2025-01-15 close Assets:Bank:Branch:Checking\n"))

    assert _close(tmp_path).returncode == 0
    moved = _march_transfer(tmp_path)
    assert moved.returncode == 0, moved.stderr


def test_check_drained_still_refuses_in_validation(tmp_path: Path) -> None:
    plugins = TREE + 'plugin "beancount.plugins.check_drained"\n'
    path = _book(tmp_path, _ledger(plugin=plugins))
    before = path.read_bytes()

    result = _close(tmp_path)

    assert result.returncode == 1, result.stdout
    assert path.read_bytes() == before


IMPORTER = """from datetime import date
from beancount.core import data

class Statement:
    def identify(self, path): return str(path).endswith(".statement")
    def account(self, path): return {parent!r}
    def extract(self, path, existing_entries=None):
        return [data.Close(data.new_metadata(str(path), 1), date(2024, 2, 1), {parent!r})]

CONFIG = [Statement()]
"""


def _import(tmp_path: Path, ledger: str, *flags: str, parent: str = "Assets:Bank", json_output: bool = True) -> Any:
    _book(tmp_path, ledger)
    (tmp_path / "statement_reader.py").write_text(IMPORTER.format(parent=parent))
    (tmp_path / "close.statement").write_text("Synthetic account retirement statement\n")
    return _bea(
        tmp_path,
        *(["--json"] if json_output else []),
        "-f",
        str(tmp_path / "main.bean"),
        "import",
        "close.statement",
        "--config",
        "statement_reader.py",
        *flags,
    )


def _warnings(result: Any) -> list[str]:
    assert result.returncode == 0, result.stderr
    return [" ".join(str(line).split()) for line in json.loads(result.stdout)["data"]["validation_warnings"]]


@pytest.mark.parametrize("flags", [[], ["--apply"]], ids=["preview", "apply"])
def test_an_import_that_moves_a_funded_close_earlier_warns(tmp_path: Path, flags: list[str]) -> None:
    result = _import(tmp_path, _ledger(), *flags)

    (warning,) = _warnings(result)
    assert "Assets:Bank:Branch:Checking is closed on 2024-02-01 while it still holds 100.00 USD" in warning
    assert "Move the money on or before 2024-02-01" in warning
    assert json.loads(result.stdout)["data"]["written"] == (1 if flags else 0)


def test_the_import_still_writes_and_its_repeat_stays_quiet(tmp_path: Path) -> None:
    ledger = _ledger()
    assert _import(tmp_path, ledger, "--apply").returncode == 0
    assert (tmp_path / "main.bean").read_text().endswith("2024-02-01 close Assets:Bank\n")

    repeat = _bea(
        tmp_path,
        "--json",
        "-f",
        str(tmp_path / "main.bean"),
        "import",
        "close.statement",
        "--config",
        "statement_reader.py",
        "--apply",
    )

    assert _warnings(repeat) == []
    assert json.loads(repeat.stdout)["data"]["written"] == 0


@pytest.mark.parametrize("flags", [[], ["--apply"]], ids=["preview", "apply"])
def test_human_import_warns_with_renamed_roots(tmp_path: Path, flags: list[str]) -> None:
    ledger = _ledger(roots="Activos", equity="Capital", currency="EUR", number="125.50")

    result = _import(tmp_path, ledger, *flags, parent="Activos:Bank", json_output=False)

    assert result.returncode == 0, result.stderr
    shown = " ".join((result.stdout + result.stderr).split())
    assert "Activos:Bank:Branch:Checking is closed on 2024-02-01 while it still holds 125.50 EUR" in shown


@pytest.mark.parametrize(
    "ledger",
    [
        _ledger(branch_close="2024-01-15"),
        _ledger(extra="2025-01-15 close Assets:Bank:Branch:Checking\n"),
        _ledger(extra="2024-01-15 close Assets:Bank:Branch:Checking\n"),
        _ledger(plugin=""),
        _ledger(extra='2024-01-31 * "Drain"\n  Assets:Bank:Branch:Checking -100.00 USD\n  Assets:Other 100.00 USD\n'),
    ],
    ids=["earlier-generated", "explicit-future", "already-closed", "no-plugin", "drained"],
)
def test_an_import_leaving_descendant_closes_unmoved_stays_quiet(tmp_path: Path, ledger: str) -> None:
    assert _warnings(_import(tmp_path, ledger, "--apply")) == []


def test_an_import_with_no_prior_close_still_warns(tmp_path: Path) -> None:
    (warning,) = _warnings(_import(tmp_path, _ledger(branch_close=None)))

    assert "Assets:Bank:Branch:Checking is closed on 2024-02-01 while it still holds 100.00 USD" in warning
