"""`bea doctor` loads a managed price include the way every other command does (w5/286).

Upstream's doctor calls Beancount's loader itself, which reads a managed
include as a file glob that matches nothing. `doctor region --conversion
value` therefore left a holding unvalued that `balance` valued at market, with
exit 0 and no warning, and `doctor roundtrip` printed the glob error and still
congratulated. The feed is simulated on loopback; no test reaches the network.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from tests.test_price import _run_bea
from tests.test_price import feed_server as feed_server

LEDGER = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Wallet BTC
2026-01-01 open Assets:Bank USD
2026-01-01 open Equity:Opening
{managed}
2026-01-02 * "Buy"
  Assets:Wallet  2 BTC {{30000.00 USD}}
  Assets:Bank   -60000.00 USD
"""
REGION = "main.bean:6:8"
# Two BTC at the fixture feed's latest price, 113500.50 USD.
AT_MARKET = "227001.00 USD"
GLOB_ERROR = "does not match any files"


def _books(tmp_path: Path, feed_server: str, *, managed: bool = True) -> Path:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER.format(managed=f'include "{feed_server}/prices/BTC-USD"' if managed else ""))
    return ledger


def _wallet(tree: str) -> str:
    """What the balance tree shows against the wallet."""
    (row,) = [line for line in tree.splitlines() if "Wallet" in line and "{" not in line]
    return " ".join(row.split("Wallet", 1)[1].split())


def test_region_values_the_holding_as_balance_does(feed_server: str, tmp_path: Path) -> None:
    ledger = _books(tmp_path, feed_server)

    balance = _run_bea(tmp_path, feed_server, "--file", str(ledger), "balance")
    region = _run_bea(tmp_path, feed_server, "doctor", "region", str(ledger), REGION, "--conversion", "value")

    assert balance.returncode == 0, balance.stderr
    assert "227,001.00 USD" in balance.stdout
    assert region.returncode == 0, region.stderr
    assert _wallet(region.stdout) == AT_MARKET
    assert ".bea-" not in region.stdout + region.stderr


def test_region_reads_the_cached_feed_offline(feed_server: str, tmp_path: Path) -> None:
    ledger = _books(tmp_path, feed_server)
    assert _run_bea(tmp_path, feed_server, "--file", str(ledger), "balance").returncode == 0

    region = _run_bea(
        tmp_path, feed_server, "--offline", "doctor", "region", str(ledger), REGION, "--conversion", "value"
    )

    assert region.returncode == 0, region.stderr
    assert _wallet(region.stdout) == AT_MARKET


def test_a_ledger_without_the_include_keeps_its_units(feed_server: str, tmp_path: Path) -> None:
    ledger = _books(tmp_path, feed_server, managed=False)

    region = _run_bea(tmp_path, feed_server, "doctor", "region", str(ledger), REGION, "--conversion", "value")

    assert region.returncode == 0, region.stderr
    assert _wallet(region.stdout) == "2 BTC"


def test_roundtrip_reports_no_glob_error(feed_server: str, tmp_path: Path) -> None:
    ledger = _books(tmp_path, feed_server)

    result = _run_bea(tmp_path, feed_server, "doctor", "roundtrip", str(ledger))

    assert result.returncode == 0, result.stderr
    assert GLOB_ERROR not in result.stdout + result.stderr
    assert "matches no file" not in result.stdout + result.stderr
    assert "Entries are the same. Congratulations." in result.stderr
    assert sorted(path.name for path in tmp_path.glob("main*")) == ["main.bean"]


def test_roundtrip_names_a_source_it_cannot_resolve(feed_server: str, tmp_path: Path) -> None:
    ledger = _books(tmp_path, feed_server)

    result = _run_bea(tmp_path, feed_server, "--offline", "doctor", "roundtrip", str(ledger))

    assert GLOB_ERROR not in result.stdout + result.stderr
    assert "matches no file" not in result.stdout + result.stderr
    assert "managed price source unavailable" in result.stderr


@pytest.mark.parametrize(
    "operation",
    [["print-options"], ["missing-open"], ["display-context"], ["context", "main.bean:6"], ["linked", "main.bean:6"]],
    ids=lambda operation: operation[0],
)
def test_every_loading_operation_sees_the_feed_prices(feed_server: str, tmp_path: Path, operation: list[str]) -> None:
    ledger = _books(tmp_path, feed_server)
    command = [operation[0], str(ledger), *operation[1:]]

    result = _run_bea(tmp_path, feed_server, "doctor", *command)

    assert result.returncode == 0, result.stderr
    assert ".bea-" not in result.stdout + result.stderr
    # The helper's own load fetched the feed; upstream's never asks for it.
    assert Path(tmp_path / "cache" / "bea" / "managed-prices").is_dir()


def test_print_options_names_the_ledger_and_only_upstream_options(feed_server: str, tmp_path: Path) -> None:
    ledger = _books(tmp_path, feed_server)

    result = _run_bea(tmp_path, feed_server, "doctor", "print-options", str(ledger))

    assert result.returncode == 0, result.stderr
    assert f"filename: {ledger}" in result.stdout.splitlines()
    assert "bea_managed_price_sources" not in result.stdout
