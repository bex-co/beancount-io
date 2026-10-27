"""OFX source accounts are bank and account number, not the number alone (w5/1031).

Two banks can issue the same account number. The remembered OFX mapping was
keyed by `ACCTID` only, so bank B's statement replayed bank A's ledger
account at exit 0, and binding B overwrote A. The engine's one-account-per-
file guard compared `ACCTID` only too, so one file holding both banks'
statements posted both to one `--account`. Every case drives the real `bea`
in a subprocess against a beangulp-enabled engine and checks the postings
it wrote. Synthetic banks, accounts and amounts throughout.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

CLI_ROOT = Path(__file__).resolve().parents[1]

BANK_A = "111000025"
BANK_B = "222000118"
NUMBER = "00012345"

LEDGER = """\
option "operating_currency" "USD"
2024-01-01 open Assets:Checking USD,EUR
2024-01-01 open Assets:Savings USD
2024-01-01 open Liabilities:Card USD
2024-01-01 open Expenses:Food USD,EUR
2024-01-01 open Equity:Opening USD,EUR
2024-01-01 * "Capital"
  Assets:Checking 100.00 USD
  Assets:Savings 200.00 USD
  Equity:Opening -300.00 USD
"""

_HEADER = (
    "OFXHEADER:100\nDATA:OFXSGML\nVERSION:102\nSECURITY:NONE\nENCODING:USASCII\nCHARSET:1252\n"
    "COMPRESSION:NONE\nOLDFILEUID:NONE\nNEWFILEUID:NONE\n\n"
)


def _bank_statement(bankid: str, acctid: str, fitid: str, amount: str, posted: str, currency: str = "USD") -> str:
    return (
        f"<STMTTRNRS><TRNUID>{fitid}<STATUS><CODE>0<SEVERITY>INFO</STATUS><STMTRS><CURDEF>{currency}\n"
        f"<BANKACCTFROM><BANKID>{bankid}<ACCTID>{acctid}<ACCTTYPE>CHECKING</BANKACCTFROM>\n"
        f"<BANKTRANLIST><DTSTART>20240101<DTEND>20240110\n"
        f"<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>{posted}<TRNAMT>{amount}<FITID>{fitid}<NAME>Food</STMTTRN>\n"
        "</BANKTRANLIST><LEDGERBAL><BALAMT>0.00<DTASOF>20240110</LEDGERBAL></STMTRS></STMTTRNRS>"
    )


def _bank_file(path: Path, *statements: str) -> Path:
    path.write_text(
        _HEADER + "<OFX><SIGNONMSGSRSV1><SONRS><STATUS><CODE>0<SEVERITY>INFO</STATUS><DTSERVER>20240110"
        "<LANGUAGE>ENG</SONRS></SIGNONMSGSRSV1><BANKMSGSRSV1>" + "".join(statements) + "</BANKMSGSRSV1></OFX>\n"
    )
    return path


def _card_file(path: Path, acctid: str, fitid: str, amount: str, posted: str) -> Path:
    path.write_text(
        _HEADER + "<OFX><SIGNONMSGSRSV1><SONRS><STATUS><CODE>0<SEVERITY>INFO</STATUS><DTSERVER>20240110"
        "<LANGUAGE>ENG</SONRS></SIGNONMSGSRSV1><CREDITCARDMSGSRSV1><CCSTMTTRNRS><TRNUID>1<STATUS><CODE>0"
        f"<SEVERITY>INFO</STATUS><CCSTMTRS><CURDEF>USD<CCACCTFROM><ACCTID>{acctid}</CCACCTFROM>"
        "<BANKTRANLIST><DTSTART>20240101<DTEND>20240110"
        f"<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>{posted}<TRNAMT>{amount}<FITID>{fitid}<NAME>Food</STMTTRN>"
        "</BANKTRANLIST></CCSTMTRS></CCSTMTTRNRS></CREDITCARDMSGSRSV1></OFX>\n"
    )
    return path


@pytest.fixture(scope="module")
def beangulp_engine(tmp_path_factory: pytest.TempPathFactory) -> str:
    """A `BEA_ENGINE_PYTHON` wrapper with the real beangulp, skipping offline."""
    if sys.platform == "win32":
        pytest.skip("the overlay wrapper is a POSIX shell script")
    wrapper = tmp_path_factory.mktemp("ofx-engine") / "ofx-python"
    wrapper.write_text(
        f'#!/bin/sh\nexec uv run --quiet --project "{CLI_ROOT}" --with beangulp==0.2.0 --no-sync python "$@"\n'
    )
    wrapper.chmod(0o755)
    probe = subprocess.run(
        [str(wrapper), "-c", "import examples.importers.ofx"],
        capture_output=True,
        text=True,
        timeout=300,
        cwd=CLI_ROOT,
        check=False,
    )
    if probe.returncode != 0:
        pytest.skip(f"beangulp overlay unavailable: {(probe.stderr or probe.stdout)[-500:]}")
    return str(wrapper)


class Book:
    """One isolated ledger, config directory and `bea` invocation."""

    def __init__(self, root: Path, engine: str) -> None:
        self.root = root
        self.ledger = root / "main.bean"
        self.ledger.write_text(LEDGER)
        self.config = root / "config"
        self.env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_") and k != "CI"}
        self.env.update(
            BEA_CONFIG_DIR=str(self.config),
            BEA_ENGINE_PYTHON=engine,
            XDG_CONFIG_HOME=str(root / "xdg-config"),
            XDG_CACHE_HOME=str(root / "xdg-cache"),
            XDG_DATA_HOME=str(root / "xdg-data"),
            BEA_NO_UPDATE_NOTIFIER="1",
            PYTHONPATH=str(CLI_ROOT / "src"),
            TERM="dumb",
            NO_COLOR="1",
        )

    def bea(self, *args: str, json_output: bool = False) -> subprocess.CompletedProcess[str]:
        argv = [sys.executable, "-m", "cli.main", *(["--json"] if json_output else [])]
        return subprocess.run(
            [*argv, "--no-input", "--offline", "--file", str(self.ledger), *args],
            cwd=self.root,
            env=self.env,
            stdin=subprocess.DEVNULL,
            capture_output=True,
            text=True,
            timeout=300,
            check=False,
        )

    def imports(self, source: Path, *args: str) -> subprocess.CompletedProcess[str]:
        """Preview, then apply when the preview passed; the ledger is untouched by a refusal."""
        before = self.ledger.read_bytes()
        preview = self.bea("import", str(source), *args)
        assert self.ledger.read_bytes() == before, preview.stderr
        if preview.returncode != 0:
            return preview
        applied = self.bea("import", str(source), *args, "--apply")
        if applied.returncode != 0:
            assert self.ledger.read_bytes() == before, applied.stderr
        return applied

    def refused(self, source: Path, *args: str) -> str:
        """Both preview and apply exit 2 without writing; the joined stderr."""
        before = self.ledger.read_bytes()
        messages = []
        for extra in ([], ["--apply"]):
            result = self.bea("import", str(source), *args, *extra)
            assert result.returncode == 2, result.stdout + result.stderr
            assert self.ledger.read_bytes() == before
            messages.append(" ".join(result.stderr.split()))
        return " ".join(messages)

    def balances(self) -> dict[str, str]:
        """Each account's USD total, from the posting rows `bea query` reads."""
        result = self.bea(
            "query", "SELECT account, sum(number) AS total WHERE currency = 'USD' GROUP BY account", json_output=True
        )
        assert result.returncode == 0, result.stderr
        rows = json.loads(result.stdout)["data"]["rows"]
        return {account: total for account, total in rows}

    def records(self) -> list[dict[str, object]]:
        files = list((self.config / "importers").glob("ofx-*.json"))
        assert len(files) == 1, files
        accounts: list[dict[str, object]] = json.loads(files[0].read_text())["accounts"]
        return accounts


