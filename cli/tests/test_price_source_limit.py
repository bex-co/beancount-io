"""A managed price include past the 16-source limit is reported as such (w5/190).

The 17th source was dropped silently: Beancount then read its URL as a file
glob that "does not match any files" at `<load>:0`, `price status` did not
list it, and `price export` exited 0 leaving the URL include in a copy meant
for stock tools. The feed here is a loopback simulation allowed through
`MANAGED_PRICE_ORIGINS`.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import threading
import time
from collections.abc import Iterator
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

LEDGER = """\
option "operating_currency" "USD"
2024-01-01 open Assets:Cash USD
2024-01-01 open Assets:Coin BTC
2024-01-01 open Equity:Opening
2024-01-01 commodity BTC
2024-01-01 commodity USD

2024-01-02 * "Open"
  Assets:Cash  10000.00 USD
  Equity:Opening

2024-01-03 * "Buy"
  Assets:Coin  2 BTC {1000.00 USD}
  Assets:Cash  -2000.00 USD
"""
FIRST_INCLUDE_LINE = LEDGER.count("\n") + 1


class _Feeds(ThreadingHTTPServer):
    hits: list[str]
    # The default backlog is 5: the CLI fetches sources concurrently, and macOS refuses
    # the overflow instead of queueing it, which failed these tests for a reason that
    # has nothing to do with the limit.
    request_queue_size = 64


class _Handler(BaseHTTPRequestHandler):
    def log_message(self, *args: object) -> None:
        pass

    def do_GET(self) -> None:
        assert isinstance(self.server, _Feeds)
        self.server.hits.append(self.path)
        # Observed now, so a served feed reads `recent` and strict mode passes it.
        stamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        body = f'2024-01-05 price BTC 1100.00 USD\n  observed-at: "{stamp}"\n'.encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


@pytest.fixture
def feeds() -> Iterator[_Feeds]:
    server = _Feeds(("127.0.0.1", 0), _Handler)
    server.hits = []
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield server
    server.shutdown()
    thread.join(timeout=5)
    server.server_close()


def _origin(feeds: _Feeds) -> str:
    return f"http://127.0.0.1:{feeds.server_port}"


def _ledger(tmp_path: Path, feeds: _Feeds, count: int) -> Path:
    books = tmp_path / "books"
    books.mkdir()
    includes = "".join(f'include "{_origin(feeds)}/prices/C{index}"\n' for index in range(1, count + 1))
    (books / "main.bean").write_text(LEDGER + includes)
    return books


def _bea(tmp_path: Path, feeds: _Feeds, *args: str) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_") and k != "CI"}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        MANAGED_PRICE_ORIGINS=_origin(feeds),
        PYTHONPATH=str(ROOT / "src"),
        NO_COLOR="1",
    )
    return subprocess.run(
        [sys.executable, "-m", "cli.main", "-f", "main.bean", *args],
        env=env,
        cwd=tmp_path / "books",
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=60,
    )


def test_check_names_the_over_limit_include_and_the_limit(tmp_path: Path, feeds: _Feeds) -> None:
    books = _ledger(tmp_path, feeds, 17)

    result = _bea(tmp_path, feeds, "check")

    seventeenth = f"{_origin(feeds)}/prices/C17"
    text = " ".join((result.stdout + result.stderr).split())
    assert result.returncode == 1
    assert f"main.bean:{FIRST_INCLUDE_LINE + 16}" in text
    assert f'include "{seventeenth}"' in text
    assert "limit of 16 managed price sources" in text
    assert "File glob" not in text
    assert "<load>" not in text
    # Refused before any network call, and the customer's file is untouched.
    assert "/prices/C17" not in feeds.hits
    assert len(feeds.hits) == 16
    assert f'include "{seventeenth}"' in (books / "main.bean").read_text()


def test_status_lists_the_over_limit_source(tmp_path: Path, feeds: _Feeds) -> None:
    _ledger(tmp_path, feeds, 17)

    result = _bea(tmp_path, feeds, "--json", "price", "status")

    sources = json.loads(result.stdout)["data"]["sources"]
    assert [source["alias"] for source in sources] == [f"C{index}" for index in range(1, 18)]
    assert [source["freshness"] for source in sources[:16]] == ["recent"] * 16
    assert sources[16]["freshness"] == "unavailable"
    assert sources[16]["revision"] is None
    assert "limit of 16" in sources[16]["error"]
    assert [include["line"] for include in sources[16]["included_from"]] == [FIRST_INCLUDE_LINE + 16]


def test_export_refuses_the_over_limit_source(tmp_path: Path, feeds: _Feeds) -> None:
    books = _ledger(tmp_path, feeds, 17)

    result = _bea(tmp_path, feeds, "price", "export")

    assert result.returncode != 0
    assert "C17" in result.stderr
    assert "--allow-errors" in result.stderr
    assert not (books / "main-export").exists()


def test_export_allow_errors_carries_the_marker_alone(tmp_path: Path, feeds: _Feeds) -> None:
    books = _ledger(tmp_path, feeds, 17)

    result = _bea(tmp_path, feeds, "price", "export", "--allow-errors")

    assert result.returncode == 0, result.stderr
    exported = (books / "main-export" / "main.bean").read_text()
    assert 'include "http' not in exported
    assert 'include "prices/C17.beancount"' in exported
    marker = (books / "main-export" / "prices" / "C17.beancount").read_text()
    assert "; bea-managed-error: over the limit of 16" in marker
    assert "price BTC" not in marker
    stock = subprocess.run(
        [sys.executable, "-m", "beancount.scripts.check", str(books / "main-export" / "main.bean")],
        capture_output=True,
        text=True,
        timeout=60,
    )
    assert stock.returncode == 0, stock.stderr


def test_strict_prices_fails_the_load_naming_the_limit(tmp_path: Path, feeds: _Feeds) -> None:
    _ledger(tmp_path, feeds, 17)

    result = _bea(tmp_path, feeds, "--strict-prices", "check")

    text = " ".join(result.stderr.split())
    assert result.returncode != 0
    assert f"{_origin(feeds)}/prices/C17 is unavailable in strict mode" in text
    assert "limit of 16" in text


def test_sixteen_sources_are_unchanged(tmp_path: Path, feeds: _Feeds) -> None:
    books = _ledger(tmp_path, feeds, 16)

    check = _bea(tmp_path, feeds, "check")
    status = _bea(tmp_path, feeds, "--json", "price", "status")
    export = _bea(tmp_path, feeds, "price", "export")

    assert check.returncode == 0, check.stdout + check.stderr
    sources = json.loads(status.stdout)["data"]["sources"]
    assert len(sources) == 16
    assert all(source["error"] is None and source["freshness"] == "recent" for source in sources)
    assert export.returncode == 0, export.stderr
    assert "Exported 17 files" in export.stdout
    assert 'include "http' not in (books / "main-export" / "main.bean").read_text()
