"""`bea format -` names stdin when the piped bytes are not UTF-8 (w1/166)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
BAD = b"2026-01-01 open Assets:A USD\n; caf\xff\n"


def _bea(tmp_path: Path, stdin: bytes, *args: str) -> subprocess.CompletedProcess[bytes]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=tmp_path,
        input=stdin,
        capture_output=True,
        timeout=60,
    )


@pytest.mark.parametrize("args", [("format", "-"), ("format", "-", "--output", "o.bean")], ids=["stdout", "output"])
def test_undecodable_stdin_is_named_with_its_remedy(tmp_path: Path, args: tuple[str, ...]) -> None:
    result = _bea(tmp_path, BAD, *args)
    stderr = result.stderr.decode()
    assert result.returncode == 1, stderr
    assert "Cannot decode 'stdin' as UTF-8" in stderr
    assert "at byte 34" in stderr
    assert "encode" not in stderr.replace("decode", "")
    assert not (tmp_path / "o.bean").exists()


def test_json_gets_one_envelope_without_codec_text(tmp_path: Path) -> None:
    result = _bea(tmp_path, BAD, "--json", "format", "-", "--output", "o.bean")
    assert result.returncode == 1
    assert result.stdout == b""
    error = json.loads(result.stderr)["error"]
    assert error["category"] == "validation"
    assert error["message"].startswith("Cannot decode 'stdin' as UTF-8")
    assert "surrogates" not in error["message"]
    assert not (tmp_path / "o.bean").exists()


def test_utf8_stdin_still_formats(tmp_path: Path) -> None:
    result = _bea(tmp_path, "2026-01-01 open Assets:A USD\n; café\n".encode(), "format", "-")
    assert result.returncode == 0, result.stderr.decode()
    assert result.stdout.decode() == "2026-01-01 open Assets:A USD\n; café\n"
