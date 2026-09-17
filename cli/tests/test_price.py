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

from bea_engine.managed_load import (
    LoadedLedger,
    apply_ledger_price_precedence,
    collect_ledger_price_pairs,
    load_with_sources,
)
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
CLI_ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = CLI_ROOT / "src"

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

    def test_timeout_on_refresh_keeps_serving(self, feed_server: str, tmp_path: Path) -> None:
        now = time.time()
        url = f"{feed_server}/prices/BTC-USD"
        root = tmp_path / "cache"
        first = resolve_feed(url, "BTC-USD", root=root, now=now)
        assert first.blob is not None
        _FeedHandler.routes["/prices/BTC-USD"] = {
            "body": FEED.encode("utf-8"),
            "sleep": 3,
        }

        resolved = resolve_feed(url, "BTC-USD", root=root, now=now + 301, timeout_seconds=1)

        assert resolved.blob is not None
        assert resolved.blob.text == first.blob.text
        assert resolved.head.last_error == "fetch failed (timeout): timed out after 1 seconds"

    def test_rate_limited_refresh_keeps_serving_with_retry_after(self, feed_server: str, tmp_path: Path) -> None:
        now = time.time()
        url = f"{feed_server}/prices/BTC-USD"
        root = tmp_path / "cache"
        first = resolve_feed(url, "BTC-USD", root=root, now=now)
        assert first.blob is not None
        _FeedHandler.routes["/prices/BTC-USD"] = {
            "status": 429,
            "headers": {"Retry-After": "120"},
            "body": b"slow down",
        }

        resolved = resolve_feed(url, "BTC-USD", root=root, now=now + 301)

        assert resolved.blob is not None
        assert resolved.blob.text == first.blob.text
        assert resolved.head.last_error == "fetch failed (http): HTTP 429 (retry after 120)"

    def test_empty_body_on_refresh_keeps_serving(self, feed_server: str, tmp_path: Path) -> None:
        now = time.time()
        url = f"{feed_server}/prices/BTC-USD"
        root = tmp_path / "cache"
        first = resolve_feed(url, "BTC-USD", root=root, now=now)
        assert first.blob is not None
        _FeedHandler.routes["/prices/BTC-USD"] = {"body": b""}

        resolved = resolve_feed(url, "BTC-USD", root=root, now=now + 301)

        assert resolved.blob is not None
        assert resolved.blob.text == first.blob.text
        assert resolved.head.last_error == "invalid feed: no price directives"

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

    def test_missing_observed_at_reads_stale(self) -> None:
        now = time.time()

        assert freshness(self._blob(None, now - 60), now) == "stale"

    def test_unparseable_observed_at_reads_stale(self) -> None:
        now = time.time()

        assert freshness(self._blob("whenever", now - 60), now) == "stale"


# --------------------------------------------------------------------------- #
# Managed loads: one resolution step for every load path (t003)
# --------------------------------------------------------------------------- #


def _managed_ledger(feed_server: str, path: str = "/prices/BTC-USD") -> str:
    return f"""option "operating_currency" "USD"
include "{feed_server}{path}"
2024-01-01 open Assets:Broker
2024-01-01 open Expenses:Food
"""


def _load(feed_server: str, tmp_path: Path, text: str | None = None, **kwargs: Any) -> LoadedLedger:
    ledger = tmp_path / "main.bean"
    ledger.write_text(text if text is not None else _managed_ledger(feed_server))
    origins = kwargs.pop("origins", (f"http://127.0.0.1:{feed_server.rsplit(':', 1)[1]}",))
    return load_with_sources(ledger, origins=origins, root=tmp_path / "cache", **kwargs)


def _price_numbers(loaded: LoadedLedger) -> list[str]:
    from beancount.core.data import Price

    return sorted(str(entry.amount.number) for entry in loaded.entries if isinstance(entry, Price))