@pytest.fixture
def book(tmp_path: Path, beangulp_engine: str) -> Book:
    return Book(tmp_path, beangulp_engine)


FOOD = ("--default-account", "Expenses:Food")


def test_unbound_bank_with_a_reused_number_is_refused(book: Book) -> None:
    """B never mapped: its statement does not borrow A's ledger account."""
    first = _bank_file(book.root / "first.ofx", _bank_statement(BANK_A, NUMBER, "A1", "-10.00", "20240102"))
    second = _bank_file(book.root / "second.ofx", _bank_statement(BANK_B, NUMBER, "B1", "-20.00", "20240103"))
    assert book.imports(first, "--account", "Assets:Checking", *FOOD).returncode == 0

    message = book.refused(second)
    assert "but not which account the export belongs to" in message
    assert (
        f"Not reusing Assets:Checking: it is remembered for account {NUMBER} at bank {BANK_A}, a different bank. "
        f"second.ofx is account {NUMBER} at bank {BANK_B}" in message
    )
    assert book.balances()["Assets:Checking"] == "90.00"
    assert book.balances()["Assets:Savings"] == "200.00"
    assert [entry["bankid"] for entry in book.records()] == [BANK_A]


def test_both_banks_keep_and_recall_their_own_accounts(book: Book) -> None:
    """Binding B keeps A's record; each bank's next file posts to its own account."""
    first = _bank_file(book.root / "first.ofx", _bank_statement(BANK_A, NUMBER, "A1", "-10.00", "20240102"))
    second = _bank_file(book.root / "second.ofx", _bank_statement(BANK_B, NUMBER, "B1", "-20.00", "20240103"))
    again_a = _bank_file(book.root / "return.ofx", _bank_statement(BANK_A, NUMBER, "A2", "-5.00", "20240104"))
    again_b = _bank_file(book.root / "again-b.ofx", _bank_statement(BANK_B, NUMBER, "B2", "-1.00", "20240105"))
    assert book.imports(first, "--account", "Assets:Checking", *FOOD).returncode == 0
    assert book.imports(second, "--account", "Assets:Savings", *FOOD).returncode == 0
    assert sorted((entry["bankid"], entry["acctid"], entry["account"]) for entry in book.records()) == [
        (BANK_A, NUMBER, "Assets:Checking"),
        (BANK_B, NUMBER, "Assets:Savings"),
    ]

    recalled_a = book.imports(again_a)
    assert recalled_a.returncode == 0, recalled_a.stderr
    assert "Using settings remembered from first.ofx for return.ofx: --ofx --account Assets:Checking" in (
        " ".join(recalled_a.stderr.split())
    )
    recalled_b = book.imports(again_b)
    assert recalled_b.returncode == 0, recalled_b.stderr
    assert "--account Assets:Savings" in " ".join(recalled_b.stderr.split())

    balances = book.balances()
    assert (balances["Assets:Checking"], balances["Assets:Savings"], balances["Expenses:Food"]) == (
        "85.00",
        "179.00",
        "36.00",
    )
    text = book.ledger.read_text()
    assert text.count('import-id: "ofx:') == 4
    assert len(book.records()) == 2


