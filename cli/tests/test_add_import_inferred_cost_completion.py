"""Cost parts booking infers are completed as native booking completes them (w5/994).

The shared completion helper reconstructed the other postings' weights
algebraically: a `{{10 USD}}` total on three units weighed 10 instead of the
9.999999999999999999999999999 booking holds, a negative total part lost its
sign, an authored `@@` total weighed what was typed rather than the parsed
unit price, a negative inferred part was discarded, and a second, independent
currency group abandoned the whole transaction. Plain `{USD}` and number-only
`{10}` costs were never completed at all, so a zero or different acquisition
cost compared as an open wildcard. Each made the single-add answer describe a
different lot than the one written, or gave two different trades one import
identity (or one trade two).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from tests.test_import_source_facts import _bea

IMPORTER = """from pathlib import Path
from beancount.parser import parser

class Reader:
    def identify(self, file):
        return str(file).endswith(".trade")
    def account(self, file):
        return "Assets:Broker"
    def extract(self, file, existing=None):
        entries, errors, _ = parser.parse_string(Path(str(file)).read_text())
        assert not errors, errors
        return entries

CONFIG = [Reader()]
"""
OPENS = (
    'option "operating_currency" "USD"\n'
    "2024-01-01 open Assets:Broker HOOL,GLD\n2024-01-01 open Assets:Bond BOND\n"
    "2024-01-01 open Assets:Cash USD,EUR\n2024-01-01 open Equity:Opening USD,EUR\n"
    '2024-01-01 * "Capital"\n  Assets:Cash 1000.00 USD\n  Assets:Cash 1000.00 EUR\n'
    "  Equity:Opening -1000.00 USD\n  Equity:Opening -1000.00 EUR\n"
)
COSTS = "SELECT number, currency, cost_number, cost_currency WHERE account = 'Assets:Broker' ORDER BY cost_currency"
HOLDINGS = "SELECT account, currency, sum(number) GROUP BY account, currency ORDER BY account, currency"


def _trade(legs: list[str], *, bank: bool = False) -> str:
    return '2024-01-02 * "Trade"\n' + ('  bank_id: "trade-001"\n' if bank else "") + "".join(f"  {p}\n" for p in legs)


def _rows(tmp_path: Path, query: str, ledger: str = "main.bean") -> list[Any]:
    result = _bea(tmp_path, "query", query, ledger=ledger)
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout)["data"]["rows"]  # type: ignore[no-any-return]


def _import(tmp_path: Path, name: str, legs: list[str], *flags: str, bank: bool = False) -> Any:
    (tmp_path / "importer.py").write_text(IMPORTER)
    (tmp_path / f"{name}.trade").write_text(_trade(legs, bank=bank))
    return _bea(tmp_path, "import", f"{name}.trade", "--config", "importer.py", *flags)


def _written(result: Any) -> int:
    assert result.returncode == 0, result.stderr or result.stdout
    return int(json.loads(result.stdout)["data"]["written"])


def _replays(tmp_path: Path, legs: list[str]) -> None:
    """The single-add answer, fed back unchanged, books the source's exact lots."""
    (tmp_path / "main.bean").write_text(OPENS)
    (tmp_path / "copy.bean").write_text(OPENS)
    postings = [arg for leg in legs for arg in ("--posting", leg)]
    added = _bea(tmp_path, "add", "transaction", "--date", "2024-01-02", "--narration", "Trade", *postings)
    assert added.returncode == 0, added.stderr
    (tmp_path / "rows.json").write_text(json.dumps([json.loads(added.stdout)["data"]["directive"]]))
    replay = _bea(tmp_path, "add", "transactions", "--from", "rows.json", ledger="copy.bean")
    assert replay.returncode == 0, replay.stderr or replay.stdout
    assert _rows(tmp_path, COSTS, "copy.bean") == _rows(tmp_path, COSTS)
    assert _rows(tmp_path, HOLDINGS, "copy.bean") == _rows(tmp_path, HOLDINGS)
    assert _bea(tmp_path, "check", ledger="copy.bean").returncode == 0


