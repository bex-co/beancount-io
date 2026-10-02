"""Automatic alignment ignores exceptional widths without changing ledger values."""

from __future__ import annotations

import re
from pathlib import Path

import pytest
from beancount.scripts.format import align_beancount

from bea_engine.ledger.formatting import align_text
from tests.test_format_preserves_strings import _bea


def _ledger(account: str, amount: str = "1.00") -> bytes:
    text = (
        'option "operating_currency" "USD"\n'
        f"2024-01-01 open {account} USD\n"
        "2024-01-01 open Assets:Bank USD\n"
        "2024-01-01 open Expenses:Food USD\n"
        '\n2024-01-02 * "Outlier"\n'
        f"  {account}  {amount} USD\n"
        "  Assets:Bank  -1.00 USD\n"
    )
    for index in range(100):
        text += f'\n2024-02-01 * "Row {index}"\n  Assets:Bank  -1.00 USD\n  Expenses:Food  1.00 USD\n'
    return text.encode()


def _short_postings(content: bytes) -> list[bytes]:
    rows = [line for line in content.splitlines() if line.startswith((b"  Assets:Bank ", b"  Expenses:Food "))]
    assert rows
    return rows


def _assert_bounded(original: bytes, formatted: bytes) -> None:
    assert re.sub(rb"\s+", b"", formatted) == re.sub(rb"\s+", b"", original)
    for line in _short_postings(formatted):
        number = re.search(rb"(?<!\S)-?\d", line)
        assert number is not None
        assert number.start() < 200, f"A short posting's amount moved to column {number.start() + 1}"
    assert len(formatted) < len(original) * 2


def _assert_idempotent_and_valid(tmp_path: Path, path: Path, content: bytes) -> None:
    again = _bea(tmp_path, "format", str(path))
    assert again.returncode == 0, again.stderr
    assert again.stdout == content
    checked = _bea(tmp_path, "--file", str(path), "check")
    assert checked.returncode == 0, checked.stderr


@pytest.mark.parametrize("account_length", [300, 900])
@pytest.mark.parametrize("destination", ["stdout", "output", "in-place", "stdin"])
def test_one_long_account_does_not_pad_every_posting(tmp_path: Path, account_length: int, destination: str) -> None:
    ledger = tmp_path / "main.bean"
    original = _ledger("Assets:" + "L" * account_length)
    ledger.write_bytes(original)
    exported = tmp_path / "formatted.bean"
    flags = {"stdout": [], "output": ["-o", str(exported)], "in-place": ["-i"], "stdin": []}[destination]

    result = (
        _bea(tmp_path, "format", stdin=original)
        if destination == "stdin"
        else _bea(tmp_path, "format", str(ledger), *flags)
    )

    assert result.returncode == 0, result.stderr
    formatted = (
        result.stdout
        if destination in {"stdout", "stdin"}
        else (exported if destination == "output" else ledger).read_bytes()
    )
    _assert_bounded(original, formatted)
    if destination != "in-place":
        assert ledger.read_bytes() == original
    if destination in {"stdout", "stdin"}:
        exported.write_bytes(formatted)
    _assert_idempotent_and_valid(tmp_path, ledger if destination == "in-place" else exported, formatted)


def test_one_long_number_expression_does_not_pad_every_posting(tmp_path: Path) -> None:
    expression = "(1.00 + " + "0" * 250 + ")"
    assert len(expression) > 200
    ledger = tmp_path / "main.bean"
    original = _ledger("Assets:Wallet", expression)
    ledger.write_bytes(original)

    result = _bea(tmp_path, "format", "-i", str(ledger))

    assert result.returncode == 0, result.stderr
    formatted = ledger.read_bytes()
    _assert_bounded(original, formatted)
    assert expression.encode() in formatted
    _assert_idempotent_and_valid(tmp_path, ledger, formatted)


def test_zero_width_options_still_use_bounded_automatic_alignment(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    original = _ledger("Assets:" + "L" * 300)
    ledger.write_bytes(original)

    result = _bea(tmp_path, "format", str(ledger), "--prefix-width", "0", "--num-width", "0", "--currency-column", "0")

    assert result.returncode == 0, result.stderr
    _assert_bounded(original, result.stdout)
    assert ledger.read_bytes() == original


def test_all_oversized_values_keep_their_natural_widths() -> None:
    text = "".join(f"  Assets:{'L' * width}  {'1' * width} USD\n" for width in (250, 350))

    assert align_text(text) == text
    assert align_beancount(text) != text


def test_ordinary_ledger_keeps_native_alignment_byte_for_byte(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    original = _ledger("Assets:Wallet")
    ledger.write_bytes(original)

    result = _bea(tmp_path, "format", str(ledger))

    assert result.returncode == 0, result.stderr
    assert result.stdout == align_beancount(original.decode()).encode()
    assert ledger.read_bytes() == original


@pytest.mark.parametrize(
    ("flag", "width", "currency_index"),
    [("--prefix-width", 30, 38), ("--currency-column", 50, 49)],
    ids=["prefix-width", "currency-column"],
)
def test_explicit_alignment_still_controls_ordinary_postings_beside_a_long_account(
    tmp_path: Path, flag: str, width: int, currency_index: int
) -> None:
    ledger = tmp_path / "main.bean"
    original = _ledger("Assets:" + "L" * 300)
    ledger.write_bytes(original)

    result = _bea(tmp_path, "format", str(ledger), flag, str(width))

    assert result.returncode == 0, result.stderr
    assert all(line.index(b"USD") == currency_index for line in _short_postings(result.stdout))
    assert ledger.read_bytes() == original


def test_append_uses_the_same_bounded_alignment_as_format(tmp_path: Path) -> None:
    ledger = tmp_path / "main.bean"
    original = _ledger("Assets:" + "L" * 300)
    ledger.write_bytes(original)
    formatted = _bea(tmp_path, "format", "-i", str(ledger))
    assert formatted.returncode == 0, formatted.stderr
    before = ledger.read_bytes()
    _assert_bounded(original, before)

    added = _bea(
        tmp_path,
        "--file",
        str(ledger),
        "add",
        "transaction",
        "--date",
        "2024-03-01",
        "--narration",
        "Appended",
        "-p",
        "Assets:Bank -2.00 USD",
        "-p",
        "Expenses:Food 2.00 USD",
    )

    assert added.returncode == 0, added.stderr
    assert ledger.read_bytes().startswith(before)
    checked = _bea(tmp_path, "format", "--check", str(ledger))
    assert checked.returncode == 0, checked.stderr
    _assert_idempotent_and_valid(tmp_path, ledger, ledger.read_bytes())
