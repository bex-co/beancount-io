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
