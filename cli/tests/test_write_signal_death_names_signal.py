"""A write whose engine dies on a signal names the signal, like a read does (w5/252).

w5/010 made the helper path name the signal instead of printing a raw
`exit -11`, but the write branch raised its "outcome is unknown" conflict
before reaching that code. The exit code (4) and the untouched ledger were
already right; only the message was not.

The real-command case rests on upstream segfaulting on a computed zero divisor
already in the ledger file: the input guard refuses one in the request
(w1/274), but a write still parses the existing ledger. The stub cases pin the
behaviour for any signal death and do not depend on that crash.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

from cli.engine import launch
from cli.errors import BeaError

ROOT = Path(__file__).resolve().parents[1]

LEDGER = """option "operating_currency" "EUR"
2026-01-01 open Assets:Cash EUR
2026-01-01 open Expenses:X EUR
2026-01-05 * "dz"
  Expenses:X 100/(2-2) EUR
  Assets:Cash
"""

pytestmark = pytest.mark.skipif(sys.platform == "win32", reason="POSIX signal semantics")


def _add(tmp_path: Path, *leading: str) -> subprocess.CompletedProcess[str]:
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
        [
            sys.executable,
            "-m",
            "cli.main",
            *leading,
            "--file",
            "main.bean",
            "add",
            "transaction",
            "dz",
            "--date",
            "2026-02-01",
            "-p",
            "Expenses:X 5 EUR",
            "-p",
            "Assets:Cash",
        ],
        env=env,
        cwd=tmp_path,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=60,
    )


def test_add_names_the_signal_and_keeps_the_unknown_outcome(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER, encoding="utf-8")
    before = ledger.read_bytes()

    result = _add(tmp_path)

    assert result.returncode == 4, result.stderr
    assert result.stdout == ""
    assert "killed by SIGSEGV" in result.stderr
    assert "exit -11" not in result.stderr
    assert "the outcome is unknown" in result.stderr
    assert "zero divisor" in result.stderr
    assert ledger.read_bytes() == before


def test_json_add_carries_the_signal_and_the_hint(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER, encoding="utf-8")
    before = ledger.read_bytes()

    result = _add(tmp_path, "--json")

    assert result.returncode == 4, result.stderr
    assert result.stdout == ""
    error = json.loads(result.stderr)["error"]
    assert error["category"] == "conflict"
    assert error["exit_code"] == 4
    assert "SIGSEGV" in error["message"]
    assert "exit -11" not in error["message"]
    assert "outcome is unknown" in error["message"]
    assert any("zero divisor" in detail for detail in error["details"])
    assert ledger.read_bytes() == before


def _dying_helper(monkeypatch: pytest.MonkeyPatch, body: str) -> None:
    monkeypatch.setattr(launch, "helper_command", lambda: ([sys.executable, "-c", body], None))


def test_a_writer_killed_from_outside_is_named_with_the_outside_hint(monkeypatch: pytest.MonkeyPatch) -> None:
    """An out-of-memory kill is not a parser crash, so it must not suggest hunting for `/0`."""
    _dying_helper(monkeypatch, "import os, signal; os.kill(os.getpid(), signal.SIGKILL)")

    with pytest.raises(BeaError) as raised:
        launch.helper_json(["add", "--file", "main.bean"], writes=True)

    assert raised.value.exit_code == 4
    assert raised.value.category == "conflict"
    assert "killed by SIGKILL" in str(raised.value)
    assert "exit -9" not in str(raised.value)
    assert "outcome is unknown" in str(raised.value)
    assert any("out-of-memory" in detail for detail in raised.value.details)
    assert not any("/0" in detail for detail in raised.value.details)


def test_a_writer_that_exits_without_a_signal_keeps_its_exit_code(monkeypatch: pytest.MonkeyPatch) -> None:
    """Control: an ordinary nonzero exit is not a signal and still reports its code."""
    _dying_helper(monkeypatch, "import sys; print('boom', file=sys.stderr); sys.exit(9)")

    with pytest.raises(BeaError) as raised:
        launch.helper_json(["add", "--file", "main.bean"], writes=True)

    assert raised.value.exit_code == 4
    assert "(exit 9)" in str(raised.value)
    assert "killed by" not in str(raised.value)
    assert raised.value.details == ["boom"]


def test_a_reader_killed_by_a_signal_still_exits_as_a_plain_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    """Control: the read path keeps its own wording and exit code."""
    _dying_helper(monkeypatch, "import os, signal; os.kill(os.getpid(), signal.SIGKILL)")

    with pytest.raises(BeaError) as raised:
        launch.helper_json(["list", "--file", "main.bean"])

    assert raised.value.exit_code == 1
    assert "killed by SIGKILL" in str(raised.value)
    assert "produced no result" in str(raised.value)
    assert "outcome is unknown" not in str(raised.value)
