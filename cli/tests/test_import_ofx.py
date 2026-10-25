"""`bea-engine import --ofx`: OFX/QFX through upstream beangulp (w22/m2/t002).

The engine answers the same preview envelope as `--csv`, with FITIDs
carried into `ofx:` import-ids. These tests drive the real upstream
example importer — stubbing it would stub the behavior under test — via
a `uv run --with beangulp` overlay over the project environment, and
skip when the overlay cannot be built (offline). Tests that never reach
`extract()` run on the plain interpreter instead.
"""

from __future__ import annotations

import json
import os
import subprocess
from collections.abc import Callable
from pathlib import Path

import pytest

from tests.conftest import OFX_CHECKING_ROWS, OfxRow, render_ofx, write_ofx

CLI_ROOT = Path(__file__).resolve().parents[1]
OVERLAY = [
    "uv",
    "run",
    "--quiet",
    "--project",
    str(CLI_ROOT),
    "--with",
    "beangulp==0.2.0",
    "--no-sync",
    "python",
]

LEDGER = """\
option "title" "OFX import"
option "operating_currency" "USD"
2026-01-01 open Assets:Checking USD
2026-01-01 open Expenses:Food USD
2026-01-01 open Expenses:Uncategorized USD
"""

BROKERAGE_FILE = """\
OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<INVSTMTRSRS><INVSTMTTRNRS><TRNUID>1<STATUS><CODE>0<SEVERITY>INFO</STATUS>
<INVSTMTRS>
<DTSERVER>20260810<LANGUAGE>ENG
<INVACCTFROM><BROKERID>broker<ACCTID>BRK-1</INVACCTFROM>
<INVTRANLIST><DTSTART>20260801<DTEND>20260810
<BUYSTOCK><INVBUY><INVTRAN><FITID>INV-1<TRNTYPE>BUY<DTPOSTED>20260805</INVTRAN></INVBUY></BUYSTOCK>
</INVTRANLIST>
</INVSTMTRS></INVSTMTTRNRS></INVSTMTRSRS>
</OFX>
"""


def _plain_engine(*args: str) -> subprocess.CompletedProcess[str]:
    """Run `bea-engine` on the project interpreter, which lacks beangulp."""
    return subprocess.run(
        [
            "uv",
            "run",
            "--quiet",
            "--project",
            str(CLI_ROOT),
            "--no-sync",
            "python",
            "-m",
            "bea_engine",
            *args,
        ],
        env={**os.environ, "PYTHONPATH": str(CLI_ROOT / "src")},
        capture_output=True,
        text=True,
        timeout=300,
        cwd=CLI_ROOT,
        check=False,
    )


@pytest.fixture(scope="module")
def ofx_engine() -> Callable[..., subprocess.CompletedProcess[str]]:
    """Run `bea-engine` with the real beangulp importable, skipping offline."""

    def run(*args: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [*OVERLAY, "-m", "bea_engine", *args],
            env={**os.environ, "PYTHONPATH": str(CLI_ROOT / "src")},
            capture_output=True,
            text=True,
            timeout=300,
            cwd=CLI_ROOT,
            check=False,
        )

    probe = run("version")
    try:
        healthy = probe.returncode == 0 and json.loads(probe.stdout)["ok"] is True
    except ValueError:
        healthy = False
    if not healthy:
        pytest.skip(f"beangulp overlay unavailable: {(probe.stderr or probe.stdout)[-500:]}")
    return run


def _ledger(tmp_path: Path) -> Path:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    return ledger


def _ofx(
    tmp_path: Path,
    rows: list[OfxRow],
    name: str = "checking.ofx",
    acctid: str = "CHK-9",
) -> Path:
    """One OFX file from (trntype, posted, amount, fitid, name, memo) rows."""
    return write_ofx(tmp_path / name, rows, acctid=acctid)


def _answer(completed: subprocess.CompletedProcess[str]) -> dict:
    assert completed.returncode == 0, completed.stderr + completed.stdout
    return json.loads(completed.stdout)["data"]


def _refusal(completed: subprocess.CompletedProcess[str]) -> dict:
    assert completed.returncode == 2, completed.stdout + completed.stderr
    answer = json.loads(completed.stdout)
    assert answer["ok"] is False and answer["error"]["category"] == "usage"
    return answer["error"]