def _restatements(tmp_path: Path, legs: list[str], exact: list[str], changed: list[str], *, bank: bool) -> None:
    """After a raw import: its raw repeat and a native-equal restatement skip; a different lot does not."""
    (tmp_path / "main.bean").write_text(OPENS)
    assert _written(_import(tmp_path, "raw", legs, "--apply", bank=bank)) == 1
    assert _written(_import(tmp_path, "raw", legs, "--apply", bank=bank)) == 0
    first = (tmp_path / "main.bean").read_bytes()
    assert _written(_import(tmp_path, "exact", exact, "--apply", bank=bank)) == 0
    assert (tmp_path / "main.bean").read_bytes() == first
    if bank:
        conflict = _import(tmp_path, "changed", changed, "--apply", bank=True)
        assert conflict.returncode == 4, conflict.stdout
        assert (tmp_path / "main.bean").read_bytes() == first
    else:
        assert _written(_import(tmp_path, "changed", changed, "--apply", "--duplicates", "include")) == 1
        assert _bea(tmp_path, "check").returncode == 0


# A total cost on another posting weighs what booking holds: 10 / 3 per BOND,
# times three, so HOOL's inferred part ends in ...0005 (not 0.50 per share).
BOND_TOTAL = ["Assets:Bond 3 BOND {{10 USD}}", "Assets:Cash -11.00 USD"]
# A negative total part of another posting keeps its sign: BOND weighs 25 USD.
BOND_SIGNED = ["Assets:Bond 3 BOND {10 # -5 USD}", "Assets:Cash -50.00 USD"]
PARTS = ["{# 0.50 USD}", "{0.25 # USD}"]


@pytest.mark.parametrize("part", PARTS)
@pytest.mark.parametrize("companion", [BOND_TOTAL, BOND_SIGNED], ids=["total", "signed"])
def test_a_costed_counterparty_answer_replays_the_native_lot(tmp_path: Path, part: str, companion: list[str]) -> None:
    _replays(tmp_path, [f"Assets:Broker 2 HOOL {part}", *companion])


@pytest.mark.parametrize("bank", [False, True], ids=["generated", "bank"])
@pytest.mark.parametrize("part", PARTS)
def test_a_costed_counterparty_import_matches_the_native_lot(tmp_path: Path, part: str, bank: bool) -> None:
    (tmp_path / "probe.bean").write_text(OPENS + _trade([f"Assets:Broker 2 HOOL {part}", *BOND_TOTAL]))
    [[booked]] = _rows(tmp_path, "SELECT cost_number WHERE account = 'Assets:Broker'", "probe.bean")
    assert booked == "0.5000000000000000000000000005"
    _restatements(
        tmp_path,
        [f"Assets:Broker 2 HOOL {part}", *BOND_TOTAL],
        [f"Assets:Broker 2 HOOL {{{booked} USD}}", *BOND_TOTAL],
        ["Assets:Broker 2 HOOL {0.50 USD}", *BOND_TOTAL],
        bank=bank,
    )


@pytest.mark.parametrize("part", PARTS)
def test_independent_cost_groups_each_complete(tmp_path: Path, part: str) -> None:
    eur_part = part.replace("0.50", "0.75").replace("USD", "EUR")

    def legs(usd: str, eur: str) -> list[str]:
        return [
            f"Assets:Broker 2 HOOL {part}",
            f"Assets:Broker 3 GLD {eur_part}",
            f"Assets:Cash -{usd} USD",
            f"Assets:Cash -{eur} EUR",
        ]

    _replays(tmp_path, legs("10.00", "30.00"))
    assert _rows(tmp_path, COSTS) == [["3", "GLD", "10.00", "EUR"], ["2", "HOOL", "5.00", "USD"]]

    (tmp_path / "main.bean").write_text(OPENS)
    assert _written(_import(tmp_path, "a", legs("10.00", "30.00"), "--apply")) == 1
    assert _written(_import(tmp_path, "b", legs("20.00", "60.00"), "--apply")) == 1
    assert _written(_import(tmp_path, "b", legs("20.00", "60.00"), "--apply")) == 0
    cash = [row for row in _rows(tmp_path, HOLDINGS) if row[0] == "Assets:Cash"]
    assert cash == [["Assets:Cash", "EUR", "910.00"], ["Assets:Cash", "USD", "970.00"]]

    (tmp_path / "main.bean").write_text(OPENS)
    assert _written(_import(tmp_path, "a", legs("10.00", "30.00"), "--apply", bank=True)) == 1
    first = (tmp_path / "main.bean").read_bytes()
    assert _import(tmp_path, "b", legs("20.00", "60.00"), "--apply", bank=True).returncode == 4
    assert (tmp_path / "main.bean").read_bytes() == first


