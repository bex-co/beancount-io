"""Regressions from installed 0.2.0 QA: exports, discoverable help and shell output."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Checking USD
2026-01-01 open Income:Salary USD
2026-01-01 * "QA" "Salary"
  Assets:Checking  100.00 USD
  Income:Salary
"""


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    file = tmp_path / "main.bean"
    file.write_text(LEDGER)
    return file


def environment(tmp_path: Path) -> dict[str, str]:
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


def bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=environment(tmp_path),
        cwd=tmp_path,
        input="",
        capture_output=True,
        text=True,
        timeout=30,
    )


def test_json_export_replaces_stale_file_and_numberifies(ledger: Path) -> None:
    destination = ledger.parent / "result.json"
    destination.write_text("STALE RESULT")
    query = "SELECT account, sum(position) GROUP BY account"
    result = bea(ledger.parent, "--json", "--file", str(ledger), "query", query, "--numberify", "-o", str(destination))
    assert result.returncode == 0, result.stderr
    assert result.stdout == ""
    data = json.loads(destination.read_text())
    assert data["target"]["file"] == str(ledger)
    assert data["data"]["columns"][1]["type"] == "Decimal"
    assert data["data"]["rows"] == [["Assets:Checking", "100.00"], ["Income:Salary", "-100.00"]]
    assert not list(ledger.parent.glob(".bea-*.tmp"))


@pytest.mark.parametrize("failure", ["query", "ledger", "readonly", "missing-parent", "directory"])
def test_failed_json_export_preserves_existing_file(ledger: Path, failure: str) -> None:
    destination = ledger.parent / "result.json"
    destination.write_text("KEEP")
    query = "SELECT 1"
    if failure == "query":
        query = "SELECT nonexistent_column"
    if failure == "ledger":
        ledger.write_text(LEDGER + "\n2026-01-02 balance Assets:Checking 999 USD\n")
    if failure == "readonly":
        destination.chmod(0o444)
    target = destination
    if failure == "missing-parent":
        target = ledger.parent / "missing/result.json"
    if failure == "directory":
        target = ledger.parent
    try:
        result = bea(ledger.parent, "--json", "--file", str(ledger), "query", query, "-o", str(target))
        assert result.returncode != 0, result.stdout
        assert result.stdout == ""
        assert "error" in json.loads(result.stderr)
        assert destination.read_text() == "KEEP"
        assert not list(ledger.parent.glob(".bea-*.tmp"))
    finally:
        destination.chmod(0o644)


def test_json_stdout_and_csv_controls(ledger: Path) -> None:
    args = ["--json", "--file", str(ledger), "query", "SELECT account"]
    stdout = bea(ledger.parent, *args)
    dash = bea(ledger.parent, *args, "-o", "-")
    assert stdout.returncode == dash.returncode == 0
    assert json.loads(stdout.stdout) == json.loads(dash.stdout)
    destination = ledger.parent / "result.csv"
    result = bea(ledger.parent, "--file", str(ledger), "query", "SELECT account", "-f", "csv", "-o", str(destination))
    assert result.returncode == 0, result.stderr
    assert destination.read_text().splitlines() == ["account", "Assets:Checking", "Income:Salary"]


@pytest.mark.parametrize(
    ("command", "expected"),
    [
        (["example"], ["--date-begin", "--seed", "--output"]),
        (["treeify"], ["--pattern", "--filler", "input"]),
        (["doctor", "region"], ["FILENAME", "REGION"]),
        (["doctor", "context"], ["FILENAME", "LOCATION"]),
        (["price"], ["--no-cache", "--date", "sources", "bea engine enable beanprice"]),
        (["ingest", "archive"], ["--config", "--destination", "--dry-run", "[SRC]"]),
        (["check"], ["--cache-filename", "global --json"]),
    ],
)
def test_help_exposes_native_interface_without_engine(tmp_path: Path, command: list[str], expected: list[str]) -> None:
    result = bea(tmp_path, *command, "--help")
    assert result.returncode == 0, result.stderr
    for text in expected:
        assert text in result.stdout
    assert not (tmp_path / "data").exists()


def test_native_help_matches_runtime_pins() -> None:
    manifest = json.loads((ROOT / "src/cli/engine/manifest.json").read_text())
    captured = json.loads((ROOT / "src/cli/engine/native-help.json").read_text())
    requirements = manifest["requirements"] + [r for f in manifest["optional"].values() for r in f["requirements"]]
    for package, version in captured["versions"].items():
        assert f"{package}=={version}" in requirements, "Regenerate native help for changed upstream pins"


@pytest.mark.skipif(sys.platform == "win32", reason="POSIX PTY; Windows export/help covered separately")
def test_shell_redirect_reset_and_failed_redirect_keep_session_usable(ledger: Path) -> None:
    import pty
    import select
    import signal

    instrument = ledger.parent / "instrument"
    instrument.mkdir()
    # Only redirect upstream's hard-coded user state; do not patch handlers.
    (instrument / "sitecustomize.py").write_text(
        'import sys\nif "shell" in sys.argv:\n import beanquery.shell as s\n'
        f" s.HISTORY_FILENAME={str(ledger.parent / 'history')!r}\n"
        f" s.INIT_FILENAME={str(ledger.parent / 'no-init')!r}\n"
    )
    env = environment(ledger.parent)
    env["PYTHONPATH"] += os.pathsep + str(instrument)
    master, slave = pty.openpty()
    proc = subprocess.Popen(
        [sys.executable, "-m", "cli.main", "--file", str(ledger), "query"],
        cwd=ledger.parent,
        env=env,
        stdin=slave,
        stdout=slave,
        stderr=slave,
        start_new_session=True,
    )
    os.close(slave)

    def prompt() -> str:
        output = b""
        deadline = time.monotonic() + 15
        while time.monotonic() < deadline:
            if select.select([master], [], [], 0.1)[0]:
                output += os.read(master, 65536)
                if output.endswith(b"beanquery> "):
                    return output.decode(errors="replace")
        pytest.fail(f"Shell did not return prompt: {output!r}")

    def command(line: str) -> str:
        os.write(master, (line + "\n").encode())
        return prompt()

    try:
        prompt()
        command(".set pager false")
        destination = ledger.parent / "out.txt"
        command(f".output {destination}")
        command("SELECT account;")
        assert "Traceback" not in command(".output")
        assert "Assets:Checking" in destination.read_text()
        assert "Traceback" not in command(".output")
        assert "Assets:Checking" in command("SELECT account;")
        # Failure to open a new target must leave the current stream usable.
        command(f".output {ledger.parent / 'absent/out.txt'}")
        assert "Assets:Checking" in command("SELECT account;")
        for line in [".reload", ".format csv", ".run"]:
            assert "Traceback" not in command(line)
        os.write(master, b".quit\n")
        tail = b""
        deadline = time.monotonic() + 10
        while proc.poll() is None and time.monotonic() < deadline:
            if select.select([master], [], [], 0.1)[0]:
                try:
                    tail += os.read(master, 65536)
                except OSError:
                    break
        assert proc.wait(timeout=1) == 0, tail
    finally:
        if proc.poll() is None:
            os.killpg(proc.pid, signal.SIGKILL)
            proc.wait()
        os.close(master)
