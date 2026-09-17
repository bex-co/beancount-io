"""The m23 exit-contract matrix: one parameterized test over every absorbed reproducer.

Each row replays one w3 finding and asserts the exit code plus the on-disk
effect: refusals leave the ledger hash-identical, and the four plugin rows
assert exit 0 with the synthesized row marked generated. Every row fails
against pre-milestone behavior (verified in a worktree at the milestone's
base) except w3/236, whose fix predates the milestone (99eb18a1) — that row
is a regression pin. The interactive-shell `.output` variant of w3/300 stays
in test_ledger_safety.py because `bea query` needs a terminal there.
"""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
from collections.abc import Callable
from pathlib import Path
from typing import Any

import pytest

ROOT = Path(__file__).resolve().parents[1]

QUERY_LEDGER = """option "operating_currency" "USD"
2024-01-01 open Assets:Bank:Checking USD
2024-01-01 open Equity:Opening-Balances USD
2024-01-01 query "cash" "SELECT account WHERE account ~ 'Checking'"
2024-01-01 * "seed"
  Assets:Bank:Checking  1 USD
  Equity:Opening-Balances
"""

IMPORT_SEED = """option "operating_currency" "USD"
2020-01-01 open Assets:Cash USD
2020-01-01 open Equity:Opening-Balances
2020-01-01 open Expenses:Food USD
2020-01-01 * "seed"
  Assets:Cash               100 USD
  Equity:Opening-Balances  -100 USD
"""

ACCOUNTS_CHILD = "2020-01-01 open Assets:Cash USD\n2020-01-01 open Expenses:Food USD\n"
MISALIGNED_CHILD = '2020-02-01 * "seed"\n  Assets:Cash  -1 USD\n  Expenses:Food  1 USD\n'

LINKED_LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Checking USD
2026-01-01 open Expenses:Food USD
2026-01-02 * "Lunch" ^coffee-jan
  Assets:Checking  -5 USD
  Expenses:Food  5 USD
"""

CLOSED_LEDGER = """2026-01-01 open Assets:Bank:Checking USD
2026-01-01 open Expenses:Food USD
2026-06-01 close Assets:Bank:Checking
2026-07-01 * "late"
  Assets:Bank:Checking -1 USD
  Expenses:Food 1 USD
"""

AUTO_BOOK = """plugin "beancount.plugins.auto_accounts"
2020-01-01 open Assets:Cash USD
2020-01-02 * "T"
  Expenses:Food 5 USD
  Assets:Cash
"""

IMPLICIT_BOOK = """plugin "beancount.plugins.implicit_prices"
2020-01-01 open Assets:Cash USD
2020-01-01 open Assets:Stock HOOL
2020-01-02 * "B"
  Assets:Stock 10 HOOL {100 USD}
  Assets:Cash
"""

CURRENCY_BOOK = """plugin "beancount.plugins.currency_accounts" "Equity:Trading"
2020-01-01 open Assets:Cash
2020-01-01 open Expenses:Food
2020-01-02 * "Convert"
  Assets:Cash 100 EUR @ 1.2 USD
  Expenses:Food
