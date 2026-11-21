"""`bea init --preset` builds the setup-catalog chart, not the fixed one (w3/m53/t004)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
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
        [sys.executable, "-m", "cli.main", *args],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=30,
    )


def test_init_preset_personal_with_known_opening(tmp_path: Path) -> None:
    books = tmp_path / "books"
    result = _bea(
        tmp_path,
        "--json",
        "init",
        str(books),
        "--preset",
        "personal@1",
        "--currency",
        "EUR",
        "--date",
        "2026-02-01",
        "--opening-balance",
        "Assets:Cash 100",
    )
    assert result.returncode == 0, result.stderr or result.stdout
    data = json.loads(result.stdout)["data"]
    assert data["preset"] == "personal@1"
    assert "Expenses:Food" in data["accounts"]
    assert "Assets:Checking" not in data["accounts"]

    ledger = (books / "main.bean").read_text(encoding="utf-8")
    assert 'option "operating_currency" "EUR"' in ledger
    # Opening posts the day before the boundary and asserts on it, matching
    # the hosted builder's fixture for the same specification.
    assert '2026-01-31 * "Opening balance"' in ledger
    assert "2026-02-01 balance Assets:Cash" in ledger

    checked = _bea(tmp_path, "--file", str(books / "main.bean"), "check")
    assert checked.returncode == 0, checked.stderr or checked.stdout


def test_init_preset_rejects_unknown_preset_and_account(tmp_path: Path) -> None:
    unknown = _bea(tmp_path, "--no-input", "init", str(tmp_path / "a"), "--preset", "nope@1", "--currency", "USD")
    assert unknown.returncode != 0
    assert not (tmp_path / "a").exists()

    bad_account = _bea(
        tmp_path,
        "--no-input",
        "init",
        str(tmp_path / "b"),
        "--preset",
        "personal@1",
        "--currency",
        "USD",
        "--date",
        "2026-02-01",
        "--opening-balance",
        "Assets:Checking 100",
    )
    assert bad_account.returncode != 0
    assert not (tmp_path / "b").exists()


def test_init_without_preset_keeps_the_fixed_chart(tmp_path: Path) -> None:
    books = tmp_path / "books"
    result = _bea(tmp_path, "--json", "init", str(books), "--currency", "USD", "--date", "2026-08-01")
    assert result.returncode == 0, result.stderr or result.stdout
    assert "Assets:Checking" in json.loads(result.stdout)["data"]["accounts"]


def test_preset_ledger_refuses_a_misspelt_account(tmp_path: Path) -> None:
    """A preset header loads no `auto_accounts` plugin, so a typo is refused (w1/247).

    The plugin opened `Assets:Csah` on first use instead of refusing it, unlike
    the hosted builder's header (w23/059) and plain `bea init`.
    """
    books = tmp_path / "books"
    made = _bea(
        tmp_path,
        "--no-input",
        "init",
        str(books),
        "--preset",
        "personal@1",
        "--currency",
        "USD",
        "--date",
        "2026-01-01",
    )
    assert made.returncode == 0, made.stderr or made.stdout
    main = books / "main.bean"
    before = main.read_bytes()
    assert b"plugin" not in before

    typo = _bea(
        tmp_path,
        "--no-input",
        "--file",
        str(main),
        "add",
        "transaction",
        "typo",
        "--date",
        "2026-01-05",
        "-p",
        "Expenses:Fodo 3 USD",
        "-p",
        "Assets:Csah",
    )
    assert typo.returncode == 1, typo.stdout + typo.stderr
    assert "Assets:Csah" in typo.stdout + typo.stderr
    assert main.read_bytes() == before


def test_preset_ledger_with_opening_balances_ends_in_one_newline(tmp_path: Path) -> None:
    """A preset ledger with opening balances ends with one newline, not a blank line (w1/349).

    It ended in `USD\\n\\n`: `git diff --check` reported a new blank line at
    EOF on the first commit, and the first `bea add` left two blank lines
    before its entry. A nonzero opening posts a transaction before its
    assertion; a zero one asserts alone.
    """
    for preset, opening in (("personal@1", "Assets:Bank 100"), ("business@1", "Assets:Bank 0")):
        books = tmp_path / preset
        made = _bea(
            tmp_path,
            "--no-input",
            "init",
            str(books),
            "--preset",
            preset,
            "--currency",
            "USD",
            "--date",
            "2026-01-01",
            "--opening-balance",
            opening,
        )
        assert made.returncode == 0, made.stderr or made.stdout
        main = books / "main.bean"
        created = main.read_text(encoding="utf-8")
        assert created.endswith(" USD\n") and not created.endswith("\n\n"), repr(created[-60:])
        assert created.splitlines()[-1].split() == ["2026-01-01", "balance", *opening.split(), "USD"]

        added = _bea(
            tmp_path,
            "--no-input",
            "--file",
            str(main),
            "add",
            "note",
            "--date",
            "2026-01-02",
            "-a",
            "Assets:Bank",
            "-m",
            "hi",
        )
        assert added.returncode == 0, added.stderr or added.stdout
        appended = main.read_text(encoding="utf-8")
        assert appended == created + '\n2026-01-02 note Assets:Bank "hi"\n', repr(appended[-80:])
