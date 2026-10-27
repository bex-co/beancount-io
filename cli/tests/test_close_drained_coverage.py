"""A funded close is left to `check_drained` only where its assertion really fails (w5/1063).

Whenever the plugin was listed, every currency it might assert was treated as
its to refuse. Loaded before `close_tree`, it never sees the generated child
close, so the funded child had no assertion at all; and an assertion counts the
account's whole subtree, so a parent at -100 USD over a child at +100 USD
passed. Either way `add close` wrote unforced and an imported close lost its
funded-close warning, and later transfers were refused as inactive.
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
DRAINED = 'plugin "beancount.plugins.check_drained"\n'


def _ledger(
    *,
    plugins: str = DRAINED + TREE,
    roots: str = "Assets",
    equity: str = "Equity",
    currency: str = "USD",
    number: str = "100.00",
    parent_currency: bool = False,
    cancelling: bool = False,
    extra: str = "",
) -> str:
    bank = f"{roots}:Bank"
    counter = bank if cancelling else f"{equity}:Opening"
    return "".join(
        [
            *([OPTIONS] if roots != "Assets" else []),
            f'option "operating_currency" "{currency}"\n',
            plugins,
            f"2024-01-01 open {bank}{f' {currency}' if parent_currency or cancelling else ''}\n",
            *(
                f"2024-01-01 open {account} {currency}\n"
                for account in [f"{bank}:Checking", f"{roots}:Other", f"{equity}:Opening"]
            ),
            f'2024-01-02 * "Fund"\n  {bank}:Checking {number} {currency}\n  {counter} -{number} {currency}\n',
            extra,
        ]
    )


BEFORE = _ledger()
CANCELLING = _ledger(plugins=DRAINED, cancelling=True)
CANCELLING_TREE = _ledger(cancelling=True)
DRAIN = '2024-01-31 * "Drain child"\n  Assets:Bank:Checking -100.00 USD\n  Assets:Other 100.00 USD\n'


def _book(tmp_path: Path, ledger: str) -> Path:
    path = tmp_path / "main.bean"
    path.write_text(ledger)
    return path


def _run(tmp_path: Path, *args: str, json_output: bool = True) -> Any:
    return _bea(tmp_path, *(["--json"] if json_output else []), "-f", str(tmp_path / "main.bean"), *args)


def _close(tmp_path: Path, *flags: str, account: str = "Assets:Bank", json_output: bool = True) -> Any:
    return _run(tmp_path, "add", "close", "--date", "2024-02-01", "--account", account, *flags, json_output=json_output)


def _march(tmp_path: Path, account: str, number: str) -> Any:
    negated = number[1:] if number.startswith("-") else f"-{number}"
    return _run(
        tmp_path,
        "add",
        "transaction",
        "--date",
        "2024-03-01",
        "--narration",
        "Move funds",
        "--posting",
        f"{account} {negated} USD",
        "--posting",
        f"Assets:Other {number} USD",
    )


def _message(result: Any) -> str:
    return " ".join(str(json.loads(result.stderr)["error"]["message"]).split())


@pytest.mark.parametrize(
    ("ledger", "held", "account"),
    [
        (BEFORE, "Assets:Bank:Checking still holds 100.00 USD on 2024-02-01", "Assets:Bank:Checking"),
        (CANCELLING, "Assets:Bank still holds -100.00 USD on 2024-02-01.", "Assets:Bank"),
        (CANCELLING_TREE, "Assets:Bank still holds -100.00 USD on 2024-02-01.", "Assets:Bank"),
    ],
    ids=["plugin-before-tree", "cancelling-no-tree", "cancelling-tree"],
)
def test_holdings_no_failing_assertion_covers_refuse_the_close(
    tmp_path: Path, ledger: str, held: str, account: str
) -> None:
    path = _book(tmp_path, ledger)
    before = path.read_bytes()

    result = _close(tmp_path)

    assert result.returncode == 1, result.stdout
    message = _message(result)
    assert held in message and "--force" in message and "Nothing was written." in message
    assert path.read_bytes() == before
    # The refused close leaves the account open for the activity the ledger allows.
    number = "-100.00" if account == "Assets:Bank" else "100.00"
    moved = _march(tmp_path, account, number)
    assert moved.returncode == 0, moved.stderr


def test_human_output_refuses_with_renamed_roots(tmp_path: Path) -> None:
    path = _book(tmp_path, _ledger(roots="Activos", equity="Capital", currency="EUR", number="125.50"))
    before = path.read_bytes()

    result = _close(tmp_path, account="Activos:Bank", json_output=False)

    assert result.returncode == 1, result.stdout
    error = " ".join(result.stderr.split())
    assert "Activos:Bank:Checking still holds 125.50 EUR on 2024-02-01" in error and "--force" in error
    assert path.read_bytes() == before


def test_force_still_closes(tmp_path: Path) -> None:
    path = _book(tmp_path, BEFORE)

    result = _close(tmp_path, "--force")

    assert result.returncode == 0, result.stderr
    assert path.read_text().endswith("2024-02-01 close Assets:Bank\n")


@pytest.mark.parametrize(
    "ledger",
    [_ledger(plugins=TREE + DRAINED), _ledger(parent_currency=True)],
    ids=["plugin-after-tree", "declared-parent"],
)
def test_a_failing_drained_assertion_keeps_the_plugin_refusal(tmp_path: Path, ledger: str) -> None:
    path = _book(tmp_path, ledger)
    before = path.read_bytes()

    result = _close(tmp_path)

    assert result.returncode == 1, result.stdout
    flat = " ".join((result.stdout + result.stderr).split())
    assert "check_drained" in flat and "Assets:Bank:Checking" in flat
    assert path.read_bytes() == before


def test_without_check_drained_the_funded_child_still_refuses(tmp_path: Path) -> None:
    _book(tmp_path, _ledger(plugins=TREE))

    result = _close(tmp_path)

    assert result.returncode == 1, result.stdout
    assert "Assets:Bank:Checking still holds 100.00 USD on 2024-02-01" in _message(result)


def test_a_drained_child_closes_quietly(tmp_path: Path) -> None:
    ledger = _ledger(extra=DRAIN)
    path = _book(tmp_path, ledger)

    result = _close(tmp_path)

    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout)["data"]["warnings"] == []
    assert path.read_text() == ledger + "\n2024-02-01 close Assets:Bank\n"


IMPORTER = """from datetime import date
from beancount.core import data