def test_legacy_number_only_memory_asks_for_the_account_once(book: Book) -> None:
    """A record saved before the bank was kept cannot prove its bank, so it is not replayed.

    It might be bank B's mapping as easily as bank A's, so even the very
    bank that wrote it names its account once; that run re-keys the memory
    by bank, and the next flag-free run replays it.
    """
    first = _bank_file(book.root / "first.ofx", _bank_statement(BANK_A, NUMBER, "A1", "-10.00", "20240102"))
    again = _bank_file(book.root / "return.ofx", _bank_statement(BANK_A, NUMBER, "A2", "-5.00", "20240104"))
    later = _bank_file(book.root / "later.ofx", _bank_statement(BANK_A, NUMBER, "A3", "-1.00", "20240105"))
    assert book.imports(first, "--account", "Assets:Checking", *FOOD).returncode == 0
    record = next((book.config / "importers").glob("ofx-*.json"))
    legacy = {
        "accounts": [
            {
                "acctid": NUMBER,
                "account": "Assets:Savings",
                "rules": None,
                "default_account": "Expenses:Food",
                "source": "old.ofx",
            }
        ]
    }
    record.write_text(json.dumps(legacy))

    message = book.refused(again)
    assert (
        f"Not reusing Assets:Savings: it is remembered for account {NUMBER}, saved before bea recorded the bank"
        in message
    )

    assert book.imports(again, "--account", "Assets:Checking", *FOOD).returncode == 0
    assert book.records() == [
        {
            "acctid": NUMBER,
            "bankid": BANK_A,
            "account": "Assets:Checking",
            "rules": None,
            "default_account": "Expenses:Food",
            "source": "return.ofx",
        }
    ]
    replayed = book.imports(later)
    assert replayed.returncode == 0, replayed.stderr
    assert book.balances()["Assets:Checking"] == "84.00"
    assert book.balances()["Assets:Savings"] == "200.00"