@pytest.mark.parametrize("cash", ["10.50", "11.50"])
@pytest.mark.parametrize("part", PARTS)
def test_an_authored_total_price_weighs_the_parsed_unit_price(tmp_path: Path, part: str, cash: str) -> None:
    _replays(tmp_path, [f"Assets:Broker 2 HOOL {part}", "Assets:Cash 3 EUR @@ 10.00 USD", f"Assets:Cash -{cash} USD"])
    [[cost]] = _rows(tmp_path, "SELECT cost_number WHERE account = 'Assets:Broker'")
    assert cost.endswith("0000000005")
    sale = _bea(
        tmp_path, "add", "transaction", "--date", "2024-01-03", "--narration", "Sell",
        "--posting", f"Assets:Broker -1 HOOL {{{cost} USD}}", "--posting", f"Assets:Cash {cost} USD",
        ledger="copy.bean",
    )  # fmt: skip
    assert sale.returncode == 0, sale.stderr


@pytest.mark.parametrize(
    ("cost", "cash", "exact", "changed"),
    [
        # Its own negative total: (2 × 5.25 − 0.50) / 2 = 5 per share.
        ("{# -0.50 USD}", "10.00", ("{5 USD}", "10.00"), ("{4.50 USD}", "9.00")),
        # A negative inferred per-unit part: (2 × −4.5 + 10) / 2 = 0.50.
        ("{# 10 USD}", "1.00", ("{0.50 USD}", "1.00"), ("{5 USD}", "10.00")),
        # A negative inferred total part: (2 × 5 − 9) / 2 = 0.50.
        ("{5 # USD}", "1.00", ("{0.50 USD}", "1.00"), ("{5 USD}", "10.00")),
    ],
    ids=["own-negative-total", "negative-per", "negative-total"],
)
@pytest.mark.parametrize("bank", [False, True], ids=["generated", "bank"])
def test_signed_parts_complete_natively(
    tmp_path: Path, cost: str, cash: str, exact: tuple[str, str], changed: tuple[str, str], bank: bool
) -> None:
    def legs(lot: str, paid: str) -> list[str]:
        return [f"Assets:Broker 2 HOOL {lot}", f"Assets:Cash -{paid} USD"]

    if not bank:
        _replays(tmp_path, legs(cost, cash))
    _restatements(tmp_path, legs(cost, cash), legs(*exact), legs(*changed), bank=bank)


@pytest.mark.parametrize("bank", [False, True], ids=["generated", "bank"])
def test_plain_currency_costs_are_told_apart_by_cash(tmp_path: Path, bank: bool) -> None:
    (tmp_path / "main.bean").write_text(OPENS)
    a, b = (
        ["Assets:Broker 2 HOOL {USD}", "Assets:Cash -10.50 USD"],
        ["Assets:Broker 2 HOOL {USD}", "Assets:Cash -20.50 USD"],
    )
    assert _written(_import(tmp_path, "a", a, "--apply", bank=bank)) == 1
    assert _written(_import(tmp_path, "a", a, "--apply", bank=bank)) == 0
    first = (tmp_path / "main.bean").read_bytes()
    second = _import(tmp_path, "b", b, "--apply", bank=bank)
    if bank:
        assert second.returncode == 4, second.stdout
        assert (tmp_path / "main.bean").read_bytes() == first
    else:
        assert _written(second) == 1
        assert _written(_import(tmp_path, "b", b, "--apply")) == 0
        assert _rows(tmp_path, COSTS) == [["2", "HOOL", "5.25", "USD"], ["2", "HOOL", "10.25", "USD"]]


def test_a_plain_currency_answer_still_leaves_the_cost_to_booking(tmp_path: Path) -> None:
    _replays(tmp_path, ["Assets:Broker 2 HOOL {USD}", "Assets:Cash -10.50 USD"])
    assert "2 HOOL {USD}" in (tmp_path / "copy.bean").read_text()


