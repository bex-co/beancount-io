"""`bea update` edits a transaction header by its written tokens.

The planner used to see only the header's first physical line and find its
fields with whitespace-bounded patterns. A payee or narration continuing onto
another line took a new tag inside the unfinished string, and a narration
replacement spliced quotes into it (w5/1026); the narration slot followed the
loaded payee, which a plugin may fill or drop, rather than the strings the
header writes (w5/1026).

Every case drives the real CLI, single and batch, and checks the file's exact
bytes and the fields the ledger loads.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest

ROOT = Path(__file__).resolve().parents[1]
PREFIX = """\
option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
2024-01-01 open Expenses:Food USD
2024-01-01 open Equity:Opening USD
2024-01-01 * "Capital"
  Assets:Cash 100.00 USD
  Equity:Opening -100.00 USD
"""
BODY = """\
  import-id: "header-1"
  memo: "Keep this memo"
  Expenses:Food 9.99 USD
  Assets:Cash -9.99 USD
"""
NEIGHBOUR = """\
; neighbour stays byte-identical
2024-01-04 ! "Neighbour" "Coffee
  refill" #later
  import-id: "header-2"
  Expenses:Food 1.01 USD
  Assets:Cash -1.01 USD
"""


def _bea(tmp_path: Path, *args: str) -> subprocess.CompletedProcess[str]:
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
        [
            sys.executable,
            "-m",
            "cli.main",
            "--json",
            "--no-input",
            "--offline",
            "-f",
            str(tmp_path / "main.bean"),
            *args,
        ],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=120,
        stdin=subprocess.DEVNULL,
    )


def _data(result: subprocess.CompletedProcess[str]) -> Any:
    assert result.returncode == 0, result.stderr or result.stdout
    return json.loads(result.stdout)["data"]


def _update(tmp_path: Path, transport: str, rows: list[dict[str, Any]], *, apply: bool) -> Any:
    """One update through the single or the batch command; answers its JSON data."""
    flag = ["--apply"] if apply else []
    if transport == "batch":
        mapping = tmp_path / "mapping.json"
        mapping.write_text(json.dumps(rows))
        return _data(_bea(tmp_path, "update", "transactions", "--from", str(mapping), *flag))
    [row] = rows
    args = ["--id", row["id"]]
    for tag in row.get("tags", []):
        args += ["--tag", tag]
    if "flag" in row:
        args += ["--flag", row["flag"]]
    if "narration" in row:
        args += ["--narration", row["narration"]]
    return _data(_bea(tmp_path, "update", "transaction", *args, *flag))


def _loaded(tmp_path: Path, *filters: str) -> dict[str, tuple[Any, ...]]:
    """Each listed transaction's loaded header fields, by import-id."""
    rows = _data(_bea(tmp_path, "list", "transaction", *filters))
    return {
        row["meta"].get("import-id"): (row["flag"], row["payee"], row["narration"], row["tags"], row["links"])
        for row in rows
    }


def _queried(tmp_path: Path) -> dict[str, list[Any]]:
    """The loaded header fields through BQL, by import-id."""
    data = _data(
        _bea(
            tmp_path,
            "query",
            "SELECT DISTINCT ANY_META('import-id') AS id, flag, payee, narration, tags, links "
            "WHERE account = 'Expenses:Food'",
        )
    )
    return {row[0]: row[1:] for row in data["rows"] if row[0] is not None}


def _apply_and_verify(tmp_path: Path, transport: str, rows: list[dict[str, Any]], source: str, expected: str) -> None:
    """Preview writes nothing, apply writes exactly `expected`, a repeat writes nothing."""
    book = tmp_path / "main.bean"
    book.write_text(source)
    preview = _update(tmp_path, transport, rows, apply=False)
    assert preview["written"] == 0
    assert book.read_text() == source
    applied = _update(tmp_path, transport, rows, apply=True)
    assert applied["written"] == len(rows)
    assert book.read_text() == expected
    assert _data(_bea(tmp_path, "check"))["valid"] is True
    repeat = _update(tmp_path, transport, rows, apply=True)
    assert repeat["written"] == 0
    assert book.read_text() == expected


MULTILINE_NARRATION = '2024-01-02 ! "Shop\n  receipt details" #review ^receiptA  ; keep\n'
MULTILINE_PAYEE = '2024-01-02 ! "Merchant\n  branch details" "Shop receipt details" #review ^receiptA  ; keep\n'


@pytest.mark.parametrize("transport", ["single", "batch"])
@pytest.mark.parametrize(
    ("header", "payee", "narration"),
    [
        (MULTILINE_NARRATION, None, "Shop\n  receipt details"),
        (MULTILINE_PAYEE, "Merchant\n  branch details", "Shop receipt details"),
    ],
    ids=["narration", "payee"],
)
def test_tag_lands_after_a_multiline_header(
    tmp_path: Path, transport: str, header: str, payee: str | None, narration: str
) -> None:
    source = PREFIX + header + BODY + NEIGHBOUR
    expected = PREFIX + header.replace("^receiptA", "^receiptA #classified") + BODY + NEIGHBOUR
    _apply_and_verify(tmp_path, transport, [{"id": "header-1", "tags": ["classified"]}], source, expected)
    fields = ("!", payee, narration, ["classified", "review"], ["receiptA"])
    assert _loaded(tmp_path, "--tag", "classified") == {"header-1": fields}
    assert _queried(tmp_path)["header-1"] == list(fields)