def test_ofx_posts_debits_and_credits_with_file_signs(
    tmp_path: Path, ofx_engine: Callable[..., subprocess.CompletedProcess[str]]
) -> None:
    """A debit posts negative, a credit positive, FITIDs become `ofx:` ids."""
    ledger = _ledger(tmp_path)
    source = _ofx(tmp_path, OFX_CHECKING_ROWS)
    preview = _answer(
        ofx_engine("import", "--file", str(ledger), "--source", str(source), "--ofx", "--account", "Assets:Checking")
    )
    assert [row["status"] for row in preview["rows"]] == ["new", "new"]
    assert [row["id_source"] for row in preview["rows"]] == ["bank", "bank"]
    debit, credit = (row["entry"] for row in preview["rows"])
    assert 'import-id: "ofx:TXN-001"' in debit and 'fitid: "TXN-001"' in debit
    assert "Assets:Checking         -42.50 USD" in debit
    assert "Expenses:Uncategorized   42.50 USD" in debit
    assert 'import-id: "ofx:TXN-002"' in credit
    assert "Assets:Checking          1200.00 USD" in credit
    assert "Expenses:Uncategorized  -1200.00 USD" in credit
    # No rules and no default: both rows queue for review.
    assert debit.startswith("2026-08-03 ! ") and credit.startswith("2026-08-05 ! ")

    applied = _answer(
        ofx_engine(
            "import",
            "--file",
            str(ledger),
            "--source",
            str(source),
            "--ofx",
            "--account",
            "Assets:Checking",
            "--apply",
        )
    )
    assert applied["written"] == 2
    text = ledger.read_text()
    assert 'import-id: "ofx:TXN-001"' in text and 'import-id: "ofx:TXN-002"' in text


def test_ofx_reimport_skips_exact_fitid_matches(
    tmp_path: Path, ofx_engine: Callable[..., subprocess.CompletedProcess[str]]
) -> None:
    ledger = _ledger(tmp_path)
    source = _ofx(tmp_path, OFX_CHECKING_ROWS)
    _answer(
        ofx_engine(
            "import", "--file", str(ledger), "--source", str(source), "--ofx", "--account", "Assets:Checking", "--apply"
        )
    )
    preview = _answer(
        ofx_engine("import", "--file", str(ledger), "--source", str(source), "--ofx", "--account", "Assets:Checking")
    )
    assert [row["status"] for row in preview["rows"]] == ["duplicate", "duplicate"]
    assert all("already in the ledger" in row["reason"] for row in preview["rows"])


def test_ofx_duplicate_fitid_with_different_data_conflicts(
    tmp_path: Path, ofx_engine: Callable[..., subprocess.CompletedProcess[str]]
) -> None:
    """One FITID on two different rows of a file is a conflict, not two rows."""
    ledger = _ledger(tmp_path)
    rows = [OFX_CHECKING_ROWS[0], (*OFX_CHECKING_ROWS[1][:3], "TXN-001", *OFX_CHECKING_ROWS[1][4:])]
    source = _ofx(tmp_path, rows)
    preview = _answer(
        ofx_engine("import", "--file", str(ledger), "--source", str(source), "--ofx", "--account", "Assets:Checking")
    )
    assert [row["status"] for row in preview["rows"]] == ["new", "conflict"]
    assert preview["rows"][1]["reason"] == "Stable ID repeats row 1 of this import with different transaction data."


def test_ofx_identical_rows_sharing_a_fitid_preview_as_one(
    tmp_path: Path, ofx_engine: Callable[..., subprocess.CompletedProcess[str]]
) -> None:
    ledger = _ledger(tmp_path)
    source = _ofx(tmp_path, [OFX_CHECKING_ROWS[0], OFX_CHECKING_ROWS[0], OFX_CHECKING_ROWS[1]])
    preview = _answer(
        ofx_engine("import", "--file", str(ledger), "--source", str(source), "--ofx", "--account", "Assets:Checking")
    )
    assert [row["status"] for row in preview["rows"]] == ["new", "duplicate", "new"]
    assert preview["rows"][1]["reason"] == "Repeats row 1 of this import."


