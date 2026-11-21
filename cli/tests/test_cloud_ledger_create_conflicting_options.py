"""`cloud ledger create` refuses conflicting options before any request (w5/623).

`--private --public` created a public ledger (the last flag won), `-d a -d b`
kept `b`, and `--dir` without `--clone` created the ledger and cloned
nothing, unsaid. The help promises a mistyped flag cannot put someone's
finances on the open internet.

The setup options follow the same rule (w1/352): signed out, a `--module`
without `--preset` said "Not logged in", so a device login ended in a usage
error; signed in, `--currency eur` reached the server as typed.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import threading
from collections.abc import Iterator
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]


class _Stub(BaseHTTPRequestHandler):
    received: list[str] = []

    def do_POST(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler's spelling
        body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        type(self).received.append(body.decode())
        payload = json.dumps(
            {
                "success": True,
                "data": {
                    "name": "qa-x",
                    "fullName": "me/qa-x",
                    "private": False,
                    "httpUrl": "https://x",
                    "sshUrl": "git@x:me/qa-x.git",
                },
            }
        ).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, *args: object) -> None:
        pass


@pytest.fixture
def stub() -> Iterator[str]:
    _Stub.received = []
    server = ThreadingHTTPServer(("127.0.0.1", 0), _Stub)
    threading.Thread(target=server.serve_forever, kwargs={"poll_interval": 0.01}, daemon=True).start()
    try:
        yield f"http://127.0.0.1:{server.server_address[1]}"
    finally:
        server.shutdown()
        server.server_close()


def _create(tmp_path: Path, url: str, *args: str, signed_in: bool = True) -> subprocess.CompletedProcess[str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_") and not k.lower().endswith("_proxy")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        BEA_NO_UPDATE_NOTIFIER="1",
        BEA_API_URL=url,
        PYTHONPATH=str(ROOT / "src"),
        NO_COLOR="1",
    )
    if signed_in:
        env["BEA_TOKEN"] = "test-token"
    return subprocess.run(
        [sys.executable, "-m", "cli.main", "--no-input", "cloud", "ledger", "create", "qa-x", *args],
        env=env,
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=60,
        stdin=subprocess.DEVNULL,
        check=False,
    )


@pytest.mark.parametrize(
    ("args", "said"),
    [
        (["--private", "--public"], "Pass --private or --public, not both"),
        (["-d", "a", "-d", "b"], "Conflicting values for one option: -d 'a' and -d 'b'"),
        (["--dir", "books"], "--dir is where --clone puts the new ledger; add --clone, or drop --dir"),
    ],
    ids=["visibility-pair", "two-descriptions", "dir-without-clone"],
)
def test_conflicting_options_are_refused_before_any_request(
    tmp_path: Path, stub: str, args: list[str], said: str
) -> None:
    result = _create(tmp_path, stub, *args)

    assert result.returncode == 2, result.stdout + result.stderr
    assert said in " ".join(result.stderr.split())
    assert _Stub.received == []


def test_one_visibility_flag_still_sends_the_request(tmp_path: Path, stub: str) -> None:
    """The control: the stub sees the create (its reply shape is not what this test is about)."""
    result = _create(tmp_path, stub, "--public")

    assert "not both" not in result.stderr
    (body,) = _Stub.received
    assert json.loads(body)["private"] is False


_SETUP_MISTAKES = [
    (["--title", "Books"], "only meaningful with --preset"),
    (["--currency", "EUR"], "only meaningful with --preset"),
    (["--date", "2026-01-01"], "only meaningful with --preset"),
    (["--preset", "nope@1"], "--preset 'nope@1': Unknown preset"),
    (["--module", "investments@1"], "add --preset personal@1"),
    (["--preset", "personal@1", "--module", "nope@1"], "--module 'nope@1': Unknown module"),
    (["--preset", "personal@1", "--module", "investments@1", "--module", "investments@1"], "more than once"),
    (["--preset", "personal@1", "--property-name", "OakSt"], "add --module rental-property@1"),
    (["--preset", "personal@1", "--module", "rental-property@1", "--property-name", "Oak_St"], "'Oak_St'"),
    (["--preset", "personal@1", "--currency", "BTC"], "Unsupported operating currency 'BTC' for a preset ledger"),
    (["--preset", "personal@1", "--date", "2026-02-30"], "'2026-02-30': not a calendar date"),
]
_SETUP_IDS = [
    "title-without-preset",
    "currency-without-preset",
    "date-without-preset",
    "unknown-preset",
    "module-without-preset",
    "unknown-module",
    "repeated-module",
    "property-name-without-rental",
    "property-name-not-a-component",
    "unsupported-currency",
    "not-a-calendar-date",
]


@pytest.mark.parametrize("signed_in", [False, True], ids=["signed-out", "signed-in"])
@pytest.mark.parametrize(("args", "said"), _SETUP_MISTAKES, ids=_SETUP_IDS)
def test_setup_mistakes_are_refused_before_credentials_and_any_request(
    tmp_path: Path, stub: str, args: list[str], said: str, signed_in: bool
) -> None:
    result = _create(tmp_path, stub, *args, signed_in=signed_in)

    assert result.returncode == 2, result.stdout + result.stderr
    assert said in " ".join(result.stderr.split())
    assert "Not logged in" not in result.stderr
    assert _Stub.received == []


def test_preset_currency_is_sent_as_init_reads_it(tmp_path: Path, stub: str) -> None:
    """`bea init --preset` turns `eur` into `EUR`; the server accepts only the uppercase form."""
    result = _create(tmp_path, stub, "--preset", "personal@1", "--currency", "eur", "--date", "2026-01-01")

    (body,) = _Stub.received
    setup = json.loads(body)["setup"]
    assert setup["operatingCurrency"] == "EUR", result.stderr
    assert setup["historyStart"] == "2026-01-01"
