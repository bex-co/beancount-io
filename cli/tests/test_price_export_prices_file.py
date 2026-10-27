"""`price export` plans its feed directory around the ledger's own files (w5/191).

The generated feeds go in `prices/`. A ledger that includes a file literally
named `prices` has that file copied to the same path, and nothing on disk
stood in the way before the first write: the copy was written, `mkdir` then
failed, and the export exited 1 with a bare `FileExistsError`, leaving a
snapshot whose feed include did not exist.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

from tests.test_price import _run_bea
from tests.test_price import feed_server as feed_server

MANUAL = "2026-03-01 price BTC 1700.00 USD\n"
MAIN = """\
option "operating_currency" "USD"
2026-01-01 open Assets:Wallet BTC
2026-01-01 open Equity:Opening
2026-01-02 * "Open"
  Assets:Wallet  2 BTC {{50000 USD}}
  Equity:Opening
include "{feed}/prices/BTC-USD"
"""


def _books(tmp_path: Path, feed_server: str, *names: str) -> Path:
    books = tmp_path / "books"
    books.mkdir()
    for name in names:
        (books / name).write_text(MANUAL)
    includes = "".join(f'include "{name}"\n' for name in names)
    (books / "main.bean").write_text(MAIN.format(feed=feed_server) + includes)
    return books / "main.bean"


def _export(tmp_path: Path, feed_server: str, ledger: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return _run_bea(tmp_path, feed_server, "--json", "--file", str(ledger), "price", "export", *args)


def _files(directory: Path) -> set[str]:
    return {str(path.relative_to(directory)) for path in directory.rglob("*") if path.is_file()}


def _stock_check(target: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "beancount.scripts.check", str(target)], capture_output=True, text=True, timeout=60
    )


@pytest.mark.parametrize(
    ("names", "feed"),
    [
        (("manual",), "prices/BTC-USD.beancount"),
        (("prices",), "prices-managed/BTC-USD.beancount"),
        (("prices", "prices-managed"), "prices-managed-2/BTC-USD.beancount"),
    ],
    ids=["control", "prices", "prices-and-managed"],
)
def test_the_feed_directory_moves_off_an_included_file(
    feed_server: str, tmp_path: Path, names: tuple[str, ...], feed: str
) -> None:
    ledger = _books(tmp_path, feed_server, *names)
    # The default destination, as in the report: `books/main-export`.
    out = ledger.parent / "main-export"

    exported = _export(tmp_path, feed_server, ledger)

    assert exported.returncode == 0, exported.stderr or exported.stdout
    assert "FileExistsError" not in exported.stderr
    assert _files(out) == {"main.bean", feed, *names}
    for name in names:
        assert (out / name).read_text() == MANUAL
    assert f'include "{feed}"' in (out / "main.bean").read_text()
    assert _stock_check(out / "main.bean").returncode == 0
    listed = _run_bea(tmp_path, feed_server, "--file", str(out / "main.bean"), "list", "price")
    assert listed.returncode == 0, listed.stderr
    assert "1700.00 USD" in listed.stdout and "112000.00 USD" in listed.stdout


def test_a_copied_file_where_another_copy_needs_a_directory_refuses_before_any_write(
    feed_server: str, tmp_path: Path
) -> None:
    # `_shared` is where includes from outside the root's directory are gathered.
    ledger = _books(tmp_path, feed_server, "_shared")
    (tmp_path / "outside.bean").write_text("2026-01-01 open Assets:Cash USD\n")
    with ledger.open("a") as handle:
        handle.write('include "../outside.bean"\n')
    out = tmp_path / "out"

    for _ in range(2):
        exported = _export(tmp_path, feed_server, ledger, "--output", str(out), "--force")
        assert exported.returncode == 2, exported.stderr or exported.stdout
        assert exported.stdout == ""
        message = str(json.loads(exported.stderr)["error"]["message"])
        assert str(out / "_shared") in message
        assert "Nothing was written" in message
        assert "FileExistsError" not in message
        assert not out.exists()


def test_the_feed_directory_moves_off_a_copied_plugin_package(feed_server: str, tmp_path: Path) -> None:
    """A feed written into a plugin package named `prices` became one of its resources (w5/1017)."""
    ledger = _books(tmp_path, feed_server)
    (ledger.parent / "prices").mkdir()
    (ledger.parent / "prices" / "__init__.py").write_text(
        '__plugins__ = ("run",)\ndef run(entries, options):\n    return entries, []\n'
    )
    (ledger.parent / "prices" / "local.beancount").write_text(MANUAL)
    ledger.write_text('option "insert_pythonpath" "TRUE"\nplugin "prices"\n' + ledger.read_text())
    out = ledger.parent / "main-export"

    exported = _export(tmp_path, feed_server, ledger)

    assert exported.returncode == 0, exported.stderr or exported.stdout
    assert _files(out) == {
        "main.bean",
        "prices/__init__.py",
        "prices/local.beancount",
        "prices-managed/BTC-USD.beancount",
    }
