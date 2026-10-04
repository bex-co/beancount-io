"""Import discovery must name UTF-8 failures, not pretend columns are empty (w3/227)."""

from __future__ import annotations

import os
import re
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]


def _env(tmp_path: Path) -> dict[str, str]:
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
    return env


@pytest.fixture
def books(tmp_path: Path) -> Path:
    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "cli.main",
            "--no-input",
            "init",
            str(tmp_path / "books"),
            "--currency",
            "USD",
            "--date",
            "2024-01-01",
        ],
        env=_env(tmp_path),
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=60,
    )
    assert result.returncode == 0, result.stderr
    return tmp_path / "books" / "main.bean"


def test_latin1_csv_auto_names_utf8_failure(books: Path, tmp_path: Path) -> None:
    export = tmp_path / "latin1.csv"
    export.write_bytes(b"Date,Description,Amount\n2024-03-10,Caf\xe9,-4.50\n")
    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "cli.main",
            "--no-input",
            "--file",
            str(books),
            "import",
            str(export),
            "--csv",
            "auto",
            "--account",
            "Assets:Checking",
        ],
        env=_env(tmp_path),
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=60,
    )
    assert result.returncode == 2, result.stdout
    assert "not valid UTF-8" in result.stderr
    assert "(none)" not in result.stderr
    assert "Name them with --csv" not in result.stderr


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "cli.main", "--no-input", *args],
        env=_env(tmp_path),
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=60,
    )


CP1252_BODY = b"Date,Description,Amount\n2024-03-10,Caf\xe9,-4.50\n"
FULL_MAPPING = "date=Date,amount=Amount,narration=Description"


@pytest.mark.parametrize("key", ["encoding=cp1252", "encoding=CP1252", "encoding=windows-1252"])
def test_cp1252_preview_with_encoding_key(books: Path, tmp_path: Path, key: str) -> None:
    """`--csv encoding=` decodes Windows exports (m24/t002)."""
    export = tmp_path / "latin1.csv"
    export.write_bytes(CP1252_BODY)
    result = _bea(
        tmp_path,
        "--file",
        str(books),
        "import",
        str(export),
        "--csv",
        f"{FULL_MAPPING},{key}",
        "--account",
        "Assets:Checking",
    )
    assert result.returncode == 0, result.stderr + result.stdout
    assert "1 ready" in result.stdout


def test_cp1252_apply_writes_correct_payees(books: Path, tmp_path: Path) -> None:
    export = tmp_path / "latin1.csv"
    export.write_bytes(CP1252_BODY)
    result = _bea(
        tmp_path,
        "--file",
        str(books),
        "import",
        str(export),
        "--csv",
        f"{FULL_MAPPING},encoding=cp1252",
        "--account",
        "Assets:Checking",
        "--apply",
        "--duplicates",
        "include",
    )
    assert result.returncode == 0, result.stderr + result.stdout
    ledger = books.read_text(encoding="utf-8")
    assert "Caf\xe9" in ledger
    assert "Caf\xc3\xa9" not in ledger


def test_bom_import_unchanged(books: Path, tmp_path: Path) -> None:
    export = tmp_path / "bom.csv"
    export.write_bytes(b"\xef\xbb\xbfDate,Description,Amount\n2024-03-10,Cafe,-4.50\n")
    result = _bea(
        tmp_path,
        "--file",
        str(books),
        "import",
        str(export),
        "--csv",
        "auto",
        "--account",
        "Assets:Checking",
    )
    assert result.returncode == 0, result.stderr + result.stdout
    assert "1 ready" in result.stdout


def test_cp1252_auto_suggests_override(books: Path, tmp_path: Path) -> None:
    """Auto still refuses (w3/227) but names the working decoding (m24/t002)."""
    export = tmp_path / "latin1.csv"
    export.write_bytes(CP1252_BODY)
    result = _bea(
        tmp_path,
        "--file",
        str(books),
        "import",
        str(export),
        "--csv",
        "auto",
        "--account",
        "Assets:Checking",
    )
    assert result.returncode == 2, result.stdout
    assert "not valid UTF-8" in result.stderr
    assert "encoding=cp1252" in result.stderr


def test_undecodable_names_offset_and_tried(books: Path, tmp_path: Path) -> None:
    export = tmp_path / "binary.csv"
    export.write_bytes(b"Date,Description,Amount\n2024-03-10,Caf\x81,-4.50\n")
    result = _bea(
        tmp_path,
        "--file",
        str(books),
        "import",
        str(export),
        "--csv",
        "auto",
        "--account",
        "Assets:Checking",
    )
    assert result.returncode == 2, result.stdout
    assert "tried utf-8, cp1252, latin-1" in result.stderr
    assert re.search(r"byte \d+", result.stderr)
    assert "(none)" not in result.stderr


def test_explicit_cp1252_failure_names_codec(books: Path, tmp_path: Path) -> None:
    export = tmp_path / "binary.csv"
    export.write_bytes(b"Date,Description,Amount\n2024-03-10,Caf\x81,-4.50\n")
    result = _bea(
        tmp_path,
        "--file",
        str(books),
        "import",
        str(export),
        "--csv",
        f"{FULL_MAPPING},encoding=cp1252",
        "--account",
        "Assets:Checking",
    )
    assert result.returncode == 2, result.stdout
    assert "not valid cp1252" in result.stderr


