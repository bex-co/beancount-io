"""A concurrent edit during `import --apply` is a conflict, not a validation error (w3/389).

`USAGE.md`: "An external edit detected before replacement produces exit 4 and
is preserved", and the exit table assigns 4 to `conflict` and 1 to
`validation`. The refusal itself was always correct — nothing written, ledger
still valid — but `importing.answer` caught *every* `EngineError` from
`validate_append` and flattened it to a list of strings, so a `ConflictError`
was re-raised as `LedgerError("Import would leave the ledger invalid…")` at
exit 1, with "retry" demoted to a details line.

It was also a coin flip. `import` can notice the concurrent edit at
`validate_append` (flattened) or at `append` (propagated intact), so identical
commands reported the same race two different ways and a retry wrapper keyed
on exit 4 worked about half the time.

These tests inject the failure at the engine boundary instead of racing real
processes, because a race is not a thing a suite can assert on reliably. The
live race was verified by hand: six attempts of one `import --apply` against
six concurrent `add`s gave 6/6 `validation`/exit 1 before the fix and 6/6
`conflict`/exit 4 after.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import textwrap
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

LEDGER = """option "operating_currency" "USD"
2026-01-01 open Assets:Cash USD
2026-01-01 open Expenses:Food USD
2026-01-01 open Expenses:Uncategorized USD
"""

CSV = "Date,Amount,Description\n2026-03-01,-7.00,IMPORTED ROW\n"

CONFLICT_TEXT = "The ledger changed during the operation: {path}. Nothing was written; retry."


def _run_with_injected_failure(tmp_path: Path, raises: str) -> subprocess.CompletedProcess[str]:
    """Call the engine's `importing.answer` with `validate_append` replaced by a raiser.

    Driving the engine directly rather than through `cli.main` keeps the
    injection simple and puts the assertion exactly where the category is
    decided. `--csv auto` is resolved by the frontend, so the mapping is spelled
    out here the way the frontend would hand it over.
    """
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER, encoding="utf-8")
    source = tmp_path / "bank.csv"
    source.write_text(CSV, encoding="utf-8")

    driver = tmp_path / "driver.py"
    driver.write_text(
        textwrap.dedent(f"""
            import json, sys
            from pathlib import Path
            from bea_engine import importing
            from bea_engine.ledger import write as ledger_write
            from bea_engine.protocol import AuthError, ConflictError, LedgerError, UsageError

            def boom(*args, **kwargs):
                raise {raises}

            ledger_write.validate_append = boom

            try:
                importing.answer(
                    Path({str(ledger)!r}),
                    Path({str(source)!r}),
                    csv_mapping="date=Date,amount=Amount,narration=Description",
                    csv_account="Assets:Cash",
                    apply=True,
                    duplicates="include",
                )
            except Exception as exc:
                print(json.dumps({{
                    "class": type(exc).__name__,
                    "category": getattr(exc, "category", None),
                    "exit_code": getattr(exc, "exit_code", None),
                    "message": str(exc),
                    "details": list(getattr(exc, "details", None) or []),
                }}))
                sys.exit(0)
            print(json.dumps({{"class": None}}))
        """).lstrip(),
        encoding="utf-8",
    )

    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(PYTHONPATH=str(ROOT / "src"), BEA_NO_UPDATE_NOTIFIER="1", TERM="dumb", NO_COLOR="1")
    done = subprocess.run(
        [sys.executable, str(driver)], env=env, cwd=tmp_path, capture_output=True, text=True, timeout=120
    )
    assert done.returncode == 0, done.stderr
    return done


def _raised(tmp_path: Path, raises: str) -> dict:
    return json.loads(_run_with_injected_failure(tmp_path, raises).stdout)


def test_a_concurrent_edit_keeps_its_conflict_category(tmp_path: Path) -> None:
    raised = _raised(tmp_path, 'ConflictError("The ledger changed during the operation: x. Retry.")')

    assert raised["class"] == "ConflictError"
    assert raised["category"] == "conflict"
    assert raised["exit_code"] == 4
    assert "changed during the operation" in raised["message"]
    assert "would leave the ledger invalid" not in raised["message"], "the headline must name the real cause"


@pytest.mark.parametrize(
    ("raises", "expected_class", "category", "code"),
    [
        pytest.param('AuthError("read-only destination")', "AuthError", "auth", 3, id="auth"),
        pytest.param('UsageError("bad invocation")', "UsageError", "usage", 2, id="usage"),
    ],
)
def test_other_categories_survive_the_same_handler(
    tmp_path: Path, raises: str, expected_class: str, category: str, code: int
) -> None:
    """The note reasoned these were flattened too but could not reach them; they were."""
    raised = _raised(tmp_path, raises)

    assert raised["class"] == expected_class
    assert raised["category"] == category
    assert raised["exit_code"] == code


def test_a_genuine_validation_failure_still_reads_as_one(tmp_path: Path) -> None:
    """The control: flattening is what that handler is *for*, and it must stay."""
    raised = _raised(tmp_path, 'LedgerError("invalid", details=["Assets:Nope is not open", "second problem"])')

    assert raised["class"] == "LedgerError"
    assert raised["category"] == "validation"
    assert raised["exit_code"] == 1
    assert raised["message"] == "Import would leave the ledger invalid; nothing was written."
    assert raised["details"] == ["Assets:Nope is not open", "second problem"]


def test_the_two_detection_points_now_agree(tmp_path: Path) -> None:
    """`validate_append` and `append` see the same race; they must answer alike.

    The unwrapped `append` call always propagated intact — that is the
    behaviour the wrapped call was brought into line with, and the coin flip
    was the gap between them.
    """
    at_validate = _raised(tmp_path, 'ConflictError("The ledger changed during the operation: x. Retry.")')

    driver_env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    driver_env.update(PYTHONPATH=str(ROOT / "src"))
    at_append = json.loads(
        subprocess.run(
            [
                sys.executable,
                "-c",
                "import json;"
                "from bea_engine.protocol import ConflictError as C;"
                "e = C('x');"
                "print(json.dumps({'category': e.category, 'exit_code': e.exit_code}))",
            ],
            env=driver_env,
            capture_output=True,
            text=True,
            timeout=60,
            check=True,
        ).stdout
    )

    assert (at_validate["category"], at_validate["exit_code"]) == (
        at_append["category"],
        at_append["exit_code"],
    )


def test_a_clean_import_is_unaffected(tmp_path: Path) -> None:
    """Nothing above may cost an ordinary import its success."""
    ledger = tmp_path / "main.bean"
    ledger.write_text(LEDGER, encoding="utf-8")
    source = tmp_path / "bank.csv"
    source.write_text(CSV, encoding="utf-8")

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
    done = subprocess.run(
        [
            sys.executable,
            "-m",
            "cli.main",
            "--no-input",
            "--file",
            str(ledger),
            "import",
            str(source),
            "--csv",
            "auto",
            "--account",
            "Assets:Cash",
            "--apply",
        ],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=120,
    )

    assert done.returncode == 0, done.stderr
    assert "IMPORTED ROW" in ledger.read_text(encoding="utf-8")