def test_ofx_row_without_fitid_gets_a_stable_content_hash(
    tmp_path: Path, ofx_engine: Callable[..., subprocess.CompletedProcess[str]]
) -> None:
    """No FITID means an `ofx:sha256:` id, a note, and a stable re-import."""
    ledger = _ledger(tmp_path)
    rows = [(*OFX_CHECKING_ROWS[0][:3], None, *OFX_CHECKING_ROWS[0][4:]), OFX_CHECKING_ROWS[1]]
    source = _ofx(tmp_path, rows)
    preview = _answer(
        ofx_engine("import", "--file", str(ledger), "--source", str(source), "--ofx", "--account", "Assets:Checking")
    )
    hashed = preview["rows"][0]
    assert hashed["status"] == "new" and hashed["id_source"] == "hash"
    assert 'import-id: "ofx:sha256:' in hashed["entry"]
    assert "fitid" not in hashed["entry"]
    assert preview["notes"] == [
        "1 OFX row(s) carry no FITID (row 1), so their import-ids are content hashes: "
        "a reworded memo re-imports them as new rows."
    ]
    _answer(
        ofx_engine(
            "import", "--file", str(ledger), "--source", str(source), "--ofx", "--account", "Assets:Checking", "--apply"
        )
    )
    again = _answer(
        ofx_engine("import", "--file", str(ledger), "--source", str(source), "--ofx", "--account", "Assets:Checking")
    )
    assert [row["status"] for row in again["rows"]] == ["duplicate", "duplicate"]


def test_ofx_hash_matches_a_row_imported_before_under_csv(
    tmp_path: Path, ofx_engine: Callable[..., subprocess.CompletedProcess[str]]
) -> None:
    """The same row imported before (a `csv:sha256:` id) still matches.

    A `--config` OFX run wrote content hashes under the `csv:` prefix; the
    no-code re-import computes the same digest under `ofx:` but keeps the
    older spelling as a lookup, so the row is a duplicate, not new.
    """
    ledger = _ledger(tmp_path)
    rows = [(*OFX_CHECKING_ROWS[0][:3], None, *OFX_CHECKING_ROWS[0][4:])]
    source = _ofx(tmp_path, rows)
    preview = _answer(
        ofx_engine("import", "--file", str(ledger), "--source", str(source), "--ofx", "--account", "Assets:Checking")
    )
    digest = preview["rows"][0]["entry"].split('import-id: "ofx:sha256:')[1].split('"')[0]
    with ledger.open("a") as handle:
        handle.write(
            '\n2026-08-03 * "PEETS COFFEE / CARD PURCHASE"\n'
            f'  import-id: "csv:sha256:{digest}"\n'
            "  Assets:Checking         -42.50 USD\n"
            "  Expenses:Uncategorized   42.50 USD\n"
        )
    again = _answer(
        ofx_engine("import", "--file", str(ledger), "--source", str(source), "--ofx", "--account", "Assets:Checking")
    )
    assert [row["status"] for row in again["rows"]] == ["duplicate"]


def test_ofx_rules_categorize_and_default_catches_the_rest(
    tmp_path: Path, ofx_engine: Callable[..., subprocess.CompletedProcess[str]]
) -> None:
    """`--rules` match narrations; the rest post to `--default-account`."""
    ledger = _ledger(tmp_path)
    source = _ofx(tmp_path, OFX_CHECKING_ROWS, name="card.qfx")
    rules = tmp_path / "rules.toml"
    rules.write_text('[[rule]]\nmatch = "PEETS"\naccount = "Expenses:Food"\n')
    preview = _answer(
        ofx_engine(
            "import",
            "--file",
            str(ledger),
            "--source",
            str(source),
            "--ofx",
            "--account",
            "Assets:Checking",
            "--rules",
            str(rules),
            "--default-account",
            "Expenses:Food",
        )
    )
    assert [row["rule"] for row in preview["rows"]] == ["PEETS", "unmatched"]
    matched, fallback = (row["entry"] for row in preview["rows"])
    assert matched.startswith("2026-08-03 * ") and "Expenses:Food" in matched
    assert fallback.startswith("2026-08-05 ! ") and "Expenses:Food" in fallback


def test_ofx_multi_acctid_file_is_refused(
    tmp_path: Path, ofx_engine: Callable[..., subprocess.CompletedProcess[str]]
) -> None:
    ledger = _ledger(tmp_path)
    block = render_ofx([], acctid="CHK-10").split("<STMTTRNRS>")[1].split("</STMTTRNRS>")[0]
    text = render_ofx([], acctid="CHK-9").replace("</BANKMSGSRSV1>", f"<STMTTRNRS>{block}</STMTTRNRS>\n</BANKMSGSRSV1>")
    source = tmp_path / "multi.ofx"
    source.write_text(text)
    error = _refusal(
        ofx_engine("import", "--file", str(ledger), "--source", str(source), "--ofx", "--account", "Assets:Checking")
    )
    assert "holds transactions for 2 accounts (CHK-9, CHK-10)" in error["message"]
    assert "--config" in error["message"]


