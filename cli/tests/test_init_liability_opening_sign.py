"""`bea init` notes a liability an unsigned positive opening balance puts in credit (w1/285).

`--opening-balance 'Liabilities:CreditCard 250'` opened the card 250 in
credit with exit 0 and no word, so a newcomer typing the figure on their
statement started with net worth 500 too high. The written file keeps
Beancount's sign either way; only the note is new, and an explicit `+250`
stays silent as a deliberate credit balance.
"""

from __future__ import annotations

import json
import os
import pty
import select
import subprocess
import sys
import time
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
CARD = (
    "Liabilities balances are negative in Beancount, so an amount owed of 250 USD is entered as -250; "
    "Liabilities:CreditCard opens at +250 USD, in credit, which counts toward net worth. "
    "To open it in credit on purpose, write +250."
)


def _env(tmp_path: Path) -> dict[str, str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_") and k != "CI"}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return env


def _init(tmp_path: Path, folder: str, *args: str, json_output: bool = False) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "cli.main", "--no-input", *(["--json"] if json_output else [])]
        + ["init", folder, "--currency", "USD", "--date", "2026-01-01", *args],
        cwd=tmp_path,
        env=_env(tmp_path),
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        check=False,
        timeout=120,
    )


def _flat(text: str) -> str:
    return " ".join(text.split())


@pytest.mark.parametrize("preset", [[], ["--preset", "personal@1"]], ids=["fixed-chart", "personal-preset"])
def test_an_unsigned_positive_liability_is_noted_and_written_as_given(tmp_path: Path, preset: list[str]) -> None:
    result = _init(tmp_path, "books", *preset, "--opening-balance", "Liabilities:CreditCard 250")

    assert result.returncode == 0, result.stdout + result.stderr
    assert _flat(result.stderr) == CARD
    assert CARD not in _flat(result.stdout)
    written = _flat((tmp_path / "books" / "main.bean").read_text(encoding="utf-8"))
    assert "Liabilities:CreditCard 250 USD Equity:OpeningBalances" in written


@pytest.mark.parametrize("preset", [[], ["--preset", "personal@1"]], ids=["fixed-chart", "personal-preset"])
def test_json_carries_the_note_in_warnings(tmp_path: Path, preset: list[str]) -> None:
    result = _init(tmp_path, "books", *preset, "--opening-balance", "Liabilities:CreditCard 250", json_output=True)

    assert result.returncode == 0, result.stdout + result.stderr
    assert json.loads(result.stdout)["data"]["warnings"] == [CARD]
    assert result.stderr == ""


def test_each_unsigned_positive_liability_gets_its_own_note(tmp_path: Path) -> None:
    result = _init(
        tmp_path,
        "books",
        "--preset",
        "personal@1",
        "--opening-balance",
        "Liabilities:CreditCard 250",
        "--opening-balance",
        "Liabilities:Loan 1,200.50",
        "--opening-balance",
        "Assets:Bank 900",
        json_output=True,
    )

    assert result.returncode == 0, result.stdout + result.stderr
    assert json.loads(result.stdout)["data"]["warnings"] == [
        CARD,
        "Liabilities balances are negative in Beancount, so an amount owed of 1200.50 USD is entered as -1200.50; "
        "Liabilities:Loan opens at +1200.50 USD, in credit, which counts toward net worth. "
        "To open it in credit on purpose, write +1200.50.",
    ]


@pytest.mark.parametrize("preset", [[], ["--preset", "personal@1"]], ids=["fixed-chart", "personal-preset"])
@pytest.mark.parametrize("number", ["-250", "+250", "0"])
def test_a_signed_or_zero_liability_is_silent(tmp_path: Path, preset: list[str], number: str) -> None:
    text = _init(tmp_path, "books", *preset, "--opening-balance", f"Liabilities:CreditCard {number}")
    data = _init(tmp_path, "books2", *preset, "--opening-balance", f"Liabilities:CreditCard {number}", json_output=True)

    assert text.returncode == 0, text.stdout + text.stderr
    assert text.stderr == ""
    assert data.returncode == 0, data.stdout + data.stderr
    assert "warnings" not in json.loads(data.stdout)["data"]


@pytest.mark.parametrize("preset", [[], ["--preset", "personal@1"]], ids=["fixed-chart", "personal-preset"])
def test_the_note_leaves_the_file_unchanged(tmp_path: Path, preset: list[str]) -> None:
    noted = _init(tmp_path, "noted", *preset, "--opening-balance", "Liabilities:CreditCard 250")
    deliberate = _init(tmp_path, "deliberate", *preset, "--opening-balance", "Liabilities:CreditCard +250")

    assert noted.returncode == 0, noted.stdout + noted.stderr
    assert deliberate.returncode == 0, deliberate.stdout + deliberate.stderr
    assert CARD in _flat(noted.stderr)
    assert deliberate.stderr == ""
    assert (tmp_path / "noted" / "main.bean").read_bytes() == (tmp_path / "deliberate" / "main.bean").read_bytes()


def test_the_note_survives_an_answered_currency_question(tmp_path: Path) -> None:
    """A prompted currency prints its own note early; the liability note must still follow."""
    env = _env(tmp_path)
    pid, fd = pty.fork()
    if pid == 0:  # pragma: no cover - replaced by exec in the child
        os.chdir(tmp_path)
        argv = ["init", "books", "--date", "2026-01-01", "--opening-balance", "Liabilities:CreditCard 250"]
        os.execve(sys.executable, [sys.executable, "-m", "cli.main", *argv], env)
    screen = b""
    answered = False
    deadline = time.time() + 90
    try:
        while True:
            ready, _, _ = select.select([fd], [], [], 0.2)
            if ready:
                try:
                    screen += os.read(fd, 65536)
                except OSError:
                    pass
            if not answered and b"Operating currency" in screen:
                os.write(fd, b"F\r")
                answered = True
            finished, status = os.waitpid(pid, os.WNOHANG)
            if finished:
                break
            assert time.time() < deadline, f"init did not finish: {screen!r}"
    finally:
        os.close(fd)

    shown = _flat(screen.decode("utf-8", "replace"))
    assert os.waitstatus_to_exitcode(status) == 0, shown
    assert shown.count("is a valid Beancount symbol but is not three uppercase letters") == 1, shown
    assert shown.count("Liabilities:CreditCard opens at +250 F, in credit") == 1, shown
