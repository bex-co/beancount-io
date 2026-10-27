"""Live-price provenance in holdings and register (w22/m3/t004).

Holdings groups name the managed source behind each quote, reusing the
w5/m7 provenance fields; a value from a stale quote is labelled in text
and JSON. The register carries the same envelope, so its heading names
stale sources like every report. Feeds are served locally: one revision
observed long ago (stale), one observed just now (recent).
"""

from __future__ import annotations

import datetime
import json
import os
import subprocess
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

import pytest

ROOT = Path(__file__).resolve().parents[1]

STALE_FEED = """\
; alias: VTI-USD
; commodity: VTI
; quote: USD
; source: fixture
; revision: r1
2026-01-10 price VTI 170.00 USD
  price-source: "fixture"
  observed-at: "2026-01-10T00:00:00Z"
"""

FX_FEED = """\
; alias: EUR-USD
; commodity: EUR
; quote: USD
; source: fixture
; revision: r7
2026-01-10 price EUR 1.10 USD
  price-source: "fixture"
  observed-at: "2026-01-10T00:00:00Z"
"""


def _fresh_feed() -> str:
    seen = datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    return f"""\
; alias: VTI-USD
; commodity: VTI
; quote: USD
; source: fixture
; revision: r2
2026-01-10 price VTI 170.00 USD
  price-source: "fixture"
  observed-at: "{seen}"
"""


class _FeedHandler(BaseHTTPRequestHandler):
    routes: dict[str, bytes] = {}

    def log_message(self, *args: object) -> None:
        pass

    def do_GET(self) -> None:
        body = type(self).routes.get(self.path)
        if body is None:
            self.send_response(404)
            self.end_headers()
            return
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


class _FeedServer:
    """The fixture server's base URL plus per-test routes (a feed alias must match its URL tail)."""

    def __init__(self, base: str):
        self.base = base

    def serve(self, bodies: dict[str, str]) -> str:
        _FeedHandler.routes = {path: body.encode() for path, body in bodies.items()}
        return self.base