@pytest.mark.parametrize("bank", [False, True], ids=["generated", "bank"])
def test_an_inferred_cost_currency_follows_the_cash(tmp_path: Path, bank: bool) -> None:
    (tmp_path / "main.bean").write_text(OPENS)
    usd, eur = (
        ["Assets:Broker 2 HOOL {10}", "Assets:Cash -20.00 USD"],
        ["Assets:Broker 2 HOOL {10}", "Assets:Cash -20.00 EUR"],
    )
    assert _written(_import(tmp_path, "a", usd, "--apply", bank=bank)) == 1
    assert _written(_import(tmp_path, "a", usd, "--apply", bank=bank)) == 0
    first = (tmp_path / "main.bean").read_bytes()
    second = _import(tmp_path, "b", eur, "--apply", bank=bank)
    if bank:
        assert second.returncode == 4, second.stdout
        assert (tmp_path / "main.bean").read_bytes() == first
    else:
        assert _written(second) == 1
        assert _rows(tmp_path, COSTS) == [["2", "HOOL", "10", "EUR"], ["2", "HOOL", "10", "USD"]]


@pytest.mark.parametrize(
    ("original", "correction", "conflicts"),
    [
        (["Assets:Broker 2 HOOL {5 USD}", "Assets:Cash -10.00 USD"], "{USD}", True),
        (["Assets:Broker 2 HOOL {0 USD}", "Assets:Cash 0.00 USD"], "{USD}", False),
    ],
    ids=["paid-to-zero", "zero-repeat"],
)
def test_an_inferred_zero_cost_is_a_known_zero(
    tmp_path: Path, original: list[str], correction: str, conflicts: bool
) -> None:
    (tmp_path / "main.bean").write_text(OPENS)
    assert _written(_import(tmp_path, "a", original, "--apply", bank=True)) == 1
    first = (tmp_path / "main.bean").read_bytes()
    result = _import(
        tmp_path, "b", [f"Assets:Broker 2 HOOL {correction}", "Assets:Cash 0.00 USD"], "--apply", bank=True
    )
    assert result.returncode == (4 if conflicts else 0), result.stdout
    assert (tmp_path / "main.bean").read_bytes() == first


@pytest.mark.parametrize(
    ("cost", "cash", "changed", "old_id"),
    [
        ("{USD}", "-10.50 USD", "-20.50 USD", "csv:sha256:527b4e28f85155bb"),
        ("{10}", "-20.00 USD", "-20.00 EUR", "csv:sha256:e36851348a4fc5d9"),
        ("{# 10 USD}", "-1.00 USD", "-3.00 USD", "csv:sha256:009bc6136324025c"),
        ("{5 # USD}", "-1.00 USD", "-3.00 USD", "csv:sha256:009bc6136324025c"),
    ],
    ids=["plain", "currency", "negative-per", "negative-total"],
)
def test_an_id_written_with_the_cost_open_still_matches_only_its_own_trade(
    tmp_path: Path, cost: str, cash: str, changed: str, old_id: str
) -> None:
    # The id bea wrote for this trade while the cost stayed open (before
    # w5/994): `{USD}` and `{10}` as written, a compound's open part as zero.
    old = f'2024-01-02 * "Trade"\n  import-id: "{old_id}"\n  Assets:Broker 2 HOOL {cost}\n  Assets:Cash {cash}\n'
    (tmp_path / "main.bean").write_text(OPENS + old)
    before = (tmp_path / "main.bean").read_bytes()
    repeat = _import(tmp_path, "a", [f"Assets:Broker 2 HOOL {cost}", f"Assets:Cash {cash}"], "--apply")
    assert _written(repeat) == 0
    assert json.loads(repeat.stdout)["data"]["rows"][0]["status"] == "duplicate"
    assert (tmp_path / "main.bean").read_bytes() == before

    other = [f"Assets:Broker 2 HOOL {cost}", f"Assets:Cash {changed}"]
    preview = _import(tmp_path, "b", other)
    assert json.loads(preview.stdout)["data"]["rows"][0]["status"] != "duplicate", preview.stdout
    assert _written(_import(tmp_path, "b", other, "--apply", "--duplicates", "include")) == 1
    assert _bea(tmp_path, "check").returncode == 0
