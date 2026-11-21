"""Shared-location provenance uses each source file's path and parser context (w5/681)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import unicodedata
from pathlib import Path
from typing import Any

import pytest

ROOT = Path(__file__).resolve().parents[1]
OPENS = "2026-01-01 open Assets:Cash USD\n2026-01-01 open Assets:Mirror USD\n2026-01-01 open Equity:Opening USD\n"
PLUGIN = """\
from pathlib import Path
from beancount.core import data

__plugins__ = ["mirror"]


def mirror(entries, options_map, config):
    with Path(__file__).with_suffix(".runs").open("a") as marker:
        marker.write("run\\n")
    out = []
    for entry in entries:
        if type(entry).__name__.lower() == config:
            if hasattr(entry, "account"):
                copy = entry._replace(account="Assets:Mirror")
            elif hasattr(entry, "currency"):
                copy = entry._replace(currency="GBP")
            else:
                copy = entry._replace(type="mirror")
            # Keep the source's actual filename, line and date, but put the
            # synthesized row first so --on-disk must filter before limiting.
            out.append(copy)
        out.append(entry)
    return out, []
"""
DIRECTIVES = {
    "note": '2026-01-03 note Assets:Cash "written"\n',
    "document": '2026-01-03 document Assets:Cash "docs/receipt.pdf"\n',
    "price": "2026-01-03 price EUR 1.10 USD\n",
    "open": "2026-01-01 open Assets:Cash USD\n",
    "close": "2026-01-03 close Assets:Cash\n",
    "balance": "2026-01-03 balance Assets:Cash 0 USD\n",
    "pad": "2026-01-03 pad Assets:Cash Equity:Opening\n",
    "commodity": "2026-01-03 commodity EUR\n",
    "event": '2026-01-03 event "written" "Paris"\n',
    "custom": '2026-01-03 custom "written" "value"\n',
}


def _books(tmp_path: Path, kind: str, body: str, *, nested: bool = False) -> tuple[Path, Path]:
    plugins = tmp_path / "plugins"
    plugins.mkdir()
    (plugins / "source_mirror.py").write_text(PLUGIN)
    books = tmp_path / "books"
    books.mkdir()
    root = books / "main.bean"
    header = f'plugin "source_mirror" "{kind}"\n' + ("" if kind == "open" else OPENS)
    if nested:
        source = books / "year" / "entries" / "leaf.bean"
        source.parent.mkdir(parents=True)
        root.write_text(header + 'include "year/index.bean"\n')
        (books / "year" / "index.bean").write_text('include "entries/leaf.bean"\n')
        source.write_text(body)
    else:
        source = root
        source.write_text(header + body)
    attachment = source.parent / "docs" / "receipt.pdf"
    attachment.parent.mkdir()
    attachment.write_bytes(b"%PDF-1.4 synthetic attachment\n")
    return root, source


def _snapshot(root: Path) -> dict[Path, bytes]:
    return {path: path.read_bytes() for path in root.parent.rglob("*.bean")}


def _run(
    tmp_path: Path,
    cwd: Path,
    root: Path,
    kind: str,
    *,
    on_disk: bool = False,
    json_output: bool = True,
    limit: int | None = None,
    details: bool = False,
    plugin: str = "source_mirror",
) -> subprocess.CompletedProcess[str]:
    env = {
        key: value
        for key, value in os.environ.items()
        if not key.startswith("BEA_") and key not in {"CI", "BEANCOUNT_LOAD_CACHE_FILENAME"}
    }
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        XDG_DATA_HOME=str(tmp_path / "data"),
        BEA_NO_UPDATE_NOTIFIER="1",
        BEANCOUNT_DISABLE_LOAD_CACHE="1",
        PYTHONPATH=os.pathsep.join([str(ROOT / "src"), str(tmp_path / "plugins")]),
        TERM="dumb",
        NO_COLOR="1",
    )
    marker = tmp_path / "plugins" / f"{plugin}.runs"
    runs = marker.read_text().splitlines() if marker.exists() else []
    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "cli.main",
            *(["--json"] if json_output else []),
            "--file",
            str(root),
            "list",
            kind,
            *(["--allow-errors"] if kind == "pad" else []),
            *(["--on-disk"] if on_disk else []),
            *(["--limit", str(limit)] if limit is not None else []),
            *(["--details"] if details else []),
        ],
        env=env,
        cwd=cwd,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=60,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    # The provenance parse must not execute this plugin a second time.
    assert marker.read_text().splitlines() == [*runs, "run"]
    return result


def _rows(
    tmp_path: Path,
    cwd: Path,
    root: Path,
    kind: str,
    *,
    on_disk: bool = False,
    limit: int | None = None,
    plugin: str = "source_mirror",
) -> list[dict[str, Any]]:
    result = _run(tmp_path, cwd, root, kind, on_disk=on_disk, limit=limit, plugin=plugin)
    return list(json.loads(result.stdout)["data"])


def _identity(kind: str) -> tuple[str, str, str]:
    if kind in {"price", "commodity"}:
        return "currency", "EUR", "GBP"
    if kind in {"event", "custom"}:
        return "type", "written", "mirror"
    return "account", "Assets:Cash", "Assets:Mirror"


@pytest.mark.parametrize("kind", DIRECTIVES)
def test_every_nontransaction_lister_marks_only_the_shared_location_copy_generated(tmp_path: Path, kind: str) -> None:
    root, _ = _books(tmp_path, kind, DIRECTIVES[kind])
    before = _snapshot(root)

    full = _rows(tmp_path, tmp_path, root, kind)
    on_disk = _rows(tmp_path, tmp_path, root, kind, on_disk=True, limit=1)

    field, written, generated = _identity(kind)
    assert len(full) == 2, full
    assert {row[field]: bool(row.get("generated")) for row in full} == {written: False, generated: True}, full
    assert len(on_disk) == 1 and on_disk[0][field] == written, on_disk
    assert "generated" not in on_disk[0], on_disk
    assert _snapshot(root) == before


@pytest.mark.parametrize("nested", [False, True], ids=["root", "nested-include"])
@pytest.mark.parametrize("absolute", [False, True], ids=["relative-document", "absolute-document"])
@pytest.mark.parametrize("work", ["parent", "books"])
def test_document_provenance_uses_its_source_path_from_either_working_directory(
    tmp_path: Path, nested: bool, absolute: bool, work: str
) -> None:
    root, source = _books(tmp_path, "document", DIRECTIVES["document"], nested=nested)
    if absolute:
        text = source.read_text()
        source.write_text(text.replace('"docs/receipt.pdf"', json.dumps(str(source.parent / "docs" / "receipt.pdf"))))
    before = _snapshot(root)
    cwd = tmp_path if work == "parent" else root.parent

    full = _rows(tmp_path, cwd, root, "document")
    on_disk = _rows(tmp_path, cwd, root, "document", on_disk=True)

    assert {row["account"]: bool(row.get("generated")) for row in full} == {
        "Assets:Cash": False,
        "Assets:Mirror": True,
    }, full
    assert [(row["account"], row["filename"]) for row in on_disk] == [("Assets:Cash", "docs/receipt.pdf")], on_disk
    assert "generated" not in on_disk[0]
    assert _snapshot(root) == before


@pytest.mark.parametrize("nested", [False, True], ids=["root", "nested-include"])
@pytest.mark.parametrize("nfd", [False, True], ids=["plain", "nfd-account-and-comment"])
@pytest.mark.parametrize("work", ["parent", "books"])
def test_note_tags_metadata_and_unicode_context_survive_the_provenance_parse(
    tmp_path: Path, nested: bool, nfd: bool, work: str
) -> None:
    account = unicodedata.normalize("NFD", "Assets:Café") if nfd else "Assets:Cash"
    comment = unicodedata.normalize("NFD", "Café trip") if nfd else "tagged trip"
    body = (
        'pushtag #trip\npushmeta source: "travel"\n'
        f'2026-01-03 note {account} "{comment}"\n'
        '  memo: "entry metadata"\n'
        f'2026-01-03 * "pushed context"\n  {account} 0 USD\n'
        "popmeta source:\npoptag #trip\n"
        f'2026-01-04 note {account} "plain"\n'
    )
    root, _ = _books(tmp_path, "note", body, nested=nested)
    if nfd:
        root.write_text(root.read_text().replace("open Assets:Cash USD", f"open {account} USD"))
    before = _snapshot(root)
    cwd = tmp_path if work == "parent" else root.parent

    full = _rows(tmp_path, cwd, root, "note")
    on_disk = _rows(tmp_path, cwd, root, "note", on_disk=True)
    [transaction] = _rows(tmp_path, cwd, root, "transaction", on_disk=True)

    written_account = unicodedata.normalize("NFC", account)
    assert len(full) == 4, full
    assert all(bool(row.get("generated")) == (row["account"] == "Assets:Mirror") for row in full), full
    assert {row["account"] for row in full} == {written_account, "Assets:Mirror"}, full
    assert len(on_disk) == 2 and all(row["account"] == written_account for row in on_disk), on_disk
    tagged = next(row for row in on_disk if row["comment"] != "plain")
    assert tagged["comment"] == unicodedata.normalize("NFC", comment), tagged
    assert tagged["tags"] == ["trip"] and tagged["meta"]["memo"] == "entry metadata", tagged
    plain = next(row for row in on_disk if row["comment"] == "plain")
    assert plain["tags"] == [] and "memo" not in plain["meta"], plain
    # Upstream applies pushmeta to transactions; Note keeps explicit metadata.
    assert transaction["narration"] == "pushed context" and transaction["tags"] == ["trip"], transaction
    assert transaction["meta"]["source"] == "travel", transaction
    assert all("generated" not in row for row in on_disk)
    assert _snapshot(root) == before


ZERO_LINE_PLUGIN = """\
from pathlib import Path