@pytest.fixture
def feed_server() -> Any:
    server = ThreadingHTTPServer(("127.0.0.1", 0), _FeedHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield _FeedServer(f"http://127.0.0.1:{server.server_port}")
    server.shutdown()
    thread.join(timeout=5)


def _env(tmp_path: Path, origin: str) -> dict[str, str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        XDG_DATA_HOME=str(tmp_path / "data"),
        BEA_NO_UPDATE_NOTIFIER="1",
        MANAGED_PRICE_ORIGINS=origin,
        PYTHONPATH=str(ROOT / "src"),
        TERM="dumb",
        NO_COLOR="1",
    )
    return env


def _bea(tmp_path: Path, origin: str, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=_env(tmp_path, origin),
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=300,
        check=False,
    )


def _ledger(server: str, path: str = "/prices/VTI-USD") -> str:
    return f"""\
option "operating_currency" "USD"
include "{server}{path}"
2026-01-01 open Assets:Brokerage USD,VTI
2026-01-01 open Assets:Checking USD
2026-01-02 * "Buy"
  Assets:Brokerage  10 VTI {{150 USD}}
  Assets:Checking
"""


def _fx_ledger(server: str) -> str:
    return f"""\
option "operating_currency" "USD"
include "{server}/prices/VTI-USD"
include "{server}/prices/EUR-USD"
2026-01-01 open Assets:Brokerage EUR,VTI,USD
2026-01-01 open Assets:Checking USD,EUR
2026-01-02 * "Buy"
  Assets:Brokerage  10 VTI {{140 EUR}}
  Assets:Checking
2026-01-10 price VTI 150 EUR
"""


def _write(tmp_path: Path, text: str) -> Path:
    ledger = tmp_path / "main.beancount"
    ledger.write_text(text)
    return ledger


def test_holdings_json_names_the_stale_source(feed_server: _FeedServer, tmp_path: Path) -> None:
    server = feed_server.serve({"/prices/VTI-USD": STALE_FEED})
    ledger = _write(tmp_path, _ledger(server))
    proc = _bea(tmp_path, server, "--file", str(ledger), "--json", "report", "holdings")
    assert proc.returncode == 0, proc.stderr
    data = json.loads(proc.stdout)["data"]
    (group,) = data["groups"]
    (source,) = data["price_sources"]
    assert group["price_source"] == {
        "alias": "VTI-USD",
        "freshness": "stale",
        "observed_at": "2026-01-10T00:00:00Z",
        "revision": source["revision"],
    }
    assert group["conversion_source"] is None


def test_holdings_text_labels_the_stale_value(feed_server: _FeedServer, tmp_path: Path) -> None:
    server = feed_server.serve({"/prices/VTI-USD": STALE_FEED})
    ledger = _write(tmp_path, _ledger(server))
    proc = _bea(tmp_path, server, "--file", str(ledger), "report", "holdings")
    assert proc.returncode == 0, proc.stderr
    assert "1,700 USD (stale)" in proc.stdout
    assert "Price source VTI-USD: stale" in proc.stderr


def test_holdings_recent_quote_is_not_labelled(feed_server: _FeedServer, tmp_path: Path) -> None:
    server = feed_server.serve({"/prices/VTI-USD": _fresh_feed()})
    ledger = _write(tmp_path, _ledger(server))
    proc = _bea(tmp_path, server, "--file", str(ledger), "report", "holdings")
    assert proc.returncode == 0, proc.stderr
    assert "(stale)" not in proc.stdout
    assert "1,700 USD" in proc.stdout


def test_holdings_ledger_quote_has_no_source(feed_server: _FeedServer, tmp_path: Path) -> None:
    server = feed_server.serve({"/prices/VTI-USD": STALE_FEED})
    text = _ledger(server).replace(f'include "{server}/prices/VTI-USD"\n', "")
    text += "2026-01-10 price VTI 170 USD\n"
    ledger = _write(tmp_path, text)
    proc = _bea(tmp_path, server, "--file", str(ledger), "--json", "report", "holdings")
    assert proc.returncode == 0, proc.stderr
    (group,) = json.loads(proc.stdout)["data"]["groups"]
    assert group["price_source"] is None
    assert group["market_value"] == {"number": "1700", "currency": "USD"}


def test_holdings_stale_conversion_leg_taints_the_value(feed_server: _FeedServer, tmp_path: Path) -> None:
    server = feed_server.serve({"/prices/EUR-USD": FX_FEED})
    # No VTI quote in USD, so the value goes through the EUR leg; with one, the
    # direct quote would value the lot instead (w5/1033).
    ledger = _write(tmp_path, _fx_ledger(server).replace(f'include "{server}/prices/VTI-USD"\n', ""))
    proc = _bea(tmp_path, server, "--file", str(ledger), "report", "holdings")
    assert proc.returncode == 0, proc.stderr
    assert "1,650.00 USD (stale)" in proc.stdout
    as_json = _bea(tmp_path, server, "--file", str(ledger), "--json", "report", "holdings")
    payload = json.loads(as_json.stdout)["data"]
    (group,) = payload["groups"]
    (fx,) = [source for source in payload["price_sources"] if source["alias"] == "EUR-USD"]
    assert group["price_source"] is None
    assert group["conversion_source"] == {
        "alias": "EUR-USD",
        "freshness": "stale",
        "observed_at": "2026-01-10T00:00:00Z",
        "revision": fx["revision"],
    }


def test_register_carries_source_provenance(feed_server: _FeedServer, tmp_path: Path) -> None:
    server = feed_server.serve({"/prices/VTI-USD": STALE_FEED})
    ledger = _write(tmp_path, _ledger(server))
    proc = _bea(tmp_path, server, "--file", str(ledger), "--json", "report", "register", "Assets")
    assert proc.returncode == 0, proc.stderr
    sources = json.loads(proc.stdout)["data"]["price_sources"]
    assert [(source["alias"], source["freshness"]) for source in sources] == [("VTI-USD", "stale")]
    text = _bea(tmp_path, server, "--file", str(ledger), "report", "register", "Assets")
    assert text.returncode == 0, text.stderr
    assert "Price source VTI-USD: stale" in text.stderr


def test_holdings_prefers_a_direct_feed_over_the_cost_currency_route(feed_server: _FeedServer, tmp_path: Path) -> None:
    server = feed_server.serve({"/prices/VTI-USD": STALE_FEED, "/prices/EUR-USD": FX_FEED})
    ledger = _write(tmp_path, _fx_ledger(server))
    as_json = _bea(tmp_path, server, "--file", str(ledger), "--json", "report", "holdings")
    (group,) = json.loads(as_json.stdout)["data"]["groups"]
    assert group["market_value"] == {"number": "1700.00", "currency": "USD"}
    assert group["price_source"]["alias"] == "VTI-USD"