def test_one_file_with_two_banks_under_one_number_is_refused(book: Book) -> None:
    """The engine's one-account guard counts the bank, not just the number."""
    both = _bank_file(
        book.root / "statements.ofx",
        _bank_statement(BANK_A, NUMBER, "T1", "-10.00", "20240102"),
        _bank_statement(BANK_B, NUMBER, "T2", "-20.00", "20240103"),
    )
    message = book.refused(both, "--account", "Assets:Checking", *FOOD)
    assert f"holds transactions for 2 accounts ({NUMBER} at bank {BANK_A}, {NUMBER} at bank {BANK_B})" in message
    assert book.balances()["Assets:Checking"] == "100.00"
    assert not (book.config / "importers").exists() or not list((book.config / "importers").glob("ofx-*.json"))


def test_one_file_with_two_numbers_at_one_bank_is_still_refused(book: Book) -> None:
    both = _bank_file(
        book.root / "statements.ofx",
        _bank_statement(BANK_A, NUMBER, "T1", "-10.00", "20240102"),
        _bank_statement(BANK_A, "00054321", "T2", "-20.00", "20240103"),
    )
    message = book.refused(both, "--account", "Assets:Checking", *FOOD)
    assert f"holds transactions for 2 accounts ({NUMBER}, 00054321)" in message


def test_one_bank_account_in_two_currencies_imports_both(book: Book) -> None:
    """Statement currency does not make one bank account two."""
    both = _bank_file(
        book.root / "statements.ofx",
        _bank_statement(BANK_A, NUMBER, "T1", "-10.00", "20240102"),
        _bank_statement(BANK_A, NUMBER, "T2", "-20.00", "20240103", currency="EUR"),
    )
    result = book.imports(both, "--account", "Assets:Checking", *FOOD)
    assert result.returncode == 0, result.stderr
    text = " ".join(book.ledger.read_text().split())
    assert "Assets:Checking -10.00 USD" in text and "Assets:Checking -20.00 EUR" in text
    assert [(entry["bankid"], entry["account"]) for entry in book.records()] == [(BANK_A, "Assets:Checking")]


def test_same_bank_account_under_a_new_filename_is_recalled(book: Book) -> None:
    first = _bank_file(book.root / "first.ofx", _bank_statement(BANK_A, NUMBER, "A1", "-10.00", "20240102"))
    second = _bank_file(book.root / "second.ofx", _bank_statement(BANK_A, NUMBER, "A2", "-20.00", "20240103"))
    assert book.imports(first, "--account", "Assets:Checking", *FOOD).returncode == 0
    recalled = book.imports(second)
    assert recalled.returncode == 0, recalled.stderr
    assert book.balances()["Assets:Checking"] == "70.00"
    assert book.balances()["Assets:Savings"] == "200.00"


def test_different_numbers_keep_both_bindings(book: Book) -> None:
    first = _bank_file(book.root / "first.ofx", _bank_statement(BANK_A, NUMBER, "A1", "-10.00", "20240102"))
    second = _bank_file(book.root / "second.ofx", _bank_statement(BANK_B, "00054321", "B1", "-20.00", "20240103"))
    again = _bank_file(book.root / "return.ofx", _bank_statement(BANK_A, NUMBER, "A2", "-5.00", "20240104"))
    assert book.imports(first, "--account", "Assets:Checking", *FOOD).returncode == 0
    assert book.imports(second, "--account", "Assets:Savings", *FOOD).returncode == 0
    assert book.imports(again).returncode == 0
    assert (book.balances()["Assets:Checking"], book.balances()["Assets:Savings"]) == ("85.00", "180.00")
    assert len(book.records()) == 2


def test_card_statement_without_a_bank_is_remembered_and_recalled(book: Book) -> None:
    """A card statement has no BANKID; its number alone is its identity."""
    first = _card_file(book.root / "card.qfx", "4111000011112222", "C1", "-10.00", "20240102")
    second = _card_file(book.root / "card-next.qfx", "4111000011112222", "C2", "-5.00", "20240103")
    assert book.imports(first, "--account", "Liabilities:Card", *FOOD).returncode == 0
    assert [(entry["bankid"], entry["account"]) for entry in book.records()] == [(None, "Liabilities:Card")]
    recalled = book.imports(second)
    assert recalled.returncode == 0, recalled.stderr
    assert book.balances()["Liabilities:Card"] == "-15.00"