from beancount.core import data

__plugins__ = ["zero_line"]


def zero_line(entries, options_map):
    with Path(__file__).with_suffix(".runs").open("a") as marker:
        marker.write("run\\n")
    out = list(entries)
    for entry in entries:
        if isinstance(entry, data.Transaction):
            meta = dict(entry.meta)
            # A synthesized entry points at no line, as Beancount's own loader
            # stamps synthesized entries with line 0.
            meta["lineno"] = 0
            out.append(
                data.Transaction(
                    meta,
                    entry.date,
                    entry.flag,
                    entry.payee,
                    (entry.narration or "") + " (synth)",
                    entry.tags,
                    entry.links,
                    entry.postings,
                )
            )
            break
    return out, []
"""


def _zero_line_books(tmp_path: Path) -> Path:
    plugins = tmp_path / "plugins"
    plugins.mkdir()
    (plugins / "zero_line.py").write_text(ZERO_LINE_PLUGIN, encoding="utf-8")
    root = tmp_path / "main.bean"
    root.write_text(
        'plugin "zero_line"\n'
        "2026-01-01 open Assets:Cash USD\n"
        "2026-01-01 open Expenses:Food USD\n"
        '2026-01-05 * "lunch"\n'
        "  Expenses:Food  5.00 USD\n"
        "  Assets:Cash  -5.00 USD\n",
        encoding="utf-8",
    )
    return root


def test_a_plugin_made_transaction_names_no_written_location(tmp_path: Path) -> None:
    """`list transaction` gives a line-0 transaction no source, like `list document` (w1/342).

    The header read its meta line directly while `entry_generated` already
    treated below line 1 as no location, so JSON carried
    `"source": {"lineno": 0}` and `--details` printed a `main.bean:0` comment.
    The row now carries `source: null` with the `generated` marker, and the
    written transaction keeps its `file:line`.
    """
    root = _zero_line_books(tmp_path)

    rows = _rows(tmp_path, tmp_path, root, "transaction", plugin="zero_line")

    assert [(row["narration"], row["source"]) for row in rows] == [
        ("lunch", {"filename": str(root), "lineno": 4}),
        ("lunch (synth)", None),
    ]
    assert [bool(row.get("generated")) for row in rows] == [False, True]

    table = _run(tmp_path, tmp_path, root, "transaction", json_output=False, plugin="zero_line")
    assert ":0" not in table.stdout
    assert table.stdout.count("generated") == 1, table.stdout

    details = _run(tmp_path, tmp_path, root, "transaction", json_output=False, details=True, plugin="zero_line")
    assert ":0" not in details.stdout, details.stdout
    assert f"; {root}:4\n" in details.stdout, details.stdout


def test_human_listing_marks_the_copy_and_on_disk_omits_the_source_column(tmp_path: Path) -> None:
    root, _ = _books(tmp_path, "note", DIRECTIVES["note"])
    before = _snapshot(root)

    full = _run(tmp_path, tmp_path, root, "note", json_output=False)
    on_disk = _run(tmp_path, tmp_path, root, "note", json_output=False, on_disk=True)

    assert "SOURCE" in full.stdout and full.stdout.count("generated") == 1, full.stdout
    mirror = next(line for line in full.stdout.splitlines() if "Assets:Mirror" in line)
    written = next(line for line in full.stdout.splitlines() if "Assets:Cash" in line)
    assert "generated" in mirror and "generated" not in written, full.stdout
    assert "Assets:Cash" in on_disk.stdout and "Assets:Mirror" not in on_disk.stdout, on_disk.stdout
    assert "SOURCE" not in on_disk.stdout and "generated" not in on_disk.stdout, on_disk.stdout
    assert _snapshot(root) == before
