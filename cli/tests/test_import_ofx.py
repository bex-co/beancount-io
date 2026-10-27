"""`bea-engine import --ofx`: OFX/QFX through upstream beangulp (w22/m2/t002).

The engine answers the same preview envelope as `--csv`, with FITIDs
carried into `ofx:` import-ids. These tests drive the real upstream
example importer — stubbing it would stub the behavior under test — via
a `uv run --with beangulp` overlay over the project environment, and
skip when the overlay cannot be built (offline). Tests that never reach
`extract()` run on the plain interpreter instead.
"""

from __future__ import annotations

import codecs
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


def test_ofx_rule_attribution_rides_on_matched_rows(
    tmp_path: Path, ofx_engine: Callable[..., subprocess.CompletedProcess[str]]
) -> None:
    """A rule's `client`/`project` reach OFX rows it matches, as for CSV (w2/m55/t003)."""
    ledger = _ledger(tmp_path)
    source = _ofx(tmp_path, OFX_CHECKING_ROWS, name="card.qfx")
    rules = tmp_path / "rules.toml"
    rules.write_text('[[rule]]\nmatch = "PEETS"\naccount = "Expenses:Food"\nclient = "acme"\n')
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
    matched, fallback = (row["entry"] for row in preview["rows"])
    assert 'client: "acme"' in matched
    assert "client:" not in fallback


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


def test_ofx_mixed_case_acctid_file_is_refused(
    tmp_path: Path, ofx_engine: Callable[..., subprocess.CompletedProcess[str]]
) -> None:
    """A lowercased second `<ACCTID>` still counts as a second account.

    OFX tags are uppercase, but the soup parser lowercases them, so a
    spec-violating file's second statement would parse — and import under
    the first account — while upstream's case-sensitive scan saw only one.
    """
    ledger = _ledger(tmp_path)
    block = render_ofx([], acctid="CHK-10").split("<STMTTRNRS>")[1].split("</STMTTRNRS>")[0]
    text = render_ofx([], acctid="CHK-9").replace("</BANKMSGSRSV1>", f"<STMTTRNRS>{block}</STMTTRNRS>\n</BANKMSGSRSV1>")
    source = tmp_path / "mixed.ofx"
    source.write_text(text.replace("<ACCTID>CHK-10", "<acctid>CHK-10"))
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


def test_ofx_missing_trnamt_names_the_row(
    tmp_path: Path, ofx_engine: Callable[..., subprocess.CompletedProcess[str]]
) -> None:
    ledger = _ledger(tmp_path)
    source = _ofx(tmp_path, OFX_CHECKING_ROWS)
    source.write_text(source.read_text().replace("<TRNAMT>-42.50", "", 1))
    error = _refusal(
        ofx_engine("import", "--file", str(ledger), "--source", str(source), "--ofx", "--account", "Assets:Checking")
    )
    assert error["message"].endswith("OFX row 1 has no TRNAMT amount; cannot post it.")


def test_ofx_unparseable_dtposted_names_the_row(
    tmp_path: Path, ofx_engine: Callable[..., subprocess.CompletedProcess[str]]
) -> None:
    ledger = _ledger(tmp_path)
    source = _ofx(tmp_path, OFX_CHECKING_ROWS)
    source.write_text(source.read_text().replace("<DTPOSTED>20260805", "<DTPOSTED>not-a-date", 1))
    error = _refusal(
        ofx_engine("import", "--file", str(ledger), "--source", str(source), "--ofx", "--account", "Assets:Checking")
    )
    assert "OFX row 2 has a DTPOSTED beangulp cannot parse" in error["message"]


