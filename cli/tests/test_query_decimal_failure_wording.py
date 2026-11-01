"""A NaN a query sorts is explained as a NaN, and `--file` is never told to use `--file` (w5/628).

w5/472 worded every decimal signal as upstream's twelve-digit rendering limit
and advised `--file`. Sorting a `decimal('nan')` raised one too: `--source`
blamed the limit, the `--file` one-shot printed a bare
`InvalidOperation: [<class 'decimal.InvalidOperation'>]`, and the `--file`
prompt advised querying with `--file`.
"""

from __future__ import annotations

import os
import subprocess
import sys
from decimal import Decimal, localcontext
from pathlib import Path

import pytest

from tests.query_terminal import QueryTerminal

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """2026-01-01 open Assets:Cash USD
2026-01-01 open Expenses:Fx USD
2026-01-06 * "Bank" "a"
  rate: "nan"
  Expenses:Fx  1.00 USD
  Assets:Cash
2026-01-07 * "Bank" "b"
  rate: "1.25"
  Expenses:Fx  2.00 USD
  Assets:Cash
"""
SORTED = "SELECT narration, decimal(entry_meta('rate')) AS rate WHERE account = 'Expenses:Fx' ORDER BY rate"
NAN = "a NaN or infinite value cannot be ordered, compared or used in arithmetic. Filter it out with WHERE"


@pytest.fixture
def ledger(tmp_path: Path) -> Path:
    path = tmp_path / "n.bean"
    path.write_text(LEDGER)
    return path


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_") and k != "CI"}
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
        cwd=tmp_path,
        env=env,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )


@pytest.mark.parametrize(
    "args",
    [
        ["query", "--source", "n.bean", SORTED],
        ["-f", "n.bean", "query", SORTED],
        ["-f", "n.bean", "query", "SELECT max(decimal(entry_meta('rate'))) AS m"],
    ],
    ids=["source", "file", "file-max"],
)
def test_a_sorted_nan_is_explained_as_a_nan(ledger: Path, args: list[str]) -> None:
    result = _bea(ledger.parent, *args)

    assert result.returncode == 1
    lines = result.stderr.strip().splitlines()
    assert len(lines) == 1, result.stderr
    assert NAN in lines[0]
    assert "twelve integer digits" not in lines[0] and "--file" not in lines[0]
    assert "<class" not in lines[0]


def test_the_suggested_filter_answers(ledger: Path) -> None:
    filtered = SORTED.replace(
        " ORDER BY", " AND str(decimal(entry_meta('rate'))) NOT IN ('NaN', 'Infinity', '-Infinity') ORDER BY"
    )

    result = _bea(ledger.parent, "-f", "n.bean", "query", filtered)

    assert result.returncode == 0, result.stderr
    assert "1.25" in result.stdout


def test_the_file_prompt_explains_it_and_carries_on(ledger: Path) -> None:
    with QueryTerminal(ledger.parent, ["-f", str(ledger), "query"]) as shell:
        shell.read("beanquery>")
        shell.send(SORTED)
        reply = shell.read("beanquery>")
        assert NAN in " ".join(reply.split())
        assert "--file" not in reply and "Traceback" not in reply

        shell.send("SELECT 1 + 1 AS two")
        assert "2" in shell.read("beanquery>")
        shell.send(".quit")
        assert shell.finish() == 0


def quantize(number: Decimal) -> Decimal:
    """Stands in for Beancount's display context, which the classification recognizes by name."""
    with localcontext() as context:
        context.prec = 14
        return number.quantize(Decimal("0.01"))


def _raised(number: Decimal) -> ArithmeticError:
    try:
        quantize(number)
    except ArithmeticError as exc:
        return exc
    raise AssertionError("quantize did not fail")


def test_only_an_amount_too_wide_to_render_names_the_limit() -> None:
    from bea_engine.query import decimal_failure

    wide = _raised(Decimal("1000000000000"))
    assert "--file to print larger ones" in decimal_failure(wide, native=True)
    assert "--file" not in decimal_failure(wide, native=False)
    assert "outgrew its display precision" in decimal_failure(wide, native=False)

    infinite = _raised(Decimal("Infinity"))
    assert NAN in decimal_failure(infinite, native=True)


@pytest.mark.parametrize("bad", ["", "12,50"], ids=["blank", "decimal-comma"])
def test_unreadable_decimal_text_is_not_blamed_on_precision(tmp_path: Path, bad: str) -> None:
    (tmp_path / "bank.csv").write_text(f'day,amount\n2026-09-02,12.50\n2026-09-03,"{bad}"\n')

    result = _bea(tmp_path, "query", "--source", "csv:bank.csv", "SELECT day, amount FROM bank ORDER BY day")

    assert result.returncode == 1
    assert "not valid decimal text" in result.stderr
    assert "28 significant digits" not in result.stderr and "Round to fewer" not in result.stderr


def test_a_real_precision_overflow_keeps_the_rounding_advice(tmp_path: Path) -> None:
    (tmp_path / "bank.csv").write_text("day,amount\n2026-09-02,12.50\n")

    result = _bea(tmp_path, "query", "--source", "csv:bank.csv", "SELECT round(amount, 30) FROM bank")

    assert result.returncode == 1
    assert "28 significant digits" in result.stderr
