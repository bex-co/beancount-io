"""CSV import accepts semicolon and tab delimiters (w3/226)."""

from __future__ import annotations

import os
import subprocess
import sys
from importlib import import_module
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
    ledger = tmp_path / "books" / "main.bean"
    with ledger.open("a") as handle:
        handle.write("2024-01-01 open Assets:Bank:Checking USD\n")
    return ledger


def _bea(tmp_path: Path, ledger: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "cli.main", "--no-input", "--file", str(ledger), *args],
        env=_env(tmp_path),
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=60,
    )


@pytest.mark.parametrize(
    ("body", "extra"),
    [
        ("Date;Description;Amount\n2024-03-10;Cafe;-4.50\n", ["--csv", "auto"]),
        ("Date\tDescription\tAmount\n2024-03-10\tCafe\t-4.50\n", ["--csv", "auto"]),
        ("Date;Description;Amount\n2024-03-10;Cafe;-4.50\n", ["--csv", "auto", "--delimiter", ";"]),
        (
            "Date;Description;Amount\n2024-03-10;Cafe;-4.50\n",
            ["--csv", "date=Date,amount=Amount,narration=Description"],
        ),
    ],
)
def test_import_reads_semicolon_and_tab_csv(books: Path, tmp_path: Path, body: str, extra: list[str]) -> None:
    export = tmp_path / "export.csv"
    export.write_text(body)
    result = _bea(tmp_path, books, "import", str(export), *extra, "--account", "Assets:Bank:Checking")
    assert result.returncode == 0, result.stderr + result.stdout
    assert "1 ready" in result.stdout
    assert "Cafe" in result.stdout
    assert "lacks" not in result.stderr


def test_forced_comma_on_semicolon_names_delimiter(books: Path, tmp_path: Path) -> None:
    export = tmp_path / "semi.csv"
    export.write_text("Date;Description;Amount\n2024-03-10;Cafe;-4.50\n")
    result = _bea(
        tmp_path,
        books,
        "import",
        str(export),
        "--csv",
        "auto",
        "--delimiter",
        ",",
        "--account",
        "Assets:Bank:Checking",
    )
    assert result.returncode == 2, result.stdout
    assert "--delimiter" in result.stderr
    assert "one column" in result.stderr or "Date;Description;Amount" in result.stderr


@pytest.mark.parametrize(
    ("body", "key"),
    [
        ("Date;Description;Amount\n2024-03-10;Cafe;-4.50\n", "delimiter=';'"),
        ("Date|Description|Amount\n2024-03-10|Cafe|-4.50\n", "delimiter='|'"),
        ("Date\tDescription\tAmount\n2024-03-10\tCafe\t-4.50\n", "delimiter=tab"),
    ],
)
def test_csv_delimiter_key_forces_delimiter(books: Path, tmp_path: Path, body: str, key: str) -> None:
    """`--csv delimiter=` overrides detection, including pipe (m24/t001)."""
    export = tmp_path / "export.csv"
    export.write_text(body)
    result = _bea(
        tmp_path,
        books,
        "import",
        str(export),
        "--csv",
        f"date=Date,amount=Amount,narration=Description,{key}",
        "--account",
        "Assets:Bank:Checking",
    )
    assert result.returncode == 0, result.stderr + result.stdout
    assert "1 ready" in result.stdout


def test_pipe_csv_imports_with_auto_detection(books: Path, tmp_path: Path) -> None:
    export = tmp_path / "export.csv"
    export.write_text("Date|Description|Amount\n2024-03-10|Cafe|-4.50\n")
    result = _bea(tmp_path, books, "import", str(export), "--csv", "auto", "--account", "Assets:Bank:Checking")
    assert result.returncode == 0, result.stderr + result.stdout
    assert "1 ready" in result.stdout


@pytest.mark.parametrize("flag", ["|", "pipe"])
def test_delimiter_flag_accepts_pipe(books: Path, tmp_path: Path, flag: str) -> None:
    export = tmp_path / "export.csv"
    export.write_text("Date|Description|Amount\n2024-03-10|Cafe|-4.50\n")
    result = _bea(
        tmp_path,
        books,
        "import",
        str(export),
        "--csv",
        "auto",
        "--delimiter",
        flag,
        "--account",
        "Assets:Bank:Checking",
    )
    assert result.returncode == 0, result.stderr + result.stdout
    assert "1 ready" in result.stdout


def test_delimiter_flag_and_key_must_agree(books: Path, tmp_path: Path) -> None:
    export = tmp_path / "export.csv"
    export.write_text("Date;Description;Amount\n2024-03-10;Cafe;-4.50\n")
    result = _bea(
        tmp_path,
        books,
        "import",
        str(export),
        "--csv",
        "date=Date,amount=Amount,narration=Description,delimiter=';'",
        "--delimiter",
        ",",
        "--account",
        "Assets:Bank:Checking",
    )
    assert result.returncode == 2, result.stdout
    assert "--delimiter" in result.stderr
    assert "delimiter=" in result.stderr


def test_preview_names_non_comma_delimiter(books: Path, tmp_path: Path) -> None:
    export = tmp_path / "export.csv"
    export.write_text("Date;Description;Amount\n2024-03-10;Cafe;-4.50\n")
    result = _bea(tmp_path, books, "import", str(export), "--csv", "auto", "--account", "Assets:Bank:Checking")
    assert result.returncode == 0, result.stderr + result.stdout
    assert "delimiter=';'" in result.stderr


def test_preview_leaves_comma_unsaid(books: Path, tmp_path: Path) -> None:
    export = tmp_path / "export.csv"
    export.write_text("Date,Description,Amount\n2024-03-10,Cafe,-4.50\n")
    result = _bea(tmp_path, books, "import", str(export), "--csv", "auto", "--account", "Assets:Bank:Checking")
    assert result.returncode == 0, result.stderr + result.stdout
    assert "delimiter" not in result.stderr


def test_header_failure_names_delimiter_in_use(books: Path, tmp_path: Path) -> None:
    export = tmp_path / "export.csv"
    export.write_text("Date|Description|Amount\n2024-03-10|Cafe|-4.50\n")
    result = _bea(
        tmp_path,
        books,
        "import",
        str(export),
        "--csv",
        "auto",
        "--delimiter",
        ",",
        "--account",
        "Assets:Bank:Checking",
    )
    assert result.returncode == 2, result.stdout
    assert "','" in result.stderr
    assert "--csv delimiter=" in result.stderr or "--delimiter" in result.stderr


@pytest.mark.parametrize("module", ["cli.csv_mapper", "bea_engine.csv_mapper"])
def test_sniffer_prefers_consistent_column_count(tmp_path: Path, module: str) -> None:
    """A header tied on field count resolves by body consistency (m24/t001)."""
    detect = import_module(module).detect_delimiter
    tied = tmp_path / "tied.csv"
    tied.write_text("AB,CD;EF\n12;34\n56;78\n")
    assert detect(tied) == ";"
    comma = tmp_path / "comma.csv"
    comma.write_text("A,B,C\n1,2,3\n4,5,6\n")
    assert detect(comma) == ","