def test_ofx_unparseable_trnamt_names_the_value(
    tmp_path: Path, ofx_engine: Callable[..., subprocess.CompletedProcess[str]]
) -> None:
    ledger = _ledger(tmp_path)
    source = _ofx(tmp_path, OFX_CHECKING_ROWS)
    source.write_text(source.read_text().replace("<TRNAMT>1200.00", "<TRNAMT>lots", 1))
    error = _refusal(
        ofx_engine("import", "--file", str(ledger), "--source", str(source), "--ofx", "--account", "Assets:Checking")
    )
    assert error["message"].endswith("OFX row 2 has a TRNAMT beangulp cannot parse ('lots').")


def test_ofx_unknown_charset_is_refused_not_guessed(
    tmp_path: Path, ofx_engine: Callable[..., subprocess.CompletedProcess[str]]
) -> None:
    """A wrong charset guess would reword narrations and mint new hashes."""
    ledger = _ledger(tmp_path)
    source = _ofx(tmp_path, OFX_CHECKING_ROWS)
    source.write_text(source.read_text().replace("CHARSET:1252", "CHARSET:EBCDIC-X", 1))
    error = _refusal(
        ofx_engine("import", "--file", str(ledger), "--source", str(source), "--ofx", "--account", "Assets:Checking")
    )
    assert error["message"].endswith("declares OFX CHARSET 'ebcdic-x', which bea cannot decode; re-export as UTF-8.")


def test_ofx_undecodable_bytes_name_the_codec(
    tmp_path: Path, ofx_engine: Callable[..., subprocess.CompletedProcess[str]]
) -> None:
    ledger = _ledger(tmp_path)
    source = _ofx(tmp_path, OFX_CHECKING_ROWS)
    raw = source.read_bytes().replace(b"CHARSET:1252", b"CHARSET:USASCII").replace(b"CARD PURCHASE", b"CARD \xfc")
    source.write_bytes(raw)
    error = _refusal(
        ofx_engine("import", "--file", str(ledger), "--source", str(source), "--ofx", "--account", "Assets:Checking")
    )
    assert "cannot be decoded as ascii (OFX CHARSET usascii)" in error["message"]


def test_ofx_latin_byte_decodes_per_the_header_charset(
    tmp_path: Path, ofx_engine: Callable[..., subprocess.CompletedProcess[str]]
) -> None:
    """CHARSET:1252 reads 0xFC as ü; the locale never decides."""
    ledger = _ledger(tmp_path)
    source = _ofx(tmp_path, OFX_CHECKING_ROWS)
    source.write_bytes(source.read_bytes().replace(b"CARD PURCHASE", b"CARD F\xfcr"))
    preview = _answer(
        ofx_engine("import", "--file", str(ledger), "--source", str(source), "--ofx", "--account", "Assets:Checking")
    )
    assert preview["rows"][0]["narration"] == "PEETS COFFEE / CARD F\xfcr"


def test_ofx2_prolog_encoding_decodes_the_file(
    tmp_path: Path, ofx_engine: Callable[..., subprocess.CompletedProcess[str]]
) -> None:
    ledger = _ledger(tmp_path)
    source = tmp_path / "statement.ofx"
    source.write_bytes(
        b'<?xml version="1.0" encoding="WINDOWS-1252"?>\n'
        b"<OFX><BANKMSGSRSV1><STMTTRNRS><TRNUID>1</TRNUID><STATUS><CODE>0</CODE><SEVERITY>INFO</SEVERITY></STATUS>"
        b"<STMTRS><CURDEF>USD</CURDEF>"
        b"<BANKACCTFROM><BANKID>111000025</BANKID><ACCTID>P-1</ACCTID><ACCTTYPE>CHECKING</ACCTTYPE></BANKACCTFROM>"
        b"<BANKTRANLIST><DTSTART>20260801</DTSTART><DTEND>20260810</DTEND>"
        b"<STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20260803</DTPOSTED><TRNAMT>-5.00</TRNAMT>"
        b"<FITID>P1</FITID><NAME>CAF\xc9</NAME></STMTTRN>"
        b"</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>\n"
    )
    preview = _answer(
        ofx_engine("import", "--file", str(ledger), "--source", str(source), "--ofx", "--account", "Assets:Checking")
    )
    assert [row["status"] for row in preview["rows"]] == ["new"]
    assert preview["rows"][0]["narration"] == "CAF\xc9"


