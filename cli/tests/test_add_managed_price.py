"""A user-supplied price may override a managed feed without overriding local quotes."""

from __future__ import annotations

import json
import subprocess
from decimal import Decimal
from pathlib import Path
from typing import Any

import pytest

from tests.test_price import FEED, _run_bea, _write_managed_ledger
from tests.test_price import feed_server as feed_server


def _data(result: subprocess.CompletedProcess[str]) -> Any:
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout)["data"]


def _managed_book(tmp_path: Path, feed_server: str, extra: str = "") -> tuple[Path, Path]:
    book = _write_managed_ledger(tmp_path, feed_server, extra)
    initial = _data(_run_bea(tmp_path, feed_server, "--json", "--file", str(book), "price", "status"))
    assert initial["sources"][0]["shadowed_count"] == 0
    (blob,) = (tmp_path / "cache" / "bea" / "managed-prices").rglob("r1.beancount")
    assert blob.read_bytes() == FEED.encode()
    return book, blob


def _add_price(
    book: Path, feed_server: str, amount: str, *flags: str, as_json: bool = True, currency: str = "BTC"
) -> subprocess.CompletedProcess[str]:
    return _run_bea(
        book.parent,
        feed_server,
        *(["--json"] if as_json else []),
        "--file",
        str(book),
        "add",
        "price",
        "--date",
        "2026-09-10",
        "--currency",
        currency,
        "--amount",
        amount,
        *flags,
    )


def _assert_shadow_notice(message: str, feed_server: str) -> None:
    assert "shadow" in message.lower()
    assert "managed" in message.lower()
    assert f"{feed_server}/prices/BTC-USD" in message


def _assert_effective_quote(
    book: Path, feed_server: str, number: str, *, currency: str = "BTC", quote: str = "USD"
) -> None:
    prices = _data(_run_bea(book.parent, feed_server, "--json", "--file", str(book), "list", "price"))
    assert len(prices) == 2
    (own,) = [entry for entry in prices if entry["date"] == "2026-09-10"]
    assert own["currency"] == currency
    assert own["amount"]["currency"] == quote
    assert Decimal(own["amount"]["number"]) == Decimal(number)
    (remaining,) = [entry for entry in prices if entry["date"] == "2026-09-11"]
    assert Decimal(remaining["amount"]["number"]) == Decimal("113500.50")
    status = _data(_run_bea(book.parent, feed_server, "--json", "--file", str(book), "price", "status"))
    (source,) = status["sources"]
    assert source["url"] == f"{feed_server}/prices/BTC-USD"
    assert source["shadowed_count"] == 1
    assert source["effective_dates"] == ["2026-09-11"]


@pytest.mark.parametrize("as_json", [False, True], ids=["human", "json"])
@pytest.mark.parametrize("number", ["112000.00", "110000"], ids=["equal-feed-quote", "different-feed-quote"])
def test_user_price_shadows_the_managed_quote_without_force(
    tmp_path: Path, feed_server: str, as_json: bool, number: str
) -> None:
    book, blob = _managed_book(tmp_path, feed_server)
    before = book.read_bytes()

    result = _add_price(book, feed_server, f"{number} USD", as_json=as_json)

    assert result.returncode == 0, result.stderr
    if as_json:
        data = _data(result)
        assert data["written"] == 1
        assert data["duplicate"] is False
        assert data["source"] is None
        _assert_shadow_notice(" ".join(data["warnings"]), feed_server)
    else:
        assert f"Added 1 price to {book}." in result.stdout
        assert "already recorded" not in result.stdout
        _assert_shadow_notice(result.stderr, feed_server)
    assert str(blob.parent) not in result.stdout + result.stderr
    assert book.read_bytes().startswith(before)
    assert book.read_text().count("price BTC") == 1
    _assert_effective_quote(book, feed_server, number)
    assert blob.read_bytes() == FEED.encode()


def test_included_price_destination_keeps_local_duplicate_and_conflict_rules(tmp_path: Path, feed_server: str) -> None:
    destination = tmp_path / "local-prices.bean"
    destination.write_text("; Ledger-owned quotes\n")
    book, blob = _managed_book(tmp_path, feed_server, 'include "local-prices.bean"\n')
    root_before = book.read_bytes()
    destination_before = destination.read_bytes()
    into = ("--into", str(destination))

    added = _data(_add_price(book, feed_server, "110000 USD", *into))

    assert added["written"] == 1
    assert added["duplicate"] is False
    assert added["source"] is None
    _assert_shadow_notice(" ".join(added["warnings"]), feed_server)
    assert destination.read_bytes().startswith(destination_before)
    assert destination.read_text().count("price BTC") == 1
    assert book.read_bytes() == root_before
    _assert_effective_quote(book, feed_server, "110000")
    written = destination.read_bytes()

    repeated = _data(_add_price(book, feed_server, "110000 USD", *into))

    assert repeated["written"] == 0
    assert repeated["duplicate"] is True
    assert repeated["source"]["filename"] == str(destination)
    assert repeated["source"]["lineno"] > 0
    assert destination.read_bytes() == written
    conflict = _add_price(book, feed_server, "111000 USD", *into)
    assert conflict.returncode == 2, conflict.stderr
    assert "110000 USD" in conflict.stderr
    assert "111000 USD" in conflict.stderr
    assert "--force" in conflict.stderr
    assert str(destination) in conflict.stderr
    assert destination.read_bytes() == written

    forced = _data(_add_price(book, feed_server, "111000 USD", *into, "--force"))

    assert forced["written"] == 1
    assert destination.read_text().count("price BTC") == 2
    assert book.read_bytes() == root_before
    assert blob.read_bytes() == FEED.encode()


def test_reciprocal_price_also_explains_that_it_shadows_the_managed_pair(tmp_path: Path, feed_server: str) -> None:
    book, blob = _managed_book(tmp_path, feed_server)

    added = _data(_add_price(book, feed_server, "0.00001 BTC", currency="USD"))

    assert added["written"] == 1
    assert added["duplicate"] is False
    assert added["source"] is None
    _assert_shadow_notice(" ".join(added["warnings"]), feed_server)
    _assert_effective_quote(book, feed_server, "0.00001", currency="USD", quote="BTC")
    assert book.read_text().count("price USD") == 1
    assert blob.read_bytes() == FEED.encode()
