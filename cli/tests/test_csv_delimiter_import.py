"""CSV import accepts semicolon and tab delimiters (w3/226)."""

from __future__ import annotations

import os
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