def test_ofx_invalid_curdef_is_refused(
    tmp_path: Path, ofx_engine: Callable[..., subprocess.CompletedProcess[str]]
) -> None:
    ledger = _ledger(tmp_path)
    source = _ofx(tmp_path, OFX_CHECKING_ROWS)
    source.write_text(source.read_text().replace("<CURDEF>USD\n", "<CURDEF>US DOLLARS\n", 1))
    error = _refusal(
        ofx_engine("import", "--file", str(ledger), "--source", str(source), "--ofx", "--account", "Assets:Checking")
    )
    assert "statement currency" in error["message"]


def test_ofx_statement_without_any_acctid_still_imports(
    tmp_path: Path, ofx_engine: Callable[..., subprocess.CompletedProcess[str]]
) -> None:
    """Only several account ids refuse; none at all just imports."""
    ledger = _ledger(tmp_path)
    source = _ofx(tmp_path, OFX_CHECKING_ROWS)
    source.write_text(source.read_text().replace("<ACCTID>CHK-9", "<ACCTIDX>CHK-9"))
    preview = _answer(
        ofx_engine("import", "--file", str(ledger), "--source", str(source), "--ofx", "--account", "Assets:Checking")
    )
    assert [row["status"] for row in preview["rows"]] == ["new", "new"]


def test_ofx_many_missing_fitids_truncate_the_note(
    tmp_path: Path, ofx_engine: Callable[..., subprocess.CompletedProcess[str]]
) -> None:
    ledger = _ledger(tmp_path)
    rows = [
        (kind, f"2026080{day}", amount, None, f"EXAMPLE MERCHANT {day}", f"MEMO {day}")
        for day, (kind, amount) in enumerate(
            [
                ("DEBIT", "-1.00"),
                ("DEBIT", "-2.00"),
                ("DEBIT", "-3.00"),
                ("DEBIT", "-4.00"),
                ("DEBIT", "-5.00"),
                ("DEBIT", "-6.00"),
            ],
            start=1,
        )
    ]
    source = _ofx(tmp_path, rows)
    preview = _answer(
        ofx_engine("import", "--file", str(ledger), "--source", str(source), "--ofx", "--account", "Assets:Checking")
    )
    assert [row["status"] for row in preview["rows"]] == ["new"] * 6
    assert preview["notes"] == [
        "6 OFX row(s) carry no FITID (row 1, row 2, row 3, row 4, row 5; …), so their import-ids are "
        "content hashes: a reworded memo re-imports them as new rows."
    ]


def test_ofx_framed_narration_hashes_stably(
    tmp_path: Path, ofx_engine: Callable[..., subprocess.CompletedProcess[str]]
) -> None:
    """A `|` in the narration takes the framed hash path, still under `ofx:`."""
    ledger = _ledger(tmp_path)
    rows = [("DEBIT", "20260803", "-42.50", None, "PEETS COFFEE", "CARD A|B")]
    source = _ofx(tmp_path, rows)
    preview = _answer(
        ofx_engine("import", "--file", str(ledger), "--source", str(source), "--ofx", "--account", "Assets:Checking")
    )
    assert preview["rows"][0]["id_source"] == "hash"
    assert 'import-id: "ofx:sha256:' in preview["rows"][0]["entry"]
    _answer(
        ofx_engine(
            "import", "--file", str(ledger), "--source", str(source), "--ofx", "--account", "Assets:Checking", "--apply"
        )
    )
    again = _answer(
        ofx_engine("import", "--file", str(ledger), "--source", str(source), "--ofx", "--account", "Assets:Checking")
    )
    assert [row["status"] for row in again["rows"]] == ["duplicate"]


