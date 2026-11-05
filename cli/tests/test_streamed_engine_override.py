"""Streamed and captured engine calls reject unusable interpreters before use (w5/675)."""

from __future__ import annotations

import os
import shutil
import signal
import subprocess
import sys
import time
import venv
from pathlib import Path

import pytest

from cli.engine import launch, paths
from cli.errors import BeaError
from tests.query_terminal import ROOT, QueryTerminal

LEDGER = """2026-01-01 open Assets:Cash USD
2026-01-01 open Equity:Opening USD
2026-01-02 * "Opening"
  Assets:Cash 73 USD
  Equity:Opening
"""


@pytest.fixture(scope="module")
def bare_python(tmp_path_factory: pytest.TempPathFactory) -> Path:
    directory = tmp_path_factory.mktemp("streamed-bare-python")
    venv.create(directory, with_pip=False, symlinks=sys.platform != "win32")
    return paths.venv_python(directory)


@pytest.fixture
def books(tmp_path: Path) -> Path:
    (tmp_path / "main.bean").write_text(LEDGER)
    (tmp_path / "bom.bean").write_bytes(b"\xef\xbb\xbf" + LEDGER.encode())
    return tmp_path


def _override(directory: Path, kind: str, bare_python: Path) -> Path:
    if kind == "bare-python":
        return bare_python
    if kind in {"true", "false"}:
        executable = shutil.which(kind)
        assert executable is not None
        return Path(executable)
    # A deterministic stand-in for Python 3.9 rejecting the helper's -P.
    executable = directory / "python39"
    diagnostic = "Unknown option: -P\nusage: python [option] ...\nTry `python -h' for more information.\n"
    executable.write_text(f"#!{sys.executable}\nimport sys\nsys.stderr.write({diagnostic!r})\nraise SystemExit(2)\n")
    executable.chmod(0o755)
    return executable


def _env(directory: Path, override: Path) -> dict[str, str]:
    env = {
        key: value
        for key, value in os.environ.items()
        if not key.startswith("BEA_") and key not in {"CI", "BEANCOUNT_LOAD_CACHE_FILENAME"}
    }
    env.update(
        BEA_ENGINE_PYTHON=str(override),
        BEA_ENGINE_DIR=str(directory / "engine"),
        BEA_CONFIG_DIR=str(directory / "config"),
        BEA_NO_UPDATE_NOTIFIER="1",
        XDG_CACHE_HOME=str(directory / "cache"),
        XDG_DATA_HOME=str(directory / "data"),
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return env


def _run(directory: Path, override: Path, surface: str) -> subprocess.CompletedProcess[str]:
    if surface == "source-query":
        command = ["query", "--source", "main.bean", "SELECT 73 AS n LIMIT 1"]
    else:
        command = ["doctor", "lex" if surface == "doctor-stream" else "roundtrip", "bom.bean"]
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *command],
        cwd=directory,
        env=_env(directory, override),
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=120,
    )


def _assert_override_refusal(status: int, screen: str, override: Path) -> None:
    assert status == 1, screen
    flat = " ".join(screen.split())
    assert f"BEA_ENGINE_PYTHON={override} names an environment that cannot run the Beancount engine" in flat
    assert "Correct or unset BEA_ENGINE_PYTHON" in flat
    assert "Traceback" not in screen
    assert "did not answer" not in screen
    assert "outcome is unknown" not in screen


@pytest.mark.parametrize("kind", ["true", "false", "bare-python", "python39"])
@pytest.mark.parametrize("surface", ["source-query", "doctor-stream", "doctor-capture"])
def test_unusable_overrides_fail_before_streaming_or_capture(
    books: Path, bare_python: Path, kind: str, surface: str
) -> None:
    override = _override(books, kind, bare_python)
    before = {path.name: path.read_bytes() for path in books.glob("*.bean")}

    result = _run(books, override, surface)

    assert result.stdout == "", result.stdout
    _assert_override_refusal(result.returncode, result.stderr, override)
    if kind == "python39":
        assert "Unknown option: -P" in result.stderr
        assert "Python 3.12 or newer" in result.stderr
    assert {path.name: path.read_bytes() for path in books.glob("*.bean")} == before


