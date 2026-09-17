"""`bea price` delegates to bean-price; `bea add price` stays a supplied-quote write.

The managed-price half pins the ADR 015 mirror: the URL policy, the bounded
fetch, and price-only validation (w1/m29/t001). Fetch tests run against a
thread-local fixture server; t006 grows that server into the full failure-mode
suite.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import textwrap
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

import pytest
from typer.testing import CliRunner

from bea_engine.managed_price_cache import (
    PriceFeedBlob,
    feed_dir,
    freshness,
    resolve_feed,
    zero_next_refresh,
)
from bea_engine.managed_prices import (
    AllowedUrl,
    FeedSummary,
    FetchedFeed,
    FetchFailed,
    InvalidFeed,
    ManagedPriceBudget,
    NotModified,
    RefusedUrl,
    ValidFeed,
    check_feed_identity,
    feed_revision_id,
    fetch_managed_price_feed,
    parse_managed_price_url,
    validate_managed_price_text,
)
from bea_engine.protocol import LedgerError
from cli.main import app

runner = CliRunner()
SOURCE_ROOT = Path(__file__).resolve().parents[1] / "src"

FAKE_SOURCE = textwrap.dedent(
    '''\
    """Deterministic bean-price source for tests — no live market access."""
    from __future__ import annotations

    import datetime
    from decimal import Decimal

    from dateutil import tz

    from beanprice.source import SourcePrice


    class Source:
        def get_latest_price(self, ticker: str):
            if ticker == "FAIL":
                raise ValueError(f"provider error for {ticker}")
            if ticker == "NONE":
                return None
            return SourcePrice(
                Decimal("185.50"),
                datetime.datetime(2024, 6, 15, 16, 0, 0, tzinfo=tz.tzutc()),
                "USD",
            )

        def get_historical_price(self, ticker: str, time: datetime.datetime):
            if ticker == "FAIL":
                raise ValueError(f"provider error for {ticker}")
            if ticker == "NONE":
                return None
            return SourcePrice(
                Decimal("100.25"),
                datetime.datetime(time.year, time.month, time.day, 16, 0, 0, tzinfo=tz.tzutc()),
                "USD",
            )
    '''
)


def _install_fake_source(directory: Path) -> Path:
    package = directory / "bea_test_price"
    package.mkdir()
    (package / "__init__.py").write_text("")
    (package / "source.py").write_text(FAKE_SOURCE)
    return package


class TestPriceFeatureGate:
    def test_missing_feature_points_at_engine_enable(self) -> None:
        result = runner.invoke(app, ["price", "-e", "yahoo/AAPL", "--no-cache"])
        assert result.exit_code == 2, result.output
        assert "bea engine enable beanprice" in result.output

    def test_frontend_never_imports_beanprice_on_price_help(self) -> None:
        script = (
            "import json, sys\n"
            "from typer.testing import CliRunner\n"
            "from cli.main import app\n"
            "result = CliRunner().invoke(app, ['price', '--help'])\n"
            "loaded = [m for m in ('beancount', 'beanprice', 'beangulp', 'bea_engine') if m in sys.modules]\n"
            "print(json.dumps({'exit_code': result.exit_code, 'loaded': loaded, 'output': result.output}))\n"
        )
        completed = subprocess.run(
            [sys.executable, "-c", script],
            capture_output=True,
            text=True,
            check=True,
            cwd=SOURCE_ROOT.parent,
            env={**os.environ, "PYTHONPATH": str(SOURCE_ROOT)},
        )
        answered = json.loads(completed.stdout)
        assert answered["exit_code"] == 0, answered["output"]
        assert answered["loaded"] == []


@pytest.mark.usefixtures("use_optional_engine")
class TestPriceDelegation:
    def test_current_quote_from_local_fixture(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        _install_fake_source(tmp_path)
        monkeypatch.setenv(
            "PYTHONPATH",
            os.pathsep.join([str(tmp_path), os.environ.get("PYTHONPATH", "")]).rstrip(os.pathsep),
        )
        result = runner.invoke(
            app,
            ["price", "--no-cache", "-e", "USD:bea_test_price.source/HOOL"],
        )
        assert result.exit_code == 0, result.output
        assert "price HOOL" in result.output
        assert "185.50" in result.output
        assert "USD" in result.output

    def test_historical_quote_from_local_fixture(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        _install_fake_source(tmp_path)
        monkeypatch.setenv(
            "PYTHONPATH",
            os.pathsep.join([str(tmp_path), os.environ.get("PYTHONPATH", "")]).rstrip(os.pathsep),
        )
        result = runner.invoke(
            app,
            ["price", "--no-cache", "-d", "2020-01-15", "-e", "USD:bea_test_price.source/HOOL"],
        )
        assert result.exit_code == 0, result.output
        assert "price HOOL" in result.output
        assert "100.25" in result.output

    def test_provider_error_is_surfaced(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        _install_fake_source(tmp_path)
        monkeypatch.setenv(
            "PYTHONPATH",
            os.pathsep.join([str(tmp_path), os.environ.get("PYTHONPATH", "")]).rstrip(os.pathsep),
        )
        result = runner.invoke(
            app,
            ["price", "--no-cache", "-e", "USD:bea_test_price.source/FAIL"],
        )
        assert result.exit_code != 0, result.output
        assert "provider error for FAIL" in result.output

    def test_inverted_source_emits_inverted_rate(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        _install_fake_source(tmp_path)
        monkeypatch.setenv(
            "PYTHONPATH",
            os.pathsep.join([str(tmp_path), os.environ.get("PYTHONPATH", "")]).rstrip(os.pathsep),
        )
        result = runner.invoke(
            app,
            ["price", "--no-cache", "-e", "USD:bea_test_price.source/^HOOL"],
        )
        assert result.exit_code == 0, result.output
        assert "price HOOL" in result.output
        assert "185.50" not in result.output
        assert "0.005" in result.output

    def test_add_price_still_records_a_supplied_quote_without_beanprice(
        self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.delenv("BEA_ENGINE_PYTHON", raising=False)
        book = tmp_path / "main.bean"
        init = runner.invoke(app, ["--json", "init", str(tmp_path), "--currency", "USD", "--date", "2024-01-01"])
        assert init.exit_code == 0, init.output
        result = runner.invoke(
            app,
            [
                "--json",
                "--file",
                str(book),
                "add",
                "price",
                "--currency",
                "HOOL",
                "--date",
                "2024-06-15",
                "--amount",
                "185.50 USD",
            ],
        )
        assert result.exit_code == 0, result.output
        assert "2024-06-15 price HOOL" in book.read_text()
        assert "185.50 USD" in book.read_text()


@pytest.mark.usefixtures("use_optional_engine")
def test_json_price_refuses_before_fetching_a_quote(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    _install_fake_source(tmp_path)
    monkeypatch.setenv("PYTHONPATH", str(tmp_path))
    result = runner.invoke(app, ["--json", "price", "--no-cache", "-e", "USD:bea_test_price.source/HOOL"])
    assert result.exit_code == 2, result.output
    assert result.stdout == ""
    error = json.loads(result.stderr)["error"]
    assert error["category"] == "usage"
    assert "bea price has no JSON output" in error["message"]


# --------------------------------------------------------------------------- #
# Managed price includes (ADR 015 mirror, w1/m29/t001)
# --------------------------------------------------------------------------- #

FEED = """\
; alias: BTC-USD
; commodity: BTC
; quote: USD
; source: fixture
; revision: r1
2026-09-10 price BTC 112000.00 USD
  price-source: "fixture"
  observed-at: "2026-09-10T00:00:00Z"