def test_ofx_empty_statement_has_no_brokerage_hint(
    tmp_path: Path, ofx_engine: Callable[..., subprocess.CompletedProcess[str]]
) -> None:
    ledger = _ledger(tmp_path)
    source = _ofx(tmp_path, [])
    error = _refusal(
        ofx_engine("import", "--file", str(ledger), "--source", str(source), "--ofx", "--account", "Assets:Checking")
    )
    assert error["message"].endswith("holds no bank or credit-card transactions to import.")
    assert "Brokerage" not in error["message"]


# A UTF-8 byte-order mark before an XML prolog (w5/1032): the header scan
# decoded it as ASCII and refused a valid export as "cannot read its header".
BOM_XML = """<?xml version="1.0" encoding="UTF-8"?><OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><CURDEF>USD</CURDEF>\
<BANKACCTFROM><BANKID>000000000</BANKID><ACCTID>QA-1</ACCTID><ACCTTYPE>CHECKING</ACCTTYPE></BANKACCTFROM>\
<BANKTRANLIST><DTSTART>20260801</DTSTART><DTEND>20260810</DTEND><STMTTRN><TRNTYPE>DEBIT</TRNTYPE>\
<DTPOSTED>20260803</DTPOSTED><TRNAMT>-42.50</TRNAMT><FITID>TXN-001</FITID><NAME>Café</NAME></STMTTRN>\
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>"""


@pytest.mark.parametrize("signed", [True, False], ids=["bom", "plain"])
def test_an_xml_export_imports_with_or_without_a_bom(
    tmp_path: Path, ofx_engine: Callable[..., subprocess.CompletedProcess[str]], signed: bool
) -> None:
    ledger = _ledger(tmp_path)
    source = tmp_path / "statement.ofx"
    source.write_bytes((codecs.BOM_UTF8 if signed else b"") + BOM_XML.encode("utf-8"))
    run = ["import", "--file", str(ledger), "--source", str(source), "--ofx", "--account", "Assets:Checking"]

    preview = _answer(ofx_engine(*run))
    assert [row["status"] for row in preview["rows"]] == ["new"]
    (row,) = preview["rows"]
    assert 'fitid: "TXN-001"' in row["entry"] and "Café" in row["entry"] and "-42.50 USD" in row["entry"]
    assert _answer(ofx_engine(*run, "--apply"))["written"] == 1
    assert _answer(ofx_engine(*run, "--apply"))["written"] == 0


def test_a_bom_beside_another_declared_charset_is_refused(
    tmp_path: Path, ofx_engine: Callable[..., subprocess.CompletedProcess[str]]
) -> None:
    ledger = _ledger(tmp_path)
    source = tmp_path / "statement.ofx"
    source.write_bytes(codecs.BOM_UTF8 + BOM_XML.replace('encoding="UTF-8"', 'encoding="ISO-8859-1"').encode("utf-8"))

    refused = ofx_engine(
        "import", "--file", str(ledger), "--source", str(source), "--ofx", "--account", "Assets:Checking"
    )

    assert refused.returncode == 2, refused.stdout
    assert "byte-order mark" in json.loads(refused.stdout)["error"]["message"]


# A bank correction record (w5/1053): built as an ordinary row, a REPLACE was
# booked as another payment and a DELETE as a zero one.
CORRECTION_XML = """<?xml version="1.0" encoding="UTF-8"?><OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><CURDEF>USD</CURDEF>\
<BANKACCTFROM><BANKID>000000000</BANKID><ACCTID>QA-1</ACCTID><ACCTTYPE>CHECKING</ACCTTYPE></BANKACCTFROM>\
<BANKTRANLIST><DTSTART>20260801</DTSTART><DTEND>20260810</DTEND>{rows}</BANKTRANLIST></STMTRS></STMTTRNRS>\
</BANKMSGSRSV1></OFX>"""
ORDINARY_ROW = (
    "<STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20260802</DTPOSTED><TRNAMT>-5.00</TRNAMT><FITID>NEW-0</FITID>"
    "<NAME>Snack</NAME></STMTTRN>"
)
CORRECTION_ROW = (
    "<STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20260803</DTPOSTED><TRNAMT>-12.00</TRNAMT><FITID>NEW-1</FITID>"
    "<CORRECTFITID>OLD-1</CORRECTFITID><CORRECTACTION>{action}</CORRECTACTION><NAME>Coffee</NAME></STMTTRN>"
)