@pytest.mark.parametrize("transport", ["single", "batch"])
@pytest.mark.parametrize(
    ("header", "renamed", "payee"),
    [
        (MULTILINE_NARRATION, '2024-01-02 ! "Renamed shop" #review ^receiptA  ; keep\n', None),
        (
            MULTILINE_PAYEE,
            '2024-01-02 ! "Merchant\n  branch details" "Renamed shop" #review ^receiptA  ; keep\n',
            "Merchant\n  branch details",
        ),
    ],
    ids=["narration", "payee"],
)
def test_narration_replaces_its_whole_multiline_string(
    tmp_path: Path, transport: str, header: str, renamed: str, payee: str | None
) -> None:
    source = PREFIX + header + BODY + NEIGHBOUR
    expected = PREFIX + renamed + BODY + NEIGHBOUR
    _apply_and_verify(tmp_path, transport, [{"id": "header-1", "narration": "Renamed shop"}], source, expected)
    fields = ("!", payee, "Renamed shop", ["review"], ["receiptA"])
    assert _loaded(tmp_path)["header-1"] == fields
    assert _queried(tmp_path)["header-1"] == list(fields)


def test_batch_collapses_one_header_and_edits_the_next_by_its_original_lines(tmp_path: Path) -> None:
    """A narration that loses lines leaves a later row's planned lines where they were."""
    source = PREFIX + MULTILINE_NARRATION + BODY + NEIGHBOUR
    expected = (
        PREFIX
        + '2024-01-02 ! "Renamed shop" #review ^receiptA  ; keep\n'
        + BODY
        + NEIGHBOUR.replace('"Coffee\n  refill" #later', '"Refill" #later #classified').replace(
            "2024-01-04 !", "2024-01-04 *"
        )
    )
    rows = [
        {"id": "header-1", "narration": "Renamed shop"},
        {"id": "header-2", "narration": "Refill", "flag": "*", "tags": ["classified"]},
    ]
    _apply_and_verify(tmp_path, "batch", rows, source, expected)
    assert _loaded(tmp_path) == {
        "header-1": ("!", None, "Renamed shop", ["review"], ["receiptA"]),
        "header-2": ("*", "Neighbour", "Refill", ["classified", "later"], []),
        None: ("*", None, "Capital", [], []),
    }


ONE_LINE = '2024-01-02 ! "Merchant" "Shop" #review ^receiptA ; keep\n'


@pytest.mark.parametrize(
    ("header", "request_row", "after"),
    [
        (MULTILINE_NARRATION, {"flag": "*"}, MULTILINE_NARRATION.replace("! ", "* ", 1)),
        (MULTILINE_NARRATION, {"tags": ["review"]}, MULTILINE_NARRATION),
        (ONE_LINE, {"tags": ["classified"]}, ONE_LINE.replace("^receiptA", "^receiptA #classified")),
        (ONE_LINE, {"narration": "Renamed shop"}, ONE_LINE.replace('"Shop"', '"Renamed shop"')),
    ],
    ids=["flag-only", "existing-tag", "one-line-tag", "one-line-narration"],
)
def test_header_controls(tmp_path: Path, header: str, request_row: dict[str, Any], after: str) -> None:
    book = tmp_path / "main.bean"
    book.write_text(PREFIX + header + BODY + NEIGHBOUR)
    applied = _update(tmp_path, "single", [{"id": "header-1", **request_row}], apply=True)
    assert applied["written"] == (0 if after == header else 1)
    assert book.read_text() == PREFIX + after + BODY + NEIGHBOUR
    assert _data(_bea(tmp_path, "check"))["valid"] is True


PAYEE_PLUGIN = """\
from beancount.core.data import Transaction
__plugins__ = ("derive",)
def derive(entries, options, mode):
    out = []
    for entry in entries:
        if isinstance(entry, Transaction) and entry.meta.get("ref") == "R1":
            if mode == "fill" and entry.payee is None:
                entry = entry._replace(payee="Café Merchant")
            elif mode == "drop":
                entry = entry._replace(payee=None)
        out.append(entry)
    return out, []
"""


def _plugin_book(mode: str | None, header: str) -> str:
    plugin = f'option "insert_pythonpath" "TRUE"\nplugin "qa_payee" "{mode}"\n' if mode else ""
    return (
        plugin
        + PREFIX
        + f"2024-01-02 ! {header} #source ^receipt\n"
        + '  ref: "R1"\n  memo: "Keep this memo"\n  Assets:Cash -10 USD\n  Expenses:Food 10 USD\n'
        + NEIGHBOUR
    )


@pytest.mark.parametrize("transport", ["single", "batch"])
@pytest.mark.parametrize(
    ("mode", "header", "loaded_payee"),
    [
        ("fill", '"Pending"', "Café Merchant"),
        ("drop", '"Café Merchant" "Pending"', None),
        ("identity", '"Café Merchant" "Pending"', "Café Merchant"),
        (None, '"Pending"', None),
        (None, '"Café Merchant" "Pending"', "Café Merchant"),
    ],
    ids=["fill", "drop", "identity", "plain-one", "plain-two"],
)
def test_narration_slot_follows_the_written_header_not_the_plugin_payee(
    tmp_path: Path, transport: str, mode: str | None, header: str, loaded_payee: str | None
) -> None:
    (tmp_path / "qa_payee.py").write_text(PAYEE_PLUGIN)
    source = _plugin_book(mode, header)
    expected = _plugin_book(mode, header.replace('"Pending"', '"Reviewed lunch"'))
    _apply_and_verify(tmp_path, transport, [{"id": "R1", "narration": "Reviewed lunch"}], source, expected)
    rows = _data(_bea(tmp_path, "list", "transaction", "--search", "Reviewed lunch"))
    assert [(row["payee"], row["narration"], row["tags"], row["links"]) for row in rows] == [
        (loaded_payee, "Reviewed lunch", ["source"], ["receipt"])
    ]