class Reader:
    def identify(self, path): return str(path).endswith(".statement")
    def account(self, path): return {parent!r}
    def extract(self, path, existing_entries=None):
        return [data.Close(data.new_metadata(str(path), 1), date(2024, 2, 1), {parent!r})]

CONFIG = [Reader()]
"""
IMPORT = ["import", "retire.statement", "--config", "statement_reader.py"]


def _import(tmp_path: Path, ledger: str, *flags: str, parent: str = "Assets:Bank", json_output: bool = True) -> Any:
    _book(tmp_path, ledger)
    (tmp_path / "statement_reader.py").write_text(IMPORTER.format(parent=parent))
    (tmp_path / "retire.statement").write_text("Synthetic account retirement statement\n")
    return _run(tmp_path, *IMPORT, *flags, json_output=json_output)


def _warnings(result: Any) -> list[str]:
    assert result.returncode == 0, result.stderr
    return [" ".join(str(line).split()) for line in json.loads(result.stdout)["data"]["validation_warnings"]]


@pytest.mark.parametrize("flags", [[], ["--apply"]], ids=["preview", "apply"])
@pytest.mark.parametrize(
    ("ledger", "expected"),
    [
        (BEFORE, ["Assets:Bank:Checking is closed on 2024-02-01 while it still holds 100.00 USD"]),
        (CANCELLING, ["Assets:Bank is closed on 2024-02-01 while it still holds -100.00 USD"]),
        (
            CANCELLING_TREE,
            [
                "Assets:Bank is closed on 2024-02-01 while it still holds -100.00 USD",
                "Assets:Bank:Checking is closed on 2024-02-01 while it still holds 100.00 USD",
            ],
        ),
    ],
    ids=["plugin-before-tree", "cancelling-no-tree", "cancelling-tree"],
)
def test_an_import_warns_when_no_failing_assertion_refuses(
    tmp_path: Path, ledger: str, expected: list[str], flags: list[str]
) -> None:
    result = _import(tmp_path, ledger, *flags)

    warnings = _warnings(result)
    assert len(warnings) == len(expected)
    for warning, start in zip(sorted(warnings), expected, strict=True):
        assert warning.startswith(start), warning
    assert json.loads(result.stdout)["data"]["written"] == (1 if flags else 0)


def test_the_import_repeat_stays_quiet(tmp_path: Path) -> None:
    assert _import(tmp_path, BEFORE, "--apply").returncode == 0

    repeat = _run(tmp_path, *IMPORT, "--apply")

    assert _warnings(repeat) == []
    assert json.loads(repeat.stdout)["data"]["written"] == 0


@pytest.mark.parametrize("flags", [[], ["--apply"]], ids=["preview", "apply"])
def test_human_import_warns_with_renamed_roots(tmp_path: Path, flags: list[str]) -> None:
    ledger = _ledger(roots="Activos", equity="Capital", currency="EUR", number="125.50")

    result = _import(tmp_path, ledger, *flags, parent="Activos:Bank", json_output=False)

    assert result.returncode == 0, result.stderr
    shown = " ".join((result.stdout + result.stderr).split())
    assert "Activos:Bank:Checking is closed on 2024-02-01 while it still holds 125.50 EUR" in shown


def test_a_drained_import_stays_quiet(tmp_path: Path) -> None:
    assert _warnings(_import(tmp_path, _ledger(extra=DRAIN), "--apply")) == []


def test_a_failing_drained_assertion_still_refuses_the_import(tmp_path: Path) -> None:
    path = _book(tmp_path, _ledger(plugins=TREE + DRAINED))
    before = path.read_bytes()

    result = _import(tmp_path, _ledger(plugins=TREE + DRAINED), "--apply")

    assert result.returncode == 1, result.stdout
    assert path.read_bytes() == before