@pytest.mark.parametrize("action", ["REPLACE", "DELETE"])
@pytest.mark.parametrize("mixed", [False, True], ids=["alone", "after-ordinary-row"])
def test_ofx_correction_records_are_refused_before_any_write(
    tmp_path: Path, ofx_engine: Callable[..., subprocess.CompletedProcess[str]], action: str, mixed: bool
) -> None:
    ledger = _ledger(tmp_path)
    before = ledger.read_bytes()
    rows = (ORDINARY_ROW if mixed else "") + CORRECTION_ROW.format(action=action)
    source = tmp_path / "statement.ofx"
    source.write_text(CORRECTION_XML.format(rows=rows))
    run = ["import", "--file", str(ledger), "--source", str(source), "--ofx", "--account", "Assets:Checking"]

    for flags in ([], ["--apply"]):
        refused = ofx_engine(*run, *flags)
        assert refused.returncode == 2, refused.stdout
        message = json.loads(refused.stdout)["error"]["message"]
        assert f"{action} of FITID OLD-1" in message and "NEW-1" in message
    assert ledger.read_bytes() == before


# A row-level CURRENCY override (w5/1061): the amount is in CURSYM at CURRATE,
# which the upstream builder ignored, booking 10 EUR as 10 USD.
FOREIGN_ROW = (
    "<STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20260803</DTPOSTED><TRNAMT>-10.00</TRNAMT><FITID>FX-001</FITID>"
    "<NAME>Cafe</NAME><{tag}><CURRATE>1.20</CURRATE><CURSYM>EUR</CURSYM></{tag}></STMTTRN>"
)


@pytest.mark.parametrize("mixed", [False, True], ids=["alone", "after-ordinary-row"])
def test_ofx_an_unconverted_currency_override_is_refused(
    tmp_path: Path, ofx_engine: Callable[..., subprocess.CompletedProcess[str]], mixed: bool
) -> None:
    ledger = _ledger(tmp_path)
    before = ledger.read_bytes()
    source = tmp_path / "statement.ofx"
    rows = (ORDINARY_ROW if mixed else "") + FOREIGN_ROW.format(tag="CURRENCY")
    source.write_text(CORRECTION_XML.format(rows=rows))
    run = ["import", "--file", str(ledger), "--source", str(source), "--ofx", "--account", "Assets:Checking"]

    for flags in ([], ["--apply"]):
        refused = ofx_engine(*run, *flags)
        assert refused.returncode == 2, refused.stdout
        message = json.loads(refused.stdout)["error"]["message"]
        assert "FX-001" in message and "EUR" in message and "1.20" in message
    assert ledger.read_bytes() == before


def test_ofx_an_already_converted_origcurrency_row_imports(
    tmp_path: Path, ofx_engine: Callable[..., subprocess.CompletedProcess[str]]
) -> None:
    ledger = _ledger(tmp_path)
    source = tmp_path / "statement.ofx"
    source.write_text(CORRECTION_XML.format(rows=FOREIGN_ROW.format(tag="ORIGCURRENCY").replace("-10.00", "-12.00")))

    applied = _answer(
        ofx_engine(
            "import", "--file", str(ledger), "--source", str(source), "--ofx", "--account", "Assets:Checking", "--apply"
        )
    )

    assert applied["written"] == 1
    assert "-12.00 USD" in ledger.read_text()
