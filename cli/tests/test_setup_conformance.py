"""Cross-engine conformance: `bea init --preset` opens what the catalog fixture promises.

The hosted builder (backend-v2) and this CLI must produce equivalent
accounting results for every fixture before a preset is listed (ADR026).
These tests run the CLI side against the canonical fixtures and compare the
opened accounts; the hosted side is asserted in backend-v2's setup tests
against the same fixture file.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from decimal import Decimal
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
CANONICAL_FIXTURES = (
    ROOT.parent / "backend-cluster" / "backend-v2" / "src" / "features" / "ledger" / "setup" / "fixtures.json"
)


def _fixtures() -> list[dict]:
    if not CANONICAL_FIXTURES.is_file():
        pytest.skip("canonical backend fixtures not present in this checkout")
    return json.loads(CANONICAL_FIXTURES.read_text(encoding="utf-8"))["fixtures"]


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        XDG_DATA_HOME=str(tmp_path / "data"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=30,
    )


def test_clean_fixtures_open_the_promised_accounts(tmp_path: Path) -> None:
    clean = [fixture for fixture in _fixtures() if fixture["id"].endswith("-clean")]
    assert len(clean) == 8
    for fixture in clean:
        books = tmp_path / fixture["id"].replace("@", "-")
        result = _bea(
            tmp_path,
            "--json",
            "init",
            str(books),
            "--preset",
            fixture["spec"]["preset"],
            "--currency",
            fixture["spec"]["operatingCurrency"],
            "--date",
            fixture["spec"]["historyStart"],
        )
        assert result.returncode == 0, (fixture["id"], result.stderr or result.stdout)
        opened = set(json.loads(result.stdout)["data"]["accounts"])
        assert opened == set(fixture["expected"]["openedAccounts"]), fixture["id"]
        # A clean fixture carries no transactions and no assertions.
        ledger = (books / "main.bean").read_text(encoding="utf-8")
        assert " balance " not in ledger, fixture["id"]
        assert ' * "' not in ledger, fixture["id"]


def test_opening_fixture_matches_hosted_expectations(tmp_path: Path) -> None:
    fixture = next(f for f in _fixtures() if f["id"] == "personal@1-opening-known")
    books = tmp_path / "books"
    result = _bea(
        tmp_path,
        "--json",
        "init",
        str(books),
        "--preset",
        "personal@1",
        "--currency",
        "EUR",
        "--date",
        "2026-02-01",
        "--opening-balance",
        "Assets:Cash 100",
    )
    assert result.returncode == 0, result.stderr or result.stdout
    ledger = (books / "main.bean").read_text(encoding="utf-8")
    assert f"{fixture['expected']['openingTransactionDate']} *" in ledger
    assert f"{fixture['expected']['balanceAssertionDate']} balance Assets:Cash" in ledger
    checked = _bea(tmp_path, "--file", str(books / "main.bean"), "check")
    assert checked.returncode == 0, checked.stderr or checked.stdout


def _module_fixtures() -> list[dict]:
    return [fixture for fixture in _fixtures() if fixture["spec"].get("modules")]


def _module_flags(spec: dict) -> list[str]:
    flags: list[str] = []
    for module in spec["modules"]:
        flags += ["--module", module["id"]]
        if "propertyName" in module:
            flags += ["--property-name", module["propertyName"]]
    return flags


def _group_totals(tmp_path: Path, ledger: Path) -> dict[str, Decimal]:
    """Each account's total after the scenario, read back through the real engine."""
    checked = _bea(tmp_path, "--file", str(ledger), "check")
    assert checked.returncode == 0, checked.stderr or checked.stdout
    result = _bea(
        tmp_path,
        "--json",
        "--file",
        str(ledger),
        "query",
        "SELECT account, sum(number) AS total WHERE number != 0 GROUP BY account",
    )
    assert result.returncode == 0, result.stderr or result.stdout
    return {account: Decimal(total) for account, total in json.loads(result.stdout)["data"]["rows"]}


def test_module_fixtures_open_the_promised_accounts(tmp_path: Path) -> None:
    """Each module alone and all three together, against the hosted builder's account list (w3/m59/t004)."""
    fixtures = _module_fixtures()
    assert len(fixtures) == 4
    for fixture in fixtures:
        books = tmp_path / fixture["id"].replace("@", "-")
        spec = fixture["spec"]
        result = _bea(
            tmp_path,
            "--json",
            "init",
            str(books),
            "--preset",
            spec["preset"],
            "--currency",
            spec["operatingCurrency"],
            "--date",
            spec["historyStart"],
            *_module_flags(spec),
        )
        assert result.returncode == 0, (fixture["id"], result.stderr or result.stdout)
        opened = json.loads(result.stdout)["data"]["accounts"]
        assert sorted(opened) == sorted(fixture["expected"]["openedAccounts"]), fixture["id"]
        ledger = (books / "main.bean").read_text(encoding="utf-8")
        for account, method in fixture["expected"].get("booking", {}).items():
            assert f'open {account} "{method}"' in ledger, fixture["id"]
        checked = _bea(tmp_path, "--file", str(books / "main.bean"), "check")
        assert checked.returncode == 0, (fixture["id"], checked.stderr or checked.stdout)


def test_appendix_a9_scenario_totals_by_group_on_both_engines(tmp_path: Path) -> None:
    """A.9's scenario over the hosted builder's pinned files and over `bea init`'s: same totals, own groups."""
    scenarios = [f for f in _module_fixtures() if f["expected"].get("scenario", {}).get("entries")]
    assert {f["id"] for f in scenarios} >= {"personal@1-modules-all"}
    for fixture in scenarios:
        scenario = fixture["expected"]["scenario"]
        spec = fixture["spec"]
        hosted = tmp_path / f"{fixture['id']}-hosted" / "main.bean"
        hosted.parent.mkdir(parents=True)
        hosted.write_text(fixture["expected"]["hostedFiles"]["main.bean"], encoding="utf-8")
        local_dir = tmp_path / f"{fixture['id']}-cli"
        built = _bea(
            tmp_path,
            "init",
            str(local_dir),
            "--preset",
            spec["preset"],
            "--currency",
            spec["operatingCurrency"],
            "--date",
            spec["historyStart"],
            *_module_flags(spec),
        )
        assert built.returncode == 0, built.stderr or built.stdout
        local = local_dir / "main.bean"
        totals = []
        for ledger in (hosted, local):
            with ledger.open("a", encoding="utf-8") as handle:
                handle.write("\n" + scenario["entries"])
            totals.append(_group_totals(tmp_path, ledger))
        assert totals[0] == totals[1], fixture["id"]
        expected = {account: Decimal(amount) for account, amount in scenario["expected"].items()}
        assert {account: abs(total) for account, total in totals[0].items()} == expected, fixture["id"]
        # Everyday spending is untouched: every movement sits in a module group or the personal bank.
        assert not any(account.startswith("Expenses:") and ":" not in account[9:] for account in totals[0])