2026-09-11 price BTC 113500.50 USD
  price-source: "fixture"
  observed-at: "2026-09-11T00:00:00Z"
"""


class TestManagedPricePolicy:
    def test_allowlisted_feed_url_is_allowed(self) -> None:
        decision = parse_managed_price_url("https://beancount.io/prices/BTC-USD")

        assert isinstance(decision, AllowedUrl)
        assert decision.url == "https://beancount.io/prices/BTC-USD"
        assert decision.alias == "BTC-USD"

    def test_explicit_default_port_is_allowed(self) -> None:
        decision = parse_managed_price_url("https://beancount.io:443/prices/BTC-USD")

        assert isinstance(decision, AllowedUrl)
        assert decision.url == "https://beancount.io/prices/BTC-USD"

    def test_operator_may_allowlist_a_plain_http_origin(self) -> None:
        decision = parse_managed_price_url("http://127.0.0.1:8901/prices/BTC-USD", origins=("http://127.0.0.1:8901",))

        assert isinstance(decision, AllowedUrl)
        assert decision.alias == "BTC-USD"

    def test_empty_allowlist_disables_the_feature(self) -> None:
        decision = parse_managed_price_url("https://beancount.io/prices/BTC-USD", origins=())

        assert isinstance(decision, RefusedUrl)
        assert "disabled" in decision.detail

    @pytest.mark.parametrize(
        ("target", "fragment"),
        [
            ("https://prices.example.com/prices/BTC-USD", "origin https://prices.example.com is not allowlisted"),
            ("https://beancount.io:8443/prices/BTC-USD", "origin https://beancount.io is not allowlisted"),
            ("https://user@beancount.io/prices/BTC-USD", "must not carry credentials"),
            ("https://beancount.io/prices/BTC-USD?at=now", "must not carry a query string or fragment"),
            ("https://beancount.io/prices/BTC-USD#frag", "must not carry a query string or fragment"),
            ("https://beancount.io/other/BTC-USD", "the path must be /prices/<ALIAS>"),
            ("https://beancount.io/prices/", "the path must be /prices/<ALIAS>"),
            ("https://beancount.io/prices/a/b", "the path must be /prices/<ALIAS>"),
            ("https://beancount.io/prices/" + "A" * 65, "the path must be /prices/<ALIAS>"),
            ("https://beancount.io/prices/BTC USD", "the path must be /prices/<ALIAS>"),
            ("prices/BTC-USD", "not a valid URL"),
            ("http://", "not a valid URL"),
        ],
    )
    def test_refusals_name_the_source_and_the_reason(self, target: str, fragment: str) -> None:
        decision = parse_managed_price_url(target)

        assert isinstance(decision, RefusedUrl)
        assert "not an allowed managed price source" in decision.detail
        assert fragment in decision.detail


class TestManagedPriceBudget:
    def test_sixteen_distinct_urls_then_refusal(self) -> None:
        budget = ManagedPriceBudget()

        for index in range(16):
            assert budget.claim(f"https://beancount.io/prices/FEED-{index}") is True
        assert budget.claim("https://beancount.io/prices/FEED-16") is False

    def test_repeated_url_does_not_spend_budget(self) -> None:
        budget = ManagedPriceBudget(limit=1)

        assert budget.claim("https://beancount.io/prices/BTC-USD") is True
        assert budget.claim("https://beancount.io/prices/BTC-USD") is True
        assert budget.claim("https://beancount.io/prices/ETH-USD") is False


class _FeedHandler(BaseHTTPRequestHandler):
    """Routes for the t001 fixture server; t006 extends the table."""

    routes: dict[str, dict[str, Any]] = {}
    seen_headers: dict[str, dict[str, str]] = {}
    hits: list[str] = []

    def log_message(self, *args: object) -> None:
        pass

    def do_GET(self) -> None:
        type(self).hits.append(self.path)
        type(self).seen_headers[self.path] = {key.lower(): value for key, value in self.headers.items()}
        route = type(self).routes.get(self.path)
        if route is None:
            self.send_response(404)
            self.end_headers()
            return
        if "sleep" in route:
            time.sleep(route["sleep"])
        if route.get("etag_match") and self.headers.get("If-None-Match") == route["etag"]:
            self.send_response(304)
            self.end_headers()
            return
        self.send_response(route.get("status", 200))
        for key, value in route.get("headers", {}).items():
            self.send_header(key, value)
        body = route.get("body", b"")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


@pytest.fixture
def feed_server() -> Any:
    _FeedHandler.routes = {
        "/prices/BTC-USD": {
            "body": FEED.encode("utf-8"),
            "headers": {"Content-Type": "text/plain; charset=utf-8", "ETag": '"r1"'},
            "etag": '"r1"',
            "etag_match": True,
        },
        "/prices/REDIRECT": {"status": 302, "headers": {"Location": "/prices/BTC-USD"}, "body": b""},
        "/prices/RATE-LIMITED": {"status": 429, "headers": {"Retry-After": "120"}, "body": b"slow down"},
        "/prices/HUGE": {"body": b"x" * 300},
        "/prices/SLOW": {"body": FEED.encode("utf-8"), "sleep": 3},
        "/prices/BINARY": {"body": b"\xff\xfe\x00price"},
    }
    _FeedHandler.hits = []
    _FeedHandler.seen_headers = {}
    server = ThreadingHTTPServer(("127.0.0.1", 0), _FeedHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield f"http://127.0.0.1:{server.server_port}"
    server.shutdown()
    thread.join(timeout=5)


class TestManagedPriceFetch:
    def test_fetch_returns_text_and_etag(self, feed_server: str) -> None:
        result = fetch_managed_price_feed(f"{feed_server}/prices/BTC-USD")

        assert isinstance(result, FetchedFeed)
        assert result.text == FEED
        assert result.etag == '"r1"'

    def test_unchanged_feed_answers_not_modified(self, feed_server: str) -> None:
        result = fetch_managed_price_feed(f"{feed_server}/prices/BTC-USD", etag='"r1"')

        assert isinstance(result, NotModified)

    def test_redirect_is_refused_not_followed(self, feed_server: str) -> None:
        result = fetch_managed_price_feed(f"{feed_server}/prices/REDIRECT")

        assert isinstance(result, FetchFailed)
        assert result.reason == "redirect"
        assert "302" in result.message
        assert "/prices/BTC-USD" not in _FeedHandler.hits

    def test_unknown_alias_reports_its_status(self, feed_server: str) -> None:
        result = fetch_managed_price_feed(f"{feed_server}/prices/NOPE")

        assert isinstance(result, FetchFailed)
        assert result.reason == "http"
        assert result.message == "HTTP 404"

    def test_rate_limit_carries_retry_after(self, feed_server: str) -> None:
        result = fetch_managed_price_feed(f"{feed_server}/prices/RATE-LIMITED")

        assert isinstance(result, FetchFailed)
        assert result.reason == "http"
        assert result.message == "HTTP 429 (retry after 120)"

    def test_oversized_body_is_abandoned(self, feed_server: str) -> None:
        result = fetch_managed_price_feed(f"{feed_server}/prices/HUGE", max_body_bytes=100)

        assert isinstance(result, FetchFailed)
        assert result.reason == "too-large"

    def test_slow_feed_times_out(self, feed_server: str) -> None:
        result = fetch_managed_price_feed(f"{feed_server}/prices/SLOW", timeout_seconds=1)

        assert isinstance(result, FetchFailed)
        assert result.reason == "timeout"

    def test_non_utf8_body_is_refused(self, feed_server: str) -> None:
        result = fetch_managed_price_feed(f"{feed_server}/prices/BINARY")

        assert isinstance(result, FetchFailed)
        assert result.reason == "not-utf8"

    def test_refused_connection_is_a_network_failure(self) -> None:
        result = fetch_managed_price_feed("http://127.0.0.1:1/prices/BTC-USD", timeout_seconds=2)

        assert isinstance(result, FetchFailed)
        assert result.reason == "network"

    def test_request_carries_no_credential_or_ledger_identity(self, feed_server: str) -> None:
        result = fetch_managed_price_feed(f"{feed_server}/prices/BTC-USD")

        assert isinstance(result, FetchedFeed)
        seen = _FeedHandler.seen_headers["/prices/BTC-USD"]
        assert seen["accept"] == "text/plain"
        assert "cookie" not in seen
        assert "authorization" not in seen


class TestManagedPriceValidation:
    def test_valid_feed_reports_its_summary(self) -> None:
        validation = validate_managed_price_text(FEED)

        assert isinstance(validation, ValidFeed)
        feed = validation.feed
        assert (feed.alias, feed.commodity, feed.quote) == ("BTC-USD", "BTC", "USD")
        assert (feed.source, feed.revision) == ("fixture", "r1")
        assert feed.latest_observed_at == "2026-09-11T00:00:00Z"
        assert [(point.line, point.date) for point in feed.prices] == [(6, "2026-09-10"), (9, "2026-09-11")]

    @pytest.mark.parametrize(
        ("line", "reason"),
        [
            ("2026-09-10 txn", "only price directives"),
            ("2026-09-10 open Assets:Cash", "only price directives"),
            ('option "title" "x"', "only price directives"),
            ("plugin beancount.plugin", "only price directives"),
            ('include "other.bean"', "only price directives"),
            ("2026-09-10 price BTC 0 USD", "finite positive decimal"),
            ("2026-09-10 price BTC 0.00 USD", "finite positive decimal"),
            ("2026-09-10 price USD 5 USD", "quotes USD in itself"),
            ("2026-13-10 price BTC 5 USD", "invalid date 2026-13-10"),
            ("2026-02-30 price BTC 5 USD", "invalid date 2026-02-30"),
        ],
    )
    def test_disallowed_lines_reject_the_whole_body(self, line: str, reason: str) -> None:
        validation = validate_managed_price_text(f"; alias: BTC-USD\n{line}\n")

        assert isinstance(validation, InvalidFeed)
        assert reason in validation.reason
        assert validation.line == 2

    def test_zero_directives_is_a_failure(self) -> None:
        validation = validate_managed_price_text("; alias: BTC-USD\n; nothing here\n\n")

        assert isinstance(validation, InvalidFeed)
        assert validation.reason == "no price directives"
        assert validation.line is None

    def test_mixed_pairs_are_rejected(self) -> None:
        text = "2026-09-10 price BTC 112000 USD\n2026-09-11 price ETH 4500 USD\n"

        validation = validate_managed_price_text(text)

        assert isinstance(validation, InvalidFeed)
        assert "mixed commodity pairs (BTC/USD and ETH/USD)" in validation.reason
        assert validation.line == 2

    @pytest.mark.parametrize(
        ("header", "reason"),
        [
            ("; commodity: ETH", "header commodity ETH does not match price directives (BTC)"),
            ("; quote: EUR", "header quote EUR does not match price directives (USD)"),
        ],
    )
    def test_header_pair_must_match_the_directives(self, header: str, reason: str) -> None:
        validation = validate_managed_price_text(f"{header}\n2026-09-10 price BTC 5 USD\n")

        assert isinstance(validation, InvalidFeed)
        assert validation.reason == reason

    def test_orphan_metadata_is_rejected(self) -> None:
        validation = validate_managed_price_text('  price-source: "x"\n2026-09-10 price BTC 5 USD\n')

        assert isinstance(validation, InvalidFeed)
        assert validation.reason == "metadata without a preceding price directive"
        assert validation.line == 1

    def test_disallowed_metadata_key_is_rejected(self) -> None:
        text = '2026-09-10 price BTC 5 USD\n  import-id: "x"\n'

        validation = validate_managed_price_text(text)

        assert isinstance(validation, InvalidFeed)
        assert validation.reason == "metadata key import-id is not allowed in a price feed"
        assert validation.line == 2

    def test_malformed_metadata_value_is_rejected(self) -> None:
        text = '2026-09-10 price BTC 5 USD\n  price-source: "unterminated\n'

        validation = validate_managed_price_text(text)

        assert isinstance(validation, InvalidFeed)
        assert "not a string, boolean, date, or number" in validation.reason

    def test_unparseable_observed_at_is_ignored_not_fatal(self) -> None:
        text = (
            "2026-09-10 price BTC 5 USD\n"
            '  observed-at: "whenever"\n'
            "2026-09-11 price BTC 6 USD\n"
            '  observed-at: "2026-09-11"\n'
        )

        validation = validate_managed_price_text(text)

        assert isinstance(validation, ValidFeed)
        assert validation.feed.latest_observed_at == "2026-09-11"

    def test_crlf_feeds_validate(self) -> None:
        validation = validate_managed_price_text(FEED.replace("\n", "\r\n"))

        assert isinstance(validation, ValidFeed)
        assert len(validation.feed.prices) == 2


class TestFeedIdentity:
    def test_wrong_header_alias_is_refused(self) -> None:
        validation = validate_managed_price_text(FEED)

        checked = check_feed_identity(validation, "ETH-USD", None)

        assert isinstance(checked, InvalidFeed)
        assert "feed alias BTC-USD does not match the requested ETH-USD" in checked.reason

    @pytest.mark.parametrize("header_alias", ["BTC-USD", "btc_usd", "BTCUSD"])
    def test_alias_agreement_ignores_case_and_separators(self, header_alias: str) -> None:
        validation = validate_managed_price_text(FEED.replace("BTC-USD", header_alias, 1))

        assert check_feed_identity(validation, "BTC-USD", None) == validation

    def test_changed_pair_is_refused(self) -> None:
        validation = validate_managed_price_text(FEED)

        checked = check_feed_identity(validation, "BTC-USD", ("BTC", "EUR"))

        assert isinstance(checked, InvalidFeed)
        assert "does not match the cached BTC/EUR" in checked.reason

    def test_matching_previous_pair_passes(self) -> None:
        validation = validate_managed_price_text(FEED)

        assert check_feed_identity(validation, "BTC-USD", ("BTC", "USD")) == validation

    def test_invalid_feeds_pass_through(self) -> None:
        validation = validate_managed_price_text("; nothing\n")

        assert check_feed_identity(validation, "BTC-USD", ("BTC", "USD")) == validation


class TestFeedRevisionId:
    def test_etag_is_sanitized_to_key_safe_characters(self) -> None:
        assert feed_revision_id('W/"abc-123_X.y"', "body") == "abc-123_X.y"

    def test_unusable_etag_falls_back_to_body_hash(self) -> None:
        assert feed_revision_id('"""', "body") == feed_revision_id(None, "body")
        assert len(feed_revision_id(None, "body")) == 64