class TestLedgerPricePrecedence:
    def test_collect_finds_prices_and_ignores_comments(self) -> None:
        text = """; 2024-01-01 price BTC 1 USD is a comment
2024-01-01 price BTC 100 USD
option "title" "x"
2024-01-02 price ETH 5 USD ; trailing
"""

        assert collect_ledger_price_pairs(text) == {
            ("2024-01-01", "BTC", "USD"),
            ("2024-01-02", "ETH", "USD"),
        }

    def test_shadowed_points_become_comments_with_stable_lines(self) -> None:
        validation = validate_managed_price_text(FEED)
        assert isinstance(validation, ValidFeed)

        effective = apply_ledger_price_precedence(FEED, validation.feed.prices, {("2026-09-10", "BTC", "USD")})

        assert effective.shadowed_count == 1
        assert effective.effective_dates == ("2026-09-11",)
        assert len(effective.text.split("\n")) == len(FEED.split("\n"))
        assert "; shadowed by a ledger-authored price" in effective.text
        assert "112000.00" not in effective.text
        assert "113500.50" in effective.text

    def test_reciprocal_pair_is_shadowed(self) -> None:
        validation = validate_managed_price_text(FEED)
        assert isinstance(validation, ValidFeed)

        effective = apply_ledger_price_precedence(FEED, validation.feed.prices, {("2026-09-11", "USD", "BTC")})

        assert effective.shadowed_count == 1
        assert effective.effective_dates == ("2026-09-10",)

    def test_nothing_shadowed_keeps_identical_text(self) -> None:
        validation = validate_managed_price_text(FEED)
        assert isinstance(validation, ValidFeed)

        effective = apply_ledger_price_precedence(FEED, validation.feed.prices, set())

        assert effective.text == FEED
        assert effective.shadowed_count == 0
        assert effective.effective_dates == ("2026-09-10", "2026-09-11")


