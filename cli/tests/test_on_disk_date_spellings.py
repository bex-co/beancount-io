"""Any date spelling Beancount accepts still counts as written on disk (w3/394).

`entry_generated()` decides whether a plugin synthesized an entry by looking at
the source line and checking that it starts this directive — "exactly what
`grep` would find". Its date pattern only matched `YYYY-MM-DD`, but Beancount's
lexer also takes `/` as the separator and does not require month or day to be
padded. In a ledger written `2026/01/02`, every real entry failed that match,
so ordinary listings reported `generated: true` for transactions sitting at a
real filename and line number, and `--on-disk` returned an empty, successful,
untruncated answer for a ledger full of written directives.

The control that must not regress is the opposite case: genuinely synthesized
entries (`auto_accounts` opens) have to keep being detected. This fix widens
what counts as a date, not what counts as a declaration — the directive word
after the date is still what decides.
"""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

from bea_engine.ledger.reader import entry_generated

ROOT = Path(__file__).resolve().parents[1]

# Every spelling the installed Beancount parser accepts, probed directly: the
# separator may be `-` or `/` and may even be mixed, and month and day need no
# padding. `2026.01.02` and `26-01-02` are rejected by the parser and so never
# reach this code.
SPELLINGS = ["2026-01-02", "2026/01/02", "2026-1-2", "2026/1/2", "2026-01-2", "2026/1/02", "2026-01/02"]


def _ledger(date: str) -> str:
    day = date.replace("02", "03") if date.endswith("02") else date
    return (
        f"{date.replace('-02', '-01').replace('/02', '/01')} open Assets:Cash USD\n"
        f"{date.replace('-02', '-01').replace('/02', '/01')} open Expenses:Food USD\n"
        f'{date} * "Written transaction"\n'
        "  Assets:Cash -10 USD\n"
        "  Expenses:Food\n"
        f'{day} note Assets:Cash "Written note"\n'
    )


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
        timeout=60,
    )


def _rows(tmp_path: Path, ledger: Path, kind: str, *extra: str) -> list[dict]:
    done = _bea(tmp_path, "--json", "--file", str(ledger), "list", kind, *extra)
    assert done.returncode == 0, done.stderr
    return json.loads(done.stdout)["data"]


class TestSourceLineRecognition:
    """The helper alone, so a failure says whether the pattern or the CLI broke."""

    @pytest.mark.parametrize("date", SPELLINGS)
    def test_a_written_transaction_is_not_generated(self, tmp_path: Path, date: str) -> None:
        source = tmp_path / "main.bean"
        source.write_text(f'{date} * "x"\n  Assets:Cash -1 USD\n  Expenses:Food\n', encoding="utf-8")
        entry = type("E", (), {"meta": {"filename": str(source), "lineno": 1}})()

        assert entry_generated(entry, "transaction") is False

    @pytest.mark.parametrize("date", SPELLINGS)
    def test_the_directive_word_still_decides(self, tmp_path: Path, date: str) -> None:
        """A line that declares something else is still not this entry's source."""
        source = tmp_path / "main.bean"
        source.write_text(f'{date} * "x"\n', encoding="utf-8")
        entry = type("E", (), {"meta": {"filename": str(source), "lineno": 1}})()

        assert entry_generated(entry, "open") is True, "a transaction line does not declare an open"

    def test_a_synthesized_location_is_still_generated(self, tmp_path: Path) -> None:
        entry = type("E", (), {"meta": {"filename": "<auto_accounts>", "lineno": 1}})()

        assert entry_generated(entry, "open") is True

    @pytest.mark.parametrize("line", ["not a date at all", "26-01-02 open Assets:Cash", "20260102 open Assets:Cash"])
    def test_a_line_that_is_not_a_directive_is_generated(self, tmp_path: Path, line: str) -> None:
        """Widening the date must not make any old line count as a declaration."""
        source = tmp_path / "main.bean"
        source.write_text(line + "\n", encoding="utf-8")
        entry = type("E", (), {"meta": {"filename": str(source), "lineno": 1}})()

        assert entry_generated(entry, "open") is True


@pytest.mark.parametrize("date", SPELLINGS)
def test_on_disk_keeps_every_written_directive(tmp_path: Path, date: str) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(_ledger(date), encoding="utf-8")

    assert len(_rows(tmp_path, ledger, "transaction", "--on-disk")) == 1
    assert len(_rows(tmp_path, ledger, "open", "--on-disk")) == 2
    assert len(_rows(tmp_path, ledger, "note", "--on-disk")) == 1


@pytest.mark.parametrize("date", SPELLINGS)
def test_a_written_entry_is_never_labelled_generated(tmp_path: Path, date: str) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(_ledger(date), encoding="utf-8")

    rows = _rows(tmp_path, ledger, "transaction")
    assert len(rows) == 1
    assert not rows[0].get("generated"), rows[0]

    human = _bea(tmp_path, "--file", str(ledger), "list", "transaction")
    assert human.returncode == 0, human.stderr
    assert "generated" not in human.stdout


@pytest.mark.parametrize("date", ["2026-01-02", "2026/1/2"])
def test_plugin_generated_opens_are_still_hidden(tmp_path: Path, date: str) -> None:
    """The control the report insists on: do not fix this by trusting everything."""
    ledger = tmp_path / "main.bean"
    ledger.write_text(
        'plugin "beancount.plugins.auto_accounts"\n'
        f'{date} * "Written transaction"\n'
        "  Assets:Cash -10 USD\n"
        "  Expenses:Food\n",
        encoding="utf-8",
    )

    opens = _rows(tmp_path, ledger, "open")
    assert len(opens) == 2
    assert all(row.get("generated") for row in opens), opens
    assert _rows(tmp_path, ledger, "open", "--on-disk") == []
    assert len(_rows(tmp_path, ledger, "transaction", "--on-disk")) == 1


def test_filtering_happens_before_the_limit(tmp_path: Path) -> None:
    """A hidden generated entry must not consume a slot in the answer."""
    body = ['plugin "beancount.plugins.auto_accounts"']
    for i in range(1, 4):
        body.append(f'2026/1/{i} * "txn {i}"\n  Assets:Cash -1 USD\n  Expenses:Food')
    ledger = tmp_path / "main.bean"
    ledger.write_text("\n".join(body) + "\n", encoding="utf-8")

    rows = _rows(tmp_path, ledger, "transaction", "--on-disk", "--limit", "2")

    assert len(rows) == 2, "two real transactions, not two slots spent on hidden opens"


@pytest.mark.parametrize("date", SPELLINGS)
def test_listing_never_rewrites_the_source(tmp_path: Path, date: str) -> None:
    ledger = tmp_path / "main.bean"
    ledger.write_text(_ledger(date), encoding="utf-8")
    before = hashlib.sha256(ledger.read_bytes()).hexdigest()

    _rows(tmp_path, ledger, "transaction", "--on-disk")

    assert hashlib.sha256(ledger.read_bytes()).hexdigest() == before