@pytest.mark.parametrize("kind", ["true", "false"])
@pytest.mark.parametrize("native", [False, True], ids=["file", "source"])
def test_an_unusable_override_never_opens_an_interactive_prompt(
    books: Path, bare_python: Path, kind: str, native: bool
) -> None:
    override = _override(books, kind, bare_python)
    args = ["query", "--source", "beancount:main.bean"] if native else ["--file", "main.bean", "query"]
    before = (books / "main.bean").read_bytes()

    with QueryTerminal(books, args, env={"BEA_ENGINE_PYTHON": str(override)}) as terminal:
        terminal.send(".exit")
        screen = terminal.read()
        status = terminal.process.wait(timeout=10)

    _assert_override_refusal(status, screen, override)
    assert "beanquery>" not in screen
    assert (books / "main.bean").read_bytes() == before


@pytest.mark.parametrize("surface", ["source-query", "doctor-stream", "doctor-capture"])
def test_a_working_override_keeps_normal_command_output(books: Path, surface: str) -> None:
    before = {path.name: path.read_bytes() for path in books.glob("*.bean")}

    result = _run(books, Path(sys.executable), surface)

    assert result.returncode == 0, result.stdout + result.stderr
    if surface == "source-query":
        assert "73" in result.stdout.split()
    elif surface == "doctor-stream":
        assert "Assets:Cash" in result.stdout
    else:
        assert "Congratulations" in result.stdout + result.stderr
    assert {path.name: path.read_bytes() for path in books.glob("*.bean")} == before


@pytest.mark.parametrize("native", [False, True], ids=["file", "source"])
def test_a_working_override_keeps_the_shell_usable_after_ctrl_c(books: Path, native: bool) -> None:
    args = ["query", "--source", "main.bean"] if native else ["--file", "main.bean", "query"]
    with QueryTerminal(books, args, env={"BEA_ENGINE_PYTHON": sys.executable}) as terminal:
        terminal.read("beanquery>")
        terminal.send("SELECT 73 AS n LIMIT 1;")
        assert "73" in (line.strip() for line in terminal.read("beanquery>").splitlines())

        # A prompt can be visible just before readline begins waiting. Retry
        # the terminal-group interrupt until the shell acknowledges it.
        interrupted = ""
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline:
            os.killpg(terminal.process.pid, signal.SIGINT)
            interrupted += terminal.read(timeout=0.3)
            if "(interrupted)" in interrupted and "beanquery>" in interrupted.split("(interrupted)", 1)[1]:
                break
        assert "(interrupted)" in interrupted, terminal.screen
        assert "beanquery>" in interrupted.split("(interrupted)", 1)[1], terminal.screen
        terminal.send("SELECT 74 AS n LIMIT 1;")
        assert "74" in (line.strip() for line in terminal.read("beanquery>").splitlines())
        assert terminal.finish() == 0
        assert "Traceback" not in terminal.screen


@pytest.mark.parametrize("captured", [False, True], ids=["stream", "capture"])
def test_a_damaged_managed_interpreter_is_probed_before_spawning(
    tmp_path: Path, bare_python: Path, captured: bool, monkeypatch: pytest.MonkeyPatch
) -> None:
    damaged = tmp_path / "damaged-engine"
    monkeypatch.setattr(launch, "resolve_engine", lambda: launch.EngineSource("managed", damaged, bare_python))

    def must_not_spawn() -> tuple[list[str], dict[str, str] | None]:
        pytest.fail("a damaged managed interpreter must be refused before spawning the command")

    monkeypatch.setattr(launch, "helper_command", must_not_spawn)
    with pytest.raises(BeaError) as refused:
        if captured:
            launch.capture_engine(["version"])
        else:
            launch.run_engine_argv(["version"])

    message = str(refused.value)
    assert f"managed Beancount engine at {damaged} is damaged" in message
    assert f"Remove {damaged} and rerun" in message
    assert "BEA_ENGINE_PYTHON" not in message
