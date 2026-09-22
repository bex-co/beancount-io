"""Managed price includes, mirrored from ADR 015 for local resolution (w1/m29).

A ledger line `include "https://beancount.io/prices/BTC-USD"` is a registered
price request, not a general remote file include. This module holds the three
decisions the hosted ledger service makes before a feed ever reaches the
engine: the URL policy (ADR 015 section 2), the bounded fetch (section 3),
and price-only validation (section 4), plus the identity check that stops a
wrong instrument replacing a right one (section 10). Caching, load-path
resolution, and status views build on these and live in later m29 tasks.

The mirror is line-by-line where the contract fixes behavior: the same
origin and alias rules, the same five-second timeout, 1 MiB body cap, and
sixteen-URL load cap, the same price-only grammar, and the same refusal
reasons. The frontend may relay a cloud credential for the exact production
HTTPS price origin; additional allowed origins never receive that credential.
Local and offline ledger use remains independent of login.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from hashlib import sha256
from typing import BinaryIO, Literal
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import (
    HTTPRedirectHandler,
    OpenerDirector,
    Request,
    build_opener,
)

DEFAULT_ORIGINS = ("https://beancount.io",)
"""The origin allowlist when nothing else is configured (ADR 015 section 2)."""

FETCH_TIMEOUT_SECONDS = 5
"""The whole-exchange fetch budget, mirroring the hosted five-second timeout."""

MAX_BODY_BYTES = 1024 * 1024
"""The 1 MiB incremental body cap (ADR 015 section 3)."""

MAX_URLS_PER_LOAD = 16
"""Distinct managed URLs one ledger load may resolve (ADR 015 section 3)."""

_USER_AGENT = "bea managed-prices"

_PRICES_PATH_RE = re.compile(r"^/prices/([A-Za-z0-9._-]{1,64})$")
_URL_TARGET_RE = re.compile(r"^[a-z][a-z0-9+.-]*://", re.IGNORECASE)
_COMMENT_RE = re.compile(r"^\s*;")
_HEADER_RE = re.compile(r"^;\s*([a-z][a-z0-9_-]*)\s*:\s*(.+?)\s*$")
_PRICE_RE = re.compile(
    r"^(\d{4}-\d{2}-\d{2})\s+price\s+([A-Z][A-Z0-9'._-]*)\s+([0-9]+(?:\.[0-9]+)?)\s+"
    r"([A-Z][A-Z0-9'._-]*)\s*(?:;.*)?$"
)
_METADATA_RE = re.compile(r"^[ \t]+([a-z][A-Za-z0-9_-]*)\s*:\s*(.*?)\s*$")
_METADATA_VALUE_RE = re.compile(r'^(?:"[^"\\]*"|TRUE|FALSE|\d{4}-\d{2}-\d{2}|-?[0-9]+(?:\.[0-9]+)?)$')
_METADATA_KEYS = frozenset({"price-source", "price-kind", "observed-at", "provisional"})
_HEADER_KEYS = frozenset({"alias", "commodity", "quote", "source", "revision"})
_MAX_COMMODITY_LENGTH = 24
_MAX_NUMBER_LENGTH = 40
_CHUNK_BYTES = 64 * 1024


@dataclass(frozen=True)
class AllowedUrl:
    """An include target the policy accepts, with its canonical fetch URL."""

    allowed: Literal[True] = True
    url: str = ""
    alias: str = ""


@dataclass(frozen=True)
class RefusedUrl:
    """An include target the policy rejects, with the reason why."""

    allowed: Literal[False] = False
    detail: str = ""


def is_url_include_target(target: str) -> bool:
    """Whether an include target is a URL rather than a file path or glob."""
    return _URL_TARGET_RE.match(target) is not None


def parse_managed_price_url(target: str, origins: tuple[str, ...] = DEFAULT_ORIGINS) -> AllowedUrl | RefusedUrl:
    """Decide whether an include target is an allowed managed price URL.

    The origin must be allowlisted, the path exactly `/prices/<ALIAS>`, and
    the URL must carry no credentials, query string, or fragment. An empty
    allowlist disables the feature. Anything refused here keeps the existing
    "not a repository path" behavior, so the allowlist is the only way a
    remote host can ever be fetched.
    """
    if not origins:
        return RefusedUrl(detail="managed price includes are disabled")
    try:
        parts = urlsplit(target)
        hostname = parts.hostname
        port = parts.port
    except ValueError:
        return RefusedUrl(detail=f"{target!r} is not an allowed managed price source: not a valid URL")
    if not parts.scheme or not hostname:
        return RefusedUrl(detail=f"{target!r} is not an allowed managed price source: not a valid URL")
    if parts.username is not None or parts.password is not None:
        return RefusedUrl(detail=f"{target!r} is not an allowed managed price source: it must not carry credentials")
    scheme = parts.scheme.lower()
    origin = scheme + "://" + hostname.lower()
    if port is not None and port != {"http": 80, "https": 443}.get(scheme):
        origin += f":{port}"
    if origin not in origins:
        return RefusedUrl(
            detail=f"{target!r} is not an allowed managed price source: origin {scheme}://{hostname} is not allowlisted"
        )
    if parts.query or parts.fragment:
        return RefusedUrl(
            detail=f"{target!r} is not an allowed managed price source: it must not carry a query string or fragment"
        )
    match = _PRICES_PATH_RE.match(parts.path)
    if not match:
        return RefusedUrl(
            detail=f"{target!r} is not an allowed managed price source: "
            "the path must be /prices/<ALIAS> (letters, digits, . _ -)"
        )
    return AllowedUrl(url=f"{origin}{parts.path}", alias=match.group(1))


class ManagedPriceBudget:
    """The per-load count of distinct managed URLs, capped at sixteen.

    Resolution registers each URL it fetches; the seventeenth distinct URL
    is refused before any network call, so one ledger cannot fan out
    without bound.
    """

    def __init__(self, limit: int = MAX_URLS_PER_LOAD) -> None:
        self._limit = limit
        self._seen: set[str] = set()

    def claim(self, url: str) -> bool:
        """Register `url`; False means the load already spent its budget."""
        if url in self._seen:
            return True
        if len(self._seen) >= self._limit:
            return False
        self._seen.add(url)
        return True


@dataclass(frozen=True)
class NotModified:
    """The feed is unchanged since `etag`; the cached revision still serves."""

    kind: Literal["not-modified"] = "not-modified"


@dataclass(frozen=True)
class FetchedFeed:
    """A freshly fetched body with the ETag the server sent, if any."""

    kind: Literal["fetched"] = "fetched"
    text: str = ""
    etag: str | None = None


@dataclass(frozen=True)
class FetchFailed:
    """A fetch that produced no body, with a machine-readable reason."""

    kind: Literal["failed"] = "failed"
    reason: Literal[
        "timeout", "network", "redirect", "http", "too-large", "not-utf8", "auth", "forbidden", "not-found", "provider"
    ] = "network"
    message: str = ""


class _RefuseRedirect(HTTPRedirectHandler):
    """Let 3xx answers surface as errors instead of being followed."""

    def redirect_request(  # type: ignore[override]
        self,
        _req: Request,
        _fp: BinaryIO,
        _code: int,
        _msg: str,
        _headers: object,
        _newurl: str,
    ) -> None:
        return None


def _read_capped(fp: BinaryIO, limit: int) -> bytes | None:
    """Read `fp` up to `limit` bytes; None when the body would exceed it."""
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = fp.read(_CHUNK_BYTES)
        if not chunk:
            return b"".join(chunks)
        total += len(chunk)
        if total > limit:
            return None
        chunks.append(chunk)


#: Where the deployment sends callers who are not signed in.
_LOGIN_PATH = "/auth/login"


def _is_login_redirect(location: str, url: str) -> bool:
    """Whether a refused 3xx is the login wall rather than an unexpected hop.

    Matching the raw `Location` against a set of literal spellings was too
    exact to do its job: the endpoint answers a signed-out request with
    `http://…/auth/login?next=…`, only the `https://` spelling was listed, and
    the single most likely failure of the whole feature fell through to
    "redirects are not followed (HTTP 302)" — a transport detail that never
    mentions authentication.

    Comparing the parsed path, and the host only when the target carries one,
    means scheme, query and a trailing slash cannot hide a login wall. This
    decides the wording only: the redirect is refused either way, and a hop to
    anywhere else keeps the transport message, because that genuinely is an
    unexpected redirect rather than a sign-in prompt.
    """
    target = urlsplit(location)
    if target.path.rstrip("/") != _LOGIN_PATH:
        return False
    return not target.netloc or target.hostname == urlsplit(url).hostname


def fetch_managed_price_feed(
    url: str,
    *,
    etag: str | None = None,
    timeout_seconds: int = FETCH_TIMEOUT_SECONDS,
    max_body_bytes: int = MAX_BODY_BYTES,
    opener: OpenerDirector | None = None,
) -> NotModified | FetchedFeed | FetchFailed:
    """GET a feed with a timeout, no redirects, and an incremental byte cap.

    A frontend-supplied bearer is sent only to the canonical HTTPS price
    endpoint. No cookie or ledger identity is sent and redirects are refused.
    An unchanged feed answers 304 against `etag` without a body.
    """
    request = Request(url, method="GET", headers={"Accept": "text/plain", "User-Agent": _USER_AGENT})
    trusted = isinstance(parse_managed_price_url(url, DEFAULT_ORIGINS), AllowedUrl)
    token = os.environ.get("BEA_MANAGED_PRICE_TOKEN", "") if trusted else ""
    auth_state = os.environ.get("BEA_MANAGED_PRICE_AUTH_ERROR") if trusted else None
    if auth_state or (
        token and (not token.isascii() or any(c.isspace() or ord(c) < 32 or ord(c) == 127 for c in token))
    ):
        return FetchFailed(
            reason="auth", message="Login expired or invalid. Run bea cloud login, or replace BEA_TOKEN."
        )
    if token:
        request.add_header("Authorization", f"Bearer {token}")
    if etag:
        request.add_header("If-None-Match", etag)
    dial = opener or build_opener(_RefuseRedirect)
    try:
        response = dial.open(request, timeout=timeout_seconds)
    except HTTPError as error:
        if error.code == 304:
            return NotModified()
        if trusted and (
            error.code == 401
            or (300 <= error.code < 400 and _is_login_redirect(error.headers.get("Location", ""), url))
        ):
            message = "Credential rejected" if token else "Not logged in"
            return FetchFailed(reason="auth", message=f"{message}. Run bea cloud login, or set/replace BEA_TOKEN.")
        if error.code == 403:
            return FetchFailed(
                reason="forbidden",
                message="HTTP 403: this account cannot access the price source. Check account access.",
            )
        if error.code == 404:
            return FetchFailed(
                reason="not-found",
                message="HTTP 404: unknown price source. Choose an available pair at https://beancount.io/live-prices.",
            )
        if error.code >= 500:
            return FetchFailed(
                reason="provider",
                message=f"HTTP {error.code}: price service unavailable. Retry later; cached prices remain usable.",
            )
        if 300 <= error.code < 400:
            return FetchFailed(reason="redirect", message=f"redirects are not followed (HTTP {error.code})")
        retry_after = error.headers.get("Retry-After") if error.headers else None
        if retry_after and not retry_after.isdigit():
            retry_after = None
        return FetchFailed(
            reason="http",
            message=f"HTTP {error.code} (retry after {retry_after})" if retry_after else f"HTTP {error.code}",
        )
    except (URLError, OSError) as error:
        reason = getattr(error, "reason", error)
        if isinstance(reason, TimeoutError) or "timed out" in str(reason):
            return FetchFailed(reason="timeout", message=f"timed out after {timeout_seconds} seconds")
        return FetchFailed(reason="network", message="Could not reach the price service")
    # Only 200 arrives here: any other status raises HTTPError above, and the
    # redirect handler turns 3xx into that error instead of following it.
    try:
        with response:
            body = _read_capped(response, max_body_bytes)
    except TimeoutError:
        return FetchFailed(reason="timeout", message=f"timed out after {timeout_seconds} seconds")
    except OSError:
        return FetchFailed(reason="network", message="Could not read the price response")
    if body is None:
        return FetchFailed(reason="too-large", message=f"body exceeds {max_body_bytes} bytes")
    try:
        text = body.decode("utf-8")
    except UnicodeDecodeError:
        return FetchFailed(reason="not-utf8", message="body is not valid UTF-8")
    return FetchedFeed(text=text, etag=response.headers.get("ETag"))


@dataclass(frozen=True)
class PricePoint:
    """One validated price with its 1-based feed line and observed-at stamp."""

    line: int
    date: str
    base: str
    quote: str
    observed_at: str | None


@dataclass(frozen=True)
class FeedSummary:
    """What validation records about a feed: headers, pair, and prices."""

    alias: str | None
    commodity: str
    quote: str
    source: str | None
    revision: str | None
    latest_observed_at: str | None
    prices: tuple[PricePoint, ...] = ()


@dataclass(frozen=True)
class ValidFeed:
    """A body that is pure price directives with allowlisted metadata."""

    ok: Literal[True] = True
    feed: FeedSummary = field(default_factory=lambda: FeedSummary(None, "", "", None, None, None))


@dataclass(frozen=True)
class InvalidFeed:
    """A body that fails price-only validation, with the reason and line."""

    ok: Literal[False] = False
    reason: str = ""
    line: int | None = None


def _iso_date(text: str) -> bool:
    try:
        date.fromisoformat(text)
    except ValueError:
        return False
    return True


def _unquote(value: str) -> str:
    if len(value) >= 2 and value.startswith('"') and value.endswith('"'):
        return value[1:-1]
    return value


def validate_managed_price_text(text: str) -> ValidFeed | InvalidFeed:
    """Validate a feed body against the price-only grammar.

    Every non-blank line must be a comment, a `price` directive, or an
    indented allowlisted metadata line attached to the preceding price. All
    directives must share one commodity pair, which must agree with the
    header when the header names it. Zero directives is a failure, and any
    other directive rejects the whole body without partial ingestion.
    """
    headers: dict[str, str] = {}
    prices: list[PricePoint] = []
    current: PricePoint | None = None
    for index, line in enumerate(text.splitlines()):
        line_number = index + 1
        if not line.strip():
            continue
        if _COMMENT_RE.match(line):
            header = _HEADER_RE.match(line)
            if header and header.group(1) in _HEADER_KEYS and header.group(1) not in headers:
                headers[header.group(1)] = header.group(2)
            continue
        price = _PRICE_RE.match(line)
        if price:
            day, base, number, quote = price.group(1), price.group(2), price.group(3), price.group(4)
            if not _iso_date(day):
                return InvalidFeed(reason=f"invalid date {day}", line=line_number)
            if len(base) > _MAX_COMMODITY_LENGTH or len(quote) > _MAX_COMMODITY_LENGTH:
                return InvalidFeed(reason="commodity name too long", line=line_number)
            if len(number) > _MAX_NUMBER_LENGTH or Decimal(number) <= 0:
                return InvalidFeed(reason=f"price must be a finite positive decimal (got {number})", line=line_number)
            if base == quote:
                return InvalidFeed(reason=f"price quotes {base} in itself", line=line_number)
            current = PricePoint(line=line_number, date=day, base=base, quote=quote, observed_at=None)
            prices.append(current)
            continue
        metadata = _METADATA_RE.match(line)
        if metadata:
            key, value = metadata.group(1), metadata.group(2)
            if current is None:
                return InvalidFeed(reason="metadata without a preceding price directive", line=line_number)
            if key not in _METADATA_KEYS:
                return InvalidFeed(reason=f"metadata key {key} is not allowed in a price feed", line=line_number)
            if not _METADATA_VALUE_RE.match(value):
                return InvalidFeed(
                    reason=f"metadata value for {key} is not a string, boolean, date, or number",
                    line=line_number,
                )
            if key == "observed-at":
                prices[-1] = PricePoint(
                    line=current.line,
                    date=current.date,
                    base=current.base,
                    quote=current.quote,
                    observed_at=_unquote(value),
                )
                current = prices[-1]
            continue
        return InvalidFeed(reason="only price directives, their metadata, and comments are allowed", line=line_number)
    if not prices:
        return InvalidFeed(reason="no price directives", line=None)
    base, quote = prices[0].base, prices[0].quote
    for point in prices:
        if point.base != base or point.quote != quote:
            return InvalidFeed(
                reason=f"mixed commodity pairs ({base}/{quote} and {point.base}/{point.quote})",
                line=point.line,
            )
    header_commodity = headers.get("commodity")
    if header_commodity is not None and header_commodity != base:
        return InvalidFeed(
            reason=f"header commodity {header_commodity} does not match price directives ({base})",
            line=None,
        )
    header_quote = headers.get("quote")
    if header_quote is not None and header_quote != quote:
        return InvalidFeed(reason=f"header quote {header_quote} does not match price directives ({quote})", line=None)
    latest: str | None = None
    latest_key = ""
    for point in prices:
        if point.observed_at is None:
            continue
        stamp = point.observed_at
        if stamp.endswith("Z"):
            stamp = stamp[:-1] + "+00:00"
        try:
            key = datetime.fromisoformat(stamp).isoformat()
        except ValueError:
            continue
        if key > latest_key:
            latest_key = key
            latest = point.observed_at
    return ValidFeed(
        feed=FeedSummary(
            alias=headers.get("alias"),
            commodity=base,
            quote=quote,
            source=headers.get("source"),
            revision=headers.get("revision"),
            latest_observed_at=latest,
            prices=tuple(prices),
        )
    )


def _canonical_alias(alias: str) -> str:
    """The alias with case and separators removed, so `BTC-USD` meets `btc_usd`."""
    return re.sub(r"[^A-Za-z0-9]", "", alias).upper()


def check_feed_identity(
    validation: ValidFeed | InvalidFeed, alias: str, previous: tuple[str, str] | None
) -> ValidFeed | InvalidFeed:
    """Reject a well-formed feed that names the wrong instrument.

    The header alias must agree with the requested one, ignoring case and
    separators, and the commodity pair must match the revision it would
    replace, so a wrong instrument can never silently replace a right one.
    """
    if not validation.ok:
        return validation
    feed = validation.feed
    if feed.alias is not None and _canonical_alias(feed.alias) != _canonical_alias(alias):
        return InvalidFeed(reason=f"feed alias {feed.alias} does not match the requested {alias}", line=None)
    if previous is not None and (previous[0] != feed.commodity or previous[1] != feed.quote):
        return InvalidFeed(
            reason=f"feed pair {feed.commodity}/{feed.quote} does not match the cached {previous[0]}/{previous[1]}",
            line=None,
        )
    return validation


def feed_revision_id(etag: str | None, text: str) -> str:
    """The revision id for a fetched body: the ETag made key-safe, else the body SHA-256."""
    if etag:
        safe = re.sub(r"[^A-Za-z0-9._-]", "", etag.removeprefix("W/").replace('"', ""))
        if 0 < len(safe) <= 128:
            return safe
    return sha256(text.encode("utf-8")).hexdigest()