class TestManagedLoad:
    def test_plain_ledger_loads_without_sources(self, feed_server: str, tmp_path: Path) -> None:
        lines = _managed_ledger(feed_server).splitlines()
        text = "\n".join([lines[0], *lines[2:]]) + "\n"

        loaded = _load(feed_server, tmp_path, text)

        assert loaded.sources == ()
        assert loaded.errors == []
        assert _FeedHandler.hits == []

    def test_feed_prices_merge_into_the_load(self, feed_server: str, tmp_path: Path) -> None:
        loaded = _load(feed_server, tmp_path)

        assert loaded.errors == []
        assert _price_numbers(loaded) == ["112000.00", "113500.50"]
        assert len(loaded.sources) == 1
        source = loaded.sources[0]
        assert source.alias == "BTC-USD"
        assert (source.commodity, source.quote) == ("BTC", "USD")
        assert source.revision == "r1"
        assert source.shadowed_count == 0
        assert source.effective_dates == ("2026-09-10", "2026-09-11")

    def test_ledger_price_wins_and_shadowed_count_is_reported(self, feed_server: str, tmp_path: Path) -> None:
        text = _managed_ledger(feed_server) + "2026-09-10 price BTC 1 USD\n"

        loaded = _load(feed_server, tmp_path, text)

        assert loaded.errors == []
        assert _price_numbers(loaded) == ["1", "113500.50"]
        assert loaded.sources[0].shadowed_count == 1
        assert loaded.sources[0].effective_dates == ("2026-09-11",)

    def test_entry_filenames_map_back_to_originals(self, feed_server: str, tmp_path: Path) -> None:
        from beancount.core.data import Price, Transaction

        ledger = tmp_path / "main.bean"
        ledger.write_text(
            _managed_ledger(feed_server) + '2024-02-01 * "buy"\n  Assets:Broker  1 BTC\n  Expenses:Food\n'
        )
        origins = (f"http://127.0.0.1:{feed_server.rsplit(':', 1)[1]}",)
        loaded = load_with_sources(ledger, origins=origins, root=tmp_path / "cache")

        assert loaded.errors == []
        transactions = [entry for entry in loaded.entries if isinstance(entry, Transaction)]
        assert [entry.meta["filename"] for entry in transactions] == [str(ledger.resolve())]
        prices = [entry for entry in loaded.entries if isinstance(entry, Price)]
        assert all("effective" in str(price.meta["filename"]) for price in prices)
        assert loaded.options["filename"] == str(ledger.resolve())

    def test_nested_include_resolves(self, feed_server: str, tmp_path: Path) -> None:
        (tmp_path / "prices.bean").write_text(f'include "{feed_server}/prices/BTC-USD"\n')
        text = """option "operating_currency" "USD"
include "prices.bean"
2024-01-01 open Assets:Broker
2024-01-01 open Expenses:Food
"""

        loaded = _load(feed_server, tmp_path, text)

        assert loaded.errors == []
        assert _price_numbers(loaded) == ["112000.00", "113500.50"]
        assert loaded.sources[0].included_from[0].file.endswith("prices.bean")

    def test_same_url_twice_resolves_once(self, feed_server: str, tmp_path: Path) -> None:
        text = _managed_ledger(feed_server) + f'include "{feed_server}/prices/BTC-USD"\n'

        loaded = _load(feed_server, tmp_path, text)

        assert loaded.errors == []
        assert _price_numbers(loaded) == ["112000.00", "113500.50"]
        assert len(loaded.sources) == 1
        assert len(loaded.sources[0].included_from) == 2

    def test_unavailable_source_keeps_books_loadable(self, feed_server: str, tmp_path: Path) -> None:
        loaded = _load(feed_server, tmp_path, _managed_ledger(feed_server, "/prices/NOPE"))

        assert _price_numbers(loaded) == []
        assert len(loaded.errors) == 1
        error = loaded.errors[0]
        assert "managed price source unavailable" in error.message
        assert "/prices/NOPE" in error.message
        assert error.source["filename"].endswith("main.bean")
        assert error.source["lineno"] == 2
        assert loaded.sources[0].freshness == "unavailable"
        assert "HTTP 404" in (loaded.sources[0].error or "")

    def test_disallowed_url_is_left_for_the_engine(self, feed_server: str, tmp_path: Path) -> None:
        text = _managed_ledger(feed_server) + 'include "https://evil.example.com/prices/BTC-USD"\n'

        loaded = _load(feed_server, tmp_path, text)

        assert _price_numbers(loaded) == ["112000.00", "113500.50"]
        assert len(loaded.sources) == 1
        assert any("evil.example.com" in getattr(error, "message", "") for error in loaded.errors)

    def test_strict_unavailable_raises_through_load(self, feed_server: str, tmp_path: Path) -> None:
        with pytest.raises(LedgerError, match="is unavailable in strict mode"):
            _load(feed_server, tmp_path, _managed_ledger(feed_server, "/prices/NOPE"), strict=True)

    def test_offline_load_fetches_nothing(self, feed_server: str, tmp_path: Path) -> None:
        ledger = tmp_path / "main.bean"
        ledger.write_text(_managed_ledger(feed_server))
        origins = (f"http://127.0.0.1:{feed_server.rsplit(':', 1)[1]}",)
        root = tmp_path / "cache"
        load_with_sources(ledger, origins=origins, root=root)
        _FeedHandler.hits.clear()

        loaded = load_with_sources(ledger, origins=origins, root=root, offline=True)

        assert _price_numbers(loaded) == ["112000.00", "113500.50"]
        assert _FeedHandler.hits == []

    def test_origins_default_refuses_fixture_host(
        self, feed_server: str, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.delenv("MANAGED_PRICE_ORIGINS", raising=False)
        ledger = tmp_path / "main.bean"
        ledger.write_text(_managed_ledger(feed_server))

        loaded = load_with_sources(ledger, root=tmp_path / "cache")

        assert loaded.sources == ()
        assert loaded.errors != []

    def test_origins_and_modes_read_from_env(
        self, feed_server: str, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        origin = f"http://127.0.0.1:{feed_server.rsplit(':', 1)[1]}"
        monkeypatch.setenv("MANAGED_PRICE_ORIGINS", origin)
        ledger = tmp_path / "main.bean"
        ledger.write_text(_managed_ledger(feed_server))
        root = tmp_path / "cache"

        assert load_with_sources(ledger, root=root).sources != ()

        monkeypatch.setenv("MANAGED_PRICE_OFFLINE", "1")
        _FeedHandler.hits.clear()
        assert load_with_sources(ledger, root=root).sources != ()
        assert _FeedHandler.hits == []

    def test_seventeenth_url_is_left_for_the_engine(self, feed_server: str, tmp_path: Path) -> None:
        for index in range(17):
            alias = f"F-{index:02d}"
            base = f"F{index:02d}"
            _FeedHandler.routes[f"/prices/{alias}"] = {
                "body": (
                    f"; alias: {alias}\n; commodity: {base}\n; quote: USD\n2024-01-15 price {base} 10 USD\n"
                ).encode()
            }
        lines = ['option "operating_currency" "USD"']
        lines += [f'include "{feed_server}/prices/F-{index:02d}"' for index in range(17)]
        lines += ["2024-01-01 open Assets:Broker", "2024-01-01 open Expenses:Food"]
        loaded = _load(feed_server, tmp_path, "\n".join(lines) + "\n")

        assert len(loaded.sources) == 16
        assert [source.alias for source in loaded.sources] == [f"F-{index:02d}" for index in range(16)]
        assert _price_numbers(loaded) == ["10"] * 16
        assert any("F-16" in getattr(error, "message", "") for error in loaded.errors)

    def test_load_never_rewrites_customer_files(self, feed_server: str, tmp_path: Path) -> None:
        books = tmp_path / "books"
        books.mkdir()
        ledger = books / "main.bean"
        ledger.write_text(_managed_ledger(feed_server))
        before = ledger.read_bytes()
        origins = (f"http://127.0.0.1:{feed_server.rsplit(':', 1)[1]}",)

        loaded = load_with_sources(ledger, origins=origins, root=tmp_path / "cache")

        assert loaded.errors == []
        assert ledger.read_bytes() == before
        assert sorted(path.name for path in books.iterdir()) == ["main.bean"]

    def test_write_to_a_feed_path_is_refused(
        self, feed_server: str, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        from bea_engine.ledger.write import LedgerSnapshot
        from bea_engine.protocol import UsageError

        monkeypatch.setenv("XDG_CACHE_HOME", str(tmp_path / "xdg"))
        root = tmp_path / "xdg" / "bea" / "managed-prices"
        ledger = tmp_path / "main.bean"
        ledger.write_text(_managed_ledger(feed_server))
        origins = (f"http://127.0.0.1:{feed_server.rsplit(':', 1)[1]}",)
        loaded = load_with_sources(ledger, origins=origins, root=root)
        assert loaded.sources[0].effective_path is not None
        snapshot = LedgerSnapshot.capture(tmp_path / "main.bean")

        with pytest.raises(UsageError, match="is read-only") as error:
            snapshot.require_target(Path(loaded.sources[0].effective_path))

        assert f"{feed_server}/prices/BTC-USD" in str(error.value)


def _cli_env(tmp_path: Path, feed_server: str) -> dict[str, str]:
    origin = f"http://127.0.0.1:{feed_server.rsplit(':', 1)[1]}"
    env = {k: v for k, v in os.environ.items() if not k.startswith("BEA_")}
    env.update(
        BEA_CONFIG_DIR=str(tmp_path / "config"),
        XDG_CACHE_HOME=str(tmp_path / "cache"),
        XDG_DATA_HOME=str(tmp_path / "data"),
        BEA_NO_UPDATE_NOTIFIER="1",
        MANAGED_PRICE_ORIGINS=origin,
        PYTHONPATH=str(SOURCE_ROOT),
        TERM="dumb",
        NO_COLOR="1",
    )
    return env


def _run_bea(tmp_path: Path, feed_server: str, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "cli.main", *args],
        env=_cli_env(tmp_path, feed_server),
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=60,
    )


def _write_managed_ledger(tmp_path: Path, feed_server: str, extra: str = "") -> Path:
    ledger = tmp_path / "main.bean"
    ledger.write_text(_managed_ledger(feed_server) + extra)
    return ledger


class TestManagedLoadCommands:
    """`check`, `list`, `query`, `report`, `import`, and writes resolve identically."""

    def test_check_accepts_a_managed_include(self, feed_server: str, tmp_path: Path) -> None:
        ledger = _write_managed_ledger(tmp_path, feed_server)

        result = _run_bea(tmp_path, feed_server, "--file", str(ledger), "check")

        assert result.returncode == 0, result.stderr

    def test_list_price_shows_feed_prices(self, feed_server: str, tmp_path: Path) -> None:
        ledger = _write_managed_ledger(tmp_path, feed_server)

        result = _run_bea(tmp_path, feed_server, "--file", str(ledger), "list", "price")

        assert result.returncode == 0, result.stderr
        assert "112000.00 USD" in result.stdout
        assert "113500.50 USD" in result.stdout

    def test_query_loads_through_the_wrapper(self, feed_server: str, tmp_path: Path) -> None:
        ledger = _write_managed_ledger(
            tmp_path,
            feed_server,
            '2024-02-01 * "buy"\n  Assets:Broker  1 BTC\n  Expenses:Food\n',
        )

        result = _run_bea(tmp_path, feed_server, "--file", str(ledger), "query", "select date, narration")

        assert result.returncode == 0, result.stderr
        assert "2024-02-01" in result.stdout

    def test_report_values_holdings_from_the_feed(self, feed_server: str, tmp_path: Path) -> None:
        _FeedHandler.routes["/prices/BTC-USD"] = {
            "body": (b"; alias: BTC-USD\n; commodity: BTC\n; quote: USD\n2024-01-15 price BTC 10 USD\n")
        }
        ledger = _write_managed_ledger(
            tmp_path,
            feed_server,
            '2024-02-01 * "buy"\n  Assets:Broker  3 BTC\n  Expenses:Food\n',
        )

        result = _run_bea(
            tmp_path,
            feed_server,
            "--file",
            str(ledger),
            "report",
            "balance-sheet",
            "--conversion",
            "USD",
        )

        assert result.returncode == 0, result.stderr
        assert "30 USD" in result.stdout
        assert "Partial valuation" not in result.stdout

    def test_import_applies_beside_a_managed_include(self, feed_server: str, tmp_path: Path) -> None:
        ledger = _write_managed_ledger(tmp_path, feed_server, "2024-01-01 open Assets:Checking\n")
        source = tmp_path / "bank.csv"
        source.write_text(
            "Date,Payee,Narration,Amount,Currency,Category,BankID\n"
            "2024-02-01,Cafe,beans,12.00,USD,Expenses:Food,bank-001\n"
        )

        result = _run_bea(
            tmp_path,
            feed_server,
            "--file",
            str(ledger),
            "import",
            str(source),
            "--config",
            str(CLI_ROOT / "docs/examples/csv_importers.py"),
            "--apply",
        )

        assert result.returncode == 0, result.stderr
        assert "12.00 USD" in ledger.read_text()

    def test_add_validates_through_the_wrapper(self, feed_server: str, tmp_path: Path) -> None:
        ledger = _write_managed_ledger(tmp_path, feed_server)

        result = _run_bea(
            tmp_path,
            feed_server,
            "--file",
            str(ledger),
            "add",
            "transaction",
            "--date",
            "2024-03-01",
            "--narration",
            "lunch",
            "--posting",
            "Expenses:Food 5 USD",
            "--posting",
            "Assets:Broker",
        )

        assert result.returncode == 0, result.stderr
        assert "5 USD" in ledger.read_text()


class TestPriceStatus:
    """`price status` and `price refresh` speak the ADR 015 vocabulary (t004)."""

    def test_status_lists_sources_human(self, feed_server: str, tmp_path: Path) -> None:
        ledger = _write_managed_ledger(tmp_path, feed_server)

        result = _run_bea(tmp_path, feed_server, "--file", str(ledger), "price", "status")

        assert result.returncode == 0, result.stderr
        for token in ("BTC-USD", "FRESHNESS", "REVISION", "r1", "2026-09-11", "SHADOWED"):
            assert token in result.stdout

    def test_status_json_carries_the_adr015_record(self, feed_server: str, tmp_path: Path) -> None:
        ledger = _write_managed_ledger(tmp_path, feed_server)

        result = _run_bea(tmp_path, feed_server, "--json", "--file", str(ledger), "price", "status")

        assert result.returncode == 0, result.stderr
        (source,) = json.loads(result.stdout)["data"]["sources"]
        assert source["url"] == f"{feed_server}/prices/BTC-USD"
        assert source["alias"] == "BTC-USD"
        assert (source["commodity"], source["quote"], source["source"]) == ("BTC", "USD", "fixture")
        assert (source["revision"], source["etag"]) == ("r1", '"r1"')
        assert source["observed_at"] == "2026-09-11T00:00:00Z"
        assert source["fetched_at"] is not None
        assert source["next_refresh_at"] is not None
        assert source["freshness"] in ("recent", "stale")
        assert source["error"] is None
        assert source["shadowed_count"] == 0
        assert source["effective_dates"] == ["2026-09-10", "2026-09-11"]
        assert source["included_from"][0]["line"] == 2

    def test_status_without_includes_says_so(self, feed_server: str, tmp_path: Path) -> None:
        ledger = tmp_path / "main.bean"
        ledger.write_text('option "operating_currency" "USD"\n2024-01-01 open Assets:Broker\n')

        result = _run_bea(tmp_path, feed_server, "--file", str(ledger), "price", "status")

        assert result.returncode == 0, result.stderr
        assert "No managed price includes" in result.stdout

    def test_status_reports_unavailable_with_cause(self, feed_server: str, tmp_path: Path) -> None:
        ledger = _write_managed_ledger(tmp_path, feed_server, _managed_ledger(feed_server, "/prices/NOPE"))

        result = _run_bea(tmp_path, feed_server, "--file", str(ledger), "price", "status")

        assert result.returncode == 0, result.stderr
        assert "unavailable" in result.stdout
        assert "HTTP 404" in result.stdout

    def test_status_shows_stale_after_ten_minutes(self, feed_server: str, tmp_path: Path) -> None:
        body = _feed_text(_stamp(time.time() - 660)).encode("utf-8")
        _FeedHandler.routes["/prices/BTC-USD"] = {"body": body}
        ledger = _write_managed_ledger(tmp_path, feed_server)

        result = _run_bea(tmp_path, feed_server, "--file", str(ledger), "price", "status")

        assert result.returncode == 0, result.stderr
        assert "stale" in result.stdout

    def test_refresh_reports_changed_revision(self, feed_server: str, tmp_path: Path) -> None:
        ledger = _write_managed_ledger(tmp_path, feed_server)
        first = _run_bea(tmp_path, feed_server, "--file", str(ledger), "price", "refresh")
        assert first.returncode == 0, first.stderr
        assert "none → r1" in first.stdout
        body = _feed_text(_stamp(time.time()), revision="r2").encode("utf-8")
        _FeedHandler.routes["/prices/BTC-USD"] = {
            "body": body,
            "headers": {"ETag": '"r2"'},
            "etag": '"r2"',
            "etag_match": True,
        }

        second = _run_bea(tmp_path, feed_server, "--file", str(ledger), "price", "refresh")

        assert second.returncode == 0, second.stderr
        assert "r1 → r2" in second.stdout

    def test_refresh_reports_unchanged(self, feed_server: str, tmp_path: Path) -> None:
        ledger = _write_managed_ledger(tmp_path, feed_server)
        assert _run_bea(tmp_path, feed_server, "--file", str(ledger), "price", "refresh").returncode == 0

        result = _run_bea(tmp_path, feed_server, "--file", str(ledger), "price", "refresh")

        assert result.returncode == 0, result.stderr
        assert "unchanged at r1" in result.stdout

    def test_refresh_json_reports_changed_shape(self, feed_server: str, tmp_path: Path) -> None:
        ledger = _write_managed_ledger(tmp_path, feed_server)

        result = _run_bea(tmp_path, feed_server, "--json", "--file", str(ledger), "price", "refresh")

        assert result.returncode == 0, result.stderr
        data = json.loads(result.stdout)["data"]
        assert data["changed"] == [
            {
                "url": f"{feed_server}/prices/BTC-USD",
                "alias": "BTC-USD",
                "previous_revision": None,
                "revision": "r1",
            }
        ]

    def test_status_rejects_extra_arguments(self, feed_server: str, tmp_path: Path) -> None:
        ledger = _write_managed_ledger(tmp_path, feed_server)

        result = _run_bea(tmp_path, feed_server, "--file", str(ledger), "price", "status", "extra")

        assert result.returncode == 2, result.stderr
        assert "takes no arguments" in result.stderr

    def test_price_help_names_the_managed_subcommands(self, feed_server: str, tmp_path: Path) -> None:
        ledger = _write_managed_ledger(tmp_path, feed_server)

        result = _run_bea(tmp_path, feed_server, "--file", str(ledger), "price", "--help")

        assert result.returncode == 0, result.stderr
        assert "status" in result.stdout
        assert "refresh" in result.stdout

    def test_offline_flag_resolves_from_cache(self, feed_server: str, tmp_path: Path) -> None:
        ledger = _write_managed_ledger(tmp_path, feed_server)
        seed = _run_bea(tmp_path, feed_server, "--file", str(ledger), "price", "status")
        assert seed.returncode == 0, seed.stderr
        _FeedHandler.hits.clear()

        result = _run_bea(tmp_path, feed_server, "--offline", "--file", str(ledger), "price", "status")

        assert result.returncode == 0, result.stderr
        assert "r1" in result.stdout
        assert _FeedHandler.hits == []

    def test_strict_flag_fails_naming_a_stale_source(self, feed_server: str, tmp_path: Path) -> None:
        body = _feed_text(_stamp(time.time() - 660)).encode("utf-8")
        _FeedHandler.routes["/prices/BTC-USD"] = {"body": body}
        ledger = _write_managed_ledger(tmp_path, feed_server)

        result = _run_bea(tmp_path, feed_server, "--strict-prices", "--file", str(ledger), "check")

        assert result.returncode != 0
        assert f"{feed_server}/prices/BTC-USD" in result.stderr

    def test_unavailable_error_points_at_status(self, feed_server: str, tmp_path: Path) -> None:
        loaded = _load(feed_server, tmp_path, _managed_ledger(feed_server, "/prices/NOPE"))

        assert len(loaded.errors) == 1
        assert "bea price status" in loaded.errors[0].message


class TestPriceExport:
    """`price export` snapshots a portable tree stock tools check (t005)."""

    def _stock_check(self, target: Path) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, "-m", "beancount.scripts.check", str(target)],
            capture_output=True,
            text=True,
            timeout=60,
        )

    def test_export_writes_portable_tree_with_markers(self, feed_server: str, tmp_path: Path) -> None:
        ledger = _write_managed_ledger(tmp_path, feed_server)

        result = _run_bea(tmp_path, feed_server, "--file", str(ledger), "price", "export")

        assert result.returncode == 0, result.stderr
        assert "Exported 2 files" in result.stdout
        exported = tmp_path / "main-export" / "main.bean"
        feed = tmp_path / "main-export" / "prices" / "BTC-USD.beancount"
        assert exported.is_file()
        assert feed.is_file()
        assert f'include "{feed_server}/prices/BTC-USD"' not in exported.read_text()
        assert 'include "prices/BTC-USD.beancount"' in exported.read_text()
        text = feed.read_text()
        assert f'custom "bea-managed-source" "BTC-USD" "{feed_server}/prices/BTC-USD" "r1"' in text
        assert "2026-09-10 price BTC 112000.00 USD" in text
        # Re-exporting is deterministic: the same bytes, not a growing tree.
        again = _run_bea(tmp_path, feed_server, "--file", str(ledger), "price", "export")
        assert again.returncode == 0, again.stderr
        assert feed.read_text() == text

    def test_export_parses_under_stock_beancount(self, feed_server: str, tmp_path: Path) -> None:
        ledger = _write_managed_ledger(tmp_path, feed_server)
        assert _run_bea(tmp_path, feed_server, "--file", str(ledger), "price", "export").returncode == 0

        assert self._stock_check(tmp_path / "main-export" / "main.bean").returncode == 0

    def test_export_values_equivalently(self, feed_server: str, tmp_path: Path) -> None:
        _FeedHandler.routes["/prices/BTC-USD"] = {
            "body": (b"; alias: BTC-USD\n; commodity: BTC\n; quote: USD\n2024-01-15 price BTC 10 USD\n")
        }
        ledger = _write_managed_ledger(
            tmp_path,
            feed_server,
            '2024-02-01 * "buy"\n  Assets:Broker  3 BTC\n  Expenses:Food\n',
        )
        assert _run_bea(tmp_path, feed_server, "--file", str(ledger), "price", "export").returncode == 0

        result = _run_bea(
            tmp_path,
            feed_server,
            "--file",
            str(tmp_path / "main-export" / "main.bean"),
            "report",
            "balance-sheet",
            "--conversion",
            "USD",
        )

        assert result.returncode == 0, result.stderr
        assert "30 USD" in result.stdout

    def test_export_refuses_unavailable_naming_the_source(self, feed_server: str, tmp_path: Path) -> None:
        ledger = tmp_path / "main.bean"
        ledger.write_text(_managed_ledger(feed_server, "/prices/NOPE"))

        result = _run_bea(tmp_path, feed_server, "--file", str(ledger), "price", "export")

        assert result.returncode != 0
        assert f"{feed_server}/prices/NOPE" in result.stderr
        assert not (tmp_path / "main-export").exists()

    def test_export_allow_errors_carries_the_marker(self, feed_server: str, tmp_path: Path) -> None:
        ledger = tmp_path / "main.bean"
        ledger.write_text(_managed_ledger(feed_server, "/prices/NOPE"))

        result = _run_bea(tmp_path, feed_server, "--file", str(ledger), "price", "export", "--allow-errors")

        assert result.returncode == 0, result.stderr
        feed = tmp_path / "main-export" / "prices" / "NOPE.beancount"
        assert feed.is_file()
        assert '"none"' in feed.read_text()
        assert self._stock_check(tmp_path / "main-export" / "main.bean").returncode == 0

    def test_export_output_flag_chooses_the_directory(self, feed_server: str, tmp_path: Path) -> None:
        ledger = _write_managed_ledger(tmp_path, feed_server)

        result = _run_bea(
            tmp_path,
            feed_server,
            "--file",
            str(ledger),
            "price",
            "export",
            "--output",
            str(tmp_path / "audit"),
        )

        assert result.returncode == 0, result.stderr
        assert (tmp_path / "audit" / "main.bean").is_file()
        assert not (tmp_path / "main-export").exists()

    def test_export_into_the_source_directory_is_refused(self, feed_server: str, tmp_path: Path) -> None:
        ledger = _write_managed_ledger(tmp_path, feed_server)

        result = _run_bea(
            tmp_path,
            feed_server,
            "--file",
            str(ledger),
            "price",
            "export",
            "--output",
            str(tmp_path),
        )

        assert result.returncode == 2, result.stderr
        assert "would overwrite" in result.stderr

    def test_export_excludes_shadowed_points(self, feed_server: str, tmp_path: Path) -> None:
        ledger = _write_managed_ledger(tmp_path, feed_server, "2026-09-10 price BTC 1 USD\n")

        result = _run_bea(tmp_path, feed_server, "--file", str(ledger), "price", "export")

        assert result.returncode == 0, result.stderr
        text = (tmp_path / "main-export" / "prices" / "BTC-USD.beancount").read_text()
        assert "112000.00" not in text
        assert "113500.50" in text
        assert text.count("shadowed by a ledger-authored price") == 1


