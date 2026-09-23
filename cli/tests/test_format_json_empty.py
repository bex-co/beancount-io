"""--json format -i on an empty tree must emit an envelope (w3/249)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

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


def test_json_in_place_empty_dir_emits_envelope(tmp_path: Path) -> None:
    empty = tmp_path / "emptydir"
    empty.mkdir()
    result = _bea(tmp_path, "--json", "format", "-i", str(empty))
    assert result.returncode == 2, result.stderr
    assert result.stdout == ""
    error = json.loads(result.stderr)["error"]
    assert error["category"] == "usage"
    assert error["result"]["scanned"] == 0
    assert error["result"]["formatted"] == []
    assert error["result"]["in_place"] is True


def test_human_in_place_empty_dir_exits_nonzero(tmp_path: Path) -> None:
    empty = tmp_path / "emptydir"
    empty.mkdir()
    result = _bea(tmp_path, "format", "-i", str(empty))
    assert result.returncode == 2, result.stderr
    assert "No .bean or .beancount files found to rewrite." in result.stderr


# An explicit --output with nothing to format is refused, not reported as a
# write that never happened (w4/167).


def test_json_output_from_an_empty_dir_is_refused_and_creates_nothing(tmp_path: Path) -> None:
    empty = tmp_path / "emptydir"
    empty.mkdir()
    destination = tmp_path / "out.bean"
    result = _bea(tmp_path, "--json", "format", str(empty), "--output", str(destination))
    assert result.returncode == 2, result.stdout
    assert result.stdout == ""
    error = json.loads(result.stderr)["error"]
    assert error["category"] == "usage"
    assert error["result"]["scanned"] == 0
    assert "nothing was written" in error["message"]
    assert not destination.exists()


def test_an_existing_destination_is_left_untouched_in_both_modes(tmp_path: Path) -> None:
    empty = tmp_path / "emptydir"
    empty.mkdir()
    destination = tmp_path / "out.bean"
    destination.write_text("SENTINEL\n")
    for mode in (("--json",), ()):
        result = _bea(tmp_path, *mode, "format", str(empty), "-o", str(destination))
        assert result.returncode == 2, result.stdout
        assert "nothing was written" in result.stderr
        assert destination.read_text() == "SENTINEL\n"


def test_output_still_writes_from_one_file_and_from_empty_stdin(tmp_path: Path) -> None:
    ledgers = tmp_path / "ledgers"
    ledgers.mkdir()
    (ledgers / "main.bean").write_text("2024-01-01 open Assets:Cash USD\n")
    one = tmp_path / "one.bean"
    written = _bea(tmp_path, "--json", "format", str(ledgers), "--output", str(one))
    assert written.returncode == 0, written.stderr
    assert json.loads(written.stdout)["data"]["scanned"] == 1
    assert "Assets:Cash" in one.read_text()

    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(BEA_CONFIG_DIR=str(tmp_path / "config"), BEA_NO_UPDATE_NOTIFIER="1", PYTHONPATH=str(ROOT / "src"))
    piped = tmp_path / "piped.bean"
    stdin = subprocess.run(
        [sys.executable, "-m", "cli.main", "format", "-", "--output", str(piped)],
        env=env,
        cwd=tmp_path,
        input="",
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert stdin.returncode == 0, stdin.stderr
    assert piped.exists()