"""

CLOSE_BOOK = """plugin "beancount.plugins.close_tree"
2020-01-01 open Assets:Cash USD
2020-01-01 open Assets:Cash:Pocket USD
2020-01-01 open Expenses:Food USD
2020-01-02 close Assets:Cash
"""


def _bea(tmp_path: Path, *args: str, stdin: str = "") -> subprocess.CompletedProcess[str]:
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
        input=stdin,
        capture_output=True,
        text=True,
        timeout=60,
    )


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _items(result: subprocess.CompletedProcess[str]) -> list[dict[str, Any]]:
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout)["data"]


def _check_run_missing(_tmp: Path, result: subprocess.CompletedProcess[str]) -> None:
    assert "not found" in result.stderr.casefold()
    assert "cash" in result.stderr


def _check_auto_accounts(_tmp: Path, result: subprocess.CompletedProcess[str]) -> None:
    by_account = {item["account"]: item for item in _items(result)}
    assert by_account["Expenses:Food"]["generated"] is True
    assert "generated" not in by_account["Assets:Cash"]


def _check_implicit_prices(_tmp: Path, result: subprocess.CompletedProcess[str]) -> None:
    [price] = _items(result)
    assert price["generated"] is True


def _check_currency_accounts(_tmp: Path, result: subprocess.CompletedProcess[str]) -> None:
    by_account = {item["account"]: item for item in _items(result)}
    assert by_account["Equity:Trading:EUR"]["generated"] is True
    assert by_account["Equity:Trading:USD"]["generated"] is True
    assert "generated" not in by_account["Assets:Cash"]


def _check_close_tree(_tmp: Path, result: subprocess.CompletedProcess[str]) -> None:
    by_account = {item["account"]: item for item in _items(result)}
    assert by_account["Assets:Cash:Pocket"]["generated"] is True
    assert "generated" not in by_account["Assets:Cash"]


CHECKERS: dict[str, Callable[[Path, subprocess.CompletedProcess[str]], None]] = {
    "run-missing": _check_run_missing,
    "auto-accounts": _check_auto_accounts,
    "implicit-prices": _check_implicit_prices,
    "currency-accounts": _check_currency_accounts,
    "close-tree": _check_close_tree,
}

# files: relative path -> content, or None for an empty directory.
# link: (source, name) hard link to create after writing files.
CASES: list[dict[str, Any]] = [
    # t001: output destinations that alias the ledger.
    {
        "id": "w3/300",
        "files": {"main.bean": QUERY_LEDGER},
        "args": ["--file", "main.bean", "query", "PRINT", "-o", "main.bean"],
        "exit": 2,
        "unchanged": ["main.bean"],
        "stderr_has": ["would overwrite the ledger it reads"],
    },
    {
        "id": "w3/300-relative",
        "files": {"main.bean": QUERY_LEDGER},
        "args": ["--file", "main.bean", "query", "PRINT", "-o", "./main.bean"],
        "exit": 2,
        "unchanged": ["main.bean"],
        "stderr_has": ["would overwrite the ledger it reads"],
    },
    {
        "id": "w3/300-hardlink",
        "files": {"main.bean": QUERY_LEDGER},
        "link": ("main.bean", "link.bean"),
        "args": ["--file", "main.bean", "query", "PRINT", "-o", "link.bean"],
        "exit": 2,
        "unchanged": ["main.bean"],
        "stderr_has": ["would overwrite the ledger it reads"],
    },
    {
        "id": "w3/300-include",
        "files": {"main.bean": 'include "accounts.beancount"\n', "accounts.beancount": ACCOUNTS_CHILD},
        "args": ["--file", "main.bean", "query", "SELECT account", "-o", "accounts.beancount"],
        "exit": 2,
        "unchanged": ["main.bean", "accounts.beancount"],
        "stderr_has": ["would overwrite the ledger it reads"],
    },
    {
        "id": "w3/300-json",
        "files": {"main.bean": QUERY_LEDGER},
        "args": ["--json", "--file", "main.bean", "query", "PRINT", "-o", "main.bean"],
        "exit": 2,
        "unchanged": ["main.bean"],
        "stdout_is": "",
        "json_error": {"category": "usage", "message_has": ["would overwrite the ledger it reads"]},
    },
    {
        "id": "w3/336",
        "files": {"victim.bean": "Real books\n"},
        "args": ["example", "--date-begin", "2020-01-01", "--date-end", "2020-01-31", "-s", "7", "-o", "victim.bean"],
        "exit": 4,
        "unchanged": ["victim.bean"],
        "stderr_has": ["Already exists", "--force"],
    },
    # t002: --allow-errors scoped to pre-existing errors.
    {
        "id": "w3/321",
        "files": {"main.bean": IMPORT_SEED, "bank.csv": "date,amount,description\n2020-08-01,-2.00,coffee\n"},
        "args": [
            "--json",
            "--file",
            "main.bean",
            "import",
            "bank.csv",
            "--csv",
            "auto",
            "--account",
            "Assets:Cash",
            "--apply",
            "--duplicates",
            "include",
            "--allow-errors",
        ],
        "exit": 1,
        "unchanged": ["main.bean"],
        "stderr_has": ["Import would leave the ledger invalid"],
    },
    {
        "id": "w3/323",
        "files": {"main.bean": 'include "accounts.beancount"\n', "accounts.beancount": ACCOUNTS_CHILD},
        "args": [
            "--json",
            "--file",
            "main.bean",
            "add",
            "transaction",
            "--date",
            "2026-08-01",
            "-p",
            "Assets:Cash -1 USD",
            "-p",
            "Expenses:Missing",
            "--allow-errors",
        ],
        "exit": 1,
        "unchanged": ["main.bean", "accounts.beancount"],
        "stderr_has": ["would introduce", "unknown account 'Expenses:Missing'"],
    },
    # t003: format --check/-i honor the include closure.
    {
        "id": "w3/370",
        "files": {"main.bean": 'include "missing.bean"\n2020-01-01 open Assets:Cash USD\n'},
        "args": ["format", "main.bean", "--check"],
        "exit": 1,
        "unchanged": ["main.bean"],
        "combined_has": ['missing include: "missing.bean"', "main.bean"],
    },
    {
        "id": "w3/332",
        "files": {
            "main.bean": 'include "child.bean"\n2020-01-01 open Assets:Cash USD\n',
            "child.bean": MISALIGNED_CHILD,
        },
        "args": ["format", "main.bean", "--check"],
        "exit": 1,
        "unchanged": ["main.bean", "child.bean"],
        "combined_has": ["child.bean"],
    },
    {
        "id": "w3/273",
        "files": {"garbage.bean": "not beancount\n"},
        "args": ["format", "garbage.bean", "--check"],
        "exit": 1,
        "unchanged": ["garbage.bean"],
        "combined_has": ["cannot parse"],
    },
    # t004: doctor diagnostics mapped to exit status.
    {
        "id": "w3/345-parse",
        "files": {"half.bean": "2026-01-01 open\n"},
        "args": ["doctor", "parse", "half.bean"],
        "exit": 1,
        "unchanged": ["half.bean"],
        "stderr_has": ["half.bean"],
    },
    {
        "id": "w3/345-lex",
        "files": {"half.bean": "2026-01-01 open\n"},
        "args": ["doctor", "lex", "half.bean"],
        "exit": 1,
        "unchanged": ["half.bean"],
        "stderr_has": ["half.bean"],
    },
    {
        "id": "w3/345-print-options",
        "files": {"half.bean": "2026-01-01 open\n"},
        "args": ["doctor", "print-options", "half.bean"],
        "exit": 1,
        "unchanged": ["half.bean"],
        "stdout_is": "",
        "stderr_has": ["cannot load"],
    },
    {
        "id": "w3/363-linked",
        "files": {"linked.bean": LINKED_LEDGER},
        "args": ["doctor", "linked", "linked.bean", "^does-not-exist"],
        "exit": 1,
        "unchanged": ["linked.bean"],
        "stdout_has": ["Net Income: ()"],
        "stderr_has": ["^does-not-exist"],
    },
    {
        "id": "w3/363-region",
        "files": {"linked.bean": LINKED_LEDGER},
        "args": ["doctor", "region", "linked.bean", "999:999"],
        "exit": 1,
        "unchanged": ["linked.bean"],
        "stderr_has": ["999:999"],
    },
    {
        "id": "w3/364",
        "files": {"closed-only.bean": CLOSED_LEDGER},
        "args": ["doctor", "missing-open", "closed-only.bean"],
        "exit": 1,
        "unchanged": ["closed-only.bean"],
        "stdout_has": ["Assets:Bank:Checking"],
    },
    {
        "id": "w3/369",
        "files": {"main.bean": QUERY_LEDGER, "docs_bad/Wrong/Account": None},
        "args": ["doctor", "directories", "main.bean", "docs_bad"],
        "exit": 1,
        "unchanged": ["main.bean"],
        "stdout_has": ["Wrong:Account"],
    },
    {
        "id": "w3/371",
        "files": {"half.bean": "2026-01-01 open\n"},
        "args": ["doctor", "roundtrip", "half.bean"],
        "exit": 1,
        "unchanged": ["half.bean"],
        "combined_absent": ["Congratulations"],
    },
    # t005: query one-shots exiting 0 on nothing.
    {
        "id": "w3/236",
        "files": {"main.bean": QUERY_LEDGER},
        "args": ["--file", "main.bean", "query", ".run missing"],
        "exit": 2,
        "unchanged": ["main.bean"],
        "check": "run-missing",
    },
    {
        "id": "w3/262",
        "files": {"main.bean": QUERY_LEDGER},
        "args": ["--file", "main.bean", "query", "   "],
        "exit": 2,
        "unchanged": ["main.bean"],
        "stderr_has": ["A query is required as an argument or on stdin."],
    },
    {
        "id": "w3/269",
        "files": {"main.bean": QUERY_LEDGER},
        "args": ["--file", "main.bean", "query", "--format", "beancount", "SELECT account WHERE false"],
        "exit": 2,
        "unchanged": ["main.bean"],
        "stderr_has": ["must return entries"],
    },
    {
        "id": "w3/277",
        "files": {"main.bean": QUERY_LEDGER},
        "args": ["--file", "main.bean", "query", ".output out.txt"],
        "exit": 2,
        "unchanged": ["main.bean"],
        "absent": ["out.txt"],
        "stderr_has": ["--output FILE"],
    },
    {
        "id": "w3/282",
        "files": {"main.bean": QUERY_LEDGER},
        "args": ["--file", "main.bean", "query", "SELECT account LIMIT 1; SELECT narration LIMIT 1"],
        "exit": 2,
        "unchanged": ["main.bean"],
        "stderr_has": ["One BQL statement per invocation; got 2."],
    },
    # t006: no-op failures for treeify, ingest, and format.
    {
        "id": "w3/338",
        "files": {},
        "args": ["treeify"],
        "stdin": "hello\nworld\n",
        "exit": 2,
        "stdout_is": "",
        "stderr_has": ["no hierarchical column"],
    },
    {
        "id": "w3/317",
        "files": {"importers.py": "CONFIG = []\n", "downloads": None},
        "args": ["ingest", "identify", "--config", "importers.py", "downloads"],
        "exit": 2,
        "unchanged": ["importers.py"],
        "stderr_has": ["bea import --config"],
    },
    {
        "id": "w3/249",
        "files": {"emptydir": None},
        "args": ["--json", "format", "-i", "emptydir"],
        "exit": 2,
        "stdout_is": "",
        "json_error": {"category": "usage", "result_scanned": 0},
    },
    # t007: plugin-synthesized rows marked generated.
    {
        "id": "w3/301",
        "files": {"main.bean": AUTO_BOOK},
        "args": ["--json", "--file", "main.bean", "list", "open"],
        "exit": 0,
        "unchanged": ["main.bean"],
        "check": "auto-accounts",
    },
    {
        "id": "w3/318",
        "files": {"main.bean": IMPLICIT_BOOK},
        "args": ["--json", "--file", "main.bean", "list", "price"],
        "exit": 0,
        "unchanged": ["main.bean"],
        "check": "implicit-prices",
    },
    {
        "id": "w3/319",
        "files": {"main.bean": CURRENCY_BOOK},
        "args": ["--json", "--file", "main.bean", "list", "open"],
        "exit": 0,
        "unchanged": ["main.bean"],
        "check": "currency-accounts",
    },
    {
        "id": "w3/320",
        "files": {"main.bean": CLOSE_BOOK},
        "args": ["--json", "--file", "main.bean", "list", "close"],
        "exit": 0,
        "unchanged": ["main.bean"],
        "check": "close-tree",
    },
]


@pytest.mark.parametrize("case", CASES, ids=[case["id"] for case in CASES])
def test_exit_contract_matrix(tmp_path: Path, case: dict[str, Any]) -> None:
    for name, content in case.get("files", {}).items():
        target = tmp_path / name
        if content is None:
            target.mkdir(parents=True, exist_ok=True)
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content)
    if "link" in case:
        os.link(tmp_path / case["link"][0], tmp_path / case["link"][1])
    before = {name: _sha256(tmp_path / name) for name in case.get("unchanged", [])}

    result = _bea(tmp_path, *case["args"], stdin=case.get("stdin", ""))

    assert result.returncode == case["exit"], result.stderr
    for name, digest in before.items():
        assert _sha256(tmp_path / name) == digest, f"{name} changed"
    for name in case.get("absent", []):
        assert not (tmp_path / name).exists(), f"{name} was created"
    for text in case.get("stdout_has", []):
        assert text in result.stdout, result.stdout
    for text in case.get("stderr_has", []):
        assert text in result.stderr, result.stderr
    combined = result.stdout + result.stderr
    for text in case.get("combined_has", []):
        assert text in combined, combined
    for text in case.get("combined_absent", []):
        assert text not in combined, combined
    if "stdout_is" in case:
        assert result.stdout == case["stdout_is"], result.stdout
    if "json_error" in case:
        error = json.loads(result.stderr)["error"]
        assert error["category"] == case["json_error"]["category"]
        for text in case["json_error"].get("message_has", []):
            assert text in error["message"]
        if "result_scanned" in case["json_error"]:
            assert error["result"]["scanned"] == case["json_error"]["result_scanned"]
    if "check" in case:
        CHECKERS[case["check"]](tmp_path, result)
