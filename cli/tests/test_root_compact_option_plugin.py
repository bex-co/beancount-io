"""A compact `option"…""…"` or `plugin"…"` is read as the declaration it is (w5/988).

The root scanner required a space after the keyword, so a working book's compact
setting went unseen and a forecast view repeating it with spaces counted as a
new definition, making the view the root: `add balance` validated 110 USD
against the forecast and wrote it into a working book holding 100 USD.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

CAPITAL = '2024-01-02 * "Capital"\n  Assets:Cash 100.00 USD\n  Equity:Opening -100.00 USD\n'
OPENS = "2024-01-01 open Assets:Cash USD\n2024-01-01 open Equity:Opening USD\n"
OPTION_DECLARATIONS = {
    "option-compact": 'option"operating_currency""USD"\n',
    "option-spaced": 'option "operating_currency" "USD"\n',
    "option-joined": 'option "operating_currency""USD"\n',
}
PLUGIN_DECLARATIONS = {
    "plugin-compact": 'plugin"beancount.plugins.auto_accounts"\n',
    "plugin-spaced": 'plugin "beancount.plugins.auto_accounts"\n',
}


def _books(tmp_path: Path, own: str, repeated: str, opens: str) -> Path:
    (tmp_path / "working.bean").write_text(own + opens + CAPITAL)
    (tmp_path / "view.bean").write_text(
        repeated
        + 'include "working.bean"\n2024-01-15 * "Forecast"\n  Assets:Cash 10.00 USD\n  Equity:Opening -10.00 USD\n'
    )
    return tmp_path / "working.bean"


def _balance(tmp_path: Path, amount: str) -> object:
    return _bea(
        tmp_path,
        "add",
        "balance",
        "--date",
        "2024-02-01",
        "--account",
        "Assets:Cash",
        "--amount",
        amount,
        ledger="working.bean",
    )


@pytest.mark.parametrize("mode", list(OPTION_DECLARATIONS))
def test_a_repeated_option_does_not_make_the_forecast_the_root(tmp_path: Path, mode: str) -> None:
    working = _books(tmp_path, OPTION_DECLARATIONS[mode], 'option "operating_currency" "USD"\n', OPENS)
    before = working.read_bytes()

    wrong = _balance(tmp_path, "110.00 USD")
    unchanged = working.read_bytes() == before
    right = _balance(tmp_path, "100.00 USD")

    assert wrong.returncode != 0, wrong.stdout  # type: ignore[attr-defined]
    assert unchanged
    assert right.returncode == 0, right.stderr  # type: ignore[attr-defined]
    assert _bea(tmp_path, "check", ledger="working.bean").returncode == 0


@pytest.mark.parametrize("mode", list(PLUGIN_DECLARATIONS))
def test_a_repeated_plugin_does_not_make_the_forecast_the_root(tmp_path: Path, mode: str) -> None:
    working = _books(tmp_path, PLUGIN_DECLARATIONS[mode], 'plugin "beancount.plugins.auto_accounts"\n', "")
    before = working.read_bytes()

    wrong = _balance(tmp_path, "110.00 USD")
    unchanged = working.read_bytes() == before
    right = _balance(tmp_path, "100.00 USD")

    assert wrong.returncode != 0, wrong.stdout  # type: ignore[attr-defined]
    assert unchanged
    assert right.returncode == 0, right.stderr  # type: ignore[attr-defined]
