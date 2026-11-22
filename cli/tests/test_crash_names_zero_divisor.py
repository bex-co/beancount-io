"""A load that crashes on a zero divisor names its file and line (w1/354).

Beancount's parser segfaults on a zero divisor in an amount expression. `bea
check` and every read then said only to search the ledger for `/0`, which
finds nothing for `120/(3-3)` or `100 / 0`, and the format walking modes
named the file but not the line for a computed divisor. The format scan now
evaluates each line as the render does, and a crashed load scans the ledger's
include closure for the divisor it died on.
"""

from __future__ import annotations

import json
import os
import signal
import subprocess
import sys
from pathlib import Path

import pytest

from cli.engine import launch
from cli.errors import BeaError, ConflictError, SignalError

ROOT = Path(__file__).resolve().parents[1]
MAIN = (
    'option "operating_currency" "USD"\ninclude "2026/feb.bean"\n'
    "2026-01-01 open Assets:Bank USD\n2026-01-01 open Expenses:Food USD\n"
)
SEARCH_HINT = "searching the ledger for '/0'"


def _bea(cwd: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_") and k != "CI"}
    env.update(
        BEA_CONFIG_DIR=str(cwd / "config"),
        XDG_CACHE_HOME=str(cwd / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        PYTHONPATH=str(ROOT / "src"),
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=cwd,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=180,
    )


def _ledger(tmp_path: Path, amount: str) -> tuple[Path, Path]:
    """The repro: a root including `2026/feb.bean`, whose line 2 holds `amount`."""
    (tmp_path / "2026").mkdir()
    main = tmp_path / "main.bean"
    main.write_text(MAIN)
    feb = tmp_path / "2026" / "feb.bean"
    feb.write_text(f'2026-02-01 * "Split"\n  Expenses:Food  {amount} USD\n  Assets:Bank\n')
    return main, feb


@pytest.fixture
def repro(tmp_path: Path) -> tuple[Path, Path]:
    return _ledger(tmp_path, "120/(3-3)")


def test_check_names_the_line(repro: tuple[Path, Path]) -> None:
    main, feb = repro
    before = feb.read_bytes()
    result = _bea(main.parent, "--file", str(main), "check")

    assert result.returncode == 1, result.stderr
    assert result.stdout == ""
    assert "killed by SIGSEGV" in result.stderr
    assert f"{feb}:2: Division by zero in an amount expression" in result.stderr, result.stderr
    assert SEARCH_HINT not in result.stderr
    assert feb.read_bytes() == before


def test_json_check_names_the_line_in_the_same_envelope(repro: tuple[Path, Path]) -> None:
    main, feb = repro
    result = _bea(main.parent, "--json", "--file", str(main), "check")

    assert result.returncode == 1, result.stderr
    error = json.loads(result.stderr)["error"]
    assert set(error) == {"category", "message", "exit_code", "hint", "details"}
    assert error["category"] == "validation"
    assert error["exit_code"] == 1
    assert error["hint"].startswith(f"{feb}:2: Division by zero in an amount expression")
    assert error["details"][0] == error["hint"]
    assert SEARCH_HINT not in result.stderr


def test_a_read_names_the_line(repro: tuple[Path, Path]) -> None:
    main, feb = repro
    result = _bea(main.parent, "--file", str(main), "list", "transaction")

    assert result.returncode == 1, result.stderr
    assert f"{feb}:2: Division by zero in an amount expression" in result.stderr, result.stderr
    assert SEARCH_HINT not in result.stderr


@pytest.mark.parametrize("amount", ["100/(2-2)", "100/(0)", "100/(1*0)", "100 / 0", "100/0"])
def test_every_spelling_is_named_by_check_and_each_walking_mode(tmp_path: Path, amount: str) -> None:
    main, feb = _ledger(tmp_path, amount)
    located = f"{feb}:2: Division by zero in an amount expression"

    check = _bea(tmp_path, "--file", str(main), "check")
    assert check.returncode == 1, check.stderr
    assert located in check.stderr, check.stderr
    for mode in ("--check", "--dry-run", "-i"):
        walked = _bea(tmp_path, "format", mode, str(main))
        assert f"cannot parse: {located}" in walked.stdout + walked.stderr, (mode, walked.stdout + walked.stderr)
        assert "SIGSEGV" not in walked.stdout + walked.stderr


def test_in_place_names_the_line_and_still_formats_the_rest(repro: tuple[Path, Path]) -> None:
    main, feb = repro
    jan = main.parent / "2026" / "jan.bean"
    jan.write_text('2026-01-05 * "a"\n  Assets:Bank   1 USD\n  Expenses:Food     -1 USD\n')
    main.write_text(MAIN + 'include "2026/jan.bean"\n')
    result = _bea(main.parent, "format", "-i", str(main.parent))

    assert result.returncode == 1
    out = result.stdout + result.stderr
    assert f"cannot parse: {feb}:2: Division by zero in an amount expression" in out, out
    assert f"formatted: {jan}" in out, out
    assert jan.read_text() == '2026-01-05 * "a"\n  Assets:Bank     1 USD\n  Expenses:Food  -1 USD\n'


def test_slashes_that_divide_by_nothing_zero_still_check_and_format(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(
        'option "operating_currency" "USD"\n'
        "2026-01-01 open Assets:Bank USD\n"
        "2026-01-01 open Expenses:Food USD\n"
        "\n"
        '2026-01-05 * "ratio 100/0" #proj/0 ^inv/0 ; 1/0 in a comment\n'
        "  Expenses:Food   100/0.5 USD\n"
        "  Assets:Bank\n"
    )
    check = _bea(tmp_path, "--file", str(ledger), "check")
    assert check.returncode == 0, check.stderr
    formatted = _bea(tmp_path, "format", "-i", str(ledger))
    assert formatted.returncode == 0, formatted.stdout + formatted.stderr
    assert "Division by zero" not in formatted.stdout + formatted.stderr
    listed = _bea(tmp_path, "--json", "--file", str(ledger), "list", "transaction")
    assert listed.returncode == 0, listed.stderr
    assert "200" in listed.stdout


def _died(number: int) -> subprocess.CompletedProcess[str]:
    return subprocess.CompletedProcess(["bea-engine"], -number, "", "")


def test_a_crash_with_no_divisor_keeps_the_search_hint(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text("2026-01-01 open Assets:Bank USD\n")

    with pytest.raises(SignalError) as raised:
        launch._parse(_died(signal.SIGSEGV), ["check", "--file", str(ledger)])

    assert SEARCH_HINT in raised.value.hint
    assert "Division by zero" not in " ".join(raised.value.details)


def test_a_write_keeps_its_unknown_outcome_and_gains_the_location(repro: tuple[Path, Path]) -> None:
    main, feb = repro
    with pytest.raises(ConflictError, match="the outcome is unknown") as raised:
        launch._parse(_died(signal.SIGSEGV), ["add", "--file", str(main), "--request", "-"], writes=True)

    assert raised.value.exit_code == 4
    assert raised.value.details[0].startswith(f"{feb}:2: Division by zero in an amount expression")
    assert SEARCH_HINT not in " ".join(raised.value.details)


def test_a_signal_from_outside_is_not_blamed_on_a_divisor(repro: tuple[Path, Path]) -> None:
    main, _ = repro
    with pytest.raises(SignalError) as raised:
        launch._parse(_died(signal.SIGKILL), ["check", "--file", str(main)])

    assert "Division by zero" not in raised.value.hint
    assert "came from outside" in raised.value.hint


def test_a_native_crash_names_the_line_of_the_ledger_it_read(repro: tuple[Path, Path]) -> None:
    main, feb = repro
    with pytest.raises(BeaError) as raised:
        launch._died_on_signal(signal.SIGSEGV, ["bean-check", str(main)], main)

    assert raised.value.details[0].startswith(f"{feb}:2: Division by zero in an amount expression")
    assert raised.value.details[1] == f"Command: bean-check {main}"


def test_an_encrypted_member_is_not_read(tmp_path: Path) -> None:
    # Beancount decrypts it only to load it; its bytes are ciphertext here.
    main = tmp_path / "main.bean"
    main.write_text('include "secret.gpg"\n2026-01-01 open Assets:Bank USD\n')
    (tmp_path / "secret.gpg").write_text('2026-02-01 * "x"\n  Assets:Bank  100/0 USD\n')

    assert launch._crash_location(signal.SIGSEGV, main) is None


def test_the_ledger_argument_is_the_file_flag_before_any_separator() -> None:
    assert launch._ledger_argument(["list", "--file", "main.bean", "--type", "open"]) == "main.bean"
    assert launch._ledger_argument(["query", "--format", "text", "--", "--file", "x"]) is None
    assert launch._ledger_argument(["syntax", "a.bean", "b.bean"]) is None