def test_ofx_investment_only_file_points_at_config(
    tmp_path: Path, ofx_engine: Callable[..., subprocess.CompletedProcess[str]]
) -> None:
    ledger = _ledger(tmp_path)
    source = tmp_path / "brokerage.ofx"
    source.write_text(BROKERAGE_FILE)
    error = _refusal(
        ofx_engine("import", "--file", str(ledger), "--source", str(source), "--ofx", "--account", "Assets:Checking")
    )
    assert error["message"].endswith(
        "holds no bank or credit-card transactions to import."
        " Brokerage and investment statements need a Python importer (--config)."
    )


def test_ofx_garbage_is_not_an_ofx_file(
    tmp_path: Path, ofx_engine: Callable[..., subprocess.CompletedProcess[str]]
) -> None:
    ledger = _ledger(tmp_path)
    source = tmp_path / "garbage.ofx"
    source.write_text("this is not an ofx file at all\n")
    error = _refusal(
        ofx_engine("import", "--file", str(ledger), "--source", str(source), "--ofx", "--account", "Assets:Checking")
    )
    assert error["message"].endswith("is not an OFX file: no OFX header or XML prolog found.")


def test_ofx_statement_without_curdef_is_refused(
    tmp_path: Path, ofx_engine: Callable[..., subprocess.CompletedProcess[str]]
) -> None:
    """Upstream silently skips a currencyless statement; bea refuses it."""
    ledger = _ledger(tmp_path)
    source = _ofx(tmp_path, OFX_CHECKING_ROWS)
    source.write_text(source.read_text().replace("<CURDEF>USD\n", ""))
    error = _refusal(
        ofx_engine("import", "--file", str(ledger), "--source", str(source), "--ofx", "--account", "Assets:Checking")
    )
    assert error["message"].endswith("a bank statement names no CURDEF currency; cannot price its rows.")


def test_ofx_empty_memo_reads_as_absent(
    tmp_path: Path, ofx_engine: Callable[..., subprocess.CompletedProcess[str]]
) -> None:
    """An empty `<MEMO></MEMO>` means what an absent memo means."""
    ledger = _ledger(tmp_path)
    source = _ofx(tmp_path, [OFX_CHECKING_ROWS[0]])
    source.write_text(source.read_text().replace("<MEMO>CARD PURCHASE", "<MEMO></MEMO>"))
    preview = _answer(
        ofx_engine("import", "--file", str(ledger), "--source", str(source), "--ofx", "--account", "Assets:Checking")
    )
    assert [row["status"] for row in preview["rows"]] == ["new"]
    assert preview["rows"][0]["narration"] == "PEETS COFFEE"


def test_ofx_missing_dtposted_names_the_row(
    tmp_path: Path, ofx_engine: Callable[..., subprocess.CompletedProcess[str]]
) -> None:
    ledger = _ledger(tmp_path)
    source = _ofx(tmp_path, OFX_CHECKING_ROWS)
    source.write_text(source.read_text().replace("<DTPOSTED>20260805", "", 1))
    error = _refusal(
        ofx_engine("import", "--file", str(ledger), "--source", str(source), "--ofx", "--account", "Assets:Checking")
    )
    assert error["message"].endswith("OFX row 2 has no DTPOSTED date; cannot place it.")


def test_ofx_without_beangulp_names_the_feature(tmp_path: Path) -> None:
    """Where beangulp is missing, the engine says how to enable it."""
    try:
        import examples.importers.ofx  # noqa: F401
    except ImportError:
        pass
    else:
        pytest.skip("beangulp is installed here; nothing to refuse")
    ledger = _ledger(tmp_path)
    source = _ofx(tmp_path, OFX_CHECKING_ROWS)
    error = _refusal(
        _plain_engine("import", "--file", str(ledger), "--source", str(source), "--ofx", "--account", "Assets:Checking")
    )
    assert error["message"] == "Engine feature 'beangulp' is not enabled. Run: bea engine enable beangulp"


@pytest.mark.parametrize(
    ("extra", "message"),
    [
        (
            ["--account", "Assets:Checking", "--csv", "date=Date"],
            "Pass only one of --csv, --config, or --ofx.",
        ),
        ([], "--ofx needs --account ACCOUNT, naming the account the export belongs to."),
    ],
    ids=["csv-and-ofx", "ofx-without-account"],
)
def test_ofx_flag_misuse_is_a_usage_error(tmp_path: Path, extra: list[str], message: str) -> None:
    """Mode conflicts and a missing `--account` fail before `extract()` runs."""
    ledger = _ledger(tmp_path)
    source = _ofx(tmp_path, OFX_CHECKING_ROWS)
    error = _refusal(_plain_engine("import", "--file", str(ledger), "--source", str(source), "--ofx", *extra))
    assert error["message"] == message
