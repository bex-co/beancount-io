"""format -i must name the path on non-UTF-8 decode failure (w3/251)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
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
        capture_output=True,
        text=True,
        timeout=30,
    )


def test_in_place_names_binary_bean_path(tmp_path: Path) -> None:
    tree = tmp_path / "fmtdir"
    tree.mkdir()
    (tree / "good.bean").write_text(
        '2024-01-01 open Assets:X USD\n2024-01-02 * "ok"\n  Assets:X 1 USD\n  Equity:Y -1 USD\n'
    )
    bad = tree / "bin.bean"
    bad.write_bytes(b"2024-01-01 open Assets:X USD\n\x00\xff\xfe")
    result = _bea(tmp_path, "--json", "format", "-i", str(tree))
    assert result.returncode != 0
    error = json.loads(result.stderr)["error"]
    assert "bin.bean" in error["message"]
    assert "UTF-8" in error["message"] or "utf-8" in error["message"].casefold()


# Stdout and --output formatting decode through the CLI first, so a stray byte
# is a structured error naming the file, not upstream's traceback (w4/168).
BAD = b"2024-01-01 open Assets:Cash USD\n\xff\n"


def test_json_export_of_a_non_utf8_file_is_one_json_error(tmp_path: Path) -> None:
    bad = tmp_path / "bad.bean"
    bad.write_bytes(BAD)
    out = tmp_path / "out.bean"
    out.write_text("SENTINEL\n")
    result = _bea(tmp_path, "--json", "format", str(bad), "--output", str(out))
    assert result.returncode != 0
    assert result.stdout == ""
    assert "Traceback" not in result.stderr
    message = json.loads(result.stderr)["error"]["message"]
    assert str(bad) in message
    assert "byte 32" in message
    assert "Re-save the file as UTF-8" in message
    assert bad.read_bytes() == BAD
    assert out.read_text() == "SENTINEL\n"


@pytest.mark.parametrize("to_file", [True, False], ids=["output", "stdout"])
def test_human_format_of_a_non_utf8_file_names_it_without_a_traceback(tmp_path: Path, to_file: bool) -> None:
    bad = tmp_path / "bad.bean"
    bad.write_bytes(BAD)
    out = tmp_path / "out.bean"
    result = _bea(tmp_path, "format", str(bad), *(["-o", str(out)] if to_file else []))
    assert result.returncode != 0
    assert result.stdout == ""
    assert "Traceback" not in result.stderr
    assert "Cannot decode" in result.stderr and "bad.bean" in result.stderr
    assert not out.exists()


def test_decodable_but_unparseable_text_still_formats_to_output(tmp_path: Path) -> None:
    ledger = tmp_path / "odd.bean"
    ledger.write_text("this is not beancount\n2024-01-01 open Assets:Cash USD\n")
    out = tmp_path / "out.bean"
    result = _bea(tmp_path, "--json", "format", str(ledger), "--output", str(out))
    assert result.returncode == 0, result.stderr
    assert "Assets:Cash" in out.read_text()