# --------------------------------------------------------------------------- #
# Fixture coverage audit and hosted acceptance (t006)
# --------------------------------------------------------------------------- #

LIVE_STATUS = Path(__file__).resolve().parent / "managed_prices_live_status.json"


class TestFeedCacheTruncation:
    def test_oversized_body_on_refresh_keeps_serving(self, feed_server: str, tmp_path: Path) -> None:
        now = time.time()
        url = f"{feed_server}/prices/BTC-USD"
        root = tmp_path / "cache"
        first = resolve_feed(url, "BTC-USD", root=root, now=now)
        assert first.blob is not None
        _FeedHandler.routes["/prices/BTC-USD"] = {"body": b"x" * 300}

        resolved = resolve_feed(url, "BTC-USD", root=root, now=now + 301, max_body_bytes=100)

        assert resolved.blob is not None
        assert resolved.blob.text == first.blob.text
        assert resolved.head.last_error == "fetch failed (too-large): body exceeds 100 bytes"


class TestHostedFeedLive:
    """The one test allowed to dial past localhost (w1/m29/t006).

    Everything else in the suite resolves against the thread-local fixture
    server, so the suite stays green offline. This test skips when the
    network cannot tell mounted from pending, passes when the probe matches
    the checked-in record, and fails with promotion instructions when the
    route's state changed.
    """

    def test_hosted_feed_matches_recorded_status(self, tmp_path: Path) -> None:
        record = json.loads(LIVE_STATUS.read_text())
        url = record["url"]
        assert record["status"] in ("pending", "mounted"), "re-run make live-prices"
        result = fetch_managed_price_feed(url, timeout_seconds=10)
        if result.kind == "failed" and result.reason in (
            "network",
            "timeout",
            "too-large",
            "not-utf8",
        ):
            pytest.skip(f"network cannot verify the hosted route: {result.message}")
        if record["status"] == "pending":
            assert result.kind == "failed" and result.reason in ("redirect", "http"), (
                f"the hosted route looks mounted ({result.kind}); run make live-prices "
                "from cli/ and commit the promotion"
            )
            return
        assert isinstance(result, FetchedFeed), (
            f"the hosted route no longer serves a feed ({result.kind}); run make live-prices "
            "from cli/ and commit the new record"
        )
        validation = check_feed_identity(validate_managed_price_text(result.text), "BTC-USD", None)
        assert isinstance(validation, ValidFeed), validation
        resolved = resolve_feed(url, "BTC-USD", root=tmp_path / "cache")
        assert resolved.blob is not None
        assert resolved.blob.revision
        assert resolved.blob.feed.prices
        print(
            f"live revision={resolved.blob.revision} "
            f"observed_at={resolved.blob.feed.latest_observed_at} "
            f"fetched_at={resolved.blob.fetched_at}"
        )