def test_encoding_key_alone_infers_mapping(books: Path, tmp_path: Path) -> None:
    export = tmp_path / "latin1.csv"
    export.write_bytes(CP1252_BODY)
    result = _bea(
        tmp_path,
        "--file",
        str(books),
        "import",
        str(export),
        "--csv",
        "encoding=cp1252",
        "--account",
        "Assets:Checking",
    )
    assert result.returncode == 0, result.stderr + result.stdout
    assert "1 ready" in result.stdout
    assert "encoding=cp1252" in result.stderr


def test_delimiter_key_alone_infers_mapping(books: Path, tmp_path: Path) -> None:
    export = tmp_path / "semi.csv"
    export.write_text("Date;Description;Amount\n2024-03-10;Cafe;-4.50\n")
    result = _bea(
        tmp_path,
        "--file",
        str(books),
        "import",
        str(export),
        "--csv",
        "delimiter=';'",
        "--account",
        "Assets:Checking",
    )
    assert result.returncode == 0, result.stderr + result.stdout
    assert "1 ready" in result.stdout


def test_encoding_recalls(books: Path, tmp_path: Path) -> None:
    export = tmp_path / "latin1.csv"
    export.write_bytes(CP1252_BODY)
    first = _bea(
        tmp_path,
        "--file",
        str(books),
        "import",
        str(export),
        "--csv",
        f"{FULL_MAPPING},encoding=cp1252",
        "--account",
        "Assets:Checking",
    )
    assert first.returncode == 0, first.stderr + first.stdout
    second = _bea(tmp_path, "--file", str(books), "import", str(export), "--account", "Assets:Checking")
    assert second.returncode == 0, second.stderr + second.stdout
    assert "remembered" in second.stderr
    assert "1 ready" in second.stdout


def test_explicit_utf8_refuses_with_suggestion(books: Path, tmp_path: Path) -> None:
    export = tmp_path / "latin1.csv"
    export.write_bytes(CP1252_BODY)
    result = _bea(
        tmp_path,
        "--file",
        str(books),
        "import",
        str(export),
        "--csv",
        f"{FULL_MAPPING},encoding=utf-8",
        "--account",
        "Assets:Checking",
    )
    assert result.returncode == 2, result.stdout
    assert "not valid UTF-8" in result.stderr
    assert "encoding=cp1252" in result.stderr


UTF16_TEXT = "Date,Description,Amount\n2024-03-10,Coffee,-4.50\n"


@pytest.mark.parametrize("codec", ["utf-16", "utf-16-le", "utf-16-be"])
@pytest.mark.parametrize("csv_arg", ["auto", f"{FULL_MAPPING}", f"{FULL_MAPPING},encoding=cp1252"])
def test_utf16_export_names_utf16_never_cp1252(books: Path, tmp_path: Path, codec: str, csv_arg: str) -> None:
    """Excel "Unicode Text" is UTF-16: say so, and never suggest cp1252 (w1/065)."""
    export = tmp_path / "unicode.csv"
    export.write_bytes(UTF16_TEXT.encode(codec))
    before = books.read_bytes()
    result = _bea(
        tmp_path, "--file", str(books), "import", str(export), "--csv", csv_arg, "--account", "Assets:Checking"
    )
    assert result.returncode == 2, result.stdout
    assert "is UTF-16 text" in result.stderr and "re-save it as UTF-8" in result.stderr
    assert "cp1252" not in result.stderr
    assert books.read_bytes() == before


def test_nul_bytes_without_utf16_shape_are_called_binary(books: Path, tmp_path: Path) -> None:
    export = tmp_path / "sheet.csv"
    export.write_bytes(b"PK\x03\x04\x14\x00\x06\x00\x08\x00\x00\x00!\x00binary spreadsheet body")
    result = _bea(
        tmp_path, "--file", str(books), "import", str(export), "--csv", FULL_MAPPING, "--account", "Assets:Checking"
    )
    assert result.returncode == 2, result.stdout
    assert "NUL bytes" in result.stderr and "cp1252" not in result.stderr


def test_bom_prefixed_rules_file_loads(books: Path, tmp_path: Path) -> None:
    export = tmp_path / "bank.csv"
    export.write_bytes(b"Date,Description,Amount\n2024-03-10,Coffee,-4.50\n")
    rules = tmp_path / "rules.toml"
    rules.write_bytes(b'\xef\xbb\xbf[[rule]]\nmatch = "coffee"\naccount = "Expenses:Food"\n')
    result = _bea(
        tmp_path,
        "--json",
        "--file",
        str(books),
        "import",
        str(export),
        "--csv",
        FULL_MAPPING,
        "--account",
        "Assets:Checking",
        "--rules",
        str(rules),
    )
    assert result.returncode == 0, result.stderr + result.stdout
    assert '"rule": "coffee"' in result.stdout


def test_engine_reads_bom_prefixed_rules(tmp_path: Path) -> None:
    from bea_engine.csv_mapper import load_rules

    rules = tmp_path / "rules.toml"
    rules.write_bytes(b'\xef\xbb\xbf[[rule]]\nmatch = "coffee"\naccount = "Expenses:Food"\n')
    assert [rule.pattern for rule in load_rules(rules)] == ["coffee"]


def test_engine_refuses_utf16_before_decoding(tmp_path: Path) -> None:
    from bea_engine.csv_mapper import read_header
    from bea_engine.protocol import UsageError as EngineUsageError

    export = tmp_path / "unicode.csv"
    export.write_bytes(UTF16_TEXT.encode("utf-16"))
    with pytest.raises(EngineUsageError, match="is UTF-16 text"):
        read_header(export, encoding="cp1252")
