"""Unreadable `add transactions --from -` input is a usage error (w1/112).

Stdin was read through the locale's text codec and only JSONDecodeError was
mapped, so undecodable bytes, deep nesting and huge integers surfaced raw
Python errors under a `validation` envelope (exit 1).
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
LEDGER = "2026-01-01 open Expenses:Food USD\n2026-01-01 open Assets:Cash USD\n"
ROW = (
    '{"date":"2026-02-01","narration":"x","postings":'
    '[{"account":"Expenses:Food","amount":"10 USD"},{"account":"Assets:Cash"}]}'
)


def _bea(tmp_path: Path, stdin: bytes, *args: str, lang: str = "C.UTF-8") -> subprocess.CompletedProcess[bytes]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        XDG_DATA_HOME=str(tmp_path / "data"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
        LANG=lang,
        LC_ALL=lang,
    )
    env.pop("PYTHONIOENCODING", None)
    env.pop("PYTHONUTF8", None)
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=tmp_path,
        input=stdin,
        capture_output=True,
        timeout=60,
    )


CASES = {
    "latin-1": (f'[{ROW[:-1]},"payee":"caf\xe9"}}]'.encode("latin-1"), "Cannot decode 'stdin' as UTF-8"),
    "deep": (b"[" * 100000 + b"]" * 100000, "nests JSON too deeply"),
    "huge-integer": (b"[" + b"9" * 5000 + b"]", "too many digits"),
    "utf-16": (f"[{ROW}]".encode("utf-16"), "looks like UTF-16"),
    "utf-16-le": (f"[{ROW}]".encode("utf-16-le"), "looks like UTF-16"),
    "duplicate-key": (
        f"[{ROW.replace('"amount":"10 USD"', '"amount":"10 USD","amount":"99 USD"')}]".encode(),
        "key 'amount' appears more than once",
    ),
}


@pytest.mark.parametrize("lang", ["C.UTF-8", "C"])
@pytest.mark.parametrize(("data", "message"), CASES.values(), ids=CASES.keys())
def test_bad_stdin_is_a_usage_error(tmp_path: Path, data: bytes, message: str, lang: str) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)

    result = _bea(tmp_path, data, "--json", "--file", str(ledger), "add", "transactions", "--from", "-", lang=lang)

    assert result.returncode == 2, result.stderr
    error = json.loads(result.stderr)["error"]
    assert error["category"] == "usage"
    assert message in error["message"]
    assert "recursion" not in error["message"] and "set_int_max_str_digits" not in error["message"]
    assert ledger.read_text() == LEDGER


def test_a_file_gets_the_same_checks(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    rows = tmp_path / "rows.json"
    rows.write_bytes(f"[{ROW}]".encode("utf-16"))

    result = _bea(tmp_path, b"", "--json", "--file", str(ledger), "add", "transactions", "--from", str(rows))

    assert result.returncode == 2, result.stderr
    assert "looks like UTF-16" in json.loads(result.stderr)["error"]["message"]


@pytest.mark.parametrize("bom", [b"", b"\xef\xbb\xbf"], ids=["plain", "bom"])
def test_utf8_stdin_still_writes(tmp_path: Path, bom: bytes) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER)
    row = ROW.replace('"narration":"x"', '"narration":"café"')

    result = _bea(tmp_path, bom + f"[{row}]".encode(), "--file", str(ledger), "add", "transactions", "--from", "-")

    assert result.returncode == 0, result.stderr
    assert '"café"' in ledger.read_text(encoding="utf-8")
