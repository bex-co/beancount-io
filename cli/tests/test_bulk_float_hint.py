"""A refused JSON float's hint suggests a string the same input accepts (w5/335, w1/346).

The hint quoted the float's `str()`: `'1e+20'` and `'1e-08'` were then refused
as scientific notation, and `'nan'`/`'-inf'` as invalid, so following it looped.
w5/735 quoted the literal as typed instead, which brought the loop back for an
exponent literal: `1.25e1` was told `'1.25e1'`, refused as scientific notation
on the rerun. An exponent literal is now written out exactly (`'12.5'`), and a
value with no decimal form Beancount can hold gets no suggestion at all.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

import pytest

from bea_engine.amounts import NUMBER_TOKEN_LIMIT, JsonFloat, exact_decimal_form

ROOT = Path(__file__).resolve().parents[1]
LEDGER = """option "operating_currency" "USD"
2026-01-01 open Expenses:Food USD
2026-01-01 open Assets:Cash USD
2026-01-01 open Assets:Broker
"""
_VALUE = "@@value@@"


def _row(field: str, value: Any) -> dict[str, Any]:
    row: dict[str, Any] = {"date": "2026-01-05", "narration": "B"}
    if field in {"units", "cost", "price"}:
        number = {"number": value, "currency": "USD"}
        first: dict[str, Any] = {"account": "Expenses:Food", "units": number}
        if field != "units":
            first = {"account": "Assets:Broker", "units": {"number": "1", "currency": "HOOL"}, field: number}
        row["postings"] = [first, {"account": "Assets:Cash"}]
        return row
    row["meta"] = {"rate": {"kind": "number", "value": value} if field == "meta" else value}
    row["postings"] = [
        {"account": "Expenses:Food", "units": {"number": "1", "currency": "USD"}},
        {"account": "Assets:Cash"},
    ]
    return row


def _add(tmp_path: Path, rows: str) -> subprocess.CompletedProcess[str]:
    (tmp_path / "main.bean").write_text(LEDGER)
    (tmp_path / "in.json").write_text(rows)
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
        [sys.executable, "-m", "cli.main", "-f", "main.bean", "add", "transactions", "--from", "in.json"],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=120,
        stdin=subprocess.DEVNULL,
    )


def _add_literal(tmp_path: Path, field: str, literal: str) -> subprocess.CompletedProcess[str]:
    """Add one row whose number is the JSON literal exactly as typed (`1.25e1`, `NaN`)."""
    return _add(tmp_path, json.dumps([_row(field, _VALUE)]).replace(json.dumps(_VALUE), literal))


#: Each JSON literal, and the string its hint must name (None: no suggestion).
LITERALS = {
    "1e+20": "1" + "0" * 20,
    "1e-08": "0.00000001",
    "1.25e1": "12.5",
    "2.5E0": "2.5",
    "1.250e1": "12.50",
    "12.50": "12.50",
    "1e254": "1" + "0" * 254,
    "1e255": None,
    "1E400": None,
    "NaN": None,
    "-Infinity": None,
}


@pytest.mark.parametrize("field", ["units", "cost", "price", "meta", "untagged-meta"])
@pytest.mark.parametrize("literal", list(LITERALS))
def test_every_suggestion_is_accepted_on_rerun(tmp_path: Path, field: str, literal: str) -> None:
    refused = _add_literal(tmp_path, field, literal)
    message = " ".join(refused.stderr.split())
    assert refused.returncode == 1, refused.stdout
    assert (tmp_path / "main.bean").read_text() == LEDGER

    expected = LITERALS[literal]
    if field == "untagged-meta":
        suggestion = re.search(r'such as \{"kind":"number","value":"([^"]*)"\}', message)
    else:
        suggestion = re.search(r"decimal string, such as '([^']*)'", message)
    if expected is None:
        assert suggestion is None, message
        if literal in {"NaN", "-Infinity"}:
            assert "is not a finite number, so it has no decimal form" in message
        else:
            assert f"more than the {NUMBER_TOKEN_LIMIT} characters a Beancount number can hold" in message
        return
    assert suggestion is not None, message
    assert suggestion[1] == expected

    followed = {"kind": "number", "value": expected} if field == "untagged-meta" else expected
    accepted = _add(tmp_path, json.dumps([_row(field, followed)]))
    assert accepted.returncode == 0, accepted.stderr
    written = (tmp_path / "main.bean").read_text()[len(LEDGER) :]
    assert re.search(rf"(?<![\d.]){re.escape(expected)}(?![\d.])", written), written


def test_the_reported_exponent_amount_is_written_as_its_decimal(tmp_path: Path) -> None:
    """The w1/346 repro: `1.25e1` is told `'12.5'`, and sending that writes `12.5 USD`."""
    refused = _add_literal(tmp_path, "units", "1.25e1")
    assert refused.returncode == 1
    assert "such as '12.5'" in refused.stderr, refused.stderr

    accepted = _add(tmp_path, json.dumps([_row("units", "12.5")]))
    assert accepted.returncode == 0, accepted.stderr
    assert "  Expenses:Food  12.5 USD\n" in (tmp_path / "main.bean").read_text()


def test_a_negative_exponent_amount_keeps_its_sign(tmp_path: Path) -> None:
    refused = _add_literal(tmp_path, "units", "-0.5E-1")
    assert "such as '-0.05'" in refused.stderr, refused.stderr

    accepted = _add(tmp_path, json.dumps([_row("units", "-0.05")]))
    assert accepted.returncode == 0, accepted.stderr
    assert "  Expenses:Food  -0.05 USD\n" in (tmp_path / "main.bean").read_text()


@pytest.mark.parametrize(
    ("value", "form"),
    [
        (1e20, "1" + "0" * 20),
        (1e-8, "0.00000001"),
        (0.1, "0.1"),
        (1e300, None),
        (float("nan"), None),
        (JsonFloat("0e300"), "0"),
        (JsonFloat("1e-256"), None),
        (JsonFloat("not a number"), None),
    ],
)
def test_the_decimal_form_without_a_json_literal(value: float | JsonFloat, form: str | None) -> None:
    """Plain floats take the same rule, and a marker carrying any string gets no suggestion."""
    assert exact_decimal_form(value) == form


def test_a_huge_exponent_is_refused_without_writing_it_out() -> None:
    started = time.monotonic()
    assert exact_decimal_form(JsonFloat("1e999999999")) is None
    assert exact_decimal_form(JsonFloat("1e-999999999")) is None
    assert time.monotonic() - started < 1
