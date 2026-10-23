"""Settings the run names are checked against the ledger even when no row uses them (w5/958).

The guard against remembering a mistyped `--account` or `--default-account`
looked only at accounts the extracted rows post to. A pending-only export, or
a default every rule overrides, posts to neither, so the typo was remembered
beside the right account and every later flag-free import refused to choose.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.test_import_source_facts import _bea

LEDGER = "2024-01-01 open Assets:Cash USD\n2024-01-01 open Expenses:Food USD\n"
HEADER = "Date,Description,Amount,Status\n"
MAPPING = "date=Date,narration=Description,amount=Amount,status=Status,currency=USD"


def _books(tmp_path: Path, ledger: str = LEDGER) -> None:
    (tmp_path / "main.bean").write_text(ledger)
    (tmp_path / "seed.csv").write_text(HEADER + "2024-01-02,Seed,-1.00,Posted\n")
    (tmp_path / "pending.csv").write_text(HEADER + "Pending,Card hold,Not settled,Pending\n")
    (tmp_path / "posted.csv").write_text(HEADER + "2024-01-03,New shop,-12.50,Posted\n")


def _import(tmp_path: Path, source: str, *flags: str) -> object:
    return _bea(tmp_path, "import", source, *flags)


def _csv(account: str, default: str | None = None) -> list[str]:
    flags = ["--csv", MAPPING, "--account", account]
    return flags + ["--default-account", default] if default else flags


def _seed(tmp_path: Path) -> None:
    seeded = _import(tmp_path, "seed.csv", *_csv("Assets:Cash", "Expenses:Food"))
    assert seeded.returncode == 0, seeded.stderr  # type: ignore[attr-defined]


@pytest.mark.parametrize(
    ("account", "default"),
    [("Assets:Cahs", "Expenses:Food"), ("Assets:Cash", "Expenses:Fodo")],
    ids=["source-typo", "default-typo"],
)
def test_a_typo_on_a_pending_only_export_is_not_remembered(tmp_path: Path, account: str, default: str) -> None:
    _books(tmp_path)
    _seed(tmp_path)

    pending = _import(tmp_path, "pending.csv", *_csv(account, default))
    preview = _import(tmp_path, "posted.csv")
    applied = _import(tmp_path, "posted.csv", "--apply")

    assert pending.returncode == 0, pending.stderr  # type: ignore[attr-defined]
    assert "Not remembering" in json.dumps(json.loads(pending.stdout))  # type: ignore[attr-defined]
    assert preview.returncode == 0, preview.stderr  # type: ignore[attr-defined]
    assert [row["status"] for row in json.loads(preview.stdout)["data"]["rows"]] == ["new"]  # type: ignore[attr-defined]
    assert json.loads(applied.stdout)["data"]["written"] == 1  # type: ignore[attr-defined]
    assert _bea(tmp_path, "check").returncode == 0


def test_valid_settings_on_a_pending_only_export_are_remembered(tmp_path: Path) -> None:
    _books(tmp_path)

    pending = _import(tmp_path, "pending.csv", *_csv("Assets:Cash", "Expenses:Food"))
    posted = _import(tmp_path, "posted.csv")

    assert pending.returncode == 0, pending.stderr  # type: ignore[attr-defined]
    assert "Not remembering" not in json.dumps(json.loads(pending.stdout))  # type: ignore[attr-defined]
    assert [row["status"] for row in json.loads(posted.stdout)["data"]["rows"]] == ["new"]  # type: ignore[attr-defined]


def test_an_auto_accounts_ledger_still_remembers_a_first_use_source(tmp_path: Path) -> None:
    _books(tmp_path, 'plugin "beancount.plugins.auto_accounts"\n2024-01-01 commodity USD\n')

    pending = _import(tmp_path, "pending.csv", *_csv("Assets:Cash", "Expenses:Food"))

    assert "Not remembering" not in json.dumps(json.loads(pending.stdout))  # type: ignore[attr-defined]