# --------------------------------------------------------------------------- #
# Feed cache: immutable revisions, mutable head, offline and strict (t002)
# --------------------------------------------------------------------------- #


def _feed_text(*observed: str, revision: str = "r1") -> str:
    lines = [
        "; alias: BTC-USD",
        "; commodity: BTC",
        "; quote: USD",
        "; source: fixture",
        f"; revision: {revision}",
    ]
    for index, stamp in enumerate(observed):
        lines += [
            f"2026-09-{10 + index:02d} price BTC {112000 + index} USD",
            '  price-source: "fixture"',
            f'  observed-at: "{stamp}"',
        ]
    return "\n".join(lines) + "\n"


def _stamp(now: float) -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now))


def _resolve(
    feed_server: str,
    root: Path,
    *,
    path: str = "/prices/BTC-USD",
    alias: str = "BTC-USD",
    **kwargs: Any,
) -> Any:
    return resolve_feed(f"{feed_server}{path}", alias, root=root, **kwargs)


class TestFeedCache:
    def test_first_fetch_writes_blob_and_head(self, feed_server: str, tmp_path: Path) -> None:
        now = time.time()
        resolved = _resolve(feed_server, tmp_path, now=now)

        assert resolved.blob is not None
        assert resolved.blob.text == FEED
        assert resolved.blob.revision == "r1"
        assert resolved.blob.fetched_at == now
        assert resolved.head.revision == "r1"
        assert resolved.head.next_refresh_at == now + 300
        assert resolved.head.last_error is None
        directory = feed_dir(f"{feed_server}/prices/BTC-USD", tmp_path)
        assert (directory / "head.json").is_file()
        assert (directory / "r1.beancount").read_text() == FEED
        assert json.loads((directory / "head.json").read_text()) == {
            "revision": "r1",
            "next_refresh_at": now + 300,
            "last_error": None,
        }

    def test_second_resolve_within_window_fetches_nothing(self, feed_server: str, tmp_path: Path) -> None:
        now = time.time()
        first = _resolve(feed_server, tmp_path, now=now)

        second = _resolve(feed_server, tmp_path, now=now + 299)

        assert second == first
        assert _FeedHandler.hits == ["/prices/BTC-USD"]

    def test_expired_window_revalidates_conditionally(self, feed_server: str, tmp_path: Path) -> None:
        now = time.time()
        first = _resolve(feed_server, tmp_path, now=now)

        second = _resolve(feed_server, tmp_path, now=now + 301)

        assert second.blob == first.blob
        assert second.head.next_refresh_at == now + 301 + 300
        assert second.head.last_error is None
        assert _FeedHandler.hits == ["/prices/BTC-USD", "/prices/BTC-USD"]
        assert _FeedHandler.seen_headers["/prices/BTC-USD"]["if-none-match"] == '"r1"'

    def test_new_revision_replaces_and_removes_the_superseded_blob(self, feed_server: str, tmp_path: Path) -> None:
        now = time.time()
        _resolve(feed_server, tmp_path, now=now)
        body = _feed_text(_stamp(now + 301), revision="r2").encode("utf-8")
        _FeedHandler.routes["/prices/BTC-USD"] = {
            "body": body,
            "headers": {"Content-Type": "text/plain; charset=utf-8", "ETag": '"r2"'},
            "etag": '"r2"',
            "etag_match": True,
        }

        resolved = _resolve(feed_server, tmp_path, now=now + 301)

        assert resolved.blob is not None
        assert resolved.blob.revision == "r2"
        assert resolved.blob.text == body.decode("utf-8")
        assert resolved.head.revision == "r2"
        directory = feed_dir(f"{feed_server}/prices/BTC-USD", tmp_path)
        assert (directory / "r2.beancount").is_file()
        assert not (directory / "r1.beancount").exists()
        assert not (directory / "r1.json").exists()

    def test_failed_refresh_serves_last_good_and_records_the_error(self, feed_server: str, tmp_path: Path) -> None:
        now = time.time()
        first = _resolve(feed_server, tmp_path, now=now)
        del _FeedHandler.routes["/prices/BTC-USD"]

        resolved = _resolve(feed_server, tmp_path, now=now + 301)

        assert resolved.blob is not None
        assert resolved.blob.text == first.blob.text
        assert resolved.blob.revision == "r1"
        assert resolved.head.revision == "r1"
        assert resolved.head.last_error == "fetch failed (http): HTTP 404"
        assert resolved.head.next_refresh_at == now + 301 + 60

    def test_invalid_body_keeps_serving(self, feed_server: str, tmp_path: Path) -> None:
        now = time.time()
        first = _resolve(feed_server, tmp_path, now=now)
        _FeedHandler.routes["/prices/BTC-USD"] = {"body": b"2026-09-10 open Assets:X\n"}

        resolved = _resolve(feed_server, tmp_path, now=now + 301)

        assert resolved.blob is not None
        assert resolved.blob.text == first.blob.text
        assert resolved.head.last_error is not None
        assert "invalid feed at line 1" in resolved.head.last_error

    def test_empty_cache_failure_records_error_without_blob(self, feed_server: str, tmp_path: Path) -> None:
        resolved = _resolve(feed_server, tmp_path, path="/prices/NOPE", alias="NOPE")

        assert resolved.blob is None
        assert resolved.head.revision is None
        assert resolved.head.last_error == "fetch failed (http): HTTP 404"

    def test_offline_serves_cached_without_fetch(self, feed_server: str, tmp_path: Path) -> None:
        now = time.time()
        first = _resolve(feed_server, tmp_path, now=now)
        _FeedHandler.hits.clear()

        resolved = _resolve(feed_server, tmp_path, now=now + 3600, offline=True)

        assert resolved.blob == first.blob
        assert _FeedHandler.hits == []

    def test_offline_uncached_resolves_to_nothing_without_writing(self, feed_server: str, tmp_path: Path) -> None:
        resolved = _resolve(feed_server, tmp_path, offline=True)

        assert resolved.blob is None
        assert _FeedHandler.hits == []
        assert not tmp_path.joinpath("bea").exists()

    def test_strict_rejects_unavailable(self, feed_server: str, tmp_path: Path) -> None:
        url = f"{feed_server}/prices/NOPE"

        with pytest.raises(LedgerError, match="is unavailable in strict mode") as error:
            resolve_feed(url, "NOPE", root=tmp_path, strict=True)

        assert url in str(error.value)

    def test_strict_rejects_stale(self, feed_server: str, tmp_path: Path) -> None:
        now = time.time()
        body = _feed_text(_stamp(now - 660)).encode("utf-8")
        _FeedHandler.routes["/prices/BTC-USD"] = {"body": body}
        url = f"{feed_server}/prices/BTC-USD"
        seeded = resolve_feed(url, "BTC-USD", root=tmp_path, now=now)
        assert seeded.blob is not None

        with pytest.raises(LedgerError, match="is stale in strict mode") as error:
            resolve_feed(url, "BTC-USD", root=tmp_path, now=now, strict=True)

        assert url in str(error.value)

    def test_strict_accepts_fresh(self, feed_server: str, tmp_path: Path) -> None:
        now = time.time()
        body = _feed_text(_stamp(now)).encode("utf-8")
        _FeedHandler.routes["/prices/BTC-USD"] = {"body": body}

        resolved = _resolve(feed_server, tmp_path, now=now, strict=True)

        assert resolved.blob is not None

    def test_corrupt_head_rebuilds_from_a_fetch(self, feed_server: str, tmp_path: Path) -> None:
        now = time.time()
        _resolve(feed_server, tmp_path, now=now)
        directory = feed_dir(f"{feed_server}/prices/BTC-USD", tmp_path)
        (directory / "head.json").write_text("not json{")
        _FeedHandler.hits.clear()

        resolved = _resolve(feed_server, tmp_path, now=now + 1)

        assert resolved.blob is not None
        assert resolved.blob.text == FEED
        assert _FeedHandler.hits == ["/prices/BTC-USD"]

    def test_missing_blob_refetches_inside_the_window(self, feed_server: str, tmp_path: Path) -> None:
        now = time.time()
        _resolve(feed_server, tmp_path, now=now)
        directory = feed_dir(f"{feed_server}/prices/BTC-USD", tmp_path)
        (directory / "r1.beancount").unlink()
        _FeedHandler.hits.clear()

        resolved = _resolve(feed_server, tmp_path, now=now + 1)

        assert resolved.blob is not None
        assert _FeedHandler.hits == ["/prices/BTC-USD"]

    def test_manual_refresh_zeroes_the_window(self, feed_server: str, tmp_path: Path) -> None:
        now = time.time()
        url = f"{feed_server}/prices/BTC-USD"
        _resolve(feed_server, tmp_path, now=now)

        head = zero_next_refresh(url, tmp_path)

        assert head.next_refresh_at == 0.0
        assert head.revision == "r1"
        _FeedHandler.hits.clear()
        _resolve(feed_server, tmp_path, now=now + 1)
        assert _FeedHandler.hits == ["/prices/BTC-USD"]


class TestFreshness:
    def _blob(self, observed: str | None, fetched_at: float) -> PriceFeedBlob:
        validation = validate_managed_price_text(FEED)
        assert isinstance(validation, ValidFeed)
        feed = validation.feed
        summary = FeedSummary(
            alias=feed.alias,
            commodity=feed.commodity,
            quote=feed.quote,
            source=feed.source,
            revision=feed.revision,
            latest_observed_at=observed,
            prices=feed.prices,
        )
        return PriceFeedBlob(
            url="https://beancount.io/prices/BTC-USD",
            revision="r1",
            etag='"r1"',
            text=FEED,
            fetched_at=fetched_at,
            feed=summary,
        )

    def test_no_blob_is_unavailable(self) -> None:
        assert freshness(None, time.time()) == "unavailable"

    def test_recent_observation_is_recent(self) -> None:
        now = time.time()

        assert freshness(self._blob(_stamp(now - 60), now - 60), now) == "recent"

    def test_old_observation_is_stale(self) -> None:
        now = time.time()

        assert freshness(self._blob(_stamp(now - 601), now - 601), now) == "stale"

    def test_missing_observed_at_falls_back_to_fetch_time(self) -> None:
        now = time.time()

        assert freshness(self._blob(None, now - 60), now) == "recent"
        assert freshness(self._blob(None, now - 601), now) == "stale"

    def test_unparseable_observed_at_falls_back_to_fetch_time(self) -> None:
        now = time.time()

        assert freshness(self._blob("whenever", now - 60), now) == "recent"
